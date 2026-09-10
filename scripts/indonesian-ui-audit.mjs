#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = fs.readFileSync(path.join(root, "assets/js/app.js"), "utf8");
const start = source.indexOf("const uiTranslations = ");
const end = source.indexOf("\n};", start) + 3;
const dictionarySource = source.slice(start + "const uiTranslations = ".length, end).trim().replace(/;$/, "");
const dictionary = vm.runInNewContext(`(${dictionarySource})`);
const entries = Object.entries(dictionary).sort((a, b) => b[0].length - a[0].length);
const translate = value => entries.reduce((text, [original, translated]) => {
  const escaped = original.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return text.replace(new RegExp(`\\b${escaped}\\b`, "gi"), match => match === match.toLowerCase() ? translated.toLocaleLowerCase("id-ID") : translated);
}, value);

const cases = new Map([
  ["Dashboard Nasional", "Dasbor Nasional"],
  ["Monitoring Learning", "Pemantauan Pembelajaran"],
  ["Course Detail", "Rincian Kursus"],
  ["Assignment dan Quiz", "Tugas dan Kuis"],
  ["Discussion Forum", "Forum Diskusi"],
  ["Virtual Class", "Kelas Virtual"],
  ["Digital Learning Passport", "Paspor Pembelajaran Digital"],
  ["Command Center", "Pusat Kendali"],
  ["Master Library", "Perpustakaan Utama"],
  ["Integration Hub", "Pusat Integrasi"],
  ["Data Mapping", "Pemetaan Data"],
  ["Data Quality", "Kualitas Data"],
  ["Identity & Access Management", "Manajemen Identitas & Akses"],
  ["System Health & Recovery", "Kesehatan & Pemulihan Sistem"],
  ["Logistic & Asset Management", "Pengelolaan Logistik & Aset"],
  ["Dynamic Launcher", "Pemilih Ruang Kerja Dinamis"],
  ["Workspace master", "Ruang Kerja induk"],
  ["Quick Actions", "Tindakan Cepat"],
  ["Submission Terbaru", "Pengumpulan Terbaru"],
  ["Waiting List", "Daftar Tunggu"],
  ["Self-Assessment", "Penilaian Mandiri"],
  ["Quality by Domain", "Mutu per Ranah"],
  ["Run Now", "Jalankan Sekarang"],
  ["New Version", "Versi Baru"],
  ["Password", "Kata Sandi"]
]);

const failures = [];
for (const [input, expected] of cases) {
  const actual = translate(input);
  if (actual !== expected) failures.push(`${input}: diharapkan "${expected}", diterima "${actual}"`);
}
if (!source.includes("new MutationObserver") || !source.includes('attributeFilter: ["aria-label", "title", "placeholder"]')) failures.push("Lokalisasi dinamis atau atribut aksesibilitas belum dipantau.");
if (!source.includes('const skipped = new Set(["SCRIPT", "STYLE", "PRE"])')) failures.push("Pesan log yang tampil belum tercakup dalam lokalisasi.");

console.log(JSON.stringify({ result: failures.length ? "FAIL" : "PASS", translations: entries.length, checks: cases.size + 2, failures }, null, 2));
if (failures.length) process.exitCode = 1;
