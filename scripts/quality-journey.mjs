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
function context(store, role, page, workspace = "spn-jabar") {
  const rootNode = { innerHTML: "", insertAdjacentHTML(_position, html) { this.innerHTML = `${html}${this.innerHTML}`; } };
  const alerts = [];
  const ctx = {
    localStorage: store.api,
    document: {
      body: { dataset: { qualityPage: page }, appendChild() {} },
      querySelector: selector => selector === "#qualityContent" ? rootNode : null,
      createElement: () => ({ classList: { add() {} }, remove() {}, querySelector: () => ({ focus() {} }) })
    },
    location: { pathname: `/pages/quality-${page}.html`, search: "", href: `http://qa/quality-${page}.html` },
    getWorkspace: () => ({ id: workspace, name: `${workspace.toUpperCase()} QA` }), getRole: () => role,
    renderSidebar() {}, renderHeader() {}, escapeHtml: value => String(value ?? ""),
    alert: message => alerts.push(message), setTimeout: callback => callback(),
    URLSearchParams, FormData, Intl, Date, Math, console
  };
  vm.createContext(ctx);
  return { ctx, rootNode, alerts };
}
function load(runtime, ...files) {
  files.forEach(file => new vm.Script(fs.readFileSync(path.join(root, "assets/js", file), "utf8"), { filename: file }).runInContext(runtime.ctx));
  vm.runInContext(`
    globalThis.__modal = null;
    globalThis.__toasts = [];
    openEducationModal = (title, html, callback) => { globalThis.__modal = { title, html, callback }; };
    showEducationToast = message => globalThis.__toasts.push(message);
  `, runtime.ctx);
}
function submitModal(runtime, entries) {
  runtime.ctx.__formEntries = entries;
  vm.runInContext("__modal.callback(new Map(__formEntries))", runtime.ctx);
}
function qualityState(store, workspace = "spn-jabar") { return JSON.parse(store.values[`presisiQuality:${workspace}`]); }

const store = storage();
const standards = context(store, "auditor", "standards");
load(standards, "education-store.js", "quality-store.js", "quality-pages.js");
check(standards.rootNode.innerHTML.includes("8 Standar Pendidikan Polri"), "halaman standar mutu tidak dirender");
check(qualityState(store).standards.length === 8, "jumlah standar mutu bukan delapan");

for (const indicatorId of ["ind-5-1", "ind-5-2"]) {
  vm.runInContext(`updateQualityIndicator("std-05", "${indicatorId}")`, standards.ctx);
  submitModal(standards, [["status", "Memenuhi"], ["score", "90"], ["parameter", "Evidence tervalidasi QA"]]);
}
let state = qualityState(store);
check(state.standards.find(item => item.id === "std-05")?.score === 90, "agregasi score indikator tidak diperbarui");
check(state.standards.find(item => item.id === "std-05")?.status === "Memenuhi", "status standar tidak mengikuti score terbaru");

vm.runInContext('addQualityEvidence("std-05", "ind-5-1")', standards.ctx);
submitModal(standards, [["name", "Evidence Sarpras QA.pdf"], ["version", "2.0"], ["reviewer", "AKBP QA"], ["validUntil", "2028-12-31"], ["status", "Valid"]]);
state = qualityState(store);
const evidence = state.evidence.find(item => item.name === "Evidence Sarpras QA.pdf");
check(Boolean(evidence), "evidence mutu tidak tersimpan");
check(state.standards.find(item => item.id === "std-05").indicators.find(item => item.id === "ind-5-1").evidenceIds.includes(evidence?.id), "evidence tidak terhubung ke indikator");

vm.runInContext('addCorrectiveAction("std-05")', standards.ctx);
submitModal(standards, [["finding", "Ketersediaan simulator belum merata"], ["action", "Redistribusi simulator"], ["owner", "Bagian Logistik"], ["due", "2027-08-30"]]);
state = qualityState(store);
const actionId = state.actions.find(item => item.finding === "Ketersediaan simulator belum merata")?.id;
vm.runInContext(`advanceCorrectiveAction(${JSON.stringify(actionId)}); advanceCorrectiveAction(${JSON.stringify(actionId)}); advanceCorrectiveAction(${JSON.stringify(actionId)}); advanceCorrectiveAction(${JSON.stringify(actionId)})`, standards.ctx);
state = qualityState(store);
check(state.actions.find(item => item.id === actionId)?.progress === 100, "progress CAPA tidak mencapai 100%");
check(state.actions.find(item => item.id === actionId)?.status === "Selesai", "CAPA selesai tidak ditandai Selesai");

