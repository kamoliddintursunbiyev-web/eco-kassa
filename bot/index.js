// Eco Aroma Telegram bot: ro'yxatdan o'tish, xaridlar, keshbek, qarz, rahbar paneli.
// Kerakli muhit o'zgaruvchilari (Railway → Variables):
//   BOT_TOKEN       — @BotFather bergan token
//   FIREBASE_SA     — Firebase service account JSON (butun matn)
//   SHOP_URL        — (ixtiyoriy) do'kon sahifasi manzili
import admin from 'firebase-admin';
import { createHash, createHmac, pbkdf2Sync, timingSafeEqual } from 'node:crypto';
import { gzipSync } from 'node:zlib';

const TOKEN = ((process.env.BOT_TOKEN || '').match(/\d{6,}:[A-Za-z0-9_-]{30,}/) || [''])[0];
const SA = (process.env.FIREBASE_SA || '').trim();
const SHOP_URL = process.env.SHOP_URL || 'https://kamoliddintursunbiyev-web.github.io/eco-kassa/shop.html';
const KASSA_URL = process.env.KASSA_URL || 'https://kamoliddintursunbiyev-web.github.io/eco-kassa/';
if (!TOKEN || !SA) { console.error('BOT_TOKEN va FIREBASE_SA o\'rnatilmagan'); process.exit(1); }

admin.initializeApp({ credential: admin.credential.cert(JSON.parse(SA)) });
const db = admin.firestore();
const API = `https://api.telegram.org/bot${TOKEN}/`;

