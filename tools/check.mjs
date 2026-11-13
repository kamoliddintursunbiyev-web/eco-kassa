// Tekshiruv: yig'ilgan index.html dagi skript to'g'ri tahlil qilinadimi va
// e'lon qilinmagan (xato yozilgan) nom ishlatilmayaptimi.
import fs from "fs";
import { parse } from "@babel/parser";
import _t from "@babel/traverse";
const traverse = _t.default?.default || _t.default || _t;
const file = process.argv[2] || "index.html";
const html = fs.readFileSync(file, "utf8");
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
const main = scripts.reduce((a, b) => (b.length > a.length ? b : a));
const ast = parse(main, { sourceType: "script" });
let globals = [];
traverse(ast, { Program(p) { globals = Object.keys(p.scope.globals).sort(); p.stop(); } });
const browser = new Set(["window","document","navigator","location","localStorage","sessionStorage","setTimeout","clearTimeout","setInterval","clearInterval","fetch","URL","URLSearchParams","Blob","File","Image","FileReader","TextEncoder","TextDecoder","crypto","alert","confirm","prompt","indexedDB","IDBDatabase","IDBObjectStore","IDBIndex","IDBCursor","IDBTransaction","IDBRequest","IDBKeyRange","getComputedStyle","requestAnimationFrame","cancelAnimationFrame","performance","history","screen","Notification","speechSynthesis","SpeechSynthesisUtterance","Audio","AudioContext","webkitAudioContext","HTMLElement","Event","CustomEvent","MutationObserver","FormData","Headers","Response","Request","atob","btoa","matchMedia","open","print","close","devicePixelRatio","caches","ImageData","BarcodeDetector","structuredClone","queueMicrotask","self","Worker","createImageBitmap","webkitSpeechRecognition","SpeechRecognition","Intl","Telegram","globalThis","global","process","chrome","browser","XMLHttpRequest","WebSocket","DOMException","Promise","Symbol","Map","Set","WeakMap","WeakSet","Reflect","Proxy","JSON","Math","Date","RegExp","Error","TypeError","RangeError","Object","Array","String","Number","Boolean","BigInt","Uint8Array","Uint16Array","Uint32Array","Int8Array","Int16Array","Int32Array","Float32Array","Float64Array","Uint8ClampedArray","ArrayBuffer","DataView","isFinite","isNaN","parseFloat","parseInt","encodeURIComponent","decodeURIComponent","encodeURI","escape","unescape","undefined","NaN","Infinity","console","eval","Function","arguments","FinalizationRegistry","WeakRef","AbortController","ReadableStream","WritableStream","TransformStream","BroadcastChannel","MessageChannel","Uint8ClampedArray","importScripts","postMessage","addEventListener","removeEventListener","onLine","PerformanceObserver","EventSource","CompressionStream","DecompressionStream","SharedArrayBuffer","Atomics","Iterator","AggregateError","SyntaxError","EvalError","URIError","ReferenceError","HTMLCanvasElement","HTMLVideoElement","HTMLImageElement","OffscreenCanvas","ImageBitmap","Element","Node","DOMParser","XMLSerializer","Option","CSS","scrollTo","MediaRecorder","ResizeObserver","IntersectionObserver","qrcode","qz","ort","WorkerGlobalScope","ServiceWorkerGlobalScope","ECO_FIREBASE_CONFIG","navigation","module","exports","define","require","__FIREBASE_DEFAULTS__","Deno","Bun","EdgeRuntime","WebSocketStream","KeyboardEvent","Buffer","StorageEvent","decodeURI","gapi","isSecureContext"]);
const unknown = globals.filter((g) => !browser.has(g));
console.log(`skript: ${(main.length / 1024).toFixed(0)} KB, global nomlar: ${globals.length}`);
if (unknown.length) { console.error("NOMA'LUM nomlar (xato bo'lishi mumkin): " + unknown.join(" ")); process.exit(1); }
console.log("OK — e'lon qilinmagan nom yo'q");
