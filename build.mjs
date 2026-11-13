// Eco Kassa yig'uvchisi: src/ dagi o'qiladigan fayllardan index.html ni yasaydi.
// Ishlatish:  npm install   (bir marta)
//             npm run build (har o'zgarishdan keyin)  ->  index.html yangilanadi
// GitHub Pages index.html ni o'zi tarqatadi, shuning uchun build natijasi ham repoga commit qilinadi.
import fs from "fs";
import { transform } from "esbuild";

const read = (p) => fs.readFileSync(new URL(p, import.meta.url), "utf8");

const shell = read("./src/shell.html");
const styles = read("./src/styles.css");
const head = read("./src/vendor/firebase-head.js"); // Firebase SDK (siqilgan, tegilmaydi)
const tail = read("./src/vendor/firebase-tail.js");
const app = read("./src/app.js"); // ilovaning o'zi — shu faylni tahrirlang

// Faqat ichki (lokal) nomlar qisqartiriladi; yuqori darajadagi nomlar o'zgarmaydi,
// chunki ilova Firebase bilan bitta umumiy blok ichida ishlaydi.
const { code } = await transform(app, {
  loader: "js",
  minify: true,
  target: "es2020",
  charset: "utf8",
  legalComments: "none",
});

if (/<\/script/i.test(code)) throw new Error("app.js ichida '</script' matni bor — HTML buziladi");
if (!shell.includes("/*@STYLES*/") || !shell.includes("/*@BUNDLE*/")) throw new Error("shell.html belgilari yo'q");

const html = shell
  .replace("/*@STYLES*/", () => styles)
  .replace("/*@BUNDLE*/", () => head + code.trimEnd() + tail);

fs.writeFileSync(new URL("./index.html", import.meta.url), html);
console.log(`index.html tayyor: ${(html.length / 1024).toFixed(0)} KB`);
