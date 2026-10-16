// Eco Aroma Telegram bot: ro'yxatdan o'tish, xaridlar, keshbek, qarz.
// Kerakli muhit o'zgaruvchilari (Railway → Variables):
//   BOT_TOKEN       — @BotFather bergan token
//   FIREBASE_SA     — Firebase service account JSON (butun matn)
//   SHOP_URL        — (ixtiyoriy) do'kon sahifasi manzili
import admin from 'firebase-admin';
import { createHash, pbkdf2Sync } from 'node:crypto';
import { gzipSync } from 'node:zlib';

const TOKEN = ((process.env.BOT_TOKEN || '').match(/\d{6,}:[A-Za-z0-9_-]{30,}/) || [''])[0];
const SA = (process.env.FIREBASE_SA || '').trim();
const SHOP_URL = process.env.SHOP_URL || 'https://kamoliddintursunbiyev-web.github.io/eco-kassa/shop.html';
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

const money = n => Math.round(Number(n) || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
const fmt = ts => new Date(ts).toLocaleString('ru-RU', { timeZone: 'Asia/Tashkent', day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
const last9 = p => String(p || '').replace(/\D/g, '').slice(-9);
const esc = s => String(s ?? '').replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));

const B = { buys: '🧾 Xaridlarim', cb: '💰 Keshbekim', debt: '📒 Qarzim', contact: "☎️ Bog'lanish", report: '📊 Bugungi hisobot' };
const mainKb = { keyboard: [[{ text: "🛍 Do'kon", web_app: { url: SHOP_URL } }], [{ text: B.buys }, { text: B.cb }], [{ text: B.debt }, { text: B.contact }]], resize_keyboard: true, is_persistent: true };
const adminKb = { keyboard: [[{ text: B.report }], ...mainKb.keyboard], resize_keyboard: true, is_persistent: true };
const phoneKb = { keyboard: [[{ text: '📱 Telefon raqamni yuborish', request_contact: true }]], resize_keyboard: true, one_time_keyboard: true };

async function settings() { const s = await db.doc('meta/settings').get(); return s.exists ? s.data() : {}; }
async function userState(id) { const s = await db.doc(`tgUsers/${id}`).get(); return s.exists ? s.data() : null; }
async function clientOf(u) { if (!u || !u.clientId) return null; const c = await db.doc(`clients/${u.clientId}`).get(); return c.exists ? { id: c.id, ...c.data() } : null; }

// ---------- Rahbar (do'kon egasi) ----------
const sha = t => createHash('sha256').update('eco-aroma:' + t).digest('hex');
const checkCred = (x, pw) => { if (!x) return false; if (x.hash && x.salt) return pbkdf2Sync(pw, Buffer.from(x.salt, 'hex'), x.iter || 100000, 32, 'sha256').toString('hex') === x.hash; if (x.pinHash) return sha(pw) === x.pinHash; return false; };
async function admins() { const d = await db.doc('meta/botAdmins').get(); return d.exists ? (d.data().ids || []) : []; }
async function isAdmin(id) { return (await admins()).includes(id); }
const tries = new Map();
async function notifyAdmins(text) { for (const id of await admins()) await send(id, text, adminKb); }
const dayStart = (off = 0) => { const now = new Date(Date.now() + 5 * 3600e3); now.setUTCHours(0, 0, 0, 0); return now.getTime() - 5 * 3600e3 - off * 864e5; };
async function dailyReport(title) {
  const a = dayStart(0), b = a + 864e5, ya = dayStart(1);
  const snap = await db.collection('sales').where('ts', '>=', ya).get();
  const all = snap.docs.map(d => d.data()); const T = all.filter(s => s.ts >= a && s.ts < b), Y = all.filter(s => s.ts >= ya && s.ts < a);
  const sum = (L, k) => L.reduce((x, s) => x + (Number(s[k]) || 0), 0);
  const cost = L => L.reduce((x, s) => x + (s.items || []).reduce((y, i) => y + (Number(i.cost) || 0) * (Number(i.qty) || 0), 0), 0);
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
  const exps = (await db.collection('expenses').where('ts', '>=', a).get()).docs.map(d => d.data()).filter(x => x.ts < b && !x.void);
  const rSum = rets.reduce((x, r) => x + (Number(r.amount) || 0), 0), eSum = exps.reduce((x, e) => x + (Number(e.amount) || 0), 0);
  const st = await settings(); const lim = st.expDays == null ? 60 : Number(st.expDays) || 60; const today = dayStart(0);
  const expSoon = []; prods.forEach(p => { let Q = Math.max(0, Number(p.qty) || 0); [...(p.expiries || [])].filter(x => x && x.d).sort((x, y) => x.d < y.d ? 1 : -1).forEach(x => { if (Q <= 0) return; const t = Math.min(Q, Number(x.q) || Q); Q -= t; const dl = Math.round((Date.parse(x.d + 'T00:00:00+05:00') - today) / 864e5); if (dl <= lim) expSoon.push({ n: p.name, d: x.d, dl, q: t }); }); });
  expSoon.sort((x, y) => x.dl - y.dl);
  return `📊 <b>${title}</b>\n\n💵 Savdo: <b>${money(tot)} so'm</b>${pct === null ? '' : ` (${pct >= 0 ? '▲' : '▼'}${Math.abs(pct)}% kechaga)`}\n🧾 Cheklar: ${T.length} · o'rtacha ${money(T.length ? tot / T.length : 0)}\n📈 Foyda (taxminiy): ${money(tot - cost(T))}\n💳 Naqd ${money(sum(T, 'cash'))} · Karta ${money(sum(T, 'card'))}\n📒 Qarzga: ${money(sum(T, 'debt'))} · Chegirma: ${money(sum(T, 'discount'))}\n📨 Telegram buyurtmalar: ${ord.length}${Object.keys(byS).length ? `\n\n👤 Sotuvchilar:\n${Object.entries(byS).map(([k, v]) => `• ${esc(k)} — ${money(v)}`).join('\n')}` : ''}${top.length ? `\n\n🏆 Ko'p sotilgan:\n${top.map(([k, v]) => `• ${esc(k)} × ${v}`).join('\n')}` : ''}${rets.length ? `\n↩️ Qaytarish: ${rets.length} ta · ${money(rSum)} so'm` : ''}${exps.length ? `\n🧾 Xarajat: ${money(eSum)} so'm` : ''}\n\n⚠️ Ombor: ${neg} ta minusda, ${low} ta tugayapti${expSoon.length ? `\n⏳ Muddati yaqin yoki o'tgan: ${expSoon.length} ta\n${expSoon.slice(0, 5).map(x => `• ${esc(x.n)} — ${x.d.split('-').reverse().join('.')} (${x.dl < 0 ? -x.dl + ' kun o\'tgan' : x.dl + ' kun qoldi'})`).join('\n')}` : ''}\n👥 Mijozlar qarzi: ${money(cdebt)} so'm`;
}

async function send(chat, text, kb) { return tg('sendMessage', { chat_id: chat, text, parse_mode: 'HTML', reply_markup: kb }); }

async function askName(chat, from) {
  await db.doc(`tgUsers/${from.id}`).set({ step: 'name', ts: Date.now() }, { merge: true });
  await send(chat, `Assalomu alaykum! <b>Eco Aroma</b> botiga xush kelibsiz 🌿\n\nRo'yxatdan o'tish uchun <b>ismingizni</b> yozing:`, { remove_keyboard: true });
}

async function onMessage(m) {
  const chat = m.chat.id, from = m.from; if (m.chat.type !== 'private') return;
  const text = (m.text || '').trim();
  let u = await userState(from.id);

  if (text === '/rahbar') {
    if (await isAdmin(from.id)) return send(chat, 'Siz allaqachon rahbar sifatida ulangansiz ✅', adminKb);
    await db.doc(`tgUsers/${from.id}`).set({ adminStep: 'login' }, { merge: true });
    return send(chat, "🔐 Kassadagi <b>rahbar loginini</b> yozing:");
  }
  if (u && u.adminStep === 'login' && text && !text.startsWith('/')) {
    await db.doc(`tgUsers/${from.id}`).set({ adminStep: 'pw', adminLogin: text.trim().toLowerCase() }, { merge: true });
    return send(chat, "Endi <b>parolni</b> yozing.\n(Xabaringiz darhol o'chiriladi.)");
  }
  if (u && u.adminStep === 'pw' && text) {
    tg('deleteMessage', { chat_id: chat, message_id: m.message_id });
    const t = tries.get(from.id) || { n: 0, ts: Date.now() }; if (Date.now() - t.ts > 3600e3) { t.n = 0; t.ts = Date.now(); }
    await db.doc(`tgUsers/${from.id}`).set({ adminStep: null }, { merge: true });
    if (t.n >= 5) return send(chat, "Juda ko'p urinish. 1 soatdan keyin qayta urinib ko'ring.");
    const st = await settings();
    const owner = (st.staff || []).find(x => x.role === 'owner' && !x.off && String(x.login || x.name || '').toLowerCase() === u.adminLogin);
    if (owner && checkCred(owner, text)) {
      const ids = await admins(); if (!ids.includes(from.id)) ids.push(from.id);
      await db.doc('meta/botAdmins').set({ ids }, { merge: true });
      return send(chat, "✅ Rahbar sifatida ulandingiz!\n\nEndi sizga yuboriladi:\n• har bir yangi Telegram buyurtma\n• har kuni 21:30 da kunlik hisobot\n\n«📊 Bugungi hisobot» tugmasi bilan istalgan payt ko'rasiz.", adminKb);
    }
    t.n++; tries.set(from.id, t);
    return send(chat, "❌ Login yoki parol noto'g'ri. Qayta urinish uchun /rahbar yuboring.");
  }
  if (text === B.report || text === '/hisobot') {
    if (await isAdmin(from.id)) return send(chat, await dailyReport('Bugungi hisobot (hozirgacha)'), adminKb);
  }

  if (text === '/start' || !u) {
    if (u && u.step === 'done' && await clientOf(u)) return send(chat, `Xush kelibsiz, <b>${esc(u.name)}</b>! Quyidagi tugmalardan foydalaning.`, (await isAdmin(from.id)) ? adminKb : mainKb);
    return askName(chat, from);
  }

  if (u.step === 'name') {
    if (!text || text.startsWith('/') || text.length > 60) return send(chat, 'Iltimos, ismingizni yozing:');
    await db.doc(`tgUsers/${from.id}`).set({ step: 'phone', name: text }, { merge: true });
    return send(chat, `Rahmat, <b>${esc(text)}</b>! Endi pastdagi tugma orqali <b>telefon raqamingizni</b> yuboring:`, phoneKb);
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
    await db.doc(`tgUsers/${from.id}`).set({ step: 'done', clientId: doc.id, phone, regTs: Date.now() }, { merge: true });
    return send(chat, `✅ Ro'yxatdan o'tdingiz!\n\nEndi xaridlaringiz, keshbek va qarzingizni shu yerda ko'rasiz. Do'kondan xarid qilganda kassirga shu raqamni ayting: <b>${esc(phone)}</b>`, mainKb);
  }

  const amAdmin = await isAdmin(from.id);
  const kb = amAdmin ? adminKb : mainKb;
  const cl = await clientOf(u);
  if (!cl) { await db.doc(`tgUsers/${from.id}`).set({ step: 'name' }, { merge: true }); return askName(chat, from); }

  if (text === B.buys) {
    const snap = await db.collection('sales').where('clientId', '==', cl.id).get();
    const sales = snap.docs.map(d => d.data()).sort((a, b) => b.ts - a.ts);
    if (!sales.length) return send(chat, 'Hozircha xaridlaringiz yo\'q.', kb);
    const sum = sales.reduce((a, s) => a + (Number(s.total) || 0), 0);
    const lines = sales.slice(0, 10).map(s => `🧾 <b>${esc(s.no)}</b> · ${fmt(s.ts)}\n   ${(s.items || []).map(i => `${esc(i.name)} ×${i.qty}`).join(', ')}\n   <b>${money(s.total)} so'm</b>${Number(s.debt) ? ` (qarzga ${money(s.debt)})` : ''}`);
    return send(chat, `<b>Xaridlaringiz</b>: ${sales.length} ta, jami ${money(sum)} so'm\n\n${lines.join('\n\n')}${sales.length > 10 ? '\n\n…oxirgi 10 tasi ko\'rsatildi' : ''}`, kb);
  }
  if (text === B.cb) {
    const st = await settings();
    const pct = Number(st.cashbackPct) || 0;
    return send(chat, `💰 <b>Keshbekingiz: ${money(cl.cashback)} so'm</b>\n\n${pct ? `Har xariddan ${pct}% keshbek yoziladi. ` : ''}Keshbekni do'konda keyingi xaridda to'lov sifatida ishlatishingiz mumkin.`, kb);
  }
  if (text === B.debt) {
    const d = Number(cl.debt) || 0;
    if (d <= 0) return send(chat, '📒 Sizda qarz yo\'q. Rahmat! 🌿', kb);
    const p = await db.collection('payments').where('refId', '==', cl.id).get();
    const pays = p.docs.map(x => x.data()).filter(x => x.kind === 'client').sort((a, b) => b.ts - a.ts).slice(0, 5);
    return send(chat, `📒 <b>Qarzingiz: ${money(d)} so'm</b>${pays.length ? `\n\nOxirgi to'lovlaringiz:\n${pays.map(x => `• ${fmt(x.ts)} — ${money(x.amount)} so'm`).join('\n')}` : ''}`, kb);
  }
  if (text === B.contact) {
    const st = await settings();
    return send(chat, `☎️ <b>${esc(st.shopName || 'Eco Aroma')}</b>${st.phone ? `\nTelefon: ${esc(st.phone)}` : ''}`, kb);
  }
  return send(chat, 'Quyidagi tugmalardan birini tanlang 👇', kb);
}

// Kassada sotuv bo'lsa — Telegramdagi mijozga xabar
const START = Date.now();
db.collection('sales').where('ts', '>=', START).onSnapshot(async snap => {
  for (const ch of snap.docChanges()) {
    if (ch.type !== 'added') continue;
    const s = ch.doc.data(); if (!s.clientId || s.tgNotified) continue;
    const c = await db.doc(`clients/${s.clientId}`).get(); const cd = c.exists ? c.data() : null;
    if (!cd || !cd.tgId) continue;
    await ch.doc.ref.update({ tgNotified: true });
    await send(cd.tgId, `🛍 <b>Xaridingiz uchun rahmat!</b>\n🧾 Chek ${esc(s.no)} · ${money(s.total)} so'm${Number(s.cbEarned) ? `\n💰 Keshbek: +${money(s.cbEarned)} so'm (jami ${money(s.cbAfter)})` : ''}${Number(s.debt) ? `\n📒 Qarzga: ${money(s.debt)} so'm (jami qarz ${money(s.debtAfter)})` : ''}`, mainKb);
  }
}, e => console.error('sales listener', e.message));

