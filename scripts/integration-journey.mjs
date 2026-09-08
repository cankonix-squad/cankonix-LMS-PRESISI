#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];
let checks = 0;
const check = (condition, message) => { checks += 1; if (!condition) failures.push(message); };
function storage() { const values = {}; return { values, api: { getItem: key => values[key] ?? null, setItem: (key, value) => { values[key] = String(value); } } }; }
function context(store, role, page, workspace = "spn-jabar", search = "") {
  const rootNode = { innerHTML: "", insertAdjacentHTML(_position, html) { this.innerHTML = `${html}${this.innerHTML}`; } };
  const alerts = [];
  const ctx = {
    localStorage: store.api,
    document: {
      body: { dataset: { integrationPage: page }, appendChild() {} },
      querySelector: selector => selector === "#integrationContent" ? rootNode : null,
      createElement: () => ({ classList: { add() {} }, remove() {}, querySelector: () => ({ focus() {} }) })
    },
    location: { pathname: `/pages/${page}.html`, search, href: `http://qa/${page}.html${search}` },
    getWorkspace: () => ({ id: workspace, name: `${workspace.toUpperCase()} QA` }), getRole: () => role,
    renderSidebar() {}, renderHeader() {}, escapeHtml: value => String(value ?? ""),
    alert: message => alerts.push(message), setTimeout: callback => callback(),
    URLSearchParams, FormData, Intl, Date, Math, console
  };
  vm.createContext(ctx);
  return { ctx, rootNode, alerts };
}
function load(runtime) {
  for (const file of ["education-store.js", "integration-store.js", "integration-pages.js"]) {
    new vm.Script(fs.readFileSync(path.join(root, "assets/js", file), "utf8"), { filename: file }).runInContext(runtime.ctx);
  }
  vm.runInContext(`
    globalThis.__modal = null;
    globalThis.__toasts = [];
    globalThis.__id = 0;
    educationId = prefix => prefix + "-qa-" + (++globalThis.__id);
    openEducationModal = (title, html, callback) => { globalThis.__modal = { title, html, callback }; };
    showEducationToast = message => globalThis.__toasts.push(message);
  `, runtime.ctx);
}
function submitModal(runtime, entries) {
  runtime.ctx.__formEntries = entries;
  vm.runInContext("__modal.callback(new Map(__formEntries))", runtime.ctx);
}
const state = store => JSON.parse(store.values.presisiIntegrationHub);

const store = storage();
const admin = context(store, "adminti", "connectors");
load(admin);
check(admin.rootNode.innerHTML.includes("Connector Catalog"), "Connector Catalog tidak dirender");
check(state(store).connectors.length === 7, "seed connector tidak lengkap");

vm.runInContext("addConnector()", admin.ctx);
submitModal(admin, [["name", "Sistem Akademik QA"], ["type", "REST API"], ["domain", "Akademik"], ["endpoint", "/qa/academic"], ["auth", "OAuth 2.0"], ["schedule", "Setiap 15 menit"]]);
let data = state(store);
const connectorId = data.connectors.find(item => item.name === "Sistem Akademik QA")?.id;
check(Boolean(connectorId), "connector baru tidak tersimpan");
check(data.connectors.find(item => item.id === connectorId)?.status === "Warning", "connector baru tidak masuk status konfigurasi");

vm.runInContext(`configureConnector(${JSON.stringify(connectorId)})`, admin.ctx);
submitModal(admin, [["endpoint", "/api/v2/academic"], ["auth", "mTLS"], ["schedule", "Setiap 10 menit"]]);
data = state(store);
check(data.connectors.find(item => item.id === connectorId)?.status === "Healthy", "konfigurasi connector tidak tervalidasi");
check(data.connectors.find(item => item.id === connectorId)?.endpoint === "/api/v2/academic", "endpoint connector tidak diperbarui");

