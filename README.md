# Eco Aroma Kassa

Bitta PWA: kompyuterda (POS), brauzerda va telefonda (Android APK / "Bosh ekranga qo'shish") ishlaydi.
Ma'lumotlar Firebase (Firestore) da, internetsiz ham ishlaydi va internet qaytganda sinxronlanadi.

## Tuzilishi

| Joy | Nima |
|---|---|
| `src/app.js` | **Kassa ilovasining kodi — o'zgarishlar shu yerda qilinadi** |
| `src/styles.css` | Asosiy dizayn (CSS) |
| `src/shell.html` | Sahifa skeleti (yon menyu, sarlavha) |
| `src/vendor/` | Firebase SDK (siqilgan, qo'l tegizilmaydi) |
| `index.html` | **Yig'ilgan natija** — GitHub Pages shuni ko'rsatadi. Qo'lda tahrirlanmaydi |
| `shop.html` | Telegram do'kon (mini-app) |
| `bot/` | Telegram bot serveri (Railway) — buyurtmalar, kunlik hisobot, tungi zaxira |
| `firestore.rules` | Baza xavfsizlik qoidalari |
| `sw.js`, `manifest.json` | Oflayn rejim va telefonga o'rnatish |

## O'zgartirish tartibi

```bash
npm install          # bir marta
# src/app.js yoki src/styles.css ni tahrirlang
npm run build        # index.html qayta yig'iladi
npm run check        # e'lon qilinmagan nom / sintaksis tekshiruvi
python3 tools/smoke/run.py   # har bir bo'lim kompyuter va telefon o'lchamida ochilishini sinaydi
```

Keyin `index.html` bilan birga commit qiling. Telefonlar yangi versiyani olishi uchun `sw.js` dagi
`eco-kassa-vNN` raqamini oshiring.

## Zaxira

- Bot har kecha 22:00 da rahbarlarga zaxira fayl yuboradi (yakshanba — to'liq, boshqa kunlar — yengil), `/zaxira` — darhol to'liq.
- Kassa: Sozlamalar → «Zaxira faylini yuklab olish» / «Zaxiradan tiklash» / «Zaxira faylini tekshirish».
- Tiklash faqat bazada **yo'q** yozuvlarni qaytaradi, mavjudlariga tegmaydi va natija hisobotini ko'rsatadi.

## Telegram bot (rahbar uchun)

- **Ogohlantirishlar** (Sozlamalar → «Telegram ogohlantirishlar»): katta chegirma, tannarxdan arzon sotuv, qaytarish,
  xarajat/to'lov tuzatilishi, kassada pul kam chiqishi. Rahbarning o'z harakatlari uchun xabar kelmaydi.
- **Ovozli kunlik hisobot** (21:30, yoki `/ovoz`, «🔊 Ovozli hisobot» tugmasi). Ovoz uchun kalit:
  kassadagi AI kaliti (Google Gemini, «Tahlil» bo'limida) avtomatik ishlatiladi; yoki Railway'da
  `AZURE_SPEECH_KEY` + `AZURE_SPEECH_REGION` (Madina ovozi), ixtiyoriy `TTS_VOICE`, `TTS_MODEL`, `GEMINI_API_KEY`.
- **Qarz eslatmasi** (Sozlamalar → «Qarz eslatmasi», odatda o'chiq): botdagi qarzdor mijozlarga har N kunda eslatma.