db.collection('orders').where('ts', '>=', START).onSnapshot(async snap => {
  for (const ch of snap.docChanges()) {
    if (ch.type !== 'added') continue; const o = ch.doc.data(); if (o.status !== 'new' || o.adminNotified) continue;
    await ch.doc.ref.update({ adminNotified: true });
    await notifyAdmins(`📨 <b>Yangi Telegram buyurtma!</b>\n👤 ${esc(o.name)} · ${esc(o.phone)}${o.tgUser ? ` · @${esc(o.tgUser)}` : ''}\n${(o.items || []).map(i => `• ${esc(i.name)} × ${i.qty}`).join('\n')}\n💵 <b>${money(o.total)} so'm</b>\n${o.delivery === 'delivery' ? `🚚 Yetkazish: ${esc(o.address)}` : "🏪 Do'kondan olib ketadi"}${o.comment ? `\n💬 ${esc(o.comment)}` : ''}`);
  }
}, e => console.error('orders listener', e.message));
setInterval(async () => {
  try {
    const t = new Date(Date.now() + 5 * 3600e3); if (t.getUTCHours() !== 21 || t.getUTCMinutes() < 30) return;
    const key = t.toISOString().slice(0, 10); const st = await db.doc('meta/botState').get();
    if (st.exists && st.data().lastDaily === key) return;
    await db.doc('meta/botState').set({ lastDaily: key }, { merge: true });
    await notifyAdmins(await dailyReport(`Kunlik hisobot · ${key.split('-').reverse().join('.')}`));
  } catch (e) { console.error('daily', e.message); }
}, 60e3);

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
        await new Promise(x => setTimeout(x, 60));
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
    for (const c of list) if (c.tgId) await tg('sendMessage', { chat_id: c.tgId, parse_mode: 'HTML', reply_markup: mainKb, text: `🎂 <b>${esc(c.name || '')}, tug'ilgan kuningiz bilan!</b>\n\n${esc(shop)} jamoasi sizga sog'lik, baxt va go'zallik tilaydi 🌸${pct ? `\n\n🎁 Sizga sovg'a: <b>${pct}% chegirma</b>${rng ? ` (${rng} kun ichida)` : ''}. Do'konga kelganingizda kassada o'zi hisoblanadi.` : ''}` });
    if (list.length) await notifyAdmins(`🎂 Bugun tug'ilgan kun: ${list.map(c => `${esc(c.name)}${c.phone ? ' · ' + esc(c.phone) : ''}`).join(', ')}`);
  } catch (e) { console.error('bday', e.message); }
}, 60e3);