vm.runInContext(`toggleConnector(${JSON.stringify(connectorId)}); runConnector(${JSON.stringify(connectorId)})`, admin.ctx);
data = state(store);
check(data.connectors.find(item => item.id === connectorId)?.paused === true, "pause connector gagal");
check(admin.alerts.includes("Connector sedang paused."), "run connector paused tidak ditolak");
const runCountBefore = data.runs.length;
vm.runInContext(`toggleConnector(${JSON.stringify(connectorId)}); runConnector(${JSON.stringify(connectorId)})`, admin.ctx);
data = state(store);
check(data.runs.length === runCountBefore + 1 && data.runs[0].status === "Completed", "run connector sehat tidak selesai");
check(data.connectors.find(item => item.id === connectorId)?.lastSync !== "Belum pernah", "last sync connector tidak diperbarui");

vm.runInContext('runConnector("conn-cctv")', admin.ctx);
data = state(store);
const failedRun = data.runs.find(item => item.connectorId === "conn-cctv" && item.id.startsWith("run-qa-"));
check(failedRun?.status === "Completed with Error" && failedRun?.rejected > 0, "run error tidak mencatat rejected record");
vm.runInContext(`retryRejected(${JSON.stringify(failedRun?.id)}, ${JSON.stringify(failedRun?.rejectedRecords[0]?.id)})`, admin.ctx);
data = state(store);
const retriedRun = data.runs.find(item => item.id === failedRun?.id);
check(retriedRun?.status === "Completed" && retriedRun?.rejected === 0, "retry tidak menyelesaikan rejected record");
check(retriedRun?.accepted === retriedRun?.records, "jumlah accepted tidak konsisten setelah retry");

const mapping = context(store, "adminti", "mapping", "spn-jabar", "?connector=conn-student");
load(mapping);
check(mapping.rootNode.innerHTML.includes("Mapping v1.4"), "filter mapping connector tidak bekerja");
vm.runInContext('addMappingField("map-student")', mapping.ctx);
submitModal(mapping, [["source", "class_code"], ["target", "participant.class_code"], ["transform", "trim"], ["sample", "A-01"], ["required", "on"]]);
data = state(store);
check(data.mappings.find(item => item.id === "map-student")?.fields.some(field => field.source === "class_code" && field.required), "mapping field baru tidak tersimpan");
check(data.mappings.find(item => item.id === "map-student")?.status === "Draft", "mapping berubah tidak kembali ke Draft");
vm.runInContext('publishMapping("map-student")', mapping.ctx);
data = state(store);
check(data.mappings.find(item => item.id === "map-student")?.version === "1.5", "versi mapping tidak bertambah");
check(data.mappings.find(item => item.id === "map-student")?.status === "Published", "mapping tidak terpublikasi");

const quality = context(store, "adminti", "quality");
load(quality);
check(quality.rootNode.innerHTML.includes("Education Data Hub") && quality.rootNode.innerHTML.includes("Record Lineage"), "Data Quality atau lineage tidak dirender");
vm.runInContext('resolveConflict("conf-1", "B")', quality.ctx);
data = state(store);
check(data.conflicts.find(item => item.id === "conf-1")?.status === "Resolved", "konflik data tidak terselesaikan");
check(data.conflicts.find(item => item.id === "conf-1")?.resolution === "LEMDIKLAT", "pilihan resolusi konflik tidak tersimpan");

const viewer = context(store, "peserta", "dashboard");
load(viewer);
const beforeUnauthorized = store.values.presisiIntegrationHub;
vm.runInContext('toggleConnector("conn-personnel")', viewer.ctx);
check(store.values.presisiIntegrationHub === beforeUnauthorized, "role Peserta dapat mengubah connector");
check(viewer.alerts.some(message => message.includes("Admin TI atau Admin Pusat")), "pesan akses integrasi dibatasi tidak tampil");
check(viewer.rootNode.innerHTML.includes("Mode baca-saja"), "indikator mode baca-saja integrasi tidak dirender");

const otherWorkspace = context(store, "adminti", "dashboard", "spn-bali");
load(otherWorkspace);
check(state(store).connectors.some(item => item.id === connectorId), "state integrasi tingkat platform tidak konsisten lintas workspace");

console.log(JSON.stringify({ result: failures.length ? "FAIL" : "PASS", checks, lifecycle: ["Connector", "Configure", "Pause/Resume", "Sync", "Retry", "Mapping Publish", "Conflict Resolution"], scope: "Platform-wide", failures }, null, 2));
if (failures.length) process.exitCode = 1;
