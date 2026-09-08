#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = fs.readFileSync(path.join(root, "assets/js/platform-modules.js"), "utf8");
const failures = [];
let checks = 0;
const check = (condition, message) => { checks += 1; if (!condition) failures.push(message); };
function storage() { const values = {}; return { values, api: { getItem: key => values[key] ?? null, setItem: (key, value) => { values[key] = String(value); } } }; }
function runtime(store, role, page, workspace = "spn-jabar") {
  const alerts = [], mutationControls = [];
  const makeNode = () => ({ innerHTML: "", textContent: "", value: "", disabled: false, classList: { add() {}, remove() {}, toggle() {} }, remove() {}, addEventListener() {}, querySelector: () => makeNode(), querySelectorAll: () => [], insertAdjacentHTML(_position, html) { this.innerHTML = `${html}${this.innerHTML}`; }, scrollIntoView() {} });
  const platformRoot = makeNode(), nodes = new Map([["#platformContent", platformRoot]]);
  platformRoot.querySelectorAll = selector => { if (!selector) return []; const node = makeNode(); mutationControls.push(node); return [node]; };
  const document = {
    body: { dataset: { platformPage: page }, appendChild() {} },
    querySelector(selector) { if (!nodes.has(selector)) nodes.set(selector, makeNode()); return nodes.get(selector); },
    querySelectorAll: () => [], createElement: makeNode
  };
  const ctx = {
    localStorage: store.api, document, location: { pathname: `/pages/${page}.html`, search: "", reload() {} },
    getWorkspace: () => ({ id: workspace, name: `${workspace.toUpperCase()} QA` }), getRole: () => role,
    renderSidebar() {}, renderHeader() {}, escapeHtml: value => String(value ?? ""), alert: message => alerts.push(message),
    setTimeout: callback => callback(), URLSearchParams, FormData, Intl, Date, Math, JSON, console
  };
  vm.createContext(ctx); new vm.Script(source, { filename: "platform-modules.js" }).runInContext(ctx);
  return { ctx, platformRoot, nodes, alerts, mutationControls };
}
const state = (store, workspace = "spn-jabar") => JSON.parse(store.values[`presisiPlatform:${workspace}`]);

const store = storage();
const master = runtime(store, "adminpusat", "master-data");
check(master.platformRoot.innerHTML.includes("Master Data Nasional"), "Master Data tidak dirender");
check(vm.runInContext('canManagePlatformPage("master-data","adminpusat")', master.ctx), "Admin Pusat tidak dapat mengelola Master Data");
check(!vm.runInContext('canManagePlatformPage("master-data","adminti")', master.ctx), "Admin TI dapat mengubah Master Data");
vm.runInContext(`const qaMaster=getPlatformState();qaMaster.master.push({id:"MD-QA",group:"Governance",name:"Referensi QA",code:"QA-REF",version:"1.0",effective:"08-09-2026",status:"Review"});globalThis.__savedMaster=savePlatformState(qaMaster)`, master.ctx);
check(master.ctx.__savedMaster === true && state(store).master.some(item => item.id === "MD-QA"), "referensi Master Data tidak tersimpan");
vm.runInContext(`const qaApproved=getPlatformState();qaApproved.master.find(item=>item.id==="MD-QA").status="Berlaku";savePlatformState(qaApproved)`, master.ctx);
check(state(store).master.find(item => item.id === "MD-QA")?.status === "Berlaku", "approval Master Data tidak tersimpan");

const access = runtime(store, "adminpusat", "access-control");
check(access.platformRoot.innerHTML.includes("Identity & Access Management"), "IAM tidak dirender");
vm.runInContext(`const qaIam=getPlatformState();qaIam.users.push({id:"USR-QA",name:"Pengguna QA",nrp:"99000001",unit:"SPN-JBR",role:"Auditor",scope:"SPN-JBR",mfa:"Belum",status:"Aktif"});savePlatformState(qaIam)`, access.ctx);
check(state(store).users.some(item => item.id === "USR-QA"), "pengguna IAM tidak tersimpan");
vm.runInContext(`const qaMfa=getPlatformState(),u=qaMfa.users.find(item=>item.id==="USR-QA");u.mfa="Aktif";u.scope="Lintas Satdik";savePlatformState(qaMfa)`, access.ctx);
check(state(store).users.find(item => item.id === "USR-QA")?.mfa === "Aktif", "status MFA tidak diperbarui");
check(state(store).users.find(item => item.id === "USR-QA")?.scope === "Lintas Satdik", "data scope IAM tidak diperbarui");
check(state(store).policies.some(item => item.model.includes("ABAC")), "policy ABAC tidak tersedia");

const operations = runtime(store, "adminti", "operations");
check(operations.platformRoot.innerHTML.includes("Operations Command Center"), "Operations Command Center tidak dirender");
operations.nodes.get("#runHealth").onclick();
check(state(store).services.every(item => item.status === "Sehat"), "health check tidak menyehatkan seluruh service");

const recovery = runtime(store, "adminti", "system-health");
check(recovery.platformRoot.innerHTML.includes("Backup & Recovery"), "System Health atau backup tidak dirender");
check(state(store).backups.length === 3 && state(store).backups.every(item => item.status === "Berhasil"), "status backup tidak lengkap atau gagal");
const auditCount = state(store).audits.length;
recovery.nodes.get("#restoreDrill").onclick();
let current = state(store);
check(current.audits.length === auditCount + 1, "restore drill tidak membuat audit event");
check(current.audits[0]?.action === "RESTORE_DRILL" && current.audits[0]?.result === "Sukses", "audit restore drill tidak valid");
check(recovery.nodes.get("#lastDrill").textContent === "05 Sep 2026", "tanggal restore drill tidak diperbarui");

const audit = runtime(store, "adminti", "audit-log");
check(audit.platformRoot.innerHTML.includes("Audit Trail"), "Audit Trail tidak dirender");
check(audit.nodes.get("#auditRows")?.innerHTML.includes("RESTORE_DRILL"), "event restore drill tidak tampil di Audit Trail");
check(current.audits.every(item => item.correlation), "audit event tanpa correlation ID ditemukan");

const beforeUnauthorized = store.values["presisiPlatform:spn-jabar"];
const viewer = runtime(store, "peserta", "master-data");
vm.runInContext(`const illegal=getPlatformState();illegal.master.push({id:"ILLEGAL"});globalThis.__blocked=savePlatformState(illegal)`, viewer.ctx);
check(viewer.ctx.__blocked === false && store.values["presisiPlatform:spn-jabar"] === beforeUnauthorized, "role Peserta dapat memutasi governance");
check(viewer.alerts.some(message => message.includes("tidak tersedia")), "pesan akses governance dibatasi tidak tampil");
check(viewer.platformRoot.innerHTML.includes("Mode baca-saja"), "mode baca-saja governance tidak dirender");
check(viewer.mutationControls.every(control => control.disabled), "kontrol mutasi governance tidak dinonaktifkan");

const isolated = runtime(store, "adminpusat", "master-data", "spn-bali");
vm.runInContext(`const isolatedState=getPlatformState();globalThis.__isolatedHasQa=isolatedState.master.some(item=>item.id==="MD-QA")`, isolated.ctx);
check(isolated.ctx.__isolatedHasQa === false, "state governance SPN-JBR bocor ke SPN-BLI");

console.log(JSON.stringify({ result: failures.length ? "FAIL" : "PASS", checks, lifecycle: ["Master Review", "Master Published", "IAM", "Health Check", "Backup", "Restore Drill", "Audit Trail"], failures }, null, 2));
if (failures.length) process.exitCode = 1;