// Har kuni 22:00 da to'liq zaxira fayli rahbarga Telegramda yuboriladi (kassadagi «Zaxiradan tiklash» bilan tiklanadi).
async function sendBackup(key) {
  const cols = ['products', 'clients', 'suppliers', 'sales', 'payments', 'purchases', 'meta', 'returns', 'expenses', 'shifts', 'inventory', 'stockLog', 'certs', 'certUses', 'broadcasts'];
  const docs = [];
  for (const c of cols) (await db.collection(c).get()).docs.forEach(d => { if (!(c === 'meta' && d.id === 'botState')) docs.push([c + '/' + d.id, d.data()]); });
  let buf = Buffer.from(JSON.stringify({ app: 'eco-aroma-kassa', v: 2, ts: Date.now(), docs })), name = `eco-kassa-zaxira-${key}.json`;
  if (buf.length > 45e6) { buf = gzipSync(buf); name += '.gz'; }
  for (const id of await admins()) {
    const fd = new FormData();
    fd.append('chat_id', String(id));
    fd.append('caption', `💾 Kunlik zaxira · ${key.split('-').reverse().join('.')} · ${docs.length} ta yozuv\nKerak bo'lsa: Kassa → Sozlamalar → «Zaxiradan tiklash».`);
    fd.append('document', new Blob([buf]), name);
    const r = await fetch(API + 'sendDocument', { method: 'POST', body: fd }).then(x => x.json()).catch(e => ({ ok: false, description: e.message }));
    if (!r.ok) console.error('backup send', r.description);
  }
}
setInterval(async () => {
  try {
    const t = new Date(Date.now() + 5 * 3600e3); if (t.getUTCHours() < 22) return;
    const key = t.toISOString().slice(0, 10); const bs = await db.doc('meta/botState').get();
    if (bs.exists && bs.data().lastBackup === key) return;
    await db.doc('meta/botState').set({ lastBackup: key }, { merge: true });
    await sendBackup(key);
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
    if (ch.type === 'removed') continue; const x = ch.doc.data(); if (x.notified || Number(x.finished) < START) continue;
    await ch.doc.ref.update({ notified: true });
    const bad = (x.items || []).filter(i => i.diff).sort((a, b) => a.diff - b.diff).slice(0, 10);
    await notifyAdmins(`📋 <b>Inventarizatsiya yakunlandi</b> · ${fmt(x.finished)}\n👤 ${esc(x.finishedBy || '')}\nSanaldi: <b>${x.nCount || 0}</b> ta tovar, farqi bor: <b>${x.nDiff || 0}</b> ta\n🔻 Kam chiqdi: <b>${money(x.short)} so'm</b>\n🔺 Ortiqcha: <b>${money(x.over)} so'm</b>${bad.length ? '\n\n' + bad.map(i => `• ${esc(i.name)}: ${i.sys} → ${i.real} (${i.diff > 0 ? '+' : ''}${i.diff})`).join('\n') : ''}`);
  }
}, e => console.error('inventory listener', e.message));

async function main() {
  const me = await tg('getMe');
  if (!me.ok) { console.error('BOT_TOKEN noto\'g\'ri: Telegram uni qabul qilmadi. Token formati: ' + TOKEN.replace(/:.*/, ':***') + ' (uzunligi ' + TOKEN.length + ')'); return; }
  console.log('Bot ishga tushdi: @' + me.result.username);
  const wh = await tg('getWebhookInfo');
  if (wh.result && wh.result.url) { console.error('DIQQAT: botda webhook o\'rnatilgan (' + wh.result.url + '). Boshqa tizimni buzmaslik uchun bot ishga tushmadi.'); return; }
  let offset = 0;
  for (;;) {
    const r = await tg('getUpdates', { offset, timeout: 50, allowed_updates: ['message'] }).catch(() => null);
    if (!r || !r.ok) { if (r && r.error_code === 409) console.error('409: botni boshqa dastur ham o\'qiyapti'); await new Promise(x => setTimeout(x, 5000)); continue; }
    for (const up of r.result) { offset = up.update_id + 1; if (up.message) onMessage(up.message).catch(e => console.error('msg', e)); }
  }
}
main();