async function tg(method, body = {}) {
  const r = await fetch(API + method, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  if (!j.ok && method !== 'getUpdates') console.error(method, j.description);
  return j;
}

// ---------- Yordamchilar ----------
const money = n => Math.round(Number(n) || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
const fmt = ts => new Date(ts).toLocaleString('ru-RU', { timeZone: 'Asia/Tashkent', day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
const dmy = d => String(d || '').split('-').reverse().join('.');
const last9 = p => String(p || '').replace(/\D/g, '').slice(-9);
const esc = s => String(s ?? '').replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));
const LINE = '┈┈┈┈┈┈┈┈┈┈┈┈┈┈';
const bar = (v, max, w = 10) => { const n = max > 0 ? Math.round(v / max * w) : 0; return '▰'.repeat(n) + '▱'.repeat(w - n); };
const WD = ['Yak', 'Dush', 'Sesh', 'Chor', 'Pay', 'Jum', 'Shan'];
const sleep = ms => new Promise(x => setTimeout(x, ms));

const B = {
  buys: '🧾 Xaridlarim', cb: '💰 Keshbekim', debt: '📒 Qarzim', contact: "☎️ Bog'lanish", promo: '🎁 Aksiyalar',
  report: '📊 Bugun', week: '📅 Hafta', stock: '📦 Ombor', debtors: '👥 Qarzdorlar',
};
const OLD_REPORT = '📊 Bugungi hisobot';
const mainKb = { keyboard: [[{ text: "🛍 Do'kon", web_app: { url: SHOP_URL } }], [{ text: B.buys }, { text: B.cb }], [{ text: B.debt }, { text: B.promo }], [{ text: B.contact }]], resize_keyboard: true, is_persistent: true };
const adminKb = { keyboard: [[{ text: B.report }, { text: B.week }], [{ text: B.stock }, { text: B.debtors }], ...mainKb.keyboard], resize_keyboard: true, is_persistent: true };
const bdayKb = { remove_keyboard: true };
const phoneKb = { keyboard: [[{ text: '📱 Telefon raqamni yuborish', request_contact: true }]], resize_keyboard: true, one_time_keyboard: true };

const regDoneText = (phone) => `✅ <b>Ro'yxatdan o'tdingiz!</b>\n${LINE}\nEndi xaridlaringiz, keshbek va qarzingizni shu yerda ko'rasiz.\n\nDo'kondan xarid qilganda kassirga shu raqamni ayting:\n📱 <b>${esc(phone)}</b>`;
function askBday(chat) { return send(chat, "🎂 <b>Tug'ilgan kuningizni yozing</b>\n\nO'sha kuni sizni tabriklab, sovg'a tayyorlaymiz!\n<i>Ro'yxatdan o'tishni yakunlash uchun bu majburiy.</i>\n\nMasalan: <b>15.03.1995</b>", bdayKb); }
function parseBday(t) {
  const m = String(t || '').trim().match(/^(\d{1,2})[.\/\-\s](\d{1,2})[.\/\-\s](\d{2}|\d{4})$/);
  if (!m) return null;
  let d = +m[1], mo = +m[2], y = +m[3];
  if (y < 100) y += y > (new Date().getFullYear() % 100) ? 1900 : 2000;
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return null;
  if (y < 1920 || y > new Date().getFullYear() - 3) return null;
  return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

async function settings() { const s = await db.doc('meta/settings').get(); return s.exists ? s.data() : {}; }
async function userState(id) { const s = await db.doc(`tgUsers/${id}`).get(); return s.exists ? s.data() : null; }
async function clientOf(u) { if (!u || !u.clientId) return null; const c = await db.doc(`clients/${u.clientId}`).get(); return c.exists ? { id: c.id, ...c.data() } : null; }
async function send(chat, text, kb) { return tg('sendMessage', { chat_id: chat, text, parse_mode: 'HTML', reply_markup: kb, link_preview_options: { is_disabled: true } }); }

// ---------- Rahbar (do'kon egasi) ----------
const sha = t => createHash('sha256').update('eco-aroma:' + t).digest('hex');
const checkCred = (x, pw) => { if (!x) return false; if (x.hash && x.salt) return pbkdf2Sync(pw, Buffer.from(x.salt, 'hex'), x.iter || 100000, 32, 'sha256').toString('hex') === x.hash; if (x.pinHash) return sha(pw) === x.pinHash; return false; };
async function adminDoc() { const d = await db.doc('meta/botAdmins').get(); return d.exists ? d.data() : {}; }
async function admins() { return (await adminDoc()).ids || []; }
async function isAdmin(id) { return (await admins()).includes(id); }
async function removeAdmin(id) {
  const d = await adminDoc(); const ids = (d.ids || []).filter(x => x !== id); const info = { ...(d.info || {}) }; delete info[id];
  await db.doc('meta/botAdmins').set({ ids, info });
}
const tries = new Map();
async function notifyAdmins(text) { for (const id of await admins()) { await send(id, text, adminKb); await sleep(40); } }
const dayStart = (off = 0) => { const now = new Date(Date.now() + 5 * 3600e3); now.setUTCHours(0, 0, 0, 0); return now.getTime() - 5 * 3600e3 - off * 864e5; };
const sum = (L, k) => L.reduce((x, s) => x + (Number(s[k]) || 0), 0);
const costOf = L => L.reduce((x, s) => x + (s.items || []).reduce((y, i) => y + (Number(i.cost) || 0) * (Number(i.qty) || 0), 0), 0);

function expiringList(prods, lim) {
  const today = dayStart(0); const out = [];
  prods.forEach(p => {
    let Q = Math.max(0, Number(p.qty) || 0);
    [...(p.expiries || [])].filter(x => x && x.d).sort((x, y) => x.d < y.d ? 1 : -1).forEach(x => {
      if (Q <= 0) return; const t = Math.min(Q, Number(x.q) || Q); Q -= t;
      const dl = Math.round((Date.parse(x.d + 'T00:00:00+05:00') - today) / 864e5);
      if (dl <= lim) out.push({ n: p.name, d: x.d, dl, q: t });
    });
  });
  return out.sort((x, y) => x.dl - y.dl);
}

async function dailyReport(title) {
  const a = dayStart(0), b = a + 864e5, ya = dayStart(1);
  const snap = await db.collection('sales').where('ts', '>=', ya).get();
  const all = snap.docs.map(d => d.data()); const T = all.filter(s => s.ts >= a && s.ts < b), Y = all.filter(s => s.ts >= ya && s.ts < a);
  const tot = sum(T, 'total'), ytot = sum(Y, 'total');
  const pct = ytot ? Math.round((tot - ytot) / ytot * 100) : null;
  const byP = {}; T.forEach(s => (s.items || []).forEach(i => { byP[i.name] = (byP[i.name] || 0) + (Number(i.qty) || 0); }));
  const top = Object.entries(byP).sort((x, y) => y[1] - x[1]).slice(0, 5);
  const byS = {}; T.forEach(s => { byS[s.seller || '—'] = (byS[s.seller || '—'] || 0) + (Number(s.total) || 0); });
  const prods = (await db.collection('products').get()).docs.map(d => d.data()).filter(p => !p.archived);
  const neg = prods.filter(p => Number(p.qty) < 0).length, low = prods.filter(p => Number(p.qty) >= 0 && Number(p.qty) <= (Number(p.min) || 3)).length;
  const cl = (await db.collection('clients').get()).docs.map(d => d.data()); const cdebt = cl.reduce((x, c) => x + Math.max(0, Number(c.debt) || 0), 0);
  const ord = (await db.collection('orders').where('ts', '>=', a).get()).docs.map(d => d.data());
  const rets = (await db.collection('returns').where('ts', '>=', a).get()).docs.map(d => d.data()).filter(r => r.ts < b);
  const exAll = (await db.collection('expenses').where('ts', '>=', a).get()).docs.map(d => ({ id: d.id, ...d.data() })).filter(x => x.ts < b && !x.void);
  const exRev = new Set(exAll.filter(x => x.rev).map(x => x.rev)), exps = exAll.filter(x => !x.rev && !exRev.has(x.id));
  const rSum = sum(rets, 'amount'), eSum = sum(exps, 'amount');
  const st = await settings(); const lim = st.expDays == null ? 60 : Number(st.expDays) || 60;
  const expSoon = expiringList(prods, lim);
  const maxS = Math.max(1, ...Object.values(byS));
  const parts = [
    `📊 <b>${title}</b>`, LINE,
    `💵 Savdo: <b>${money(tot)} so'm</b>${pct === null ? '' : `  ${pct >= 0 ? '🟢 ▲' : '🔴 ▼'}${Math.abs(pct)}% kechaga`}`,
    `🧾 Cheklar: <b>${T.length}</b> · o'rtacha ${money(T.length ? tot / T.length : 0)}`,
    `📈 Foyda (taxminiy): <b>${money(tot - costOf(T))}</b>`,
    `💳 Naqd ${money(sum(T, 'cash'))} · Karta ${money(sum(T, 'card'))}`,
    `📒 Qarzga: ${money(sum(T, 'debt'))} · 🏷 Chegirma: ${money(sum(T, 'discount'))}`,
    `📨 Telegram buyurtmalar: ${ord.length}`,
  ];
  if (rets.length) parts.push(`↩️ Qaytarish: ${rets.length} ta · ${money(rSum)} so'm`);
  if (exps.length) parts.push(`🧾 Xarajat: ${money(eSum)} so'm`);
  if (Object.keys(byS).length) parts.push('', '👤 <b>Sotuvchilar</b>', ...Object.entries(byS).sort((x, y) => y[1] - x[1]).map(([k, v]) => `${bar(v, maxS, 8)} ${esc(k)} — ${money(v)}`));
  if (top.length) parts.push('', '🏆 <b>Ko\'p sotilgan</b>', ...top.map(([k, v], i) => `${i + 1}. ${esc(k)} × ${v}`));
  parts.push('', LINE, `📦 Ombor: ${neg ? `🔴 ${neg} ta minusda, ` : ''}${low} ta tugayapti`);
  if (expSoon.length) parts.push(`⏳ Muddati yaqin: ${expSoon.length} ta`, ...expSoon.slice(0, 5).map(x => `   • ${esc(x.n)} — ${dmy(x.d)} (${x.dl < 0 ? -x.dl + ' kun o\'tgan' : x.dl + ' kun qoldi'})`));
  parts.push(`👥 Mijozlar qarzi: <b>${money(cdebt)} so'm</b>`);
  return parts.join('\n');
}

async function weekReport() {
  const a = dayStart(6), pa = dayStart(13);
  const all = (await db.collection('sales').where('ts', '>=', pa).get()).docs.map(d => d.data());
  const cur = all.filter(s => s.ts >= a), prev = all.filter(s => s.ts < a);
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const s0 = dayStart(i), s1 = s0 + 864e5; const L = cur.filter(s => s.ts >= s0 && s.ts < s1);
    const d = new Date(s0 + 5 * 3600e3);
    days.push({ label: `${WD[d.getUTCDay()]} ${String(d.getUTCDate()).padStart(2, '0')}.${String(d.getUTCMonth() + 1).padStart(2, '0')}`, tot: sum(L, 'total'), n: L.length });
  }
  const tot = sum(cur, 'total'), ptot = sum(prev, 'total'), max = Math.max(1, ...days.map(d => d.tot));
  const best = days.reduce((x, d) => d.tot > x.tot ? d : x, days[0]);
  const pct = ptot ? Math.round((tot - ptot) / ptot * 100) : null;
  const byP = {}; cur.forEach(s => (s.items || []).forEach(i => { byP[i.name] = (byP[i.name] || 0) + (Number(i.qty) || 0); }));
  const top = Object.entries(byP).sort((x, y) => y[1] - x[1]).slice(0, 5);
  return [
    '📅 <b>Haftalik hisobot</b> (oxirgi 7 kun)', LINE,
    `💵 Savdo: <b>${money(tot)} so'm</b>${pct === null ? '' : `  ${pct >= 0 ? '🟢 ▲' : '🔴 ▼'}${Math.abs(pct)}% o'tgan haftaga`}`,
    `🧾 Cheklar: <b>${cur.length}</b> · kuniga o'rtacha ${money(tot / 7)}`,
    `📈 Foyda (taxminiy): <b>${money(tot - costOf(cur))}</b>`,
    '', ...days.map(d => `<code>${d.label.padEnd(9)}</code> ${bar(d.tot, max)} ${money(d.tot)}`),
    '', `⭐ Eng yaxshi kun: <b>${best.label}</b> — ${money(best.tot)}`,
    ...(top.length ? ['', '🏆 <b>Hafta yetakchilari</b>', ...top.map(([k, v], i) => `${i + 1}. ${esc(k)} × ${v}`)] : []),
  ].join('\n');
}

async function stockReport() {
  const prods = (await db.collection('products').get()).docs.map(d => d.data()).filter(p => !p.archived);
  const st = await settings(); const lim = st.expDays == null ? 60 : Number(st.expDays) || 60;
  const neg = prods.filter(p => Number(p.qty) < 0).sort((a, b) => a.qty - b.qty);
  const low = prods.filter(p => Number(p.qty) >= 0 && Number(p.qty) <= (Number(p.min) || 3)).sort((a, b) => a.qty - b.qty);
  const exp = expiringList(prods, lim);
  const worth = prods.reduce((x, p) => x + Math.max(0, Number(p.qty) || 0) * (Number(p.cost) || 0), 0);
  const units = prods.reduce((x, p) => x + Math.max(0, Number(p.qty) || 0), 0);
  const L = ['📦 <b>Ombor holati</b>', LINE, `Tovar turlari: <b>${prods.length}</b> · jami ${money(units)} dona`, `Ombor qiymati (tannarxda): <b>${money(worth)} so'm</b>`];
  if (neg.length) L.push('', `🔴 <b>Minusda (${neg.length})</b>`, ...neg.slice(0, 12).map(p => `   • ${esc(p.name)}: <b>${p.qty}</b>`));
  if (low.length) L.push('', `🟠 <b>Tugayapti (${low.length})</b>`, ...low.slice(0, 15).map(p => `   • ${esc(p.name)}: ${p.qty} ta qoldi`));
  if (exp.length) L.push('', `⏳ <b>Muddati yaqin (${exp.length})</b>`, ...exp.slice(0, 10).map(x => `   • ${esc(x.n)} — ${dmy(x.d)} · ${x.q} ta (${x.dl < 0 ? -x.dl + ' kun o\'tgan' : x.dl + ' kun qoldi'})`));
  if (!neg.length && !low.length && !exp.length) L.push('', '✅ Hammasi joyida — tugayotgan tovar yo\'q.');
  return L.join('\n');
}

async function debtorsReport() {
  const cl = (await db.collection('clients').get()).docs.map(d => d.data()).filter(c => Number(c.debt) > 0 && !c.archived).sort((a, b) => b.debt - a.debt);
  const sup = (await db.collection('suppliers').get()).docs.map(d => d.data()).filter(s => Number(s.debt) > 0).sort((a, b) => b.debt - a.debt);
  const ct = sum(cl, 'debt'), stt = sum(sup, 'debt');
  const L = ['👥 <b>Qarzlar</b>', LINE, `Mijozlar bizga qarz: <b>${money(ct)} so'm</b> (${cl.length} kishi)`, `Biz yetkazib beruvchilarga: <b>${money(stt)} so'm</b>`];
  if (cl.length) L.push('', '📒 <b>Eng katta qarzdorlar</b>', ...cl.slice(0, 15).map((c, i) => `${i + 1}. ${esc(c.name || '—')}${c.phone ? ` · ${esc(c.phone)}` : ''} — <b>${money(c.debt)}</b>`));
  if (sup.length) L.push('', '🚚 <b>Yetkazib beruvchilar</b>', ...sup.slice(0, 8).map(s => `• ${esc(s.name || '—')} — ${money(s.debt)}`));
  return L.join('\n');
}

function promoText(p) {
  const t = p.type === 'set' ? `to'plam narxi <b>${money(p.price)} so'm</b>` : Number(p.pct) ? `<b>${Number(p.pct)}% chegirma</b>` : Number(p.n) ? `<b>${p.n}+1</b> aksiya` : '';
  const d = (p.days && p.days.length && p.days.length < 7) ? ` · ${p.days.map(x => WD[x]).join(', ')} kunlari` : '';
  return `🎁 <b>${esc(p.name || 'Aksiya')}</b>${t ? ` — ${t}` : ''}${p.to ? `\n    ⏰ ${dmy(p.to)} gacha` : ''}${d}`;
}
function promoActive(p) {
  if (!p || !p.on) return false; const now = new Date(Date.now() + 5 * 3600e3); const d = now.toISOString().slice(0, 10);
  if (p.from && d < p.from) return false; if (p.to && d > p.to) return false;
  if (p.days && p.days.length && !p.days.includes(now.getUTCDay())) return false; return true;
}

async function askName(chat, from) {
  await db.doc(`tgUsers/${from.id}`).set({ step: 'name', ts: Date.now() }, { merge: true });
  await send(chat, `Assalomu alaykum! 🌿\n<b>Eco Aroma</b> botiga xush kelibsiz.\n${LINE}\nBu yerda xaridlaringiz, keshbek va aksiyalarni ko'rasiz.\n\nRo'yxatdan o'tish uchun <b>ismingizni</b> yozing:`, { remove_keyboard: true });
}

async function onMessage(m) {
  const chat = m.chat.id, from = m.from; if (m.chat.type !== 'private') return;
  const text = (m.text || '').trim();
  let u = await userState(from.id);

  // ----- Rahbar bo'lib ulanish -----
  if (text === '/rahbar') {
    if (await isAdmin(from.id)) return send(chat, '✅ Siz allaqachon rahbar sifatida ulangansiz.\n\nBuyruqlar:\n/hisobot · /hafta · /ombor · /qarzdorlar\n/rahbarlar — ulangan rahbarlar\n/zaxira — to\'liq zaxira fayli\n/chiqish — rahbar rejimidan chiqish', adminKb);
    await db.doc(`tgUsers/${from.id}`).set({ adminStep: 'login' }, { merge: true });
    return send(chat, "🔐 Kassadagi <b>rahbar loginini</b> yozing:");
  }
  if (u && u.adminStep === 'login' && text && !text.startsWith('/')) {
    await db.doc(`tgUsers/${from.id}`).set({ adminStep: 'pw', adminLogin: text.trim().toLowerCase() }, { merge: true });
    return send(chat, "Endi <b>parolni</b> yozing.\n<i>(Xabaringiz darhol o'chiriladi.)</i>");
  }
  if (u && u.adminStep === 'pw' && text) {
    tg('deleteMessage', { chat_id: chat, message_id: m.message_id });
    const t = tries.get(from.id) || { n: 0, ts: Date.now() }; if (Date.now() - t.ts > 3600e3) { t.n = 0; t.ts = Date.now(); }
    await db.doc(`tgUsers/${from.id}`).set({ adminStep: null }, { merge: true });
    if (t.n >= 5) return send(chat, "⛔ Juda ko'p urinish. 1 soatdan keyin qayta urinib ko'ring.");
    const st = await settings();
    const owner = (st.staff || []).find(x => x.role === 'owner' && !x.off && String(x.login || x.name || '').toLowerCase() === u.adminLogin);
    if (owner && checkCred(owner, text)) {
      const d = await adminDoc(); const ids = d.ids || []; if (!ids.includes(from.id)) ids.push(from.id);
      const info = { ...(d.info || {}), [from.id]: { name: [from.first_name, from.last_name].filter(Boolean).join(' '), user: from.username || '', staff: owner.name || '', ts: Date.now() } };
      await db.doc('meta/botAdmins').set({ ids, info });
      tries.delete(from.id);
      return send(chat, `✅ <b>Rahbar sifatida ulandingiz!</b>\n${LINE}\nSizga yuboriladi:\n• har bir yangi Telegram buyurtma\n• omborga kirim va inventarizatsiya\n• har kuni 21:30 da kunlik hisobot\n• har kecha zaxira fayli\n\nPastdagi tugmalar — sizning panelingiz 👇`, adminKb);
    }
    t.n++; tries.set(from.id, t);
    return send(chat, "❌ Login yoki parol noto'g'ri. Qayta urinish uchun /rahbar yuboring.");
  }

  // ----- Rahbar paneli -----
  const amAdmin = await isAdmin(from.id);
  if (amAdmin) {
    if (text === B.report || text === OLD_REPORT || text === '/hisobot') return send(chat, await dailyReport('Bugungi hisobot (hozirgacha)'), adminKb);
    if (text === B.week || text === '/hafta') return send(chat, await weekReport(), adminKb);
    if (text === B.stock || text === '/ombor') return send(chat, await stockReport(), adminKb);
    if (text === B.debtors || text === '/qarzdorlar') return send(chat, await debtorsReport(), adminKb);
    if (text === '/zaxira') { await send(chat, '⏳ Zaxira tayyorlanmoqda…', adminKb); await sendBackup(new Date(Date.now() + 5 * 3600e3).toISOString().slice(0, 10), true, [from.id]); return; }
    if (text === '/chiqish') { await removeAdmin(from.id); return send(chat, '👋 Rahbar rejimidan chiqdingiz. Hisobot va xabarlar endi kelmaydi.', mainKb); }
    if (text === '/rahbarlar') {
      const d = await adminDoc(); const ids = d.ids || [];
      return send(chat, `👑 <b>Ulangan rahbarlar (${ids.length})</b>\n${LINE}\n${ids.map(id => { const x = (d.info || {})[id] || {}; return `• ${esc(x.name || id)}${x.user ? ` @${esc(x.user)}` : ''}${id === from.id ? ' (siz)' : `\n   o'chirish: /ochir_${id}`}`; }).join('\n')}`, adminKb);
    }
    const mo = text.match(/^\/ochir_(\d+)$/);
    if (mo) { const id = Number(mo[1]); if (id === from.id) return send(chat, 'O\'zingizni o\'chirish uchun /chiqish yuboring.', adminKb); await removeAdmin(id); send(id, '🔒 Rahbar rejimingiz o\'chirildi.', mainKb).catch(() => {}); return send(chat, '✅ O\'chirildi.', adminKb); }
  }

  if (text === '/start' || !u) {
    const meCl = u && (u.step === 'done' || u.step === 'bday') ? await clientOf(u) : null;
    if (meCl && !meCl.bday && !amAdmin) { await db.doc(`tgUsers/${from.id}`).set({ step: 'bday' }, { merge: true }); return askBday(chat); }
    if (u && u.step === 'done' && meCl) return send(chat, `Xush kelibsiz, <b>${esc(u.name)}</b>! 🌿\nQuyidagi tugmalardan foydalaning 👇`, amAdmin ? adminKb : mainKb);
    if (amAdmin && !meCl) return send(chat, '👑 Rahbar paneli tayyor. Pastdagi tugmalardan foydalaning 👇', adminKb);
    return askName(chat, from);
  }

  if (u.step === 'name') {
    if (!text || text.startsWith('/') || text.length > 60) return send(chat, 'Iltimos, ismingizni yozing:');
    await db.doc(`tgUsers/${from.id}`).set({ step: 'phone', name: text }, { merge: true });
    return send(chat, `Rahmat, <b>${esc(text)}</b>! 😊\nEndi pastdagi tugma orqali <b>telefon raqamingizni</b> yuboring:`, phoneKb);
  }

  if (u.step === 'phone') {
    const c = m.contact;
    if (!c) return send(chat, 'Iltimos, pastdagi «📱 Telefon raqamni yuborish» tugmasini bosing.', phoneKb);
    if (c.user_id !== from.id) return send(chat, 'Iltimos, o\'zingizning raqamingizni yuboring.', phoneKb);
    const phone = '+' + String(c.phone_number).replace(/\D/g, '');
    // Kassadagi mijoz bilan telefon orqali bog'lash yoki yangisini yaratish
    const all = await db.collection('clients').get();
    let doc = all.docs.find(d => last9(d.data().phone) === last9(phone));
    if (doc) await doc.ref.update({ tgId: from.id, tgUser: from.username || '' });
    else {
      const ref = db.collection('clients').doc();
      await ref.set({ name: u.name, phone, discount: 0, note: 'Telegram orqali', debt: 0, cashback: 0, created: Date.now(), tgId: from.id, tgUser: from.username || '' });
      doc = await ref.get();
    }
    if (doc.data().bday) {
      await db.doc(`tgUsers/${from.id}`).set({ step: 'done', clientId: doc.id, phone, regTs: Date.now() }, { merge: true });
      return send(chat, regDoneText(phone), mainKb);
    }
    await db.doc(`tgUsers/${from.id}`).set({ step: 'bday', clientId: doc.id, phone, regTs: Date.now() }, { merge: true });
    return askBday(chat);
  }

  if (u.step === 'bday') {
    const done = async (msg) => { await db.doc(`tgUsers/${from.id}`).set({ step: 'done', bdayAsked: true }, { merge: true }); return send(chat, msg, amAdmin ? adminKb : mainKb); };
    const bd = parseBday(text);
    if (!bd) return send(chat, "Sanani tushunmadim 🙏\nIltimos, shu ko'rinishda yozing: <b>15.03.1995</b> (kun.oy.yil)", bdayKb);
    if (u.clientId) await db.doc(`clients/${u.clientId}`).update({ bday: bd });
    return done(`🎂 Rahmat! Tug'ilgan kuningiz saqlandi: <b>${dmy(bd)}</b>\nO'sha kuni sizni albatta tabriklaymiz 🎁` + (u.phone && !u.bdayAsked ? `\n\n` + regDoneText(u.phone) : ''));
  }

  const kb = amAdmin ? adminKb : mainKb;
  if (text === B.promo || text === '/aksiya') {
    const st = await settings(); const act = (st.promos || []).filter(promoActive);
    const bd = Number(st.bdayPct) ? `\n\n🎂 Tug'ilgan kuningizda — <b>${Number(st.bdayPct)}% chegirma</b>!` : '';
    const cbp = Number(st.cashbackPct) ? `\n💰 Har xariddan <b>${Number(st.cashbackPct)}% keshbek</b>.` : '';
    return send(chat, act.length ? `🎁 <b>Hozirgi aksiyalar</b>\n${LINE}\n${act.map(promoText).join('\n\n')}${cbp}${bd}` : `Hozircha faol aksiya yo'q.${cbp}${bd}\n\nYangi aksiyalar haqida shu yerda xabar beramiz 🌿`, kb);
  }
  if (text === B.contact) {
    const st = await settings();
    return send(chat, `☎️ <b>${esc(st.shopName || 'Eco Aroma')}</b>${st.phone ? `\n📱 ${esc(st.phone)}` : ''}\n\nBuyurtma berish uchun «🛍 Do'kon» tugmasini bosing.`, kb);
  }

  const cl = await clientOf(u);
  if (!cl) {
    if (amAdmin) return send(chat, 'Pastdagi tugmalardan foydalaning 👇', adminKb);
    await db.doc(`tgUsers/${from.id}`).set({ step: 'name' }, { merge: true }); return askName(chat, from);
  }
  // Tug'ilgan kuni yo'q mijoz — majburiy: kiritmaguncha bot ishlamaydi
  if (!cl.bday && !amAdmin) {
    await db.doc(`tgUsers/${from.id}`).set({ step: 'bday' }, { merge: true });
    return askBday(chat);
  }

  if (text === B.buys) {
    const snap = await db.collection('sales').where('clientId', '==', cl.id).get();
    const sales = snap.docs.map(d => d.data()).sort((a, b) => b.ts - a.ts);
    if (!sales.length) return send(chat, '🧾 Hozircha xaridlaringiz yo\'q.\n\nBirinchi xaridingizni kutamiz 🌿', kb);
    const tot = sales.reduce((a, s) => a + (Number(s.total) || 0), 0);
    const lines = sales.slice(0, 8).map(s => `🧾 <b>${esc(s.no)}</b> · ${fmt(s.ts)}\n${(s.items || []).map(i => `   • ${esc(i.name)} × ${i.qty}`).join('\n')}\n   💵 <b>${money(s.total)} so'm</b>${Number(s.debt) ? ` (qarzga ${money(s.debt)})` : ''}${Number(s.cbEarned) ? ` · 💰 +${money(s.cbEarned)}` : ''}`);
    return send(chat, `🧾 <b>Xaridlaringiz</b>\n${LINE}\nJami: <b>${sales.length}</b> ta xarid · <b>${money(tot)} so'm</b>\n\n${lines.join('\n\n')}${sales.length > 8 ? '\n\n<i>…oxirgi 8 tasi ko\'rsatildi</i>' : ''}`, kb);
  }
  if (text === B.cb) {
    const st = await settings();
    const pct = Number(st.cashbackPct) || 0;
    return send(chat, `💰 <b>Keshbekingiz</b>\n${LINE}\n<b>${money(cl.cashback)} so'm</b>\n\n${pct ? `Har xariddan <b>${pct}%</b> keshbek yoziladi. ` : ''}Keshbekni do'konda keyingi xaridda to'lov sifatida ishlatishingiz mumkin.`, kb);
  }
  if (text === B.debt) {
    const d = Number(cl.debt) || 0;
    if (d <= 0) return send(chat, '📒 Sizda qarz yo\'q. Rahmat! 🌿', kb);
    const p = await db.collection('payments').where('refId', '==', cl.id).get();
    const pays = p.docs.map(x => x.data()).filter(x => x.kind === 'client').sort((a, b) => b.ts - a.ts).slice(0, 5);
    return send(chat, `📒 <b>Qarzingiz</b>\n${LINE}\n<b>${money(d)} so'm</b>${pays.length ? `\n\nOxirgi to'lovlaringiz:\n${pays.map(x => `✅ ${fmt(x.ts)} — ${money(x.amount)} so'm`).join('\n')}` : ''}`, kb);
  }
  return send(chat, 'Quyidagi tugmalardan birini tanlang 👇', kb);
}

// ---------- Telegram mini-ilova ma'lumotini tekshirish (soxta buyurtmalardan himoya) ----------
const WEBAPP_SECRET = createHmac('sha256', 'WebAppData').update(TOKEN).digest();
function verifyInitData(raw, tgId) {
  try {
    if (!raw) return false;
    const p = new URLSearchParams(raw); const hash = p.get('hash'); if (!hash) return false; p.delete('hash');
    const dcs = [...p.entries()].sort((a, b) => a[0] < b[0] ? -1 : 1).map(([k, v]) => `${k}=${v}`).join('\n');
    const calc = createHmac('sha256', WEBAPP_SECRET).update(dcs).digest();
    const got = Buffer.from(hash, 'hex'); if (got.length !== calc.length || !timingSafeEqual(got, calc)) return false;
    if (Date.now() / 1000 - Number(p.get('auth_date') || 0) > 86400) return false;
    const user = JSON.parse(p.get('user') || '{}'); return !tgId || Number(user.id) === Number(tgId);
  } catch { return false; }
}

// Bot to'xtab qolgan paytdagi voqealar ham o'tkazib yuborilmasin: oxirgi kunlarni ham ko'radi (har biri bir marta, belgi bilan).
const START = Date.now();
const SINCE_ORDERS = START - 3 * 864e5, SINCE_SALES = START - 2 * 3600e3, SINCE_EVENTS = START - 2 * 864e5;

// Kassada sotuv bo'lsa — Telegramdagi mijozga xabar
db.collection('sales').where('ts', '>=', SINCE_SALES).onSnapshot(async snap => {
  for (const ch of snap.docChanges()) {
    if (ch.type !== 'added') continue;
    const s = ch.doc.data(); if (!s.clientId || s.tgNotified) continue;
    const c = await db.doc(`clients/${s.clientId}`).get(); const cd = c.exists ? c.data() : null;
    if (!cd || !cd.tgId) continue;
    await ch.doc.ref.update({ tgNotified: true });
    await send(cd.tgId, `🛍 <b>Xaridingiz uchun rahmat!</b>\n${LINE}\n🧾 Chek ${esc(s.no)} · <b>${money(s.total)} so'm</b>${(s.items || []).length ? `\n${(s.items || []).slice(0, 10).map(i => `   • ${esc(i.name)} × ${i.qty}`).join('\n')}` : ''}${Number(s.cbEarned) ? `\n\n💰 Keshbek: <b>+${money(s.cbEarned)}</b> so'm (jami ${money(s.cbAfter)})` : ''}${Number(s.debt) ? `\n📒 Qarzga: ${money(s.debt)} so'm (jami qarz ${money(s.debtAfter)})` : ''}`, mainKb);
  }
}, e => console.error('sales listener', e.message));

const unverified = [];
let spamWarned = 0;
db.collection('orders').where('ts', '>=', SINCE_ORDERS).onSnapshot(async snap => {
  for (const ch of snap.docChanges()) {
    if (ch.type !== 'added') continue; const o = ch.doc.data(); if (o.status !== 'new' || o.adminNotified) continue;
    const ok = verifyInitData(o.initData, o.tgId);
    await ch.doc.ref.update({ adminNotified: true, verified: ok, initData: admin.firestore.FieldValue.delete() });
    if (!ok) {
      const now = Date.now(); unverified.push(now); while (unverified.length && now - unverified[0] > 600e3) unverified.shift();
      if (unverified.length > 3) {
        if (now - spamWarned > 3600e3) { spamWarned = now; await notifyAdmins('⚠️ <b>Diqqat:</b> 10 daqiqada ko\'p tasdiqlanmagan buyurtma keldi — spam bo\'lishi mumkin. Ular kassadagi «Buyurtmalar» bo\'limida «Tasdiqlanmagan» belgisi bilan turadi.'); }
        continue;
      }
    }
    await notifyAdmins(`📨 <b>Yangi Telegram buyurtma!</b>${ok ? ' ✅' : '\n⚠️ <i>Telegram orqali tasdiqlanmagan — ehtiyot bo\'ling</i>'}\n${LINE}\n👤 ${esc(o.name)} · ${esc(o.phone)}${o.tgUser ? ` · @${esc(o.tgUser)}` : ''}\n${(o.items || []).map(i => `   • ${esc(i.name)} × ${i.qty}`).join('\n')}\n💵 <b>${money(o.total)} so'm</b>\n${o.delivery === 'delivery' ? `🚚 Yetkazish: ${esc(o.address)}` : "🏪 Do'kondan olib ketadi"}${o.comment ? `\n💬 ${esc(o.comment)}` : ''}`);
  }
}, e => console.error('orders listener', e.message));

setInterval(async () => {
  try {
    const t = new Date(Date.now() + 5 * 3600e3); if (t.getUTCHours() < 21 || (t.getUTCHours() === 21 && t.getUTCMinutes() < 30)) return;
    const key = t.toISOString().slice(0, 10); const st = await db.doc('meta/botState').get();
    if (st.exists && st.data().lastDaily === key) return;
    await db.doc('meta/botState').set({ lastDaily: key }, { merge: true });
    await notifyAdmins(await dailyReport(`Kunlik hisobot · ${dmy(key)}`));
  } catch (e) { console.error('daily', e.message); }
}, 60e3);

// ---------- Kassaga kirgan xodimni server tasdiqlaydi ----------
const PERM_DEF = { addProd: 0, editProd: 0, seeCost: 0, editStock: 0, labels: 1, intake: 0, inv: 1, suppliers: 0, price: -1, debt: 1, ret: 1, shift: 1, exp: 1, clients: 1, report: 1 };
function effPerms(staff, st) {
  const p = {}; for (const [k, d] of Object.entries(PERM_DEF)) p[k] = staff.role === 'owner' ? true : (staff.perms && k in staff.perms ? !!staff.perms[k] : d === -1 ? !!st.sellerPrice : !!d);
  return p;
}
function sessFor(staff, st) { return { staffId: staff.id, name: staff.name || '', role: staff.role === 'owner' ? 'owner' : 'seller', perms: effPerms(staff, st), ts: Date.now(), exp: Date.now() + 7 * 864e5 }; }
// Parolni taxmin qilishdan himoya: qurilma yoki profil bo'yicha 15 daqiqada 5 ta xato → 15 daqiqa blok.
const failsByDev = new Map(), failsByStaff = new Map(), LOCK_N = 5, LOCK_MS = 15 * 60e3;
function failHit(map, key) { const now = Date.now(); const L = (map.get(key) || []).filter(x => now - x < LOCK_MS); L.push(now); map.set(key, L); return L.length; }
function locked(map, key) { const now = Date.now(); const L = (map.get(key) || []).filter(x => now - x < LOCK_MS); map.set(key, L); return L.length >= LOCK_N; }
async function handleSessReq(doc) {
  const r = doc.data() || {}, uid = doc.id; const st = await settings();
  const staff = (st.staff || []).find(x => x.id === r.staffId);
  if (locked(failsByDev, uid) || (r.staffId && locked(failsByStaff, r.staffId))) {
    await db.doc(`sessions/${uid}`).set({ role: 'none', perms: {}, staffId: null, ts: Date.now(), err: 'locked' });
    await doc.ref.delete(); return;
  }
  const ok = !!(staff && !staff.off && r.pw && checkCred(staff, String(r.pw)));
  await db.doc(`sessions/${uid}`).set(ok ? sessFor(staff, st) : { role: 'none', perms: {}, staffId: null, ts: Date.now(), err: 'bad' });
  await doc.ref.delete();
  if (!ok) {
    const n1 = failHit(failsByDev, uid), n2 = r.staffId ? failHit(failsByStaff, r.staffId) : 0;
    if (n1 === LOCK_N || n2 === LOCK_N) await notifyAdmins(`⚠️ <b>Xavfsizlik</b>\n«${esc(staff ? staff.name : 'noma\'lum')}» profiliga ketma-ket ${LOCK_N} marta noto'g'ri parol kiritildi. Kirish 15 daqiqaga bloklandi.`);
  } else { failsByDev.delete(uid); if (r.staffId) failsByStaff.delete(r.staffId); }
}
db.collection('sessReq').onSnapshot(snap => { for (const ch of snap.docChanges()) if (ch.type !== 'removed') handleSessReq(ch.doc).catch(e => console.error('sess', e.message)); }, e => console.error('sessReq listener', e.message));

// Rahbar xodim ruxsatini o'zgartirsa yoki profilni yopsa, ochiq sessiyalar darhol yangilanadi.
// Rahbar paroli o'zgarsa — botdagi rahbarlar ro'yxati tozalanadi (qayta /rahbar bilan ulanadi).
const ownerSig = st => createHash('sha256').update(JSON.stringify((st.staff || []).filter(x => x.role === 'owner' && !x.off).map(x => [x.id, x.hash || x.pinHash || '']).sort())).digest('hex').slice(0, 24);
db.doc('meta/settings').onSnapshot(async d => {
  try {
    const st = d.exists ? d.data() : {}; const ss = await db.collection('sessions').get();
    for (const x of ss.docs) {
      const v = x.data(); if (!v.staffId) continue; const staff = (st.staff || []).find(y => y.id === v.staffId);
      if (!staff || staff.off) await x.ref.set({ role: 'none', perms: {}, staffId: null, ts: Date.now() });
      else { const n = { ...sessFor(staff, st), exp: v.exp, ts: v.ts }; if (JSON.stringify([n.role, n.perms]) !== JSON.stringify([v.role, v.perms])) await x.ref.set(n); }
    }
    const sig = ownerSig(st); const bs = await db.doc('meta/botState').get(); const old = bs.exists ? bs.data().ownerSig : null;
    if (old !== sig) {
      await db.doc('meta/botState').set({ ownerSig: sig }, { merge: true });
      if (old) {
        const ids = await admins();
        if (ids.length) {
          await db.doc('meta/botAdmins').set({ ids: [], info: {} });
          for (const id of ids) { await send(id, '🔒 Rahbar paroli o\'zgartirildi. Xavfsizlik uchun rahbar rejimi o\'chirildi.\nQayta ulanish uchun /rahbar yuboring.', mainKb); await sleep(40); }
        }
      }
    }
  } catch (e) { console.error('sess refresh', e.message); }
}, e => console.error('settings listener', e.message));

// Omborga kirim qilinganda rahbarga xabar: kim, kimdan, qancha.
db.collection('purchases').where('ts', '>=', SINCE_EVENTS).onSnapshot(async snap => {
  for (const ch of snap.docChanges()) {
    if (ch.type !== 'added') continue; const x = ch.doc.data(); if (x.notified) continue;
    await ch.doc.ref.update({ notified: true }).catch(() => {});
    const n = (x.items || []).reduce((s, i) => s + (Number(i.qty) || 0), 0);
    // Kassada tuzatish: "rev" — eski yozuvni bekor qiluvchi, "fix" — to'g'rilangan kirim.
    if (x.rev) {
      if (x.del) await notifyAdmins(`🗑 <b>Kirim bekor qilindi</b>\n${LINE}\n👤 ${esc(x.fixBy || '—')}\n🚚 ${esc(x.supplierName || '')}\n📦 ${(x.items || []).length} xil · ${Math.abs(n)} dona · <b>${money(Math.abs(Number(x.total) || 0))} so'm</b>${x.why ? `\n📝 Sababi: ${esc(x.why)}` : ''}`);
      continue;
    }
    if (x.fix) {
      await notifyAdmins(`✏️ <b>Kirim tuzatildi</b>\n${LINE}\n👤 Tuzatdi: <b>${esc(x.fixBy || '—')}</b> (qabul qilgan: ${esc(x.seller || '—')})\n🚚 ${esc(x.supplierName || '')}\n📦 ${(x.items || []).length} xil · ${n} dona · <b>${money(x.total)} so'm</b>${x.why ? `\n📝 Sababi: ${esc(x.why)}` : ''}\n${(x.items || []).slice(0, 8).map(i => `   • ${esc(i.name)} × ${i.qty}`).join('\n')}`);
      continue;
    }
    await notifyAdmins(`📥 <b>Omborga kirim</b>\n${LINE}\n👤 Qabul qildi: <b>${esc(x.seller || '—')}</b>\n🚚 ${esc(x.supplierName || '')}\n📦 ${(x.items || []).length} xil · ${n} dona · <b>${money(x.total)} so'm</b>${Number(x.debt) ? `\n📒 Qarzga: ${money(x.debt)} so'm` : ''}\n${(x.items || []).slice(0, 8).map(i => `   • ${esc(i.name)} × ${i.qty}`).join('\n')}`);
  }
}, e => console.error('purchases listener', e.message));

// Mijozlarga ommaviy xabar: kassadagi «Aksiya va mijozlar» bo'limidan navbatga qo'yiladi.
let bcBusy = false;
async function runBroadcasts() {
  if (bcBusy) return; bcBusy = true;
  try {
    const snap = await db.collection('broadcasts').where('status', '==', 'new').get();
    for (const doc of snap.docs) {
      const b = doc.data(); await doc.ref.update({ status: 'sending', started: Date.now() });
      let list = (await db.collection('clients').get()).docs.map(d => ({ id: d.id, ...d.data() })).filter(c => c.tgId && !c.archived);
      if (Array.isArray(b.ids)) { const set = new Set(b.ids); list = list.filter(c => set.has(c.id)); }
      let sent = 0, failed = 0;
      for (const c of list) {
        const r = await tg('sendMessage', { chat_id: c.tgId, text: String(b.text || ''), reply_markup: mainKb }).catch(() => ({ ok: false }));
        r && r.ok ? sent++ : failed++;
        await sleep(60);
      }
      await doc.ref.update({ status: 'done', sent, failed, finished: Date.now() });
      await notifyAdmins(`📣 Xabar yuborildi: <b>${sent}</b> ta mijozga${failed ? ` (${failed} ta yetmadi — botni bloklagan bo'lishi mumkin)` : ''}.`);
    }
  } catch (e) { console.error('broadcast', e.message); } finally { bcBusy = false; }
}
db.collection('broadcasts').where('status', '==', 'new').onSnapshot(() => runBroadcasts(), e => console.error('broadcast listener', e.message));

// Tug'ilgan kun: har kuni 10:00 da mijozga tabrik (kassadagi tug'ilgan kun chegirmasi yoqilgan bo'lsa, foizi bilan).
setInterval(async () => {
  try {
    const t = new Date(Date.now() + 5 * 3600e3); if (t.getUTCHours() < 10) return;
    const key = t.toISOString().slice(0, 10); const bs = await db.doc('meta/botState').get();
    if (bs.exists && bs.data().lastBday === key) return;
    await db.doc('meta/botState').set({ lastBday: key }, { merge: true });
    const st = await settings(); const pct = Number(st.bdayPct) || 0, rng = st.bdayRange == null ? 3 : Number(st.bdayRange) || 0;
    const md = key.slice(5); const shop = st.shopName || 'Eco Aroma';
    const list = (await db.collection('clients').get()).docs.map(d => ({ id: d.id, ...d.data() })).filter(c => c.bday && String(c.bday).slice(5) === md && !c.archived);
    for (const c of list) if (c.tgId) { await tg('sendMessage', { chat_id: c.tgId, parse_mode: 'HTML', reply_markup: mainKb, text: `🎂 <b>${esc(c.name || '')}, tug'ilgan kuningiz bilan!</b>\n${LINE}\n${esc(shop)} jamoasi sizga sog'lik, baxt va go'zallik tilaydi 🌸${pct ? `\n\n🎁 Sizga sovg'a: <b>${pct}% chegirma</b>${rng ? ` (${rng} kun ichida)` : ''}.\nDo'konga kelganingizda kassada o'zi hisoblanadi.` : ''}` }); await sleep(60); }
    if (list.length) await notifyAdmins(`🎂 <b>Bugun tug'ilgan kun</b>\n${list.map(c => `• ${esc(c.name)}${c.phone ? ' · ' + esc(c.phone) : ''}`).join('\n')}`);
  } catch (e) { console.error('bday', e.message); }
}, 60e3);

// ---------- Zaxira ----------
// Har kecha 22:00 da: yakshanba kuni (yoki 7 kundan beri to'liq bo'lmasa) — to'liq zaxira,
// boshqa kunlari — yengil zaxira (tovarlar, mijozlar, sozlamalar to'liq + oxirgi 8 kunlik savdo va harakatlar).
// Bu Firebase bepul limitini (kuniga 50 000 o'qish) tejaydi. Ikkalasi ham «Zaxiradan tiklash» bilan tiklanadi.
const FULL_COLS = ['products', 'clients', 'suppliers', 'meta', 'inventory', 'certs', 'broadcasts'];
const TS_COLS = ['sales', 'payments', 'purchases', 'returns', 'expenses', 'shifts', 'stockLog', 'certUses'];
async function sendBackup(key, full, to) {
  const docs = []; const since = Date.now() - 8 * 864e5;
  for (const c of FULL_COLS) (await db.collection(c).get()).docs.forEach(d => { if (!(c === 'meta' && (d.id === 'botState' || d.id === 'botAdmins'))) docs.push([c + '/' + d.id, d.data()]); });
  for (const c of TS_COLS) (await (full ? db.collection(c).get() : db.collection(c).where('ts', '>=', since).get())).docs.forEach(d => docs.push([c + '/' + d.id, d.data()]));
  let buf = Buffer.from(JSON.stringify({ app: 'eco-aroma-kassa', v: 2, ts: Date.now(), part: full ? 'full' : 'light', docs })), name = `eco-kassa-${full ? 'toliq' : 'yengil'}-zaxira-${key}.json`;
  if (buf.length > 45e6) { buf = gzipSync(buf); name += '.gz'; }
  for (const id of (to || await admins())) {
    const fd = new FormData();
    fd.append('chat_id', String(id));
    fd.append('caption', `💾 ${full ? 'To\'liq' : 'Yengil (oxirgi 8 kun)'} zaxira · ${dmy(key)} · ${docs.length} ta yozuv\nKerak bo'lsa: Kassa → Sozlamalar → «Zaxiradan tiklash».${full ? '' : '\nTo\'liq zaxira — har yakshanba yoki /zaxira buyrug\'i bilan.'}`);
    fd.append('document', new Blob([buf]), name);
    const r = await fetch(API + 'sendDocument', { method: 'POST', body: fd }).then(x => x.json()).catch(e => ({ ok: false, description: e.message }));
    if (!r.ok) console.error('backup send', r.description);
  }
  if (full) await db.doc('meta/botState').set({ lastFullBackup: key }, { merge: true });
}
setInterval(async () => {
  try {
    const t = new Date(Date.now() + 5 * 3600e3); if (t.getUTCHours() < 22) return;
    const key = t.toISOString().slice(0, 10); const bs = await db.doc('meta/botState').get(); const b = bs.exists ? bs.data() : {};
    if (b.lastBackup === key) return;
    await db.doc('meta/botState').set({ lastBackup: key }, { merge: true });
    const full = t.getUTCDay() === 0 || !b.lastFullBackup || (Date.parse(key) - Date.parse(b.lastFullBackup)) >= 7 * 864e5;
    await sendBackup(key, full);
  } catch (e) { console.error('backup', e.message); }
}, 60e3);

// Inventarizatsiya: har oyning belgilangan kunida (Sozlama: meta/settings.invDay, 0 = o'chiq) soat 10:00 da eslatma.
setInterval(async () => {
  try {
    const t = new Date(Date.now() + 5 * 3600e3); if (t.getUTCHours() < 10) return;
    const st = await settings(); const day = st.invDay == null ? 1 : Number(st.invDay) || 0; if (!day || t.getUTCDate() !== day) return;
    const key = t.toISOString().slice(0, 7); const bs = await db.doc('meta/botState').get();
    if (bs.exists && bs.data().lastInvRemind === key) return;
    await db.doc('meta/botState').set({ lastInvRemind: key }, { merge: true });
    const m0 = Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), 1) - 5 * 3600e3;
    const inv = (await db.collection('inventory').get()).docs.map(d => d.data());
    if (inv.some(x => x.status === 'done' && Number(x.finished) >= m0)) return;
    const open = inv.some(x => x.status === 'open');
    await notifyAdmins(open
      ? "📋 <b>Inventarizatsiya boshlangan, lekin hali yakunlanmagan.</b>\nKassada «Inventarizatsiya» bo'limini ochib, sanashni tugating va «Yakunlash» bosing."
      : "📋 <b>Inventarizatsiya vaqti keldi!</b>\nBu oy tovarlar hali sanalmagan. Kassada «Inventarizatsiya» bo'limini oching va «Inventarizatsiyani boshlash» tugmasini bosing.");
  } catch (e) { console.error('inv remind', e.message); }
}, 60e3);

// Inventarizatsiya yakunlanganda rahbarga qisqa hisobot.
db.collection('inventory').where('status', '==', 'done').onSnapshot(async snap => {
  for (const ch of snap.docChanges()) {
    if (ch.type === 'removed') continue; const x = ch.doc.data(); if (x.notified || Number(x.finished) < SINCE_EVENTS) continue;
    await ch.doc.ref.update({ notified: true });
    const bad = (x.items || []).filter(i => i.diff).sort((a, b) => a.diff - b.diff).slice(0, 10);
    await notifyAdmins(`📋 <b>Inventarizatsiya yakunlandi</b> · ${fmt(x.finished)}\n${LINE}\n👤 ${esc(x.finishedBy || '')}\nSanaldi: <b>${x.nCount || 0}</b> ta tovar, farqi bor: <b>${x.nDiff || 0}</b> ta\n🔻 Kam chiqdi: <b>${money(x.short)} so'm</b>\n🔺 Ortiqcha: <b>${money(x.over)} so'm</b>${bad.length ? '\n\n' + bad.map(i => `• ${esc(i.name)}: ${i.sys} → ${i.real} (${i.diff > 0 ? '+' : ''}${i.diff})`).join('\n') : ''}`);
  }
}, e => console.error('inventory listener', e.message));

async function setupMenus() {
  await tg('setMyCommands', { commands: [{ command: 'start', description: 'Bosh menyu' }, { command: 'aksiya', description: 'Hozirgi aksiyalar' }] });
  await tg('setChatMenuButton', { menu_button: { type: 'web_app', text: "🛍 Do'kon", web_app: { url: SHOP_URL } } });
  for (const id of await admins()) {
    await tg('setMyCommands', { scope: { type: 'chat', chat_id: id }, commands: [
      { command: 'hisobot', description: 'Bugungi hisobot' }, { command: 'hafta', description: 'Haftalik hisobot' },
      { command: 'ombor', description: 'Ombor holati' }, { command: 'qarzdorlar', description: 'Qarzlar' },
      { command: 'zaxira', description: "To'liq zaxira fayli" }, { command: 'rahbarlar', description: 'Ulangan rahbarlar' },
      { command: 'chiqish', description: 'Rahbar rejimidan chiqish' }, { command: 'start', description: 'Bosh menyu' }] });
  }
}

async function main() {
  const me = await tg('getMe');
  if (!me.ok) { console.error('BOT_TOKEN noto\'g\'ri: Telegram uni qabul qilmadi. Token formati: ' + TOKEN.replace(/:.*/, ':***') + ' (uzunligi ' + TOKEN.length + ')'); return; }
  console.log('Bot ishga tushdi: @' + me.result.username);
  const wh = await tg('getWebhookInfo');
  if (wh.result && wh.result.url) { console.error('DIQQAT: botda webhook o\'rnatilgan (' + wh.result.url + '). Boshqa tizimni buzmaslik uchun bot ishga tushmadi.'); return; }
  setupMenus().catch(e => console.error('menus', e.message));
  let offset = 0;
  for (;;) {
    const r = await tg('getUpdates', { offset, timeout: 50, allowed_updates: ['message'] }).catch(() => null);
    if (!r || !r.ok) { if (r && r.error_code === 409) console.error('409: botni boshqa dastur ham o\'qiyapti'); await sleep(5000); continue; }
    for (const up of r.result) { offset = up.update_id + 1; if (up.message) onMessage(up.message).catch(e => console.error('msg', e)); }
  }
}
main();
