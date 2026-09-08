#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];
let checks = 0;
const check = (condition, message) => { checks += 1; if (!condition) failures.push(message); };
function walk(directory) { return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => { const target = path.join(directory, entry.name); return entry.isDirectory() ? walk(target) : [target]; }); }
function attribute(tag, name) { return tag.match(new RegExp(`\\b${name}=["']([^"']*)["']`, "i"))?.[1] ?? ""; }
function textContent(markup) { return markup.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(); }

const htmlFiles = walk(root).filter(file => file.endsWith(".html")).sort();
for (const file of htmlFiles) {
  const relative = path.relative(root, file), source = fs.readFileSync(file, "utf8");
  const markup = source.replace(/<script\b[\s\S]*?<\/script>/gi, "");
  check(/<main\b/i.test(markup), `${relative}: landmark main tidak ditemukan`);
  check(/<title>\s*[^<]+\s*<\/title>/i.test(markup), `${relative}: title halaman tidak tersedia`);

  for (const match of markup.matchAll(/<img\b[^>]*>/gi)) {
    check(/\balt=["'][^"']*["']/i.test(match[0]), `${relative}: gambar tanpa atribut alt`);
  }
  for (const match of markup.matchAll(/<button\b[^>]*>([\s\S]*?)<\/button>/gi)) {
    const tag = match[0], name = attribute(tag, "aria-label") || attribute(tag, "title") || textContent(match[1]);
    check(Boolean(name), `${relative}: tombol tanpa accessible name`);
  }
  for (const match of markup.matchAll(/<a\b[^>]*>([\s\S]*?)<\/a>/gi)) {
    const tag = match[0], name = attribute(tag, "aria-label") || attribute(tag, "title") || textContent(match[1]);
    check(Boolean(name), `${relative}: tautan tanpa accessible name`);
  }
  for (const match of markup.matchAll(/<(input|select|textarea)\b[^>]*>/gi)) {
    const tag = match[0], id = attribute(tag, "id"), type = attribute(tag, "type").toLowerCase();
    if (type === "hidden" || type === "submit" || type === "button") continue;
    const index = match.index ?? 0, insideLabel = markup.lastIndexOf("<label", index) > markup.lastIndexOf("</label>", index);
    const labelled = attribute(tag, "aria-label") || attribute(tag, "aria-labelledby") || attribute(tag, "title") || insideLabel || (id && new RegExp(`<label\\b[^>]*for=["']${id}["']`, "i").test(markup));
    check(Boolean(labelled), `${relative}: kontrol ${id ? `#${id}` : match[1]} tanpa label aksesibel`);
  }
  for (const match of markup.matchAll(/<iframe\b[^>]*>/gi)) {
    check(Boolean(attribute(match[0], "title") || attribute(match[0], "aria-label")), `${relative}: iframe tanpa title`);
  }
}

const css = fs.readFileSync(path.join(root, "assets/css/main.css"), "utf8");
const app = fs.readFileSync(path.join(root, "assets/js/app.js"), "utf8");
const auth = fs.readFileSync(path.join(root, "assets/js/auth-launcher.js"), "utf8");
check(css.includes(":focus-visible"), "focus-visible global tidak tersedia");
check(css.includes("prefers-reduced-motion:reduce"), "reduced motion tidak didukung");
check(app.includes('aria-label="Navigasi utama"'), "sidebar belum memakai landmark navigasi berlabel");
check(app.includes("requireDemoSession()"), "session guard halaman terlindungi tidak tersedia");
check(auth.includes("Password prototype tidak sesuai."), "error credential demo tidak spesifik");
check(auth.includes("button.hidden = !allowed") && auth.includes("button.disabled = !allowed"), "shared service di luar scope belum disembunyikan dan dinonaktifkan");

console.log(JSON.stringify({ result: failures.length ? "FAIL" : "PASS", htmlPages: htmlFiles.length, checks, failures }, null, 2));
if (failures.length) process.exitCode = 1;