const audit = context(store, "auditor", "audit");
load(audit, "education-store.js", "quality-store.js", "quality-pages.js");
vm.runInContext("addQualityAudit()", audit.ctx);
submitModal(audit, [["title", "Audit QA Otomatis"], ["auditor", "AKBP QA"], ["date", "2027-09-01"], ["sample", "SPPK 2027 • Kelas A"]]);
state = qualityState(store);
const auditId = state.audits.find(item => item.title === "Audit QA Otomatis")?.id;
vm.runInContext(`addAuditFinding(${JSON.stringify(auditId)})`, audit.ctx);
submitModal(audit, [["standardId", "std-05"], ["severity", "Mayor"], ["text", "Dokumen pemeliharaan belum lengkap"], ["response", "Dokumen dilengkapi"]]);
vm.runInContext(`advanceAudit(${JSON.stringify(auditId)}); advanceAudit(${JSON.stringify(auditId)}); advanceAudit(${JSON.stringify(auditId)}); advanceAudit(${JSON.stringify(auditId)}); advanceAudit(${JSON.stringify(auditId)})`, audit.ctx);
state = qualityState(store);
const completedAudit = state.audits.find(item => item.id === auditId);
check(completedAudit?.status === "Closed", "audit tidak mencapai tahap Closed");
check(completedAudit?.findings[0]?.verification === "Closed", "temuan audit belum ditutup saat audit selesai");

const accreditation = context(store, "auditor", "accreditation");
load(accreditation, "education-store.js", "quality-store.js", "quality-pages.js");
vm.runInContext("addAccreditation()", accreditation.ctx);
submitModal(accreditation, [["program", "Sekolah Pengembangan Profesi Kepolisian 2027"], ["period", "2028"], ["selfScore", "90"], ["visitDate", "2028-04-15"]]);
state = qualityState(store);
const accreditationId = state.accreditation.find(item => item.period === "2028")?.id;
vm.runInContext(`advanceAccreditation(${JSON.stringify(accreditationId)}); advanceAccreditation(${JSON.stringify(accreditationId)}); advanceAccreditation(${JSON.stringify(accreditationId)}); advanceAccreditation(${JSON.stringify(accreditationId)}); advanceAccreditation(${JSON.stringify(accreditationId)})`, accreditation.ctx);
state = qualityState(store);
const result = state.accreditation.find(item => item.id === accreditationId);
check(result?.status === "Result Published" && result?.result === "Unggul", "hasil akreditasi tidak terbit sesuai score");
check(Boolean(result?.submissionDate) && result?.validUntil > result?.submissionDate, "tanggal submission atau masa berlaku akreditasi tidak valid");

const participant = context(store, "peserta", "standards");
load(participant, "education-store.js", "quality-store.js", "quality-pages.js");
const beforeUnauthorized = store.values["presisiQuality:spn-jabar"];
vm.runInContext('advanceCorrectiveAction("capa-1")', participant.ctx);
check(store.values["presisiQuality:spn-jabar"] === beforeUnauthorized, "role Peserta dapat mengubah data mutu");
check(participant.alerts.some(message => message.includes("pengelola berwenang")), "pesan akses dibatasi tidak tampil");
check(participant.rootNode.innerHTML.includes("Mode baca-saja"), "indikator mode baca-saja tidak dirender");

const isolated = context(store, "auditor", "standards", "spn-bali");
load(isolated, "education-store.js", "quality-store.js", "quality-pages.js");
const isolatedState = qualityState(store, "spn-bali");
check(!isolatedState.evidence.some(item => item.name === "Evidence Sarpras QA.pdf"), "evidence SPN-JBR bocor ke SPN-BLI");
check(!isolatedState.audits.some(item => item.title === "Audit QA Otomatis"), "audit SPN-JBR bocor ke SPN-BLI");
check(!isolatedState.accreditation.some(item => item.period === "2028"), "akreditasi SPN-JBR bocor ke SPN-BLI");

console.log(JSON.stringify({ result: failures.length ? "FAIL" : "PASS", checks, lifecycle: ["Indikator", "Evidence", "CAPA", "Audit Closed", "Akreditasi Terbit"], failures }, null, 2));
if (failures.length) process.exitCode = 1;
