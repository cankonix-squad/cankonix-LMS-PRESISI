#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];
let checks = 0;

function check(condition, message) {
  checks += 1;
  if (!condition) failures.push(message);
}

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(target) : [target];
  });
}

const htmlFiles = walk(root).filter(file => file.endsWith(".html"));
const css = fs.readFileSync(path.join(root, "assets/css/main.css"), "utf8");
const app = fs.readFileSync(path.join(root, "assets/js/app.js"), "utf8");
const attendanceSources = ["attendance-page.js", "attendance-operations.js"]
  .map(file => fs.readFileSync(path.join(root, "assets/js", file), "utf8"))
  .join("\n");

for (const file of htmlFiles) {
  const relative = path.relative(root, file);
  const source = fs.readFileSync(file, "utf8");
  check(/<meta[^>]+name="viewport"[^>]*content="[^"]*width=device-width/i.test(source), `${relative}: viewport responsif tidak ditemukan`);
  check(/assets\/css\/main\.css/.test(source), `${relative}: stylesheet utama tidak dimuat`);
}

check(css.includes("@media(max-width:1180px)"), "breakpoint tablet 1180px tidak ditemukan");
check(css.includes("@media(max-width:860px)"), "breakpoint mobile 860px tidak ditemukan");
check(css.includes("@media(max-width:520px)"), "breakpoint ponsel kecil 520px tidak ditemukan");
check(css.includes(".mobile-menu-toggle{display:grid;place-items:center}.main{margin-left:0;width:100%}"), "shell mobile tidak beralih ke lebar penuh");
check(css.includes(".grid-5,.grid-4,.grid-3,.grid-2,.workspace-grid,.module-grid{grid-template-columns:1fr}"), "grid utama tidak runtuh menjadi satu kolom");
check(css.includes(".attendance-analytics{grid-template-columns:1fr}"), "analytics Attendance tidak menjadi satu kolom");
check(css.includes(".attendance-trend{overflow-x:auto;justify-content:flex-start}"), "tren Attendance tidak memiliki overflow aman");
check(css.includes(".toolbar .control{width:100%;min-width:0}"), "filter ponsel kecil tidak memakai lebar penuh");
check(css.includes(".table-wrap{overflow:auto}"), "tabel tidak memiliki pembungkus overflow global");

const attendanceTables = (attendanceSources.match(/<table\b/g) || []).length;
const wrappedAttendanceTables = (attendanceSources.match(/class="table-wrap"><table\b/g) || []).length;
check(attendanceTables > 0 && wrappedAttendanceTables === attendanceTables, `Attendance: ${attendanceTables - wrappedAttendanceTables} tabel tanpa overflow wrapper`);
check(css.includes(":focus-visible{outline:"), "focus keyboard global tidak terlihat");
check(css.includes("@media(prefers-reduced-motion:reduce)"), "preferensi reduced motion belum didukung");
check(css.includes(".sidebar-open .sidebar{transform:translateX(0)"), "sidebar mobile tidak dapat dibuka");
check(app.includes('id="mobileMenuToggle"') && app.includes('aria-controls="sidebar"'), "tombol menu mobile tidak terhubung ke sidebar");
check(app.includes('event.key === "Escape"'), "menu mobile tidak dapat ditutup dengan Escape");
check(app.includes('sidebar?.querySelector(".nav-item")?.focus()'), "fokus tidak dipindahkan ke menu saat dibuka");
check(app.includes('window.matchMedia?.("(max-width: 860px)")') && app.includes('sidebar?.removeAttribute("aria-hidden")'), "state aksesibilitas sidebar tidak mengikuti perubahan viewport");
check(css.includes("body.sidebar-collapsed .sidebar{transform:translateX(-105%)") && css.includes("body.sidebar-collapsed .main{margin-left:0;width:100%}"), "sidebar desktop belum mendukung mode hide dan perluasan konten");
check(app.includes('sidebarPreferenceKey = "presisiSidebarCollapsed"') && app.includes("localStorage.setItem(sidebarPreferenceKey"), "preferensi sidebar desktop belum disimpan");
check(app.includes('aria-label", collapsed ? "Tampilkan menu navigasi" : "Sembunyikan menu navigasi"'), "status tombol sidebar desktop belum aksesibel");

console.log(JSON.stringify({
  result: failures.length ? "FAIL" : "PASS",
  htmlPages: htmlFiles.length,
  checks,
  attendanceTables,
  failures
}, null, 2));

if (failures.length) process.exitCode = 1;
