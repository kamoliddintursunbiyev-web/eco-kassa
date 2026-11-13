/* Firebase funksiyalari (vendor/firebase.js ichida siqilgan nomlar bilan) */
var fsIncrement = Ly,
  fsSetDoc = wn,
  fsDoc = ct,
  fsUpdateDoc = xy,
  fsGetDocs = Xa,
  fsCollection = ai,
  fsWriteBatch = ad,
  fsOnSnapshot = ks,
  fsQuery = As,
  fsWhere = Ss,
  fsGetDoc = sd,
  fsOrderBy = Ry,
  fsLimit = Py,
  initializeApp = Yc,
  initializeFirestore = _y,
  persistentLocalCache = Oy,
  persistentMultipleTabManager = Vy,
  getAuth = Sl,
  onAuthStateChanged = El,
  signInAnonymously = Il;

var state = {
    db: null,
    dl: null,
    products: {},
    clients: {},
    suppliers: {},
    sales: [],
    payments: [],
    purchases: [],
    settings: {
      shopName: "Eco Aroma",
      staff: [],
      phone: "",
      footer: "Xaridingiz uchun rahmat!",
      allowNegative: !0,
      maxDisc: 10,
      sellerPrice: !1,
    },
    tab: "sotuv",
    cart: [],
    cartClient: null,
    discount: {
      type: "pct",
      val: 0,
    },
    pay: {
      cash: "",
      card: "",
      cb: "",
    },
    q: "",
    report: "today",
    loaded: !1,
  },
  qsel = (n, e = document) => e.querySelector(n),
  esc = (n) =>
    String(n ?? "").replace(
      /[&<>"']/g,
      (e) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[e],
    ),
  money = (n) =>
    Math.round(Number(n) || 0)
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, " "),
  num = (n) => {
    let e = parseFloat(String(n).replace(/\s/g, "").replace(",", "."));
    return isFinite(e) ? e : 0;
  },
  newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
  pad2 = (n) => String(n).padStart(2, "0"),
  fmtDateTime = (n) => {
    let e = new Date(n);
    return `${pad2(e.getDate())}.${pad2(e.getMonth() + 1)}.${String(e.getFullYear()).slice(2)} ${pad2(e.getHours())}:${pad2(e.getMinutes())}`;
  },
  fmtDay = (n) => {
    let e = new Date(n);
    return `${e.getFullYear()}-${pad2(e.getMonth() + 1)}-${pad2(e.getDate())}`;
  };
function toast(n) {
  let e = document.createElement("div");
  ((e.className = "toast"),
    (e.textContent = n),
    document.body.appendChild(e),
    setTimeout(() => e.remove(), 2600));
}
var store = {
  get(n, e) {
    try {
      let t = localStorage.getItem(n);
      return t == null ? e : JSON.parse(t);
    } catch {
      return e;
    }
  },
  set(n, e) {
    try {
      localStorage.setItem(n, JSON.stringify(e));
    } catch {}
  },
};
state.seller = null;
state.role = null;
state.bp = store.get("eco.bp", "1");
var isOwner = () => state.role === "owner",
  bufHex = (n) => [...new Uint8Array(n)].map((e) => e.toString(16).padStart(2, "0")).join(""),
  pbkdf2 = async (n, e, t = 1e5) => {
    let i = await crypto.subtle.importKey("raw", new TextEncoder().encode(n), "PBKDF2", !1, ["deriveBits"]),
      r = new Uint8Array(e.match(/../g).map((s) => parseInt(s, 16)));
    return bufHex(
      await crypto.subtle.deriveBits(
        {
          name: "PBKDF2",
          salt: r,
          iterations: t,
          hash: "SHA-256",
        },
        i,
        256,
      ),
    );
  },
  nT = () => bufHex(crypto.getRandomValues(new Uint8Array(16)));
async function hashPassword(n) {
  let e = nT();
  return {
    salt: e,
    iter: 31e4,
    hash: await pbkdf2(n, e, 31e4),
  };
}
async function iT(n, e) {
  return n
    ? n.hash && n.salt
      ? (await pbkdf2(e, n.salt, n.iter || 1e5)) === n.hash
      : n.pinHash
        ? (await legacyHash(e)) === n.pinHash
        : !1
    : !1;
}
var normText = (n) =>
    String(n || "")
      .trim()
      .toLowerCase()
      .replace(/[’‘`ʻʼ´]/g, "'")
      .replace(/\s+/g, " "),
  legacyHash = async (n) => {
    let e = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("eco-aroma:" + n));
    return [...new Uint8Array(e)].map((t) => t.toString(16).padStart(2, "0")).join("");
  };
var fire = {
    app: null,
    db: null,
    auth: null,
    user: null,
    pending: 0,
    unsubs: [],
  },
  incBy = (n) => fsIncrement(Number(n) || 0);
function trackWrite(n) {
  (fire.pending++,
    renderConn(),
    n.then(
      () => {
        (fire.pending--, renderConn());
      },
      (e) => {
        (fire.pending--,
          renderConn(),
          console.error(e),
          toast("Serverga yozib bo'lmadi: " + (e.code || e.message)));
      },
    ));
}
async function dbSet(n, e, t) {
  if (!fire.db) throw (toast("Baza ulanmagan"), new Error("nodb"));
  let i = {
    ...t,
  };
  (delete i.id, (i.by = fire.user ? fire.user.email : ""), trackWrite(fsSetDoc(fsDoc(fire.db, n, e), i)));
}
async function dbUpdate(n, e, t) {
  trackWrite(fsUpdateDoc(fsDoc(fire.db, n, e), t));
}
function renderConn() {
  let n = qsel("#conn");
  if (!n) return;
  let e = navigator.onLine;
  fire.pending > 0
    ? ((n.className = "conn off"),
      (n.textContent = e
        ? `Yuborilmoqda\u2026 (${fire.pending})`
        : `Internet yo'q \xB7 ${fire.pending} ta yozuv kutmoqda`))
    : ((n.className = "conn " + (e ? "on" : "off")),
      (n.textContent = e ? "Serverda saqlangan \u2713" : "Internet yo'q \xB7 ishlayveradi"));
}
window.addEventListener("online", renderConn);
window.addEventListener("offline", renderConn);
function downloadFile(n, e, t) {
  let i = new Blob([e], {
      type: t,
    }),
    r = document.createElement("a");
  ((r.href = URL.createObjectURL(i)),
    (r.download = n),
    document.body.appendChild(r),
    r.click(),
    setTimeout(() => {
      (URL.revokeObjectURL(r.href), r.remove());
    }, 1500));
}
async function rT() {
  let n = async (t) =>
    (await fsGetDocs(fsCollection(fire.db, t))).docs.map((r) => [t + "/" + r.id, r.data()]);
  toast("Zaxira tayyorlanmoqda\u2026");
  let e = [];
  for (let t of [
    "products",
    "clients",
    "suppliers",
    "sales",
    "payments",
    "purchases",
    "meta",
    "returns",
    "expenses",
    "shifts",
    "inventory",
    "stockLog",
    "certs",
    "certUses",
    "broadcasts",
    "orders",
    "catalog",
  ])
    e = e.concat(await n(t));
  (downloadFile(
    `eco-kassa-zaxira-${fmtDay(Date.now())}.json`,
    JSON.stringify({
      app: "eco-aroma-kassa",
      v: 2,
      ts: Date.now(),
      docs: e,
    }),
    "application/json",
  ),
    store.set("eco.lastBackup", Date.now()),
    toast(`Zaxira yuklab olindi \xB7 ${e.length} ta yozuv`),
    render());
}
/* ===== Zaxiradan tiklash =====
   Faqat bazada YO'Q yozuvlar qaytariladi (yo'qolgan ma'lumotni tiklash).
   Mavjud yozuvlarga tegilmaydi: Firestore qoidalari ko'p to'plamlarda o'zgartirishni taqiqlaydi
   (chek, smena, qaytarish...) va eski usulda bitta taqiqlangan yozuv butun 400 talik paketni
   buzib yuborardi. Har yozuv alohida yoziladi, natija hisoboti ko'rsatiladi. .gz fayl ham o'qiladi. */
var RESTORE_SKIP = ["secret", "devices", "sessions", "sessReq", "tgUsers", "private", "imgBackup"];
async function readBackupFile(file) {
  if (/\.gz$/i.test(file.name)) {
    if (!window.DecompressionStream) throw new Error("gz");
    return JSON.parse(await new Response(file.stream().pipeThrough(new DecompressionStream("gzip"))).text());
  }
  return JSON.parse(await file.text());
}
async function sT(n) {
  let e = await readBackupFile(n);
  if (e.app !== "eco-aroma-kassa" || !Array.isArray(e.docs)) throw new Error("bad");
  let byCol = {};
  for (let [path, data] of e.docs) {
    let o = path.indexOf("/"),
      col = path.slice(0, o),
      id = path.slice(o + 1);
    if (!col || !id || id.includes("/") || RESTORE_SKIP.includes(col)) continue;
    if (col === "meta" && (id === "botState" || id === "botAdmins")) continue;
    (byCol[col] = byCol[col] || []).push([id, data]);
  }
  let added = 0,
    had = 0,
    failed = 0,
    failCols = new Set(),
    total = Object.values(byCol).reduce((a, l) => a + l.length, 0);
  toast(`Tiklanmoqda… ${total} ta yozuv tekshirilmoqda`);
  for (let [col, list] of Object.entries(byCol)) {
    let have = new Set();
    try {
      (await fsGetDocs(fsCollection(fire.db, col))).docs.forEach((d) => have.add(d.id));
    } catch {
      (failed += list.length, failCols.add(col));
      continue;
    }
    let todo = list.filter(([id]) => (have.has(id) ? (had++, !1) : !0));
    for (let k = 0; k < todo.length; k += 50) {
      let res = await Promise.allSettled(
        todo.slice(k, k + 50).map(([id, data]) => fsSetDoc(fsDoc(fire.db, col, id), data)),
      );
      res.forEach((r) => (r.status === "fulfilled" ? added++ : (failed++, failCols.add(col))));
    }
  }
  closeModal();
  openModal(
    "Tiklash natijasi",
    `<div class="note">✅ Qaytarildi: <b>${added}</b> ta yozuv<br>
     ↔️ Bazada bor edi (tegilmadi): <b>${had}</b> ta<br>
     ${failed ? `⚠️ Yozilmadi: <b>${failed}</b> ta (${esc([...failCols].join(", "))}) — ruxsat yo'q yoki internet uzildi. Rahbar profilida qayta urinib ko'ring.` : "Xato yo'q."}</div>`,
    '<button class="btn primary" data-close="x">Yopish</button>',
  );
}
function oT(n) {
  let e = [
    ["Chek", "Sana", "Sotuvchi", "Mijoz", "Jami", "Chegirma", "Summa", "Naqd", "Karta", "Qarzga", "Tovarlar"],
  ];
  n.forEach((i) =>
    e.push([
      i.no,
      fmtDateTime(i.ts),
      i.seller || "",
      i.clientName || "",
      i.sub,
      i.discount,
      i.total,
      i.cash,
      i.card,
      i.debt,
      (i.items || []).map((r) => `${r.name} x${r.qty}`).join(", "),
    ]),
  );
  let t =
    "\uFEFF" +
    e.map((i) => i.map((r) => '"' + String(r ?? "").replace(/"/g, '""') + '"').join(";")).join(`\r
`);
  downloadFile(`savdo-${state.report}-${fmtDay(Date.now())}.csv`, t, "text/csv");
}
var LIVE_DAYS = 45;
function subscribeAll() {
  (fire.unsubs.forEach((r) => r()), (fire.unsubs = []));
  let n = (r) => {
      (console.error(r),
        r.code === "permission-denied" && toast("Ruxsat yo'q \u2014 Firestore qoidalarini tekshiring"));
    },
    e = (r) =>
      fire.unsubs.push(
        fsOnSnapshot(
          fsCollection(fire.db, r),
          (s) => {
            let o = {};
            (s.forEach((c) => {
              o[c.id] = {
                id: c.id,
                ...c.data(),
              };
            }),
              (state[r] = o),
              (state.loaded = !0),
              (r === "products" || r === "catalog") && TT(),
              render());
          },
          n,
        ),
      );
  (e("products"),
    e("clients"),
    e("suppliers"),
    e("catalog"),
    e("inventory"),
    e("certs"),
    e("broadcasts"),
    fire.unsubs.push(
      fsOnSnapshot(
        fsQuery(fsCollection(fire.db, "orders"), fsWhere("ts", ">=", Date.now() - 30 * 864e5)),
        (r) => {
          let s = state.orders || [];
          state.orders = r.docs
            .map((c) => ({
              id: c.id,
              ...c.data(),
            }))
            .sort((c, l) => l.ts - c.ts);
          let o = state.orders.filter((c) => c.status === "new" && !s.some((l) => l.id === c.id));
          (state.ordersLoaded &&
            o.length &&
            (ET(), toast(`Telegramdan yangi buyurtma: ${o[0].name || ""} \xB7 ${money(o[0].total)} so'm`)),
            (state.ordersLoaded = !0),
            renderOrderBadges(),
            render());
        },
        n,
      ),
    ));
  let t = Date.now() - LIVE_DAYS * 864e5,
    i = (r) =>
      fire.unsubs.push(
        fsOnSnapshot(
          fsQuery(fsCollection(fire.db, r), fsWhere("ts", ">=", t)),
          (s) => {
            ((state[r] = s.docs
              .map((o) => ({
                id: o.id,
                ...o.data(),
              }))
              .sort((o, c) => num(c.ts) - num(o.ts))),
              r === "payments" && ((state._payRaw = state[r]), (state[r] = xLive(state[r]))),
              render());
          },
          n,
        ),
      );
  (i("sales"),
    i("payments"),
    i("purchases"),
    i("returns"),
    i("expenses"),
    i("shifts"),
    fire.unsubs.push(
      fsOnSnapshot(
        fsDoc(fire.db, "meta", "settings"),
        (r) => {
          if (
            (r.exists() &&
              (state.settings = {
                ...state.settings,
                ...r.data(),
              }),
            themeDraft || applyTheme(state.settings.theme),
            state.gate && authUi.mode === "login" && !qsel("#cfgText"))
          )
            restoreSession();
          else if (!state.gate) {
            let s = (state.settings.staff || []).find((o) => o.id === state.meId);
            if (state.meId && (!s || s.off)) {
              (store.set("eco.sess", null),
                (state.meId = null),
                (state.role = null),
                (authUi.mode = "login"),
                showLogin(),
                toast("Profilingiz yopildi"));
              return;
            }
            (renderHeader(), render());
          }
        },
        n,
      ),
    ));
}
function nextReceiptNo() {
  let n = (state.settings.staff || []).map((o) => o.name),
    e = Math.max(0, n.indexOf(state.seller)),
    t = String.fromCharCode(65 + Math.min(e, 25)),
    i = state.sales
      .filter((o) => String(o.no).startsWith(t + "-"))
      .reduce((o, c) => Math.max(o, parseInt(String(c.no).slice(2)) || 0), 0),
    r = "eco.no." + t,
    s = Math.max(i, store.get(r, 1e3)) + 1;
  return (store.set(r, s), t + "-" + s);
}
var ICONS = {
    inv: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V2.5h6V4"/><path d="M8.5 12l2.5 2.5 4.5-4.5"/>',
    home: '<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>',
    cart: '<circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/><path d="M2 3h3l2.5 12h12L22 7H6"/>',
    box: '<path d="M3 7l9-4 9 4-9 4-9-4z"/><path d="M3 7v10l9 4 9-4V7"/><path d="M12 11v10"/>',
    inbox: '<path d="M3 13l3-8h12l3 8v6H3z"/><path d="M3 13h5l1 3h6l1-3h5"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    users:
      '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.5 3.4-5.5 6.5-5.5s5.7 2 6.5 5.5"/><path d="M16 4.5a3.5 3.5 0 010 7M18 14.8c2 .8 3.2 2.6 3.6 5.2"/>',
    truck:
      '<path d="M2 6h12v10H2zM14 10h4l3 3v3h-7"/><circle cx="6" cy="18" r="1.8"/><circle cx="17" cy="18" r="1.8"/>',
    cash: '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 10v4M18 10v4"/>',
    gift: '<rect x="3" y="8" width="18" height="13" rx="1"/><path d="M3 12h18M12 8v13"/><path d="M12 8c-2-4-6-4-6-1.5S10 8 12 8zm0 0c2-4 6-4 6-1.5S14 8 12 8z"/>',
    trend: '<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
    chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z"/>',
  },
  svgIcon = (n) => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[n] || ""}</svg>`,
  ACCENTS = [
    ["#3d7a5c", "Evkalipt"],
    ["#085d30", "Eco Aroma"],
    ["#2f6b3f", "Yashil"],
    ["#0f766e", "Firuza"],
    ["#2a5bd7", "Ko'k"],
    ["#6d3fc0", "Binafsha"],
    ["#b4235a", "Malina"],
    ["#b8691c", "Qahrabo"],
    ["#9a7b2f", "Oltin"],
    ["#262626", "Qora"],
  ],
  SIDE_COLORS = [
    ["#22392f", "Mox"],
    ["#06331c", "Eco Aroma"],
    ["#16211a", "To'q yashil"],
    ["#111418", "Qora"],
    ["#14213d", "To'q ko'k"],
    ["#2a1630", "Olxo'ri"],
    ["#3a2a1a", "Kofe"],
  ],
  BG_PRESETS = {
    sage: ["Shalfey", "#eef2ec", "#111814"],
    mint: ["Yalpiz", "#f5f6f2", "#141812"],
    plain: ["Oq", "#f7f7f7", "#151515"],
    warm: ["Iliq", "#f8f3ec", "#18140f"],
    cool: ["Salqin", "#f1f4f8", "#11151b"],
    rose: ["Pushti", "#fbf2f4", "#1a1215"],
  },
  THEME_DEFAULT = {
    mode: "auto",
    accent: "#3d7a5c",
    side: "#22392f",
    bg: "sage",
    icons: "emoji",
    logo: "logo.png",
    v: 2,
  };
function hexRgb(n) {
  let e = /^#?([0-9a-f]{6})$/i.exec(n || "");
  if (!e) return [47, 107, 63];
  let t = parseInt(e[1], 16);
  return [(t >> 16) & 255, (t >> 8) & 255, t & 255];
}
function luminance(n) {
  return hexRgb(n)
    .map((e) => ((e /= 255), e <= 0.03928 ? e / 12.92 : Math.pow((e + 0.055) / 1.055, 2.4)))
    .reduce((e, t, i) => e + t * [0.2126, 0.7152, 0.0722][i], 0);
}
function mixColor(n, e, t) {
  let i = hexRgb(n),
    r = hexRgb(e);
  return (
    "#" +
    i
      .map((s, o) =>
        Math.round(s + (r[o] - s) * t)
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")
  );
}
function themeCss(n) {
  n = {
    ...THEME_DEFAULT,
    ...(n || {}),
  };
  let e = BG_PRESETS[n.bg] || BG_PRESETS.mint,
    t = n.accent,
    i = luminance(t) > 0.35 ? "#111" : "#fff",
    r = luminance(t) < 0.18 ? mixColor(t, "#ffffff", 0.45) : t,
    s = luminance(r) > 0.35 ? "#0f1a10" : "#fff",
    o = `--accent:${t};--accent-fg:${i};--accent-soft:${mixColor(t, "#ffffff", 0.86)};--ok:${t};--side-act:${t};--side-bg:${n.side};--bg:${e[1]};`,
    c = `--accent:${r};--accent-fg:${s};--accent-soft:${mixColor(r, "#000000", 0.72)};--ok:${r};--side-act:${mixColor(t, "#000000", 0.15)};--side-bg:${n.side};--bg:${e[2]};`;
  return `:root{${o}}@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){${c}}}:root[data-theme="dark"]{${c}}`;
}
function applyTheme(n) {
  let raw = n || {};
  n = {
    ...THEME_DEFAULT,
    ...raw,
  };
  raw.v !== 2 &&
    ((n.accent = THEME_DEFAULT.accent), (n.side = THEME_DEFAULT.side), (n.bg = THEME_DEFAULT.bg));
  let e = themeCss(n);
  ((qsel("#themeVars").textContent = e),
    n.mode === "auto"
      ? document.documentElement.removeAttribute("data-theme")
      : document.documentElement.setAttribute("data-theme", n.mode),
    document.documentElement.classList.toggle("icons-line", n.icons === "line"),
    document.querySelectorAll("#bnav i[data-ico]").forEach((r) => {
      r.innerHTML = n.icons === "line" ? svgIcon(r.dataset.ico) : r.dataset.emo;
    }),
    document.querySelectorAll("#tabs .ti").forEach((r) => {
      r.innerHTML || (r.innerHTML = svgIcon(r.dataset.ico));
    }),
    document.querySelectorAll(".brandmark").forEach((r) => {
      r.outerHTML = n.logo
        ? `<img class="brandlogo brandmark" src="${n.logo}" alt="">`
        : '<span class="drop brandmark" aria-hidden="true"></span>';
    }));
  let t = document.querySelector("link[rel=icon]");
  t && n.logo && (t.href = n.logo);
  let i = document.querySelector("meta[name=theme-color]");
  i && (i.content = n.side);
  try {
    localStorage.setItem(
      "eco.theme",
      JSON.stringify({
        css: e,
        mode: n.mode,
        line: n.icons === "line",
        logo: n.logo,
      }),
    );
  } catch {}
}
var themeDraft = null;
function themeSettingsHtml() {
  let raw = themeDraft || state.settings.theme || {},
    n = {
      ...THEME_DEFAULT,
      ...raw,
    };
  raw.v !== 2 &&
    ((n.accent = THEME_DEFAULT.accent), (n.side = THEME_DEFAULT.side), (n.bg = THEME_DEFAULT.bg));
  return `<div class="panel" style="max-width:640px;margin-top:14px"><div class="panel-h"><h2>Ko'rinish (dizayn)</h2></div><div class="panel-b" style="display:grid;gap:16px">
   <div><div class="l" style="margin-bottom:6px">Logotip (kassada, ilovada va kirish oynasida chiqadi)</div>
     <div style="display:flex;gap:12px;align-items:center">${n.logo ? `<img src="${n.logo}" alt="" style="width:64px;height:64px;border-radius:14px;object-fit:cover;background:#fff;border:1px solid var(--line)">` : `<span class="muted">Logotip yo'q</span>`}
     <label class="btn" for="thLogo" style="display:inline-block">Logotip yuklash<input type="file" id="thLogo" accept="image/*" hidden></label>${n.logo ? '<button class="btn sm" data-th="logo:">Olib tashlash</button>' : '<button class="btn sm" data-th="logo:logo.png">Eco Aroma logosi</button>'}</div></div>
   <div><div class="l" style="margin-bottom:6px">Rejim</div><span class="seg">${[
     ["auto", "Avto"],
     ["light", "Yorug'"],
     ["dark", "Qorong'i"],
   ]
     .map(([e, t]) => `<button data-th="mode:${e}" aria-pressed="${n.mode === e}">${t}</button>`)
     .join("")}</span></div>
   <div><div class="l" style="margin-bottom:6px">Asosiy rang (tugmalar, grafiklar)</div><div class="swatches">${ACCENTS.map(([e, t]) => `<button data-th="accent:${e}" aria-pressed="${n.accent === e}" style="background:${e}" aria-label="${t}" title="${t}"></button>`).join("")}<input type="color" id="thAccent" value="${n.accent}" aria-label="Boshqa rang"></div></div>
   <div><div class="l" style="margin-bottom:6px">Yon panel va tepa paneli rangi</div><div class="swatches">${SIDE_COLORS.map(([e, t]) => `<button data-th="side:${e}" aria-pressed="${n.side === e}" style="background:${e}" aria-label="${t}" title="${t}"></button>`).join("")}<input type="color" id="thSide" value="${n.side}" aria-label="Boshqa rang"></div></div>
   <div><div class="l" style="margin-bottom:6px">Orqa fon</div><div class="bgopt">${Object.entries(BG_PRESETS)
     .map(
       ([e, [t, i]]) =>
         `<button data-th="bg:${e}" aria-pressed="${n.bg === e}" style="background:${i}">${t}</button>`,
     )
     .join("")}</div></div>
   <div><div class="l" style="margin-bottom:6px">Ikonkalar</div><span class="seg"><button data-th="icons:emoji" aria-pressed="${n.icons === "emoji"}">\u{1F3E0} Rangli</button><button data-th="icons:line" aria-pressed="${n.icons === "line"}">Chiziqli</button></span></div>
   <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn primary" data-act="savetheme">Dizaynni saqlash</button><button class="btn" data-act="resettheme">Standartga qaytarish</button></div>
   <div class="note">O'zgarishlar darhol ko'rinadi. \xABSaqlash\xBB bosilgach, barcha kompyuter va telefonlarda shu dizayn bo'ladi.</div>
  </div></div>`;
}
function setThemeDraft(n, e) {
  ((themeDraft = {
    ...THEME_DEFAULT,
    ...(themeDraft || state.settings.theme || {}),
    [n]: e,
  }),
    applyTheme(themeDraft),
    render());
}
document.addEventListener("click", (n) => {
  let e = n.target.closest("[data-th]");
  if (!e || !isOwner()) return;
  let t = e.dataset.th.indexOf(":");
  setThemeDraft(e.dataset.th.slice(0, t), e.dataset.th.slice(t + 1));
});
document.addEventListener("input", (n) => {
  isOwner() &&
    (n.target.id === "thAccent" &&
      ((themeDraft = {
        ...THEME_DEFAULT,
        ...(themeDraft || state.settings.theme || {}),
        accent: n.target.value,
      }),
      applyTheme(themeDraft)),
    n.target.id === "thSide" &&
      ((themeDraft = {
        ...THEME_DEFAULT,
        ...(themeDraft || state.settings.theme || {}),
        side: n.target.value,
      }),
      applyTheme(themeDraft)));
});
document.addEventListener(
  "change",
  async (n) => {
    if (n.target.id === "thLogo" && n.target.files[0] && isOwner()) {
      try {
        let e = await shrinkImage(n.target.files[0], 256);
        setThemeDraft("logo", e);
      } catch {
        toast("Rasmni o'qib bo'lmadi");
      }
      n.target.value = "";
    }
  },
  !0,
);
function renderHeader() {
  ((qsel("#shopName").textContent = state.settings.shopName || "Eco Aroma"),
    (qsel("#whoName").textContent = state.seller || "\u2014"),
    (qsel("#whoRole").textContent = isOwner() ? "Rahbar" : "Sotuvchi"),
    document.querySelectorAll("#tabs [data-owner]").forEach((n) => {
      n.hidden = !isOwner();
    }),
    document.querySelectorAll("#bnav [data-owner]").forEach((n) => {
      n.hidden = !isOwner();
    }),
    qsel("#mShop") &&
      ((qsel("#mShop").textContent = state.settings.shopName || "Eco Aroma"),
      (qsel("#mWho").textContent = state.seller || "")),
    xPermUI());
}
function shrinkImage(n, e = 320) {
  return new Promise((t, i) => {
    let r = URL.createObjectURL(n),
      s = new Image();
    ((s.onload = () => {
      let o = Math.min(1, e / Math.max(s.width, s.height)),
        c = document.createElement("canvas");
      ((c.width = Math.round(s.width * o)),
        (c.height = Math.round(s.height * o)),
        c.getContext("2d").drawImage(s, 0, 0, c.width, c.height),
        URL.revokeObjectURL(r));
      let l = 0.8,
        h = c.toDataURL("image/webp", l);
      h.startsWith("data:image/webp") || (h = c.toDataURL("image/jpeg", l));
      let f = h.slice(5, h.indexOf(";"));
      for (; h.length > 6e4 && l > 0.35;) ((l -= 0.1), (h = c.toDataURL(f, l)));
      t(h);
    }),
      (s.onerror = () => {
        (URL.revokeObjectURL(r), i(new Error("img")));
      }),
      (s.src = r));
  });
}
var initials = (n) =>
    esc(
      String(n || "?")
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((e) => e[0] || "")
        .join("")
        .toUpperCase(),
    ),
  hasCamScanner = () =>
    "BarcodeDetector" in window && !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
  camStream = null;
async function camScan(n) {
  if (!hasCamScanner()) {
    toast("Bu qurilmada kamera skaneri ishlamaydi (Android Chrome kerak)");
    return;
  }
  let e = qsel("#camRoot");
  e.innerHTML = `<div class="cam"><video playsinline muted></video><div class="frame"></div><div class="bar"><span id="camMsg">Shtrix-kodni ramkaga to'g'rilang\u2026</span><button class="btn" data-camclose>Yopish</button></div></div>`;
  let t;
  try {
    t = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: "environment",
      },
    });
  } catch {
    ((e.innerHTML = ""), toast("Kameraga ruxsat berilmadi"));
    return;
  }
  let i = e.querySelector("video");
  ((i.srcObject = t), await i.play().catch(() => {}));
  let r;
  try {
    r = new BarcodeDetector({
      formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39", "itf", "qr_code"],
    });
  } catch {
    r = new BarcodeDetector();
  }
  let s = !0;
  camStream = () => {
    ((s = !1), t.getTracks().forEach((c) => c.stop()), (e.innerHTML = ""), (camStream = null));
  };
  let o = async () => {
    if (s) {
      try {
        let c = await r.detect(i);
        if (c && c[0] && c[0].rawValue) {
          let l = c[0].rawValue;
          try {
            navigator.vibrate && navigator.vibrate(60);
          } catch {}
          (camStream(), n(l));
          return;
        }
      } catch {}
      setTimeout(o, 250);
    }
  };
  o();
}
document.addEventListener("click", (n) => {
  n.target.closest("[data-camclose]") && camStream && camStream();
});
function onBarcode(n) {
  if (xCertScan(n)) return !0;
  let e = activeProducts().find((i) => hasBc(i, n));
  if (e) return (addToCart(e), (state.q = ""), render(!0), !0);
  let t = activeProducts().filter((i) => (i.name || "").toLowerCase().includes(n.toLowerCase()));
  return t.length === 1
    ? (addToCart(t[0]), (state.q = ""), render(!0), !0)
    : (t.length || toast(`"${n}" topilmadi`), !1);
}
function pT(n) {
  return '"' + String(n ?? "").replace(/"/g, '""') + '"';
}
function mT() {
  let n = [["Nomi", "Shtrix-kod", "Toifa", "Kirim narxi", "Sotuv narxi", "Qoldiq", "Kam qoldi chegarasi"]];
  (activeProducts().forEach((e) =>
    n.push([e.name, bcs(e).join(", "), e.cat || "", num(e.cost), num(e.price), num(e.qty), num(e.min || 3)]),
  ),
    downloadFile(
      `tovarlar-${fmtDay(Date.now())}.csv`,
      "\uFEFF" +
        n.map((e) => e.map(pT).join(";")).join(`\r
`),
      "text/csv",
    ));
}
function gT(n) {
  n = n.replace(/^﻿/, "");
  let e = n.split(/\r?\n/)[0] || "",
    t = e.split(";").length >= e.split(",").length ? ";" : e.includes("	") ? "	" : ",",
    i = [],
    r = [],
    s = "",
    o = !1;
  for (let c = 0; c < n.length; c++) {
    let l = n[c];
    o
      ? l === '"'
        ? n[c + 1] === '"'
          ? ((s += '"'), c++)
          : (o = !1)
        : (s += l)
      : l === '"'
        ? (o = !0)
        : l === t
          ? (r.push(s), (s = ""))
          : l ===
              `
`
            ? (r.push(s.replace(/\r$/, "")), i.push(r), (r = []), (s = ""))
            : (s += l);
  }
  return (
    (s || r.length) && (r.push(s.replace(/\r$/, "")), i.push(r)),
    i.filter((c) => c.some((l) => String(l).trim()))
  );
}
async function yT(n) {
  let e = gT(await n.text());
  if (e.length < 2) {
    toast("Faylda tovar topilmadi");
    return;
  }
  let t = e[0].map((p) => String(p).trim().toLowerCase()),
    i = new Set(),
    r = (...p) => {
      for (let y of p) {
        let S = t.findIndex((x, N) => !i.has(N) && x.includes(y));
        if (S >= 0) return (i.add(S), S);
      }
      return -1;
    },
    s = {};
  if (
    ((s.bar = r("shtrix", "barcode", "\u0448\u0442\u0440\u0438\u0445", "kod")),
    (s.cost = r("kirim", "cost", "\u0441\u0435\u0431\u0435\u0441\u0442", "\u0437\u0430\u043A\u0443\u043F")),
    (s.price = r("sotuv", "price", "\u0446\u0435\u043D\u0430", "narx")),
    (s.min = r("kam", "min")),
    (s.name = r("nom", "name", "\u043D\u0430\u0438\u043C\u0435\u043D", "\u0442\u043E\u0432\u0430\u0440")),
    (s.cat = r("toifa", "kateg", "cat", "\u043A\u0430\u0442\u0435\u0433")),
    (s.qty = r("qoldiq", "qty", "soni", "\u043E\u0441\u0442\u0430\u0442", "\u043A\u043E\u043B")),
    s.name < 0)
  ) {
    toast('"Nomi" ustuni topilmadi');
    return;
  }
  let o = e
      .slice(1)
      .map((p) => ({
        name: String(p[s.name] || "").trim(),
        ...bcSplit(s.bar >= 0 ? p[s.bar] : ""),
        cat: s.cat >= 0 ? String(p[s.cat] || "").trim() : "",
        cost: s.cost >= 0 ? num(p[s.cost]) : null,
        price: s.price >= 0 ? num(p[s.price]) : null,
        qty: s.qty >= 0 && String(p[s.qty]).trim() !== "" ? num(p[s.qty]) : null,
        min: s.min >= 0 ? num(p[s.min]) : null,
      }))
      .filter((p) => p.name),
    c = Object.values(state.products).filter((p) => !p.archived),
    l = (p) =>
      bcs(p)
        .map((b) => c.find((y) => hasBc(y, b)))
        .find(Boolean) || c.find((y) => (y.name || "").trim().toLowerCase() === p.name.toLowerCase()),
    h = o.filter(l),
    f = o.filter((p) => !l(p));
  ((state._imp2 = {
    items: o,
    add: f.length,
    upd: h.length,
  }),
    openModal(
      "Exceldan yuklash",
      `<div class="note">Faylda <b>${o.length}</b> ta tovar: <b>${f.length}</b> ta yangi qo'shiladi, <b>${h.length}</b> ta mavjud tovar yangilanadi (narx, toifa${s.qty >= 0 ? ", qoldiq" : ""}).</div>
   ${s.qty >= 0 ? `<div class="note">Qoldiq o'zgarishlari \xABQoldiq tarixi\xBBga \xABExcel import\xBB deb yoziladi.</div>` : ""}
   <div class="tbl-wrap" style="max-height:40vh"><table class="t"><thead><tr><th>Nomi</th><th>Shtrix-kod</th><th class="r">Narx</th><th class="r">Qoldiq</th><th></th></tr></thead><tbody>${o
     .slice(0, 50)
     .map(
       (p) =>
         `<tr><td>${esc(p.name)}</td><td class="num">${esc(p.barcode)}</td><td class="r num">${p.price == null ? "\u2014" : money(p.price)}</td><td class="r num">${p.qty == null ? "\u2014" : money(p.qty)}</td><td>${l(p) ? '<span class="pill">yangilanadi</span>' : '<span class="pill ok">yangi</span>'}</td></tr>`,
     )
     .join("")}</tbody></table></div>`,
      '<button class="btn" data-close="x">Bekor qilish</button><button class="btn primary" data-act="doimport2">Yuklash</button>',
    ));
}
async function vT() {
  let n = state._imp2;
  if (!n || !isOwner()) return;
  let e = Object.values(state.products).filter((r) => !r.archived),
    t = 0,
    i = (r) =>
      bcs(r)
        .map((b) => e.find((s) => hasBc(s, b)))
        .find(Boolean) || e.find((s) => (s.name || "").trim().toLowerCase() === r.name.toLowerCase());
  for (let r of n.items) {
    let s = i(r);
    if (s) {
      let o = {};
      (bcMerge(s, r, o),
        r.cat && (o.cat = r.cat),
        r.cost != null && (o.cost = r.cost),
        r.price != null && (o.price = r.price),
        r.min && (o.min = r.min),
        r.qty != null &&
          r.qty !== num(s.qty) &&
          ((o.qty = incBy(r.qty - num(s.qty))),
          await dbSet("stockLog", newId(), {
            pid: s.id,
            name: s.name,
            from: num(s.qty),
            to: r.qty,
            delta: r.qty - num(s.qty),
            why: "Excel import",
            who: state.seller,
            ts: Date.now(),
          })),
        Object.keys(o).length && (await dbUpdate("products", s.id, o)));
    } else {
      let o = newId();
      (await dbSet("products", o, {
        name: r.name,
        barcode: r.barcode,
        barcodes: r.barcodes || [],
        cat: r.cat,
        cost: r.cost || 0,
        price: r.price || 0,
        qty: r.qty || 0,
        min: r.min || 3,
        created: Date.now(),
      }),
        r.qty &&
          (await dbSet("stockLog", newId(), {
            pid: o,
            name: r.name,
            from: 0,
            to: r.qty,
            delta: r.qty,
            why: "Excel import",
            who: state.seller,
            ts: Date.now(),
          })));
    }
    t++;
  }
  ((state._imp2 = null), closeModal(), toast(`${t} ta tovar yuklandi`));
}
var isMobile = () => window.matchMedia("(max-width:760px)").matches;
document.addEventListener("click", (n) => {
  let e = n.target.closest("#bnav button");
  if (e) {
    if (e.dataset.more !== void 0) {
      let t = [
        ["mijozlar", "\u{1F465} Mijozlar"],
        ["hisobot", "\u{1F4CA} Hisobot"],
        ["inventar", "\u{1F4CB} Inventarizatsiya"],
        ["kassa", "\u{1F4B5} Kassa va xarajatlar"],
        ...(isOwner()
          ? [
              ["taminot", "\u{1F69A} Yetkazib beruvchilar"],
              ["marketing", "\u{1F381} Aksiya va mijozlar"],
              ["tahlil", "\u{1F4C8} Tahlil"],
              ["sozlama", "\u2699\uFE0F Sozlamalar va zaxira"],
            ]
          : []),
      ].filter((x) => xTabOk(x[0]));
      openModal(
        "Bo'limlar",
        `<div class="sheet">${t.map(([i, r]) => `<button data-gotab="${i}">${r}</button>`).join("")}</div>`,
      );
      return;
    }
    (switchTab(e.dataset.tab), window.scrollTo(0, 0));
  }
});
document.addEventListener("click", (n) => {
  let e = n.target.closest("[data-gotab]");
  e && (closeModal(), switchTab(e.dataset.gotab), window.scrollTo(0, 0));
});
function _T(n) {
  let e = new Date();
  (e.setHours(0, 0, 0, 0), e.setDate(e.getDate() - n));
  let t = new Date(e);
  return (t.setDate(t.getDate() + 1), [e.getTime(), t.getTime()]);
}
function salesSummary(n, e) {
  let t = state.sales.filter((s) => s.ts >= n && s.ts < e),
    i = t.reduce((s, o) => s + num(o.total), 0),
    r = t.reduce((s, o) => s + (o.items || []).reduce((c, l) => c + num(l.cost) * num(l.qty), 0), 0);
  return {
    L: t,
    total: i,
    cnt: t.length,
    profit: i - r,
    cash: t.reduce((s, o) => s + num(o.cash), 0),
    card: t.reduce((s, o) => s + num(o.card), 0),
    debt: t.reduce((s, o) => s + num(o.debt), 0),
    cb: t.reduce((s, o) => s + num(o.cbUsed), 0),
    disc: t.reduce((s, o) => s + num(o.discount), 0),
  };
}
function trendBadge(n, e, t) {
  if (!e) return n ? '<span class="trend up">yangi</span>' : "";
  let i = Math.round(((n - e) / e) * 100);
  return `<span class="trend ${i >= 0 ? "up" : "down"}">${i >= 0 ? "\u25B2" : "\u25BC"} ${Math.abs(i)}% ${t}</span>`;
}
var shortMoney = (n) =>
    n >= 1e6
      ? Math.round(n / 1e5) / 10 + " mln"
      : n >= 1e3
        ? Math.round(n / 1e3) + " ming"
        : String(Math.round(n)),
  MONTHS = ["yan", "fev", "mar", "apr", "may", "iyn", "iyl", "avg", "sen", "okt", "noy", "dek"];
function periodRange(n) {
  let e = _T(0)[0],
    t = 864e5;
  if (n === "7")
    return {
      a: e - 6 * t,
      b: e + t,
      n: 7,
      lbl: "o'tgan haftaga",
      title: "Oxirgi 7 kun",
    };
  if (n === "30")
    return {
      a: e - 29 * t,
      b: e + t,
      n: 30,
      lbl: "o'tgan 30 kunga",
      title: "Oxirgi 30 kun",
    };
  if (n === "m") {
    let i = new Date(),
      r = new Date(i.getFullYear(), i.getMonth(), 1).getTime(),
      s = Math.round((e + t - r) / t);
    return {
      a: r,
      b: e + t,
      n: s,
      lbl: "o'tgan oyga",
      title: "Shu oy",
      prevA: new Date(i.getFullYear(), i.getMonth() - 1, 1).getTime(),
    };
  }
  return {
    a: e,
    b: e + t,
    n: 1,
    lbl: "kechaga",
    title: "Bugun",
  };
}
var chartData = [];
function lineChart(n, e, t = 170) {
  chartData[n] = e;
  let i = isMobile() ? 360 : 640,
    r = t,
    s = 44,
    o = 10,
    c = 12,
    l = 24,
    h = Math.max(1, ...e.map(($) => $.v)),
    f = Math.pow(10, Math.floor(Math.log10(h))),
    p = Math.ceil(h / f) * f,
    y = ($) => s + (e.length < 2 ? 0 : ($ * (i - s - o)) / (e.length - 1)),
    S = ($) => c + (r - c - l) * (1 - $ / p),
    x = e.map(($, Y) => `${y(Y).toFixed(1)},${S($.v).toFixed(1)}`),
    N = [0, 0.5, 1]
      .map(
        ($) =>
          `<line class="gl" x1="${s}" x2="${i - o}" y1="${S(p * $)}" y2="${S(p * $)}"/><text x="${s - 6}" y="${S(p * $) + 4}" text-anchor="end">${shortMoney(p * $)}</text>`,
      )
      .join(""),
    P = Math.ceil(e.length / (isMobile() ? 4 : 7)),
    F = e
      .map(($, Y) =>
        Y % P === 0 || Y === e.length - 1
          ? `<text x="${y(Y)}" y="${r - 6}" text-anchor="middle">${esc($.lbl)}</text>`
          : "",
      )
      .join(""),
    z = `M${y(0)},${S(0)} L${x.join(" L")} L${y(e.length - 1)},${S(0)} Z`;
  return `<div class="vz" data-vz="${n}" data-w="${i}" data-l="${s}" data-r="${o}"><svg viewBox="0 0 ${i} ${r}" role="img" aria-label="Savdo grafigi">${N}<path class="ar" d="${z}"/><polyline class="ln" points="${x.join(" ")}"/>${e.length <= 31 ? e.map(($, Y) => `<circle class="dot" cx="${y(Y)}" cy="${S($.v)}" r="${Y === e.length - 1 ? 4 : 0}"/>`).join("") : ""}${F}<line class="cross" x1="0" x2="0" y1="${c}" y2="${r - l}" visibility="hidden"/><circle class="dot hov" r="5" cx="0" cy="0" visibility="hidden"/><rect class="hit" x="${s}" y="0" width="${i - s - o}" height="${r}"/></svg><div class="tip" hidden></div></div>`;
}
function barChart(n, e, t = 150) {
  chartData[n] = e;
  let i = isMobile() ? 360 : 640,
    r = t,
    s = 44,
    o = 12,
    c = 24,
    l = Math.max(1, ...e.map((N) => N.v)),
    h = Math.pow(10, Math.floor(Math.log10(l))),
    f = Math.ceil(l / h) * h,
    p = (i - s - 6) / e.length,
    y = (N) => o + (r - o - c) * (1 - N / f),
    S = [0, 0.5, 1]
      .map(
        (N) =>
          `<line class="gl" x1="${s}" x2="${i}" y1="${y(f * N)}" y2="${y(f * N)}"/><text x="${s - 6}" y="${y(f * N) + 4}" text-anchor="end">${shortMoney(f * N)}</text>`,
      )
      .join(""),
    x = e
      .map((N, P) => {
        let F = s + P * p + 1,
          z = Math.max(2, p - 2),
          $ = y(N.v),
          Y = Math.max(0, y(0) - $),
          ne = Math.min(4, z / 2, Y),
          Z =
            Y > 0
              ? `M${F},${y(0)} V${$ + ne} Q${F},${$} ${F + ne},${$} H${F + z - ne} Q${F + z},${$} ${F + z},${$ + ne} V${y(0)} Z`
              : "";
        return `${Z ? `<path class="bar${N.hl ? " hl" : ""}" d="${Z}"/>` : ""}<rect class="hit" data-i="${P}" x="${s + P * p}" y="${o}" width="${p}" height="${r - o - c}"/>${e.length <= (isMobile() ? 8 : 14) || P % Math.ceil(e.length / (isMobile() ? 7 : 12)) === 0 ? `<text x="${F + z / 2}" y="${r - 6}" text-anchor="middle">${esc(N.lbl)}</text>` : ""}`;
      })
      .join("");
  return `<div class="vz" data-vzb="${n}"><svg viewBox="0 0 ${i} ${r}" role="img" aria-label="Ustunli grafik">${S}${x}</svg><div class="tip" hidden></div></div>`;
}
function hbarChart(n, e) {
  let t = Math.max(1, ...n.map((i) => i[1]));
  return `<div class="hbar">${n.map(([i, r, s]) => `<div><span>${esc(i)}${s ? ` <span class="muted num">${s}</span>` : ""}</span><b class="num">${e ? e(r) : money(r)}</b><em><i style="width:${Math.max(2, Math.round((r / t) * 100))}%"></i></em></div>`).join("")}</div>`;
}
function showTip(n, e, t, i) {
  let r = n.querySelector(".tip");
  ((r.innerHTML = e),
    (r.hidden = !1),
    (r.style.left = Math.max(70, Math.min(n.clientWidth - 70, t)) + "px"),
    (r.style.top = i + "px"));
}
document.addEventListener("pointermove", (n) => {
  let e = n.target.closest(".vz[data-vz]");
  if (
    (document.querySelectorAll(".vz[data-vz]").forEach((i) => {
      if (i !== e) {
        let r = i.querySelector(".tip");
        (r && (r.hidden = !0),
          i.querySelectorAll(".cross,.hov").forEach((s) => s.setAttribute("visibility", "hidden")));
      }
    }),
    e)
  ) {
    let i = chartData[e.dataset.vz];
    if (!i) return;
    let r = e.querySelector("svg"),
      s = r.getBoundingClientRect(),
      o = +e.dataset.w,
      c = +e.dataset.l,
      l = +e.dataset.r,
      h = s.width / o,
      f = (n.clientX - s.left) / h,
      p = Math.max(
        0,
        Math.min(i.length - 1, Math.round((f - c) / ((o - c - l) / Math.max(1, i.length - 1)))),
      ),
      y = r.querySelector("polyline").getAttribute("points").split(" ")[p].split(",").map(Number),
      S = r.querySelector(".cross"),
      x = r.querySelector(".hov");
    (S.setAttribute("x1", y[0]),
      S.setAttribute("x2", y[0]),
      S.setAttribute("visibility", "visible"),
      x.setAttribute("cx", y[0]),
      x.setAttribute("cy", y[1]),
      x.setAttribute("visibility", "visible"),
      showTip(e, i[p].tip, y[0] * h, y[1] * h));
  }
  let t = n.target.closest(".vz[data-vzb] .hit");
  if (
    (document.querySelectorAll(".vz[data-vzb]").forEach((i) => {
      if (!t || !i.contains(t)) {
        let r = i.querySelector(".tip");
        r && (r.hidden = !0);
      }
    }),
    t)
  ) {
    let i = t.closest(".vz"),
      r = chartData[i.dataset.vzb][+t.dataset.i],
      s = t.getBoundingClientRect(),
      o = i.getBoundingClientRect();
    showTip(i, r.tip, s.left - o.left + s.width / 2, Math.max(20, s.top - o.top + s.height * 0.3));
  }
});
document.addEventListener(
  "pointerleave",
  (n) => {
    document.querySelectorAll(".vz .tip").forEach((e) => (e.hidden = !0));
  },
  !0,
);
function pageHome() {
  let n = periodRange(state.bp || "1"),
    e = 864e5,
    t = salesSummary(n.a, n.b),
    i = n.prevA ?? n.a - n.n * e,
    r = salesSummary(i, i + (n.b - n.a)),
    s = state.payments
      .filter((L) => L.ts >= n.a && L.ts < n.b && L.kind === "client")
      .reduce((L, K) => L + num(K.amount), 0),
    o,
    c;
  if (n.n === 1) {
    let L = {};
    t.L.forEach((ve) => {
      let Ge = new Date(ve.ts).getHours();
      ((L[Ge] = L[Ge] || {
        v: 0,
        c: 0,
      }),
        (L[Ge].v += num(ve.total)),
        L[Ge].c++);
    });
    let K = new Date().getHours(),
      nt = Math.min(8, ...Object.keys(L).map(Number)),
      Ne = Math.max(21, K);
    o = [];
    for (let ve = nt; ve <= Ne; ve++) {
      let Ge = L[ve] || {
        v: 0,
        c: 0,
      };
      o.push({
        lbl: String(ve).padStart(2, "0"),
        v: Ge.v,
        hl: ve === K,
        tip: `<b>${String(ve).padStart(2, "0")}:00\u2013${String(ve + 1).padStart(2, "0")}:00</b><br>${money(Ge.v)} so'm \xB7 ${Ge.c} chek`,
      });
    }
    c = "Soatlar bo'yicha savdo";
  } else {
    o = [];
    for (let L = 0; L < n.n; L++) {
      let K = n.a + L * e,
        nt = salesSummary(K, K + e),
        Ne = new Date(K);
      o.push({
        lbl: `${Ne.getDate()}-${MONTHS[Ne.getMonth()]}`,
        v: nt.total,
        tip: `<b>${Ne.getDate()}-${MONTHS[Ne.getMonth()]}</b><br>Savdo: ${money(nt.total)}<br>Foyda: ${money(nt.profit)} \xB7 ${nt.cnt} chek`,
      });
    }
    c = "Kunlik savdo";
  }
  let l = "";
  if (n.n > 1 && t.L.length) {
    let L = {};
    t.L.forEach((Me) => {
      let kn = new Date(Me.ts).getHours();
      L[kn] = (L[kn] || 0) + num(Me.total);
    });
    let K = Object.keys(L).map(Number),
      nt = Math.min(...K),
      Ne = Math.max(...K),
      ve = K.reduce((Me, kn) => (L[kn] > L[Me] ? kn : Me), K[0]),
      Ge = [];
    for (let Me = nt; Me <= Ne; Me++)
      Ge.push({
        lbl: String(Me).padStart(2, "0"),
        v: L[Me] || 0,
        hl: Me === ve,
        tip: `<b>${String(Me).padStart(2, "0")}:00</b><br>${money(L[Me] || 0)} so'm`,
      });
    l = `<div class="panel"><div class="panel-h"><h2 style="margin:0">Qaysi soatda ko'p sotiladi</h2><span class="spacer"></span><span class="muted">eng faol: ${String(ve).padStart(2, "0")}:00</span></div><div class="panel-b">${barChart("hp", Ge, 140)}</div></div>`;
  }
  let h = [
      ["Naqd", t.cash, "--s1"],
      ["Karta / Click", t.card, "--s2"],
      ["Keshbekdan", t.cb, "--s3"],
      ["Qarzga", t.debt, "--s4"],
    ],
    f = h.reduce((L, K) => L + K[1], 0),
    p = f
      ? `<div class="mix" role="img" aria-label="To'lov turlari">${h
          .filter((L) => L[1] > 0)
          .map(
            (L) =>
              `<i style="width:${((L[1] / f) * 100).toFixed(2)}%;background:var(${L[2]})" title="${L[0]}: ${money(L[1])}"></i>`,
          )
          .join("")}</div>
     <div class="legend">${h.map((L) => `<div><s style="background:var(${L[2]})"></s><span>${L[0]}</span><b class="num">${money(L[1])}</b><span class="muted num" style="flex:none;width:42px;text-align:right">${Math.round((L[1] / f) * 100)}%</span></div>`).join("")}</div>`
      : `<div class="muted">Bu davrda to'lov yo'q</div>`,
    y = {},
    S = {};
  t.L.forEach((L) =>
    (L.items || []).forEach((K) => {
      let nt = num(K.qty) * num(K.price);
      ((y[K.name] = y[K.name] || {
        v: 0,
        q: 0,
      }),
        (y[K.name].v += nt),
        (y[K.name].q += num(K.qty)));
      let Ne = state.products[K.pid],
        ve = (Ne && Ne.cat) || "Boshqa";
      S[ve] = (S[ve] || 0) + nt;
    }),
  );
  let x = Object.entries(y)
      .sort((L, K) => K[1].v - L[1].v)
      .slice(0, 7)
      .map(([L, K]) => [L, K.v, "\xD7 " + money(K.q)]),
    N = Object.entries(S).sort((L, K) => K[1] - L[1]),
    P = N.slice(0, 6);
  N.length > 6 && P.push(["Boshqalar", N.slice(6).reduce((L, K) => L + K[1], 0)]);
  let F = {};
  t.L.forEach((L) => {
    let K = L.seller || "\u2014";
    ((F[K] = F[K] || {
      v: 0,
      c: 0,
    }),
      (F[K].v += num(L.total)),
      F[K].c++);
  });
  let z = Object.entries(F)
      .sort((L, K) => K[1].v - L[1].v)
      .map(([L, K]) => [L, K.v, K.c + " chek"]),
    $ = activeProducts(),
    Y = $.filter((L) => num(L.qty) < 0),
    ne = $.filter((L) => num(L.qty) >= 0 && num(L.qty) <= num(L.min || 3)),
    Z = $.reduce((L, K) => L + Math.max(0, num(K.qty)) * num(K.cost), 0),
    w = $.reduce((L, K) => L + Math.max(0, num(K.qty)) * num(K.price), 0),
    v = Object.values(state.clients).reduce((L, K) => L + Math.max(0, num(K.debt)), 0),
    b = Object.values(state.suppliers).reduce((L, K) => L + Math.max(0, num(K.debt)), 0),
    I = Object.values(state.clients).reduce((L, K) => L + Math.max(0, num(K.cashback)), 0),
    T = (state.orders || []).filter((L) => L.status === "new"),
    k = t.total ? Math.round((t.profit / t.total) * 100) : 0,
    _ = [
      ["1", "Bugun"],
      ["7", "7 kun"],
      ["30", "30 kun"],
      ["m", "Shu oy"],
    ];
  return `<div class="dash">
  <h1 class="page">${n.title} \xB7 ${((L) => L.getDate() + "-" + ["yanvar", "fevral", "mart", "aprel", "may", "iyun", "iyul", "avgust", "sentabr", "oktabr", "noyabr", "dekabr"][L.getMonth()])(new Date())}</h1>
  <div class="chips">${_.map(([L, K]) => `<button data-bp="${L}" aria-pressed="${(state.bp || "1") === L}">${K}</button>`).join("")}</div>
  ${T.length ? `<button class="btn warn" style="width:100%;margin-bottom:12px;padding:12px" data-gotab="buyurtma">\u{1F4E8} ${T.length} ta yangi Telegram buyurtma \u2014 ko'rish</button>` : ""}
  <div class="kpis">
   <div class="kpi good"><div class="k">Savdo</div><div class="v num">${money(t.total)}</div>${trendBadge(t.total, r.total, n.lbl)}</div>
   <div class="kpi"><div class="k">Foyda \xB7 marja ${k}%</div><div class="v num">${money(t.profit)}</div>${trendBadge(t.profit, r.profit, n.lbl)}</div>
   <div class="kpi"><div class="k">Cheklar</div><div class="v num">${t.cnt}</div>${trendBadge(t.cnt, r.cnt, n.lbl)}</div>
   <div class="kpi"><div class="k">O'rtacha chek</div><div class="v num">${money(t.cnt ? t.total / t.cnt : 0)}</div>${trendBadge(t.cnt ? t.total / t.cnt : 0, r.cnt ? r.total / r.cnt : 0, n.lbl)}</div>
   <div class="kpi warn"><div class="k">Qarzga berildi</div><div class="v num">${money(t.debt)}</div></div>
   <div class="kpi"><div class="k">Qarzdan qaytdi</div><div class="v num">${money(s)}</div></div>
  </div>
  <div class="panel"><div class="panel-h"><h2 style="margin:0">${c}</h2><span class="spacer"></span><span class="muted num">${money(t.total)} so'm</span></div><div class="panel-b">${n.n === 1 ? barChart("ts", o, 160) : lineChart("ts", o, 180)}</div></div>
  <div class="grid2" style="margin-top:14px">
   <div class="panel"><div class="panel-h"><h2 style="margin:0">To'lov turlari</h2></div><div class="panel-b">${p}</div></div>
   ${l || `<div class="panel"><div class="panel-h"><h2 style="margin:0">Sotuvchilar</h2></div><div class="panel-b">${z.length ? hbarChart(z) : `<div class="muted">Bu davrda savdo yo'q</div>`}</div></div>`}
  </div>
  <div class="grid2" style="margin-top:14px">
   <div class="panel"><div class="panel-h"><h2 style="margin:0">Eng ko'p sotilgan tovarlar</h2></div><div class="panel-b">${x.length ? hbarChart(x) : `<div class="muted">Bu davrda savdo yo'q</div>`}</div></div>
   <div class="panel"><div class="panel-h"><h2 style="margin:0">Toifalar bo'yicha</h2></div><div class="panel-b">${P.length ? hbarChart(P.map(([L, K]) => [L, K, t.total ? Math.round((K / t.total) * 100) + "%" : ""])) : `<div class="muted">Bu davrda savdo yo'q</div>`}</div></div>
   ${l ? `<div class="panel"><div class="panel-h"><h2 style="margin:0">Sotuvchilar</h2></div><div class="panel-b">${z.length ? hbarChart(z) : `<div class="muted">Bu davrda savdo yo'q</div>`}</div></div>` : ""}
  </div>
  <h2>Pul, qarz va ombor</h2>
  <div class="kpis">
   <div class="kpi warn"><div class="k">Mijozlar qarzi</div><div class="v num">${money(v)}</div></div>
   <div class="kpi warn"><div class="k">Mening qarzim</div><div class="v num">${money(b)}</div></div>
   <div class="kpi"><div class="k">Ombor (kirim narxida)</div><div class="v num">${money(Z)}</div></div>
   <div class="kpi"><div class="k">Ombor (sotuv narxida)</div><div class="v num">${money(w)}</div></div>
   <div class="kpi"><div class="k">Mijozlar keshbegi</div><div class="v num">${money(I)}</div></div>
   <div class="kpi"><div class="k">Berilgan chegirma</div><div class="v num">${money(t.disc)}</div></div>
  </div>
  ${
    Y.length || ne.length
      ? `<h2>Ombor ogohlantirishlari</h2><div class="panel feed">${[...Y, ...ne]
          .slice(0, 8)
          .map((L) => `<div><b style="flex:1">${esc(L.name)}</b>${stockPill(L)}</div>`)
          .join(
            "",
          )}${Y.length + ne.length > 8 ? `<div><button class="btn sm" data-gotab="tovarlar">Hammasi (${Y.length + ne.length})</button></div>` : ""}</div>`
      : ""
  }
  <h2>Oxirgi cheklar</h2>
  <div class="panel feed">${
    state.sales
      .slice(0, 10)
      .map(
        (L) =>
          `<div data-receipt="${esc(L.id)}" style="cursor:pointer"><span class="muted num" style="width:72px">${fmtDateTime(L.ts).slice(9)}<br>${fmtDateTime(L.ts).slice(0, 8)}</span><span style="flex:1">${esc(L.clientName || "Mijozsiz")}<br><span class="muted" style="font-size:12px">${esc(L.seller || "")} \xB7 ${esc(L.no || "")}</span></span><b class="num">${money(L.total)}</b></div>`,
      )
      .join("") || `<div class="muted">Hali chek yo'q</div>`
  }</div>
  <h2>Tezkor amallar</h2>
  ${xHomeWarn()}<div class="quick"><button class="btn" data-act="intake">\u{1F4E5} Kirim</button><button class="btn" data-act="newprod">\u2795 Yangi tovar</button><button class="btn" data-gotab="mijozlar">\u{1F465} Qarzdorlar</button><button class="btn" data-gotab="hisobot">\u{1F4CA} Hisobot</button></div>
  </div>`;
}
state.catalog = {};
state.orders = [];
function ET() {
  try {
    let n = new (window.AudioContext || window.webkitAudioContext)();
    [0, 0.25].forEach((e) => {
      let t = n.createOscillator(),
        i = n.createGain();
      ((t.frequency.value = 880),
        t.connect(i),
        i.connect(n.destination),
        i.gain.setValueAtTime(0.25, n.currentTime + e),
        t.start(n.currentTime + e),
        t.stop(n.currentTime + e + 0.18));
    });
  } catch {}
}
var By = null;
function TT() {
  (clearTimeout(By), (By = setTimeout(AT, 1500)));
}
function AT() {
  if (
    !fire.db ||
    state.gate === void 0 ||
    (!Object.keys(state.products).length && !Object.keys(state.catalog).length)
  )
    return;
  let n = state.settings.allowNegative !== !1;
  Object.values(state.products).forEach((e) => {
    let t = {
        name: e.name || "",
        price: num(e.price),
        cat: e.cat || "",
        img: e.img || "",
        inStock: !e.archived && (num(e.qty) > 0 || n),
        hidden: !!e.archived || !!e.noTg,
      },
      i = state.catalog[e.id];
    (!i ||
      i.name !== t.name ||
      i.price !== t.price ||
      i.cat !== t.cat ||
      i.inStock !== t.inStock ||
      i.hidden !== t.hidden ||
      (i.img || "") !== t.img) &&
      ((state.catalog[e.id] = {
        id: e.id,
        ...t,
      }),
      trackWrite(fsSetDoc(fsDoc(fire.db, "catalog", e.id), t)));
  });
}
function pageOrders() {
  let n = state.of || "open",
    e = state.orders;
  n === "open" && (e = e.filter((i) => i.status === "new" || i.status === "accepted"));
  let t = {
    new: ["Yangi", "debt"],
    accepted: ["Qabul qilindi", "low"],
    done: ["Sotildi", "ok"],
    cancelled: ["Bekor qilindi", ""],
  };
  return `<h1 class="page">Telegram buyurtmalar</h1>
  <div class="toolbar"><span class="seg"><button data-of="open" aria-pressed="${n === "open"}">Ochiq</button><button data-of="all" aria-pressed="${n === "all"}">Hammasi (30 kun)</button></span></div>
  <div class="panel">${
    e
      .map(
        (i) => `<div class="ord ${i.status === "new" ? "new" : ""}">
     <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><b>${esc(i.name || "")}</b><a class="num" href="tel:${esc(i.phone || "")}">${esc(i.phone || "")}</a>${i.tgUser ? `<a href="https://t.me/${esc(i.tgUser)}" target="_blank" rel="noopener">@${esc(i.tgUser)}</a>` : ""}
       <span class="spacer"></span><span class="muted num">${fmtDateTime(i.ts)}</span><span class="pill ${(t[i.status] || ["", ""])[1]}">${(t[i.status] || [i.status])[0]}</span>${i.verified === !1 ? '<span class="pill out" title="Telegram imzosi tekshirilmadi — soxta bo\'lishi mumkin">⚠️ Tasdiqlanmagan</span>' : i.verified ? '<span class="pill ok" title="Telegram orqali tasdiqlangan">✓ Telegram</span>' : ""}</div>
     <div>${(i.items || []).map((r) => `${esc(r.name)} <span class="muted num">\xD7 ${money(r.qty)}</span>`).join(" \xB7 ")}</div>
     <div class="muted">${i.delivery === "delivery" ? `Yetkazib berish: ${esc(i.address || "")}` : "Do'kondan olib ketadi"}${i.comment ? ` \xB7 \xAB${esc(i.comment)}\xBB` : ""}</div>
     <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><b class="num">${money(i.total)} so'm</b><span class="spacer"></span>
       ${i.status === "new" ? `<button class="btn sm" data-ordacc="${esc(i.id)}">Qabul qildim</button>` : ""}
       ${i.status === "new" || i.status === "accepted" ? `<button class="btn sm danger" data-ordcan="${esc(i.id)}">Bekor qilish</button><button class="btn sm primary" data-ordsell="${esc(i.id)}">Savatga olish va sotish</button>` : ""}
       ${i.saleNo ? `<span class="muted">Chek ${esc(i.saleNo)}</span>` : ""}</div></div>`,
      )
      .join("") || `<div class="empty">Buyurtma yo'q</div>`
  }</div>
  <div class="note" style="margin-top:12px">Mijozlar Telegram botdagi \xABDo'kon\xBB tugmasi orqali buyurtma beradi. Yangi buyurtma kelganda shu yerda ovozli signal chiqadi. Narx va qoldiq botda avtomatik yangilanadi.</div>`;
}
function kT(n) {
  state.cart = [];
  let e = 0;
  (n.items || []).forEach((r) => {
    let s = state.products[r.pid];
    s
      ? state.cart.push({
          pid: s.id,
          name: s.name,
          price: num(s.price),
          cost: num(s.cost),
          qty: num(r.qty),
        })
      : e++;
  });
  let t = String(n.phone || "")
      .replace(/\D/g, "")
      .slice(-9),
    i = Object.values(state.clients).find(
      (r) =>
        t &&
        String(r.phone || "")
          .replace(/\D/g, "")
          .slice(-9) === t,
    );
  if (!i && n.name) {
    let r = newId();
    ((i = {
      id: r,
      name: n.name,
      phone: n.phone || "",
      discount: 0,
      note: n.tgUser ? "Telegram: @" + n.tgUser : "Telegram mijoz",
      debt: 0,
      created: Date.now(),
    }),
      dbSet("clients", r, {
        ...i,
      }),
      (state.clients[r] = i));
  }
  ((state.cartClient = i ? i.id : null),
    (state.discount = {
      type: "pct",
      val: i && num(i.discount) ? num(i.discount) : 0,
    }),
    (state.pay = {
      cash: "",
      card: "",
      cb: "",
    }),
    (state.pendingOrder = n.id),
    switchTab("sotuv"),
    e && toast(`${e} ta tovar topilmadi`));
}
function renderOrderBadges() {
  let n = (state.orders || []).filter((r) => r.status === "new").length;
  ["#ordBadge", "#ordBadge2"].forEach((r) => {
    let s = qsel(r);
    s && ((s.textContent = n), (s.hidden = !n));
  });
  let e = qsel("#mConn");
  e && (e.className = "mdot" + (navigator.onLine && !fire.pending ? "" : " off"));
  let [t] = reportRange("today"),
    i = state.sales.filter((r) => r.ts >= t);
  ((qsel("#todaySum").textContent = money(i.reduce((r, s) => r + num(s.total), 0))),
    (qsel("#todayCnt").textContent = i.length + " ta chek"));
}
function cv() {
  let n = new Date();
  qsel("#clock").textContent = pad2(n.getHours()) + ":" + pad2(n.getMinutes());
}
function switchTab(n) {
  (themeDraft && n !== "sozlama" && ((themeDraft = null), applyTheme(state.settings.theme)),
    (state.tab = n),
    document
      .querySelectorAll("#tabs button, #bnav button")
      .forEach((e) =>
        e.setAttribute(
          "aria-selected",
          String(
            e.dataset.tab === n ||
              (e.dataset.more !== void 0 &&
                [
                  "mijozlar",
                  "taminot",
                  "hisobot",
                  "sozlama",
                  "inventar",
                  "kassa",
                  "marketing",
                  "tahlil",
                ].includes(n)),
          ),
        ),
      ),
    store.set("eco.tab", n),
    render(!0));
}
qsel("#tabs").addEventListener("click", (n) => {
  let e = n.target.closest("button[data-tab]");
  e && switchTab(e.dataset.tab);
});
var activeProducts = () =>
    Object.values(state.products)
      .filter((n) => !n.archived)
      .sort((n, e) => (n.name || "").localeCompare(e.name || "")),
  stockPill = (n) => {
    let e = num(n.qty),
      t = num(n.min || 3);
    return e < 0
      ? `<span class="pill out num">minus ${money(-e)}</span>`
      : e === 0
        ? '<span class="pill out num">0 dona</span>'
        : e <= t
          ? `<span class="pill low num">${money(e)} dona</span>`
          : `<span class="pill num">${money(e)} dona</span>`;
  };
function cartTotals() {
  let n = state.cart.reduce((x, N) => x + N.qty * N.price, 0),
    e =
      state.discount.type === "pct"
        ? Math.round((n * Math.min(100, num(state.discount.val))) / 100)
        : Math.min(n, num(state.discount.val)),
    t = isOwner() ? n : Math.round((n * xMaxDisc()) / 100),
    i = e > t;
  i && (e = t);
  let xpd = xPromo(state.cart);
  e = Math.min(n, e + xpd.amt);
  let r = Math.max(0, n - e),
    s = state.cartClient ? state.clients[state.cartClient] : null,
    o = s ? Math.max(0, num(s.cashback)) : 0,
    c = Math.min(Math.max(0, num(state.pay.cb)), o, r),
    xc = Math.min(xCertAmt(), Math.max(0, r - c)),
    l = num(state.pay.cash),
    h = num(state.pay.card),
    f = Math.min(r, l + h + c + xc),
    p = Math.max(0, r - c - xc - l - h),
    y = Math.max(0, l + h + c + xc - r),
    S = s ? Math.round((Math.max(0, Math.min(r - c, l + h)) * xCbPct(s)) / 100) : 0;
  return {
    promo: xpd,
    cert: xc,
    cb: c,
    cbAvail: o,
    cbEarn: S,
    capped: i,
    sub: n,
    disc: e,
    total: r,
    cash: l,
    card: h,
    paid: f,
    debt: p,
    change: y,
    cost: state.cart.reduce((x, N) => x + N.qty * num(N.cost), 0),
    count: state.cart.reduce((x, N) => x + N.qty, 0),
  };
}
function addToCart(n, e = 1) {
  if (!n) return;
  let t = state.cart.find((r) => r.pid === n.id),
    i = (t ? t.qty : 0) + e;
  if (num(n.qty) - i < 0) {
    if (state.settings.allowNegative === !1) {
      toast(`"${n.name}" omborda yetarli emas (${money(n.qty)} dona). Minusga sotish o'chirilgan.`);
      return;
    }
    toast(`"${n.name}" omborda yo'q \u2014 minusga sotilmoqda`);
  }
  (t
    ? (t.qty += e)
    : state.cart.push({
        pid: n.id,
        name: n.name,
        price: num(n.price),
        cost: num(n.cost),
        qty: e,
      }),
    render());
}
var lastTab = null;
function render(n) {
  if (state.gate) return;
  let e = qsel("#main"),
    t = document.activeElement && document.activeElement.id,
    i = document.activeElement && document.activeElement.selectionStart;
  if (
    (!xTabOk(state.tab)
      ? (e.innerHTML = xNoPerm())
      : state.tab === "bosh"
        ? (e.innerHTML = pageHome())
        : state.tab === "sotuv"
          ? (e.innerHTML = pageSale())
          : state.tab === "tovarlar"
            ? (e.innerHTML = pageProducts())
            : state.tab === "mijozlar"
              ? (e.innerHTML = pageClients())
              : state.tab === "taminot"
                ? (e.innerHTML = pageSuppliers())
                : state.tab === "hisobot"
                  ? (e.innerHTML = pageReport())
                  : state.tab === "inventar"
                    ? (e.innerHTML = invPage())
                    : state.tab === "kassa"
                      ? (e.innerHTML = xKassaPage())
                      : state.tab === "marketing"
                        ? (e.innerHTML = xMarketPage())
                        : state.tab === "tahlil"
                          ? (e.innerHTML = xAnalysisPage())
                          : state.tab === "buyurtma"
                            ? (e.innerHTML = pageOrders())
                            : (e.innerHTML = pageSettings()),
    t && !n)
  ) {
    let r = document.getElementById(t);
    if (r) {
      r.focus();
      try {
        i != null && r.setSelectionRange(i, i);
      } catch {}
    }
  } else if (state.tab === "sotuv" && (n || lastTab !== "sotuv")) {
    let r = qsel("#scan");
    r && r.focus();
  }
  (state.tab === "inventar" &&
    lastTab !== "inventar" &&
    setTimeout(() => {
      let r = qsel("#invScan");
      r && !isMobile() && r.focus();
    }, 0),
    (lastTab = state.tab),
    renderOrderBadges());
}
function pageSale() {
  let n = state.q.trim().toLowerCase(),
    e = activeProducts();
  n &&
    (e = e.filter(
      (o) =>
        (o.name || "").toLowerCase().includes(n) ||
        bcs(o).some((b) => b.includes(n)) ||
        (o.cat || "").toLowerCase().includes(n),
    ));
  let t = cartTotals(),
    i = state.cartClient ? state.clients[state.cartClient] : null,
    r = e
      .slice(0, 120)
      .map(
        (
          o,
        ) => `<button class="card" data-add="${esc(o.id)}">${o.img ? `<img class="ph" src="${o.img}" alt="" loading="lazy">` : `<span class="ph none" aria-hidden="true">${initials(o.name)}</span>`}<span class="nm">${esc(o.name)}</span>
     <span class="muted" style="font-size:12px">${esc(o.cat || "")}${o.barcode ? " \xB7 " + esc(o.barcode) : ""}</span>
     <span class="row"><span class="pr num">${money(o.price)}</span>${stockPill(o)}</span></button>`,
      )
      .join(""),
    s = state.cart
      .map(
        (o, c) => `<div class="ci">
      <div class="nm">${esc(o.name)}</div>
      <button class="btn sm danger" data-rm="${c}" aria-label="O'chirish">\xD7</button>
      <div class="qty"><button data-dec="${c}" aria-label="Kamaytirish">\u2212</button><input id="q${c}" class="num" data-qty="${c}" value="${o.qty}" inputmode="decimal" aria-label="Soni"><button data-inc="${c}" aria-label="Ko'paytirish">+</button></div>
      <div class="price num" style="text-align:right"><input id="p${c}" class="num" data-price="${c}" value="${o.price}" inputmode="numeric" aria-label="Narxi" ${!xCan("price") ? 'readonly tabindex="-1" style="border-color:transparent;background:transparent"' : ""}><div class="muted" style="font-size:12px">= ${money(o.qty * o.price)}</div></div>
    </div>`,
      )
      .join("");
  return `<div class="pos">
   <section>
     <div class="scan"><input id="scan" class="f" placeholder="Shtrix-kodni skanerlang yoki nomini yozing" value="${esc(state.q)}" autocomplete="off" aria-label="Qidirish yoki shtrix-kod">${hasCamScanner() ? '<button class="btn" data-act="camscan" aria-label="Kamera bilan skanerlash" title="Kamera bilan skanerlash">\u{1F4F7}</button>' : ""}</div>
     ${state.loaded ? (e.length ? `<div class="grid">${r}</div>` : `<div class="empty">${n ? "Hech narsa topilmadi." : "Hali tovar yo'q. \xABTovarlar va qoldiq\xBB bo'limida qo'shing."}</div>`) : '<div class="empty">Tovarlar yuklanmoqda\u2026</div>'}
   </section>
   <aside class="panel cart" aria-label="Savat">
     <div class="panel-h"><h2>Savat</h2><span class="pill num">${money(t.count)} dona</span><span class="spacer"></span><button class="btn sm" data-x="retfind">\u21A9 Qaytarish</button>${state.cart.length ? '<button class="btn sm" data-act="clear">Tozalash</button>' : ""}</div>
     <div class="client-box">
       ${
         i
           ? `<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap"><b>${esc(i.name)}</b><span class="muted num">${esc(i.phone || "")}</span>
          ${num(i.debt) > 0 ? `<span class="pill debt num">qarzi ${money(i.debt)}</span>` : ""}${num(i.discount) > 0 ? `<span class="pill ok">${num(i.discount)}% chegirma</span>` : ""}${xClientPills(i)}
          <span class="spacer"></span><button class="btn sm" data-act="unclient">Olib tashlash</button></div>`
           : '<input id="clientQ" class="f" placeholder="Mijoz: ism yoki telefon (ixtiyoriy)" autocomplete="off" aria-label="Mijoz qidirish"><div id="clientSug"></div>'
       }
     </div>
     <div class="cart-items">${s || '<div class="empty">Tovarni bosing yoki skanerlang</div>'}</div>
     <div class="tot">
       <div class="r"><span class="muted">Jami</span><span class="num">${money(t.sub)}</span></div>
       <div class="r" style="align-items:center"><span class="muted">Chegirma</span>
         <span style="display:flex;gap:6px;align-items:center"><span class="seg"><button data-dt="pct" aria-pressed="${state.discount.type === "pct"}">%</button><button data-dt="sum" aria-pressed="${state.discount.type === "sum"}">so'm</button></span>
         <input id="discVal" class="f num" style="width:90px;text-align:right" value="${state.discount.val || ""}" placeholder="0" inputmode="decimal" aria-label="Chegirma"></span></div>
       ${xPromoCartHtml(t)}${t.disc ? `<div class="r"><span class="muted">Chegirma summasi</span><span class="num">\u2212${money(t.disc)}</span></div>` : ""}
       ${t.capped ? `<div class="note">Sotuvchi ko'pi bilan ${num(state.settings.maxDisc ?? 10)}% chegirma bera oladi.</div>` : ""}
       <div class="r" style="align-items:baseline"><span style="font-weight:700">To'lanadi</span><span class="big num">${money(t.total)}</span></div>
     </div>
     <div class="pay">
       <label class="l" for="payCash">Naqd<input id="payCash" class="f num" value="${esc(state.pay.cash)}" inputmode="numeric" placeholder="0"></label>
       <label class="l" for="payCard">Karta / Click<input id="payCard" class="f num" value="${esc(state.pay.card)}" inputmode="numeric" placeholder="0"></label>
       ${t.cbAvail > 0 ? `<label class="l" for="payCb" style="grid-column:1/-1">Keshbekdan (bor: ${money(t.cbAvail)})<span style="display:flex;gap:6px"><input id="payCb" class="f num" value="${esc(state.pay.cb)}" inputmode="numeric" placeholder="0"><button class="btn sm" data-act="allcb">Hammasini</button></span></label>` : ""}${xCertPayHtml(t)}
       <button class="btn sm" data-act="allcash">Hammasi naqd <kbd>F4</kbd></button><button class="btn sm" data-act="allcard">Hammasi karta <kbd>F8</kbd></button>
     </div>
     <div class="tot" style="padding-top:0">
       ${t.cbEarn && state.cart.length ? `<div class="r"><span class="muted">Keshbek yoziladi</span><span class="num" style="color:var(--ok);font-weight:700">+${money(t.cbEarn)}</span></div>` : ""}
       ${t.change ? `<div class="r"><span class="muted">Qaytim</span><span class="num" style="font-weight:700">${money(t.change)}</span></div>` : ""}
       ${t.debt && state.cart.length ? `<div class="r"><span style="color:var(--danger);font-weight:600">Qarzga yoziladi</span><span class="num" style="color:var(--danger);font-weight:700">${money(t.debt)}</span></div>` : ""}
       ${t.debt && state.cart.length && !i ? '<div class="note">Qarzga sotish uchun mijozni tanlang.</div>' : ""}
       <button class="btn primary" data-act="sell" ${!state.cart.length || (t.debt && !i) ? "disabled" : ""} style="padding:15px;font-size:18px">Sotish \xB7 ${money(t.total)} so'm <kbd>F9</kbd></button>
     </div>
   </aside></div>`;
}
function pageProducts() {
  let n = (state.tq || "").toLowerCase(),
    e = state.tf || "all",
    t = activeProducts();
  (n &&
    (t = t.filter(
      (p) =>
        (p.name || "").toLowerCase().includes(n) ||
        bcs(p).some((b) => b.includes(n)) ||
        (p.cat || "").toLowerCase().includes(n),
    )),
    e === "low" && (t = t.filter((p) => num(p.qty) <= num(p.min || 3))));
  let i = activeProducts(),
    r = i.reduce((p, y) => p + Math.max(0, num(y.qty)), 0),
    s = i.reduce((p, y) => p + Math.max(0, num(y.qty)) * num(y.cost), 0),
    o = i.reduce((p, y) => p + Math.max(0, num(y.qty)) * num(y.price), 0);
  e === "neg" && (t = t.filter((p) => num(p.qty) < 0));
  let c = isOwner() || xCan("seeCost"),
    l = i.filter((p) => num(p.qty) < 0).length,
    h = i.filter((p) => num(p.qty) <= num(p.min || 3)).length,
    f = c ? i.filter((p) => num(p.price) <= num(p.cost)).length : 0;
  return `<h1 class="page">Tovarlar va do'kondagi qoldiq</h1>
  <div class="kpis">
    <div class="kpi"><div class="k">Tovar turlari</div><div class="v num">${money(i.length)}</div></div>
    <div class="kpi"><div class="k">Umumiy qoldiq</div><div class="v num">${money(r)} dona</div></div>
    ${c ? `<div class="kpi"><div class="k">Qoldiq qiymati (kirim narxida)</div><div class="v num">${money(s)}</div></div>` : ""}
    <div class="kpi"><div class="k">Qoldiq qiymati (sotuv narxida)</div><div class="v num">${money(o)}</div></div>
    <div class="kpi ${h ? "warn" : ""}"><div class="k">Tugayotgan tovarlar</div><div class="v num">${h}</div></div>
    <div class="kpi ${l ? "warn" : ""}"><div class="k">Minusdagi tovarlar</div><div class="v num">${l}</div></div>
  </div>
  ${f ? `<div class="note" style="margin-bottom:12px">${f} ta tovarning sotuv narxi kirim narxidan past yoki teng \u2014 ularni tekshiring (jadvalda sariq belgilangan).</div>` : ""}
  <div class="toolbar"><input id="tq" class="f" placeholder="Qidirish: nomi, shtrix-kod, toifa" value="${esc(state.tq || "")}">
    <span class="seg"><button data-tf="all" aria-pressed="${e === "all"}">Hammasi</button><button data-tf="low" aria-pressed="${e === "low"}">Tugayotganlar</button><button data-tf="neg" aria-pressed="${e === "neg"}">Minusdagilar</button></span>
    <span class="spacer"></span>${xProdHead()}</div>
  <div class="panel tbl-wrap"><table class="t"><thead><tr><th></th><th>Nomi</th><th>Toifa</th><th>Shtrix-kod</th>${c ? '<th class="r">Kirim narxi</th>' : ""}<th class="r">Sotuv narxi</th><th class="r">Qoldiq</th>${c ? '<th class="r">Qiymati</th>' : ""}</tr></thead>
  <tbody>${
    t
      .map(
        (
          p,
        ) => `<tr ${xCan("editProd") ? `class="click" data-editp="${esc(p.id)}"` : ""} ${c && num(p.price) <= num(p.cost) ? 'style="background:var(--amber-soft)"' : ""}><td style="width:48px">${p.img ? `<img class="thumb" src="${p.img}" alt="" loading="lazy">` : `<span class="thumb ph none" style="display:flex;align-items:center;justify-content:center;font-size:12px;color:var(--muted)">${initials(p.name)}</span>`}</td><td><b>${esc(p.name)}</b></td><td>${esc(p.cat || "")}</td><td class="num">${esc(bcs(p).join(", "))}</td>
   ${c ? `<td class="r num">${money(p.cost)}</td>` : ""}<td class="r num">${money(p.price)}</td><td class="r">${stockPill(p)}</td>${c ? `<td class="r num">${money(Math.max(0, num(p.qty)) * num(p.cost))}</td>` : ""}</tr>`,
      )
      .join("") || '<tr><td colspan="7" class="empty">Tovar topilmadi</td></tr>'
  }</tbody></table></div>`;
}
function pageClients() {
  let n = (state.cq || "").toLowerCase(),
    e = state.cf || "all",
    t = Object.values(state.clients).sort(
      (s, o) => num(o.debt) - num(s.debt) || (s.name || "").localeCompare(o.name || ""),
    );
  (n && (t = t.filter((s) => (s.name || "").toLowerCase().includes(n) || (s.phone || "").includes(n))),
    e === "debt" && (t = t.filter((s) => num(s.debt) > 0)));
  let i = Object.values(state.clients),
    r = i.reduce((s, o) => s + Math.max(0, num(o.debt)), 0);
  return `<h1 class="page">Mijozlar bazasi</h1>
  <div class="kpis"><div class="kpi"><div class="k">Mijozlar</div><div class="v num">${money(i.length)}</div></div>
   <div class="kpi"><div class="k">Qarzdor mijozlar</div><div class="v num">${i.filter((s) => num(s.debt) > 0).length}</div></div>
   <div class="kpi warn"><div class="k">Mijozlardan olinadigan qarz</div><div class="v num">${money(r)}</div></div></div>
  <div class="toolbar"><input id="cq" class="f" placeholder="Ism yoki telefon" value="${esc(state.cq || "")}">
   <span class="seg"><button data-cf="all" aria-pressed="${e === "all"}">Hammasi</button><button data-cf="debt" aria-pressed="${e === "debt"}">Qarzdorlar</button></span>
   <span class="spacer"></span><button class="btn primary" data-act="newclient">+ Yangi mijoz</button></div>
  <div class="panel tbl-wrap"><table class="t"><thead><tr><th>Mijoz</th><th>Telefon</th><th class="r">Chegirma</th><th class="r">Xaridlar</th><th class="r">Keshbek</th><th class="r">Qarzi</th><th></th></tr></thead><tbody>
  ${
    t
      .map((s) => {
        let o = state.sales.filter((c) => c.clientId === s.id);
        return `<tr class="click" data-client="${esc(s.id)}"><td><b>${esc(s.name)}</b>${s.tgId ? ` <span class="pill ok" title="Telegram botda ro'yxatdan o'tgan">Telegram</span>` : ""}${s.note ? `<div class="muted" style="font-size:12px">${esc(s.note)}</div>` : ""}</td><td class="num">${esc(s.phone || "")}</td>
   <td class="r">${num(s.discount) ? num(s.discount) + "%" : "\u2014"}</td><td class="r num">${o.length} ta \xB7 ${money(o.reduce((c, l) => c + num(l.total), 0))}</td>
   <td class="r num">${num(s.cashback) > 0 ? money(s.cashback) : "\u2014"}</td>
   <td class="r">${num(s.debt) > 0 ? `<span class="pill debt num">${money(s.debt)}</span>` : `<span class="pill ok">yo'q</span>`}</td>
   <td class="r">${num(s.debt) > 0 ? `<button class="btn sm warn" data-cpay="${esc(s.id)}">To'lov qabul qilish</button>` : ""}</td></tr>`;
      })
      .join("") || `<tr><td colspan="6" class="empty">Mijoz yo'q</td></tr>`
  }
  </tbody></table></div>`;
}
function pageSuppliers() {
  let n = Object.values(state.suppliers).sort((t, i) => num(i.debt) - num(t.debt)),
    e = n.reduce((t, i) => t + Math.max(0, num(i.debt)), 0);
  return `<h1 class="page">Yetkazib beruvchilar va mening qarzlarim</h1>
  <div class="kpis"><div class="kpi"><div class="k">Yetkazib beruvchilar</div><div class="v num">${n.length}</div></div>
   <div class="kpi warn"><div class="k">Mening qarzim (jami)</div><div class="v num">${money(e)}</div></div>
   <div class="kpi"><div class="k">So'nggi kirimlar</div><div class="v num">${xLive(state.purchases || []).length}</div></div></div>
  <div class="toolbar"><span class="spacer"></span><button class="btn" data-act="newsupp">+ Yetkazib beruvchi</button><button class="btn primary" data-act="intake">+ Kirim (tovar qabul qilish)</button></div>
  <div class="panel tbl-wrap"><table class="t"><thead><tr><th>Nomi</th><th>Telefon</th><th class="r">Kirimlar</th><th class="r">Mening qarzim</th><th></th></tr></thead><tbody>
  ${
    n
      .map((t) => {
        let i = xLive(state.purchases || []).filter((r) => r.supplierId === t.id);
        return `<tr class="click" data-supp="${esc(t.id)}"><td><b>${esc(t.name)}</b></td><td class="num">${esc(t.phone || "")}</td><td class="r num">${i.length} ta \xB7 ${money(i.reduce((r, s) => r + num(s.total), 0))}</td>
   <td class="r">${num(t.debt) > 0 ? `<span class="pill debt num">${money(t.debt)}</span>` : `<span class="pill ok">yo'q</span>`}</td>
   <td class="r">${num(t.debt) > 0 ? `<button class="btn sm warn" data-spay="${esc(t.id)}">To'lov qildim</button>` : ""}</td></tr>`;
      })
      .join("") || `<tr><td colspan="5" class="empty">Hali yetkazib beruvchi yo'q</td></tr>`
  }
  </tbody></table></div>`;
}
function reportRange(n) {
  let e = new Date(),
    t = new Date(e);
  if ((t.setHours(0, 0, 0, 0), n === "yest")) {
    let i = new Date(t);
    return (i.setDate(i.getDate() - 1), [i.getTime(), t.getTime()]);
  }
  if (n === "week") {
    let i = new Date(t);
    return (i.setDate(i.getDate() - 6), [i.getTime(), 1 / 0]);
  }
  if (n === "month") return [new Date(t.getFullYear(), t.getMonth(), 1).getTime(), 1 / 0];
  if (n === "prevmonth") {
    let i = new Date(t.getFullYear(), t.getMonth() - 1, 1),
      r = new Date(t.getFullYear(), t.getMonth(), 1);
    return [i.getTime(), r.getTime()];
  }
  if (n === "year") return [new Date(t.getFullYear(), 0, 1).getTime(), 1 / 0];
  if (n === "all") return [0, 1 / 0];
  if (n === "custom") {
    let i = state.repFrom ? new Date(state.repFrom + "T00:00:00").getTime() : 0,
      r = state.repTo ? new Date(state.repTo + "T00:00:00").getTime() + 864e5 : 1 / 0;
    return [i, r];
  }
  return [t.getTime(), 1 / 0];
}
function rangeData(n, e) {
  let t = Date.now() - LIVE_DAYS * 864e5;
  if (n >= t)
    return {
      sales: state.sales.filter((r) => r.ts >= n && r.ts < e),
      pays: state.payments.filter((r) => r.ts >= n && r.ts < e),
      ready: !0,
    };
  let i = n + "|" + e;
  if (state.repCache && state.repCache.key === i) return state.repCache;
  if (!state.repLoading || state.repLoading !== i) {
    state.repLoading = i;
    let r = (s) =>
      fsGetDocs(
        fsQuery(fsCollection(fire.db, s), fsWhere("ts", ">=", n), fsWhere("ts", "<", e === 1 / 0 ? 9e15 : e)),
      );
    Promise.all([r("sales"), r("payments")])
      .then(([s, o]) => {
        state.repLoading === i &&
          ((state.repCache = {
            key: i,
            ready: !0,
            sales: s.docs
              .map((c) => ({
                id: c.id,
                ...c.data(),
              }))
              .sort((c, l) => l.ts - c.ts),
            pays: xLive(
              o.docs.map((c) => ({
                id: c.id,
                ...c.data(),
              })),
            ),
          }),
          (state.repLoading = null),
          render());
      })
      .catch((s) => {
        ((state.repLoading = null), toast("Hisobotni yuklab bo'lmadi: internetni tekshiring"));
      });
  }
  return {
    sales: [],
    pays: [],
    ready: !1,
  };
}
function pageReport() {
  let [n, e] = reportRange(state.report),
    t = rangeData(n, e),
    i = t.sales,
    r = (P) => i.reduce((F, z) => F + num(z[P]), 0),
    s = r("total"),
    o = i.reduce((P, F) => P + (F.items || []).reduce((z, $) => z + num($.cost) * num($.qty), 0), 0),
    c = {};
  i.forEach((P) => {
    c[P.seller || "\u2014"] = (c[P.seller || "\u2014"] || 0) + num(P.total);
  });
  let l = {};
  i.forEach((P) =>
    (P.items || []).forEach((F) => {
      let z = F.name;
      ((l[z] = l[z] || {
        q: 0,
        s: 0,
      }),
        (l[z].q += num(F.qty)),
        (l[z].s += num(F.qty) * num(F.price)));
    }),
  );
  let h = Object.entries(l)
      .sort((P, F) => F[1].s - P[1].s)
      .slice(0, 10),
    f = h[0] ? h[0][1].s : 1,
    p = t.pays.filter((P) => P.kind === "client"),
    y = Object.values(state.clients).reduce((P, F) => P + Math.max(0, num(F.debt)), 0),
    S = Object.values(state.suppliers).reduce((P, F) => P + Math.max(0, num(F.debt)), 0),
    x = activeProducts().reduce((P, F) => P + Math.max(0, num(F.qty)) * num(F.cost), 0);
  return `<h1 class="page">Savdo hisoboti</h1>
  <div class="toolbar"><span class="seg">${[
    ["today", "Bugun"],
    ["yest", "Kecha"],
    ["week", "7 kun"],
    ["month", "Shu oy"],
    ["prevmonth", "O'tgan oy"],
    ["year", "Shu yil"],
    ["all", "Hammasi"],
    ["custom", "Sana tanlash"],
  ]
    .map(([P, F]) => `<button data-rep="${P}" aria-pressed="${state.report === P}">${F}</button>`)
    .join(
      "",
    )}</span><span class="spacer"></span><button class="btn" data-act="csv">Excelga yuklash (CSV)</button></div>
  ${state.report === "custom" ? `<div class="toolbar"><label class="l" for="repFrom">Dan<input type="date" id="repFrom" class="f" value="${esc(state.repFrom || "")}"></label><label class="l" for="repTo">Gacha<input type="date" id="repTo" class="f" value="${esc(state.repTo || "")}"></label></div>` : ""}
  ${t.ready ? "" : '<div class="note" style="margin-bottom:12px">Eski savdolar serverdan yuklanmoqda\u2026</div>'}
  <div class="kpis">
   <div class="kpi good"><div class="k">Savdo</div><div class="v num">${money(s)}</div></div>
   <div class="kpi"><div class="k">Cheklar soni</div><div class="v num">${i.length}</div></div>
   ${isOwner() ? `<div class="kpi"><div class="k">Taxminiy foyda</div><div class="v num">${money(s - o)}</div></div>` : ""}
   <div class="kpi"><div class="k">Berilgan chegirmalar</div><div class="v num">${money(r("discount"))}</div></div>
   <div class="kpi"><div class="k">Naqd</div><div class="v num">${money(r("cash"))}</div></div>
   <div class="kpi"><div class="k">Karta / Click</div><div class="v num">${money(r("card"))}</div></div>
   <div class="kpi warn"><div class="k">Qarzga berildi</div><div class="v num">${money(r("debt"))}</div></div>
   <div class="kpi"><div class="k">Qarzdan qaytdi</div><div class="v num">${money(p.reduce((P, F) => P + num(F.amount), 0))}</div></div>
  </div>
  <div class="kpis">
   <div class="kpi warn"><div class="k">Mijozlar qarzi (hozir)</div><div class="v num">${money(y)}</div></div>
   ${
     isOwner()
       ? `<div class="kpi warn"><div class="k">Mening qarzim (hozir)</div><div class="v num">${money(S)}</div></div>
   <div class="kpi"><div class="k">Ombordagi tovar qiymati</div><div class="v num">${money(x)}</div></div>`
       : ""
   }
  </div>
  ${xRepExtra(n, e)}${xSellerPanel(i, n, e)}
  <div class="two">
   <div class="panel"><div class="panel-h"><h2>Sotuvchilar bo'yicha</h2></div><div class="panel-b" style="display:grid;gap:10px">
    ${
      Object.entries(c)
        .map(
          ([P, F]) =>
            `<div><div style="display:flex;justify-content:space-between"><span>${esc(P)}</span><b class="num">${money(F)}</b></div><div class="bar"><i style="width:${s ? Math.round((F / s) * 100) : 0}%"></i></div></div>`,
        )
        .join("") || `<div class="muted">Bu davrda savdo yo'q</div>`
    }
   </div></div>
   <div class="panel"><div class="panel-h"><h2>Eng ko'p sotilganlar</h2></div><div class="panel-b" style="display:grid;gap:10px">
    ${h.map(([P, F]) => `<div><div style="display:flex;justify-content:space-between;gap:8px"><span>${esc(P)} <span class="muted num">\xD7 ${money(F.q)}</span></span><b class="num">${money(F.s)}</b></div><div class="bar"><i style="width:${Math.round((F.s / f) * 100)}%"></i></div></div>`).join("") || `<div class="muted">Bu davrda savdo yo'q</div>`}
   </div></div>
  </div>
  <div class="panel tbl-wrap" style="margin-top:14px"><div class="panel-h"><h2>Cheklar</h2></div><table class="t"><thead><tr><th>\u2116</th><th>Vaqt</th><th>Sotuvchi</th><th>Mijoz</th><th class="r">Summa</th><th class="r">Qarz</th><th></th></tr></thead><tbody>
   ${i.map((P) => `<tr><td class="num">${P.no || ""}</td><td class="num">${fmtDateTime(P.ts)}</td><td>${esc(P.seller || "")}</td><td>${esc(P.clientName || "\u2014")}</td><td class="r num">${money(P.total)}</td><td class="r num">${num(P.debt) ? money(P.debt) : ""}</td><td class="r"><button class="btn sm" data-receipt="${esc(P.id)}">Chek</button></td></tr>`).join("") || `<tr><td colspan="7" class="empty">Bu davrda chek yo'q</td></tr>`}
  </tbody></table></div>`;
} /* ===== Sessiya ===== */
/* ---------- Server tasdiqlagan sessiya (Firebase qoidalari uchun) ---------- */
var xSessUnsub = null;
function xSessWatch() {
  if (xSessUnsub || !fire.db || !fire.user) return;
  try {
    xSessUnsub = fsOnSnapshot(
      fsDoc(fire.db, "sessions", fire.user.uid),
      (d) => {
        state._srv = d.exists() ? d.data() : null;
        xSessBadge();
        xAiLoad();
      },
      (e) => {
        console.error(e);
        state._srv = null;
        xSessBadge();
      },
    );
  } catch (e) {
    console.error(e);
  }
}
function xSessOk() {
  let s = state._srv;
  return !!(s && s.staffId && s.staffId === state.meId && num(s.exp) > Date.now());
}
function xSessBadge() {
  let b = qsel("#srvBadge");
  if (!b) return;
  b.textContent = !state.meId
    ? ""
    : xSessOk()
      ? "\u{1F510} Server tasdiqladi"
      : state._srv && state._srv.err === "locked"
        ? "⛔ Ko'p xato parol — 15 daqiqa kuting"
        : state._srv && state._srv.err === "bad"
          ? "⚠️ Server tasdiqlamadi — qayta kiring"
          : "⏳ Server tasdig'i kutilmoqda";
  b.title =
    "Narx, qoldiq va sozlamalarni o'zgartirish uchun server kirganingizni tasdiqlashi kerak (Telegram bot ishlab turishi kerak).";
}
function xSessLogin(staff, pw) {
  if (!fire.db || !fire.user) return;
  xSessWatch();
  let u = fire.user.uid;
  fsSetDoc(fsDoc(fire.db, "sessions", u), {
    role: "none",
    perms: {},
    staffId: null,
    ts: Date.now(),
  }).catch((e) => console.error(e));
  fsSetDoc(fsDoc(fire.db, "sessReq", u), {
    staffId: staff.id,
    pw: String(pw || ""),
    ts: Date.now(),
  }).catch((e) => console.error(e));
  setTimeout(xSessBadge, 50);
}
function xSessLogout() {
  if (!fire.db || !fire.user) return;
  fsSetDoc(fsDoc(fire.db, "sessions", fire.user.uid), {
    role: "none",
    perms: {},
    staffId: null,
    ts: Date.now(),
  }).catch(() => {});
}

/* ---------- Kuchli parol va maxfiy AI kaliti ---------- */
function xStrong(p) {
  p = String(p || "");
  return p.length >= 8 && /[a-zA-Z\u0400-\u04FF]/.test(p) && /\d/.test(p);
}
function xAiKey() {
  return state._aiKey || (state.settings && state.settings.aiKey) || "";
}
function xAiSave(key, extra) {
  state._aiKey = key;
  fsSetDoc(fsDoc(fire.db, "private", "ai"), {
    aiKey: key,
    ts: Date.now(),
  }).catch((e) => console.error(e));
  return dbUpdate("meta", "settings", {
    ...(extra || {}),
    aiKey: "",
  });
}
function xAiLoad() {
  let s = state._srv;
  if (!s || !s.staffId || !fire.db) return;
  let tag = s.staffId + "|" + s.role;
  if (state._aiTag === tag) return;
  state._aiTag = tag;
  let ok = s.role === "owner" || (s.perms && (s.perms.addProd || s.perms.editProd));
  if (!ok) return;
  fsGetDoc(fsDoc(fire.db, "private", "ai"))
    .then((d) => {
      let k = d.exists() && d.data().aiKey;
      if (k) state._aiKey = k;
      else if (s.role === "owner" && state.settings && state.settings.aiKey)
        xAiSave(state.settings.aiKey, {});
    })
    .catch((e) => console.error(e));
}
/* ===== /Sessiya ===== */
/* ===== Ruxsatlar ===== */
/* ---------- Xodim ruxsatlari ---------- */
var xPermList = [
  [
    "Tovarlar",
    [
      ["addProd", "Yangi tovar qo'shish", 0],
      ["editProd", "Tovarni tahrirlash (nomi, narxi, rasmi)", 0],
      ["seeCost", "Kirim narxi va foydani ko'rish", 0],
      ["editStock", "Qoldiqni qo'lda o'zgartirish", 0],
      ["labels", "Yorliq chop etish", 1],
    ],
  ],
  [
    "Ombor",
    [
      ["intake", "Omborga kirim qilish (tovar qabul qilish)", 0],
      ["inv", "Inventarizatsiyada sanash", 1],
      ["suppliers", "Yetkazib beruvchilar bo'limi", 0],
    ],
  ],
  [
    "Sotuv",
    [
      ["price", "Sotuvda narxni o'zgartirish", -1],
      ["debt", "Qarzga sotish", 1],
      ["ret", "Tovar qaytarish (vozvrat)", 1],
    ],
  ],
  [
    "Kassa va boshqa",
    [
      ["shift", "Kassani yopish", 1],
      ["exp", "Xarajat kiritish", 1],
      ["clients", "Mijozlar bo'limi", 1],
      ["report", "Hisobotni ko'rish", 1],
    ],
  ],
];
function xMe() {
  return ((state.settings && state.settings.staff) || []).find((x) => x.id === state.meId) || null;
}
function xPermDef(k, d) {
  return d === -1 ? !!(state.settings || {}).sellerPrice : !!d;
}
function xCan(k) {
  if (isOwner()) return !0;
  let me = xMe(),
    p = me && me.perms;
  if (p && k in p) return !!p[k];
  for (let [, l] of xPermList) for (let [kk, , d] of l) if (kk === k) return xPermDef(k, d);
  return !1;
}
function xMaxDisc() {
  let me = xMe(),
    p = me && me.perms;
  return p && p.maxDisc != null ? num(p.maxDisc) : num((state.settings || {}).maxDisc ?? 10);
}
function xTabOk(t) {
  if (isOwner()) return !0;
  return t === "bosh" || t === "sozlama" || t === "marketing" || t === "tahlil"
    ? !1
    : t === "taminot"
      ? xCan("suppliers")
      : t === "hisobot"
        ? xCan("report")
        : t === "mijozlar"
          ? xCan("clients")
          : t === "inventar"
            ? xCan("inv")
            : t === "kassa"
              ? xCan("shift") || xCan("exp") || xCan("ret")
              : !0;
}
function xPermUI() {
  xSessBadge();
  document.querySelectorAll("#tabs button[data-tab],#bnav button[data-tab]").forEach((b) => {
    b.hidden = !xTabOk(b.dataset.tab);
  });
  xTabOk(state.tab) || (state.tab = "sotuv");
}
function xNoPerm() {
  return '<h1 class="page">Ruxsat yo\'q</h1><div class="note">Bu bo\'limga kirish uchun do\'kon egasi sizga ruxsat berishi kerak.</div>';
}
function xDeny(k) {
  return xCan(k) ? !1 : (toast("Sizda bu ishga ruxsat yo'q — do'kon egasiga murojaat qiling"), !0);
}
function xPermForm(e) {
  let p = (e && e.perms) || {},
    v = (k, d) => (k in p ? !!p[k] : xPermDef(k, d)),
    md = e && e.perms && e.perms.maxDisc != null ? e.perms.maxDisc : "";
  return `<div class="panel" style="margin-top:10px" id="stPermBox"><div class="panel-h"><h2>Sotuvchi nimalarni qila oladi</h2></div><div class="panel-b" style="display:grid;gap:10px">
 <div class="muted" style="font-size:13px">Rahbar profiliga hamma narsa ochiq. Bu belgilar faqat <b>sotuvchi</b> profiliga ta'sir qiladi. Sotish hamma uchun ochiq.</div>
 ${xPermList.map(([t, l]) => `<div><div class="l" style="margin-bottom:4px">${t}</div>${l.map(([k, nm, d]) => `<label style="display:flex;gap:8px;align-items:center;padding:3px 0"><input type="checkbox" data-perm-k="${k}" ${v(k, d) ? "checked" : ""}> ${nm}</label>`).join("")}</div>`).join("")}
 <label class="l" for="stMaxDisc" style="max-width:300px">Eng ko'p bera oladigan chegirma (%) — bo'sh qolsa, umumiy sozlama (${num((state.settings || {}).maxDisc ?? 10)}%)<input id="stMaxDisc" class="f num" value="${md}" inputmode="numeric" placeholder="${num((state.settings || {}).maxDisc ?? 10)}"></label>
 </div></div>`;
}
function xPermRead() {
  let p = {};
  document.querySelectorAll("#modalRoot [data-perm-k]").forEach((c) => {
    p[c.dataset.permK] = c.checked;
  });
  let m = ((qsel("#stMaxDisc") || {}).value || "").trim();
  m !== "" && (p.maxDisc = Math.max(0, Math.min(100, num(m))));
  return p;
}
function xProdHead() {
  let o = isOwner(),
    b = [];
  o &&
    b.push(
      '<button class="btn" data-act="expprod">⬇ Excelga</button><label class="btn" for="impProd" style="display:inline-block">⬆ Exceldan<input type="file" id="impProd" accept=".csv,text/csv" hidden></label><button class="btn" data-act="stocklog">Qoldiq tarixi</button>',
    );
  (o || xCan("intake")) &&
    b.push('<button class="btn" data-x="intakelog">\u{1F4E5} Kirimlar tarixi</button>');
  xCan("inv") && b.push('<button class="btn" data-gotab="inventar">\u{1F4CB} Inventarizatsiya</button>');
  (o || xCan("intake")) && b.push('<button class="btn" data-x="order">\u{1F6D2} Buyurtma ro\'yxati</button>');
  b.push('<button class="btn" data-x="exp">⏳ Muddati</button>');
  xCan("labels") && b.push('<button class="btn" data-x="labels">\u{1F3F7} Yorliq chop etish</button>');
  xCan("intake") && b.push('<button class="btn" data-act="intake">+ Kirim (yetkazib beruvchidan)</button>');
  xCan("addProd") && b.push('<button class="btn primary" data-act="newprod">+ Yangi tovar</button>');
  o ||
    xCan("editStock") ||
    b.push(`<span class="muted" style="font-size:13px">Qoldiqni faqat ruxsati bor xodim o'zgartiradi</span>`);
  return b.join("");
}

/* ---------- Kirimlar tarixi (kim qabul qilgan) ---------- */
/* ===== Tuzatish (storno) va filtrlar: kirimlar, xarajatlar ===== */
// Asl yozuv o'chirilmaydi. Tuzatishda 2 ta yangi yozuv paydo bo'ladi:
//  1) "rev" — asl yozuvni teskari belgida qaytaradi (summalar avtomatik nolga tushadi),
//  2) "fix" — to'g'ri qiymatlar. O'chirishda faqat "rev" yoziladi (del:true).
// Ikkalasi ham asl yozuv sanasida turadi — hisobotlar to'g'ri kunga tushadi.
var xFixWin = 864e5;
function xUq(l) {
  let s = new Set();
  return l.filter((x) => !x || !x.id || (!s.has(x.id) && s.add(x.id)));
}
function xRevSet(l) {
  return new Set(l.filter((x) => x && x.rev).map((x) => x.rev));
}
function xLive(l) {
  let rv = xRevSet(l);
  return l.filter((x) => x && !x.rev && !x.void && !rv.has(x.id));
}
function xFixLeft(x) {
  return Math.max(0, num(x.ts) + xFixWin - Date.now());
}
function xFixCan(x, perm) {
  if (!x || x.rev || x.void) return !1;
  if (isOwner()) return !0;
  return xCan(perm) && xFixLeft(x) > 0 && (x.seller || "") === (state.seller || "");
}
function xFixLeftTxt(x) {
  if (isOwner()) return "";
  let m = Math.ceil(xFixLeft(x) / 6e4);
  return m > 60 ? `${Math.floor(m / 60)} soat ${m % 60} daqiqa` : `${m} daqiqa`;
}
async function xRevExists(col, id) {
  let loc = (state[col] || []).some((x) => x.rev === id);
  if (loc) return !0;
  try {
    let s = await fsGetDocs(fsQuery(fsCollection(fire.db, col), fsWhere("rev", "==", id)));
    return !s.empty;
  } catch (e) {
    console.error(e);
    return !1;
  }
}
function xFixWhy() {
  return ((qsel("#fxWhy") || {}).value || "").trim();
}

/* --- Davr (kun / oy / sana) filtri --- */
var xPers = [
  ["today", "Bugun"],
  ["yest", "Kecha"],
  ["week", "7 kun"],
  ["month", "Shu oy"],
  ["prevmonth", "O'tgan oy"],
  ["pickday", "Kun tanlash"],
  ["pickmonth", "Oy tanlash"],
  ["range", "Sana oralig'i"],
];
function xF(k, def) {
  state._F = state._F || {};
  return (state._F[k] =
    state._F[k] ||
    Object.assign(
      {
        per: "month",
        m: fmtDay(Date.now()).slice(0, 7),
        d: fmtDay(Date.now()),
        a: "",
        b: "",
        show: "",
      },
      def || {},
    ));
}
function xPerRange(F) {
  let t = new Date();
  t.setHours(0, 0, 0, 0);
  let T = t.getTime(),
    day = (s) => new Date(s + "T00:00:00").getTime(),
    add = (ms, n) => {
      let d = new Date(ms);
      d.setDate(d.getDate() + n);
      return d.getTime();
    };
  switch (F.per) {
    case "today":
      return [T, 1 / 0];
    case "yest":
      return [add(T, -1), T];
    case "week":
      return [add(T, -6), 1 / 0];
    case "prevmonth":
      return [
        new Date(t.getFullYear(), t.getMonth() - 1, 1).getTime(),
        new Date(t.getFullYear(), t.getMonth(), 1).getTime(),
      ];
    case "pickday": {
      let a = F.d ? day(F.d) : T;
      return [a, add(a, 1)];
    }
    case "pickmonth": {
      let [y, m] = (F.m || fmtDay(Date.now()).slice(0, 7)).split("-").map(Number);
      return [new Date(y, m - 1, 1).getTime(), new Date(y, m, 1).getTime()];
    }
    case "range": {
      let a = F.a ? day(F.a) : 0,
        b = F.b ? add(day(F.b), 1) : 1 / 0;
      return [a, b];
    }
    default:
      return [new Date(t.getFullYear(), t.getMonth(), 1).getTime(), 1 / 0];
  }
}
function xPerLabel(F) {
  let p = xPers.find((x) => x[0] === F.per),
    dd = (s) => (s ? s.split("-").reverse().join(".") : "…");
  if (F.per === "pickday") return dd(F.d);
  if (F.per === "pickmonth") {
    let [y, m] = (F.m || "").split("-").map(Number);
    return y ? `${xMon[m - 1]} ${y}` : "Oy";
  }
  if (F.per === "range") return `${dd(F.a)} — ${dd(F.b)}`;
  return p ? p[1] : "";
}
function xPerUI(k, F) {
  return `<div class="chips" style="margin-bottom:8px">${xPers.map(([v, t]) => `<button data-fk="${k}" data-fper="${v}" aria-pressed="${F.per === v}">${t}</button>`).join("")}</div>
 ${F.per === "pickday" ? `<div class="toolbar"><label class="l" style="margin:0">Kun<input type="date" class="f" data-fk="${k}" data-ff="d" value="${esc(F.d || "")}"></label></div>` : ""}
 ${F.per === "pickmonth" ? `<div class="toolbar"><label class="l" style="margin:0">Oy<input type="month" class="f" data-fk="${k}" data-ff="m" value="${esc(F.m || "")}"></label></div>` : ""}
 ${F.per === "range" ? `<div class="toolbar" style="gap:8px"><label class="l" style="margin:0">Dan<input type="date" class="f" data-fk="${k}" data-ff="a" value="${esc(F.a || "")}"></label><label class="l" style="margin:0">Gacha<input type="date" class="f" data-fk="${k}" data-ff="b" value="${esc(F.b || "")}"></label></div>` : ""}`;
}
function xData(col, a, b) {
  let R = xRange(col, a, b),
    l = xUq((R.list || []).concat(state[col] || [])).filter((x) => num(x.ts) >= a && num(x.ts) < b);
  return {
    list: l,
    ready: R.ready,
  };
}
function xCsv(name, rows) {
  let t =
    "﻿" +
    rows.map((r) => r.map((c) => '"' + String(c ?? "").replace(/"/g, '""') + '"').join(";")).join("\r\n");
  downloadFile(name, t, "text/csv");
}
function xSel(k, f, val, opts, all) {
  return `<select class="f" style="width:100%" data-fk="${k}" data-ff="${f}"><option value="">${all}</option>${opts.map(([v, t]) => `<option value="${esc(v)}" ${v === val ? "selected" : ""}>${esc(t)}</option>`).join("")}</select>`;
}
function xFRefresh(k) {
  k === "il" ? xIntakeLog() : render();
}

/* ---------- Kirimlar tarixi (filtr bilan) ---------- */
function xIntakeLog() {
  let F = xF("il", {
      per: "month",
    }),
    [a, b] = xPerRange(F),
    D = xData("purchases", a, b),
    all = D.list,
    rv = xRevSet(all),
    sc = isOwner() || xCan("seeCost"),
    base = F.show ? all.filter((x) => !x.rev) : xLive(all),
    qq = (F.q || "").toLowerCase().trim(),
    l = base
      .filter(
        (x) =>
          (!F.sup || x.supplierId === F.sup) &&
          (!F.who || (x.seller || "—") === F.who) &&
          (!qq ||
            (x.items || []).some(
              (i) =>
                (i.name || "").toLowerCase().includes(qq) ||
                bcs(state.products[i.pid]).some((c) => c.includes(qq)),
            )),
      )
      .sort((x, y) => y.ts - x.ts),
    live = l.filter((x) => !x.void && !rv.has(x.id)),
    sups = [
      ...new Map(all.filter((x) => x.supplierId).map((x) => [x.supplierId, x.supplierName || ""])).entries(),
    ],
    ws = [...new Set(all.map((x) => x.seller || "—"))],
    tot = live.reduce((s, x) => s + num(x.total), 0),
    dn = live.reduce((s, x) => s + (x.items || []).reduce((t, i) => t + num(i.qty), 0), 0),
    debt = live.reduce((s, x) => s + num(x.debt), 0);
  state._ilRows = l;
  openModal(
    "Kirimlar tarixi",
    `<div id="ilBox">${xPerUI("il", F)}
 <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:8px;align-items:center">
  ${xSel(
    "il",
    "sup",
    F.sup || "",
    sups.map(([id, n]) => [id, n || "—"]),
    "Hamma yetkazib beruvchilar",
  )}
  ${xSel(
    "il",
    "who",
    F.who || "",
    ws.map((w) => [w, w]),
    "Hamma qabul qiluvchilar",
  )}
  <input class="f" data-fk="il" data-ff="q" value="${esc(F.q || "")}" placeholder="Tovar nomi yoki shtrix-kod">
  <label style="display:flex;gap:6px;align-items:center;font-size:13px"><input type="checkbox" data-fk="il" data-ff="show" ${F.show ? "checked" : ""}> O'zgartirilganlarni ham ko'rsatish</label>
 </div>
 ${D.ready ? "" : '<div class="note">Eski kirimlar yuklanmoqda…</div>'}
 <div class="note" style="margin:8px 0;font-size:14px"><b>${esc(xPerLabel(F))}</b>: ${live.length} ta kirim \xB7 ${money(dn)} dona${sc ? ` \xB7 summa <b class="num">${money(tot)}</b> so'm \xB7 qarzga <b class="num">${money(debt)}</b> so'm` : ""}</div>
 <div class="tbl-wrap" style="max-height:50vh"><table class="t"><thead><tr><th>Sana</th><th>Kim qabul qildi</th><th>Yetkazib beruvchi</th><th class="r">Tovar</th><th class="r">Summa</th><th></th></tr></thead><tbody>
 ${
   l
     .slice(0, 400)
     .map((x) => {
       let gone = x.void || rv.has(x.id),
         st = gone
           ? '<span class="pill out">o\'zgartirilgan / bekor</span>'
           : x.fix
             ? '<span class="pill low">✏️ tuzatilgan</span>'
             : "";
       return `<tr class="click" data-ilshow="${esc(x.id)}" style="${gone ? "opacity:.55;text-decoration:line-through" : ""}"><td class="num">${fmtDateTime(x.ts)}</td><td><b>${esc(x.seller || "—")}</b></td><td>${esc(x.supplierName || "")}</td><td class="r num">${(x.items || []).length} xil \xB7 ${money((x.items || []).reduce((s, i) => s + num(i.qty), 0))} dona</td><td class="r num">${sc ? money(x.total) : "—"}</td><td>${st}${!gone && xFixCan(x, "intake") ? ' <span title="Tuzatsa bo\'ladi">✏️</span>' : ""}</td></tr>`;
     })
     .join("") || '<tr><td colspan="6" class="muted">Bu davrda kirim topilmadi</td></tr>'
 }
 </tbody></table></div></div>`,
    `<button class="btn" data-x="ilcsv">⬇ Excelga (CSV)</button><span class="spacer"></span><button class="btn" data-close="x">Yopish</button>`,
  );
  D.ready ||
    setTimeout(() => {
      qsel("#ilBox") && xRange("purchases", a, b).ready && xIntakeLog();
    }, 900);
}
function xIntakeCsv() {
  let F = xF("il"),
    sc = isOwner() || xCan("seeCost"),
    rows = [
      [
        "Sana",
        "Kim qabul qildi",
        "Yetkazib beruvchi",
        "Tovar",
        "Soni",
        ...(sc ? ["Kirim narxi", "Summa"] : []),
        "Muddati",
        "Holati",
      ],
    ],
    rv = xRevSet(state._ilRows || []);
  (state._ilRows || []).forEach((x) =>
    (x.items || []).forEach((i) =>
      rows.push([
        fmtDateTime(x.ts),
        x.seller || "",
        x.supplierName || "",
        i.name,
        num(i.qty),
        ...(sc ? [num(i.cost), num(i.qty) * num(i.cost)] : []),
        i.exp || "",
        x.void || rv.has(x.id) ? "o'zgartirilgan" : x.fix ? "tuzatilgan" : "",
      ]),
    ),
  );
  xCsv(`kirimlar-${fmtDay(Date.now())}.csv`, rows);
}
function xFindP(id) {
  return (
    (state._ilRows || []).find((x) => x.id === id) ||
    (state.purchases || []).find((x) => x.id === id) ||
    Object.values(state._xr || {})
      .flatMap((r) => r.list || [])
      .find((x) => x.id === id)
  );
}
function xIntakeShow(id) {
  let b = xFindP(id);
  if (!b) return;
  let sc = isOwner() || xCan("seeCost"),
    pool = xUq((state._ilRows || []).concat(state.purchases || [])),
    gone = b.void || xRevSet(pool).has(b.id),
    orig = b.fix && pool.find((x) => x.id === b.fix),
    can = !gone && xFixCan(b, "intake");
  openModal(
    "Kirim \xB7 " + fmtDateTime(b.ts),
    `<div class="note">Qabul qildi: <b>${esc(b.seller || "—")}</b> \xB7 yetkazib beruvchi: <b>${esc(b.supplierName || "")}</b>${sc ? ` \xB7 jami <b>${money(b.total)}</b> so'm, to'landi ${money(b.paid)}, qarzga ${money(b.debt)}` : ""}</div>
 ${b.fix ? `<div class="note" style="margin-top:6px">✏️ Tuzatilgan: <b>${esc(b.fixBy || "")}</b>, ${fmtDateTime(b.at || b.ts)}${b.why ? ` · sababi: ${esc(b.why)}` : ""}${orig && sc ? ` · avval: ${money(orig.total)} so'm` : ""}</div>` : ""}
 ${gone ? '<div class="note" style="margin-top:6px">Bu kirim tuzatilgan yoki bekor qilingan — hisobga olinmaydi.</div>' : ""}
 <div class="tbl-wrap" style="margin-top:8px"><table class="t"><thead><tr><th>Tovar</th><th class="r">Soni</th>${sc ? '<th class="r">Kirim narxi</th><th class="r">Summa</th>' : ""}<th>Muddati</th></tr></thead><tbody>
 ${(b.items || []).map((i) => `<tr><td>${esc(i.name)}</td><td class="r num">${money(i.qty)}</td>${sc ? `<td class="r num">${money(i.cost)}</td><td class="r num">${money(num(i.qty) * num(i.cost))}</td>` : ""}<td class="num">${i.exp ? i.exp.split("-").reverse().join(".") : ""}</td></tr>`).join("")}
 </tbody></table></div>
 ${can && !isOwner() ? `<div class="muted" style="font-size:13px;margin-top:8px">Tuzatish uchun qolgan vaqt: <b>${xFixLeftTxt(b)}</b></div>` : ""}
 ${!gone && !can && !isOwner() ? '<div class="muted" style="font-size:13px;margin-top:8px">Kirimni faqat 24 soat ichida, o\'zi kiritgan xodim tuzata oladi. Keyin — rahbar.</div>' : ""}`,
    `<button class="btn" data-x="intakelog">← Ortga</button><span class="spacer"></span>${can ? `<button class="btn danger" data-ildel="${esc(b.id)}">🗑 Bekor qilish</button><button class="btn primary" data-iledit="${esc(b.id)}">✏️ Tuzatish</button>` : ""}`,
  );
}
function xIntakeEdit(id) {
  let b = xFindP(id);
  if (!b || !xFixCan(b, "intake")) return;
  intake = {
    open: !0,
    fixOf: b.id,
    fixSrc: b,
    supplierId: b.supplierId || "",
    paid: String(num(b.paid)),
    lines: (b.items || []).map((i) => ({
      pid: i.pid,
      name: i.name,
      qty: num(i.qty),
      cost: num(i.cost),
      exp: i.exp || "",
    })),
  };
  renderIntakeModal();
}
function xIntakeDelAsk(id) {
  let b = xFindP(id);
  if (!b || !xFixCan(b, "intake")) return;
  openModal(
    "Kirimni bekor qilish",
    `<div class="note">${fmtDateTime(b.ts)} \xB7 ${esc(b.supplierName || "")} \xB7 ${(b.items || []).length} xil tovar${isOwner() || xCan("seeCost") ? ` \xB7 ${money(b.total)} so'm` : ""}</div>
 <p>Bekor qilinsa: tovarlar qoldig'idan ayriladi, yetkazib beruvchiga qarz ${money(b.debt)} so'm kamayadi. Asl yozuv tarixda qoladi.</p>
 <label class="l" for="fxWhy">Sababi (majburiy)<input id="fxWhy" class="f" placeholder="Masalan: xato kiritildi, ikki marta kiritilgan"></label>`,
    `<button class="btn" data-ilshow="${esc(b.id)}">← Ortga</button><span class="spacer"></span><button class="btn danger" data-ildeldo="${esc(b.id)}">🗑 Bekor qilish</button>`,
  );
}
// Kirim farqini qoldiq / tannarx / muddat / qarzga qo'llash
async function xIntakeApply(oldB, newB) {
  let oq = {},
    nq = {},
    nl = {};
  ((oldB && oldB.items) || []).forEach((i) => (oq[i.pid] = (oq[i.pid] || 0) + num(i.qty)));
  ((newB && newB.items) || []).forEach((i) => {
    nq[i.pid] = (nq[i.pid] || 0) + num(i.qty);
    nl[i.pid] = i;
  });
  for (let pid of new Set([...Object.keys(oq), ...Object.keys(nq)])) {
    let p = state.products[pid];
    if (!p) continue;
    let d = (nq[pid] || 0) - (oq[pid] || 0),
      o = {};
    d && (o.qty = incBy(d));
    nl[pid] && num(nl[pid].cost) !== num(p.cost) && (o.cost = num(nl[pid].cost));
    let ex = p.expiries || [],
      oi = (oldB.items || []).find((i) => i.pid === pid),
      nx = ex;
    if (oi && oi.exp) {
      let k = nx.findIndex(
        (e) => e.d === oi.exp && num(e.q) === num(oi.qty) && Math.abs(num(e.ts) - num(oldB.ts)) < 6e5,
      );
      k < 0 && (k = nx.findIndex((e) => e.d === oi.exp));
      k >= 0 && (nx = nx.filter((_, j) => j !== k));
    }
    nl[pid] &&
      nl[pid].exp &&
      (nx = [
        ...nx,
        {
          d: nl[pid].exp,
          q: num(nl[pid].qty),
          ts: num(oldB.ts),
        },
      ].slice(-20));
    nx !== ex && (o.expiries = nx);
    Object.keys(o).length && (await dbUpdate("products", pid, o));
  }
  let os = oldB.supplierId,
    ns = newB && newB.supplierId,
    od = num(oldB.debt),
    nd = newB ? num(newB.debt) : 0;
  if (os && os === ns) {
    nd - od &&
      state.suppliers[os] &&
      (await dbUpdate("suppliers", os, {
        debt: incBy(nd - od),
      }));
  } else {
    os &&
      od &&
      state.suppliers[os] &&
      (await dbUpdate("suppliers", os, {
        debt: incBy(-od),
      }));
    ns &&
      nd &&
      state.suppliers[ns] &&
      (await dbUpdate("suppliers", ns, {
        debt: incBy(nd),
      }));
  }
}
function xRevDoc(b, extra) {
  let r = {
    ...b,
  };
  delete r.id;
  delete r.notified;
  delete r.fix;
  delete r.fixBy;
  delete r.at;
  delete r.why;
  return {
    ...r,
    rev: b.id,
    total: -num(b.total),
    paid: -num(b.paid),
    debt: -num(b.debt),
    items: (b.items || []).map((i) => ({
      ...i,
      qty: -num(i.qty),
    })),
    fixBy: state.seller || "",
    at: Date.now(),
    ...extra,
  };
}
async function xIntakeDelDo(id, btn) {
  let b = xFindP(id);
  if (!b || !xFixCan(b, "intake")) return;
  let why = xFixWhy();
  if (!why) {
    toast("Sababini yozing");
    return;
  }
  btn && (btn.disabled = !0);
  if (await xRevExists("purchases", b.id)) {
    toast("Bu kirim allaqachon o'zgartirilgan");
    xIntakeLog();
    return;
  }
  await dbSet(
    "purchases",
    newId(),
    xRevDoc(b, {
      del: !0,
      why,
    }),
  );
  await xIntakeApply(b, null);
  toast("Kirim bekor qilindi");
  xIntakeLog();
}
async function xIntakeFixSave(btn) {
  let b = intake && intake.fixSrc;
  if (!b || !xFixCan(b, "intake")) {
    toast("Tuzatish vaqti o'tgan");
    return;
  }
  let tot = intake.lines.reduce((s, l) => s + num(l.qty) * num(l.cost), 0),
    paid = Math.min(tot, num(intake.paid)),
    c = state.suppliers[intake.supplierId],
    nb = {
      ts: num(b.ts),
      fix: b.id,
      supplierId: intake.supplierId,
      supplierName: c ? c.name : "",
      items: intake.lines.map((l) => ({
        pid: l.pid,
        name: l.name,
        qty: num(l.qty),
        cost: num(l.cost),
        exp: l.exp || "",
      })),
      total: tot,
      paid,
      debt: tot - paid,
      seller: b.seller || "",
      fixBy: state.seller || "",
      at: Date.now(),
      why: (intake.why || "").trim(),
    };
  if (!nb.why) {
    toast("Tuzatish sababini yozing");
    let w = qsel("#fxWhyIn");
    w && w.focus();
    btn && (btn.disabled = !1);
    return;
  }
  if (await xRevExists("purchases", b.id)) {
    toast("Bu kirim allaqachon o'zgartirilgan");
    intake = null;
    xIntakeLog();
    return;
  }
  await dbSet("purchases", newId(), xRevDoc(b, {}));
  await dbSet("purchases", newId(), nb);
  await xIntakeApply(b, nb);
  intake = null;
  toast("Kirim tuzatildi");
  xIntakeLog();
}

/* ---------- Xarajatlar: filtr, tuzatish ---------- */
function xExpSection() {
  let F = xF("ex", {
      per: "month",
    }),
    [a, b] = xPerRange(F),
    D = xData("expenses", a, b),
    all = D.list,
    rv = xRevSet(all),
    base = F.show ? all.filter((x) => !x.rev) : xLive(all),
    qq = (F.q || "").toLowerCase().trim(),
    l = base
      .filter(
        (x) =>
          (!F.cat || x.cat === F.cat) &&
          (!F.pay || x.pay === F.pay) &&
          (!F.who || (x.seller || "—") === F.who) &&
          (!qq || (x.note || "").toLowerCase().includes(qq) || (x.cat || "").toLowerCase().includes(qq)),
      )
      .sort((x, y) => y.ts - x.ts),
    live = l.filter((x) => !x.void && !rv.has(x.id)),
    sum = live.reduce((s, x) => s + num(x.amount), 0),
    byC = {};
  live.forEach((x) => (byC[x.cat || "Boshqa"] = (byC[x.cat || "Boshqa"] || 0) + num(x.amount)));
  let bc = Object.entries(byC).sort((x, y) => y[1] - x[1]),
    pays = {
      cash: "Kassadan naqd",
      card: "Karta / Click",
      other: "Boshqa joydan",
    },
    cats = [...new Set([...xExpCats, ...all.map((x) => x.cat).filter(Boolean)])],
    ws = [...new Set(all.map((x) => x.seller || "—"))],
    bp = {};
  live.forEach((x) => (bp[x.pay || "cash"] = (bp[x.pay || "cash"] || 0) + num(x.amount)));
  state._exRows = l;
  D.ready ||
    setTimeout(() => {
      state.tab === "kassa" && xRange("expenses", a, b).ready && render();
    }, 900);
  return `<h2 style="margin-top:18px">Xarajatlar \xB7 ${esc(xPerLabel(F))} \xB7 <span class="num">${money(sum)}</span> so'm</h2>
 <div class="panel"><div class="panel-b" style="display:grid;gap:8px">
 ${xPerUI("ex", F)}
 <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:8px;align-items:center">
  ${xSel(
    "ex",
    "cat",
    F.cat || "",
    cats.map((c) => [c, c]),
    "Hamma turlar",
  )}
  ${xSel("ex", "pay", F.pay || "", Object.entries(pays), "Hamma to'lov usullari")}
  ${xSel(
    "ex",
    "who",
    F.who || "",
    ws.map((w) => [w, w]),
    "Hamma xodimlar",
  )}
  <input class="f" id="exQ" data-fk="ex" data-ff="q" value="${esc(F.q || "")}" placeholder="Izoh bo'yicha qidirish">
  <label style="display:flex;gap:6px;align-items:center;font-size:13px"><input type="checkbox" data-fk="ex" data-ff="show" ${F.show ? "checked" : ""}> O'zgartirilganlarni ham ko'rsatish</label>
  <button class="btn" data-x="excsv">⬇ Excelga (CSV)</button>
 </div>
 ${D.ready ? "" : '<div class="note">Eski xarajatlar yuklanmoqda…</div>'}
 ${
   bc.length
     ? `<div style="display:grid;gap:6px">${bc.map(([k, v]) => `<div><div style="display:flex;justify-content:space-between;font-size:13px"><span>${esc(k)}</span><b class="num">${money(v)}</b></div><div class="bar"><i style="width:${sum ? Math.round((v / sum) * 100) : 0}%"></i></div></div>`).join("")}</div>
 <div class="muted" style="font-size:13px">${Object.entries(bp)
   .map(([k, v]) => `${esc(pays[k] || k)}: <b class="num">${money(v)}</b>`)
   .join(" \xB7 ")} \xB7 ${live.length} ta yozuv</div>`
     : ""
 }
 </div></div>
 <div class="panel" style="margin-top:8px"><div class="tbl-wrap" style="max-height:45vh"><table class="t"><thead><tr><th>Sana</th><th>Turi</th><th>Izoh</th><th>Kim</th><th>To'lov</th><th class="r">Summa</th><th></th></tr></thead><tbody>
 ${
   l
     .map((x) => {
       let gone = x.void || rv.has(x.id),
         can = !gone && xFixCan(x, "exp");
       return `<tr style="${gone ? "opacity:.55;text-decoration:line-through" : ""}"><td class="num">${fmtDateTime(x.ts)}</td><td>${esc(x.cat)}</td><td>${esc(x.note || "")}${x.fix ? ` <span class="pill low" title="${esc((x.fixBy || "") + (x.why ? " · " + x.why : ""))}">✏️ tuzatilgan</span>` : ""}${gone ? ' <span class="pill out">o\'zgartirilgan</span>' : ""}</td><td>${esc(x.seller || "")}</td><td>${esc(pays[x.pay] || "")}</td><td class="r num">${money(x.amount)}</td><td class="r">${can ? `<button class="btn sm" data-exedit="${esc(x.id)}" title="${isOwner() ? "Tuzatish" : "Tuzatish · qoldi " + xFixLeftTxt(x)}">✏️ Tuzatish</button>` : ""}</td></tr>`;
     })
     .join("") || '<tr><td colspan="7" class="muted">Bu davrda xarajat yo\'q</td></tr>'
 }
 </tbody></table></div></div>
 ${isOwner() ? "" : '<div class="muted" style="font-size:12px;margin-top:6px">Xato kiritilgan xarajatni 24 soat ichida o\'zingiz tuzata yoki o\'chira olasiz. Keyin — faqat rahbar.</div>'}`;
}
function xExpCsv() {
  let pays = {
      cash: "Kassadan naqd",
      card: "Karta / Click",
      other: "Boshqa joydan",
    },
    rv = xRevSet(state._exRows || []),
    rows = [["Sana", "Turi", "Izoh", "Kim", "To'lov", "Summa", "Holati"]];
  (state._exRows || []).forEach((x) =>
    rows.push([
      fmtDateTime(x.ts),
      x.cat || "",
      x.note || "",
      x.seller || "",
      pays[x.pay] || "",
      num(x.amount),
      x.void || rv.has(x.id) ? "o'zgartirilgan" : x.fix ? "tuzatilgan" : "",
    ]),
  );
  xCsv(`xarajatlar-${fmtDay(Date.now())}.csv`, rows);
}
function xFindE(id) {
  return (state._exRows || []).find((x) => x.id === id) || (state.expenses || []).find((x) => x.id === id);
}
function xExpEdit(id) {
  let x = xFindE(id);
  if (!x || !xFixCan(x, "exp")) return;
  let cats = [...new Set([...xExpCats, x.cat].filter(Boolean))];
  openModal(
    "Xarajatni tuzatish",
    `<div class="note">${fmtDateTime(x.ts)} \xB7 kiritgan: <b>${esc(x.seller || "")}</b>${isOwner() ? "" : ` \xB7 tuzatish uchun qoldi: <b>${xFixLeftTxt(x)}</b>`}</div>
 <div class="fg" style="margin-top:8px">
  <label class="l" for="fxAmt">Summa<input id="fxAmt" class="f num" inputmode="numeric" value="${num(x.amount)}"></label>
  <label class="l" for="fxCat">Turi<select id="fxCat" class="f">${cats.map((c) => `<option ${c === x.cat ? "selected" : ""}>${esc(c)}</option>`).join("")}</select></label>
  <label class="l" for="fxPay">Qayerdan to'landi<select id="fxPay" class="f"><option value="cash" ${x.pay === "cash" ? "selected" : ""}>Kassadagi naqd puldan</option><option value="card" ${x.pay === "card" ? "selected" : ""}>Karta / Click</option><option value="other" ${x.pay === "other" ? "selected" : ""}>Boshqa joydan (cho'ntakdan)</option></select></label>
  <label class="l" for="fxNote">Izoh<input id="fxNote" class="f" value="${esc(x.note || "")}"></label>
  <label class="l" for="fxWhy" style="grid-column:1/-1">Tuzatish sababi (majburiy)<input id="fxWhy" class="f" placeholder="Masalan: summa xato yozilgan"></label>
 </div>
 <div class="muted" style="font-size:13px;margin-top:6px">Asl yozuv tarixda qoladi, hisobotlar va kassa avtomatik to'g'rilanadi.</div>`,
    `<button class="btn danger" data-exdel="${esc(x.id)}">🗑 O'chirish</button><span class="spacer"></span><button class="btn" data-close="x">Yopish</button><button class="btn primary" data-exfix="${esc(x.id)}">Saqlash</button>`,
  );
}
async function xExpFixDo(id, del, btn) {
  let x = xFindE(id);
  if (!x || !xFixCan(x, "exp")) {
    toast("Tuzatish vaqti o'tgan");
    return;
  }
  let why = xFixWhy();
  if (!why) {
    toast("Sababini yozing");
    let w = qsel("#fxWhy");
    w && w.focus();
    return;
  }
  let nw = null;
  if (!del) {
    let a = num((qsel("#fxAmt") || {}).value);
    if (a <= 0) {
      toast("Summani yozing");
      return;
    }
    nw = {
      ts: num(x.ts),
      fix: x.id,
      amount: a,
      cat: (qsel("#fxCat") || {}).value || x.cat || "Boshqa",
      pay: (qsel("#fxPay") || {}).value || x.pay || "cash",
      note: ((qsel("#fxNote") || {}).value || "").trim(),
      seller: x.seller || "",
      fixBy: state.seller || "",
      at: Date.now(),
      why,
    };
    if (nw.amount === num(x.amount) && nw.cat === x.cat && nw.pay === x.pay && nw.note === (x.note || "")) {
      toast("Hech narsa o'zgarmadi");
      return;
    }
  }
  btn && (btn.disabled = !0);
  if (await xRevExists("expenses", x.id)) {
    toast("Bu xarajat allaqachon o'zgartirilgan");
    closeModal();
    return;
  }
  let r = {
    ...x,
  };
  delete r.id;
  delete r.fix;
  delete r.fixBy;
  delete r.at;
  delete r.why;
  await dbSet("expenses", newId(), {
    ...r,
    rev: x.id,
    amount: -num(x.amount),
    fixBy: state.seller || "",
    at: Date.now(),
    why,
    ...(del
      ? {
          del: !0,
        }
      : {}),
  });
  nw && (await dbSet("expenses", newId(), nw));
  closeModal();
  toast(del ? "Xarajat o'chirildi" : "Xarajat tuzatildi");
  render();
}

/* --- Hodisalar --- */
document.addEventListener("click", async (n) => {
  let t = n.target.closest(
    "[data-fper],[data-iledit],[data-ildel],[data-ildeldo],[data-exedit],[data-exfix],[data-exdel],[data-x]",
  );
  if (!t) return;
  let d = t.dataset;
  if (d.fper) {
    let F = xF(d.fk);
    F.per = d.fper;
    xFRefresh(d.fk);
    return;
  }
  if (d.iledit) {
    xIntakeEdit(d.iledit);
    return;
  }
  if (d.ildel) {
    xIntakeDelAsk(d.ildel);
    return;
  }
  if (d.ildeldo) {
    await xIntakeDelDo(d.ildeldo, t);
    return;
  }
  if (d.exedit) {
    xExpEdit(d.exedit);
    return;
  }
  if (d.exfix) {
    await xExpFixDo(d.exfix, !1, t);
    return;
  }
  if (d.exdel) {
    await xExpFixDo(d.exdel, !0, t);
    return;
  }
  if (d.x === "ilcsv") {
    xIntakeCsv();
    return;
  }
  if (d.x === "excsv") {
    xExpCsv();
    return;
  }
});
document.addEventListener("change", (n) => {
  let t = n.target;
  if (!t || !t.dataset || !t.dataset.fk || !t.dataset.ff) return;
  let F = xF(t.dataset.fk);
  F[t.dataset.ff] = t.type === "checkbox" ? (t.checked ? "1" : "") : t.value;
  xFRefresh(t.dataset.fk);
});
document.addEventListener(
  "keydown",
  (n) => {
    let t = n.target;
    if (n.key !== "Enter" || !t || !t.dataset || !t.dataset.fk || t.dataset.ff !== "q") return;
    n.preventDefault();
    n.stopPropagation();
    let F = xF(t.dataset.fk);
    F.q = t.value;
    xFRefresh(t.dataset.fk);
  },
  !0,
);
document.addEventListener(
  "input",
  (n) => {
    let t = n.target;
    t && t.id === "fxWhyIn" && intake && (intake.why = t.value);
  },
  !0,
);
/* ===== /Tuzatish va filtrlar ===== */
/* ===== To'lovlarni tuzatish ===== */
// Baza to'lov summasini faqat musbat qabul qiladi. Shuning uchun "rev" yozuvi asl summa bilan
// yoziladi va asl to'lovni "bekor qilingan" deb belgilaydi. Kassa ro'yxatlari xLive orqali ikkalasini ham chiqarib tashlaydi.
var xPayM = ["Naqd", "Karta / Click", "Bank o'tkazma"];
function xPayWho(p) {
  let o = p.kind === "client" ? (state.clients || {})[p.refId] : (state.suppliers || {})[p.refId];
  return o ? o.name || "" : "—";
}
function xPayCan(p) {
  if (!p || p.rev) return !1;
  if (isOwner()) return !0;
  return (
    num(p.ts) + xFixWin > Date.now() &&
    (p.seller || "") === (state.seller || "") &&
    (p.kind === "client" || xCan("suppliers") || xCan("intake"))
  );
}
function xPayRaw() {
  return state._payRaw || state.payments || [];
}
function xFindPay(id) {
  return xPayRaw().find((x) => x.id === id) || (state._pyRows || []).find((x) => x.id === id);
}
function xPayBtn(p) {
  let f = p.fix
    ? ` <span class="pill low" title="${esc((p.fixBy || "") + (p.why ? " \xB7 " + p.why : ""))}">✏️ tuzatilgan</span>`
    : "";
  return f + (xPayCan(p) ? ` <button class="btn sm" data-pyedit="${esc(p.id)}">✏️ Tuzatish</button>` : "");
}
function xPaySection() {
  let F = xF("py", {
      per: "today",
    }),
    [a, b] = xPerRange(F),
    R =
      a >= xCut()
        ? {
            list: [],
            ready: !0,
          }
        : xRange("payments", a, b),
    all = xUq((R.list || []).concat(xPayRaw())).filter((x) => num(x.ts) >= a && num(x.ts) < b),
    rv = xRevSet(all),
    base = F.show ? all.filter((x) => !x.rev) : xLive(all),
    l = base
      .filter((x) => (!F.kind || x.kind === F.kind) && (!F.mt || (x.method || "") === F.mt))
      .sort((x, y) => y.ts - x.ts),
    live = l.filter((x) => !rv.has(x.id)),
    inS = live.filter((x) => x.kind === "client").reduce((s, x) => s + num(x.amount), 0),
    outS = live.filter((x) => x.kind !== "client").reduce((s, x) => s + num(x.amount), 0);
  state._pyRows = l;
  R.ready ||
    setTimeout(() => {
      state.tab === "kassa" && xRange("payments", a, b).ready && render();
    }, 900);
  return `<h2 style="margin-top:18px">To'lovlar \xB7 ${esc(xPerLabel(F))}</h2>
 <div class="panel"><div class="panel-b" style="display:grid;gap:8px">
 ${xPerUI("py", F)}
 <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:8px;align-items:center">
  ${xSel(
    "py",
    "kind",
    F.kind || "",
    [
      ["supplier", "Yetkazib beruvchiga to'lagan"],
      ["client", "Mijozdan olingan"],
    ],
    "Hamma to'lovlar",
  )}
  ${xSel(
    "py",
    "mt",
    F.mt || "",
    xPayM.map((m) => [m, m]),
    "Hamma usullar",
  )}
  <label style="display:flex;gap:6px;align-items:center;font-size:13px"><input type="checkbox" data-fk="py" data-ff="show" ${F.show ? "checked" : ""}> O'zgartirilganlarni ham ko'rsatish</label>
 </div>
 <div class="muted" style="font-size:13px">Mijozlardan olindi: <b class="num">${money(inS)}</b> \xB7 Yetkazib beruvchilarga to'landi: <b class="num">${money(outS)}</b> \xB7 ${live.length} ta to'lov</div>
 </div></div>
 <div class="panel" style="margin-top:8px"><div class="tbl-wrap" style="max-height:40vh"><table class="t"><thead><tr><th>Sana</th><th>Kimga / kimdan</th><th>Turi</th><th>Izoh</th><th>Kim kiritdi</th><th class="r">Summa</th><th></th></tr></thead><tbody>
 ${
   l
     .map((x) => {
       let gone = rv.has(x.id);
       return `<tr style="${gone ? "opacity:.55;text-decoration:line-through" : ""}"><td class="num">${fmtDateTime(x.ts)}</td><td>${x.kind === "client" ? "👤 " : "🚚 "}${esc(xPayWho(x))}</td><td>${esc(x.method || "")}</td><td>${esc(x.note || "")}${gone ? ' <span class="pill out">o\'zgartirilgan</span>' : ""}</td><td>${esc(x.seller || "")}</td><td class="r num">${x.kind === "client" ? "+" : "−"}${money(x.amount)}</td><td class="r">${gone ? "" : xPayBtn(x)}</td></tr>`;
     })
     .join("") || '<tr><td colspan="7" class="muted">Bu davrda to\'lov yo\'q</td></tr>'
 }
 </tbody></table></div></div>`;
}
function xPayEdit(id) {
  let p = xFindPay(id);
  if (!p || !xPayCan(p)) return;
  let ms = [...new Set([...xPayM, p.method].filter(Boolean))];
  openModal(
    p.kind === "client" ? "Mijoz to'lovini tuzatish" : "Yetkazib beruvchiga to'lovni tuzatish",
    `<div class="note">${p.kind === "client" ? "👤" : "🚚"} <b>${esc(xPayWho(p))}</b> \xB7 ${fmtDateTime(p.ts)} \xB7 kiritgan: <b>${esc(p.seller || "")}</b>${isOwner() ? "" : ` \xB7 tuzatish uchun qoldi: <b>${xFixLeftTxt(p)}</b>`}</div>
 <div class="fg" style="margin-top:8px">
  <label class="l" for="fxAmt">To'g'ri summa<input id="fxAmt" class="f num" inputmode="numeric" value="${num(p.amount)}"></label>
  <label class="l" for="fxPay">Turi<select id="fxPay" class="f">${ms.map((m) => `<option ${m === p.method ? "selected" : ""}>${esc(m)}</option>`).join("")}</select></label>
  <label class="l" for="fxNote" style="grid-column:1/-1">Izoh<input id="fxNote" class="f" value="${esc(p.note || "")}"></label>
  <label class="l" for="fxWhy" style="grid-column:1/-1">Tuzatish sababi (majburiy)<input id="fxWhy" class="f" placeholder="Masalan: 1 000 000 o'rniga 100 000 yozilgan"></label>
 </div>
 <div class="muted" style="font-size:13px;margin-top:6px">${p.kind === "client" ? "Mijoz" : "Yetkazib beruvchi"} qarzi va kassa farq bo'yicha o'zi to'g'rilanadi. Asl yozuv tarixda qoladi.</div>`,
    `<button class="btn danger" data-pydel="${esc(p.id)}">🗑 O'chirish</button><span class="spacer"></span><button class="btn" data-close="x">Yopish</button><button class="btn primary" data-pyfix="${esc(p.id)}">Saqlash</button>`,
  );
}
async function xPayFixDo(id, del, btn) {
  let p = xFindPay(id);
  if (!p || !xPayCan(p)) {
    toast("Tuzatish vaqti o'tgan");
    return;
  }
  let why = xFixWhy();
  if (!why) {
    toast("Sababini yozing");
    let w = qsel("#fxWhy");
    w && w.focus();
    return;
  }
  let nw = null,
    old = num(p.amount);
  if (!del) {
    let a = num((qsel("#fxAmt") || {}).value);
    if (a <= 0) {
      toast("Summani yozing");
      return;
    }
    nw = {
      kind: p.kind,
      refId: p.refId,
      amount: a,
      method: (qsel("#fxPay") || {}).value || p.method || "Naqd",
      note: ((qsel("#fxNote") || {}).value || "").trim(),
      ts: num(p.ts),
      seller: p.seller || "",
      fix: p.id,
      fixBy: state.seller || "",
      at: Date.now(),
      why,
    };
    if (a === old && nw.method === (p.method || "") && nw.note === (p.note || "")) {
      toast("Hech narsa o'zgarmadi");
      return;
    }
  }
  btn && (btn.disabled = !0);
  if (xPayRaw().some((x) => x.rev === p.id) || (await xRevExists("payments", p.id))) {
    toast("Bu to'lov allaqachon o'zgartirilgan");
    closeModal();
    return;
  }
  let r = {
    ...p,
  };
  delete r.id;
  delete r.fix;
  delete r.fixBy;
  delete r.at;
  delete r.why;
  await dbSet("payments", newId(), {
    ...r,
    rev: p.id,
    amount: old,
    fixBy: state.seller || "",
    at: Date.now(),
    why,
    ...(del
      ? {
          del: !0,
        }
      : {}),
  });
  let nid = null;
  if (nw) {
    nid = newId();
    await dbSet("payments", nid, nw);
  }
  let col = p.kind === "client" ? "clients" : "suppliers",
    d = old - (nw ? nw.amount : 0);
  if (d && state[col] && state[col][p.refId])
    await dbUpdate(col, p.refId, {
      debt: incBy(d),
      ...(col === "clients" && d < 0
        ? {
            lastRefCol: "payments",
            lastRefId: nid,
            lastRefTs: Date.now(),
          }
        : {}),
    });
  closeModal();
  toast(del ? "To'lov o'chirildi" : "To'lov tuzatildi");
  render();
}
document.addEventListener(
  "click",
  async (n) => {
    let t = n.target.closest("[data-pyedit],[data-pyfix],[data-pydel]");
    if (!t) return;
    let d = t.dataset;
    n.stopPropagation();
    if (d.pyedit) {
      xPayEdit(d.pyedit);
      return;
    }
    if (d.pyfix) {
      await xPayFixDo(d.pyfix, !1, t);
      return;
    }
    if (d.pydel) {
      await xPayFixDo(d.pydel, !0, t);
      return;
    }
  },
  !0,
);
/* ===== /To'lovlarni tuzatish ===== */
/* ===== Sotuvchilar hisoboti va bonus ===== */
function xSellerPanel(sales, a, b) {
  let own = isOwner(),
    R = xRange("returns", a, b),
    Sh = xRange("shifts", a, b),
    bp = num((state.settings || {}).sellerPct),
    bySale = {};
  sales.forEach((s) => (bySale[s.id] = s.seller || "—"));
  let M = {},
    row = (k) =>
      (M[k] = M[k] || {
        n: 0,
        sum: 0,
        disc: 0,
        cost: 0,
        ret: 0,
        rn: 0,
        diff: 0,
        sh: 0,
        items: 0,
      });
  sales.forEach((s) => {
    let r = row(s.seller || "—");
    r.n++;
    r.sum += num(s.total);
    r.disc += num(s.discount);
    r.items += (s.items || []).reduce((t, i) => t + num(i.qty), 0);
    r.cost += (s.items || []).reduce((t, i) => t + num(i.cost) * num(i.qty), 0);
  });
  (R.list || []).forEach((x) => {
    let r = row(bySale[x.saleId] || x.seller || "—");
    r.ret += num(x.amount);
    r.rn++;
  });
  xUq((Sh.list || []).concat(state.shifts || []))
    .filter((x) => num(x.ts) >= a && num(x.ts) < b)
    .forEach((x) => {
      let r = row(x.seller || "—");
      r.diff += num(x.diff);
      r.sh++;
    });
  let L = Object.entries(M).sort((x, y) => y[1].sum - y[1].ret - (x[1].sum - x[1].ret));
  if (!L.length) return "";
  return `<div class="panel" style="margin:14px 0"><div class="panel-h"><h2>👤 Sotuvchilar natijasi</h2>${own ? `<span class="spacer"></span><label style="display:flex;gap:6px;align-items:center;font-size:13px">Ish haqi / bonus (sof savdodan, %)<input id="selPct" class="f num" style="width:70px" inputmode="decimal" value="${bp || ""}" placeholder="0"></label>` : ""}</div>
 <div class="tbl-wrap"><table class="t"><thead><tr><th>Sotuvchi</th><th class="r">Cheklar</th><th class="r">Savdo</th><th class="r">O'rtacha chek</th><th class="r">Dona</th><th class="r">Chegirma</th><th class="r">Qaytarildi</th><th class="r">Sof savdo</th>${own ? '<th class="r">Foyda</th>' : ""}<th class="r" title="Kassa yopilganda sanalgan pul va kutilgan pul farqi">Kassa farqi</th>${bp ? `<th class="r">Ish haqi ${bp}%</th>` : ""}</tr></thead><tbody>
 ${L.map(([k, r]) => {
   let net = r.sum - r.ret;
   return `<tr><td><b>${esc(k)}</b></td><td class="r num">${r.n}</td><td class="r num">${money(r.sum)}</td><td class="r num">${r.n ? money(r.sum / r.n) : "—"}</td><td class="r num">${money(r.items)}</td><td class="r num">${money(r.disc)}</td><td class="r num">${r.ret ? `${money(r.ret)} <span class="muted">(${r.rn})</span>` : "—"}</td><td class="r num"><b>${money(net)}</b></td>${own ? `<td class="r num">${money(r.sum - r.cost)}</td>` : ""}<td class="r num">${r.sh ? `<span class="pill ${r.diff < 0 ? "out" : r.diff > 0 ? "low" : "ok"}">${r.diff > 0 ? "+" : ""}${xNeg(r.diff)}</span>` : "—"}</td>${bp ? `<td class="r num"><b>${money((net * bp) / 100)}</b></td>` : ""}</tr>`;
 }).join("")}
 </tbody></table></div>
 ${R.ready && Sh.ready ? "" : '<div class="muted" style="font-size:12px;padding:6px 12px">Qaytarish va kassa yopilishlari yuklanmoqda…</div>'}
 <div class="muted" style="font-size:12px;padding:6px 12px">Sof savdo = savdo − qaytarilgan. Kassa farqi: minus — kassada pul kam chiqqan, plus — ortiqcha.${own ? " Ish haqi foizini yozsangiz, har sotuvchiga tegishli summa hisoblanadi." : ""}</div></div>`;
}

/* ===== Zaxira faylini tekshirish (tiklamasdan) ===== */
async function xBackupCheck(file) {
  try {
    let txt;
    if (/\.gz$/i.test(file.name)) {
      if (!window.DecompressionStream) {
        toast("Bu brauzer .gz faylni ocholmaydi");
        return;
      }
      txt = await new Response(file.stream().pipeThrough(new DecompressionStream("gzip"))).text();
    } else txt = await file.text();
    let d = JSON.parse(txt);
    if (d.app !== "eco-aroma-kassa" || !Array.isArray(d.docs))
      throw new Error("Bu Eco Kassa zaxira fayli emas");
    let C = {},
      last = {};
    d.docs.forEach(([p, v]) => {
      let c = String(p).split("/")[0];
      C[c] = (C[c] || 0) + 1;
      v && num(v.ts) > (last[c] || 0) && (last[c] = num(v.ts));
    });
    let nm = {
        products: "Tovarlar",
        clients: "Mijozlar",
        suppliers: "Yetkazib beruvchilar",
        sales: "Cheklar",
        payments: "To'lovlar",
        purchases: "Kirimlar",
        returns: "Qaytarishlar",
        expenses: "Xarajatlar",
        shifts: "Kassa yopilishlari",
        inventory: "Inventarizatsiya",
        stockLog: "Qoldiq tarixi",
        certs: "Sertifikatlar",
        certUses: "Sertifikat ishlatilishi",
        meta: "Sozlamalar",
        broadcasts: "Xabarlar",
        catalog: "Katalog",
      },
      cur = {
        products: Object.keys(state.products || {}).length,
        clients: Object.keys(state.clients || {}).length,
        suppliers: Object.keys(state.suppliers || {}).length,
      },
      age = Date.now() - num(d.ts),
      ok = C.products > 0 && C.meta > 0;
    openModal(
      "Zaxira fayli tekshiruvi",
      `<div class="note">${ok ? "✅ Fayl butun va o'qiladi." : "⚠️ Faylda tovarlar yoki sozlamalar yo'q — bu to'liq zaxira emas."}<br>Fayl: <b>${esc(file.name)}</b> \xB7 olingan: <b>${d.ts ? fmtDateTime(d.ts) : "noma'lum"}</b>${d.part === "light" ? " \xB7 <b>yengil</b> (oxirgi 8 kun)" : d.part === "full" ? " \xB7 <b>to'liq</b>" : ""} \xB7 jami <b>${d.docs.length}</b> ta yozuv${age > 8 * 864e5 ? '<br><b style="color:var(--danger,#b00)">Diqqat: zaxira 8 kundan eski.</b>' : ""}</div>
  <div class="tbl-wrap" style="margin-top:8px"><table class="t"><thead><tr><th>Bo'lim</th><th class="r">Faylda</th><th class="r">Hozir kassada</th><th>Eng oxirgi yozuv</th></tr></thead><tbody>
  ${Object.entries(C)
    .sort((x, y) => y[1] - x[1])
    .map(
      ([c, n]) =>
        `<tr><td>${esc(nm[c] || c)}</td><td class="r num">${n}</td><td class="r num">${c in cur ? cur[c] : ""}</td><td class="num">${last[c] ? fmtDateTime(last[c]) : ""}</td></tr>`,
    )
    .join("")}
  </tbody></table></div><div class="muted" style="font-size:13px;margin-top:6px">Bu faqat tekshiruv — kassadagi ma'lumot o'zgarmadi.</div>`,
    );
  } catch (e) {
    console.error(e);
    toast("Faylni o'qib bo'lmadi: " + (e.message || e));
  }
}
document.addEventListener("change", (n) => {
  let t = n.target;
  if (t && t.id === "chkFile" && t.files && t.files[0]) {
    xBackupCheck(t.files[0]);
    t.value = "";
  }
});
/* ===== /Sotuvchilar va zaxira ===== */
/* ===== Mijoz darajalari, shaxsiy takliflar, avtomatik xabarlar ===== */
var xOfferTag = "\u{1F381} Shaxsiy taklif";
function xTiers() {
  return ((state.settings || {}).tiers || [])
    .filter((t) => t && t.name && num(t.min) > 0)
    .sort((a, b) => num(a.min) - num(b.min));
}
function xTier(cl) {
  let T = xTiers(),
    s = num(cl && cl.spent),
    r = null;
  T.forEach((t) => {
    s >= num(t.min) && (r = t);
  });
  return r;
}
function xTierNext(cl) {
  let s = num(cl && cl.spent);
  return xTiers().find((t) => num(t.min) > s) || null;
}
function xCbPct(cl) {
  let b = num((state.settings || {}).cashbackPct),
    t = xTier(cl);
  return t ? Math.max(b, num(t.cb)) : b;
}
function xOffer(cl) {
  let o = cl && cl.offer;
  return o && num(o.until) > Date.now() && num(o.pct) > 0 ? o : null;
}
function xClientPills(cl) {
  if (!cl) return "";
  let t = xTier(cl),
    o = xOffer(cl);
  return `${t ? `<span class="pill ok" title="Keshbek ${num(xCbPct(cl))}%">\u{1F3C5} ${esc(t.name)}</span>` : ""}${o ? `<span class="pill low" title="${fmtDateTime(num(o.until))} gacha">\u{1F381} ${num(o.pct)}% taklif</span>` : ""}`;
}
async function xSpentBackfill(btn) {
  if (!isOwner()) return;
  let a = Date.now() - 365 * 864e5,
    R = xRange("sales", a, 1 / 0);
  if (!R.ready) {
    toast("Savdolar yuklanmoqda, bir necha soniyadan keyin qayta bosing");
    return;
  }
  btn && (btn.disabled = !0);
  let st = {};
  xUq((R.list || []).concat(state.sales || [])).forEach((s) => {
    s.clientId && (st[s.clientId] = (st[s.clientId] || 0) + num(s.total));
  });
  let n = 0;
  for (let c of Object.values(state.clients || {})) {
    let v = Math.round(st[c.id] || 0);
    if (v !== num(c.spent)) {
      await dbUpdate("clients", c.id, {
        spent: v,
      });
      c.spent = v;
      n++;
    }
  }
  toast(`${n} ta mijozning xarid summasi yangilandi`);
  render();
}
function xAutoPanel() {
  let st = state.settings || {},
    rf = Object.assign(
      {
        on: !1,
        days: 30,
        pct: 5,
        valid: 7,
      },
      st.refill || {},
    ),
    wb = Object.assign(
      {
        on: !1,
        days: 45,
        pct: 10,
        valid: 7,
      },
      st.winback || {},
    ),
    T = (
      st.tiers && st.tiers.length
        ? st.tiers
        : [
            {
              name: "Kumush",
              min: 1000000,
              cb: 3,
            },
            {
              name: "Oltin",
              min: 3000000,
              cb: 5,
            },
            {
              name: "Platina",
              min: 7000000,
              cb: 7,
            },
          ]
    ).slice(0, 4),
    cl = Object.values(state.clients || {}),
    cnt = (t) =>
      cl.filter((c) => {
        let x = xTier(c);
        return x && x.name === t.name;
      }).length,
    offers = cl.filter((c) => xOffer(c)).length,
    shop = st.shopName || "Eco Aroma",
    blk = (
      k,
      o,
      title,
      desc,
      prev,
    ) => `<div style="display:grid;gap:8px;padding:10px 0;border-top:1px solid var(--line)">
   <label style="display:flex;gap:8px;align-items:center;font-weight:600"><input type="checkbox" data-au="${k}.on" ${o.on ? "checked" : ""}> ${title}</label>
   <div class="muted" style="font-size:13px">${desc}</div>
   <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px">
    <label class="l">Necha kundan keyin<input class="f num" data-au="${k}.days" value="${num(o.days)}" inputmode="numeric"></label>
    <label class="l">Chegirma (%), 0 = yo'q<input class="f num" data-au="${k}.pct" value="${num(o.pct)}" inputmode="decimal"></label>
    <label class="l">Chegirma necha kun amal qiladi<input class="f num" data-au="${k}.valid" value="${num(o.valid)}" inputmode="numeric"></label>
   </div>
   <div class="note" style="font-size:13px;white-space:pre-line"><b>Xabar namunasi:</b>\n${prev}</div></div>`;
  return `<div class="two" style="margin-bottom:14px">
 <div class="panel"><div class="panel-h"><h2>\u{1F916} Avtomatik xabarlar (Telegram bot)</h2></div><div class="panel-b" style="display:grid;gap:4px">
  <div class="muted" style="font-size:13px">Bot har kuni soat 11:00 da tekshiradi va mos mijozlarga o'zi yozadi. Chegirma kassada mijoz tanlanganda o'zi qo'shiladi va bir marta ishlatiladi. Hozir amaldagi shaxsiy takliflar: <b>${offers}</b> ta.</div>
  ${blk("refill", rf, "\u{1F9F4} «Mahsulotingiz tugayapti» eslatmasi", "Xarid qilganiga shuncha kun bo'lgan va o'shandan beri kelmagan mijozga yuboriladi.", `\u{1F33F} Malika, salom!\n${num(rf.days)} kun oldin ${shop}dan Keratin shampun olgan edingiz. Tugab qolayotgan bo'lsa — vaqtida to'ldirib qo'ying \u{1F60A}${num(rf.pct) ? `\n\u{1F381} Siz uchun ${num(rf.pct)}% chegirma — ${num(rf.valid)} kun amal qiladi.` : ""}`)}
  ${blk("winback", wb, "\u{1F338} «Sizni sog'indik» xabari", "Shuncha kundan beri kelmagan mijozga bir marta yuboriladi.", `\u{1F338} Malika, sizni sog'indik!\nAnchadan beri ${shop}ga kelmadingiz. Yangi mahsulotlar keldi \u{1F33F}${num(wb.pct) ? `\n\u{1F381} Siz uchun ${num(wb.pct)}% chegirma — ${num(wb.valid)} kun amal qiladi.` : ""}`)}
 </div></div>
 <div class="panel"><div class="panel-h"><h2>\u{1F3C5} Mijoz darajalari</h2></div><div class="panel-b" style="display:grid;gap:8px">
  <div class="muted" style="font-size:13px">Mijozning jami xaridi shu summaga yetsa, darajasi oshadi va keshbek foizi ko'payadi (umumiy keshbek: <b>${num(st.cashbackPct)}%</b>). Daraja kassada mijoz yonida ko'rinadi. Nomini bo'sh qoldirsangiz, o'sha daraja o'chadi.</div>
  <div class="tbl-wrap"><table class="t"><thead><tr><th>Daraja nomi</th><th class="r">Jami xarid (so'm)</th><th class="r">Keshbek %</th><th class="r">Mijozlar</th></tr></thead><tbody>
  ${[0, 1, 2, 3]
    .map((i) => {
      let t = T[i] || {
        name: "",
        min: "",
        cb: "",
      };
      return `<tr><td><input class="f" data-tier="${i}.name" value="${esc(t.name || "")}" placeholder="—"></td><td class="r"><input class="f num" style="text-align:right" data-tier="${i}.min" value="${t.min || ""}" inputmode="numeric"></td><td class="r"><input class="f num" style="width:70px;text-align:right" data-tier="${i}.cb" value="${t.cb || ""}" inputmode="decimal"></td><td class="r num">${st.tiers && t.name ? cnt(t) : "—"}</td></tr>`;
    })
    .join("")}
  </tbody></table></div>
  <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn primary" data-x="tiersave">Darajalarni saqlash</button><button class="btn" data-x="spentcalc">\u{1F504} Mijozlar xaridini qayta hisoblash</button></div>
  <div class="muted" style="font-size:12px">Birinchi marta saqlagandan keyin «qayta hisoblash»ni bir marta bosing — oxirgi bir yillik xaridlar hisoblanadi. Keyin har xariddan o'zi qo'shilib boradi.</div>
 </div></div></div>`;
}
document.addEventListener("change", (n) => {
  let t = n.target;
  if (!t || !t.dataset || !t.dataset.au || !isOwner()) return;
  let [k, f] = t.dataset.au.split("."),
    st = state.settings || {},
    cur = Object.assign(
      k === "refill"
        ? {
            on: !1,
            days: 30,
            pct: 5,
            valid: 7,
          }
        : {
            on: !1,
            days: 45,
            pct: 10,
            valid: 7,
          },
      st[k] || {},
    );
  cur[f] = f === "on" ? t.checked : Math.max(0, Math.min(f === "pct" ? 50 : 365, num(t.value)));
  if (f === "days" && cur.days < 7) cur.days = 7;
  if (f === "valid" && cur.valid < 1) cur.valid = 1;
  dbUpdate("meta", "settings", {
    [k]: cur,
  });
  state.settings[k] = cur;
  toast(f === "on" ? (cur.on ? "Yoqildi — bot ertadan boshlab yuboradi" : "O'chirildi") : "Saqlandi");
  render();
});
document.addEventListener("click", async (n) => {
  let t = n.target.closest && n.target.closest('[data-x="tiersave"],[data-x="spentcalc"]');
  if (!t || !isOwner()) return;
  if (t.dataset.x === "spentcalc") {
    await xSpentBackfill(t);
    return;
  }
  let T = [0, 1, 2, 3]
    .map((i) => ({
      name: ((qsel(`[data-tier="${i}.name"]`) || {}).value || "").trim(),
      min: num((qsel(`[data-tier="${i}.min"]`) || {}).value),
      cb: Math.min(50, num((qsel(`[data-tier="${i}.cb"]`) || {}).value)),
    }))
    .filter((x) => x.name && x.min > 0);
  await dbUpdate("meta", "settings", {
    tiers: T,
  });
  state.settings.tiers = T;
  toast(T.length ? `${T.length} ta daraja saqlandi` : "Darajalar o'chirildi");
  render();
});
// Buyurtma: yetkazib beruvchining Telegram chatini to'g'ridan-to'g'ri ochish (matn nusxalanadi)
function xSupTg(sid) {
  let s = (state.suppliers || {})[sid],
    p = String((s && s.phone) || "").replace(/[^\d+]/g, "");
  if (!p) return "";
  p.startsWith("+") || (p = (p.length === 9 ? "+998" : "+") + p);
  return "https://t.me/" + p;
}
document.addEventListener(
  "click",
  async (n) => {
    let t = n.target.closest && n.target.closest("[data-olchat]");
    if (!t) return;
    n.stopPropagation();
    let gp = (state._olg || [])[+t.dataset.olchat];
    if (!gp) return;
    let url = xSupTg(gp.sid);
    try {
      await navigator.clipboard.writeText(xOrdText(gp));
      toast("Ro'yxat nusxalandi — chatga joylang (Ctrl+V)");
    } catch {}
    url && window.open(url, "_blank");
  },
  !0,
);
/* ===== /Mijoz darajalari va takliflar ===== */
document.addEventListener(
  "click",
  (n) => {
    let t = n.target.closest("[data-x],[data-ilwho],[data-ilshow]");
    if (!t) return;
    let d = t.dataset;
    if (d.ilwho != null) {
      state._ilWho = d.ilwho;
      xIntakeLog();
      return;
    }
    if (d.ilshow) {
      xIntakeShow(d.ilshow);
      return;
    }
    if (d.x === "intakelog") xIntakeLog();
    if (d.x === "retfind" || d.x === "retdo") xCan("ret") || (n.stopImmediatePropagation(), xDeny("ret"));
    if (d.x === "shclose") xCan("shift") || (n.stopImmediatePropagation(), xDeny("shift"));
    if (d.x === "exadd") xCan("exp") || (n.stopImmediatePropagation(), xDeny("exp"));
    if (d.x === "labels" || d.x === "lbprint")
      xCan("labels") || (n.stopImmediatePropagation(), xDeny("labels"));
  },
  !0,
);

/* ===== /Ruxsatlar ===== */
/* ===== Inventarizatsiya (qoldiqni sanash) ===== */
function invAll() {
  return Object.values(state.inventory || {});
}
function invOpen() {
  return invAll().find((x) => x.status === "open");
}
function invCnt(s, pid) {
  let v = (s.counts || {})[pid];
  return v == null || v === "" ? null : num(v);
}
function invScope(s) {
  let all = activeProducts();
  return s && s.cat ? all.filter((p) => (p.cat || "") === s.cat) : all;
}
function invRows(s) {
  let sc = invScope(s),
    ids = new Set(sc.map((p) => p.id));
  Object.keys(s.counts || {}).forEach((pid) => {
    if (!ids.has(pid) && invCnt(s, pid) != null && state.products[pid]) {
      sc.push(state.products[pid]);
      ids.add(pid);
    }
  });
  return sc.map((p) => {
    let c = invCnt(s, p.id),
      sys = num(p.qty);
    return {
      p,
      c,
      sys,
      d: c == null ? 0 : c - sys,
    };
  });
}
function invSums(rows) {
  let short = 0,
    over = 0,
    nd = 0;
  rows.forEach((r) => {
    if (r.c == null || !r.d) return;
    nd++;
    let v = r.d * (num(r.p.cost) || num(r.p.price));
    r.d < 0 ? (short += -v) : (over += v);
  });
  return {
    short,
    over,
    nd,
    done: rows.filter((r) => r.c != null).length,
    all: rows.length,
  };
}
function invMonthDone() {
  let d = new Date(),
    m0 = new Date(d.getFullYear(), d.getMonth(), 1).getTime();
  return invAll().some((x) => x.status === "done" && num(x.finished) >= m0);
}
function invPage() {
  let s = invOpen();
  return s ? invCountPage(s) : invHomePage();
}
function invHomePage() {
  let own = isOwner(),
    st = state.settings || {},
    day = st.invDay == null ? 1 : num(st.invDay),
    hist = invAll()
      .filter((x) => x.status === "done")
      .sort((a, b) => num(b.finished) - num(a.finished)),
    last = hist[0],
    today = new Date().getDate(),
    due = day > 0 && today >= day && !invMonthDone();
  return `<h1 class="page">Inventarizatsiya</h1>
 ${due ? `<div class="note" style="border-left:4px solid var(--warn,#d97706);margin-bottom:12px"><b>Bu oy inventarizatsiya hali qilinmagan.</b> Tovarlarni sanab, qoldiqni tekshirish vaqti keldi.</div>` : ""}
 <div class="panel" style="max-width:720px"><div class="panel-b" style="display:grid;gap:12px">
  <div class="note">Inventarizatsiya — do'kondagi tovarlarni bittalab sanab, dasturdagi qoldiq bilan solishtirish. Sanash paytida skaner yoki telefon kamerasidan foydalanasiz. Oxirida dastur qaysi tovar kam yoki ortiqcha chiqqanini va farq necha so'm ekanini ko'rsatadi.${last ? `<br>Oxirgi inventarizatsiya: <b>${fmtDateTime(last.finished)}</b>` : "<br><b>Hali inventarizatsiya qilinmagan.</b>"}</div>
  ${
    own
      ? `<div><button class="btn primary" data-inv="start" style="padding:12px 18px">\u{1F4CB} Inventarizatsiyani boshlash</button></div>
  <label class="l" for="invDay" style="max-width:340px">Eslatma kuni (bot rahbarga Telegramda eslatadi, soat 10:00)<select id="invDay" class="f">
   <option value="0" ${day === 0 ? "selected" : ""}>Eslatma o'chiq</option>
   ${Array.from(
     {
       length: 28,
     },
     (_, i) => i + 1,
   )
     .map((i) => `<option value="${i}" ${day === i ? "selected" : ""}>Har oyning ${i}-kuni</option>`)
     .join("")}
  </select></label>`
      : `<div class="muted">Inventarizatsiyani do'kon egasi boshlaydi. Boshlangach, shu yerda tovarlarni sanaysiz.</div>`
  }
 </div></div>
 <h2 style="margin-top:18px">O'tgan inventarizatsiyalar</h2>
 <div class="panel"><div class="tbl-wrap"><table class="t"><thead><tr><th>Sana</th><th>Kim</th><th class="r">Sanaldi</th><th class="r">Kam chiqdi</th><th class="r">Ortiqcha</th><th></th></tr></thead><tbody>
 ${hist.map((x) => `<tr><td class="num">${fmtDateTime(x.finished)}</td><td>${esc(x.finishedBy || "")}${x.cat ? ` <span class="pill">${esc(x.cat)}</span>` : ""}</td><td class="r num">${money(x.nCount)} ta</td><td class="r num" style="color:${num(x.short) ? "var(--danger,#dc2626)" : "inherit"}">${num(x.short) ? "−" + money(x.short) : "0"}</td><td class="r num">${num(x.over) ? "+" + money(x.over) : "0"}</td><td class="r"><button class="btn sm" data-invview="${esc(x.id)}">Ko'rish</button></td></tr>`).join("") || `<tr><td colspan="6" class="muted">Hali yo'q</td></tr>`}
 </tbody></table></div></div>`;
}
function invCountPage(s) {
  let own = isOwner(),
    rows = invRows(s),
    sm = invSums(rows),
    f = state.invF || "todo",
    qq = (state.invQ || "").trim().toLowerCase(),
    list = rows.filter((r) =>
      f === "todo" ? r.c == null : f === "diff" ? r.c != null && r.d : f === "done" ? r.c != null : !0,
    );
  qq &&
    (list = list.filter(
      (r) => (r.p.name || "").toLowerCase().includes(qq) || bcs(r.p).some((b) => b.includes(qq)),
    ));
  list.sort((a, b) => (a.p.name || "").localeCompare(b.p.name || ""));
  let pct = sm.all ? Math.round((sm.done / sm.all) * 100) : 0,
    ae = document.activeElement,
    keep =
      ae && ae.dataset && ae.dataset.invq
        ? {
            pid: ae.dataset.invq,
            v: ae.value,
          }
        : null,
    chip = (k, t) => `<button data-invf="${k}" aria-pressed="${f === k}">${t}</button>`;
  return `<h1 class="page">Inventarizatsiya ketmoqda</h1>
 <div class="note" style="margin-bottom:12px">Boshlandi: <b>${fmtDateTime(s.started)}</b> \xB7 ${esc(s.startedBy || "")}${s.cat ? ` \xB7 faqat \xAB${esc(s.cat)}\xBB toifasi` : " \xB7 hamma tovarlar"}. Iloji bo'lsa, sanash paytida sotuv qilmang.</div>
 <div class="kpis">
  <div class="kpi"><div class="k">Sanaldi</div><div class="v num">${sm.done} / ${sm.all}</div><div class="muted" style="font-size:12px">${pct}%</div></div>
  <div class="kpi"><div class="k">Farqi bor</div><div class="v num">${sm.nd} ta</div></div>
  <div class="kpi"><div class="k">Kam chiqdi</div><div class="v num" style="color:${sm.short ? "var(--danger,#dc2626)" : "inherit"}">${sm.short ? "−" : ""}${money(sm.short)}</div></div>
  <div class="kpi"><div class="k">Ortiqcha</div><div class="v num">${sm.over ? "+" : ""}${money(sm.over)}</div></div>
 </div>
 <div class="panel" style="margin-top:12px"><div class="panel-b" style="display:grid;gap:10px">
  <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
   <input id="invScan" class="f" style="flex:1;min-width:220px" placeholder="Shtrix-kodni skanerlang yoki nomini yozib Enter bosing" autocomplete="off">
   ${hasCamScanner() ? '<button class="btn" data-inv="cam">\u{1F4F7} Kamera</button>' : ""}
  </div>
  <div class="muted" style="font-size:13px">Har skanerlashda tovar soni 1 taga ko'payadi. Sonni qo'lda ham yozishingiz mumkin.</div>
 </div></div>
 <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:12px 0">
  <div class="chips">${chip("todo", "Sanalmagan")}${chip("done", "Sanalgan")}${chip("diff", "Farqi bor")}${chip("all", "Hammasi")}</div>
  <input id="invQ" class="f" style="max-width:240px" placeholder="Qidirish…" value="${esc(state.invQ || "")}" autocomplete="off">
 </div>
 <div class="panel"><div class="tbl-wrap" style="max-height:60vh"><table class="t"><thead><tr><th>Tovar</th><th class="r">Dasturda</th><th class="r" style="width:150px">Sanaldi</th><th class="r">Farq</th></tr></thead><tbody>
 ${
   list
     .slice(0, 300)
     .map(
       (
         r,
       ) => `<tr><td><b>${esc(r.p.name)}</b>${r.p.barcode ? `<div class="muted num" style="font-size:12px">${esc(r.p.barcode)}</div>` : ""}</td><td class="r num">${money(r.sys)}</td>
  <td class="r"><span style="display:inline-flex;gap:4px;align-items:center"><input id="iq_${esc(r.p.id)}" class="f num" style="width:70px;text-align:right" data-invq="${esc(r.p.id)}" value="${keep && keep.pid === r.p.id ? esc(keep.v) : r.c == null ? "" : r.c}" placeholder="—" inputmode="decimal"><button class="btn sm" data-invplus="${esc(r.p.id)}" aria-label="Bittaga ko'paytirish">+1</button></span></td>
  <td class="r num">${r.c == null ? '<span class="muted">—</span>' : r.d < 0 ? `<span class="pill out">${money(r.d).replace("-", "−")}</span>` : r.d > 0 ? `<span class="pill ok">+${money(r.d)}</span>` : '<span class="pill">✓</span>'}</td></tr>`,
     )
     .join("") ||
   `<tr><td colspan="4" class="muted">${f === "todo" ? "Hammasi sanab bo'lindi ✓" : "Bu ro'yxat bo'sh"}</td></tr>`
 }
 </tbody></table></div>${list.length > 300 ? `<div class="panel-b muted">Birinchi 300 ta ko'rsatildi — qidiruvdan foydalaning.</div>` : ""}</div>
 <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:14px">
  ${own ? '<button class="btn primary" data-inv="finish" style="padding:12px 18px">✅ Yakunlash va qoldiqni to\'g\'rilash</button><button class="btn danger" data-inv="cancel">Bekor qilish</button>' : "<span class=\"muted\">Sanab bo'lgach, do'kon egasi \xABYakunlash\xBB tugmasini bosadi.</span>"}
 </div>`;
}
function invFind(t) {
  t = String(t || "").trim();
  if (!t) return null;
  let all = activeProducts(),
    b = all.find((p) => hasBc(p, t));
  if (b) return b;
  let l = t.toLowerCase(),
    m = all.filter((p) => (p.name || "").toLowerCase().includes(l));
  return m.length === 1 ? m[0] : m.find((p) => (p.name || "").toLowerCase() === l) || null;
}
function invAdd(code) {
  let s = invOpen();
  if (!s) {
    toast("Inventarizatsiya boshlanmagan");
    return;
  }
  let p = invFind(code);
  if (!p) {
    toast("Topilmadi: " + code);
    return;
  }
  let n = (invCnt(s, p.id) || 0) + 1;
  s.counts = Object.assign({}, s.counts, {
    [p.id]: n,
  });
  dbUpdate("inventory", s.id, {
    ["counts." + p.id]: incBy(1),
  });
  toast(p.name + " — " + money(n) + " ta");
  render();
}
function invCam() {
  camScan((c) => {
    invAdd(c);
    setTimeout(() => {
      state.tab === "inventar" && invOpen() && invCam();
    }, 700);
  });
}
function invView(id) {
  let x = (state.inventory || {})[id];
  if (!x) return;
  let it = (x.items || [])
    .slice()
    .sort((a, b) => (a.diff === 0) - (b.diff === 0) || num(a.diff) - num(b.diff));
  openModal(
    "Inventarizatsiya \xB7 " + fmtDateTime(x.finished),
    `<div class="note">${esc(x.finishedBy || "")} \xB7 sanaldi: <b>${money(x.nCount)}</b> ta \xB7 kam chiqdi: <b>${money(x.short)}</b> so'm \xB7 ortiqcha: <b>${money(x.over)}</b> so'm${x.zeroed ? ` \xB7 sanalmagan ${money(x.zeroed)} ta tovar 0 qilindi` : ""}</div>
 <div class="tbl-wrap" style="max-height:55vh"><table class="t"><thead><tr><th>Tovar</th><th class="r">Dasturda</th><th class="r">Sanaldi</th><th class="r">Farq</th><th class="r">So'm</th></tr></thead><tbody>
 ${it.map((r) => `<tr><td>${esc(r.name)}</td><td class="r num">${money(r.sys)}</td><td class="r num">${money(r.real)}</td><td class="r num">${r.diff > 0 ? "+" : ""}${r.diff ? money(r.diff).replace("-", "−") : "✓"}</td><td class="r num">${r.diff ? money(r.diff * r.val).replace("-", "−") : ""}</td></tr>`).join("")}
 </tbody></table></div>`,
    `<button class="btn" data-close="x">Yopish</button><button class="btn primary" data-invcsv="${esc(id)}">⬇ Excelga</button>`,
  );
}
function invCsv(id) {
  let x = (state.inventory || {})[id];
  if (!x) return;
  let rows = [
    ["Tovar", "Shtrix-kod", "Dasturda", "Sanaldi", "Farq", "Narx (tannarx)", "Farq so'mda"],
    ...(x.items || []).map((r) => [r.name, r.barcode || "", r.sys, r.real, r.diff, r.val, r.diff * r.val]),
  ];
  downloadFile(
    `inventarizatsiya-${fmtDay(x.finished)}.csv`,
    "﻿" +
      rows.map((r) => r.map((c) => '"' + String(c ?? "").replace(/"/g, '""') + '"').join(";")).join("\r\n"),
    "text/csv",
  );
}
async function invFinish() {
  let s = invOpen();
  if (!s || !isOwner()) return;
  let zero = !!(qsel("#invZero") && qsel("#invZero").checked),
    rows = invRows(s),
    items = [],
    short = 0,
    over = 0,
    nz = 0,
    now = Date.now();
  for (let r of rows) {
    let real = r.c;
    if (real == null) {
      if (!zero) continue;
      real = 0;
      nz++;
    }
    let sys = num(r.p.qty),
      diff = real - sys,
      val = num(r.p.cost) || num(r.p.price);
    items.push({
      pid: r.p.id,
      name: r.p.name || "",
      barcode: r.p.barcode || "",
      sys,
      real,
      diff,
      val,
    });
    if (!diff) continue;
    diff < 0 ? (short += -diff * val) : (over += diff * val);
    await dbUpdate("products", r.p.id, {
      qty: incBy(diff),
    });
    await dbSet("stockLog", newId(), {
      pid: r.p.id,
      name: r.p.name,
      from: sys,
      to: real,
      delta: diff,
      why: "Inventarizatsiya",
      who: state.seller,
      ts: now,
    });
  }
  await dbUpdate("inventory", s.id, {
    status: "done",
    finished: now,
    finishedBy: state.seller,
    items,
    short,
    over,
    nCount: items.length - nz,
    zeroed: nz,
    nDiff: items.filter((i) => i.diff).length,
  });
  closeModal();
  state.invF = "todo";
  state.invQ = "";
  toast("Inventarizatsiya yakunlandi, qoldiqlar to'g'rilandi");
  setTimeout(() => invView(s.id), 300);
}
document.addEventListener("click", (n) => {
  let t = n.target.closest("[data-inv],[data-invf],[data-invplus],[data-invview],[data-invcsv]");
  if (!t) return;
  let d = t.dataset;
  if (d.invf) {
    state.invF = d.invf;
    render();
    return;
  }
  if (d.invplus) {
    let s = invOpen(),
      p = state.products[d.invplus];
    if (s && p) invAdd(p.barcode || p.name);
    return;
  }
  if (d.invview) {
    invView(d.invview);
    return;
  }
  if (d.invcsv) {
    invCsv(d.invcsv);
    return;
  }
  let a = d.inv;
  if (a === "cam") {
    invCam();
    return;
  }
  if (!isOwner()) {
    toast("Faqat do'kon egasi");
    return;
  }
  if (a === "start") {
    if (invOpen()) {
      render();
      return;
    }
    let cats = [
      ...new Set(
        activeProducts()
          .map((p) => p.cat || "")
          .filter(Boolean),
      ),
    ].sort();
    openModal(
      "Inventarizatsiyani boshlash",
      `<label class="l" for="invCat">Qaysi tovarlar sanaladi?<select id="invCat" class="f"><option value="">Hamma tovarlar (${activeProducts().length} ta)</option>${cats.map((c) => `<option value="${esc(c)}">Faqat \xAB${esc(c)}\xBB toifasi (${activeProducts().filter((p) => p.cat === c).length} ta)</option>`).join("")}</select></label>
  <div class="note" style="margin-top:10px">Boshlangach, sotuvchilar ham o'z qurilmasidan sanashga qo'shilishi mumkin. Qoldiq faqat siz \xABYakunlash\xBB bosganingizda o'zgaradi.</div>`,
      '<button class="btn" data-close="x">Bekor qilish</button><button class="btn primary" data-inv="dostart">Boshlash</button>',
    );
    return;
  }
  if (a === "dostart") {
    if (invOpen()) {
      closeModal();
      render();
      return;
    }
    let id = newId(),
      cat = (qsel("#invCat") || {}).value || "";
    state.inventory = Object.assign({}, state.inventory, {
      [id]: {
        id,
        status: "open",
        started: Date.now(),
        startedBy: state.seller,
        cat,
        counts: {},
      },
    });
    dbSet("inventory", id, {
      status: "open",
      started: Date.now(),
      startedBy: state.seller,
      cat,
      counts: {},
      ts: Date.now(),
    });
    state.invF = "todo";
    state.invQ = "";
    closeModal();
    switchTab("inventar");
    return;
  }
  if (a === "finish") {
    let s = invOpen();
    if (!s) return;
    let rows = invRows(s),
      sm = invSums(rows),
      left = sm.all - sm.done;
    openModal(
      "Inventarizatsiyani yakunlash",
      `<div class="note">Sanaldi: <b>${sm.done}</b> ta tovar. Farqi bor: <b>${sm.nd}</b> ta.<br>Kam chiqdi: <b>${money(sm.short)}</b> so'm \xB7 Ortiqcha: <b>${money(sm.over)}</b> so'm <span class="muted">(tannarx bo'yicha)</span></div>
  ${left ? `<div class="note" style="margin-top:10px"><b>${left}</b> ta tovar sanalmadi. Odatda ularning qoldig'i o'zgarmaydi.<label style="display:flex;gap:8px;align-items:center;margin-top:8px"><input type="checkbox" id="invZero"> Sanalmagan tovarlar do'konda yo'q — qoldig'ini 0 qilish</label></div>` : ""}
  <div class="note" style="margin-top:10px">\xABTasdiqlash\xBB bosilgach, dasturdagi qoldiqlar sanalgan songa tenglanadi. Har bir o'zgarish \xABQoldiq tarixi\xBBga \xABInventarizatsiya\xBB deb yoziladi.</div>`,
      '<button class="btn" data-close="x">Ortga</button><button class="btn primary" data-inv="dofinish">Tasdiqlash</button>',
    );
    return;
  }
  if (a === "dofinish") {
    t.disabled = !0;
    invFinish();
    return;
  }
  if (a === "cancel") {
    openModal(
      "Bekor qilish",
      `<div class="note">Sanalgan sonlar saqlanmaydi, qoldiqlar o'zgarmaydi. Bekor qilinsinmi?</div>`,
      '<button class="btn" data-close="x">Yo\'q</button><button class="btn danger" data-inv="docancel">Ha, bekor qilish</button>',
    );
    return;
  }
  if (a === "docancel") {
    let s = invOpen();
    s &&
      ((s.status = "cancelled"),
      dbUpdate("inventory", s.id, {
        status: "cancelled",
        cancelled: Date.now(),
        cancelledBy: state.seller,
      }));
    closeModal();
    render();
    return;
  }
});
document.addEventListener(
  "keydown",
  (n) => {
    if (n.key !== "Enter" || !n.target || n.target.id !== "invScan") return;
    n.preventDefault();
    n.stopPropagation();
    let v = n.target.value.trim();
    n.target.value = "";
    v && invAdd(v);
  },
  !0,
);
document.addEventListener(
  "input",
  (n) => {
    if (n.target && n.target.id === "invQ") {
      state.invQ = n.target.value;
      clearTimeout(state._invT);
      state._invT = setTimeout(() => render(), 300);
    }
  },
  !0,
);
document.addEventListener(
  "change",
  (n) => {
    let t = n.target;
    if (!t) return;
    if (t.id === "invDay") {
      isOwner() &&
        dbUpdate("meta", "settings", {
          invDay: num(t.value),
        });
      toast("Saqlandi");
      return;
    }
    if (t.dataset && t.dataset.invq) {
      let s = invOpen();
      if (!s) return;
      let v = t.value.trim(),
        pid = t.dataset.invq,
        val = v === "" ? null : Math.max(0, num(v));
      s.counts = Object.assign({}, s.counts, {
        [pid]: val,
      });
      dbUpdate("inventory", s.id, {
        ["counts." + pid]: val,
      });
      render();
    }
  },
  !0,
);
/* ===== /Inventarizatsiya ===== */

/* ===== Bir tovarga bir necha shtrix-kod ===== */
function bcs(p) {
  return p
    ? [...new Set([p.barcode, ...(p.barcodes || [])].map((x) => String(x || "").trim()).filter(Boolean))]
    : [];
}
function hasBc(p, c) {
  c = String(c || "").trim();
  return !!c && bcs(p).includes(c);
}
function bcSplit(v) {
  let a = [
    ...new Set(
      String(v || "")
        .split(/[,;\s]+/)
        .map((x) => x.trim())
        .filter(Boolean),
    ),
  ];
  return {
    barcode: a[0] || "",
    barcodes: a.slice(1),
  };
}
function bcMerge(s, r, o) {
  let have = bcs(s),
    nw = bcs(r).filter((c) => !have.includes(c));
  if (!nw.length) return;
  if (!s.barcode) o.barcode = nw.shift();
  if (nw.length) o.barcodes = [...(s.barcodes || []), ...nw];
}
function mpBarsChips() {
  return (
    (state.mpBars || [])
      .map(
        (c, i) =>
          `<span class="pill num" style="display:inline-flex;gap:6px;align-items:center;padding-right:4px">${esc(c)}<button type="button" class="btn sm" style="padding:0 7px;min-height:0" data-mpbardel="${i}" aria-label="O'chirish">\xD7</button></span>`,
      )
      .join("") || '<span class="muted" style="font-size:13px">Hozircha yo\'q</span>'
  );
}
function mpBarsDraw() {
  let b = qsel("#mpBarsBox");
  b && (b.innerHTML = mpBarsChips());
}
function mpBarsFinal() {
  let m = (qsel("#mpBar") || {}).value;
  m = String(m || "").trim();
  return [...new Set((state.mpBars || []).map((x) => String(x).trim()).filter((x) => x && x !== m))];
}
function mpBarAdd(code) {
  code = String(code || "").trim();
  let inp = qsel("#mpBarAdd");
  inp && (inp.value = "");
  if (!code) return;
  let main = String((qsel("#mpBar") || {}).value || "").trim();
  if (!main) {
    let m = qsel("#mpBar");
    m && (m.value = code);
    toast("Asosiy shtrix-kod: " + code);
    return;
  }
  if (code === main || (state.mpBars || []).includes(code)) {
    toast("Bu kod allaqachon qo'shilgan");
    return;
  }
  let other = activeProducts().find((p) => p.id !== state.mpBarsPid && hasBc(p, code));
  if (other) {
    toast(`Bu kod \xAB${other.name}\xBB tovarida bor`);
    return;
  }
  state.mpBars = [...(state.mpBars || []), code];
  mpBarsDraw();
  toast("Qo'shildi: " + code);
  inp && inp.focus();
}
document.addEventListener("click", (n) => {
  let t = n.target.closest("[data-mpbar],[data-mpbardel]");
  if (!t) return;
  if (t.dataset.mpbardel != null) {
    state.mpBars = (state.mpBars || []).filter((_, i) => i !== +t.dataset.mpbardel);
    mpBarsDraw();
    return;
  }
  if (t.dataset.mpbar === "add") {
    mpBarAdd((qsel("#mpBarAdd") || {}).value);
    return;
  }
  if (t.dataset.mpbar === "cam") camScan((c) => mpBarAdd(c));
});
document.addEventListener(
  "keydown",
  (n) => {
    if (n.key !== "Enter" || !n.target || n.target.id !== "mpBarAdd") return;
    n.preventDefault();
    n.stopPropagation();
    mpBarAdd(n.target.value);
  },
  !0,
);
/* ===== /shtrix-kodlar ===== */

/* ===== Qo'shimcha bo'limlar: qaytarish, muddat, kassa, xarajat, buyurtma, hisobot ===== */
var xCut = () => Date.now() - LIVE_DAYS * 864e5;
var xDay0 = () => {
  let d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};
function xRange(col, a, b) {
  a = a > 0 ? Math.floor(a / 36e5) * 36e5 : a;
  b = b !== 1 / 0 && b > 0 ? Math.ceil(b / 36e5) * 36e5 : b;
  if (a >= xCut())
    return {
      list: (state[col] || []).filter((r) => r.ts >= a && r.ts < b),
      ready: !0,
    };
  state._xr = state._xr || {};
  let k = col + "|" + a + "|" + b;
  if (state._xr[k]) return state._xr[k];
  state._xr[k] = {
    list: [],
    ready: !1,
  };
  fsGetDocs(
    fsQuery(fsCollection(fire.db, col), fsWhere("ts", ">=", a), fsWhere("ts", "<", b === 1 / 0 ? 9e15 : b)),
  )
    .then((s) => {
      state._xr[k] = {
        list: s.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })),
        ready: !0,
      };
      render();
    })
    .catch((e) => {
      console.error(e);
      delete state._xr[k];
    });
  return state._xr[k];
}
var xMon = [
  "yanvar",
  "fevral",
  "mart",
  "aprel",
  "may",
  "iyun",
  "iyul",
  "avgust",
  "sentabr",
  "oktabr",
  "noyabr",
  "dekabr",
];
var xNeg = (v) => money(v).replace("-", "−");

/* ---------- 1. Qaytarish (vozvrat) ---------- */
function xRetBtn(n) {
  if (!n || !n.id || n.retFull) return "";
  return `<button class="btn warn" data-retsale="${esc(n.id)}">↩ Qaytarish</button>`;
}
function xRetFind() {
  let list = (state.sales || []).slice(0, 40);
  openModal(
    "Tovar qaytarish — chekni tanlang",
    `<label class="l" for="retNo">Chek raqami (masalan A-1005)<input id="retNo" class="f num" autocomplete="off" placeholder="Raqamni yozib Enter bosing"></label>
 <div class="tbl-wrap" style="max-height:50vh;margin-top:10px"><table class="t"><thead><tr><th>Chek</th><th>Sana</th><th>Mijoz</th><th class="r">Summa</th></tr></thead><tbody>
 ${list.map((s) => `<tr class="click" data-retsale="${esc(s.id)}"><td class="num"><b>${esc(s.no)}</b>${num(s.retSum) ? ' <span class="pill low">qaytgan</span>' : ""}</td><td class="num">${fmtDateTime(s.ts)}</td><td>${esc(s.clientName || "")}</td><td class="r num">${money(s.total)}</td></tr>`).join("") || '<tr><td colspan="4" class="muted">Cheklar yo\'q</td></tr>'}
 </tbody></table></div>`,
  );
}
async function xRetByNo(no) {
  no = String(no || "")
    .trim()
    .toUpperCase();
  if (!no) return;
  let s = (state.sales || []).find((x) => String(x.no).toUpperCase() === no);
  if (!s) {
    try {
      let r = await fsGetDocs(fsQuery(fsCollection(fire.db, "sales"), fsWhere("no", "==", no)));
      r.docs[0] &&
        (s = {
          id: r.docs[0].id,
          ...r.docs[0].data(),
        });
    } catch (e) {
      console.error(e);
    }
  }
  s ? xRetOpen(s) : toast("Bunday chek topilmadi: " + no);
}
function xRetOpen(s) {
  if (typeof s === "string")
    s =
      (state.sales || []).find((x) => x.id === s) ||
      (state._retSale && state._retSale.id === s ? state._retSale : null);
  if (!s) {
    toast("Chek topilmadi");
    return;
  }
  state._retSale = s;
  let cl = s.clientId ? state.clients[s.clientId] : null,
    ret = s.ret || {},
    rows = (s.items || [])
      .map((it, i) => {
        let left = num(it.qty) - num(ret[i]);
        return `<tr><td>${esc(it.name)}<div class="muted num" style="font-size:12px">${money(it.price)} so'm \xD7 ${money(it.qty)}${num(ret[i]) ? ` \xB7 avval qaytgan: ${money(ret[i])}` : ""}</div></td><td class="r">${left > 0 ? `<input class="f num" style="width:70px;text-align:right" data-retq="${i}" data-max="${left}" value="0" inputmode="decimal">` : '<span class="pill">qaytgan</span>'}</td></tr>`;
      })
      .join("");
  openModal(
    `Qaytarish \xB7 chek №${s.no}`,
    `<div class="note">${fmtDateTime(s.ts)} \xB7 ${esc(s.seller || "")}${s.clientName ? ` \xB7 mijoz: <b>${esc(s.clientName)}</b>` : ""} \xB7 summa <b>${money(s.total)}</b>${num(s.discount) ? ` (chegirma ${money(s.discount)})` : ""}</div>
 <div class="tbl-wrap" style="margin-top:10px"><table class="t"><thead><tr><th>Tovar</th><th class="r">Qaytadi (dona)</th></tr></thead><tbody>${rows}</tbody></table></div>
 <div class="fg" style="margin-top:10px">
  <label class="l" for="retHow">Pul qanday qaytariladi<select id="retHow" class="f"><option value="cash">Naqd (kassadan)</option><option value="card">Karta / Click</option>${cl && num(cl.debt) > 0 ? `<option value="debt">Mijoz qarzidan ayirish (qarzi ${money(cl.debt)})</option>` : ""}</select></label>
  <label class="l" for="retWhy">Sababi<input id="retWhy" class="f" placeholder="Yoqmadi, nuqsonli, muddati o'tgan…"></label>
 </div>
 <div class="note" style="margin-top:10px">Qaytariladigan summa: <b class="num" id="retSum">0</b> so'm. Tovar qoldig'i o'zi ko'payadi.</div>`,
    '<button class="btn" data-close="x">Bekor qilish</button><button class="btn primary" data-x="retdo">Qaytarishni saqlash</button>',
  );
}
function xRetCalc() {
  let s = state._retSale;
  if (!s)
    return {
      lines: [],
      gross: 0,
      amount: 0,
    };
  let f = num(s.sub) ? num(s.total) / num(s.sub) : 1,
    lines = [];
  document.querySelectorAll("#modalRoot [data-retq]").forEach((el) => {
    let i = +el.dataset.retq,
      qn = Math.min(num(el.value), num(el.dataset.max));
    qn > 0 &&
      lines.push({
        i,
        qty: qn,
        it: s.items[i],
      });
  });
  let gross = lines.reduce((a, l) => a + l.qty * num(l.it.price), 0);
  return {
    lines,
    gross,
    amount: Math.round(gross * f),
  };
}
async function xRetDo(btn) {
  let s = state._retSale,
    c = xRetCalc();
  if (!s || !c.lines.length) {
    toast("Qaytadigan tovar sonini yozing");
    return;
  }
  btn && (btn.disabled = !0);
  let how = (qsel("#retHow") || {}).value || "cash",
    why = ((qsel("#retWhy") || {}).value || "").trim(),
    cl = s.clientId ? state.clients[s.clientId] : null,
    debtOff = how === "debt" && cl ? Math.min(c.amount, Math.max(0, num(cl.debt))) : 0,
    card = how === "card" ? c.amount : 0,
    cash = c.amount - debtOff - card,
    cbBack = num(s.cbEarned) && num(s.total) ? Math.round((num(s.cbEarned) * c.amount) / num(s.total)) : 0,
    now = Date.now(),
    id = newId();
  await dbSet("returns", id, {
    ts: now,
    saleId: s.id,
    saleNo: s.no,
    items: c.lines.map((l) => ({
      pid: l.it.pid,
      name: l.it.name,
      qty: l.qty,
      price: num(l.it.price),
      cost: num(l.it.cost),
    })),
    amount: c.amount,
    cash,
    card,
    debtOff,
    cbBack,
    clientId: s.clientId || null,
    clientName: s.clientName || "",
    seller: state.seller || "",
    why,
  });
  let up = {
    retSum: incBy(c.amount),
  };
  c.lines.forEach((l) => {
    up["ret." + l.i] = incBy(l.qty);
  });
  let full = (s.items || []).every(
    (it, i) =>
      num(it.qty) -
        num((s.ret || {})[i]) -
        (
          c.lines.find((l) => l.i === i) || {
            qty: 0,
          }
        ).qty <=
      0,
  );
  full && (up.retFull = !0);
  await dbUpdate("sales", s.id, up);
  for (let l of c.lines) {
    let p = state.products[l.it.pid];
    if (!p) continue;
    await dbUpdate("products", p.id, {
      qty: incBy(l.qty),
    });
    await dbSet("stockLog", newId(), {
      pid: p.id,
      name: p.name,
      from: num(p.qty),
      to: num(p.qty) + l.qty,
      delta: l.qty,
      why: `Qaytarish (chek №${s.no})` + (why ? ": " + why : ""),
      who: state.seller,
      ts: now,
    });
  }
  cl &&
    (debtOff || cbBack) &&
    (await dbUpdate("clients", cl.id, {
      lastRefCol: "returns",
      lastRefId: id,
      lastRefTs: now,
      ...(debtOff
        ? {
            debt: incBy(-debtOff),
          }
        : {}),
      ...(cbBack
        ? {
            cashback: incBy(-Math.min(cbBack, Math.max(0, num(cl.cashback)))),
          }
        : {}),
    }));
  state._retSale = null;
  openModal(
    "Qaytarish saqlandi",
    `<div class="note" style="font-size:16px">Mijozga qaytariladi: <b class="num">${money(c.amount)}</b> so'm<br>${cash ? `\u{1F4B5} Naqd: <b>${money(cash)}</b><br>` : ""}${card ? `\u{1F4B3} Karta: <b>${money(card)}</b><br>` : ""}${debtOff ? `\u{1F4D2} Qarzidan ayirildi: <b>${money(debtOff)}</b><br>` : ""}${cbBack ? `Keshbek qaytarib olindi: ${money(cbBack)}` : ""}</div>`,
    '<button class="btn primary" data-close="x">Yopish</button>',
  );
}

/* ---------- 2. Yaroqlilik muddati ---------- */
function xExpRem(p) {
  let Q = Math.max(0, num(p.qty)),
    out = [];
  if (!Q) return out;
  let b = (p.expiries || [])
    .filter((x) => x && x.d)
    .slice()
    .sort((a, c) => (a.d < c.d ? 1 : -1));
  for (let x of b) {
    if (Q <= 0) break;
    let t = Math.min(Q, num(x.q) || Q);
    out.push({
      d: x.d,
      q: t,
    });
    Q -= t;
  }
  return out;
}
function xExpNear(p) {
  let r = xExpRem(p);
  return r.length ? r.reduce((a, x) => (x.d < a ? x.d : a), r[0].d) : "";
}
function xExpDays(d) {
  return Math.round((new Date(d + "T00:00:00").getTime() - xDay0()) / 864e5);
}
function xExpLim() {
  let v = (state.settings || {}).expDays;
  return v == null ? 60 : num(v);
}
function xExpList(all) {
  let lim = xExpLim(),
    out = [];
  activeProducts().forEach((p) =>
    xExpRem(p).forEach((b) => {
      let dl = xExpDays(b.d);
      (all || dl <= lim) &&
        out.push({
          p,
          d: b.d,
          q: b.q,
          dl,
        });
    }),
  );
  return out.sort((a, b) => a.dl - b.dl);
}
function xExpPill(dl) {
  return dl < 0
    ? `<span class="pill out">${-dl} kun o'tgan</span>`
    : dl === 0
      ? '<span class="pill out">bugun tugaydi</span>'
      : dl <= 30
        ? `<span class="pill low">${dl} kun qoldi</span>`
        : `<span class="pill">${dl} kun qoldi</span>`;
}
function xExpModal() {
  let l = xExpList(state._expAll),
    lim = xExpLim();
  openModal(
    "Yaroqlilik muddati",
    `<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:10px"><span class="seg"><button data-x="expnear" aria-pressed="${!state._expAll}">Muddati yaqin</button><button data-x="expall" aria-pressed="${!!state._expAll}">Hammasi</button></span>
 ${isOwner() ? `<label class="l" for="expDays" style="margin:0">Necha kun qolganda ogohlantirsin<select id="expDays" class="f">${[15, 30, 45, 60, 90, 120, 180].map((d) => `<option value="${d}" ${d === lim ? "selected" : ""}>${d} kun</option>`).join("")}</select></label>` : ""}</div>
 <div class="tbl-wrap" style="max-height:55vh"><table class="t"><thead><tr><th>Tovar</th><th>Muddati</th><th class="r">Shu partiyadan</th><th></th></tr></thead><tbody>
 ${l.map((x) => `<tr><td><b>${esc(x.p.name)}</b></td><td class="num">${x.d.split("-").reverse().join(".")}</td><td class="r num">${money(x.q)} dona</td><td class="r">${xExpPill(x.dl)}</td></tr>`).join("") || `<tr><td colspan="4" class="muted">${state._expAll ? "Muddati kiritilgan tovar yo'q" : "Muddati yaqin tovar yo'q ✓"}</td></tr>`}
 </tbody></table></div>
 <div class="note" style="margin-top:10px">Muddat kirimda (har bir tovar qatorida) yoki tovarni tahrirlash oynasida kiritiladi. Dastur avval eski partiya sotiladi deb hisoblaydi. Muddati yaqin tovarni chegirma bilan tezroq soting.</div>`,
  );
}
function xExpField(n) {
  let v = n && n.id ? xExpNear(n) : "";
  return `<label class="l" for="mpExp">Yaroqlilik muddati (hozirgi qoldiq uchun)<input type="date" id="mpExp" class="f" value="${esc(v)}"></label>`;
}
function xExpPatch(pid) {
  let el = qsel("#mpExp");
  if (!el) return {};
  let v = el.value,
    p = pid ? state.products[pid] : null,
    cur = p ? xExpNear(p) : "";
  if (v === cur) return {};
  if (!v)
    return {
      expiries: [],
    };
  let qn = Math.max(1, num((qsel("#mpQty") || {}).value)),
    keep = p ? (p.expiries || []).filter((x) => x.d !== cur) : [];
  return {
    expiries: [
      ...keep,
      {
        d: v,
        q: qn,
        ts: Date.now(),
      },
    ].slice(-20),
  };
}
function xIntakeProd(l) {
  xCostWarn(l);
  let p = state.products[l.pid],
    o = {};
  intake && intake.supplierId && (o.sup = intake.supplierId);
  l.exp &&
    (o.expiries = [
      ...((p && p.expiries) || []),
      {
        d: l.exp,
        q: num(l.qty),
        ts: Date.now(),
      },
    ].slice(-20));
  return o;
}

/* ---------- 3. Kassa yopish (smena) ---------- */
function xShiftLast() {
  return (state.shifts || []).slice().sort((a, b) => num(b.ts) - num(a.ts))[0] || null;
}
function xShiftCalc() {
  let last = xShiftLast(),
    from = last ? num(last.ts) : xDay0(),
    open = last ? num(last.left) : 0,
    sales = (state.sales || []).filter((s) => s.ts >= from),
    cashSales = sales.reduce((a, s) => a + num(s.cash), 0),
    cardSales = sales.reduce((a, s) => a + num(s.card), 0),
    pays = (state.payments || []).filter((p) => p.ts >= from && /naqd/i.test(p.method || "")),
    inPay = pays.filter((p) => p.kind === "client").reduce((a, p) => a + num(p.amount), 0),
    outPay = pays.filter((p) => p.kind !== "client").reduce((a, p) => a + num(p.amount), 0),
    rets = (state.returns || []).filter((r) => r.ts >= from).reduce((a, r) => a + num(r.cash), 0),
    exps = (state.expenses || [])
      .filter((x) => x.ts >= from && !x.void && x.pay === "cash")
      .reduce((a, x) => a + num(x.amount), 0),
    crt = Object.values(state.certs || {})
      .filter((x) => x.ts >= from && x.pay === "cash")
      .reduce((a, x) => a + num(x.amount), 0);
  return {
    from,
    open,
    cashSales,
    cardSales,
    n: sales.length,
    inPay,
    outPay,
    rets,
    exps,
    crt,
    expected: open + cashSales + inPay + crt - outPay - rets - exps,
  };
}
function xShiftUpd() {
  let c = xShiftCalc(),
    cnt = qsel("#shCount"),
    el = qsel("#shDiff");
  if (!cnt || !el) return;
  if (cnt.value.trim() === "") {
    el.innerHTML = "";
    return;
  }
  let d = num(cnt.value) - c.expected;
  el.innerHTML =
    d === 0
      ? '<span class="pill ok">Hammasi joyida ✓</span>'
      : d < 0
        ? `<span class="pill out">${money(-d)} so'm kam</span>`
        : `<span class="pill low">${money(d)} so'm ortiqcha</span>`;
}
async function xShiftClose(btn) {
  let cnt = qsel("#shCount");
  if (!cnt || cnt.value.trim() === "") {
    toast("Kassadagi naqd pulni sanab yozing");
    return;
  }
  let c = xShiftCalc(),
    counted = num(cnt.value),
    left = Math.min(counted, num((qsel("#shLeft") || {}).value)),
    id = newId();
  btn && (btn.disabled = !0);
  await dbSet("shifts", id, {
    ts: Date.now(),
    from: c.from,
    seller: state.seller || "",
    open: c.open,
    cashSales: c.cashSales,
    cardSales: c.cardSales,
    nSales: c.n,
    inPay: c.inPay,
    outPay: c.outPay,
    rets: c.rets,
    exps: c.exps,
    expected: c.expected,
    counted,
    diff: counted - c.expected,
    left,
    taken: counted - left,
    note: ((qsel("#shNote") || {}).value || "").trim(),
  });
  toast("Kassa yopildi");
  render();
}

/* ---------- 4. Xarajatlar ---------- */
var xExpCats = [
  "Ijara",
  "Kommunal (svet, gaz, suv)",
  "Oylik maosh",
  "Transport, yetkazish",
  "Reklama",
  "Soliq",
  "Internet, aloqa",
  "Xo'jalik mollari",
  "Boshqa",
];
async function xExpenseAdd(btn) {
  let a = num((qsel("#exAmt") || {}).value);
  if (a <= 0) {
    toast("Summani yozing");
    return;
  }
  btn && (btn.disabled = !0);
  await dbSet("expenses", newId(), {
    ts: Date.now(),
    amount: a,
    cat: (qsel("#exCat") || {}).value || "Boshqa",
    note: ((qsel("#exNote") || {}).value || "").trim(),
    pay: (qsel("#exPay") || {}).value || "cash",
    seller: state.seller || "",
  });
  toast("Xarajat saqlandi");
  render();
}

/* ---------- Kassa sahifasi ---------- */
function xKassaPage() {
  let own = isOwner(),
    c = xShiftCalc(),
    m0 = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime(),
    ex = (state.expenses || []).filter((x) => x.ts >= m0 && !x.void).sort((a, b) => b.ts - a.ts),
    exSum = ex.reduce((a, x) => a + num(x.amount), 0),
    sh = (state.shifts || [])
      .slice()
      .sort((a, b) => b.ts - a.ts)
      .slice(0, 30),
    rt = (state.returns || [])
      .slice()
      .sort((a, b) => b.ts - a.ts)
      .slice(0, 15),
    row = (t, v, sg) =>
      `<div style="display:flex;justify-content:space-between;gap:8px;padding:4px 0"><span>${t}</span><b class="num">${sg || ""}${money(v)}</b></div>`;
  return `<h1 class="page">Kassa va xarajatlar</h1>
 <div class="two">
  <div class="panel"><div class="panel-h"><h2>\u{1F4B5} Kassani yopish</h2></div><div class="panel-b" style="display:grid;gap:8px">
   <div class="muted" style="font-size:13px">${fmtDateTime(c.from)} dan beri (${c.n} ta chek)</div>
   ${row("Kassada bor edi (boshida)", c.open)}${row("Naqd savdo", c.cashSales, "+")}${c.inPay ? row("Mijozlar qarzini naqd to'ladi", c.inPay, "+") : ""}${c.outPay ? row("Yetkazib beruvchiga naqd to'landi", c.outPay, "−") : ""}${c.rets ? row("Qaytarish (naqd)", c.rets, "−") : ""}${c.exps ? row("Xarajat (kassadan)", c.exps, "−") : ""}${c.crt ? row("Sovg'a sertifikati sotildi (naqd)", c.crt, "+") : ""}
   <div style="display:flex;justify-content:space-between;border-top:1px solid var(--line);padding-top:8px;font-size:17px"><span>Kassada bo'lishi kerak</span><b class="num">${money(c.expected)}</b></div>
   <div class="muted" style="font-size:13px">Karta / Click bilan: ${money(c.cardSales)} so'm (kassaga kirmaydi)</div>
   <label class="l" for="shCount">Sanab chiqilgan naqd pul<input id="shCount" class="f num" inputmode="numeric" placeholder="0" autocomplete="off"></label>
   <div id="shDiff"></div>
   <label class="l" for="shLeft">Ertaga uchun kassada qoldiriladigan maydalik<input id="shLeft" class="f num" inputmode="numeric" placeholder="0"></label>
   <label class="l" for="shNote">Izoh (ixtiyoriy)<input id="shNote" class="f"></label>
   <button class="btn primary" data-x="shclose" style="padding:12px">Kassani yopish</button>
  </div></div>
  <div style="display:grid;gap:14px;align-content:start">
   <div class="panel"><div class="panel-h"><h2>↩ Tovar qaytarish</h2></div><div class="panel-b" style="display:grid;gap:8px">
    <div class="muted">Mijoz tovarni qaytarsa: chekni toping, qaytgan tovar sonini yozing. Pul, qoldiq va mijoz qarzi o'zi to'g'rilanadi.</div>
    <div><button class="btn primary" data-x="retfind">↩ Qaytarish</button></div>
    ${rt.length ? `<div class="tbl-wrap"><table class="t"><thead><tr><th>Sana</th><th>Chek</th><th class="r">Summa</th></tr></thead><tbody>${rt.map((r) => `<tr title="${esc((r.items || []).map((i) => i.name + " \xD7 " + i.qty).join(", "))}"><td class="num">${fmtDateTime(r.ts)}</td><td class="num">${esc(r.saleNo)}</td><td class="r num">${money(r.amount)}</td></tr>`).join("")}</tbody></table></div>` : ""}
   </div></div>
   <div class="panel"><div class="panel-h"><h2>\u{1F9FE} Xarajat qo'shish</h2></div><div class="panel-b" style="display:grid;gap:8px">
    <div class="fg">
     <label class="l" for="exAmt">Summa<input id="exAmt" class="f num" inputmode="numeric" placeholder="0"></label>
     <label class="l" for="exCat">Turi<select id="exCat" class="f">${xExpCats.map((x) => `<option>${esc(x)}</option>`).join("")}</select></label>
     <label class="l" for="exPay">Qayerdan to'landi<select id="exPay" class="f"><option value="cash">Kassadagi naqd puldan</option><option value="card">Karta / Click</option><option value="other">Boshqa joydan (cho'ntakdan)</option></select></label>
     <label class="l" for="exNote">Izoh<input id="exNote" class="f" placeholder="Masalan: oktabr ijarasi"></label>
    </div>
    <div><button class="btn primary" data-x="exadd">Saqlash</button></div>
   </div></div>
  </div>
 </div>
 ${xExpSection()}${xPaySection()}
 <h2 style="margin-top:18px">Kassa yopilishlari</h2>
 <div class="panel"><div class="tbl-wrap" style="max-height:45vh"><table class="t"><thead><tr><th>Sana</th><th>Kim</th><th class="r">Bo'lishi kerak</th><th class="r">Sanaldi</th><th class="r">Farq</th><th class="r">Olib ketildi</th></tr></thead><tbody>
 ${sh.map((x) => `<tr><td class="num">${fmtDateTime(x.ts)}</td><td>${esc(x.seller || "")}${x.note ? `<div class="muted" style="font-size:12px">${esc(x.note)}</div>` : ""}</td><td class="r num">${money(x.expected)}</td><td class="r num">${money(x.counted)}</td><td class="r">${num(x.diff) === 0 ? '<span class="pill ok">✓</span>' : num(x.diff) < 0 ? `<span class="pill out num">${xNeg(x.diff)}</span>` : `<span class="pill low num">+${money(x.diff)}</span>`}</td><td class="r num">${money(x.taken)}</td></tr>`).join("") || '<tr><td colspan="6" class="muted">Hali kassa yopilmagan</td></tr>'}
 </tbody></table></div></div>`;
}

/* ---------- 5. Buyurtma ro'yxati ---------- */
function xOrdSup(p) {
  if (p.sup && state.suppliers[p.sup]) return p.sup;
  let b = xLive(state.purchases || []).find((x) => (x.items || []).some((i) => i.pid === p.id));
  return (b && b.supplierId) || "";
}
function xOrdNeed(p) {
  let mn = num(p.min || 3),
    qn = num(p.qty),
    r = (state._rt || {})[p.id] || 0;
  return Math.max(1, Math.ceil(Math.max(mn * 2 - qn, r * 30 - qn)));
}
function xOrdGroups() {
  state._ol = state._ol || {};
  let rt = state._rt || {},
    low = activeProducts().filter(
      (p) => num(p.qty) <= num(p.min || 3) || (rt[p.id] > 0 && num(p.qty) / rt[p.id] <= 7),
    ),
    gr = {};
  low.forEach((p) => {
    let s = xOrdSup(p);
    (gr[s] = gr[s] || []).push(p);
  });
  return Object.entries(gr)
    .map(([sid, ps]) => ({
      sid,
      name: sid && state.suppliers[sid] ? state.suppliers[sid].name : "Yetkazib beruvchi noma'lum",
      ps: ps.sort((a, b) => (a.name || "").localeCompare(b.name || "")),
    }))
    .sort((a, b) => !a.sid - !b.sid || a.name.localeCompare(b.name));
}
function xOrdText(gp) {
  let shop = (state.settings || {}).shopName || "Eco Aroma",
    l = gp.ps.map((p) => [p, num(state._ol[p.id] ?? xOrdNeed(p))]).filter((x) => x[1] > 0);
  return `Assalomu alaykum! ${shop} do'koni uchun buyurtma:\n\n${l.map(([p, n], i) => `${i + 1}. ${p.name} — ${n} dona`).join("\n")}\n\nJami: ${l.length} xil tovar. Rahmat!`;
}
function xOrdModal() {
  state._rt = xRates(30);
  let gs = xOrdGroups();
  state._olg = gs;
  openModal(
    "Buyurtma ro'yxati",
    gs.length
      ? `<div class="note">Kam qolgan tovarlar yetkazib beruvchilar bo'yicha ajratildi. Sonini o'zgartirib, ro'yxatni Telegramda yuboring yoki nusxa oling.</div>
 ${gs
   .map(
     (
       gp,
       k,
     ) => `<div class="panel" style="margin-top:12px"><div class="panel-h"><h2>${esc(gp.name)}</h2><span class="spacer"></span>${xSupTg(gp.sid) ? `<button class="btn sm" data-olchat="${k}" title="Yetkazib beruvchining Telegram chatini ochadi, ro'yxat nusxalanadi">\u{1F4AC} Chatini ochish</button>` : ""}<button class="btn sm" data-olcopy="${k}">\u{1F4CB} Nusxa</button><button class="btn sm primary" data-olsend="${k}">\u{1F4E4} Telegram</button></div>
 <div class="tbl-wrap"><table class="t"><thead><tr><th>Tovar</th><th class="r">Qoldiq</th><th class="r">Buyurtma</th></tr></thead><tbody>
 ${gp.ps.map((p) => `<tr><td>${esc(p.name)}</td><td class="r num">${money(p.qty)}</td><td class="r"><input class="f num" style="width:70px;text-align:right" data-olq="${esc(p.id)}" value="${state._ol[p.id] ?? xOrdNeed(p)}" inputmode="numeric"></td></tr>`).join("")}
 </tbody></table></div></div>`,
   )
   .join("")}`
      : '<div class="note">Hamma tovar yetarli — buyurtma kerak emas ✓</div>',
  );
}

/* ---------- 6–7. Hisobot qo'shimchasi ---------- */
function xRepExtra(a, b) {
  let own = isOwner(),
    S = rangeData(a, b),
    R = xRange("returns", a, b),
    X = xRange("expenses", a, b),
    sales = S.sales || [],
    rets = R.list,
    exps = X.list.filter((x) => !x.void),
    tot = sales.reduce((s, x) => s + num(x.total), 0),
    cost = sales.reduce((s, x) => s + (x.items || []).reduce((t, i) => t + num(i.cost) * num(i.qty), 0), 0),
    rAmt = rets.reduce((s, x) => s + num(x.amount), 0),
    rCost = rets.reduce((s, x) => s + (x.items || []).reduce((t, i) => t + num(i.cost) * num(i.qty), 0), 0),
    eAmt = exps.reduce((s, x) => s + num(x.amount), 0),
    net = tot - cost - (rAmt - rCost) - eAmt,
    ready = S.ready && R.ready && X.ready;
  let h = `${ready ? "" : '<div class="note" style="margin-bottom:12px">Qaytarish va xarajatlar yuklanmoqda…</div>'}<div class="kpis">
  <div class="kpi warn"><div class="k">Qaytarildi</div><div class="v num">${money(rAmt)}</div></div>
  <div class="kpi good"><div class="k">Sof savdo (qaytarishsiz)</div><div class="v num">${money(tot - rAmt)}</div></div>
  ${
    own
      ? `<div class="kpi warn"><div class="k">Xarajatlar</div><div class="v num">${money(eAmt)}</div></div>
  <div class="kpi ${net >= 0 ? "good" : "warn"}"><div class="k">Sof foyda</div><div class="v num">${xNeg(net)}</div></div>`
      : ""
  }
 </div>`;
  if (!own) return h;
  // xarajat turlari
  let bc = {};
  exps.forEach((x) => {
    bc[x.cat || "Boshqa"] = (bc[x.cat || "Boshqa"] || 0) + num(x.amount);
  });
  let bcE = Object.entries(bc).sort((x, y) => y[1] - x[1]);
  // sotuvchilar
  let pct = num((state.settings || {}).sellerPct),
    sl = {};
  sales.forEach((x) => {
    let k = x.seller || "—",
      o = (sl[k] = sl[k] || {
        n: 0,
        s: 0,
        r: 0,
      });
    o.n++;
    o.s += num(x.total);
  });
  rets.forEach((x) => {
    let s = sales.find((y) => y.id === x.saleId),
      k = (s && s.seller) || x.seller || "—",
      o = (sl[k] = sl[k] || {
        n: 0,
        s: 0,
        r: 0,
      });
    o.r += num(x.amount);
  });
  h += `<div style="margin-bottom:14px">
 <div class="panel"><div class="panel-h"><h2>Xarajatlar turi bo'yicha</h2></div><div class="panel-b" style="display:grid;gap:10px">
 ${bcE.map(([k, v]) => `<div><div style="display:flex;justify-content:space-between"><span>${esc(k)}</span><b class="num">${money(v)}</b></div><div class="bar"><i style="width:${eAmt ? Math.round((v / eAmt) * 100) : 0}%"></i></div></div>`).join("") || "<div class=\"muted\">Bu davrda xarajat yo'q. Xarajatlar \xABKassa va xarajatlar\xBB bo'limida kiritiladi.</div>"}
 </div></div></div>`;
  // oyma-oy
  let span = (b === 1 / 0 ? Date.now() : b) - a;
  if (span > 40 * 864e5 && sales.length) {
    let mm = {},
      key = (t) => {
        let d = new Date(t);
        return d.getFullYear() * 100 + d.getMonth();
      },
      M = (k) =>
        (mm[k] = mm[k] || {
          s: 0,
          c: 0,
          r: 0,
          rc: 0,
          e: 0,
          n: 0,
        });
    sales.forEach((x) => {
      let o = M(key(x.ts));
      o.s += num(x.total);
      o.n++;
      o.c += (x.items || []).reduce((t, i) => t + num(i.cost) * num(i.qty), 0);
    });
    rets.forEach((x) => {
      let o = M(key(x.ts));
      o.r += num(x.amount);
      o.rc += (x.items || []).reduce((t, i) => t + num(i.cost) * num(i.qty), 0);
    });
    exps.forEach((x) => {
      M(key(x.ts)).e += num(x.amount);
    });
    let ks = Object.keys(mm)
      .map(Number)
      .sort((x, y) => y - x);
    h += `<div class="panel" style="margin-bottom:14px"><div class="panel-h"><h2>Oyma-oy</h2></div><div class="tbl-wrap"><table class="t"><thead><tr><th>Oy</th><th class="r">Cheklar</th><th class="r">Savdo</th><th class="r">Qaytarish</th><th class="r">Yalpi foyda</th><th class="r">Xarajat</th><th class="r">Sof foyda</th></tr></thead><tbody>
  ${ks
    .map((k) => {
      let o = mm[k],
        gp = o.s - o.c - (o.r - o.rc),
        nt = gp - o.e,
        pv = mm[k % 100 === 0 ? k - 89 : k - 1],
        ch = pv && pv.s ? Math.round(((o.s - pv.s) / pv.s) * 100) : null;
      return `<tr><td>${xMon[k % 100]} ${Math.floor(k / 100)}</td><td class="r num">${o.n}</td><td class="r num">${money(o.s)}${ch == null ? "" : ` <span class="muted" style="font-size:12px">${ch >= 0 ? "▲" : "▼"}${Math.abs(ch)}%</span>`}</td><td class="r num">${money(o.r)}</td><td class="r num">${xNeg(gp)}</td><td class="r num">${money(o.e)}</td><td class="r num"><b>${xNeg(nt)}</b></td></tr>`;
    })
    .join("")}
  </tbody></table></div></div>`;
  }
  return h;
}

/* ---------- Bosh sahifa ogohlantirishi ---------- */
function xHomeWarn() {
  let ex = xExpList(!1),
    low = activeProducts().filter((p) => num(p.qty) <= num(p.min || 3)).length,
    sh = xShiftLast(),
    h = "";
  ex.length &&
    (h += `<button class="btn warn" style="width:100%;margin-bottom:12px;padding:12px" data-x="exp">⏳ ${ex.length} ta tovarning muddati yaqin yoki o'tgan — ko'rish</button>`);
  return (
    h +
    `<div class="quick" style="margin-bottom:12px"><button class="btn" data-x="order">\u{1F6D2} Buyurtma ro'yxati${low ? ` (${low})` : ""}</button><button class="btn" data-gotab="kassa">\u{1F4B5} Kassani yopish</button><button class="btn" data-x="retfind">↩ Qaytarish</button></div>`
  );
}

/* ---------- Hodisalar ---------- */
document.addEventListener(
  "click",
  async (n) => {
    let t = n.target.closest("[data-x],[data-retsale],[data-exvoid],[data-olsend],[data-olcopy]");
    if (!t) return;
    let d = t.dataset;
    if (d.retsale) {
      n.stopPropagation();
      xRetOpen(d.retsale);
      return;
    }
    if (d.exvoid) {
      if (!isOwner()) return;
      dbUpdate("expenses", d.exvoid, {
        void: !0,
        voidBy: state.seller || "",
      });
      toast("Xarajat bekor qilindi");
      return;
    }
    if (d.olsend != null || d.olcopy != null) {
      let gp = (state._olg || [])[+(d.olsend ?? d.olcopy)];
      if (!gp) return;
      let txt = xOrdText(gp);
      if (d.olsend != null) {
        window.open(
          "https://t.me/share/url?url=" + encodeURIComponent(" ") + "&text=" + encodeURIComponent(txt),
          "_blank",
        );
        return;
      }
      try {
        await navigator.clipboard.writeText(txt);
        toast("Nusxa olindi");
      } catch {
        openModal(
          "Buyurtma matni",
          `<textarea class="f" style="width:100%;min-height:220px">${esc(txt)}</textarea>`,
        );
      }
      return;
    }
    let a = d.x;
    if (a === "retfind") xRetFind();
    else if (a === "retdo") xRetDo(t);
    else if (a === "exp") xExpModal();
    else if (a === "expall") {
      state._expAll = !0;
      xExpModal();
    } else if (a === "expnear") {
      state._expAll = !1;
      xExpModal();
    } else if (a === "shclose") xShiftClose(t);
    else if (a === "exadd") xExpenseAdd(t);
    else if (a === "order") {
      state._ol = {};
      xOrdModal();
    }
  },
  !0,
);
document.addEventListener(
  "input",
  (n) => {
    let t = n.target;
    if (!t) return;
    if (t.dataset && t.dataset.retq != null) {
      let el = qsel("#retSum");
      el && (el.textContent = money(xRetCalc().amount));
      return;
    }
    if (t.id === "shCount") {
      xShiftUpd();
      return;
    }
    if (t.dataset && t.dataset.olq) {
      state._ol = state._ol || {};
      state._ol[t.dataset.olq] = t.value;
      return;
    }
  },
  !0,
);
document.addEventListener(
  "change",
  (n) => {
    let t = n.target;
    if (!t) return;
    if (t.dataset && t.dataset.iexp != null && intake && intake.lines[+t.dataset.iexp]) {
      intake.lines[+t.dataset.iexp].exp = t.value;
      return;
    }
    if (t.id === "expDays" && isOwner()) {
      dbUpdate("meta", "settings", {
        expDays: num(t.value),
      });
      state.settings.expDays = num(t.value);
      xExpModal();
      return;
    }
    if (t.id === "selPct" && isOwner()) {
      dbUpdate("meta", "settings", {
        sellerPct: Math.max(0, Math.min(100, num(t.value))),
      });
      toast("Saqlandi");
      return;
    }
  },
  !0,
);
document.addEventListener(
  "keydown",
  (n) => {
    if (n.key !== "Enter" || !n.target) return;
    if (n.target.id === "retNo") {
      n.preventDefault();
      n.stopPropagation();
      xRetByNo(n.target.value);
    }
  },
  !0,
);
/* ===== /Qo'shimcha bo'limlar ===== */

/* ===== Marketing va tahlil ===== */
/* ---------- Shtrix-kod chizish (EAN-13 / Code128) ---------- */
var xEL = [
    "0001101",
    "0011001",
    "0010011",
    "0111101",
    "0100011",
    "0110001",
    "0101111",
    "0111011",
    "0110111",
    "0001011",
  ],
  xEG = [
    "0100111",
    "0110011",
    "0011011",
    "0100001",
    "0011101",
    "0111001",
    "0000101",
    "0010001",
    "0001001",
    "0010111",
  ],
  xER = [
    "1110010",
    "1100110",
    "1101100",
    "1000010",
    "1011100",
    "1001110",
    "1010000",
    "1000100",
    "1001000",
    "1110100",
  ],
  xEP = ["LLLLLL", "LLGLGG", "LLGGLG", "LLGGGL", "LGLLGG", "LGGLLG", "LGGGLL", "LGLGLG", "LGLGGL", "LGGLGL"],
  xC128 =
    "212222 222122 222221 121223 121322 131222 122213 122312 132212 221213 221312 231212 112232 122132 122231 113222 123122 123221 223211 221132 221231 213212 223112 312131 311222 321122 321221 312212 322112 322211 212123 212321 232121 111323 131123 131321 112313 132113 132311 211313 231113 231311 112133 112331 132131 113123 113321 133121 313121 211331 231131 213113 213311 213131 311123 311321 331121 312113 312311 332111 314111 221411 431111 111224 111422 121124 121421 141122 141221 112214 112412 122114 122411 142112 142211 241211 221114 413111 241112 134111 111242 121142 121241 114212 124112 124211 411212 421112 421211 212141 214121 412121 111143 111341 131141 114113 114311 411113 411311 113141 114131 311141 411131 211412 211214 211232 2331112".split(
      " ",
    );
function xEanCheck(d12) {
  let s = 0;
  for (let i = 0; i < 12; i++) s += +d12[i] * (i % 2 ? 3 : 1);
  return (10 - (s % 10)) % 10;
}
function xEanOk(c) {
  return /^\d{13}$/.test(c) && xEanCheck(c.slice(0, 12)) === +c[12];
}
function xEanBits(c) {
  let p = xEP[+c[0]],
    b = "101";
  for (let i = 1; i < 7; i++) b += (p[i - 1] === "L" ? xEL : xEG)[+c[i]];
  b += "01010";
  for (let i = 7; i < 13; i++) b += xER[+c[i]];
  return b + "101";
}
function xC128Bits(t) {
  t = String(t).replace(/[^\x20-\x7e]/g, "");
  let v = [104],
    sum = 104;
  for (let i = 0; i < t.length; i++) {
    let k = t.charCodeAt(i) - 32;
    v.push(k);
    sum += k * (i + 1);
  }
  v.push(sum % 103, 106);
  return v
    .map((k) =>
      xC128[k]
        .split("")
        .map((w, j) => (j % 2 ? "0" : "1").repeat(+w))
        .join(""),
    )
    .join("");
}
function xBarSvg(code, h) {
  code = String(code || "");
  if (!code) return "";
  let bits = xEanOk(code) ? xEanBits(code) : xC128Bits(code),
    q = 10,
    W = bits.length + q * 2,
    r = "";
  for (let i = 0; i < bits.length;) {
    if (bits[i] === "1") {
      let j = i;
      while (bits[j] === "1") j++;
      r += `<rect x="${i + q}" y="0" width="${j - i}" height="${h || 50}"/>`;
      i = j;
    } else i++;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${h || 50}" preserveAspectRatio="none" style="width:100%;height:100%;display:block" shape-rendering="crispEdges"><rect width="${W}" height="${h || 50}" fill="#fff"/><g fill="#000">${r}</g></svg>`;
}
function xNewEan(prefix) {
  let used = new Set();
  activeProducts().forEach((p) => bcs(p).forEach((c) => used.add(c)));
  Object.values(state.certs || {}).forEach((c) => used.add(c.code));
  for (let k = 0; k < 50; k++) {
    let b = (prefix || "200") + String(Math.floor(Math.random() * 1e9)).padStart(9, "0"),
      c = b + xEanCheck(b);
    if (!used.has(c)) return c;
  }
  return "";
}

/* ---------- Aksiyalar ---------- */
var xDays = ["Yak", "Dush", "Sesh", "Chor", "Pay", "Jum", "Shan"];
function xPromos() {
  return (state.settings || {}).promos || [];
}
function xPromoActive(p, now) {
  now = now || new Date();
  if (!p || !p.on) return !1;
  let d = fmtDay(now.getTime());
  if (p.from && d < p.from) return !1;
  if (p.to && d > p.to) return !1;
  if (p.days && p.days.length && !p.days.includes(now.getDay())) return !1;
  return !0;
}
function xPromoIn(p, pid) {
  let pr = state.products[pid];
  if (!pr) return !1;
  if (p.scope === "all") return !0;
  if (p.scope === "cat") return (pr.cat || "") === p.cat;
  return (p.pids || []).includes(pid);
}
function xBdayNear(cl) {
  if (!cl || !cl.bday) return !1;
  let r = num((state.settings || {}).bdayRange ?? 3),
    t = new Date();
  t.setHours(0, 0, 0, 0);
  let [, m, d] = cl.bday.split("-").map(Number);
  if (!m || !d) return !1;
  for (let y of [t.getFullYear() - 1, t.getFullYear(), t.getFullYear() + 1]) {
    let b = new Date(y, m - 1, d);
    if (Math.abs((b - t) / 864e5) <= r) return !0;
  }
  return !1;
}
function xPromo(cart) {
  let out = {
    amt: 0,
    list: [],
  };
  if (!cart || !cart.length) return out;
  let ps = xPromos().filter((p) => xPromoActive(p)),
    av = {},
    pr = {},
    agg = {};
  cart.forEach((l) => {
    av[l.pid] = (av[l.pid] || 0) + num(l.qty);
    pr[l.pid] = num(l.price);
  });
  let add = (nm, v) => {
    v = Math.round(v);
    if (v > 0) {
      agg[nm] = (agg[nm] || 0) + v;
    }
  };
  ps.filter((p) => p.type === "set" && (p.pids || []).length > 1).forEach((p) => {
    let k = Math.min(...p.pids.map((id) => Math.floor(av[id] || 0)));
    if (k <= 0) return;
    let full = p.pids.reduce((s, id) => s + (pr[id] || 0), 0) * k,
      d = full - num(p.price) * k;
    if (d > 0) {
      add(p.name, d);
      p.pids.forEach((id) => (av[id] -= k));
    }
  });
  let cl = state.cartClient ? state.clients[state.cartClient] : null,
    bp = num((state.settings || {}).bdayPct),
    bd = bp > 0 && xBdayNear(cl),
    of = xOffer(cl);
  Object.keys(av).forEach((pid) => {
    let a = av[pid],
      price = pr[pid] || 0;
    if (a <= 0) return;
    let best = 0,
      bn = "";
    ps.forEach((p) => {
      if (!xPromoIn(p, pid)) return;
      let d =
        p.type === "pct"
          ? (a * price * Math.min(100, num(p.pct))) / 100
          : p.type === "nx" && num(p.n) > 0
            ? Math.floor(a / (num(p.n) + 1)) * price
            : 0;
      d > best && ((best = d), (bn = p.name));
    });
    if (bd) {
      let d = (a * price * bp) / 100;
      d > best && ((best = d), (bn = "\u{1F382} Tug'ilgan kun " + bp + "%"));
    }
    if (of) {
      let d = (a * price * num(of.pct)) / 100;
      d > best && ((best = d), (bn = xOfferTag + " " + num(of.pct) + "%"));
    }
    best > 0 && add(bn, best);
  });
  out.list = Object.entries(agg).map(([name, amt]) => ({
    name,
    amt,
  }));
  out.amt = out.list.reduce((s, x) => s + x.amt, 0);
  return out;
}
function xPromoCartHtml(t) {
  let p = t && t.promo;
  if (!p || !p.list.length) return "";
  return p.list
    .map(
      (x) =>
        `<div class="r"><span style="color:var(--ok);font-weight:600">\u{1F381} ${esc(x.name)}</span><span class="num" style="color:var(--ok)">−${money(x.amt)}</span></div>`,
    )
    .join("");
}
function xPromoDesc(p) {
  let w =
      p.type === "pct"
        ? `${num(p.pct)}% chegirma`
        : p.type === "nx"
          ? `${num(p.n)} ta olsa, ${num(p.n) + 1}-si sovg'a`
          : `To'plam: ${money(p.price)} so'm`,
    s =
      p.type === "set"
        ? (p.pids || []).map((id) => (state.products[id] || {}).name || "?").join(" + ")
        : p.scope === "all"
          ? "hamma tovarlar"
          : p.scope === "cat"
            ? `\xAB${p.cat}\xBB toifasi`
            : `${(p.pids || []).length} ta tovar`,
    d = [
      p.from || p.to
        ? `${p.from ? p.from.split("-").reverse().join(".") : "…"} — ${p.to ? p.to.split("-").reverse().join(".") : "…"}`
        : "muddatsiz",
      p.days && p.days.length ? p.days.map((i) => xDays[i]).join(", ") : "",
    ]
      .filter(Boolean)
      .join(" \xB7 ");
  return `${w} \xB7 ${s} \xB7 ${d}`;
}
function xPromoEdit(i, preset) {
  let p =
    i >= 0
      ? JSON.parse(JSON.stringify(xPromos()[i]))
      : Object.assign(
          {
            id: newId(),
            name: "",
            type: "pct",
            pct: 10,
            n: 2,
            price: 0,
            scope: "pids",
            cat: "",
            pids: [],
            from: "",
            to: "",
            days: [],
            on: !0,
          },
          preset || {},
        );
  state._pe = {
    i,
    p,
  };
  xPromoDraw();
}
function xPromoDraw() {
  let { p } = state._pe,
    cats = [
      ...new Set(
        activeProducts()
          .map((x) => x.cat || "")
          .filter(Boolean),
      ),
    ].sort(),
    qq = (state._peQ || "").toLowerCase(),
    plist = activeProducts()
      .filter((x) => !qq || (x.name || "").toLowerCase().includes(qq) || bcs(x).some((b) => b.includes(qq)))
      .slice(0, 60),
    showP = p.type === "set" || p.scope === "pids";
  openModal(
    state._pe.i >= 0 ? "Aksiyani tahrirlash" : "Yangi aksiya",
    `<div class="fg">
  <label class="l" for="peName" style="grid-column:1/-1">Nomi (chekda va kassada ko'rinadi)<input id="peName" class="f" value="${esc(p.name)}" placeholder="Masalan: Kuzgi chegirma"></label>
  <label class="l" for="peType">Turi<select id="peType" class="f"><option value="pct" ${p.type === "pct" ? "selected" : ""}>Foizli chegirma</option><option value="nx" ${p.type === "nx" ? "selected" : ""}>N ta olsa, bittasi sovg'a (2+1)</option><option value="set" ${p.type === "set" ? "selected" : ""}>To'plam (set) narxi</option></select></label>
  ${p.type === "pct" ? `<label class="l" for="pePct">Chegirma (%)<input id="pePct" class="f num" value="${num(p.pct)}" inputmode="decimal"></label>` : p.type === "nx" ? `<label class="l" for="peN">Nechta olsa (2 bo'lsa — 3-si sovg'a)<input id="peN" class="f num" value="${num(p.n)}" inputmode="numeric"></label>` : `<label class="l" for="pePrice">To'plam narxi (so'm)<input id="pePrice" class="f num" value="${num(p.price) || ""}" inputmode="numeric"></label>`}
  ${p.type !== "set" ? `<label class="l" for="peScope">Qaysi tovarlarga<select id="peScope" class="f"><option value="all" ${p.scope === "all" ? "selected" : ""}>Hamma tovarlar</option><option value="cat" ${p.scope === "cat" ? "selected" : ""}>Bitta toifa</option><option value="pids" ${p.scope === "pids" ? "selected" : ""}>Tanlangan tovarlar</option></select></label>` : ""}
  ${p.type !== "set" && p.scope === "cat" ? `<label class="l" for="peCat">Toifa<select id="peCat" class="f">${cats.map((c) => `<option ${c === p.cat ? "selected" : ""}>${esc(c)}</option>`).join("")}</select></label>` : ""}
  <label class="l" for="peFrom">Boshlanishi<input id="peFrom" type="date" class="f" value="${esc(p.from)}"></label>
  <label class="l" for="peTo">Tugashi<input id="peTo" type="date" class="f" value="${esc(p.to)}"></label>
  <div style="grid-column:1/-1"><div class="l">Hafta kunlari (hech biri belgilanmasa — har kuni)</div><div class="chips" style="margin-top:6px">${xDays.map((d, i) => `<button type="button" data-peday="${i}" aria-pressed="${(p.days || []).includes(i)}">${d}</button>`).join("")}</div></div>
 </div>
 ${
   showP
     ? `<div style="margin-top:12px"><div class="l">${p.type === "set" ? "To'plamga kiradigan tovarlar (har biridan 1 dona)" : "Tovarlar"} \xB7 tanlandi: <b>${(p.pids || []).length}</b></div>
 ${(p.pids || []).length ? `<div style="display:flex;gap:6px;flex-wrap:wrap;margin:6px 0">${p.pids.map((id) => `<span class="pill">${esc((state.products[id] || {}).name || "?")} <button type="button" class="btn sm" style="padding:0 6px;min-height:0" data-pepid="${esc(id)}">\xD7</button></span>`).join("")}</div>` : ""}
 <input id="peQ" class="f" placeholder="Tovar qidirish yoki skanerlash…" value="${esc(state._peQ || "")}" autocomplete="off">
 <div class="tbl-wrap" style="max-height:30vh;margin-top:6px"><table class="t"><tbody>${plist.map((x) => `<tr class="click" data-pepid="${esc(x.id)}"><td>${(p.pids || []).includes(x.id) ? "✅" : "⬜"} ${esc(x.name)}</td><td class="r num">${money(x.price)}</td></tr>`).join("")}</tbody></table></div></div>`
     : ""
 }
 ${p.type === "set" && (p.pids || []).length ? `<div class="note" style="margin-top:8px">Alohida narxi: <b>${money(p.pids.reduce((s, id) => s + num((state.products[id] || {}).price), 0))}</b> so'm → to'plam: <b>${money(p.price)}</b> so'm</div>` : ""}`,
    `${state._pe.i >= 0 ? '<button class="btn danger" data-x="pedel">O\'chirish</button><span class="spacer"></span>' : ""}<button class="btn" data-close="x">Bekor qilish</button><button class="btn primary" data-x="pesave">Saqlash</button>`,
  );
  let qf = qsel("#peQ");
  qf && state._peFocus && (qf.focus(), qf.setSelectionRange(qf.value.length, qf.value.length));
}
function xPeRead() {
  let p = state._pe.p,
    v = (id) => (qsel("#" + id) || {}).value;
  v("peName") != null && (p.name = v("peName").trim());
  v("peType") && (p.type = v("peType"));
  v("pePct") != null && (p.pct = num(v("pePct")));
  v("peN") != null && (p.n = num(v("peN")));
  v("pePrice") != null && (p.price = num(v("pePrice")));
  v("peScope") && (p.scope = v("peScope"));
  v("peCat") != null && (p.cat = v("peCat"));
  p.from = v("peFrom") || "";
  p.to = v("peTo") || "";
}
async function xPromoSave() {
  xPeRead();
  let { i, p } = state._pe;
  if (!p.name) {
    toast("Aksiya nomini yozing");
    return;
  }
  if (p.type === "set" && (p.pids || []).length < 2) {
    toast("To'plamga kamida 2 ta tovar tanlang");
    return;
  }
  if (p.type === "set" && !num(p.price)) {
    toast("To'plam narxini yozing");
    return;
  }
  if (p.type !== "set" && p.scope === "pids" && !(p.pids || []).length) {
    toast("Tovarlarni tanlang");
    return;
  }
  let l = xPromos().slice();
  i >= 0 ? (l[i] = p) : l.push(p);
  state.settings.promos = l;
  await dbUpdate("meta", "settings", {
    promos: l,
  });
  state._pe = null;
  state._peQ = "";
  closeModal();
  toast("Aksiya saqlandi");
  render();
}

/* ---------- Sovg'a sertifikati ---------- */
function xCertAmt() {
  let c = state.pay && state.pay.cert && (state.certs || {})[state.pay.cert];
  return c ? Math.max(0, num(c.balance)) : 0;
}
function xCertFind(code) {
  code = String(code || "").trim();
  return Object.values(state.certs || {}).find((c) => c.code === code);
}
function xCertApply(code, quiet) {
  let c = xCertFind(code);
  if (!c) {
    quiet || toast("Bunday sertifikat topilmadi");
    return !1;
  }
  if (num(c.balance) <= 0) {
    toast("Sertifikat ishlatib bo'lingan");
    return !0;
  }
  if (c.until && fmtDay(Date.now()) > c.until) {
    toast("Sertifikat muddati o'tgan");
    return !0;
  }
  state.pay = Object.assign({}, state.pay, {
    cert: c.id,
  });
  closeModal();
  toast(`Sertifikat qo'shildi \xB7 ${money(c.balance)} so'm`);
  render();
  return !0;
}
function xCertScan(code) {
  return /^\d{13}$/.test(String(code)) && !!xCertFind(code) && xCertApply(code, !0);
}
function xCertPayHtml(t) {
  let c = state.pay && state.pay.cert && (state.certs || {})[state.pay.cert];
  if (c)
    return `<div style="grid-column:1/-1;display:flex;gap:8px;align-items:center" class="note">\u{1F39F} Sertifikat <b class="num">${esc(c.code)}</b>: −${money(t.cert)} <span class="muted">(bor: ${money(c.balance)})</span><span class="spacer"></span><button class="btn sm" data-x="certoff">Olib tashlash</button></div>`;
  return state.cart && state.cart.length
    ? '<button class="btn sm" data-x="certpay" style="grid-column:1/-1">\u{1F39F} Sovg\'a sertifikati bilan to\'lash</button>'
    : "";
}
async function xAfterSale(r, id) {
  if (num(r.cert) > 0 && r.certId) {
    await dbUpdate("certs", r.certId, {
      balance: incBy(-num(r.cert)),
      lastUse: Date.now(),
    });
    await dbSet("certUses", newId(), {
      certId: r.certId,
      saleId: id,
      saleNo: r.no,
      amount: num(r.cert),
      ts: Date.now(),
      seller: state.seller || "",
    });
  }
  r.clientId &&
    (await dbUpdate("clients", r.clientId, {
      lastTs: r.ts,
      spent: incBy(num(r.total)),
      ...((r.promos || []).some((p) => String(p.name || "").startsWith(xOfferTag))
        ? {
            offer: null,
          }
        : {}),
    }));
}
function xCertSell() {
  openModal(
    "Sovg'a sertifikati sotish",
    `<div class="fg">
  <label class="l" for="ceAmt">Summa (so'm)<input id="ceAmt" class="f num" inputmode="numeric" placeholder="100 000"></label>
  <label class="l" for="cePay">To'lov<select id="cePay" class="f"><option value="cash">Naqd</option><option value="card">Karta / Click</option></select></label>
  <label class="l" for="ceWho">Kim uchun (ixtiyoriy)<input id="ceWho" class="f" placeholder="Ism"></label>
  <label class="l" for="ceUntil">Amal qilish muddati<input id="ceUntil" type="date" class="f" value="${fmtDay(Date.now() + 365 * 864e5)}"></label>
 </div><div class="chips" style="margin-top:10px">${[50000, 100000, 200000, 300000, 500000].map((v) => `<button type="button" data-ceamt="${v}">${money(v)}</button>`).join("")}</div>`,
    '<button class="btn" data-close="x">Bekor qilish</button><button class="btn primary" data-x="cedo">Sotish va chop etish</button>',
  );
}
async function xCertDo(btn) {
  let a = num((qsel("#ceAmt") || {}).value);
  if (a <= 0) {
    toast("Summani yozing");
    return;
  }
  let code = xNewEan("290");
  if (!code) {
    toast("Kod yaratib bo'lmadi");
    return;
  }
  btn && (btn.disabled = !0);
  let id = newId(),
    c = {
      code,
      amount: a,
      balance: a,
      ts: Date.now(),
      pay: (qsel("#cePay") || {}).value || "cash",
      who: ((qsel("#ceWho") || {}).value || "").trim(),
      until: (qsel("#ceUntil") || {}).value || "",
      seller: state.seller || "",
    };
  await dbSet("certs", id, c);
  state.certs = Object.assign({}, state.certs, {
    [id]: {
      id,
      ...c,
    },
  });
  closeModal();
  toast("Sertifikat sotildi");
  xCertPrint(id);
}
function xCertPrint(id) {
  let c = (state.certs || {})[id];
  if (!c) return;
  let shop = (state.settings || {}).shopName || "Eco Aroma",
    logo = (state.settings || {}).theme && state.settings.theme.logo;
  xPrintHtml(`<style>@page{size:100mm 65mm;margin:0}body{margin:0;font-family:Arial,sans-serif}.c{width:100mm;height:65mm;box-sizing:border-box;padding:5mm 6mm;border:1.5mm solid #2f6b4f;display:flex;flex-direction:column;justify-content:space-between}.t{font-size:13pt;font-weight:700;color:#2f6b4f}.a{font-size:24pt;font-weight:800}.s{font-size:9pt;color:#444}.b{height:13mm}</style>
 <div class="c"><div style="display:flex;justify-content:space-between;align-items:center"><div><div class="t">${esc(shop)}</div><div class="s">SOVG'A SERTIFIKATI</div></div>${logo ? `<img src="${logo}" style="height:14mm">` : ""}</div>
 <div class="a">${money(c.amount)} so'm</div>
 <div class="s">${c.who ? `Kimga: <b>${esc(c.who)}</b> \xB7 ` : ""}${c.until ? "Amal qiladi: " + c.until.split("-").reverse().join(".") + " gacha" : ""}</div>
 <div><div class="b">${xBarSvg(c.code, 40)}</div><div class="s" style="text-align:center;letter-spacing:2px">${esc(c.code)}</div></div></div>`);
}

/* ---------- Chop etish (yorliq, sertifikat) ---------- */
function xPrintHtml(body) {
  let f = document.createElement("iframe");
  f.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0";
  document.body.appendChild(f);
  let d = f.contentWindow.document;
  d.open();
  d.write(
    `<!doctype html><html><head><meta charset="utf-8"><title>Chop etish</title></head><body>${body}</body></html>`,
  );
  d.close();
  setTimeout(() => {
    try {
      f.contentWindow.focus();
      f.contentWindow.print();
    } catch (e) {
      console.error(e);
    }
    setTimeout(() => f.remove(), 60000);
  }, 400);
}
var xLblSizes = {
  "58x40": [58, 40],
  "40x30": [40, 30],
  "30x20": [30, 20],
  A4: [0, 0],
};
function xLabelModal() {
  state._lb = state._lb || {
    items: {},
    size: (state.settings || {}).lblSize || "40x30",
    price: !0,
    name: !0,
  };
  state._lb.kind = state._lb.kind || xLblCfg().kind;
  let L = state._lb,
    lc = xLblCfg(),
    qq = (state._lbQ || "").toLowerCase(),
    list = activeProducts()
      .filter((x) => !qq || (x.name || "").toLowerCase().includes(qq) || bcs(x).some((b) => b.includes(qq)))
      .slice(0, 80),
    sel = Object.entries(L.items).filter(([id, n]) => n > 0 && state.products[id]),
    noBc = activeProducts().filter((p) => !bcs(p).length).length;
  openModal(
    "Yorliq va shtrix-kod chop etish",
    `<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
  <label class="l" for="lbSize" style="margin:0">Yorliq o'lchami<select id="lbSize" class="f">${Object.keys(
    xLblSizes,
  )
    .map(
      (k) =>
        `<option value="${k}" ${k === L.size ? "selected" : ""}>${k === "A4" ? "A4 varaq (oddiy printer)" : k.replace("x", "\xD7") + " mm"}</option>`,
    )
    .join("")}</select></label>
  <label class="l" for="lbKind" style="margin:0">Kod turi<select id="lbKind" class="f">${Object.entries(
    xLblKinds,
  )
    .map(([k, v]) => `<option value="${k}" ${k === L.kind ? "selected" : ""}>${v}</option>`)
    .join("")}</select></label>
  <label style="display:flex;gap:6px;align-items:center"><input type="checkbox" id="lbName" ${L.name ? "checked" : ""}> Nomi</label>
  <label style="display:flex;gap:6px;align-items:center"><input type="checkbox" id="lbPrice" ${L.price ? "checked" : ""}> Narxi</label>
  <span class="spacer"></span><button class="btn sm" data-x="lball">Qoldiq bo'yicha hammasi</button></div>
 ${isOwner() && noBc ? `<div class="note" style="margin-top:10px">${noBc} ta tovarda shtrix-kod yo'q. <button class="btn sm" data-x="lbgen">Ularga shtrix-kod yaratish</button></div>` : ""}
 <input id="lbQ" class="f" style="margin-top:10px" placeholder="Tovar qidirish yoki skanerlash…" value="${esc(state._lbQ || "")}" autocomplete="off">
 <div class="tbl-wrap" style="max-height:40vh;margin-top:6px"><table class="t"><thead><tr><th>Tovar</th><th>Shtrix-kod</th><th class="r">Narx</th><th class="r">Nechta yorliq</th></tr></thead><tbody>
 ${list.map((x) => `<tr><td>${esc(x.name)}</td><td class="num muted">${esc(bcs(x)[0] || "—")}</td><td class="r num">${money(x.price)}</td><td class="r"><input class="f num" style="width:64px;text-align:right" data-lbn="${esc(x.id)}" value="${L.items[x.id] || ""}" placeholder="0" inputmode="numeric"></td></tr>`).join("")}
 </tbody></table></div>
 <div class="note" style="margin-top:8px">Tanlandi: <b>${sel.length}</b> xil tovar, <b>${sel.reduce((s, x) => s + num(x[1]), 0)}</b> ta yorliq. ${L.size === "A4" ? "A4 varaqqa oddiy printer orqali chiqadi." : lc.method === "qz" && lc.printer ? `Printer: <b>${esc(lc.printer)}</b> (oynasiz chiqadi).` : `Chop etish oynasi ochiladi. Alohida yorliq printerini ulash: Sozlamalar \u2192 \xABYorliq printeri\xBB.`}</div>`,
    '<button class="btn" data-x="lbclear">Tozalash</button><span class="spacer"></span><button class="btn" data-close="x">Yopish</button><button class="btn primary" data-x="lbprint">\u{1F5A8} Chop etish</button>',
  );
  let qf = qsel("#lbQ");
  qf && state._lbFocus && (qf.focus(), qf.setSelectionRange(qf.value.length, qf.value.length));
}
async function xLabelGen() {
  if (!isOwner()) return;
  let l = activeProducts().filter((p) => !bcs(p).length),
    n = 0;
  for (let p of l) {
    let c = xNewEan("200");
    if (!c) continue;
    p.barcode = c;
    await dbUpdate("products", p.id, {
      barcode: c,
    });
    state._lb.items[p.id] = Math.max(1, Math.ceil(num(p.qty)));
    n++;
  }
  toast(`${n} ta tovarga shtrix-kod berildi \xB7 yorliq soni qoldiq bo'yicha yozildi`);
  xLabelModal();
}

/* ===== Yorliq printeri (QZ Tray) va avtomatik kod ===== */
// Har bir kompyuterning o'z sozlamasi (printer nomi har kompyuterda boshqa bo'ladi)
function xLblCfg() {
  return Object.assign(
    {
      method: "dialog",
      printer: "",
      dpi: 203,
      kind: "bar",
      rot: 0,
    },
    store.get("eco.lblPrinter", {}),
  );
}
function xLblSet(p) {
  store.set("eco.lblPrinter", Object.assign(xLblCfg(), p));
}
var xLblKinds = {
  bar: "Shtrix-kod",
  qr: "QR kod",
  both: "Shtrix-kod + QR",
};
function xOwnCode(c) {
  return /^2[0-8]\d{11}$/.test(String(c || ""));
}
function xLoadJs(src) {
  state._js = state._js || {};
  return (
    state._js[src] ||
    (state._js[src] = new Promise((ok, no) => {
      let s = document.createElement("script");
      s.src = src;
      s.onload = ok;
      s.onerror = () => {
        delete state._js[src];
        no(new Error("Yuklanmadi: " + src));
      };
      document.head.appendChild(s);
    }))
  );
}

/* --- Yorliqni rasm (canvas) qilib chizish: printerga aniq nuqtama-nuqta chiqadi --- */
function xWrap(x, text, maxW, maxLines) {
  let words = String(text || "")
      .split(/\s+/)
      .filter(Boolean),
    lines = [],
    cur = "";
  for (let w of words) {
    let t = cur ? cur + " " + w : w;
    if (x.measureText(t).width <= maxW || !cur) cur = t;
    else {
      lines.push(cur);
      cur = w;
    }
  }
  cur && lines.push(cur);
  if (lines.length > maxLines) {
    lines = lines.slice(0, maxLines);
    let l = lines[maxLines - 1];
    while (l.length > 1 && x.measureText(l + "…").width > maxW) l = l.slice(0, -1);
    lines[maxLines - 1] = l + "…";
  }
  return lines.map((l) => {
    while (l.length > 1 && x.measureText(l).width > maxW) l = l.slice(0, -1);
    return l;
  });
}
function xDrawBars(x, bits, X, Y, Wd, Hd) {
  let m = Math.max(1, Math.floor(Wd / (bits.length + 8))),
    tot = bits.length * m,
    x0 = Math.round(X + (Wd - tot) / 2);
  for (let i = 0; i < bits.length;) {
    if (bits[i] === "1") {
      let j = i;
      while (bits[j] === "1") j++;
      x.fillRect(x0 + i * m, Math.round(Y), (j - i) * m, Math.round(Hd));
      i = j;
    } else i++;
  }
  return m;
}
function xDrawQr(x, code, X, Y, S) {
  if (typeof qrcode !== "function") return 0;
  let q = qrcode(0, "M");
  q.addData(String(code), /^\d+$/.test(code) ? "Numeric" : "Byte");
  q.make();
  let n = q.getModuleCount(),
    m = Math.max(1, Math.floor(S / (n + 2))),
    sz = n * m,
    x0 = Math.round(X + (S - sz) / 2),
    y0 = Math.round(Y + (S - sz) / 2);
  for (let r = 0; r < n; r++)
    for (let c = 0; c < n; c++) q.isDark(r, c) && x.fillRect(x0 + c * m, y0 + r * m, m, m);
  return sz;
}
function xLblCanvas(p, o) {
  let k = (o.dpi || 203) / 25.4,
    W = Math.round(o.w * k),
    H = Math.round(o.h * k),
    cv = document.createElement("canvas");
  cv.width = W;
  cv.height = H;
  let x = cv.getContext("2d");
  x.fillStyle = "#fff";
  x.fillRect(0, 0, W, H);
  x.fillStyle = "#000";
  x.textBaseline = "top";
  let code = bcs(p)[0] || "",
    kind = code ? o.kind || "bar" : "none",
    pad = Math.round(1.2 * k),
    L = pad,
    R = W - pad,
    T = pad,
    B = H - pad,
    font = (px, b) => (x.font = `${b ? "bold " : ""}${Math.round(px)}px Arial, sans-serif`),
    isEan = code && xEanOk(code),
    bits = code ? (isEan ? xEanBits(code) : xC128Bits(code)) : "";
  let botH = 0;
  if (kind === "both") {
    botH = Math.round((B - T) * 0.36);
    let S = Math.min(B - T - botH - pad, Math.round((R - L) * 0.4));
    xDrawQr(x, code, L, T, S);
    L += S + pad;
  }
  if (kind === "qr") {
    let S = Math.min(B - T, Math.round((R - L) * 0.48));
    xDrawQr(x, code, L, T + (B - T - S) / 2, S);
    L += S + pad;
  }
  let cw = R - L,
    nameFs = Math.max(14, H * 0.105),
    priceFs = Math.max(18, H * 0.17),
    codeFs = Math.max(12, H * 0.075),
    y = T;
  if (o.name) {
    font(nameFs, 1);
    let ls = xWrap(x, p.name, cw, kind === "qr" ? 3 : 2);
    ls.forEach((l) => {
      x.fillText(l, L, y);
      y += nameFs * 1.12;
    });
  }
  if (o.price) {
    let pr = money(p.price),
      fit = (f) => {
        font(f, 1);
        let a = x.measureText(pr + " ").width;
        font(f * 0.5, 1);
        return a + x.measureText("so'm").width;
      };
    while (fit(priceFs) > cw && priceFs > 10) priceFs *= 0.94;
    let som = fit(priceFs) <= cw;
    font(priceFs, 1);
    x.fillText(pr, L, y);
    if (som) {
      let pw = x.measureText(pr + " ").width;
      font(priceFs * 0.5, 1);
      x.fillText("so'm", L + pw, y + priceFs * 0.42);
    }
    y += priceFs * 1.1;
  }
  if (kind === "none") {
    font(codeFs);
    x.fillText(o.shop || "", L, B - codeFs);
    return cv;
  }
  font(codeFs);
  let cy = B - codeFs;
  if (kind === "qr") {
    x.textAlign = "left";
    x.fillText(code, L, cy);
    return cv;
  }
  if (kind === "both") {
    let X0 = pad,
      Wf = W - 2 * pad,
      by = B - botH;
    xDrawBars(x, bits, X0, by, Wf, botH - codeFs - Math.round(0.3 * k));
    x.textAlign = "center";
    x.fillText(code, X0 + Wf / 2, cy);
    x.textAlign = "left";
    return cv;
  }
  let bh = cy - y - Math.round(0.6 * k);
  if (bh < (6 * k) / 2) bh = Math.max(10, cy - y - 2);
  xDrawBars(x, bits, L, y, cw, bh);
  x.textAlign = "center";
  x.fillText(code, L + cw / 2, cy);
  x.textAlign = "left";
  return cv;
}
async function xLblImages(sel, L) {
  if (L.kind && L.kind !== "bar") {
    try {
      await xLoadJs("qrcode.js");
    } catch (e) {
      toast("QR kutubxonasi yuklanmadi — internetni tekshiring");
      throw e;
    }
  }
  let a4 = L.size === "A4",
    [w, h] = a4 ? [48, 30] : xLblSizes[L.size] || [40, 30],
    c = xLblCfg(),
    shop = (state.settings || {}).shopName || "";
  return sel.map(([id, n]) => {
    let p = state.products[id];
    return {
      p,
      n: Math.min(500, Math.max(1, Math.round(num(n)))),
      w,
      h,
      url: xLblCanvas(p, {
        w,
        h,
        dpi: a4 ? 300 : c.dpi,
        kind: L.kind,
        name: L.name,
        price: L.price,
        shop,
      }).toDataURL("image/png"),
    };
  });
}

/* --- Chop etish: alohida printer (QZ Tray) yoki oddiy oyna --- */
async function xLabelPrint() {
  let L = state._lb,
    sel = Object.entries(L.items).filter(([id, n]) => num(n) > 0 && state.products[id]);
  if (!sel.length) {
    toast("Yorliq sonini yozing");
    return;
  }
  L.kind = L.kind || xLblCfg().kind;
  let imgs;
  try {
    imgs = await xLblImages(sel, L);
  } catch (e) {
    console.error(e);
    return;
  }
  let c = xLblCfg(),
    a4 = L.size === "A4";
  if (c.method === "qz" && !a4) {
    if (!c.printer) {
      toast("Avval Sozlamalar → «Yorliq printeri» bo'limida printerni tanlang");
      return;
    }
    let btn = qsel('[data-x="lbprint"]');
    btn && ((btn.disabled = !0), (btn.textContent = "Chop etilmoqda…"));
    try {
      let qz = await xQz(),
        tot = 0;
      for (let im of imgs) {
        let cfg = qz.configs.create(c.printer, {
          size: {
            width: im.w,
            height: im.h,
          },
          units: "mm",
          margins: 0,
          copies: im.n,
          colorType: "blackwhite",
          density: c.dpi / 25.4,
          interpolation: "nearest-neighbor",
          scaleContent: !0,
          rotation: +c.rot || 0,
        });
        await qz.print(cfg, [
          {
            type: "pixel",
            format: "image",
            flavor: "base64",
            data: im.url.split(",")[1],
          },
        ]);
        tot += im.n;
      }
      toast(`${tot} ta yorliq «${c.printer}» printeriga yuborildi`);
    } catch (e) {
      console.error(e);
      toast(xQzErr(e));
    }
    btn && ((btn.disabled = !1), (btn.textContent = "\u{1F5A8} Chop etish"));
    return;
  }
  let W = imgs[0].w,
    H = imgs[0].h,
    size = xLblSizes[L.size] || [40, 30];
  xPrintHtml(`<style>@page{${a4 ? "size:A4;margin:8mm" : `size:${size[0]}mm ${size[1]}mm;margin:0`}}body{margin:0}${a4 ? ".wrap{display:flex;flex-wrap:wrap;gap:2mm}" : ""}
 img{width:${W}mm;height:${H}mm;display:block;image-rendering:pixelated;${a4 ? "outline:0.2mm dashed #bbb;" : "page-break-after:always;"}}</style>
 <div class="wrap">${imgs.map((im) => Array(im.n).fill(`<img src="${im.url}">`).join("")).join("")}</div>`);
}

/* --- QZ Tray bilan ulanish --- */
function xQzErr(e) {
  let m = String((e && e.message) || e || "");
  if (/Unable to establish|websocket|connect/i.test(m))
    return "QZ Tray ishlamayapti. Kompyuterda QZ Tray dasturini oching (soat yonidagi yashil belgi).";
  if (/Request blocked|rejected|denied/i.test(m)) return "QZ Tray ruxsat bermadi — oynada «Allow» ni bosing.";
  if (/printer/i.test(m)) return "Printer topilmadi: " + m;
  return "Chop etishda xato: " + m;
}
async function xQz() {
  await xLoadJs("qz-tray.js");
  let qz = window.qz;
  if (!state._qzInit) {
    qz.api.setPromiseType((r) => new Promise(r));
    qz.security.setSignatureAlgorithm("SHA512");
    qz.security.setCertificatePromise((res) => {
      xQzCert()
        .then((c) => res((c && c.pem) || undefined))
        .catch(() => res());
    });
    qz.security.setSignaturePromise((toSign) => (res) => {
      xQzCert()
        .then(async (c) => {
          if (!c || !c.key) return res();
          let s = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", c.key, new TextEncoder().encode(toSign));
          res(xB64(s));
        })
        .catch(() => res());
    });
    state._qzInit = 1;
  }
  if (!qz.websocket.isActive())
    await qz.websocket.connect({
      retries: 2,
      delay: 1,
    });
  return qz;
}
async function xQzPrinters() {
  let qz = await xQz(),
    l = await qz.printers.find();
  return Array.isArray(l) ? l : [l];
}

/* --- Bir martalik ruxsat sertifikati: kalit shu kompyuterda yaratiladi va tashqariga chiqmaydi --- */
function xB64(buf) {
  let b = new Uint8Array(buf),
    s = "";
  for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
  return btoa(s);
}
function xIdb() {
  return new Promise((ok, no) => {
    let r = indexedDB.open("eco-qz", 1);
    r.onupgradeneeded = () => r.result.createObjectStore("k");
    r.onsuccess = () => ok(r.result);
    r.onerror = () => no(r.error);
  });
}
async function xIdbGet(k) {
  let d = await xIdb();
  return new Promise((ok, no) => {
    let r = d.transaction("k").objectStore("k").get(k);
    r.onsuccess = () => ok(r.result);
    r.onerror = () => no(r.error);
  });
}
async function xIdbPut(k, v) {
  let d = await xIdb();
  return new Promise((ok, no) => {
    let t = d.transaction("k", "readwrite");
    t.objectStore("k").put(v, k);
    t.oncomplete = () => ok();
    t.onerror = () => no(t.error);
  });
}
async function xQzCert(make) {
  if (state._qzCert) return state._qzCert;
  let c = await xIdbGet("cert").catch(() => null);
  if (!c && make) {
    c = await xMakeCert();
    await xIdbPut("cert", c);
  }
  return c && (state._qzCert = c);
}
var xDer = {
  tl(t, b) {
    let n = b.length,
      l;
    if (n < 128) l = [n];
    else {
      l = [];
      while (n) {
        l.unshift(n & 255);
        n >>= 8;
      }
      l.unshift(0x80 | l.length);
    }
    return [t, ...l, ...b];
  },
  seq(...a) {
    return xDer.tl(0x30, a.flat());
  },
  set(...a) {
    return xDer.tl(0x31, a.flat());
  },
  int(b) {
    b = [...b];
    while (b.length > 1 && b[0] === 0 && !(b[1] & 0x80)) b.shift();
    if (b[0] & 0x80) b.unshift(0);
    return xDer.tl(2, b);
  },
  oid(s) {
    let p = s.split(".").map(Number),
      o = [40 * p[0] + p[1]];
    for (let v of p.slice(2)) {
      let t = [v & 127];
      v = Math.floor(v / 128);
      while (v) {
        t.unshift((v & 127) | 128);
        v = Math.floor(v / 128);
      }
      o.push(...t);
    }
    return xDer.tl(6, o);
  },
  utf8(s) {
    return xDer.tl(0x0c, [...new TextEncoder().encode(s)]);
  },
  time(d) {
    let z = (n) => String(n).padStart(2, "0"),
      s =
        z(d.getUTCFullYear() % 100) +
        z(d.getUTCMonth() + 1) +
        z(d.getUTCDate()) +
        z(d.getUTCHours()) +
        z(d.getUTCMinutes()) +
        z(d.getUTCSeconds()) +
        "Z";
    return xDer.tl(
      0x17,
      [...s].map((c) => c.charCodeAt(0)),
    );
  },
  oct(b) {
    return xDer.tl(4, b);
  },
  bit(b) {
    return xDer.tl(3, [0, ...b]);
  },
};
async function xMakeCert() {
  let D = xDer,
    kp = await crypto.subtle.generateKey(
      {
        name: "RSASSA-PKCS1-v1_5",
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: "SHA-512",
      },
      !1,
      ["sign", "verify"],
    ),
    spki = [...new Uint8Array(await crypto.subtle.exportKey("spki", kp.publicKey))],
    shop = ((state.settings || {}).shopName || "Eco Aroma").slice(0, 60),
    name = D.seq(
      D.set(D.seq(D.oid("2.5.4.3"), D.utf8("Eco Kassa"))),
      D.set(D.seq(D.oid("2.5.4.10"), D.utf8(shop))),
      D.set(D.seq(D.oid("2.5.4.11"), D.utf8("kamoliddintursunbiyev-web.github.io"))),
    ),
    alg = D.seq(D.oid("1.2.840.113549.1.1.13"), [5, 0]),
    ser = [...crypto.getRandomValues(new Uint8Array(16))];
  ser[0] &= 0x7f;
  ser[0] |= 1;
  let now = new Date(),
    from = new Date(now.getTime() - 864e5),
    to = new Date(now.getTime() + 20 * 365 * 864e5),
    ext = D.tl(
      0xa3,
      D.seq(
        D.seq(D.oid("2.5.29.19"), [1, 1, 0xff], D.oct(D.seq([1, 1, 0xff]))),
        D.seq(D.oid("2.5.29.15"), [1, 1, 0xff], D.oct([3, 2, 1, 0x86])),
      ),
    ),
    tbs = D.seq(
      D.tl(0xa0, D.int([2])),
      D.int(ser),
      alg,
      name,
      D.seq(D.time(from), D.time(to)),
      name,
      spki,
      ext,
    ),
    sig = [
      ...new Uint8Array(await crypto.subtle.sign("RSASSA-PKCS1-v1_5", kp.privateKey, new Uint8Array(tbs))),
    ],
    der = D.seq(tbs, alg, D.bit(sig)),
    b64 = xB64(new Uint8Array(der));
  return {
    key: kp.privateKey,
    pem: "-----BEGIN CERTIFICATE-----\n" + b64.match(/.{1,64}/g).join("\n") + "\n-----END CERTIFICATE-----\n",
    ts: Date.now(),
  };
}
async function xQzCertDownload() {
  try {
    let c = await xQzCert(!0);
    let a = document.createElement("a");
    a.href = URL.createObjectURL(
      new Blob([c.pem], {
        type: "application/x-x509-ca-cert",
      }),
    );
    a.download = "override.crt";
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(a.href);
      a.remove();
    }, 1000);
    if (window.qz && qz.websocket.isActive()) await qz.websocket.disconnect().catch(() => {});
    toast("override.crt yuklab olindi");
  } catch (e) {
    console.error(e);
    toast("Faylni yaratib bo'lmadi: " + (e.message || e));
  }
}

/* ===== Chek printeri (QZ Tray orqali tanlab ulash) — yangi ===== */
function xRcpCfg() {
  return Object.assign(
    {
      method: "dialog",
      printer: "",
    },
    store.get("eco.rcpPrinter", {}),
  );
}
function xRcpSet(p) {
  store.set("eco.rcpPrinter", Object.assign(xRcpCfg(), p));
}
function xRcpHtml(n) {
  let e = state.settings.paper === "58";
  return `<!doctype html><html><head><meta charset="utf-8"><style>@page{margin:0}body{margin:0;font-family:"Courier New",monospace;font-size:${e ? "9px" : "12px"};font-weight:600;width:${e ? "48mm" : "72mm"}}pre{white-space:pre-wrap;margin:0;font-family:inherit}</style></head><body><pre>${esc(receiptText(n))}</pre></body></html>`;
}
async function xRcpQzPrint(n) {
  let c = xRcpCfg(),
    e = state.settings.paper === "58",
    qz = await xQz(),
    lines = String(receiptText(n)).split("\n").length,
    cfg = qz.configs.create(c.printer, {
      size: {
        width: e ? 48 : 72,
        height: Math.ceil(lines * (e ? 3.6 : 4.8)) + 12,
      },
      units: "mm",
      margins: 0,
      scaleContent: !0,
      colorType: "blackwhite",
    });
  await qz.print(cfg, [
    {
      type: "pixel",
      format: "html",
      flavor: "plain",
      data: xRcpHtml(n),
    },
  ]);
}
function dv(n) {
  let c = xRcpCfg();
  if (c.method === "qz" && c.printer) {
    xRcpQzPrint(n)
      .then(() => toast("Chek «" + c.printer + "» printeriga yuborildi"))
      .catch((err) => {
        console.error(err);
        toast("Chek printeriga yuborilmadi — oddiy chop etish oynasi ochildi");
        dvDialog(n);
      });
    return;
  }
  dvDialog(n);
}
function xRcpPanel() {
  let c = xRcpCfg(),
    pl = state._qzPrinters || (c.printer ? [c.printer] : []);
  return `<div class="panel" style="max-width:640px;margin-top:14px"><div class="panel-h"><h2>\u{1F9FE} Chek printeri (kassa)</h2></div><div class="panel-b" style="display:grid;gap:12px">
  <div class="note">Har bir kompyuter uchun alohida: <b>chek</b> bir printerga, <b>yorliq (shtrix-kod/QR)</b> pastdagi boshqa printerga chiqadi. Printerni tanlash uchun bepul <b>QZ Tray</b> kerak (<a href="https://qz.io/download/" target="_blank" rel="noopener">qz.io/download</a>). Sozlama faqat shu kompyuterda saqlanadi.</div>
  <label class="l" for="rcpMethod">Chek qayerga chiqsin<select id="rcpMethod" class="f"><option value="dialog" ${c.method !== "qz" ? "selected" : ""}>Oddiy (kompyuterning asosiy printeriga / chop etish oynasi)</option><option value="qz" ${c.method === "qz" ? "selected" : ""}>Tanlangan chek printeriga, oynasiz (QZ Tray orqali)</option></select></label>
  <div id="rcpQzBox" ${c.method === "qz" ? "" : "hidden"} style="display:${c.method === "qz" ? "grid" : "none"};gap:10px">
   <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"><button class="btn" data-x="rcpconn">\u{1F50C} Ulash va printerlarni topish</button><span class="muted" style="font-size:13px" id="rcpSt">${esc(state._rcpSt || "")}</span></div>
   <label class="l" for="rcpPrinter">Chek printeri<select id="rcpPrinter" class="f"><option value="">— tanlang —</option>${pl.map((p) => `<option value="${esc(p)}" ${p === c.printer ? "selected" : ""}>${esc(p)}</option>`).join("")}</select></label>
   <div><button class="btn primary" data-x="rcptest">\u{1F5A8} Sinov cheki</button></div>
  </div>
 </div></div>`;
}
async function xRcpConnect() {
  let st = () => {
    let b = qsel("#rcpSt");
    b && (b.textContent = state._rcpSt || "");
  };
  state._rcpSt = "Ulanmoqda…";
  st();
  try {
    let l = await xQzPrinters();
    state._qzPrinters = l;
    let c = xRcpCfg();
    if (!c.printer) {
      let guess = l.find(
        (p) =>
          /pos|receipt|check|chek|xp-?80|xp-?58|rongta|epson|tm-|80|58/i.test(p) &&
          !/label|lbl|tsc|godex|zebra|365|360|420|460|barcode/i.test(p),
      );
      guess &&
        xRcpSet({
          printer: guess,
        });
    }
    state._rcpSt = `Ulandi ✔ · ${l.length} ta printer topildi`;
  } catch (err) {
    console.error(err);
    state._rcpSt = xQzErr(err);
  }
  let b = qsel("#rcpPrinter");
  if (b) {
    let c = xRcpCfg();
    b.innerHTML =
      '<option value="">— tanlang —</option>' +
      (state._qzPrinters || [])
        .map((p) => `<option value="${esc(p)}" ${p === c.printer ? "selected" : ""}>${esc(p)}</option>`)
        .join("");
  }
  st();
}
document.addEventListener("click", (ev) => {
  let b = ev.target.closest && ev.target.closest("[data-x]");
  if (!b) return;
  let a = b.dataset.x;
  if (a === "rcpconn") {
    xRcpConnect();
    return;
  }
  if (a === "rcptest") {
    let c = xRcpCfg();
    if (!c.printer) {
      toast("Avval chek printerini tanlang");
      return;
    }
    xRcpQzPrint({
      no: "SINOV",
      seller: state.seller || "",
      ts: Date.now(),
      items: [
        {
          name: "Sinov tovari",
          qty: 1,
          price: 1000,
        },
      ],
      sub: 1000,
      total: 1000,
      cash: 1000,
    })
      .then(() => toast("Sinov cheki yuborildi"))
      .catch((err) => {
        console.error(err);
        toast(xQzErr(err));
      });
  }
});
document.addEventListener("change", (ev) => {
  let t = ev.target;
  if (!t) return;
  if (t.id === "rcpMethod") {
    xRcpSet({
      method: t.value,
    });
    let b = qsel("#rcpQzBox");
    b && ((b.hidden = t.value !== "qz"), (b.style.display = t.value === "qz" ? "grid" : "none"));
    t.value === "qz" && !state._qzPrinters && xRcpConnect();
    return;
  }
  if (t.id === "rcpPrinter") {
    xRcpSet({
      printer: t.value,
    });
    toast("Chek printeri: " + (t.value || "tanlanmagan"));
  }
});

/* --- Sozlamalar sahifasidagi bo'lim --- */
function xLblPanel() {
  let c = xLblCfg();
  return `<div class="panel" style="max-width:640px;margin-top:14px"><div class="panel-h"><h2>\u{1F3F7} Yorliq printeri (shtrix-kod / QR)</h2></div><div class="panel-b" style="display:grid;gap:12px">
  <div class="note">Chek printeri o'z joyida qoladi. Yorliqlar <b>alohida yorliq printeriga</b> oynasiz chiqishi uchun shu kompyuterga bepul <b>QZ Tray</b> dasturini o'rnating: <a href="https://qz.io/download/" target="_blank" rel="noopener">qz.io/download</a>. Sozlama faqat shu kompyuter uchun saqlanadi.</div>
  <label class="l" for="lpMethod">Yorliq qayerga chiqsin<select id="lpMethod" class="f"><option value="qz" ${c.method === "qz" ? "selected" : ""}>Alohida yorliq printeriga (QZ Tray orqali)</option><option value="dialog" ${c.method !== "qz" ? "selected" : ""}>Chop etish oynasi orqali (oddiy)</option></select></label>
  <div id="lpQzBox" ${c.method === "qz" ? "" : "hidden"}>${xLpQzInner()}</div>
  <label class="l" for="lpKind">Yorliqdagi kod turi<select id="lpKind" class="f">${Object.entries(xLblKinds)
    .map(([k, v]) => `<option value="${k}" ${k === c.kind ? "selected" : ""}>${v}</option>`)
    .join("")}</select></label>
  <div class="note">Skaneringiz QR kodni o'qiy olishini bilish uchun «Sinov yorlig'i»ni chiqarib, skanerni QR ga tuting. O'qisa — «QR kod» yoki «Shtrix-kod + QR» ni tanlang; o'qimasa — «Shtrix-kod» qoldiring.</div>
 </div></div>`;
}
function xLpQzInner() {
  let c = xLblCfg(),
    pl = state._qzPrinters || (c.printer ? [c.printer] : []),
    st = state._qzSt || "";
  return `<div style="display:grid;gap:10px">
  <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"><button class="btn" data-x="lpconn">\u{1F50C} Ulash va printerlarni topish</button><span class="muted" style="font-size:13px">${esc(st)}</span></div>
  <label class="l" for="lpPrinter">Yorliq printeri<select id="lpPrinter" class="f"><option value="">— tanlang —</option>${pl.map((p) => `<option value="${esc(p)}" ${p === c.printer ? "selected" : ""}>${esc(p)}</option>`).join("")}</select></label>
  <label class="l" for="lpDpi">Printer aniqligi<select id="lpDpi" class="f"><option value="203" ${+c.dpi !== 300 ? "selected" : ""}>203 dpi (ko'pchilik yorliq printerlari)</option><option value="300" ${+c.dpi === 300 ? "selected" : ""}>300 dpi</option></select></label>
  <label class="l" for="lpRot">Yorliq yon yoki teskari chiqsa — burish<select id="lpRot" class="f">${[0, 90, 180, 270].map((d) => `<option value="${d}" ${+c.rot === d ? "selected" : ""}>${d ? d + "\xB0" : "Burmaslik"}</option>`).join("")}</select></label>
  <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn primary" data-x="lptest">\u{1F5A8} Sinov yorlig'i</button></div>
  <details class="note"><summary><b>Har safar «Allow» so'ramasligi uchun</b> (bir marta qilinadi)</summary>
   <ol style="margin:8px 0 0 18px;padding:0;display:grid;gap:4px">
    <li><button class="btn sm" data-x="lpcert">override.crt faylini yuklab olish</button></li>
    <li>Faylni <b>C:\\Program Files\\QZ Tray</b> papkasiga nusxalang (Windows ruxsat so'rasa — «Davom etish»).</li>
    <li>QZ Tray'ni yoping va qayta oching (soat yonidagi belgi → Exit, keyin Pusk → QZ Tray).</li>
   </ol></details>
 </div>`;
}
async function xLpConnect() {
  state._qzSt = "Ulanmoqda…";
  xLpDraw();
  try {
    let l = await xQzPrinters();
    state._qzPrinters = l;
    let c = xLblCfg();
    if (!c.printer) {
      let guess = l.find((p) =>
        /xp-?3|label|lbl|tsc|godex|zebra|xprinter|gprinter|hprt|tspl|365|360|420|460|barcode/i.test(p),
      );
      guess &&
        xLblSet({
          printer: guess,
        });
    }
    state._qzSt = `Ulandi \u2714 · ${l.length} ta printer topildi`;
  } catch (e) {
    console.error(e);
    state._qzSt = xQzErr(e);
  }
  xLpDraw();
}
function xLpDraw() {
  let b = qsel("#lpQzBox");
  b && (b.innerHTML = xLpQzInner());
}
function xLpTest() {
  let c = xLblCfg(),
    tp = {
      id: "_t",
      name: "Sinov yorlig'i · Eco Kassa",
      price: 125000,
      barcode: "2001234567893",
    };
  state.products = state.products || {};
  let had = state.products._t;
  state.products._t = tp;
  let keep = state._lb;
  state._lb = {
    items: {
      _t: 1,
    },
    size: (state.settings || {}).lblSize || "40x30",
    name: !0,
    price: !0,
    kind: "both",
  };
  Promise.resolve(xLabelPrint()).finally(() => {
    state._lb = keep;
    had ? (state.products._t = had) : delete state.products._t;
  });
}

/* --- Kodsiz tovarga kassa o'zi kod beradi --- */
function xAutoCode(v, extra) {
  state._autoCode = null;
  v = String(v || "").trim();
  if (v || (extra && extra.length)) return v;
  let c = xNewEan("200");
  c && (state._autoCode = c);
  return c;
}
function xLblOpen(items, msg) {
  if (!xCan("labels")) return;
  let c = xLblCfg();
  state._lb = state._lb || {
    items: {},
    size: (state.settings || {}).lblSize || "40x30",
    price: !0,
    name: !0,
    kind: c.kind,
  };
  state._lb.items = items;
  state._lbQ = "";
  xLabelModal();
  msg && toast(msg);
}
function xAfterAutoCode(qty) {
  let code = state._autoCode;
  state._autoCode = null;
  if (!code) return;
  let n = 0;
  (function look() {
    let p = activeProducts().find((x) => hasBc(x, code));
    if (p) {
      xLblOpen(
        {
          [p.id]: Math.max(1, Math.ceil(num(qty) || num(p.qty) || 1)),
        },
        "Tovarga kod berildi: " + code,
      );
      return;
    }
    if (++n < 15) setTimeout(look, 200);
    else toast("Tovarga kod berildi: " + code);
  })();
}
async function xAfterIntake(lines) {
  try {
    if (!xCan("labels") || !lines || !lines.length) return;
    let items = {},
      ed = xCan("editProd");
    for (let l of lines) {
      let p = state.products[l.pid];
      if (!p) continue;
      let c = bcs(p);
      if (!c.length) {
        if (!ed) continue;
        let nc = xNewEan("200");
        if (!nc) continue;
        p.barcode = nc;
        await dbUpdate("products", p.id, {
          barcode: nc,
        });
        c = [nc];
      }
      xOwnCode(c[0]) && (items[p.id] = Math.max(1, Math.ceil(num(l.qty))));
    }
    Object.keys(items).length && xLblOpen(items, "Kelgan tovarlarga yorliq chop eting");
  } catch (e) {
    console.error(e);
  }
}
document.addEventListener("click", (n) => {
  let b = n.target.closest && n.target.closest("[data-x]");
  if (!b) return;
  let a = b.dataset.x;
  if (a === "lpconn") {
    xLpConnect();
    return;
  }
  if (a === "lptest") {
    xLpTest();
    return;
  }
  if (a === "lpcert") {
    xQzCertDownload();
    return;
  }
  if (a === "mpcode") {
    let i = qsel("#mpBar");
    if (!i) return;
    if (i.value.trim()) {
      toast("Bu tovarda kod bor");
      return;
    }
    let c = xNewEan("200");
    if (!c) {
      toast("Kod yaratib bo'lmadi");
      return;
    }
    i.value = c;
    toast("Kod berildi: " + c);
    return;
  }
});
document.addEventListener("change", (n) => {
  let t = n.target;
  if (!t) return;
  if (t.id === "lpMethod") {
    xLblSet({
      method: t.value,
    });
    let b = qsel("#lpQzBox");
    b && (b.hidden = t.value !== "qz");
    t.value === "qz" && !state._qzPrinters && xLpConnect();
    return;
  }
  if (t.id === "lpPrinter") {
    xLblSet({
      printer: t.value,
    });
    toast("Yorliq printeri: " + (t.value || "tanlanmagan"));
    return;
  }
  if (t.id === "lpDpi") {
    xLblSet({
      dpi: +t.value,
    });
    return;
  }
  if (t.id === "lpRot") {
    xLblSet({
      rot: +t.value,
    });
    return;
  }
  if (t.id === "lpKind") {
    xLblSet({
      kind: t.value,
    });
    state._lb && (state._lb.kind = t.value);
    toast("Saqlandi");
    return;
  }
  if (t.id === "lbKind") {
    state._lb.kind = t.value;
    xLblSet({
      kind: t.value,
    });
    return;
  }
});
/* ===== /Yorliq printeri ===== */

/* ---------- Mijozlar: xabar, tug'ilgan kun, uzoq kelmaganlar ---------- */
function xClientStats() {
  let a = Date.now() - 365 * 864e5,
    R = xRange("sales", a, 1 / 0),
    st = {};
  (R.list || []).forEach((s) => {
    if (!s.clientId) return;
    let o = (st[s.clientId] = st[s.clientId] || {
      last: 0,
      sum: 0,
      n: 0,
    });
    o.last = Math.max(o.last, s.ts);
    o.sum += num(s.total);
    o.n++;
  });
  (state.sales || []).forEach((s) => {
    if (!s.clientId) return;
    let o = (st[s.clientId] = st[s.clientId] || {
      last: 0,
      sum: 0,
      n: 0,
    });
    o.last = Math.max(o.last, s.ts);
  });
  Object.values(state.clients || {}).forEach((c) => {
    if (c.lastTs) {
      let o = (st[c.id] = st[c.id] || {
        last: 0,
        sum: 0,
        n: 0,
      });
      o.last = Math.max(o.last, num(c.lastTs));
    }
  });
  return {
    st,
    ready: R.ready,
  };
}
function xLost(days) {
  let { st, ready } = xClientStats(),
    lim = Date.now() - days * 864e5;
  return {
    ready,
    list: Object.values(state.clients || {})
      .filter((c) => !c.archived && st[c.id] && st[c.id].last < lim)
      .map((c) => ({
        c,
        s: st[c.id],
      }))
      .sort((x, y) => y.s.sum - x.s.sum),
  };
}
function xBdays(n) {
  let t = new Date();
  t.setHours(0, 0, 0, 0);
  return Object.values(state.clients || {})
    .filter((c) => c.bday)
    .map((c) => {
      let [, m, d] = c.bday.split("-").map(Number),
        b = new Date(t.getFullYear(), m - 1, d);
      b < t && b.setFullYear(t.getFullYear() + 1);
      return {
        c,
        dl: Math.round((b - t) / 864e5),
      };
    })
    .filter((x) => x.dl <= n)
    .sort((x, y) => x.dl - y.dl);
}
function xMarketPage() {
  if (!isOwner()) return "<div class=\"note\">Bu bo'lim faqat do'kon egasi uchun.</div>";
  let st = state.settings || {},
    ps = xPromos(),
    certs = Object.values(state.certs || {}).sort((a, b) => b.ts - a.ts),
    live = certs.filter((c) => num(c.balance) > 0),
    days = state._lostD || 60,
    L = xLost(days),
    bd = xBdays(7),
    tgN = Object.values(state.clients || {}).filter((c) => c.tgId).length,
    bc = Object.values(state.broadcasts || {})
      .sort((a, b) => b.ts - a.ts)
      .slice(0, 10);
  return `<h1 class="page">Aksiya va mijozlar</h1>${xImgSettings()}<div style="height:14px"></div>${xAutoPanel()}
 <div class="panel"><div class="panel-h"><h2>\u{1F381} Aksiyalar</h2><span class="spacer"></span><button class="btn sm primary" data-x="pnew">+ Yangi aksiya</button></div>
 <div class="tbl-wrap"><table class="t"><thead><tr><th>Nomi</th><th>Shartlari</th><th>Holati</th><th></th></tr></thead><tbody>
 ${ps.map((p, i) => `<tr><td><b>${esc(p.name)}</b></td><td style="font-size:13px">${esc(xPromoDesc(p))}</td><td>${xPromoActive(p) ? '<span class="pill ok">Hozir ishlayapti</span>' : p.on ? '<span class="pill">Kutilmoqda</span>' : '<span class="pill out">O\'chiq</span>'}</td><td class="r" style="white-space:nowrap"><button class="btn sm" data-ptog="${i}">${p.on ? "O'chirish" : "Yoqish"}</button> <button class="btn sm" data-pedit="${i}">Tahrirlash</button></td></tr>`).join("") || '<tr><td colspan="4" class="muted">Hali aksiya yo\'q. Masalan: \xAB2 ta shampun olsa, 3-si sovg\'a\xBB yoki \xABJuma kuni hamma kremlarga 10%\xBB.</td></tr>'}
 </tbody></table></div>
 <div class="panel-b" style="display:flex;gap:12px;flex-wrap:wrap;align-items:end;border-top:1px solid var(--line)">
  <label class="l" for="bdPct" style="max-width:260px">\u{1F382} Tug'ilgan kun chegirmasi (%), 0 = o'chiq<input id="bdPct" class="f num" value="${num(st.bdayPct) || ""}" placeholder="0" inputmode="decimal"></label>
  <label class="l" for="bdRange" style="max-width:220px">Necha kun oldin/keyin amal qiladi<input id="bdRange" class="f num" value="${num(st.bdayRange ?? 3)}" inputmode="numeric"></label>
  <div class="muted" style="font-size:13px;flex:1;min-width:200px">Mijoz kartasida tug'ilgan kuni yozilgan bo'lsa, kassada chegirma o'zi qo'shiladi. Botdagi mijozlarga tug'ilgan kuni ertalab tabrik xabari boradi.</div>
 </div></div>
 <div class="two" style="margin-top:14px">
  <div class="panel"><div class="panel-h"><h2>\u{1F4E3} Mijozlarga xabar (Telegram bot)</h2></div><div class="panel-b" style="display:grid;gap:8px">
   <div class="muted" style="font-size:13px">Botda ro'yxatdan o'tgan mijozlar: <b>${tgN}</b> ta</div>
   <label class="l" for="bcTo">Kimga<select id="bcTo" class="f"><option value="all">Botdagi hamma mijozlar</option><option value="lost" ${state._bcTo === "lost" ? "selected" : ""}>Uzoq kelmaganlar (${L.list.filter((x) => x.c.tgId).length} ta)</option><option value="bday">Tug'ilgan kuni shu hafta (${bd.filter((x) => x.c.tgId).length} ta)</option><option value="debt">Qarzi borlar (${Object.values(state.clients || {}).filter((c) => c.tgId && num(c.debt) > 0).length} ta)</option></select></label>
   <label class="l" for="bcText">Xabar matni<textarea id="bcText" class="f" style="min-height:110px" placeholder="Masalan: Assalomu alaykum! Eco Aroma'ga yangi kremlar keldi. Juma kuni hamma tovarlarga 10% chegirma \u{1F33F}">${esc(state._bcText || "")}</textarea></label>
   <div><button class="btn primary" data-x="bcsend">\u{1F4E4} Yuborish</button></div>
   ${bc.length ? `<div class="tbl-wrap"><table class="t"><tbody>${bc.map((b) => `<tr><td class="num">${fmtDateTime(b.ts)}</td><td style="font-size:13px">${esc(String(b.text || "").slice(0, 60))}…</td><td class="r">${b.status === "done" ? `<span class="pill ok">${num(b.sent)} ta yetdi</span>` : b.status === "sending" ? '<span class="pill low">yuborilmoqda</span>' : '<span class="pill">navbatda</span>'}</td></tr>`).join("")}</tbody></table></div>` : ""}
  </div></div>
  <div class="panel"><div class="panel-h"><h2>\u{1F39F} Sovg'a sertifikatlari</h2><span class="spacer"></span><button class="btn sm primary" data-x="cesell">+ Sotish</button></div>
   <div class="panel-b muted" style="font-size:13px">Amaldagi: <b>${live.length}</b> ta \xB7 ishlatilmagan qoldiq: <b>${money(live.reduce((s, c) => s + num(c.balance), 0))}</b> so'm. Kassada sertifikat shtrix-kodini skanerlasangiz, to'lovga o'zi qo'shiladi.</div>
   <div class="tbl-wrap" style="max-height:40vh"><table class="t"><thead><tr><th>Kod</th><th>Kimga</th><th class="r">Summa</th><th class="r">Qoldiq</th><th></th></tr></thead><tbody>
   ${
     certs
       .slice(0, 40)
       .map(
         (c) =>
           `<tr><td class="num">${esc(c.code)}<div class="muted" style="font-size:12px">${fmtDateTime(c.ts)}</div></td><td>${esc(c.who || "")}</td><td class="r num">${money(c.amount)}</td><td class="r num">${num(c.balance) > 0 ? money(c.balance) : '<span class="pill">ishlatildi</span>'}</td><td class="r"><button class="btn sm" data-ceprint="${esc(c.id)}">\u{1F5A8}</button></td></tr>`,
       )
       .join("") || '<tr><td colspan="5" class="muted">Hali sotilmagan</td></tr>'
   }
   </tbody></table></div></div>
 </div>
 <div class="two" style="margin-top:14px">
  <div class="panel"><div class="panel-h"><h2>\u{1F614} Uzoq kelmagan mijozlar</h2><span class="spacer"></span><span class="seg">${[30, 60, 90].map((d) => `<button data-lostd="${d}" aria-pressed="${days === d}">${d} kun</button>`).join("")}</span></div>
   ${L.ready ? "" : '<div class="panel-b muted">Yuklanmoqda…</div>'}
   <div class="tbl-wrap" style="max-height:45vh"><table class="t"><thead><tr><th>Mijoz</th><th>Oxirgi xarid</th><th class="r">Yil davomida</th></tr></thead><tbody>
   ${
     L.list
       .slice(0, 100)
       .map(
         (x) =>
           `<tr><td><b>${esc(x.c.name)}</b> ${x.c.tgId ? '<span class="pill ok">bot</span>' : ""}<div class="muted num" style="font-size:12px">${esc(x.c.phone || "")}</div></td><td class="num">${fmtDateTime(x.s.last).slice(0, 8)}<div class="muted" style="font-size:12px">${Math.floor((Date.now() - x.s.last) / 864e5)} kun oldin</div></td><td class="r num">${money(x.s.sum)}</td></tr>`,
       )
       .join("") || '<tr><td colspan="3" class="muted">Bunday mijoz yo\'q ✓</td></tr>'
   }
   </tbody></table></div>
   ${L.list.some((x) => x.c.tgId) ? '<div class="panel-b"><button class="btn" data-x="lostmsg">\u{1F4E3} Ularga eslatma yozish</button></div>' : ""}</div>
  <div class="panel"><div class="panel-h"><h2>\u{1F382} Yaqin tug'ilgan kunlar (7 kun)</h2></div>
   <div class="tbl-wrap"><table class="t"><tbody>${bd.map((x) => `<tr><td><b>${esc(x.c.name)}</b> ${x.c.tgId ? '<span class="pill ok">bot</span>' : ""}<div class="muted num" style="font-size:12px">${esc(x.c.phone || "")}</div></td><td class="r">${x.dl === 0 ? '<span class="pill ok">Bugun!</span>' : `${x.dl} kundan keyin`}</td></tr>`).join("") || "<tr><td class=\"muted\">Yaqin kunlarda yo'q. Tug'ilgan kun mijoz kartasida kiritiladi.</td></tr>"}</tbody></table></div></div>
 </div>`;
}
async function xBcSend(btn) {
  let txt = ((qsel("#bcText") || {}).value || "").trim(),
    to = (qsel("#bcTo") || {}).value || "all";
  if (txt.length < 5) {
    toast("Xabar matnini yozing");
    return;
  }
  let ids = null;
  if (to === "lost")
    ids = xLost(state._lostD || 60)
      .list.filter((x) => x.c.tgId)
      .map((x) => x.c.id);
  else if (to === "bday")
    ids = xBdays(7)
      .filter((x) => x.c.tgId)
      .map((x) => x.c.id);
  else if (to === "debt")
    ids = Object.values(state.clients || {})
      .filter((c) => c.tgId && num(c.debt) > 0)
      .map((c) => c.id);
  let n = ids ? ids.length : Object.values(state.clients || {}).filter((c) => c.tgId).length;
  if (!n) {
    toast("Bu guruhda botdagi mijoz yo'q");
    return;
  }
  if (!state._bcOk) {
    state._bcOk = !0;
    openModal(
      "Xabarni yuborish",
      `<div class="note"><b>${n}</b> ta mijozga Telegram orqali yuboriladi:<br><br>${esc(txt).replace(/\n/g, "<br>")}</div>`,
      '<button class="btn" data-close="x">Ortga</button><button class="btn primary" data-x="bcsend">Ha, yuborish</button>',
    );
    state._bcPend = {
      txt,
      to,
      ids,
    };
    return;
  }
  let p = state._bcPend || {
    txt,
    to,
    ids,
  };
  state._bcOk = !1;
  state._bcPend = null;
  btn && (btn.disabled = !0);
  await dbSet("broadcasts", newId(), {
    ts: Date.now(),
    text: p.txt,
    target: p.to,
    ids: p.ids,
    status: "new",
    seller: state.seller || "",
  });
  state._bcText = "";
  closeModal();
  toast("Xabar navbatga qo'yildi — bot yuboradi");
  render();
}

/* ---------- Tahlil ---------- */
function xRates(days) {
  days = days || 30;
  let a = Date.now() - days * 864e5,
    r = {};
  (state.sales || [])
    .filter((s) => s.ts >= a)
    .forEach((s) =>
      (s.items || []).forEach((i) => {
        r[i.pid] = (r[i.pid] || 0) + num(i.qty);
      }),
    );
  (state.returns || [])
    .filter((s) => s.ts >= a)
    .forEach((s) =>
      (s.items || []).forEach((i) => {
        r[i.pid] = (r[i.pid] || 0) - num(i.qty);
      }),
    );
  Object.keys(r).forEach((k) => (r[k] = Math.max(0, r[k]) / days));
  return r;
}
function xAnalysisPage() {
  if (!isOwner()) return "<div class=\"note\">Bu bo'lim faqat do'kon egasi uchun.</div>";
  let dd = state._deadD || 60,
    S = xRange("sales", Date.now() - 180 * 864e5, 1 / 0),
    P = xRange("purchases", 0, 1 / 0),
    ready = S.ready && P.ready,
    lastSale = {};
  (S.list || []).concat(state.sales || []).forEach((s) =>
    (s.items || []).forEach((i) => {
      lastSale[i.pid] = Math.max(lastSale[i.pid] || 0, s.ts);
    }),
  );
  let lim = Date.now() - dd * 864e5,
    dead = activeProducts()
      .filter((p) => num(p.qty) > 0 && (lastSale[p.id] || 0) < lim && num(p.created || 0) < lim)
      .map((p) => ({
        p,
        last: lastSale[p.id] || 0,
        val: num(p.qty) * num(p.cost),
      }))
      .sort((a, b) => b.val - a.val),
    deadVal = dead.reduce((s, x) => s + x.val, 0),
    rt = xRates(30),
    fc = activeProducts()
      .filter((p) => rt[p.id] > 0)
      .map((p) => ({
        p,
        r: rt[p.id],
        dl: Math.max(0, num(p.qty)) / rt[p.id],
      }))
      .filter((x) => x.dl <= 21)
      .sort((a, b) => a.dl - b.dl),
    hist = {};
  xLive(xUq((P.list || []).concat(state.purchases || []))).forEach((b) =>
    (b.items || []).forEach((i) => {
      let h = (hist[i.pid] = hist[i.pid] || {});
      h[b.ts + "|" + (b.supplierId || "")] = {
        ts: b.ts,
        cost: num(i.cost),
        sup: b.supplierName || "",
      };
    }),
  );
  let mm = num((state.settings || {}).minMargin ?? 20),
    rise = [],
    lowM = [];
  Object.entries(hist).forEach(([pid, h]) => {
    let p = state.products[pid];
    if (!p || p.archived) return;
    let l = Object.values(h).sort((a, b) => a.ts - b.ts),
      last = l[l.length - 1],
      prev = [...l].reverse().find((x) => x.cost !== last.cost && x.ts < last.ts);
    prev &&
      last.cost > prev.cost &&
      last.ts > Date.now() - 120 * 864e5 &&
      rise.push({
        p,
        prev,
        last,
        pct: Math.round(((last.cost - prev.cost) / prev.cost) * 100),
      });
  });
  activeProducts().forEach((p) => {
    let c = num(p.cost),
      pr = num(p.price);
    if (c > 0 && pr > 0) {
      let m = Math.round(((pr - c) / pr) * 100);
      m < mm &&
        lowM.push({
          p,
          m,
          sug: Math.ceil(c / (1 - mm / 100) / 1000) * 1000,
        });
    }
  });
  rise.sort((a, b) => b.pct - a.pct);
  lowM.sort((a, b) => a.m - b.m);
  return `<h1 class="page">Tahlil</h1>${xAiChat()}${ready ? "" : '<div class="note" style="margin-bottom:12px">Eski savdo va kirimlar yuklanmoqda…</div>'}
 <div class="kpis"><div class="kpi warn"><div class="k">Sotilmay turgan tovarlar</div><div class="v num">${dead.length} ta</div></div><div class="kpi warn"><div class="k">Ularga qotgan pul</div><div class="v num">${money(deadVal)}</div></div><div class="kpi"><div class="k">3 haftada tugaydi</div><div class="v num">${fc.length} ta</div></div><div class="kpi ${lowM.length ? "warn" : ""}"><div class="k">Foydasi past</div><div class="v num">${lowM.length} ta</div></div></div>
 <div class="panel" style="margin-top:14px"><div class="panel-h"><h2>\u{1F4A4} Sotilmay turgan ("o'lik") tovarlar</h2><span class="spacer"></span><span class="seg">${[30, 60, 90].map((d) => `<button data-deadd="${d}" aria-pressed="${dd === d}">${d} kun</button>`).join("")}</span></div>
 <div class="tbl-wrap" style="max-height:45vh"><table class="t"><thead><tr><th>Tovar</th><th class="r">Qoldiq</th><th>Oxirgi sotuv</th><th class="r">Qotgan pul</th></tr></thead><tbody>
 ${
   dead
     .slice(0, 150)
     .map(
       (x) =>
         `<tr><td>${esc(x.p.name)}</td><td class="r num">${money(x.p.qty)}</td><td class="num">${x.last ? fmtDateTime(x.last).slice(0, 8) : '<span class="muted">180 kunda sotilmagan</span>'}</td><td class="r num">${money(x.val)}</td></tr>`,
     )
     .join("") || '<tr><td colspan="4" class="muted">Bunday tovar yo\'q ✓</td></tr>'
 }
 </tbody></table></div>${dead.length ? '<div class="panel-b"><button class="btn primary" data-x="deadpromo">\u{1F381} Ularga chegirma aksiyasi qilish</button></div>' : ""}</div>
 <div class="panel" style="margin-top:14px"><div class="panel-h"><h2>⏱ Qachon tugaydi (oxirgi 30 kun sotuviga qarab)</h2><span class="spacer"></span><button class="btn sm" data-x="order">\u{1F6D2} Buyurtma ro'yxati</button></div>
 <div class="tbl-wrap" style="max-height:45vh"><table class="t"><thead><tr><th>Tovar</th><th class="r">Kuniga sotiladi</th><th class="r">Qoldiq</th><th class="r">Tugaydi</th><th class="r">Oyga kerak</th></tr></thead><tbody>
 ${fc.map((x) => `<tr><td>${esc(x.p.name)}</td><td class="r num">${x.r.toFixed(1)}</td><td class="r num">${money(x.p.qty)}</td><td class="r">${x.dl < 1 ? '<span class="pill out">tugadi / bugun</span>' : x.dl <= 7 ? `<span class="pill out">${Math.round(x.dl)} kunda</span>` : `<span class="pill low">${Math.round(x.dl)} kunda</span>`}</td><td class="r num">${Math.max(0, Math.ceil(x.r * 30 - Math.max(0, num(x.p.qty))))}</td></tr>`).join("") || '<tr><td colspan="5" class="muted">Yaqin 3 haftada tugaydigan tovar yo\'q</td></tr>'}
 </tbody></table></div></div>
 <div class="two" style="margin-top:14px">
  <div class="panel"><div class="panel-h"><h2>\u{1F4C8} Tannarxi oshgan tovarlar</h2></div><div class="tbl-wrap" style="max-height:45vh"><table class="t"><thead><tr><th>Tovar</th><th class="r">Avval → Hozir</th><th class="r">Sotuv narxi</th></tr></thead><tbody>
  ${rise.map((x) => `<tr class="click" data-phist="${esc(x.p.id)}"><td>${esc(x.p.name)}<div class="muted" style="font-size:12px">${esc(x.last.sup)} \xB7 ${fmtDateTime(x.last.ts).slice(0, 8)}</div></td><td class="r num">${money(x.prev.cost)} → <b>${money(x.last.cost)}</b> <span class="pill out">+${x.pct}%</span></td><td class="r num">${money(x.p.price)}</td></tr>`).join("") || '<tr><td colspan="3" class="muted">Oxirgi 4 oyda tannarx oshmagan</td></tr>'}
  </tbody></table></div></div>
  <div class="panel"><div class="panel-h"><h2>⚠️ Foydasi past tovarlar</h2></div>
  <div class="panel-b"><label class="l" for="minMargin" style="max-width:260px">Kamida qancha foyda bo'lsin (% sotuv narxidan)<input id="minMargin" class="f num" value="${mm}" inputmode="numeric"></label></div>
  <div class="tbl-wrap" style="max-height:40vh"><table class="t"><thead><tr><th>Tovar</th><th class="r">Tannarx / Narx</th><th class="r">Foyda</th><th class="r">Tavsiya narx</th></tr></thead><tbody>
  ${
    lowM
      .slice(0, 100)
      .map(
        (x) =>
          `<tr><td>${esc(x.p.name)}</td><td class="r num">${money(x.p.cost)} / ${money(x.p.price)}</td><td class="r"><span class="pill ${x.m < 0 ? "out" : "low"}">${x.m}%</span></td><td class="r"><button class="btn sm" data-setprice="${esc(x.p.id)}|${x.sug}">${money(x.sug)} qilish</button></td></tr>`,
      )
      .join("") || '<tr><td colspan="4" class="muted">Hamma tovarning foydasi yetarli ✓</td></tr>'
  }
  </tbody></table></div></div>
 </div>`;
}
function xPriceHist(pid) {
  let p = state.products[pid],
    P = xRange("purchases", 0, 1 / 0),
    l = xLive(xUq((P.list || []).concat(state.purchases || [])))
      .filter((b) => (b.items || []).some((i) => i.pid === pid))
      .sort((a, b) => b.ts - a.ts);
  openModal(
    "Kirim narxlari \xB7 " + (p ? p.name : ""),
    `<div class="tbl-wrap"><table class="t"><thead><tr><th>Sana</th><th>Yetkazib beruvchi</th><th class="r">Soni</th><th class="r">Kirim narxi</th></tr></thead><tbody>${
      l
        .map((b) => {
          let i = b.items.find((x) => x.pid === pid);
          return `<tr><td class="num">${fmtDateTime(b.ts)}</td><td>${esc(b.supplierName || "")}</td><td class="r num">${money(i.qty)}</td><td class="r num">${money(i.cost)}</td></tr>`;
        })
        .join("") || '<tr><td colspan="4" class="muted">Kirim topilmadi</td></tr>'
    }</tbody></table></div>`,
  );
}
function xCostWarn(l) {
  let p = state.products[l.pid];
  if (!p) return;
  let o = num(p.cost),
    n = num(l.cost);
  if (o > 0 && n > o) {
    state._cw = state._cw || [];
    state._cw.push({
      p,
      o,
      n,
    });
    clearTimeout(state._cwT);
    state._cwT = setTimeout(() => {
      let L = state._cw || [];
      state._cw = [];
      if (!L.length || !isOwner()) return;
      let mm = num((state.settings || {}).minMargin ?? 20);
      openModal(
        "Tannarx oshdi",
        `<div class="note">Quyidagi tovarlarning kirim narxi oshdi. Sotuv narxini tekshiring.</div><div class="tbl-wrap" style="margin-top:8px"><table class="t"><thead><tr><th>Tovar</th><th class="r">Kirim narxi</th><th class="r">Sotuv narxi</th><th class="r">Tavsiya</th></tr></thead><tbody>${L.map(
          (x) => {
            let s = Math.max(num(x.p.price), Math.ceil(x.n / (1 - mm / 100) / 1000) * 1000),
              m = num(x.p.price) ? Math.round(((num(x.p.price) - x.n) / num(x.p.price)) * 100) : 0;
            return `<tr><td>${esc(x.p.name)}</td><td class="r num">${money(x.o)} → <b>${money(x.n)}</b></td><td class="r num">${money(x.p.price)} <span class="pill ${m < mm ? "low" : ""}">${m}%</span></td><td class="r">${s > num(x.p.price) ? `<button class="btn sm primary" data-setprice="${esc(x.p.id)}|${s}">${money(s)} qilish</button>` : '<span class="pill ok">yetarli</span>'}</td></tr>`;
          },
        ).join("")}</tbody></table></div>`,
      );
    }, 900);
  }
}

/* ---------- AI yordamchi (Tahlil bo'limi) ---------- */
var xAicQuick = [
  ["\u{1F4CA} Hafta qanday o'tdi?", "Bu hafta savdo qanday o'tdi? O'tgan hafta bilan solishtirib ayt."],
  [
    "\u{1F6D2} Nima buyurtma qilay?",
    "Hozir nimalarni buyurtma qilishim kerak? Har biridan nechta olishni ayt.",
  ],
  [
    "\u{1F4A4} Qotib qolgan tovarlar",
    "Qaysi tovarlar sotilmay pulni qotirib turibdi? Ular bilan nima qilay?",
  ],
  [
    "\u{1F4B0} Foyda",
    "Qaysi tovarlar eng ko'p foyda keltiryapti, qaysilari kam? Narxni qayerda o'zgartirish kerak?",
  ],
  [
    "\u{1F381} Aksiya g'oyasi",
    "Shu hafta uchun bitta aniq aksiya g'oyasini ber: qaysi tovarlarga, qancha chegirma.",
  ],
];
function xAicFmt(t) {
  return esc(t)
    .replace(/\*\*(.+?)\*\*/g, "<b>$1</b>")
    .replace(/^\s*[-*•]\s+/gm, "• ")
    .replace(/^#+\s*/gm, "")
    .replace(/\n/g, "<br>");
}
function xAiChat() {
  let c =
      state._aic ||
      (state._aic = {
        log: [],
        q: "",
      }),
    key = xAiKey();
  if (!key)
    return `<div class="panel" style="margin-bottom:14px"><div class="panel-h"><h2>\u{1F916} AI yordamchi</h2></div><div class="panel-b"><div class="note">AI yordamchi uchun Google Gemini kaliti kerak. Uni <b>Aksiya va mijozlar → Rasm sozlamalari</b> bo'limida kiritasiz (AI rasm uchun ishlatiladigan kalitning o'zi).</div></div></div>`;
  let mic = !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  return `<div class="panel" style="margin-bottom:14px"><div class="panel-h"><h2>\u{1F916} AI yordamchi</h2><span class="spacer"></span>${c.log.length ? '<button class="btn sm" data-x="aicclr">Tozalash</button>' : ""}</div>
 <div class="panel-b" style="display:grid;gap:10px">
 <div class="chips" style="margin:0">${xAicQuick.map((x, i) => `<button type="button" data-x="aicq" data-i="${i}" ${c.busy ? "disabled" : ""}>${x[0]}</button>`).join("")}</div>
 <div style="display:flex;gap:8px"><input id="aicQ" class="f" style="flex:1;min-width:0" placeholder="Savolingizni yozing yoki \u{1F3A4} bosib gapiring" value="${esc(c.q || "")}" ${c.busy ? "disabled" : ""}>
 ${mic ? `<button type="button" class="btn" data-x="aicmic" title="Ovoz bilan so'rash" ${c.busy ? "disabled" : ""}>${c.rec ? "⏺ Tinglayapman…" : "\u{1F3A4}"}</button>` : ""}
 <button type="button" class="btn primary" data-x="aicask" ${c.busy ? "disabled" : ""}>So'rash</button></div>
 ${c.busy ? "<div class=\"muted\">⏳ AI savdo va ombor ma'lumotlarini ko'rib chiqyapti…</div>" : ""}
 ${c.log
   .slice()
   .reverse()
   .map((m, ri) => {
     let i = c.log.length - 1 - ri;
     return `<div style="border:1px solid var(--line);border-radius:12px;padding:10px 12px">
  <div class="muted" style="font-size:13px;margin-bottom:6px">❓ ${esc(m.q)}</div>
  ${
    m.err
      ? `<div class="note">❌ ${esc(m.err)}</div>`
      : `<div style="line-height:1.55">${xAicFmt(m.a || "")}</div>
  <div style="margin-top:8px"><button type="button" class="btn sm" data-x="aicsay" data-i="${i}">${c.say === i ? "⏹ To'xtatish" : "\u{1F50A} Eshitish"}</button></div>`
  }
 </div>`;
   })
   .join("")}
 <div class="muted" style="font-size:12px">AI faqat do'kon raqamlarini ko'radi (mijozlarning ism va telefonlari yuborilmaydi). 1 savol ≈ 20–50 so'm (Google hisobidan). Javobni tekshirib, keyin qaror qiling.</div>
 </div></div>`;
}
function xAiData() {
  let now = Date.now(),
    D = 864e5,
    uq = (l) => l.filter((x, i, a) => !x.id || a.findIndex((y) => y.id === x.id) === i),
    S = xRange("sales", now - 60 * D, 1 / 0),
    R = xRange("returns", now - 60 * D, 1 / 0),
    X = xRange("expenses", now - 60 * D, 1 / 0),
    sales = uq((S.list || []).concat(state.sales || [])).filter((s) => s.ts >= now - 60 * D),
    rets = uq((R.list || []).concat(state.returns || [])).filter((s) => s.ts >= now - 60 * D),
    exps = uq((X.list || []).concat(state.expenses || [])).filter((s) => s.ts >= now - 30 * D && !s.void),
    tz = (t) => new Date(t + 5 * 3600e3),
    day = (t) => tz(t).toISOString().slice(0, 10),
    cost = (s) => (s.items || []).reduce((y, i) => y + num(i.cost) * num(i.qty), 0),
    per = (a, b) => {
      let L = sales.filter((s) => s.ts >= now - a * D && s.ts < now - b * D),
        t = L.reduce((x, s) => x + num(s.total), 0),
        p = t - L.reduce((x, s) => x + cost(s), 0);
      return `savdo ${money(t)}, foyda ${money(p)}, cheklar ${L.length}, o'rtacha chek ${money(L.length ? t / L.length : 0)}`;
    },
    out = [];
  out.push(
    `Do'kon: ${(state.settings || {}).shopName || "Eco Aroma"} (kosmetika). Bugun: ${day(now)}, ${["yakshanba", "dushanba", "seshanba", "chorshanba", "payshanba", "juma", "shanba"][tz(now).getUTCDay()]}. Pul: so'm.`,
  );
  out.push(
    `\nDAVRLAR:\nOxirgi 7 kun: ${per(7, 0)}\nUndan oldingi 7 kun: ${per(14, 7)}\nOxirgi 30 kun: ${per(30, 0)}\nUndan oldingi 30 kun: ${per(60, 30)}`,
  );
  let byDay = {};
  sales
    .filter((s) => s.ts >= now - 14 * D)
    .forEach((s) => {
      let k = day(s.ts);
      byDay[k] = byDay[k] || [0, 0];
      byDay[k][0] += num(s.total);
      byDay[k][1]++;
    });
  out.push(
    `\nKUNLIK SAVDO (14 kun, sana: summa / cheklar):\n${
      Object.keys(byDay)
        .sort()
        .map((k) => `${k}: ${money(byDay[k][0])} / ${byDay[k][1]}`)
        .join("\n") || "yo'q"
    }`,
  );
  let wd = [0, 0, 0, 0, 0, 0, 0],
    hr = {},
    s30 = sales.filter((s) => s.ts >= now - 30 * D);
  s30.forEach((s) => {
    let d = tz(s.ts);
    wd[d.getUTCDay()] += num(s.total);
    let h = d.getUTCHours();
    hr[h] = (hr[h] || 0) + num(s.total);
  });
  out.push(
    `\nHAFTA KUNLARI (30 kun): ${["Ya", "Du", "Se", "Ch", "Pa", "Ju", "Sh"].map((n, i) => n + " " + money(wd[i])).join(", ")}\nSOATLAR (30 kun): ${Object.keys(
      hr,
    )
      .sort((a, b) => a - b)
      .map((h) => h + ":00 " + money(hr[h]))
      .join(", ")}`,
  );
  let st = {},
    cat = {},
    sel = {};
  s30.forEach((s) => {
    sel[s.seller || "—"] = (sel[s.seller || "—"] || 0) + num(s.total);
    (s.items || []).forEach((i) => {
      let x = (st[i.pid] = st[i.pid] || {
        q: 0,
        v: 0,
        c: 0,
        n: i.name,
      });
      x.q += num(i.qty);
      x.v += num(i.qty) * num(i.price);
      x.c += num(i.qty) * num(i.cost);
      let p = state.products[i.pid],
        k = (p && p.cat) || "Boshqa";
      cat[k] = (cat[k] || 0) + num(i.qty) * num(i.price);
    });
  });
  rets
    .filter((r) => r.ts >= now - 30 * D)
    .forEach((r) =>
      (r.items || []).forEach((i) => {
        let x = st[i.pid];
        x && (x.q -= num(i.qty));
      }),
    );
  let rt = xRates(30),
    prods = activeProducts(),
    top = Object.entries(st)
      .sort((a, b) => b[1].v - a[1].v)
      .slice(0, 40);
  out.push(
    `\nKATEGORIYALAR (30 kun savdo): ${
      Object.entries(cat)
        .sort((a, b) => b[1] - a[1])
        .map(([k, v]) => k + " " + money(v))
        .join(", ") || "yo'q"
    }`,
  );
  out.push(
    `SOTUVCHILAR (30 kun): ${
      Object.entries(sel)
        .map(([k, v]) => k + " " + money(v))
        .join(", ") || "yo'q"
    }`,
  );
  out.push(
    `\nENG KO'P SOTILGAN 40 TA TOVAR (30 kun) — nom | sotildi dona | tushum | foyda | qoldiq | narx | tannarx | necha kunga yetadi:\n${
      top
        .map(([pid, x]) => {
          let p = state.products[pid] || {},
            r = rt[pid] || 0;
          return `${x.n} | ${money(x.q)} | ${money(x.v)} | ${money(x.v - x.c)} | ${p.qty == null ? "?" : money(p.qty)} | ${money(p.price)} | ${money(p.cost)} | ${r > 0 ? Math.round(Math.max(0, num(p.qty)) / r) + " kun" : "—"}`;
        })
        .join("\n") || "savdo yo'q"
    }`,
  );
  let fc = prods
    .filter((p) => rt[p.id] > 0)
    .map((p) => ({
      p,
      r: rt[p.id],
      dl: Math.max(0, num(p.qty)) / rt[p.id],
    }))
    .filter((x) => x.dl <= 21)
    .sort((a, b) => a.dl - b.dl)
    .slice(0, 40);
  out.push(
    `\nTEZ ORADA TUGAYDIGANLAR (oxirgi 30 kun sotuviga qarab) — nom | kuniga sotiladi | qoldiq | necha kunda tugaydi | 30 kunga yetishi uchun olish kerak | yetkazib beruvchi:\n${fc.map((x) => `${x.p.name} | ${x.r.toFixed(1)} | ${money(x.p.qty)} | ${Math.round(x.dl)} | ${Math.max(0, Math.ceil(x.r * 30 - Math.max(0, num(x.p.qty))))} | ${x.p.sup || "—"}`).join("\n") || "yo'q"}`,
  );
  let last = {};
  sales.forEach((s) =>
    (s.items || []).forEach((i) => {
      last[i.pid] = Math.max(last[i.pid] || 0, s.ts);
    }),
  );
  let dead = prods
    .filter((p) => num(p.qty) > 0 && !last[p.id] && num(p.created || 0) < now - 60 * D)
    .map((p) => ({
      p,
      v: num(p.qty) * num(p.cost),
    }))
    .sort((a, b) => b.v - a.v);
  out.push(
    `\n60 KUNDA BIRORTA HAM SOTILMAGAN TOVARLAR: jami ${dead.length} ta, qotgan pul ${money(dead.reduce((s, x) => s + x.v, 0))} (tannarxda). Eng qimmatlari — nom | qoldiq | tannarx | narx:\n${
      dead
        .slice(0, 25)
        .map((x) => `${x.p.name} | ${money(x.p.qty)} | ${money(x.p.cost)} | ${money(x.p.price)}`)
        .join("\n") || "yo'q"
    }`,
  );
  let mm = num((state.settings || {}).minMargin ?? 20),
    low = prods
      .filter((p) => num(p.cost) > 0 && num(p.price) > 0)
      .map((p) => ({
        p,
        m: Math.round(((num(p.price) - num(p.cost)) / num(p.price)) * 100),
      }))
      .filter((x) => x.m < mm)
      .sort((a, b) => a.m - b.m)
      .slice(0, 25);
  out.push(
    `\nFOYDASI ${mm}% DAN PAST TOVARLAR — nom | tannarx | narx | foyda %:\n${low.map((x) => `${x.p.name} | ${money(x.p.cost)} | ${money(x.p.price)} | ${x.m}%`).join("\n") || "yo'q"}`,
  );
  let neg = prods.filter((p) => num(p.qty) < 0).length,
    zero = prods.filter((p) => num(p.qty) === 0).length,
    sv = prods.reduce((s, p) => s + Math.max(0, num(p.qty)) * num(p.cost), 0);
  out.push(
    `\nOMBOR: ${prods.length} xil tovar, ombordagi tovar tannarxda ${money(sv)}, qoldig'i 0: ${zero} ta, minusda: ${neg} ta.`,
  );
  let ec = {};
  exps.forEach((x) => {
    ec[x.cat || "Boshqa"] = (ec[x.cat || "Boshqa"] || 0) + num(x.amount);
  });
  out.push(
    `XARAJATLAR (30 kun): ${
      Object.entries(ec)
        .map(([k, v]) => k + " " + money(v))
        .join(", ") || "yo'q"
    }; qaytarishlar (30 kun): ${rets.filter((r) => r.ts >= now - 30 * D).length} ta.`,
  );
  return {
    text: out.join("\n"),
    ready: S.ready && R.ready && X.ready,
  };
}
async function xGemTextModel(key) {
  if (state._gemTxt) return state._gemTxt;
  try {
    let r = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models?pageSize=200&key=" + encodeURIComponent(key),
      ),
      j = await r.json().catch(() => ({}));
    let ms = (j.models || [])
        .filter((m) => (m.supportedGenerationMethods || []).includes("generateContent"))
        .map((m) => m.name.replace(/^models\//, ""))
        .filter((n) => /^gemini-[\d.]+-flash(-lite)?(-\d+)?$/.test(n)),
      sc = (n) => parseFloat((n.match(/gemini-([\d.]+)/) || [0, 0])[1]) * 10 + (/lite/.test(n) ? -3 : 0);
    ms.sort((a, b) => sc(b) - sc(a));
    if (ms.length) return (state._gemTxt = ms[0]);
  } catch (e) {
    console.error(e);
  }
  return (state._gemTxt = "gemini-2.5-flash");
}
async function xAicAsk(qs) {
  let c =
    state._aic ||
    (state._aic = {
      log: [],
      q: "",
    });
  qs = String(qs || "").trim();
  if (!qs || c.busy) return;
  let key = xAiKey();
  if (!key) {
    toast("Gemini kaliti kiritilmagan");
    return;
  }
  c.busy = !0;
  c.q = "";
  render();
  let m = {
    q: qs,
    ts: Date.now(),
  };
  try {
    let d = xAiData();
    if (!d.ready) {
      await new Promise((r) => setTimeout(r, 2500));
      d = xAiData();
    }
    let model = await xGemTextModel(key),
      hist = [];
    c.log
      .slice(-3)
      .filter((x) => x.a)
      .forEach((x) => {
        hist.push(
          {
            role: "user",
            parts: [
              {
                text: x.q,
              },
            ],
          },
          {
            role: "model",
            parts: [
              {
                text: x.a,
              },
            ],
          },
        );
      });
    let sys = `Sen "${(state.settings || {}).shopName || "Eco Aroma"}" kosmetika do'konining tajribali savdo tahlilchisisan. Do'kon egasiga yordam berasan.
QOIDALAR:
- Faqat o'zbek tilida (lotin yozuvida), oddiy va tushunarli so'zlar bilan yoz. Egasi ko'p o'qishni yoqtirmaydi: javob QISQA bo'lsin — 3–8 qator.
- Eng muhim xulosani birinchi qatorda ayt. Keyin aniq tavsiya: nima qilish, qaysi tovar, nechta, qancha so'm.
- Faqat quyidagi ma'lumotga tayan. Ma'lumot yetmasa, buni ochiq ayt; raqam to'qima.
- Summalarni "1 250 000 so'm" ko'rinishida yoz. Jadval ishlatma. Faqat **qalin** va "- " ro'yxatdan foydalan.
- Umumiy maslahat emas, aynan shu do'kon raqamlariga asoslangan maslahat ber.

DO'KON MA'LUMOTLARI:
${d.text}`;
    let r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            systemInstruction: {
              parts: [
                {
                  text: sys,
                },
              ],
            },
            contents: hist.concat([
              {
                role: "user",
                parts: [
                  {
                    text: qs,
                  },
                ],
              },
            ]),
            generationConfig: {
              temperature: 0.4,
              maxOutputTokens: 2048,
            },
          }),
        },
      ),
      j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error((j.error && j.error.message) || "HTTP " + r.status);
    let a = ((((j.candidates || [])[0] || {}).content || {}).parts || [])
      .map((x) => x.text || "")
      .join("")
      .trim();
    if (!a) throw new Error("AI javob qaytarmadi. Savolni boshqacha yozib ko'ring.");
    m.a = a;
  } catch (e) {
    console.error(e);
    m.err = /quota|exhausted|429/i.test(e.message)
      ? "Google kalitining limiti tugagan. Birozdan keyin urinib ko'ring."
      : /API key|invalid|403|401/i.test(e.message)
        ? "Gemini kaliti ishlamadi. Kalitni tekshiring."
        : /fetch|network/i.test(e.message)
          ? "Internet yo'q yoki Google javob bermadi."
          : e.message;
  }
  c.log.push(m);
  c.log = c.log.slice(-10);
  c.busy = !1;
  render();
}
function xAicMic() {
  let c =
      state._aic ||
      (state._aic = {
        log: [],
        q: "",
      }),
    SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return;
  if (c.rec) {
    try {
      c.rec.stop();
    } catch (e) {}
    return;
  }
  let r = new SR();
  r.lang = "uz-UZ";
  r.interimResults = !1;
  r.maxAlternatives = 1;
  c.rec = r;
  render();
  r.onresult = (e) => {
    let t = ((e.results[0] || [])[0] || {}).transcript || "";
    c.rec = null;
    if (t.trim()) xAicAsk(t);
    else render();
  };
  r.onerror = (e) => {
    c.rec = null;
    render();
    toast(e.error === "not-allowed" ? "Mikrofonga ruxsat bering" : "Ovoz tushunilmadi, qayta urinib ko'ring");
  };
  r.onend = () => {
    if (c.rec === r) {
      c.rec = null;
      render();
    }
  };
  try {
    r.start();
  } catch (e) {
    c.rec = null;
    render();
  }
}
function xAicStop() {
  let c = state._aic || {};
  c.audio && (c.audio.pause(), (c.audio = null));
  window.speechSynthesis && speechSynthesis.cancel();
  c.say = null;
}
async function xAicSay(i) {
  let c = state._aic || {},
    m = c.log && c.log[i];
  if (!m || !m.a) return;
  if (c.say === i) {
    xAicStop();
    render();
    return;
  }
  xAicStop();
  c.say = i;
  render();
  let txt = m.a
      .replace(/\*\*/g, "")
      .replace(/^\s*[-*•#]+\s*/gm, "")
      .replace(/\n+/g, ". ")
      .replace(/\s+/g, " ")
      .slice(0, 1500),
    key = xAiKey();
  try {
    if (!m.wav) {
      let r = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${encodeURIComponent(key)}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    {
                      text: "Quyidagi o'zbekcha matnni tinch, aniq ovozda o'qib ber: " + txt,
                    },
                  ],
                },
              ],
              generationConfig: {
                responseModalities: ["AUDIO"],
                speechConfig: {
                  voiceConfig: {
                    prebuiltVoiceConfig: {
                      voiceName: "Kore",
                    },
                  },
                },
              },
            }),
          },
        ),
        j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error((j.error && j.error.message) || "HTTP " + r.status);
      let p = ((((j.candidates || [])[0] || {}).content || {}).parts || []).find(
        (x) => x.inlineData || x.inline_data,
      );
      if (!p) throw new Error("ovoz yo'q");
      let d = p.inlineData || p.inline_data,
        rate = +(String(d.mimeType || d.mime_type).match(/rate=(\d+)/) || [0, 24000])[1],
        pcm = Uint8Array.from(atob(d.data), (ch) => ch.charCodeAt(0)),
        h = new DataView(new ArrayBuffer(44)),
        w = (o, s) => [...s].forEach((ch, k) => h.setUint8(o + k, ch.charCodeAt(0)));
      w(0, "RIFF");
      h.setUint32(4, 36 + pcm.length, !0);
      w(8, "WAVE");
      w(12, "fmt ");
      h.setUint32(16, 16, !0);
      h.setUint16(20, 1, !0);
      h.setUint16(22, 1, !0);
      h.setUint32(24, rate, !0);
      h.setUint32(28, rate * 2, !0);
      h.setUint16(32, 2, !0);
      h.setUint16(34, 16, !0);
      w(36, "data");
      h.setUint32(40, pcm.length, !0);
      m.wav = URL.createObjectURL(
        new Blob([h.buffer, pcm], {
          type: "audio/wav",
        }),
      );
    }
    if (c.say !== i) return;
    let au = new Audio(m.wav);
    c.audio = au;
    au.onended = () => {
      if (c.audio === au) {
        c.audio = null;
        c.say = null;
        render();
      }
    };
    await au.play();
  } catch (e) {
    console.error(e);
    if (c.say !== i) return;
    if (window.speechSynthesis) {
      let u = new SpeechSynthesisUtterance(txt),
        v =
          speechSynthesis.getVoices().find((x) => /^uz/i.test(x.lang)) ||
          speechSynthesis.getVoices().find((x) => /^tr/i.test(x.lang));
      v && ((u.voice = v), (u.lang = v.lang));
      u.onend = () => {
        if (c.say === i) {
          c.say = null;
          render();
        }
      };
      speechSynthesis.speak(u);
    } else {
      c.say = null;
      render();
      toast("Ovozli o'qib bo'lmadi");
    }
  }
}
document.addEventListener("input", (n) => {
  n.target && n.target.id === "aicQ" && state._aic && (state._aic.q = n.target.value);
});
document.addEventListener("keydown", (n) => {
  n.target &&
    n.target.id === "aicQ" &&
    n.key === "Enter" &&
    (n.preventDefault(), n.stopPropagation(), xAicAsk(n.target.value));
});

/* ---------- Hodisalar ---------- */
document.addEventListener(
  "click",
  async (n) => {
    let t = n.target.closest(
      "[data-x],[data-ptog],[data-pedit],[data-peday],[data-pepid],[data-ceamt],[data-ceprint],[data-lostd],[data-deadd],[data-phist],[data-setprice]",
    );
    if (!t) return;
    let d = t.dataset;
    if (d.ptog != null) {
      let l = xPromos().slice();
      l[+d.ptog] = Object.assign({}, l[+d.ptog], {
        on: !l[+d.ptog].on,
      });
      state.settings.promos = l;
      dbUpdate("meta", "settings", {
        promos: l,
      });
      render();
      return;
    }
    if (d.pedit != null) {
      state._peQ = "";
      xPromoEdit(+d.pedit);
      return;
    }
    if (d.peday != null) {
      xPeRead();
      let p = state._pe.p,
        k = +d.peday;
      p.days = (p.days || []).includes(k) ? p.days.filter((x) => x !== k) : [...(p.days || []), k];
      xPromoDraw();
      return;
    }
    if (d.pepid) {
      n.stopPropagation();
      xPeRead();
      let p = state._pe.p;
      p.pids = (p.pids || []).includes(d.pepid)
        ? p.pids.filter((x) => x !== d.pepid)
        : [...(p.pids || []), d.pepid];
      state._peFocus = !1;
      xPromoDraw();
      return;
    }
    if (d.ceamt) {
      let el = qsel("#ceAmt");
      el && (el.value = d.ceamt);
      return;
    }
    if (d.ceprint) {
      xCertPrint(d.ceprint);
      return;
    }
    if (d.lostd) {
      state._lostD = +d.lostd;
      render();
      return;
    }
    if (d.deadd) {
      state._deadD = +d.deadd;
      render();
      return;
    }
    if (d.phist) {
      xPriceHist(d.phist);
      return;
    }
    if (d.setprice) {
      if (!isOwner()) return;
      let [id, v] = d.setprice.split("|");
      dbUpdate("products", id, {
        price: num(v),
      });
      state.products[id] && (state.products[id].price = num(v));
      t.outerHTML = '<span class="pill ok">✓ ' + money(v) + "</span>";
      toast("Narx yangilandi");
      return;
    }
    let a = d.x;
    if (a === "pnew") {
      state._peQ = "";
      xPromoEdit(-1);
    } else if (a === "pesave") xPromoSave();
    else if (a === "pedel") {
      let l = xPromos().slice();
      l.splice(state._pe.i, 1);
      state.settings.promos = l;
      await dbUpdate("meta", "settings", {
        promos: l,
      });
      closeModal();
      render();
    } else if (a === "certpay") {
      openModal(
        "Sovg'a sertifikati",
        `<label class="l" for="certCode">Sertifikat kodi<input id="certCode" class="f num" placeholder="Skanerlang yoki yozing" autocomplete="off"></label>`,
        '<button class="btn" data-close="x">Bekor qilish</button><button class="btn primary" data-x="certok">Qo\'shish</button>',
      );
    } else if (a === "certok") xCertApply((qsel("#certCode") || {}).value);
    else if (a === "certoff") {
      state.pay = Object.assign({}, state.pay, {
        cert: null,
      });
      render();
    } else if (a === "cesell") xCertSell();
    else if (a === "cedo") xCertDo(t);
    else if (a === "labels") {
      state._lbQ = "";
      xLabelModal();
    } else if (a === "lbprint") xLabelPrint();
    else if (a === "lbclear") {
      state._lb.items = {};
      xLabelModal();
    } else if (a === "lball") {
      activeProducts().forEach((p) => {
        num(p.qty) > 0 && (state._lb.items[p.id] = Math.ceil(num(p.qty)));
      });
      xLabelModal();
    } else if (a === "lbgen") xLabelGen();
    else if (a === "bcsend") xBcSend(t);
    else if (a === "lostmsg") {
      state._bcTo = "lost";
      state._bcText =
        "Assalomu alaykum! Sizni Eco Aroma'da sog'indik \u{1F33F} Yangi tovarlar keldi — kirib keting, sizni kutib qolamiz!";
      render();
      setTimeout(() => {
        let e = qsel("#bcText");
        e &&
          e.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
      }, 50);
    } else if (a === "deadpromo") {
      let dd = state._deadD || 60,
        lim = Date.now() - dd * 864e5,
        S = xRange("sales", Date.now() - 180 * 864e5, 1 / 0),
        ls = {};
      (S.list || []).concat(state.sales || []).forEach((s) =>
        (s.items || []).forEach((i) => {
          ls[i.pid] = Math.max(ls[i.pid] || 0, s.ts);
        }),
      );
      let ids = activeProducts()
        .filter((p) => num(p.qty) > 0 && (ls[p.id] || 0) < lim && num(p.created || 0) < lim)
        .map((p) => p.id);
      state._peQ = "";
      xPromoEdit(-1, {
        name: "Chegirma — sotilmay turgan tovarlar",
        type: "pct",
        pct: 20,
        scope: "pids",
        pids: ids,
        from: fmtDay(Date.now()),
        to: fmtDay(Date.now() + 14 * 864e5),
      });
    }
  },
  !0,
);
document.addEventListener(
  "input",
  (n) => {
    let t = n.target;
    if (!t) return;
    if (t.id === "peQ") {
      xPeRead();
      state._peQ = t.value;
      state._peFocus = !0;
      clearTimeout(state._peT);
      state._peT = setTimeout(xPromoDraw, 250);
      return;
    }
    if (t.id === "lbQ") {
      state._lbQ = t.value;
      state._lbFocus = !0;
      clearTimeout(state._lbT);
      state._lbT = setTimeout(xLabelModal, 250);
      return;
    }
    if (t.dataset && t.dataset.lbn) {
      state._lb.items[t.dataset.lbn] = num(t.value);
      return;
    }
    if (t.id === "bcText") {
      state._bcText = t.value;
      return;
    }
  },
  !0,
);
document.addEventListener(
  "change",
  (n) => {
    let t = n.target;
    if (!t) return;
    if (t.id === "peType" || t.id === "peScope") {
      xPeRead();
      xPromoDraw();
      return;
    }
    if (t.id === "lbSize") {
      state._lb.size = t.value;
      isOwner() &&
        dbUpdate("meta", "settings", {
          lblSize: t.value,
        });
      return;
    }
    if (t.id === "lbName") {
      state._lb.name = t.checked;
      return;
    }
    if (t.id === "lbPrice") {
      state._lb.price = t.checked;
      return;
    }
    if (t.id === "bdPct" && isOwner()) {
      dbUpdate("meta", "settings", {
        bdayPct: Math.max(0, Math.min(100, num(t.value))),
      });
      toast("Saqlandi");
      return;
    }
    if (t.id === "bdRange" && isOwner()) {
      dbUpdate("meta", "settings", {
        bdayRange: Math.max(0, Math.min(15, num(t.value))),
      });
      toast("Saqlandi");
      return;
    }
    if (t.id === "minMargin" && isOwner()) {
      dbUpdate("meta", "settings", {
        minMargin: Math.max(0, Math.min(90, num(t.value))),
      });
      state.settings.minMargin = num(t.value);
      render();
      return;
    }
    if (t.id === "bcTo") {
      state._bcTo = t.value;
      return;
    }
  },
  !0,
);
document.addEventListener(
  "keydown",
  (n) => {
    if (n.key !== "Enter" || !n.target) return;
    let id = n.target.id;
    if (id === "certCode") {
      n.preventDefault();
      n.stopPropagation();
      xCertApply(n.target.value);
      return;
    }
    if (id === "peQ") {
      n.preventDefault();
      n.stopPropagation();
      let v = n.target.value.trim(),
        p = activeProducts().find((x) => hasBc(x, v));
      if (p) {
        xPeRead();
        let e = state._pe.p;
        (e.pids || []).includes(p.id) || (e.pids = [...(e.pids || []), p.id]);
        state._peQ = "";
        state._peFocus = !0;
        xPromoDraw();
      }
      return;
    }
    if (id === "lbQ") {
      n.preventDefault();
      n.stopPropagation();
      let v = n.target.value.trim(),
        p = activeProducts().find((x) => hasBc(x, v));
      if (p) {
        state._lb.items[p.id] = (state._lb.items[p.id] || 0) + 1;
        state._lbQ = "";
        state._lbFocus = !0;
        xLabelModal();
        toast(p.name + ": " + state._lb.items[p.id] + " ta");
      }
      return;
    }
  },
  !0,
);

/* ===== /Marketing va tahlil ===== */
/* ===== Rasm va AI ===== */
/* ---------- Rasm: fonni tozalash va AI bilan rasm ---------- */
var xAiBase = "./ai/",
  xSegP = null;
var xAiPresets = {
  oq: [
    "⬜ Oq studiya",
    "Professional e-commerce product photo of this exact product on a pure white seamless background, soft even studio lighting, subtle natural shadow under the product, product centered and fully visible, square 1:1 composition.",
  ],
  marmar: [
    "\u{1FAA8} Marmar stol",
    "Premium cosmetics product photo of this exact product standing on a light marble surface, soft natural window light, minimal luxury style, softly blurred neutral background, square 1:1 composition.",
  ],
  tabiat: [
    "\u{1F33F} Tabiat",
    "Fresh natural cosmetics product photo of this exact product surrounded by green leaves and a few delicate flowers, bright daylight, clean airy aesthetic, square 1:1 composition.",
  ],
  hammom: [
    "\u{1F6C1} Spa / hammom",
    "Product photo of this exact product in a bright modern bathroom spa setting, soft towels and candles gently blurred in the background, calm warm light, square 1:1 composition.",
  ],
  sovga: [
    "\u{1F381} Sovg'a",
    "Festive gift-style product photo of this exact product with elegant gift box, ribbon and soft bokeh lights, warm cozy mood, square 1:1 composition.",
  ],
};
var xAiKeep =
  " Keep the product itself exactly as in the reference photo: same shape, colors, packaging, label and text. Do not add any new text, logos or watermarks.";
function xLoadScript(src) {
  return new Promise((ok, no) => {
    let s = document.createElement("script");
    s.src = src;
    s.onload = ok;
    s.onerror = () => no(new Error("load"));
    document.head.appendChild(s);
  });
}
function xSeg() {
  if (xSegP) return xSegP;
  xSegP = (async () => {
    window.ort || (await xLoadScript(xAiBase + "ort.wasm.min.js"));
    ort.env.wasm.numThreads = 1;
    ort.env.wasm.wasmPaths = new URL(xAiBase, location.href).href;
    return ort.InferenceSession.create(new URL(xAiBase + "u2netp.onnx", location.href).href, {
      executionProviders: ["wasm"],
    });
  })();
  xSegP.catch(() => {
    xSegP = null;
  });
  return xSegP;
}
function xCv(w, h) {
  let c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}
function xImgEl(src) {
  return new Promise((ok, no) => {
    let i = new Image();
    i.onload = () => ok(i);
    i.onerror = () => no(new Error("img"));
    i.src = src;
  });
}
function xFileData(file, max) {
  return new Promise((ok, no) => {
    let u = URL.createObjectURL(file);
    xImgEl(u)
      .then((i) => {
        let k = Math.min(1, (max || 1280) / Math.max(i.naturalWidth, i.naturalHeight)),
          c = xCv(Math.round(i.naturalWidth * k), Math.round(i.naturalHeight * k));
        c.getContext("2d").drawImage(i, 0, 0, c.width, c.height);
        URL.revokeObjectURL(u);
        ok(c.toDataURL("image/jpeg", 0.92));
      })
      .catch((e) => {
        URL.revokeObjectURL(u);
        no(e);
      });
  });
}
async function xCleanCanvas(src, o) {
  o = o || {};
  let img = await xImgEl(src),
    W = img.naturalWidth,
    H = img.naturalHeight,
    k = Math.min(1, 1024 / Math.max(W, H));
  W = Math.round(W * k);
  H = Math.round(H * k);
  let base = xCv(W, H);
  base.getContext("2d").drawImage(img, 0, 0, W, H);
  let S = 320,
    N = S * S,
    inp = xCv(S, S),
    ix = inp.getContext("2d");
  ix.drawImage(base, 0, 0, S, S);
  let px = ix.getImageData(0, 0, S, S).data,
    mx = 1;
  for (let i = 0; i < N; i++) for (let c = 0; c < 3; c++) px[i * 4 + c] > mx && (mx = px[i * 4 + c]);
  let f = new Float32Array(3 * N),
    mean = [0.485, 0.456, 0.406],
    sd = [0.229, 0.224, 0.225];
  for (let i = 0; i < N; i++)
    for (let c = 0; c < 3; c++) f[c * N + i] = (px[i * 4 + c] / mx - mean[c]) / sd[c];
  let s = await xSeg(),
    r = await s.run({
      [s.inputNames[0]]: new ort.Tensor("float32", f, [1, 3, S, S]),
    }),
    out = r[s.outputNames[0]].data,
    lo = Infinity,
    hi = -Infinity;
  for (let i = 0; i < N; i++) {
    out[i] < lo && (lo = out[i]);
    out[i] > hi && (hi = out[i]);
  }
  let m = xCv(S, S),
    mc = m.getContext("2d"),
    md = mc.createImageData(S, S);
  for (let i = 0; i < N; i++) {
    let a = (out[i] - lo) / (hi - lo || 1);
    a = Math.min(1, Math.max(0, (a - 0.06) / 0.88));
    md.data[i * 4 + 3] = Math.round(a * 255);
  }
  mc.putImageData(md, 0, 0);
  let cut = xCv(W, H),
    cx = cut.getContext("2d");
  cx.drawImage(base, 0, 0);
  cx.globalCompositeOperation = "destination-in";
  cx.drawImage(m, 0, 0, W, H);
  let ad = cx.getImageData(0, 0, W, H).data,
    x0 = W,
    y0 = H,
    x1 = -1,
    y1 = -1;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++)
      if (ad[(y * W + x) * 4 + 3] > 40) {
        x < x0 && (x0 = x);
        x > x1 && (x1 = x);
        y < y0 && (y0 = y);
        y > y1 && (y1 = y);
      }
  if (x1 < 0) throw new Error("empty");
  let bw = x1 - x0 + 1,
    bh = y1 - y0 + 1,
    Z = o.size || 640,
    pad = Math.round(Z * 0.08),
    sc = Math.min((Z - 2 * pad) / bw, (Z - 2 * pad) / bh),
    dw = bw * sc,
    dh = bh * sc,
    oc = xCv(Z, Z),
    ox = oc.getContext("2d");
  ox.fillStyle = o.bg || "#ffffff";
  ox.fillRect(0, 0, Z, Z);
  ox.save();
  o.shadow !== !1 &&
    ((ox.shadowColor = "rgba(0,0,0,.16)"), (ox.shadowBlur = Z * 0.03), (ox.shadowOffsetY = Z * 0.012));
  ox.filter = "brightness(1.04) contrast(1.05) saturate(1.06)";
  ox.drawImage(cut, x0, y0, bw, bh, (Z - dw) / 2, (Z - dh) / 2, dw, dh);
  ox.restore();
  return oc;
}
async function xSquare(src, bg) {
  let i = await xImgEl(src),
    Z = Math.min(1024, Math.max(i.naturalWidth, i.naturalHeight)),
    c = xCv(Z, Z),
    x = c.getContext("2d"),
    k = Math.max(Z / i.naturalWidth, Z / i.naturalHeight);
  x.fillStyle = bg || "#ffffff";
  x.fillRect(0, 0, Z, Z);
  x.drawImage(
    i,
    (Z - i.naturalWidth * k) / 2,
    (Z - i.naturalHeight * k) / 2,
    i.naturalWidth * k,
    i.naturalHeight * k,
  );
  return c;
}
async function xCvSmall(c) {
  let b = await new Promise((r) => c.toBlob(r, "image/png"));
  return shrinkImage(b, 400);
}
function xImgBg() {
  return (state.settings || {}).imgBg || "#ffffff";
}
function xImgAuto() {
  return (state.settings || {}).imgAuto !== !1;
}
function xImgMsg(t) {
  let e = qsel("#mpImgMsg");
  e && (e.innerHTML = t || "");
}
function xImgShow(src) {
  let b = qsel("#mpImgBox");
  b && (b.innerHTML = `<img src="${src}" alt="">`);
}
function xImgTools() {
  return `<button type="button" class="btn sm" data-x="imgclean">✨ Fonni tozalash</button><button type="button" class="btn sm" data-x="imgai">\u{1F3A8} AI bilan rasm</button><span id="mpImgMsg" class="muted" style="font-size:12px"></span>`;
}
function xImgSrcNow() {
  if (state._mpOrig) return state._mpOrig;
  if (state.mpImg) return state.mpImg;
  let i = qsel("#mpImgBox img");
  return i ? i.src : "";
}
async function xImgClean() {
  let src = xImgSrcNow();
  if (!src) {
    toast("Avval rasm tanlang");
    return;
  }
  xImgMsg("⏳ Fon tozalanmoqda… (birinchi marta 10–30 soniya)");
  try {
    let c = await xCleanCanvas(src, {
      bg: xImgBg(),
    });
    state._mpPrev = state.mpImg !== void 0 ? state.mpImg : (qsel("#mpImgBox img") || {}).src;
    state.mpImg = await xCvSmall(c);
    xImgShow(state.mpImg);
    xImgMsg('✅ Tayyor. <button type="button" class="btn sm" data-x="imgundo">Asl rasmni qaytarish</button>');
  } catch (e) {
    console.error(e);
    xImgMsg("");
    toast(
      e.message === "empty" ? "Rasmda tovar topilmadi" : "Fonni tozalab bo'lmadi — internetni tekshiring",
    );
  }
}
function xAiPanel(ctx) {
  let has = ctx === "ad" ? !!state._adSrc : !!xImgSrcNow(),
    key = xAiKey();
  if (!key)
    return `<div class="note">AI bilan rasm yaratish uchun Google Gemini kaliti kerak. Uni <b>Aksiya va mijozlar → Rasm sozlamalari</b> bo'limida kiritasiz.</div>`;
  let p = state._aiP || "oq";
  return `<div style="display:grid;gap:8px">
 <div class="chips">${Object.entries(xAiPresets)
   .map(([k, v]) => `<button type="button" data-aip="${k}" aria-pressed="${p === k}">${v[0]}</button>`)
   .join("")}</div>
 ${has ? `<label style="display:flex;gap:6px;align-items:center"><input type="checkbox" id="aiUseImg" ${state._aiUse !== !1 ? "checked" : ""}> Mening rasmimdan foydalanish (tavsiya — tovar o'zgarmaydi)</label>` : "<div class=\"note\">Rasm yo'q — AI tovar nomidan rasm chizadi. Bunday rasm haqiqiy tovarga o'xshamasligi mumkin; mijozlarga ko'rsatishdan oldin tekshiring.</div>"}
 <input id="aiExtra" class="f" placeholder="Qo'shimcha istak (ixtiyoriy): masalan, pushti rangli fon" value="${esc(state._aiExtra || "")}">
 <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><button type="button" class="btn primary" data-x="aigen" data-ctx="${ctx}">\u{1F3A8} Yaratish</button><span class="muted" style="font-size:12px">1 rasm ≈ 500–900 so'm (Google hisobidan)</span></div>
 <div id="aiOut"></div></div>`;
}
async function xGemModel(key, fresh) {
  let st = state.settings || {};
  if (!fresh) {
    if (st.aiModel) return st.aiModel;
    if (state._gemModel) return state._gemModel;
  }
  let r = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models?pageSize=200&key=" + encodeURIComponent(key),
    ),
    j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error((j.error && j.error.message) || "HTTP " + r.status);
  let ms = (j.models || [])
      .filter(
        (m) =>
          /image/i.test(m.name) &&
          !/imagen/i.test(m.name) &&
          (m.supportedGenerationMethods || []).includes("generateContent"),
      )
      .map((m) => m.name.replace(/^models\//, "")),
    sc = (n) =>
      (/flash/.test(n) ? 20 : 0) +
      (/preview|exp/.test(n) ? -10 : 0) +
      (/pro/.test(n) ? -5 : 0) +
      parseFloat((n.match(/(\d+(\.\d+)?)/) || [0, 0])[1]);
  ms.sort((a, b) => sc(b) - sc(a));
  if (!ms.length) throw new Error("Bu kalitda rasm yaratadigan model topilmadi");
  return (state._gemModel = ms[0]);
}
async function xGemGen(prompt, img) {
  let key = xAiKey();
  if (!key) throw new Error("Gemini kaliti kiritilmagan");
  let model = await xGemModel(key),
    parts = [
      {
        text: prompt,
      },
    ];
  if (img) {
    let m = img.match(/^data:(.*?);base64,(.*)$/);
    m &&
      parts.push({
        inline_data: {
          mime_type: m[1],
          data: m[2],
        },
      });
  }
  let r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts,
            },
          ],
          generationConfig: {
            responseModalities: ["TEXT", "IMAGE"],
          },
        }),
      },
    ),
    j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error((j.error && j.error.message) || "HTTP " + r.status);
  let ps = (((j.candidates || [])[0] || {}).content || {}).parts || [],
    im = ps.find((x) => x.inlineData || x.inline_data);
  if (!im)
    throw new Error(
      "AI rasm qaytarmadi" +
        (ps
          .map((x) => x.text)
          .filter(Boolean)
          .join(" ")
          ? ": " +
            ps
              .map((x) => x.text)
              .filter(Boolean)
              .join(" ")
              .slice(0, 160)
          : ""),
    );
  let d = im.inlineData || im.inline_data;
  return `data:${d.mimeType || d.mime_type || "image/png"};base64,${d.data}`;
}
async function xImgToData(src, max) {
  let i = await xImgEl(src),
    k = Math.min(1, (max || 1024) / Math.max(i.naturalWidth, i.naturalHeight)),
    c = xCv(Math.round(i.naturalWidth * k), Math.round(i.naturalHeight * k));
  c.getContext("2d").drawImage(i, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", 0.9);
}
async function xAiGen(btn, ctx) {
  let out = qsel("#aiOut");
  if (!out) return;
  let p = xAiPresets[state._aiP || "oq"],
    extra = ((qsel("#aiExtra") || {}).value || "").trim(),
    use = qsel("#aiUseImg") ? qsel("#aiUseImg").checked : !1,
    src = use ? (ctx === "ad" ? state._adSrc : xImgSrcNow()) : "",
    nm = ctx === "ad" ? state._adName || "" : ((qsel("#mpName") || {}).value || "").trim(),
    cat = ctx === "ad" ? "" : ((qsel("#mpCat") || {}).value || "").trim(),
    prompt = src
      ? p[1] + xAiKeep
      : p[1].replace(
          "this exact product",
          `a cosmetics product: ${nm || "skin care product"}${cat ? " (" + cat + ")" : ""}`,
        ) + " No text on the image.";
  extra && (prompt += " Additional wish from the shop owner (may be in Uzbek): " + extra);
  btn && (btn.disabled = !0);
  out.innerHTML = '<div class="note">⏳ AI rasm chizmoqda… 10–40 soniya</div>';
  try {
    let res = await xGemGen(prompt, src ? await xImgToData(src, 1024) : null);
    state._aiRes = res;
    if (ctx === "ad") {
      out.innerHTML = `<img src="${res}" style="max-width:100%;border-radius:10px;border:1px solid var(--line)"><div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap"><button type="button" class="btn primary" data-x="aidl">⬇ Yuklab olish</button><button type="button" class="btn" data-x="aigen" data-ctx="ad">\u{1F504} Yana bitta</button></div>`;
    } else {
      let c = await xSquare(res, xImgBg());
      state._aiSmall = await xCvSmall(c);
      out.innerHTML = `<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><img src="${state._aiSmall}" style="width:140px;height:140px;object-fit:cover;border-radius:10px;border:1px solid var(--line)"><div style="display:grid;gap:6px"><button type="button" class="btn primary" data-x="aiuse">✅ Shu rasmni qo'yish</button><button type="button" class="btn" data-x="aigen" data-ctx="prod">\u{1F504} Yana bitta</button></div></div>`;
    }
  } catch (e) {
    console.error(e);
    out.innerHTML = `<div class="note" style="color:var(--danger)">Xato: ${esc(e.message || e)}</div>`;
  }
  btn && (btn.disabled = !1);
}
function xAdModal() {
  let ps = activeProducts().filter((p) => p.img);
  state._adSrc = state._adSrc || "";
  openModal(
    "AI bilan reklama rasmi",
    `<div class="note">Instagram yoki Telegram uchun chiroyli tovar rasmi. Tovarni tanlasangiz, uning rasmidan foydalaniladi. Rasmga yozuvni keyin Canva'da qo'shgan ma'qul — AI yozgan matn ko'pincha xato chiqadi.</div>
 <label class="l" for="adProd" style="margin-top:8px">Tovar<select id="adProd" class="f"><option value="">— tanlanmagan —</option>${ps.map((p) => `<option value="${esc(p.id)}" ${state._adPid === p.id ? "selected" : ""}>${esc(p.name)}</option>`).join("")}</select></label>
 <div style="margin-top:10px">${xAiPanel("ad")}</div>`,
  );
}
async function xImgBatch(btn) {
  if (!isOwner()) return;
  let l = activeProducts().filter((p) => p.img && !p.imgClean),
    n = 0,
    bad = 0;
  if (!l.length) {
    toast("Tozalanadigan rasm yo'q");
    return;
  }
  btn && (btn.disabled = !0);
  let msg = qsel("#aiBatchMsg");
  for (let p of l) {
    msg && (msg.textContent = `⏳ ${n + bad + 1} / ${l.length}: ${p.name}`);
    try {
      let c = await xCleanCanvas(p.img, {
          bg: xImgBg(),
        }),
        d = await xCvSmall(c);
      await dbSet("imgBackup", p.id, {
        img: p.img,
        ts: Date.now(),
      });
      await dbUpdate("products", p.id, {
        img: d,
        imgClean: !0,
      });
      n++;
    } catch (e) {
      console.error(e);
      bad++;
    }
  }
  msg &&
    (msg.textContent = `✅ ${n} ta rasm tozalandi${bad ? `, ${bad} tasini bo'lmadi` : ""}. Asl rasmlar zaxirada saqlandi.`);
  btn && (btn.disabled = !1);
}
function xImgSettings() {
  let st = state.settings || {},
    n = activeProducts().filter((p) => p.img && !p.imgClean).length,
    bg = xImgBg();
  return `<div class="panel" style="margin-top:14px"><div class="panel-h"><h2>\u{1F5BC} Rasm sozlamalari</h2><span class="spacer"></span><button class="btn sm primary" data-x="admodal">\u{1F3A8} Reklama rasmi yaratish</button></div><div class="panel-b" style="display:grid;gap:10px">
  <label style="display:flex;gap:8px;align-items:center"><input type="checkbox" id="aiAuto" ${xImgAuto() ? "checked" : ""}> Tovar rasmi yuklanganda fonini avtomatik tozalash va o'rtaga joylash</label>
  <div><div class="l" style="margin-bottom:6px">Rasm foni</div><div class="chips">${[
    ["#ffffff", "Oq"],
    ["#f3f4f6", "Och kulrang"],
    ["#fbf6ee", "Krem"],
    ["#eef6f1", "Och yashil"],
    ["#fdeef3", "Och pushti"],
  ]
    .map(
      ([c, t]) =>
        `<button type="button" data-aibg="${c}" aria-pressed="${bg === c}"><span style="display:inline-block;width:12px;height:12px;border-radius:3px;border:1px solid #ccc;background:${c};vertical-align:-2px"></span> ${t}</button>`,
    )
    .join("")}</div></div>
  <label class="l" for="aiKey">Google Gemini API kaliti (AI yordamchi va AI rasm uchun)<span class="inrow"><input id="aiKey" class="f" type="password" autocomplete="off" placeholder="${xAiKey() ? "•••• saqlangan" : "AIza…"}"><button type="button" class="btn sm" data-x="aikeysave">Saqlash va tekshirish</button></span></label>
  <div id="aiKeyMsg" class="muted" style="font-size:13px">${xAiKey() ? "Kalit saqlangan" + (st.aiModel ? " \xB7 model: " + esc(st.aiModel) : "") : "Kalitni <b>aistudio.google.com</b> saytidan olasiz (Get API key). Rasm yaratish pullik: Google'da to'lov (billing) yoqilgan bo'lishi kerak."}</div>
  ${n ? `<div class="note">${n} ta tovarning rasmi hali tozalanmagan. <button type="button" class="btn sm" data-x="aibatch">✨ Hammasini tozalash</button> <span id="aiBatchMsg"></span></div>` : ""}
 </div></div>`;
}
/* hodisalar */
document.addEventListener(
  "change",
  async (n) => {
    let t = n.target;
    if (!t) return;
    if (t.id === "mpImg" && t.files && t.files[0]) {
      n.stopImmediatePropagation();
      let f = t.files[0];
      t.value = "";
      try {
        state._mpOrig = await xFileData(f, 1280);
        state.mpImg = await shrinkImage(f, 400);
        xImgShow(state.mpImg);
        toast(`Rasm tayyor (${Math.round(state.mpImg.length / 1365)} KB)`);
        xImgAuto() && xImgClean();
      } catch (e) {
        console.error(e);
        toast("Rasmni o'qib bo'lmadi");
      }
      return;
    }
    if (t.id === "adProd") {
      state._adPid = t.value;
      let p = state.products[t.value];
      state._adSrc = (p && p.img) || "";
      state._adName = p ? p.name : "";
      xAdModal();
      return;
    }
    if (t.id === "aiAuto" && isOwner()) {
      dbUpdate("meta", "settings", {
        imgAuto: t.checked,
      });
      state.settings.imgAuto = t.checked;
      toast("Saqlandi");
      return;
    }
  },
  !0,
);
document.addEventListener(
  "click",
  async (n) => {
    n.target.closest('[data-act="mpimgdel"]') && (state._mpOrig = null);
    let t = n.target.closest("[data-x],[data-aip],[data-aibg]");
    if (!t) return;
    let d = t.dataset;
    if (d.aip) {
      state._aiP = d.aip;
      t.parentElement
        .querySelectorAll("[data-aip]")
        .forEach((b) => b.setAttribute("aria-pressed", String(b === t)));
      return;
    }
    if (d.aibg) {
      if (!isOwner()) return;
      dbUpdate("meta", "settings", {
        imgBg: d.aibg,
      });
      state.settings.imgBg = d.aibg;
      render();
      return;
    }
    let a = d.x;
    if (a === "imgclean") xImgClean();
    else if (a === "imgundo") {
      state.mpImg = state._mpPrev;
      state.mpImg ? xImgShow(state.mpImg) : xImgShow("");
      xImgMsg("Asl rasm qaytarildi");
    } else if (a === "imgai") {
      let box = qsel("#mpAi");
      if (!box) return;
      box.hidden = !box.hidden;
      box.hidden || (box.innerHTML = xAiPanel("prod"));
    } else if (a === "aigen") {
      state._aiExtra = (qsel("#aiExtra") || {}).value || "";
      qsel("#aiUseImg") && (state._aiUse = qsel("#aiUseImg").checked);
      xAiGen(t, d.ctx || "prod");
    } else if (a === "aiuse") {
      state.mpImg = state._aiSmall;
      xImgShow(state.mpImg);
      let b = qsel("#mpAi");
      b && ((b.innerHTML = ""), (b.hidden = !0));
      xImgMsg("✅ AI rasm qo'yildi — \xABSaqlash\xBB ni bosing");
    } else if (a === "aidl" && state._aiRes) {
      let l = document.createElement("a");
      l.href = state._aiRes;
      l.download = `eco-aroma-reklama-${Date.now()}.png`;
      document.body.appendChild(l);
      l.click();
      l.remove();
    } else if (a === "aicask") xAicAsk((qsel("#aicQ") || {}).value);
    else if (a === "aicq") xAicAsk(xAicQuick[+d.i][1]);
    else if (a === "aicmic") xAicMic();
    else if (a === "aicsay") xAicSay(+d.i);
    else if (a === "aicclr") {
      xAicStop();
      state._aic = {
        log: [],
        q: "",
      };
      render();
    } else if (a === "admodal") xAdModal();
    else if (a === "aibatch") xImgBatch(t);
    else if (a === "aikeysave") {
      let v = ((qsel("#aiKey") || {}).value || "").trim(),
        m = qsel("#aiKeyMsg");
      if (!v && !xAiKey()) {
        toast("Kalitni kiriting");
        return;
      }
      let key = v || xAiKey();
      m && (m.textContent = "⏳ Tekshirilmoqda…");
      try {
        state._gemModel = null;
        let mdl = await xGemModel(key, !0);
        await xAiSave(key, {
          aiModel: mdl,
        });
        state.settings.aiModel = mdl;
        m && (m.innerHTML = `✅ Kalit ishlayapti \xB7 model: <b>${esc(mdl)}</b>`);
      } catch (e) {
        if (/rasm yaratadigan model topilmadi/.test(e.message)) {
          await xAiSave(key, {});
          state._gemTxt = null;
          m &&
            (m.innerHTML =
              "✅ Kalit saqlandi. AI yordamchi ishlaydi. Rasm yaratish uchun Google'da to'lov (billing) yoqilishi kerak.");
          return;
        }
        m && (m.innerHTML = `<span style="color:var(--danger)">Kalit ishlamadi: ${esc(e.message)}</span>`);
      }
    }
  },
  !0,
);

/* ===== /Rasm va AI ===== */
function pageSettings() {
  let n = state.settings;
  return `<h1 class="page">Sozlamalar</h1>
  <div class="panel" style="max-width:640px"><div class="panel-b" style="display:grid;gap:12px">
   <label class="l" for="setName">Do'kon nomi (chekda chiqadi)<input id="setName" class="f" value="${esc(n.shopName || "")}"></label>
   <label class="l" for="setPhone">Do'kon telefoni (chek pastida)<input id="setPhone" class="f" value="${esc(n.phone || "")}"></label>
   <label class="l" for="setFooter">Chek oxiridagi yozuv<input id="setFooter" class="f" value="${esc(n.footer || "")}"></label>
   <label class="l" for="setPaper">Chek qog'ozi kengligi<select id="setPaper" class="f"><option value="80" ${n.paper !== "58" ? "selected" : ""}>80 mm</option><option value="58" ${n.paper === "58" ? "selected" : ""}>58 mm</option></select></label>
   <label style="display:flex;gap:8px;align-items:center"><input type="checkbox" id="setAuto" ${n.autoPrint ? "checked" : ""}> Sotgandan keyin chekni avtomatik chiqarish</label>
   <label style="display:flex;gap:8px;align-items:center"><input type="checkbox" id="setNeg" ${n.allowNegative !== !1 ? "checked" : ""}> Omborda yo'q tovarni minusga sotishga ruxsat</label>
   <label style="display:flex;gap:8px;align-items:center"><input type="checkbox" id="setSPrice" ${n.sellerPrice ? "checked" : ""}> Sotuvchi narxni o'zgartira olsin</label>
   <label class="l" for="setCb">Keshbek foizi (%) \u2014 har xariddan mijozga yoziladi, 0 = o'chiq<input id="setCb" class="f num" value="${num(n.cashbackPct || 0)}" inputmode="decimal"></label>
   <label class="l" for="setMaxDisc">Sotuvchi bera oladigan eng katta chegirma (%)<input id="setMaxDisc" class="f num" value="${num(n.maxDisc ?? 10)}" inputmode="numeric"></label>
   <div><button class="btn primary" data-act="savesettings">Saqlash</button></div>
  </div></div>
  ${themeSettingsHtml()}
  <div class="panel" style="max-width:640px;margin-top:14px"><div class="panel-h"><h2>Xodimlar (login va parol)</h2><span class="spacer"></span><button class="btn sm primary" data-act="addstaff">+ Yangi profil</button></div>
   <div class="tbl-wrap"><table class="t"><thead><tr><th>Ism</th><th>Login</th><th>Roli</th><th></th></tr></thead><tbody>
   ${(n.staff || []).map((e, t) => `<tr><td><b>${esc(e.name)}</b>${e.off ? ' <span class="pill">yopilgan</span>' : ""}</td><td class="num">${esc(e.login || "\u2014")}</td><td>${e.role === "owner" ? "Rahbar" : "Sotuvchi"}</td><td class="r"><button class="btn sm" data-editstaff="${t}">Tahrirlash</button>${e.main ? "" : ` <button class="btn sm ${e.off ? "" : "danger"}" data-staffoff="${t}">${e.off ? "Ochish" : "Yopish"}</button>`}</td></tr>`).join("")}
   </tbody></table></div><div class="panel-b note" style="margin:0 14px 14px">Profilni faqat rahbar yaratadi va parolini o'zgartiradi. Har bir chekda kim sotgani yoziladi.</div></div>
  <div class="panel" style="max-width:640px;margin-top:14px"><div class="panel-h"><h2>Zaxira nusxa (backup)</h2></div><div class="panel-b" style="display:grid;gap:12px">
   <div class="note">Hamma ma'lumot Google serverida (Firebase) saqlanadi va istalgan qurilmadan ko'rinadi. Ma'lumotni o'chirish taqiqlangan \u2014 tovar faqat arxivga olinadi. Qo'shimcha xavfsizlik uchun haftada bir marta zaxira faylini olib qo'ying.
   ${(() => {
     let e = store.get("eco.lastBackup", 0);
     return e ? `<br>Oxirgi zaxira: <b>${fmtDateTime(e)}</b>` : "<br><b>Hali zaxira olinmagan.</b>";
   })()}</div>
   <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn primary" data-act="backup">Zaxira faylini yuklab olish</button>
   <label class="btn" for="impFile" style="display:inline-block">Zaxiradan tiklash\u2026<input type="file" id="impFile" accept=".json,.gz,application/json,application/gzip" hidden></label>
   <label class="btn" for="chkFile" style="display:inline-block">🔍 Zaxira faylini tekshirish…<input type="file" id="chkFile" accept=".json,.gz,application/json,application/gzip" hidden></label></div>
  </div></div>
  <div class="panel" style="max-width:640px;margin-top:14px"><div class="panel-b" style="display:grid;gap:12px">
   <div class="note"><b>Chek printeri.</b> \xABChekni chiqarish\xBB tugmasi chop etish oynasini ochadi \u2014 chek printeringizni tanlang. Kompyuterda \xABEco Kassa.bat\xBB orqali ochsangiz, chek oynasiz, to'g'ridan-to'g'ri asosiy (default) printerga chiqadi. Windows'da chek printerini \xABAsosiy printer\xBB qilib qo'ying.</div>
   <div class="note"><b>Shtrix-kod skaneri.</b> \xABSotuv\xBB sahifasidagi qidiruv maydoni doim faol turadi. Skaner kodni o'qisa, tovar savatga o'zi tushadi. Yangi tovarni qo'shishda \xABShtrix-kod\xBB maydoniga bosib, skanerni tovarga tuting.</div>
  </div></div>${xRcpPanel()}${xLblPanel()}`;
}
function openModal(n, e, t) {
  qsel("#modalRoot").innerHTML =
    `<div class="modal-bg" data-close="bg"><div class="modal" role="dialog" aria-modal="true" aria-label="${esc(n)}"><div class="mh"><h3>${esc(n)}</h3><button class="btn sm" data-close="x" aria-label="Yopish">\u2715</button></div><div class="mb">${e}</div>${t ? `<div class="mf">${t}</div>` : ""}</div></div>`;
  let i = qsel("#modalRoot input, #modalRoot select");
  i && i.focus();
}
var closeModal = () => {
  qsel("#modalRoot").innerHTML = "";
};
qsel("#modalRoot").addEventListener("click", (n) => {
  let e = n.target.closest("[data-close]");
  e && (e.dataset.close === "x" || n.target === e) && closeModal();
});
document.addEventListener("keydown", (n) => {
  n.key === "Escape" && qsel("#modalRoot").innerHTML && closeModal();
});
function jy(n) {
  ((n = n || {}),
    (state.mpImg = void 0),
    (state._mpOrig = null),
    (state._mpPrev = void 0),
    (state.mpBars = [...(n.barcodes || [])]),
    (state.mpBarsPid = n.id || ""),
    openModal(
      n.id ? "Tovarni tahrirlash" : "Yangi tovar",
      `<div class="fg">
    <div class="imgedit"><span id="mpImgBox">${n.img ? `<img src="${n.img}" alt="">` : `<span class="ph">Rasm yo'q</span>`}</span>
      <span style="display:grid;gap:6px"><label class="btn" for="mpImg" style="display:inline-block;text-align:center">\u{1F4F7} Rasm olish / tanlash<input type="file" id="mpImg" accept="image/*" hidden></label><button type="button" class="btn sm" data-act="mpimgdel">Rasmni olib tashlash</button>${xImgTools()}</span></div><div id="mpAi" style="grid-column:1/-1" hidden></div>
    <label class="l" for="mpName" style="grid-column:1/-1">Nomi<input id="mpName" class="f" value="${esc(n.name || "")}"></label>
    <label class="l" for="mpBar">Shtrix-kod<span class="inrow"><input id="mpBar" class="f num" value="${esc(n.barcode || "")}" placeholder="Skanerlang">${hasCamScanner() ? `<button type="button" class="btn sm" data-act="mpbarcam" aria-label="Kamera bilan o'qish">\u{1F4F7}</button>` : ""}<button type="button" class="btn sm" data-x="mpcode" title="Kodi yo'q tovarga kassa o'zi kod beradi">\u{1F522} Kod berish</button></span><span class="muted" style="font-size:12px;font-weight:400">Bo'sh qolsa, saqlashda kassa o'zi kod beradi</span></label>
    <div style="grid-column:1/-1"><div class="l">Qo'shimcha shtrix-kodlar <span class="muted" style="font-weight:400">— shu tovar boshqa zavodda ishlab chiqarilgan bo'lsa</span></div><div id="mpBarsBox" style="display:flex;gap:6px;flex-wrap:wrap;margin:6px 0">${mpBarsChips()}</div><span class="inrow"><input id="mpBarAdd" class="f num" placeholder="Skanerlang yoki yozib Enter bosing" autocomplete="off"><button type="button" class="btn sm" data-mpbar="add">+ Qo'shish</button>${hasCamScanner() ? '<button type="button" class="btn sm" data-mpbar="cam" aria-label="Kamera bilan o\'qish">\u{1F4F7}</button>' : ""}</span></div>
    <label class="l" for="mpCat">Toifa<input id="mpCat" class="f" value="${esc(n.cat || "")}" placeholder="Atir, gel, kosmetika\u2026"></label>
    ${xCan("seeCost") ? `<label class="l" for="mpCost">Kirim narxi<input id="mpCost" class="f num" value="${n.cost ?? ""}" inputmode="numeric"></label>` : `<input type="hidden" id="mpCost" value="${n.cost ?? ""}">`}
    <label class="l" for="mpPrice">Sotuv narxi<input id="mpPrice" class="f num" value="${n.price ?? ""}" inputmode="numeric"></label>
    <label class="l" for="mpQty">${n.id ? "Haqiqiy qoldiq (sanab chiqilgan)" : "Boshlang'ich qoldiq (dona)"}<input id="mpQty" class="f num" value="${n.qty ?? ""}" inputmode="decimal" ${xCan("editStock") ? "" : "readonly title=\"Qoldiqni o'zgartirishga ruxsat yo'q \u2014 kirim orqali qo'shiladi\""}></label>
    ${n.id ? `<label class="l" for="mpWhy">Qoldiq o'zgarsa \u2014 sababi<input id="mpWhy" class="f" placeholder="Inventarizatsiya, singan, qaytdi\u2026"></label>` : ""}
    ${xExpField(n)}
    <label class="l" for="mpMin">Kam qoldi deb ogohlantirish (dona)<input id="mpMin" class="f num" value="${n.min ?? 3}" inputmode="numeric"></label></div>`,
      `${n.id ? `<button class="btn danger" data-delp="${esc(n.id)}">Arxivga olish</button><span class="spacer"></span>` : ""}<button class="btn" data-close="x">Bekor qilish</button><button class="btn primary" data-savep="${esc(n.id || "")}">Saqlash</button>`,
    ));
}
function Ky(n) {
  ((n = n || {}),
    openModal(
      n.id ? "Mijozni tahrirlash" : "Yangi mijoz",
      `<div class="fg">
   <label class="l" for="mcName">Ism<input id="mcName" class="f" value="${esc(n.name || "")}"></label>
   <label class="l" for="mcPhone">Telefon<input id="mcPhone" class="f num" value="${esc(n.phone || "")}" placeholder="+998"></label>
   <label class="l" for="mcDisc">Doimiy chegirma (%)<input id="mcDisc" class="f num" value="${n.discount ?? ""}" inputmode="decimal" placeholder="0"></label>
   ${n.id || !isOwner() ? "" : `<label class="l" for="mcDebt">Eski qarzi (bo'lsa)<input id="mcDebt" class="f num" inputmode="numeric" placeholder="0"></label>`}
   <label class="l" for="mcBday">Tug'ilgan kuni (yilini taxminiy qo'ysangiz ham bo'ladi)<input id="mcBday" type="date" class="f" value="${esc(n.bday || "")}"></label>
   <label class="l" for="mcNote" style="grid-column:1/-1">Izoh<input id="mcNote" class="f" value="${esc(n.note || "")}"></label></div>`,
      `<button class="btn" data-close="x">Bekor qilish</button><button class="btn primary" data-savec="${esc(n.id || "")}">Saqlash</button>`,
    ));
}
function OT(n) {
  let e = state.clients[n];
  if (!e) return;
  let t = state.sales.filter((s) => s.clientId === n),
    i = state.payments.filter((s) => s.kind === "client" && s.refId === n),
    r = [
      ...t.map((s) => ({
        ts: s.ts,
        t: `Xarid \u2116${s.no || ""} \xB7 ${money(s.total)}`,
        d: num(s.debt) ? "+" + money(s.debt) : "",
      })),
      ...i.map((s) => ({
        ts: s.ts,
        t: `To'lov${s.note ? " \xB7 " + s.note : ""}`,
        d: "\u2212" + money(s.amount),
        p: s,
      })),
    ].sort((s, o) => o.ts - s.ts);
  openModal(
    e.name,
    `<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"><span class="num">${esc(e.phone || "")}</span>${num(e.discount) ? `<span class="pill ok">${num(e.discount)}% chegirma</span>` : ""}${e.tgId ? '<span class="pill ok">Telegram botda</span>' : ""}<span class="spacer"></span>${num(e.cashback) > 0 ? `<span class="pill ok num">Keshbek: ${money(e.cashback)}</span>` : ""}${num(e.debt) > 0 ? `<span class="pill debt num">Qarzi: ${money(e.debt)}</span>` : `<span class="pill ok">Qarzi yo'q</span>`}</div>
   <div class="tbl-wrap"><table class="t"><thead><tr><th>Sana</th><th>Amal</th><th class="r">Qarzga</th></tr></thead><tbody>${r.map((s) => `<tr><td class="num">${fmtDateTime(s.ts)}</td><td>${esc(s.t)}${s.p ? xPayBtn(s.p) : ""}</td><td class="r num">${s.d}</td></tr>`).join("") || `<tr><td colspan="3" class="muted">Tarix yo'q</td></tr>`}</tbody></table></div>`,
    `<button class="btn" data-editc="${esc(n)}">Tahrirlash</button><span class="spacer"></span>${num(e.debt) > 0 ? `<button class="btn warn" data-cpay="${esc(n)}">To'lov qabul qilish</button>` : ""}<button class="btn primary" data-sellto="${esc(n)}">Shu mijozga sotish</button>`,
  );
}
function Gy(n, e) {
  let t = n === "client" ? state.clients[e] : state.suppliers[e];
  t &&
    openModal(
      n === "client" ? `${t.name} \u2014 qarz to'lovi` : `${t.name} \u2014 men to'lov qildim`,
      `<div class="note">Hozirgi qarz: <b class="num">${money(t.debt)}</b> so'm</div>
   <div class="fg"><label class="l" for="pyAmt">Summa<input id="pyAmt" class="f num" inputmode="numeric" value="${Math.max(0, num(t.debt))}"></label>
   <label class="l" for="pyType">Turi<select id="pyType" class="f"><option>Naqd</option><option>Karta / Click</option><option>Bank o'tkazma</option></select></label></div>
   <label class="l" for="pyNote">Izoh<input id="pyNote" class="f"></label>`,
      `<button class="btn" data-close="x">Bekor qilish</button><button class="btn primary" data-dopay="${n}|${esc(e)}">Saqlash</button>`,
    );
}
function VT(n) {
  ((n = n || {}),
    openModal(
      n.id ? "Yetkazib beruvchini tahrirlash" : "Yangi yetkazib beruvchi",
      `<div class="fg"><label class="l" for="msName">Nomi<input id="msName" class="f" value="${esc(n.name || "")}"></label>
   <label class="l" for="msPhone">Telefon<input id="msPhone" class="f num" value="${esc(n.phone || "")}"></label>
   ${n.id ? "" : `<label class="l" for="msDebt">Hozirgi qarzim (bo'lsa)<input id="msDebt" class="f num" inputmode="numeric" placeholder="0"></label>`}</div>`,
      `<button class="btn" data-close="x">Bekor qilish</button><button class="btn primary" data-saves="${esc(n.id || "")}">Saqlash</button>`,
    ));
}
function LT(n) {
  let e = state.suppliers[n];
  if (!e) return;
  let t = state.purchases.filter((s) => s.supplierId === n),
    i = state.payments.filter((s) => s.kind === "supplier" && s.refId === n),
    r = [
      ...t.map((s) => ({
        ts: s.ts,
        t: `Kirim: ${(s.items || []).length} xil tovar \xB7 ${money(s.total)}`,
        d: num(s.debt) ? "+" + money(s.debt) : "",
      })),
      ...i.map((s) => ({
        ts: s.ts,
        t: `To'lov${s.note ? " \xB7 " + s.note : ""}`,
        d: "\u2212" + money(s.amount),
        p: s,
      })),
    ].sort((s, o) => o.ts - s.ts);
  openModal(
    e.name,
    `<div style="display:flex;gap:8px;align-items:center"><span class="num">${esc(e.phone || "")}</span><span class="spacer"></span>${num(e.debt) > 0 ? `<span class="pill debt num">Mening qarzim: ${money(e.debt)}</span>` : `<span class="pill ok">Qarz yo'q</span>`}</div>
   <div class="tbl-wrap"><table class="t"><thead><tr><th>Sana</th><th>Amal</th><th class="r">Qarzga</th></tr></thead><tbody>${r.map((s) => `<tr><td class="num">${fmtDateTime(s.ts)}</td><td>${esc(s.t)}${s.p ? xPayBtn(s.p) : ""}</td><td class="r num">${s.d}</td></tr>`).join("") || `<tr><td colspan="3" class="muted">Tarix yo'q</td></tr>`}</tbody></table></div>`,
    `<span class="spacer"></span>${num(e.debt) > 0 ? `<button class="btn warn" data-spay="${esc(n)}">To'lov qildim</button>` : ""}<button class="btn primary" data-intakefor="${esc(n)}">Yangi kirim</button>`,
  );
}
var intake = null;
function openIntake(n) {
  ((intake =
    intake && intake.open && !intake.fixOf
      ? intake
      : {
          open: !0,
          supplierId: n || "",
          lines: [],
          paid: "",
        }),
    n && (intake.supplierId = n),
    renderIntakeModal());
}
function renderIntakeModal() {
  let n = Object.values(state.suppliers).sort((t, i) => (t.name || "").localeCompare(i.name || "")),
    e = intake.lines.reduce((t, i) => t + num(i.qty) * num(i.cost), 0);
  openModal(
    intake.fixOf ? "\u270F\uFE0F Kirimni tuzatish" : "Kirim \u2014 tovar qabul qilish",
    `${intake.fixOf ? `<div class="note" style="margin-bottom:8px">Asl kirim: <b>${fmtDateTime(intake.fixSrc.ts)}</b> \xB7 qabul qilgan: <b>${esc(intake.fixSrc.seller || "")}</b>${isOwner() ? "" : ` \xB7 tuzatish uchun qoldi: <b>${xFixLeftTxt(intake.fixSrc)}</b>`}. Soni, narxi, muddatni to'g'rilang, keraksiz tovarni \xD7 bilan olib tashlang. Qoldiq va qarz farq bo'yicha o'zi to'g'rilanadi.</div><label class="l" for="fxWhyIn" style="margin-bottom:8px">Tuzatish sababi (majburiy)<input id="fxWhyIn" class="f" value="${esc(intake.why || "")}" placeholder="Masalan: soni xato yozilgan"></label>` : `<div class="note" style="margin-bottom:8px">\u{1F464} Qabul qiluvchi: <b>${esc(state.seller || "")}</b> \xB7 ${fmtDateTime(Date.now())}</div>`}<label class="l" for="inSup">Yetkazib beruvchi<select id="inSup" class="f"><option value="">\u2014 tanlang \u2014</option>${n.map((t) => `<option value="${esc(t.id)}" ${t.id === intake.supplierId ? "selected" : ""}>${esc(t.name)}</option>`).join("")}</select></label>
   <label class="l" for="inFind">Tovar qo'shish (nomi yoki shtrix-kod)<input id="inFind" class="f" autocomplete="off" placeholder="Qidirish yoki skanerlash"></label><div id="inSug"></div>
   <div class="tbl-wrap"><table class="t"><thead><tr><th>Tovar</th><th class="r">Soni</th><th class="r">Kirim narxi</th><th>Yaroqlilik muddati</th><th class="r">Summa</th><th></th></tr></thead><tbody>
   ${intake.lines.map((t, i) => `<tr><td>${esc(t.name)}</td><td class="r"><input class="f num" style="width:80px;text-align:right" data-iq="${i}" value="${t.qty}"></td><td class="r"><input class="f num" style="width:110px;text-align:right" data-ic="${i}" value="${t.cost}"></td><td><input type="date" class="f" style="width:150px" data-iexp="${i}" value="${esc(t.exp || "")}"></td><td class="r num">${money(num(t.qty) * num(t.cost))}</td><td><button class="btn sm danger" data-irm="${i}" aria-label="Olib tashlash">\xD7</button></td></tr>`).join("") || `<tr><td colspan="6" class="muted">Tovar qo'shilmagan</td></tr>`}
   </tbody></table></div>
   <div class="fg"><div class="note">Jami: <b class="num">${money(e)}</b> so'm</div><label class="l" for="inPaid">Hozir to'ladim<input id="inPaid" class="f num" value="${esc(intake.paid)}" inputmode="numeric" placeholder="0"></label></div>
   <div class="note">Qolgan <b class="num">${money(Math.max(0, e - num(intake.paid)))}</b> so'm yetkazib beruvchiga qarzimga yoziladi. Tovarlar qoldig'i ko'payadi.</div>`,
    `<button class="btn" data-act="intakecancel">Bekor qilish</button><button class="btn primary" data-act="intakesave" ${!intake.supplierId || !intake.lines.length ? "disabled" : ""}>${intake.fixOf ? "Tuzatishni saqlash" : "Kirimni saqlash"}</button>`,
  );
}
function Wy(n) {
  let e = n >= 0 ? state.settings.staff[n] : null;
  openModal(
    e ? `${e.name} \u2014 profil` : "Yangi profil",
    `<div class="fg">
   <label class="l" for="stName">Ismi<input id="stName" class="f" value="${esc(e ? e.name : "")}"></label>
   <label class="l" for="stLogin">Login (lotin harflari, raqam)<input id="stLogin" class="f" autocomplete="off" autocapitalize="none" value="${esc((e && e.login) || "")}"></label>
   <label class="l" for="stRole">Roli<select id="stRole" class="f" ${e && e.main ? "disabled" : ""}><option value="seller" ${!e || e.role !== "owner" ? "selected" : ""}>Sotuvchi</option><option value="owner" ${e && e.role === "owner" ? "selected" : ""}>Rahbar</option></select></label>
   <label class="l" for="stPw">${e ? "Yangi parol (o'zgartirmasangiz bo'sh qoldiring)" : "Parol (kamida 6 belgi)"}<input id="stPw" class="f" type="password" autocomplete="new-password"></label>
   <label class="l" for="stPw2">Parolni takrorlang<input id="stPw2" class="f" type="password" autocomplete="new-password"></label></div>
   ${xPermForm(e)}
   <div class="note">Rahbar profili hamma bo'limlarni ko'radi va boshqaradi. Sotuvchi faqat sotadi, qoldiqni o'zgartira olmaydi.</div>`,
    `<button class="btn" data-close="x">Bekor qilish</button><button class="btn primary" data-act="savestaff" data-ix="${n}">Saqlash</button>`,
  );
}
async function MT(n) {
  if (!isOwner()) {
    toast("Faqat rahbar");
    return;
  }
  let e = [...(state.settings.staff || [])],
    t = n >= 0 ? e[n] : null,
    i = qsel("#stName").value.trim(),
    r = normText(qsel("#stLogin").value),
    s = t && t.main ? "owner" : qsel("#stRole").value,
    o = qsel("#stPw").value,
    c = qsel("#stPw2").value;
  if (!i) {
    toast("Ismini yozing");
    return;
  }
  if (!/^[a-z0-9._-]{3,30}$/.test(r)) {
    toast("Login 3\u201330 belgi: lotin harflari, raqam, . _ -");
    return;
  }
  if (e.some((f, p) => p !== n && normText(f.login) === r)) {
    toast("Bu login band \u2014 boshqasini tanlang");
    return;
  }
  if (!t || o) {
    if (o.length < 6) {
      toast("Parol kamida 6 belgi bo'lsin");
      return;
    }
    if (o !== c) {
      toast("Parollar bir xil emas");
      return;
    }
    if (s === "owner" && !xStrong(o)) {
      toast("Rahbar paroli kamida 8 belgi bo'lsin va harf hamda raqam aralash bo'lsin");
      return;
    }
  }
  if (t && t.role === "owner" && s !== "owner" && e.filter((f) => f.role === "owner" && !f.off).length < 2) {
    toast("Kamida bitta rahbar qolishi kerak");
    return;
  }
  let l = qsel('[data-act="savestaff"]');
  l && (l.disabled = !0);
  let h = {
    ...(t || {
      id: newId(),
      created: Date.now(),
    }),
    name: i,
    login: r,
    role: s,
    perms: xPermRead(),
  };
  if (o) {
    let f = await hashPassword(o);
    ((h = {
      ...h,
      ...f,
    }),
      delete h.pinHash,
      h.main &&
        trackWrite(
          fsSetDoc(fsDoc(fire.db, "secret", "owner"), {
            pinHash: await legacyHash(o),
          }),
        ));
  }
  (n < 0 ? e.push(h) : (e[n] = h),
    await dbUpdate("meta", "settings", {
      staff: e,
    }),
    closeModal(),
    toast("Saqlandi"),
    t && t.id && state.meId === t.id && ((state.seller = i), renderHeader()));
}
async function FT() {
  openModal("Qoldiq o'zgarishlari tarixi", '<div class="muted">Yuklanmoqda\u2026</div>');
  let e = (
    await fsGetDocs(fsQuery(fsCollection(fire.db, "stockLog"), fsOrderBy("ts", "desc"), fsLimit(300)))
  ).docs.map((t) => t.data());
  qsel("#modalRoot .mb").innerHTML =
    `<div class="note">Sotuv va kirimdan tashqari qoldiqqa qilingan har bir o'zgarish shu yerda yoziladi.</div><div class="tbl-wrap"><table class="t"><thead><tr><th>Sana</th><th>Tovar</th><th class="r">Edi \u2192 Bo'ldi</th><th>Kim</th><th>Sababi</th></tr></thead><tbody>${e.map((t) => `<tr><td class="num">${fmtDateTime(t.ts)}</td><td>${esc(t.name)}</td><td class="r num">${money(t.from)} \u2192 ${money(t.to)}</td><td>${esc(t.who || "")}</td><td>${esc(t.why || "")}</td></tr>`).join("") || `<tr><td colspan="5" class="muted">Hali o'zgarish yo'q</td></tr>`}</tbody></table></div>`;
}
function receiptText(n) {
  let t = "-".repeat(32),
    i = state.settings,
    r = (c, l) => {
      ((c = String(c)), (l = String(l)));
      let h = Math.max(1, 32 - c.length - l.length);
      return c + " ".repeat(h) + l;
    },
    s = (c) => {
      c = String(c);
      let l = Math.max(0, Math.floor((32 - c.length) / 2));
      return " ".repeat(l) + c;
    },
    o = [
      s((i.shopName || "Eco Aroma").toUpperCase()),
      r("Chek \u2116:", n.no),
      r("Kassa:", n.seller || ""),
      r("Vaqt:", fmtDateTime(n.ts)),
    ];
  return (
    n.clientName &&
      (o.push(r("Mijoz:", n.clientName)),
      n.clientPhone && o.push(r("Tel:", n.clientPhone)),
      o.push(r("Avvalgi qarz:", money(n.debtBefore || 0)))),
    o.push(t),
    (n.items || []).forEach((c, l) => {
      (o.push(`${l + 1} || ${c.name}`),
        o.push(r("", `${c.qty} x ${money(c.price)} = ${money(c.qty * c.price)}`)));
    }),
    o.push(
      t,
      r("Dona:", money((n.items || []).reduce((c, l) => c + num(l.qty), 0))),
      r("Jami:", money(n.sub)),
    ),
    num(n.discount) && o.push(r("Chegirma:", "-" + money(n.discount))),
    o.push(r("SUMMA:", money(n.total))),
    num(n.cbUsed) && o.push(r("Keshbekdan:", money(n.cbUsed))),
    num(n.cert) && o.push(r("Sertifikat:", money(n.cert))),
    num(n.cash) && o.push(r("Naqd:", money(n.cash))),
    num(n.card) && o.push(r("Karta:", money(n.card))),
    num(n.change) && o.push(r("Qaytim:", money(n.change))),
    n.clientName &&
      (num(n.debt) && o.push(r("Qarzga:", money(n.debt))),
      o.push(r("Qarz qoldig'i:", money(n.debtAfter || 0))),
      (num(n.cbEarned) || num(n.cbUsed)) &&
        (o.push(r("Keshbek:", "+" + money(n.cbEarned || 0))),
        o.push(r("Keshbek qoldig'i:", money(n.cbAfter || 0))))),
    o.push(t),
    i.phone && o.push(s(i.phone)),
    i.footer && o.push(s(i.footer)),
    o.join(`
`)
  );
}
function hv(n) {
  ((state._lastSale = n),
    openModal(
      `Chek \u2116${n.no}`,
      `<div class="receipt">${esc(receiptText(n))}</div>`,
      `${xRetBtn(n)}<button class="btn" data-close="x">Yopish <kbd>Esc</kbd></button><button class="btn primary" data-print="${esc(n.id)}">Chekni chiqarish <kbd>Enter</kbd></button>`,
    ));
  let e = qsel("[data-print]");
  e && e.focus();
}
function dvDialog(n) {
  let e = state.settings.paper === "58",
    t = `<!doctype html><html><head><meta charset="utf-8"><title>Chek ${n.no}</title><style>@page{size:${e ? "58mm" : "80mm"} auto;margin:2mm}body{margin:0;font-family:"Courier New",monospace;font-size:${e ? "9px" : "12px"};font-weight:600;width:${e ? "54mm" : "76mm"}}pre{white-space:pre-wrap;margin:0;font-family:inherit}</style></head><body><pre>${esc(receiptText(n))}</pre></body></html>`,
    i = document.getElementById("printFrame");
  (i && i.remove(),
    (i = document.createElement("iframe")),
    (i.id = "printFrame"),
    i.setAttribute("aria-hidden", "true"),
    (i.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0"),
    document.body.appendChild(i));
  let r = i.contentDocument;
  (r.open(),
    r.write(t),
    r.close(),
    setTimeout(() => {
      try {
        (i.contentWindow.focus(), i.contentWindow.print());
      } catch {
        toast("Chop etib bo'lmadi");
      }
    }, 200));
}
async function fv() {
  let n = cartTotals();
  if (!state.cart.length) return;
  let e = state.cartClient ? state.clients[state.cartClient] : null;
  if (n.debt && !xCan("debt")) {
    toast("Qarzga sotishga ruxsatingiz yo'q — to'liq to'lov oling");
    return;
  }
  if (n.debt && !e) {
    toast("Qarzga sotish uchun mijozni tanlang");
    return;
  }
  let t = nextReceiptNo(),
    i = newId(),
    r = {
      no: t,
      ts: Date.now(),
      seller: state.seller || "",
      items: state.cart.map((o) => ({
        pid: o.pid,
        name: o.name,
        qty: num(o.qty),
        price: num(o.price),
        cost: num(o.cost),
      })),
      sub: n.sub,
      discount: n.disc,
      promos: n.promo.list,
      cert: n.cert,
      certId: n.cert ? state.pay.cert : null,
      total: n.total,
      cash: Math.max(0, n.cash - n.change),
      card: n.card,
      change: n.change,
      debt: n.debt,
      cbUsed: n.cb,
      cbEarned: n.cbEarn,
      cbAfter: e ? Math.max(0, num(e.cashback)) - n.cb + n.cbEarn : 0,
      clientId: e ? e.id : null,
      clientName: e ? e.name : "",
      clientPhone: (e && e.phone) || "",
      debtBefore: e ? num(e.debt) : 0,
      debtAfter: e ? num(e.debt) + n.debt : 0,
    },
    s = qsel('[data-act="sell"]');
  s && (s.disabled = !0);
  try {
    await dbSet("sales", i, r);
    await xAfterSale(r, i);
    for (let o of state.cart)
      state.products[o.pid] &&
        (await dbUpdate("products", o.pid, {
          qty: incBy(-num(o.qty)),
        }));
    (e &&
      (n.debt || n.cb || n.cbEarn) &&
      (await dbUpdate("clients", e.id, {
        ...(n.debt
          ? {
              debt: incBy(n.debt),
            }
          : {}),
        ...(n.cbEarn - n.cb
          ? {
              cashback: incBy(n.cbEarn - n.cb),
            }
          : {}),
        lastRefCol: "sales",
        lastRefId: i,
        lastRefTs: r.ts,
      })),
      state.pendingOrder &&
        (await dbUpdate("orders", state.pendingOrder, {
          status: "done",
          saleNo: t,
          doneTs: Date.now(),
          by: state.seller || "",
        }),
        (state.pendingOrder = null)),
      (state.cart = []),
      (state.cartClient = null),
      (state.discount = {
        type: "pct",
        val: 0,
      }),
      (state.pay = {
        cash: "",
        card: "",
        cb: "",
      }),
      (state.q = ""),
      render(!0),
      toast(`Sotildi \xB7 ${money(n.total)} so'm`),
      hv({
        id: i,
        ...r,
      }),
      state.settings.autoPrint &&
        dv({
          id: i,
          ...r,
        }));
  } catch (o) {
    (s && (s.disabled = !1),
      toast(
        o && o.code === "quota_exceeded"
          ? "Baza to'ldi: eski cheklarni arxivlash kerak"
          : "Saqlab bo'lmadi, qayta urinib ko'ring",
      ));
  }
}
document.addEventListener("click", async (n) => {
  let e = n.target.closest("button, tr[data-editp], tr[data-client], tr[data-supp], div[data-receipt]");
  if (!e) return;
  let t = e.dataset;
  if (t.add) {
    (addToCart(state.products[t.add]), (state.q = ""), render(!0));
    return;
  }
  if (t.rm != null) {
    (state.cart.splice(+t.rm, 1), render());
    return;
  }
  if (t.inc != null) {
    ((state.cart[+t.inc].qty = num(state.cart[+t.inc].qty) + 1), render());
    return;
  }
  if (t.dec != null) {
    let r = state.cart[+t.dec];
    ((r.qty = num(r.qty) - 1), r.qty <= 0 && state.cart.splice(+t.dec, 1), render());
    return;
  }
  if (t.dt) {
    ((state.discount.type = t.dt), render());
    return;
  }
  if (t.tf) {
    ((state.tf = t.tf), render());
    return;
  }
  if (t.cf) {
    ((state.cf = t.cf), render());
    return;
  }
  if (t.rep) {
    if (((state.report = t.rep), t.rep === "custom" && !state.repFrom)) {
      let r = new Date();
      ((state.repTo = fmtDay(r)), r.setDate(1), (state.repFrom = fmtDay(r)));
    }
    render();
    return;
  }
  if (t.pickc) {
    state.cartClient = t.pickc;
    let r = state.clients[t.pickc];
    (r &&
      num(r.discount) &&
      (state.discount = {
        type: "pct",
        val: num(r.discount),
      }),
      render());
    return;
  }
  if (t.editp) {
    xCan("editProd") && jy(state.products[t.editp]);
    return;
  }
  if (t.client && e.tagName === "TR") {
    if (n.target.closest("button")) return;
    OT(t.client);
    return;
  }
  if (t.supp && e.tagName === "TR") {
    if (n.target.closest("button")) return;
    LT(t.supp);
    return;
  }
  if (t.editc) {
    Ky(state.clients[t.editc]);
    return;
  }
  if (t.cpay) {
    Gy("client", t.cpay);
    return;
  }
  if (t.spay) {
    Gy("supplier", t.spay);
    return;
  }
  if (t.sellto) {
    state.cartClient = t.sellto;
    let r = state.clients[t.sellto];
    (r &&
      num(r.discount) &&
      (state.discount = {
        type: "pct",
        val: num(r.discount),
      }),
      closeModal(),
      switchTab("sotuv"));
    return;
  }
  if (t.receipt) {
    let r = state.sales.find((s) => s.id === t.receipt);
    r && hv(r);
    return;
  }
  if (t.print) {
    let r = state.sales.find((s) => s.id === t.print) || state._lastSale;
    r && dv(r);
    return;
  }
  if (t.act === "backup") {
    rT();
    return;
  }
  if (t.act === "csv") {
    let [r, s] = reportRange(state.report),
      o = rangeData(r, s);
    if (!o.ready) {
      toast("Hali yuklanmoqda\u2026");
      return;
    }
    oT(o.sales);
    return;
  }
  if (t.act === "doimport") {
    try {
      await sT(state._imp);
    } catch {
      toast("Bu fayl Eco Kassa zaxirasi emas");
    }
    return;
  }
  if (t.of) {
    ((state.of = t.of), render());
    return;
  }
  if (t.bp) {
    ((state.bp = t.bp), store.set("eco.bp", t.bp), render());
    return;
  }
  if (t.ordacc) {
    await dbUpdate("orders", t.ordacc, {
      status: "accepted",
      by: state.seller || "",
    });
    return;
  }
  if (t.ordcan) {
    if (e.dataset.confirm !== "1") {
      ((e.dataset.confirm = "1"), (e.textContent = "Rostdanmi? Yana bosing"));
      return;
    }
    await dbUpdate("orders", t.ordcan, {
      status: "cancelled",
      by: state.seller || "",
    });
    return;
  }
  if (t.ordsell) {
    let r = state.orders.find((s) => s.id === t.ordsell);
    r && kT(r);
    return;
  }
  if (t.editstaff != null) {
    isOwner() && Wy(+t.editstaff);
    return;
  }
  if (t.staffoff != null && isOwner()) {
    let r = [...(state.settings.staff || [])],
      s = {
        ...r[+t.staffoff],
      };
    ((s.off = !s.off),
      (r[+t.staffoff] = s),
      await dbUpdate("meta", "settings", {
        staff: r,
      }));
    return;
  }
  if (t.intakefor && isOwner()) {
    ((intake = null), openIntake(t.intakefor));
    return;
  }
  if (t.addi) {
    let r = state.products[t.addi];
    (r &&
      !intake.lines.find((o) => o.pid === r.id) &&
      intake.lines.push({
        pid: r.id,
        name: r.name,
        qty: 1,
        cost: num(r.cost),
      }),
      renderIntakeModal());
    let s = qsel("#inFind");
    s && s.focus();
    return;
  }
  if (t.irm != null) {
    (intake.lines.splice(+t.irm, 1), renderIntakeModal());
    return;
  }
  if (t.delp && isOwner()) {
    if (e.dataset.confirm !== "1") {
      ((e.dataset.confirm = "1"), (e.textContent = "Rostdan arxivga olinsinmi? Yana bosing"));
      return;
    }
    (await dbUpdate("products", t.delp, {
      archived: !0,
    }),
      closeModal(),
      toast("Tovar arxivga olindi"));
    return;
  }
  if (t.savep != null) {
    let r = qsel("#mpName").value.trim();
    if (!r) {
      toast("Tovar nomini yozing");
      return;
    }
    if (xDeny(t.savep ? "editProd" : "addProd")) return;
    let s = {
        name: r,
        barcode: xAutoCode(qsel("#mpBar").value, mpBarsFinal()),
        barcodes: mpBarsFinal(),
        ...xExpPatch(t.savep),
        cat: qsel("#mpCat").value.trim(),
        cost: num(qsel("#mpCost").value),
        price: num(qsel("#mpPrice").value),
        min: num(qsel("#mpMin").value) || 3,
        ...(state.mpImg !== void 0
          ? {
              img: state.mpImg,
            }
          : {}),
      },
      o = num(qsel("#mpQty").value);
    xCan("editStock") || (o = t.savep ? num(state.products[t.savep].qty) : 0);
    if (t.savep) {
      let c = state.products[t.savep],
        l = o - num(c.qty);
      (await dbUpdate("products", t.savep, {
        ...s,
        ...(l
          ? {
              qty: incBy(l),
            }
          : {}),
      }),
        l &&
          (await dbSet("stockLog", newId(), {
            pid: t.savep,
            name: r,
            from: num(c.qty),
            to: o,
            delta: l,
            why: (qsel("#mpWhy") || {}).value || "",
            who: state.seller,
            ts: Date.now(),
          })));
    } else {
      let c = newId();
      (await dbSet("products", c, {
        ...s,
        qty: o,
        created: Date.now(),
      }),
        o &&
          (await dbSet("stockLog", newId(), {
            pid: c,
            name: r,
            from: 0,
            to: o,
            delta: o,
            why: "Yangi tovar",
            who: state.seller,
            ts: Date.now(),
          })));
    }
    (closeModal(), toast("Saqlandi"), xAfterAutoCode(o));
    return;
  }
  if (t.savec != null) {
    let r = qsel("#mcName").value.trim();
    if (!r) {
      toast("Mijoz ismini yozing");
      return;
    }
    let s = t.savec || newId(),
      o = state.clients[s] || {},
      c = {
        ...o,
      };
    delete c.id;
    let pfo = {
      name: r,
      phone: qsel("#mcPhone").value.trim(),
      discount: num(qsel("#mcDisc").value),
      note: qsel("#mcNote").value.trim(),
      bday: (qsel("#mcBday") || {}).value || "",
    };
    await (t.savec && o.id
      ? dbUpdate("clients", s, pfo)
      : dbSet("clients", s, {
          ...c,
          ...pfo,
          debt: num((qsel("#mcDebt") || {}).value),
          created: o.created || Date.now(),
        }));
    (closeModal(),
      toast("Mijoz saqlandi"),
      state._pickAfter && ((state.cartClient = s), (state._pickAfter = !1), render()));
    return;
  }
  if (t.saves != null) {
    let r = qsel("#msName").value.trim();
    if (!r) {
      toast("Nomini yozing");
      return;
    }
    if (!isOwner()) {
      toast("Faqat do'kon egasi");
      return;
    }
    let s = t.saves || newId(),
      o = state.suppliers[s] || {};
    (await dbSet("suppliers", s, {
      name: r,
      phone: qsel("#msPhone").value.trim(),
      debt: t.saves ? num(o.debt) : num((qsel("#msDebt") || {}).value),
    }),
      closeModal(),
      toast("Saqlandi"));
    return;
  }
  if (t.dopay) {
    let [r, s] = t.dopay.split("|"),
      o = num(qsel("#pyAmt").value);
    if (o <= 0) {
      toast("Summani kiriting");
      return;
    }
    let c = r === "client" ? "clients" : "suppliers",
      l = state[c][s];
    let pid = newId(),
      pts = Date.now();
    (await dbSet("payments", pid, {
      kind: r,
      refId: s,
      amount: o,
      method: qsel("#pyType").value,
      note: qsel("#pyNote").value.trim(),
      ts: pts,
      seller: state.seller || "",
    }),
      await dbUpdate(c, s, {
        debt: incBy(-o),
        ...(c === "clients"
          ? {
              lastRefCol: "payments",
              lastRefId: pid,
              lastRefTs: pts,
            }
          : {}),
      }),
      closeModal(),
      toast("To'lov saqlandi"));
    return;
  }
  let i = t.act;
  if (i === "clear")
    ((state.pendingOrder = null),
      (state.cart = []),
      (state.pay = {
        cash: "",
        card: "",
        cb: "",
      }),
      (state.discount = {
        type: "pct",
        val: 0,
      }),
      render(!0));
  else if (i === "unclient") ((state.cartClient = null), render());
  else if (i === "allcash") {
    let r = cartTotals();
    ((state.pay = {
      cert: state.pay.cert,
      cb: state.pay.cb,
      cash: String(r.total - r.cb - r.cert),
      card: "",
    }),
      render());
  } else if (i === "allcard") {
    let r = cartTotals();
    ((state.pay = {
      cert: state.pay.cert,
      cb: state.pay.cb,
      cash: "",
      card: String(r.total - r.cb - r.cert),
    }),
      render());
  } else if (i === "allcb") {
    let r = cartTotals();
    ((state.pay.cb = String(Math.min(r.cbAvail, r.total))), render());
  } else if (i === "sell") fv();
  else if (i === "newprod") xDeny("addProd") || jy();
  else if (i === "stocklog") FT();
  else if (i === "camscan")
    camScan((r) => {
      (state.tab !== "sotuv" && switchTab("sotuv"), onBarcode(r));
    });
  else if (i === "mpbarcam")
    camScan((r) => {
      let s = qsel("#mpBar");
      (s && (s.value = r), toast("Shtrix-kod: " + r));
    });
  else if (i === "mpimgdel") {
    state.mpImg = "";
    let r = qsel("#mpImgBox");
    r && (r.innerHTML = `<span class="ph">Rasm yo'q</span>`);
  } else if (i === "expprod") mT();
  else if (i === "doimport2") ((e.disabled = !0), await vT());
  else if (i === "newclient" || i === "newclientpos") ((state._pickAfter = i === "newclientpos"), Ky());
  else if (i === "newsupp") VT();
  else if (i === "intake") {
    if (xDeny("intake")) return;
    ((intake = null), openIntake());
  } else if (i === "intakecancel") ((intake = null), closeModal());
  else if (i === "intakesave" && intake && intake.fixOf) {
    ((e.disabled = !0), await xIntakeFixSave(e));
  } else if (i === "intakesave") {
    let r = intake.lines.reduce((l, h) => l + num(h.qty) * num(h.cost), 0),
      s = Math.min(r, num(intake.paid)),
      o = r - s,
      c = state.suppliers[intake.supplierId];
    ((e.disabled = !0),
      await dbSet("purchases", newId(), {
        ts: Date.now(),
        supplierId: intake.supplierId,
        supplierName: c ? c.name : "",
        items: intake.lines.map((l) => ({
          pid: l.pid,
          name: l.name,
          qty: num(l.qty),
          cost: num(l.cost),
          exp: l.exp || "",
        })),
        total: r,
        paid: s,
        debt: o,
        seller: state.seller || "",
      }));
    for (let l of intake.lines)
      state.products[l.pid] &&
        (await dbUpdate("products", l.pid, {
          qty: incBy(l.qty),
          cost: num(l.cost),
          ...xIntakeProd(l),
        }));
    (c &&
      o &&
      (await dbUpdate("suppliers", c.id, {
        debt: incBy(o),
      })),
      (state._inL = intake.lines.slice()),
      (intake = null),
      closeModal(),
      toast(`Kirim saqlandi \xB7 ${money(r)} so'm`),
      xAfterIntake(state._inL));
  } else if (i === "savesettings") {
    if (!isOwner()) return;
    (await dbUpdate("meta", "settings", {
      shopName: qsel("#setName").value.trim() || "Eco Aroma",
      phone: qsel("#setPhone").value.trim(),
      footer: qsel("#setFooter").value.trim(),
      paper: qsel("#setPaper").value,
      autoPrint: qsel("#setAuto").checked,
      allowNegative: qsel("#setNeg").checked,
      sellerPrice: qsel("#setSPrice").checked,
      maxDisc: num(qsel("#setMaxDisc").value),
      cashbackPct: Math.min(100, Math.max(0, num(qsel("#setCb").value))),
    }),
      toast("Sozlamalar saqlandi"));
  } else if (i === "savetheme") {
    if (!isOwner()) return;
    let r = {
      ...THEME_DEFAULT,
      ...(themeDraft || state.settings.theme || {}),
    };
    (themeDraft || state.settings.theme || {}).v !== 2 &&
      !themeDraft &&
      (r = {
        ...r,
        accent: THEME_DEFAULT.accent,
        side: THEME_DEFAULT.side,
        bg: THEME_DEFAULT.bg,
      });
    r.v = 2;
    (await dbUpdate("meta", "settings", {
      theme: r,
    }),
      (themeDraft = null),
      toast("Dizayn saqlandi"));
  } else if (i === "resettheme") {
    if (!isOwner()) return;
    ((themeDraft = {
      ...THEME_DEFAULT,
    }),
      applyTheme(themeDraft),
      render(),
      toast("Standart dizayn \u2014 saqlash uchun \xABDizaynni saqlash\xBBni bosing"));
  } else i === "addstaff" ? isOwner() && Wy(-1) : i === "savestaff" && (await MT(+e.dataset.ix));
});
document.addEventListener("input", (n) => {
  let e = n.target,
    t = e.dataset;
  if (e.id === "scan") {
    ((state.q = e.value), render());
    return;
  }
  if (e.id === "tq") {
    ((state.tq = e.value), render());
    return;
  }
  if (e.id === "cq") {
    ((state.cq = e.value), render());
    return;
  }
  if (t.qty != null) {
    ((state.cart[+t.qty].qty = num(e.value)), renderSoon());
    return;
  }
  if (t.price != null) {
    ((state.cart[+t.price].price = num(e.value)), renderSoon());
    return;
  }
  if (e.id === "discVal") {
    ((state.discount.val = e.value), renderSoon());
    return;
  }
  if (e.id === "payCash") {
    ((state.pay.cash = e.value), renderSoon());
    return;
  }
  if (e.id === "payCard") {
    ((state.pay.card = e.value), renderSoon());
    return;
  }
  if (e.id === "payCb") {
    ((state.pay.cb = e.value), renderSoon());
    return;
  }
  if (e.id === "clientQ") {
    let i = e.value.trim().toLowerCase(),
      r = qsel("#clientSug");
    if (!i) {
      r.innerHTML = "";
      return;
    }
    let s = Object.values(state.clients)
      .filter(
        (o) =>
          (o.name || "").toLowerCase().includes(i) ||
          (o.phone || "").replace(/\D/g, "").includes(i.replace(/\D/g, "") || "\xA7"),
      )
      .slice(0, 8);
    r.innerHTML = `<div class="sug">${s.map((o) => `<button data-pickc="${esc(o.id)}"><span>${esc(o.name)} <span class="muted num">${esc(o.phone || "")}</span></span>${num(o.debt) > 0 ? `<span class="pill debt num">${money(o.debt)}</span>` : ""}</button>`).join("")}<button data-act="newclientpos"><b>+ Yangi mijoz qo'shish</b></button></div>`;
    return;
  }
  if (e.id === "inFind") {
    let i = e.value.trim().toLowerCase(),
      r = qsel("#inSug");
    if (!i) {
      r.innerHTML = "";
      return;
    }
    let s = activeProducts()
      .filter((o) => (o.name || "").toLowerCase().includes(i) || hasBc(o, i))
      .slice(0, 8);
    r.innerHTML = `<div class="sug">${s.map((o) => `<button data-addi="${esc(o.id)}"><span>${esc(o.name)}</span><span class="muted num">${money(o.cost)}</span></button>`).join("") || `<div class="muted" style="padding:8px">Topilmadi \u2014 avval \xABTovarlar\xBB bo'limida yarating</div>`}</div>`;
    return;
  }
  if (e.id === "inSup") {
    ((intake.supplierId = e.value), renderIntakeModal());
    return;
  }
  if (t.iq != null) {
    intake.lines[+t.iq].qty = e.value;
    return;
  }
  if (t.ic != null) {
    intake.lines[+t.ic].cost = e.value;
    return;
  }
  if (e.id === "inPaid") {
    intake.paid = e.value;
    return;
  }
});
document.addEventListener(
  "change",
  async (n) => {
    if (n.target.id === "mpImg" && n.target.files[0]) {
      try {
        state.mpImg = await shrinkImage(n.target.files[0]);
        let e = qsel("#mpImgBox");
        (e && (e.innerHTML = `<img src="${state.mpImg}" alt="">`),
          toast(`Rasm tayyor (${Math.round(state.mpImg.length / 1365)} KB)`));
      } catch {
        toast("Rasmni o'qib bo'lmadi");
      }
      n.target.value = "";
      return;
    }
    if (n.target.id === "impProd" && n.target.files[0]) {
      (isOwner() && yT(n.target.files[0]), (n.target.value = ""));
      return;
    }
  },
  !0,
);
document.addEventListener("change", (n) => {
  if (n.target.id === "repFrom" || n.target.id === "repTo") {
    ((state[n.target.id] = n.target.value), render());
    return;
  }
  if (n.target.id === "impFile" && n.target.files[0]) {
    ((state._imp = n.target.files[0]),
      openModal(
        "Zaxiradan tiklash",
        `<div class="note">\xAB${esc(state._imp.name)}\xBB faylidan bazada <b>yo\'q</b> yozuvlar qaytariladi. Bazadagi mavjud yozuvlarga tegilmaydi. Davom etilsinmi?</div>`,
        '<button class="btn" data-close="x">Bekor qilish</button><button class="btn danger" data-act="doimport">Ha, tiklash</button>',
      ),
      (n.target.value = ""));
    return;
  }
  let e = n.target.dataset;
  ((e.iq != null || e.ic != null || n.target.id === "inPaid") && renderIntakeModal(),
    n.target.id === "inSup" && ((intake.supplierId = n.target.value), renderIntakeModal()));
});
var renderTimer = null;
function renderSoon() {
  (clearTimeout(renderTimer), (renderTimer = setTimeout(() => render(), 350)));
}
document.addEventListener("keydown", (n) => {
  if (state.gate) return;
  let e = !!qsel("#modalRoot").innerHTML;
  if (["F2", "F4", "F8", "F9"].includes(n.key)) {
    if ((n.preventDefault(), e)) return;
    if ((state.tab !== "sotuv" && switchTab("sotuv"), n.key === "F2")) {
      let t = qsel("#scan");
      t && t.focus();
    } else if (n.key === "F4") {
      let t = cartTotals();
      ((state.pay = {
        cert: state.pay.cert,
        cb: state.pay.cb,
        cash: String(t.total - t.cb - t.cert),
        card: "",
      }),
        render());
    } else if (n.key === "F8") {
      let t = cartTotals();
      ((state.pay = {
        cert: state.pay.cert,
        cb: state.pay.cb,
        cash: "",
        card: String(t.total - t.cb - t.cert),
      }),
        render());
    } else if (n.key === "F9") {
      let t = qsel('[data-act="sell"]');
      t && !t.disabled ? fv() : state.cart.length && toast("Qarzga sotish uchun mijozni tanlang");
    }
    return;
  }
  if (n.key === "Enter") {
    if (n.target.id === "scan") {
      n.preventDefault();
      let t = n.target.value.trim();
      if (!t) return;
      onBarcode(t);
      return;
    }
    if (n.target.id === "inFind") {
      n.preventDefault();
      let t = n.target.value.trim(),
        i =
          activeProducts().find((r) => hasBc(r, t)) ||
          (activeProducts().filter((r) => (r.name || "").toLowerCase().includes(t.toLowerCase())).length === 1
            ? activeProducts().find((r) => (r.name || "").toLowerCase().includes(t.toLowerCase()))
            : null);
      if (i) {
        (intake.lines.find((s) => s.pid === i.id) ||
          intake.lines.push({
            pid: i.id,
            name: i.name,
            qty: 1,
            cost: num(i.cost),
          }),
          renderIntakeModal());
        let r = qsel("#inFind");
        r && r.focus();
      }
    }
  }
});
function $T(n) {
  let e = {};
  return (
    ["apiKey", "authDomain", "projectId", "storageBucket", "messagingSenderId", "appId"].forEach((t) => {
      let i = new RegExp(t + `\\s*["']?\\s*:\\s*["']([^"']+)["']`).exec(n);
      i && (e[t] = i[1]);
    }),
    e.apiKey && e.projectId && e.appId ? e : null
  );
}
function showGate(n) {
  ((state.gate = !0),
    (qsel(".side").style.display = "none"),
    qsel(".app").classList.add("gated"),
    (qsel("#main").innerHTML = n));
  let e = qsel("#main input, #main textarea");
  e && e.focus();
}
function hideGate() {
  ((state.gate = !1),
    (qsel(".side").style.display = ""),
    qsel(".app").classList.remove("gated"),
    renderHeader(),
    render(!0));
}
function firstSetupHtml() {
  return `<div class="panel" style="max-width:560px;margin:40px auto"><div class="panel-h"><h2>Birinchi sozlash: Firebase</h2></div><div class="panel-b" style="display:grid;gap:12px">
  <div class="note">Firebase'dagi <b>firebaseConfig</b> matnini shu yerga qo'ying.</div>
  <textarea id="cfgText" class="f" rows="8" placeholder="const firebaseConfig = { apiKey: ... }"></textarea>
  <div><button class="btn primary" data-act="savecfg">Saqlash</button></div></div></div>`;
}
var authUi = {
    mode: "login",
    fails: 0,
    until: 0,
  },
  SESSION_MS = 7 * 864e5,
  sessKey = (n) => String(n.hash || n.pinHash || "").slice(0, 16);
function saveSession(n) {
  store.set("eco.sess", {
    id: n.id,
    k: sessKey(n),
    until: Date.now() + SESSION_MS,
  });
}
function restoreSession() {
  let n = store.get("eco.sess", null);
  if (!n || Date.now() > n.until) return !1;
  let e = state.settings.staff || [];
  if (!e.length) return !1;
  let t = e.find((i) => i.id === n.id);
  return !t || t.off || sessKey(t) !== n.k
    ? (store.set("eco.sess", null), !1)
    : ((state.seller = t.name),
      (state.role = t.role),
      (state.meId = t.id),
      saveSession(t),
      hideGate(),
      switchTab(state.tab),
      !0);
}
var Yy = 0;
document.addEventListener(
  "pointerdown",
  () => {
    if (!state.gate && state.meId && Date.now() - Yy > 6e4) {
      Yy = Date.now();
      let n = (state.settings.staff || []).find((e) => e.id === state.meId);
      n && saveSession(n);
    }
  },
  !0,
);
function authForm(n, e, t, i, r) {
  return `<form class="lock panel" id="authForm" style="padding:24px;text-align:left;display:grid;gap:12px" autocomplete="on">
  <div style="text-align:center">${(() => {
    try {
      let s = JSON.parse(localStorage.getItem("eco.theme") || "null");
      if (s && s.logo)
        return `<img class="brandlogo" src="${s.logo}" alt="" style="width:64px;height:64px;border-radius:16px">`;
    } catch {}
    return '<span class="drop" style="display:inline-block;width:34px;height:34px"></span>';
  })()}<h1 style="margin:10px 0 4px">${esc(n)}</h1><div class="muted">${esc(e || "")}</div></div>
  ${t}<div id="pinErr" style="color:var(--danger);min-height:20px;font-weight:600"></div>
  <button class="btn primary" type="submit" style="padding:13px;font-size:16px">${esc(i)}</button>${r || ""}</form>`;
}
var authFields = {
  name: '<label class="l" for="auName">Ismingiz<input id="auName" class="f" autocomplete="name"></label>',
  login: (n) =>
    `<label class="l" for="auLogin">Login<input id="auLogin" class="f" autocomplete="username" autocapitalize="none" value="${esc(n || "")}"></label>`,
  pw: (n, e) =>
    `<label class="l" for="auPw">${n || "Parol"}<span style="display:flex;gap:6px"><input id="auPw" class="f" type="password" autocomplete="${e || "current-password"}"><button type="button" class="btn sm" data-act="showpw" aria-label="Parolni ko'rsatish">\u{1F441}</button></span></label>`,
  pw2: '<label class="l" for="auPw2">Parolni takrorlang<input id="auPw2" class="f" type="password" autocomplete="new-password"></label>',
};
function showLogin() {
  if (authUi.mode === "device")
    return showGate(
      authForm(
        "Bu qurilmani do'konga ulash",
        "Rahbarning login va parolini kiriting. Bu bir marta, internet bilan qilinadi.",
        authFields.login() + authFields.pw(),
        "Ulash",
        `<button type="button" class="btn sm" data-act="firstsetup" style="justify-self:center">Do'konni birinchi marta sozlayapman</button>`,
      ),
    );
  if (authUi.mode === "first")
    return showGate(
      authForm(
        "Rahbar profilini yaratish",
        "Shu login va parol bilan hamma narsani boshqarasiz. Eslab qoling!",
        authFields.name +
          authFields.login() +
          authFields.pw("Parol (kamida 6 belgi)", "new-password") +
          authFields.pw2,
        "Yaratish",
      ),
    );
  showGate(
    authForm(
      state.settings.shopName || "Eco Aroma",
      "Tizimga kirish",
      authFields.login(store.get("eco.lastLogin", "")) + authFields.pw(),
      "Kirish",
    ),
  );
  let n = qsel("#auLogin");
  if (n && n.value) {
    let e = qsel("#auPw");
    e && e.focus();
  }
}
async function BT() {
  let n = (s) => {
      let o = qsel("#pinErr");
      o && (o.textContent = s);
    },
    e = normText((qsel("#auLogin") || {}).value),
    t = (qsel("#auPw") || {}).value || "";
  if (authUi.mode === "login") {
    if (Date.now() < authUi.until) {
      n(`Ko'p xato. ${Math.ceil((authUi.until - Date.now()) / 1e3)} soniyadan keyin urinib ko'ring`);
      return;
    }
    if (!e || !t) {
      n("Login va parolni kiriting");
      return;
    }
    let s =
      (state.settings.staff || []).find((o) => normText(o.login) === e) ||
      (state.settings.staff || []).find((o) => !o.login && normText(o.name) === e);
    if ((n("Tekshirilmoqda\u2026"), s && !s.off && (await iT(s, t))))
      (xSessLogin(s, t),
        s.role === "owner" &&
          !xStrong(t) &&
          setTimeout(
            () =>
              toast(
                "\u26A0\uFE0F Parolingiz oddiy. Sozlamalar \u2192 Xodimlar bo'limida kamida 8 belgili, harf va raqamli parol qo'ying",
              ),
            1800,
          ),
        (authUi.fails = 0),
        store.set("eco.lastLogin", e),
        saveSession(s),
        (state.seller = s.name),
        (state.role = s.role),
        (state.meId = s.id),
        (state.cart = []),
        s.role === "owner" && isMobile() && (state.tab = "bosh"),
        hideGate(),
        switchTab(state.tab));
    else {
      (authUi.fails++,
        authUi.fails >= 5 && ((authUi.until = Date.now() + 6e4), (authUi.fails = 0)),
        n(s && s.off ? "Bu profil yopilgan" : "Login yoki parol noto'g'ri"));
      let o = qsel("#auPw");
      o && ((o.value = ""), o.focus());
    }
    return;
  }
  let i = (s) =>
    Promise.race([
      s,
      new Promise((o, c) =>
        setTimeout(
          () =>
            c({
              code: "timeout",
            }),
          15e3,
        ),
      ),
    ]);
  if (authUi.mode === "first") {
    let s = (qsel("#auName").value || "").trim() || "Rahbar";
    if (!/^[a-z0-9._-]{3,30}$/.test(e)) {
      n("Login 3\u201330 belgi: lotin harflari, raqam, . _ -");
      return;
    }
    if (!xStrong(t)) {
      n("Parol kamida 8 belgi bo'lsin, harf va raqam aralash");
      return;
    }
    if (t !== qsel("#auPw2").value) {
      n("Parollar bir xil emas");
      return;
    }
  } else if (!t) {
    n("Parolni kiriting");
    return;
  }
  n("Tekshirilmoqda\u2026");
  let r = await legacyHash(t);
  try {
    if (authUi.mode === "first") {
      (await i(
        fsSetDoc(fsDoc(fire.db, "secret", "owner"), {
          pinHash: r,
        }),
      ),
        await i(
          fsSetDoc(fsDoc(fire.db, "devices", fire.user.uid), {
            pinHash: r,
            ts: Date.now(),
            ua: navigator.userAgent.slice(0, 120),
          }),
        ));
      let s = await hashPassword(t),
        o = null;
      try {
        let h = await i(fsGetDoc(fsDoc(fire.db, "meta", "settings")));
        o = h.exists() ? h.data() : null;
      } catch {}
      let c = ((o && o.staff) || []).filter((h) => h.role !== "owner"),
        l = {
          id: newId(),
          name: (qsel("#auName").value || "").trim() || "Rahbar",
          login: e,
          role: "owner",
          main: !0,
          created: Date.now(),
          ...s,
        };
      (await i(
        fsSetDoc(
          fsDoc(fire.db, "meta", "settings"),
          o
            ? {
                staff: [l, ...c],
              }
            : {
                ...state.settings,
                staff: [l],
              },
          {
            merge: !0,
          },
        ),
      ),
        store.set("eco.lastLogin", e));
    } else
      (await i(
        fsSetDoc(fsDoc(fire.db, "devices", fire.user.uid), {
          pinHash: r,
          ts: Date.now(),
          ua: navigator.userAgent.slice(0, 120),
        }),
      ),
        store.set("eco.lastLogin", e));
    (store.set("eco.device", fire.user.uid), (authUi.mode = "login"), startApp());
  } catch (s) {
    n(
      s.code === "timeout" || s.code === "unavailable"
        ? "Internet kerak \u2014 qayta urinib ko'ring"
        : authUi.mode === "first"
          ? "Do'kon allaqachon sozlangan \u2014 rahbar login/paroli bilan ulang"
          : "Rahbarning paroli noto'g'ri",
    );
  }
}
document.addEventListener(
  "submit",
  (n) => {
    n.target.id === "authForm" && (n.preventDefault(), BT());
  },
  !0,
);
document.addEventListener(
  "click",
  (n) => {
    let e = n.target.closest("[data-act]");
    if (e) {
      if (e.dataset.act === "showpw") {
        let t = qsel("#auPw");
        t && (t.type = t.type === "password" ? "text" : "password");
        return;
      }
      if (
        (e.dataset.act === "firstsetup" && ((authUi.mode = "first"), showLogin()),
        e.dataset.act === "savecfg")
      ) {
        let t = $T(qsel("#cfgText").value);
        if (!t) {
          toast("Matnda apiKey/projectId/appId topilmadi");
          return;
        }
        (store.set("eco.fbconfig", t), location.reload());
      }
      e.dataset.act === "lock" &&
        (xSessLogout(),
        store.set("eco.sess", null),
        (state.role = null),
        (state.seller = null),
        (state.meId = null),
        (state.cart = []),
        closeModal(),
        (authUi.mode = "login"),
        showLogin());
    }
  },
  !0,
);
var started = !1;
function startApp() {
  started ||
    ((started = !0),
    subscribeAll(),
    xSessWatch(),
    (authUi.mode = "login"),
    restoreSession() || showLogin(),
    renderConn());
}
async function checkDevice() {
  if (store.get("eco.device", null) === fire.user.uid) return startApp();
  showGate('<div class="lock"><h1>Tekshirilmoqda\u2026</h1></div>');
  try {
    let n = await fsGetDoc(fsDoc(fire.db, "meta", "settings"));
    return (store.set("eco.device", fire.user.uid), startApp());
  } catch (n) {
    n.code === "permission-denied"
      ? ((authUi.mode = "device"), showLogin())
      : showGate(
          '<div class="lock"><h1>Internet kerak</h1><div class="muted">Bu qurilmani birinchi marta ulash uchun internet kerak.</div><button class="btn primary" style="margin-top:16px" onclick="location.reload()">Qayta urinish</button></div>',
        );
  }
}
state.tab = store.get("eco.tab", "sotuv");
document
  .querySelectorAll("#tabs button")
  .forEach((n) => n.setAttribute("aria-selected", String(n.dataset.tab === state.tab)));
cv();
setInterval(() => {
  (cv(), renderOrderBadges());
}, 2e4);
try {
  let n = JSON.parse(localStorage.getItem("eco.theme") || "null");
  (applyTheme(
    n
      ? {
          mode: n.mode,
          icons: n.line ? "line" : "emoji",
          logo: n.logo || "",
        }
      : null,
  ),
    n && n.css && (qsel("#themeVars").textContent = n.css));
} catch {}
var fbConfig =
  (typeof window.ECO_FIREBASE_CONFIG == "object" && window.ECO_FIREBASE_CONFIG) ||
  store.get("eco.fbconfig", null);
fbConfig
  ? ((fire.app = initializeApp(fbConfig)),
    (fire.db = initializeFirestore(fire.app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
    })),
    (fire.auth = getAuth(fire.app)),
    showGate('<div class="lock"><h1>Yuklanmoqda\u2026</h1></div>'),
    onAuthStateChanged(fire.auth, async (n) => {
      if (!n) {
        try {
          await signInAnonymously(fire.auth);
        } catch {
          showGate(
            '<div class="lock"><h1>Internet kerak</h1><div class="muted">Birinchi ochilishda internet kerak.</div><button class="btn primary" style="margin-top:16px" onclick="location.reload()">Qayta urinish</button></div>',
          );
        }
        return;
      }
      ((fire.user = n), checkDevice());
    }))
  : showGate(firstSetupHtml());
