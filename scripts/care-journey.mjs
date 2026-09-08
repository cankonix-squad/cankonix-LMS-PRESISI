#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];
let checks = 0;

function check(condition, message) { checks += 1; if (!condition) failures.push(message); }
function makeStorage() {
  const values = {};
  return { values, api: { getItem: key => values[key] ?? null, setItem: (key, value) => { values[key] = String(value); }, removeItem: key => { delete values[key]; } } };
}
function makeContext(storage, role, workspace = "spn-jabar") {
  const pageRoot = { innerHTML: "" };
  let modalSubmit = null;
  const toasts = [];
  const captureModal = (_title, _content, onSubmit) => { modalSubmit = onSubmit; };
  const context = {
    localStorage: storage.api,
    document: {
      querySelector(selector) { if (selector === "#careContent") return pageRoot; if (selector === ".toast") return null; return null; },
      createElement() { return { className: "", textContent: "", classList: { add() {} }, remove() {} }; },
      body: { appendChild() {} }
    },
    location: { pathname: "/pages/care-dashboard.html" },
    getWorkspace() { return { id: workspace, name: `${workspace.toUpperCase()} QA` }; },
    getRole() { return role; },
    renderSidebar() {}, renderHeader() {},
    escapeHtml(value = "") { return String(value).replace(/[&<>'"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]); },
    educationBadge(status) { return `<span>${status}</span>`; },
    educationId(prefix) { return `${prefix}-qa`; },
    formatDateId(value) { return value; },
    openEducationModal: captureModal,
    showEducationToast(message) { toasts.push(message); },
    setTimeout(callback) { callback(); },
    Intl, Date, console
  };
  vm.createContext(context);
  return { context, pageRoot, toasts, enableStubs() { context.openEducationModal = captureModal; context.showEducationToast = message => toasts.push(message); }, submitModal(data) { return modalSubmit?.(new Map(Object.entries(data))); } };
}
function load(context, ...files) {
  files.forEach(file => new vm.Script(fs.readFileSync(path.join(root, "assets/js", file), "utf8"), { filename: file }).runInContext(context));
}

const storage = makeStorage();
const guardian = makeContext(storage, "pengasuh");
load(guardian.context, "education-store.js", "attendance-store.js", "care-store.js", "care-page.js");
guardian.enableStubs();

check(guardian.pageRoot.innerHTML.includes("Dashboard Pengasuhan"), "dashboard Pengasuh tidak dirender");
vm.runInContext("addCareNote()", guardian.context);
guardian.submitModal({ participantId: "p-1", date: "2027-04-06", type: "Konseling", severity: "Tinggi", summary: "Catatan rahasia QA", followUp: "Pendampingan intensif", evidence: "Evidence QA.pdf", confidential: "on" });

let state = JSON.parse(storage.values["presisiCare:spn-jabar"]);
const note = state.notes.find(item => item.summary === "Catatan rahasia QA");
check(note?.participantId === "p-1", "catatan tidak terhubung ke peserta");
check(note?.confidential === true, "flag catatan rahasia tidak tersimpan");
check(note?.status === "Open", "status awal catatan bukan Open");
check(note?.evidence === "Evidence QA.pdf", "evidence pengasuhan tidak tersimpan");
check(vm.runInContext("careRisk('p-1')", guardian.context) === "Tinggi", "catatan severity Tinggi tidak menaikkan risiko");
check(guardian.pageRoot.innerHTML.includes("Terbatas") && guardian.pageRoot.innerHTML.includes("Catatan rahasia QA"), "catatan terbatas tidak tampil untuk Pengasuh");

vm.runInContext(`updateCareStatus(${JSON.stringify(note?.id)})`, guardian.context);
state = JSON.parse(storage.values["presisiCare:spn-jabar"]);
check(state.notes.find(item => item.id === note?.id)?.status === "Selesai", "tindak lanjut tidak dapat diselesaikan");
check(vm.runInContext("careRisk('p-1')", guardian.context) === "Rendah", "risiko tidak turun setelah tindak lanjut selesai");
check(guardian.toasts.includes("Catatan pengasuhan disimpan.") && guardian.toasts.includes("Status tindak lanjut diperbarui."), "feedback aksi Pengasuhan tidak lengkap");

const participant = makeContext(storage, "peserta");
load(participant.context, "education-store.js", "attendance-store.js", "care-store.js", "care-page.js");
check(participant.pageRoot.innerHTML.includes("Akses dibatasi"), "role Peserta tidak diblokir dari Pengasuhan");
check(!participant.pageRoot.innerHTML.includes("Catatan rahasia QA"), "catatan rahasia bocor ke Peserta");

const otherWorkspace = makeContext(storage, "pengasuh", "spn-bali");
load(otherWorkspace.context, "education-store.js", "attendance-store.js", "care-store.js", "care-page.js");
const otherState = JSON.parse(storage.values["presisiCare:spn-bali"]);
check(!otherState.notes.some(item => item.id === "care-qa"), "catatan SPN-JBR bocor ke SPN-BLI");

console.log(JSON.stringify({ result: failures.length ? "FAIL" : "PASS", checks, roles: ["pengasuh", "peserta"], workspace: "SPN-JBR", isolationWorkspace: "SPN-BLI", failures }, null, 2));
if (failures.length) process.exitCode = 1;
