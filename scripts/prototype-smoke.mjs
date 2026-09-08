#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const baseUrl = (process.argv[2] || "http://localhost:8080").replace(/\/$/, "");
const errors = [];
const warnings = [];
const interactionCounts = { links: 0, buttons: 0, forms: 0, fields: 0, dialogs: 0 };

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(target) : [target];
  });
}

const htmlFiles = walk(root).filter(file => file.endsWith(".html")).sort();

for (const file of htmlFiles) {
  const relative = path.relative(root, file);
  const source = fs.readFileSync(file, "utf8");

  interactionCounts.links += (source.match(/<a\b/gi) || []).length;
  interactionCounts.buttons += (source.match(/<button\b/gi) || []).length;
  interactionCounts.forms += (source.match(/<form\b/gi) || []).length;
  interactionCounts.fields += (source.match(/<(?:input|select|textarea)\b/gi) || []).length;
  interactionCounts.dialogs += (source.match(/<(?:dialog)\b|class="[^"]*\bmodal\b/gi) || []).length;

  if (!/^<!DOCTYPE html>/i.test(source.trim())) errors.push(`${relative}: doctype HTML tidak ditemukan`);
  if (!/<html[^>]+lang="id"/i.test(source)) warnings.push(`${relative}: lang=\"id\" tidak ditemukan`);
  if (!/<meta[^>]+name="viewport"/i.test(source)) errors.push(`${relative}: viewport meta tidak ditemukan`);
  if (!/<title>[^<]+<\/title>/i.test(source)) errors.push(`${relative}: title kosong/tidak ditemukan`);

  const ids = [...source.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  const duplicates = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
  duplicates.forEach(id => errors.push(`${relative}: id duplikat #${id}`));

  for (const match of source.matchAll(/<(?:a|link|script|img)[^>]+(?:href|src)="([^"]+)"/gi)) {
    const reference = match[1].split(/[?#]/)[0];
    if (!reference || /^(https?:|#|data:|mailto:|tel:)/i.test(reference)) continue;
    const target = path.resolve(path.dirname(file), reference);
    if (!fs.existsSync(target)) errors.push(`${relative}: target lokal tidak ditemukan → ${match[1]}`);
  }

  for (const match of source.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)) {
    try { new Function(match[1]); }
    catch (error) { errors.push(`${relative}: JavaScript inline tidak valid → ${error.message}`); }
  }

  const selectorIds = [
    ...source.matchAll(/querySelector(?:All)?\(["']#([A-Za-z][\w:-]*)["']\)/g),
    ...source.matchAll(/getElementById\(["']([A-Za-z][\w:-]*)["']\)/g)
  ].map(match => match[1]);
  [...new Set(selectorIds)].filter(id => !ids.includes(id)).forEach(id => {
    errors.push(`${relative}: script merujuk elemen yang tidak ada → #${id}`);
  });

  const emptyLinks = (source.match(/href="#"/g) || []).length;
  if (emptyLinks) warnings.push(`${relative}: ${emptyLinks} link kosong href=\"#\"`);
}

function makeStorage(seed = {}) {
  const values = { ...seed };
  return {
    values,
    storage: {
      get length() { return Object.keys(values).length; },
      key(index) { return Object.keys(values)[index] ?? null; },
      getItem(key) { return values[key] ?? null; },
      setItem(key, value) { values[key] = String(value); },
      removeItem(key) { delete values[key]; }
    }
  };
}

const appSource = fs.readFileSync(path.join(root, "assets/js/app.js"), "utf8");
const sessionStorage = makeStorage();
const context = {
  localStorage: sessionStorage.storage,
  location: { pathname: "/launcher.html" },
  document: { querySelector: () => null },
  confirm: () => true,
  Intl,
  Date,
  console
};
vm.createContext(context);
vm.runInContext(appSource, context);

const roles = vm.runInContext("roleMenus", context);
const roleLabels = vm.runInContext("roleLabels", context);
const workspaces = vm.runInContext("defaultWorkspaces", context);
for (const [role, menu] of Object.entries(roles)) {
  if (!roleLabels[role]) errors.push(`role ${role}: label tidak ditemukan`);
  if (!Array.isArray(menu) || !menu.length) errors.push(`role ${role}: menu kosong`);
  for (const [label, route] of menu) {
    const target = route.split(/[?#]/)[0];
    if (!fs.existsSync(path.resolve(root, target))) errors.push(`role ${role}: target ${label} tidak ditemukan → ${route}`);
  }
}
if (Object.keys(roles).length !== 11) errors.push(`jumlah role ${Object.keys(roles).length}; diharapkan 11`);
if (!workspaces.length) errors.push("default workspace tidak tersedia");

const resetStore = makeStorage({
  demoRole: "adminpusat",
  presisiSession: "session",
  presisiWorkspace: "spn-jabar",
  presisiCustomWorkspaces: "[]",
  "presisiLearning:spn-jabar": "{}",
  "presisiQuality:spn-jabar": "{}",
  "presisiDashboard:spn-jabar": "{}",
  unrelatedKey: "keep"
});
const resetContext = {
  localStorage: resetStore.storage,
  location: { pathname: "/launcher.html" },
  document: { querySelector: () => null },
  confirm: () => true,
  Intl,
  Date,
  console
};
vm.createContext(resetContext);
vm.runInContext(appSource, resetContext);
const removed = resetContext.resetPrototypeData();
if (removed !== 5 || resetStore.values.presisiWorkspace || resetStore.values["presisiLearning:spn-jabar"] || resetStore.values["presisiDashboard:spn-jabar"] ||
    resetStore.values.demoRole !== "adminpusat" || resetStore.values.presisiSession !== "session" ||
    resetStore.values.unrelatedKey !== "keep") {
  errors.push("reset data demo tidak memenuhi batas penghapusan yang aman");
}

let httpPassed = 0;
for (const file of htmlFiles) {
  const relative = path.relative(root, file).split(path.sep).join("/");
  try {
    const response = await fetch(`${baseUrl}/${relative}`);
    if (!response.ok) errors.push(`${relative}: HTTP ${response.status}`);
    else httpPassed += 1;
  } catch (error) {
    errors.push(`${relative}: server lokal tidak dapat diakses → ${error.message}`);
  }
}

console.log(JSON.stringify({
  result: errors.length ? "FAIL" : "PASS",
  htmlPages: htmlFiles.length,
  httpPassed,
  roles: Object.keys(roles).length,
  roleMenuItems: Object.values(roles).reduce((total, menu) => total + menu.length, 0),
  interactionCounts,
  errors,
  warnings
}, null, 2));

if (errors.length) process.exitCode = 1;
