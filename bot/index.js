// Eco Aroma Telegram bot: ro'yxatdan o'tish, xaridlar, keshbek, qarz.
// Kerakli muhit o'zgaruvchilari (Railway → Variables):
//   BOT_TOKEN       — @BotFather bergan token
//   FIREBASE_SA     — Firebase service account JSON (butun matn)
//   SHOP_URL        — (ixtiyoriy) do'kon sahifasi manzili
import admin from 'firebase-admin';

const TOKEN = process.env.BOT_TOKEN;
const SA = process.env.FIREBASE_SA;
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

const B = { buys: '🧾 Xaridlarim', cb: '💰 Keshbekim', debt: '📒 Qarzim', contact: "☎️ Bog'lanish" };
const mainKb = { keyboard: [[{ text: "🛍 Do'kon", web_app: { url: SHOP_URL } }], [{ text: B.buys }, { text: B.cb }], [{ text: B.debt }, { text: B.contact }]], resize_keyboard: true, is_persistent: true };
const phoneKb = { keyboard: [[{ text: '📱 Telefon raqamni yuborish', request_contact: true }]], resize_keyboard: true, one_time_keyboard: true };

async function settings() { const s = await db.doc('meta/settings').get(); return s.exists ? s.data() : {}; }
async function userState(id) { const s = await db.doc(`tgUsers/${id}`).get(); return s.exists ? s.data() : null; }
async function clientOf(u) { if (!u || !u.clientId) return null; const c = await db.doc(`clients/${u.clientId}`).get(); return c.exists ? { id: c.id, ...c.data() } : null; }

async function send(chat, text, kb) { return tg('sendMessage', { chat_id: chat, text, parse_mode: 'HTML', reply_markup: kb }); }

async function askName(chat, from) {
  await db.doc(`tgUsers/${from.id}`).set({ step: 'name', ts: Date.now() }, { merge: true });
  await send(chat, `Assalomu alaykum! <b>Eco Aroma</b> botiga xush kelibsiz 🌿\n\nRo'yxatdan o'tish uchun <b>ismingizni</b> yozing:`, { remove_keyboard: true });
}

async function onMessage(m) {
  const chat = m.chat.id, from = m.from; if (m.chat.type !== 'private') return;
  const text = (m.text || '').trim();
  let u = await userState(from.id);

  if (text === '/start' || !u) {
    if (u && u.step === 'done' && await clientOf(u)) return send(chat, `Xush kelibsiz, <b>${esc(u.name)}</b>! Quyidagi tugmalardan foydalaning.`, mainKb);
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

  const cl = await clientOf(u);
  if (!cl) { await db.doc(`tgUsers/${from.id}`).set({ step: 'name' }, { merge: true }); return askName(chat, from); }

  if (text === B.buys) {
    const snap = await db.collection('sales').where('clientId', '==', cl.id).get();
    const sales = snap.docs.map(d => d.data()).sort((a, b) => b.ts - a.ts);
    if (!sales.length) return send(chat, 'Hozircha xaridlaringiz yo\'q.', mainKb);
    const sum = sales.reduce((a, s) => a + (Number(s.total) || 0), 0);
    const lines = sales.slice(0, 10).map(s => `🧾 <b>${esc(s.no)}</b> · ${fmt(s.ts)}\n   ${(s.items || []).map(i => `${esc(i.name)} ×${i.qty}`).join(', ')}\n   <b>${money(s.total)} so'm</b>${Number(s.debt) ? ` (qarzga ${money(s.debt)})` : ''}`);
    return send(chat, `<b>Xaridlaringiz</b>: ${sales.length} ta, jami ${money(sum)} so'm\n\n${lines.join('\n\n')}${sales.length > 10 ? '\n\n…oxirgi 10 tasi ko\'rsatildi' : ''}`, mainKb);
  }
  if (text === B.cb) {
    const st = await settings();
    const pct = Number(st.cashbackPct) || 0;
    return send(chat, `💰 <b>Keshbekingiz: ${money(cl.cashback)} so'm</b>\n\n${pct ? `Har xariddan ${pct}% keshbek yoziladi. ` : ''}Keshbekni do'konda keyingi xaridda to'lov sifatida ishlatishingiz mumkin.`, mainKb);
  }
  if (text === B.debt) {
    const d = Number(cl.debt) || 0;
    if (d <= 0) return send(chat, '📒 Sizda qarz yo\'q. Rahmat! 🌿', mainKb);
    const p = await db.collection('payments').where('refId', '==', cl.id).get();
    const pays = p.docs.map(x => x.data()).filter(x => x.kind === 'client').sort((a, b) => b.ts - a.ts).slice(0, 5);
    return send(chat, `📒 <b>Qarzingiz: ${money(d)} so'm</b>${pays.length ? `\n\nOxirgi to'lovlaringiz:\n${pays.map(x => `• ${fmt(x.ts)} — ${money(x.amount)} so'm`).join('\n')}` : ''}`, mainKb);
  }
  if (text === B.contact) {
    const st = await settings();
    return send(chat, `☎️ <b>${esc(st.shopName || 'Eco Aroma')}</b>${st.phone ? `\nTelefon: ${esc(st.phone)}` : ''}`, mainKb);
  }
  return send(chat, 'Quyidagi tugmalardan birini tanlang 👇', mainKb);
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

async function main() {
  const me = await tg('getMe'); console.log('Bot:', me.result && me.result.username);
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
