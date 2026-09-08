#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];
let checks = 0;
let id = 0;
const check = (condition, message) => { checks += 1; if (!condition) failures.push(message); };
const read = file => fs.readFileSync(path.join(root, file), "utf8");
function storage() { const values = {}; return { values, api: { getItem: key => values[key] ?? null, setItem: (key, value) => { values[key] = String(value); } } }; }
function node() { return { innerHTML: "", value: "", dataset: {}, classList: { add() {}, remove() {}, toggle() {} }, remove() {}, addEventListener() {}, setAttribute() {}, querySelector: () => node(), querySelectorAll: () => [], insertAdjacentHTML(_position, html) { this.innerHTML = `${html}${this.innerHTML}`; } }; }
function runtime(store, role, workspace, storeFile, pageFile, rootSelector) {
  const nodes = new Map([[rootSelector, node()]]), prompts = [], toasts = [], alerts = [];
  const document = { querySelector(selector) { if (!nodes.has(selector)) nodes.set(selector, node()); return nodes.get(selector); }, querySelectorAll: () => [], createElement: node };
  const ctx = {
    localStorage: store.api, document, location: { search: "" }, URLSearchParams, Intl, Date, Math, JSON, console,
    getRole: () => role, getWorkspace: () => ({ id: workspace, code: workspace.toUpperCase(), name: `${workspace.toUpperCase()} QA` }),
    renderSidebar() {}, renderHeader() {}, escapeHtml: value => String(value ?? ""), educationBadge: value => String(value), formatDateId: value => String(value),
    educationId: prefix => `${prefix}-qa-${++id}`, learningId: prefix => `${prefix}-qa-${++id}`,
    roleLabels: { pimpinan: "Pimpinan Lemdiklat", pimpinansatdik: "Pimpinan Satdik", adminpusat: "Admin Pusat", adminunit: "Admin Satdik", akademik: "Pengelola Akademik", gadik: "Gadik / Instruktur", peserta: "Peserta Didik", adminti: "Admin TI" },
    getLearningData: () => ({ courses: [{ id: "course-1", title: "Course QA", sections: [{ id: "section-1" }] }], materials: [], announcements: [], meetings: [], threads: [] }), saveLearningData() {},
    openEducationModal(_title, _html, callback) { ctx.__submit = callback; }, showEducationToast: message => toasts.push(message), alert: message => alerts.push(message), prompt: () => prompts.shift() ?? null
  };
  vm.createContext(ctx);
  new vm.Script(`${read(storeFile)}\n${read(pageFile)}`, { filename: pageFile }).runInContext(ctx);
  return { ctx, nodes, root: nodes.get(rootSelector), prompts, toasts, alerts };
}
const saved = (store, key) => JSON.parse(store.values[key]);
const submit = (run, values) => run.ctx.__submit(new Map(Object.entries(values)));

const store = storage();

const library = runtime(store, "adminunit", "spn-jabar", "assets/js/library-store.js", "assets/js/library-page.js", "#libraryContent");
check(library.root.innerHTML.includes("Master Library"), "Master Library tidak dirender");
vm.runInContext("addLibraryResource()", library.ctx);
submit(library, { title: "Hanjar Operasi QA", category: "Hanjar", format: "PDF", owner: "SPN-JBR QA", scope: "Seluruh Satdik", summary: "Materi regression", tags: "QA, Operasi" });
let libraryState = saved(store, "presisiMasterLibrary");
const resourceId = libraryState.resources.find(item => item.title === "Hanjar Operasi QA")?.id;
check(Boolean(resourceId), "resource Library baru tidak tersimpan");
check(libraryState.resources.find(item => item.id === resourceId)?.status === "Draft", "resource baru tidak berstatus Draft");
library.prompts.push("1.1"); vm.runInContext(`newLibraryVersion(${JSON.stringify(resourceId)})`, library.ctx);
libraryState = saved(store, "presisiMasterLibrary");
check(libraryState.resources.find(item => item.id === resourceId)?.status === "Review", "versi baru tidak masuk Review");
vm.runInContext(`approveLibraryResource(${JSON.stringify(resourceId)})`, library.ctx);
vm.runInContext(`downloadLibraryResource(${JSON.stringify(resourceId)})`, library.ctx);
libraryState = saved(store, "presisiMasterLibrary");
check(libraryState.resources.find(item => item.id === resourceId)?.status === "Approved", "resource Library tidak dapat disetujui");
check(libraryState.resources.find(item => item.id === resourceId)?.downloads === 1, "download Library tidak tercatat");
const libraryBefore = store.values.presisiMasterLibrary;
const libraryViewer = runtime(store, "peserta", "spn-jabar", "assets/js/library-store.js", "assets/js/library-page.js", "#libraryContent");
vm.runInContext(`globalThis.__blocked=approveLibraryResource(${JSON.stringify(resourceId)})`, libraryViewer.ctx);
check(libraryViewer.ctx.__blocked === false && store.values.presisiMasterLibrary === libraryBefore, "Peserta dapat memutasi Library");
check(libraryViewer.root.innerHTML.includes("Mode baca-saja"), "mode baca-saja Library tidak terlihat");

const collaboration = runtime(store, "adminunit", "spn-jabar", "assets/js/collaboration-store.js", "assets/js/collaboration-page.js", "#collaborationContent");
vm.runInContext("createCollaborationChannel()", collaboration.ctx);
submit(collaboration, { name: "Channel QA", type: "Kelas", scope: "qa-1" });
let collaborationState = saved(store, "presisiCollaboration:spn-jabar");
const channelId = collaborationState.channels.find(item => item.name === "Channel QA")?.id;
check(Boolean(channelId), "channel baru tidak tersimpan");
vm.runInContext("document.querySelector('#chatMessage').value='Pesan admin QA';sendCollaborationMessage()", collaboration.ctx);
collaborationState = saved(store, "presisiCollaboration:spn-jabar");
check(collaborationState.channels.find(item => item.id === channelId)?.messages.length === 1, "pesan channel tidak tersimpan");
check(collaborationState.channels.find(item => item.id === channelId)?.unreadBy.includes("p-1"), "unread peserta tidak diperbarui");
const participant = runtime(store, "peserta", "spn-jabar", "assets/js/collaboration-store.js", "assets/js/collaboration-page.js", "#collaborationContent");
vm.runInContext("globalThis.__blocked=createCollaborationChannel()", participant.ctx);
check(participant.ctx.__blocked === false, "Peserta dapat membuat channel");
vm.runInContext(`selectChannel(${JSON.stringify(channelId)})`, participant.ctx);
vm.runInContext("document.querySelector('#chatMessage').value='Balasan peserta QA';sendCollaborationMessage()", participant.ctx);
collaborationState = saved(store, "presisiCollaboration:spn-jabar");
check(collaborationState.channels.find(item => item.id === channelId)?.messages.at(-1)?.text === "Balasan peserta QA", "Peserta tidak dapat membalas channel");
const collaborationIsolated = runtime(store, "adminunit", "spn-bali", "assets/js/collaboration-store.js", "assets/js/collaboration-page.js", "#collaborationContent");
check(!collaborationIsolated.root.innerHTML.includes("Channel QA"), "channel SPN-JBR bocor ke SPN-BLI");

const cctv = runtime(store, "adminunit", "spn-jabar", "assets/js/operations-store.js", "assets/js/cctv-page.js", "#cctvContent");
vm.runInContext("addCamera()", cctv.ctx);
submit(cctv, { name: "CAM QA", building: "Gedung QA", location: "Lobby QA", stream: "RTSP", owner: "Bagian TI", retention: "21" });
let operations = saved(store, "presisiOperations:spn-jabar");
const cameraId = operations.cameras.find(item => item.name === "CAM QA")?.id;
check(Boolean(cameraId) && operations.cameras.find(item => item.id === cameraId)?.retention === 21, "kamera baru tidak tersimpan valid");
vm.runInContext(`openCamera(${JSON.stringify(cameraId)})`, cctv.ctx);
operations = saved(store, "presisiOperations:spn-jabar");
check(operations.cctvAccessLog[0]?.cameraId === cameraId, "akses live CCTV tidak diaudit");
cctv.prompts.push("Incident QA"); vm.runInContext(`createCctvIncident(${JSON.stringify(cameraId)})`, cctv.ctx);
operations = saved(store, "presisiOperations:spn-jabar");
const incidentId = operations.incidents.find(item => item.title === "Incident QA")?.id;
check(Boolean(incidentId), "incident CCTV tidak tersimpan");
vm.runInContext(`closeCctvIncident(${JSON.stringify(incidentId)})`, cctv.ctx);
operations = saved(store, "presisiOperations:spn-jabar");
check(operations.incidents.find(item => item.id === incidentId)?.status === "Closed", "incident CCTV tidak dapat ditutup");
const cctvBefore = store.values["presisiOperations:spn-jabar"];
const cctvViewer = runtime(store, "pimpinansatdik", "spn-jabar", "assets/js/operations-store.js", "assets/js/cctv-page.js", "#cctvContent");
vm.runInContext(`globalThis.__blocked=createCctvIncident(${JSON.stringify(cameraId)})`, cctvViewer.ctx);
check(cctvViewer.ctx.__blocked === false && store.values["presisiOperations:spn-jabar"] === cctvBefore, "role monitor dapat memutasi CCTV");
check(cctvViewer.root.innerHTML.includes("Mode monitor"), "indikator mode monitor CCTV tidak terlihat");

const assets = runtime(store, "adminunit", "spn-jabar", "assets/js/operations-store.js", "assets/js/assets-page.js", "#assetContent");
vm.runInContext("addAsset()", assets.ctx);
submit(assets, { code: "AST-QA-001", name: "Perangkat QA", category: "Elektronik", subcategory: "Testing", building: "Gedung QA", room: "Lab QA", value: "12500000", condition: "Baik" });
operations = saved(store, "presisiOperations:spn-jabar");
const assetId = operations.assets.find(item => item.code === "AST-QA-001")?.id;
check(Boolean(assetId) && operations.assets.find(item => item.id === assetId)?.value === 12500000, "aset baru tidak tersimpan valid");
vm.runInContext("requestLoan()", assets.ctx);
submit(assets, { assetId, borrower: "Gadik QA", start: "2027-04-01", due: "2027-04-02", conditionOut: "Baik" });
operations = saved(store, "presisiOperations:spn-jabar");
const loanId = operations.loans.find(item => item.assetId === assetId)?.id;
vm.runInContext(`advanceLoan(${JSON.stringify(loanId)});advanceLoan(${JSON.stringify(loanId)})`, assets.ctx);
assets.prompts.push("Baik"); vm.runInContext(`advanceLoan(${JSON.stringify(loanId)})`, assets.ctx);
operations = saved(store, "presisiOperations:spn-jabar");
check(operations.loans.find(item => item.id === loanId)?.status === "Returned", "peminjaman tidak mencapai Returned");
check(operations.assets.find(item => item.id === assetId)?.status === "Available", "aset tidak kembali Available");
vm.runInContext("addMaintenance()", assets.ctx);
submit(assets, { assetId, schedule: "2027-04-03", vendor: "Vendor QA", cost: "500000", downtime: "1 hari", issue: "Uji maintenance" });
operations = saved(store, "presisiOperations:spn-jabar");
const maintenanceId = operations.maintenance.find(item => item.issue === "Uji maintenance")?.id;
vm.runInContext(`advanceMaintenance(${JSON.stringify(maintenanceId)});advanceMaintenance(${JSON.stringify(maintenanceId)})`, assets.ctx);
operations = saved(store, "presisiOperations:spn-jabar");
check(operations.maintenance.find(item => item.id === maintenanceId)?.status === "Completed", "maintenance tidak mencapai Completed");
const stockBefore = operations.stock.find(item => item.id === "stock-2").quantity;
assets.prompts.push("3"); vm.runInContext("stockTransaction('stock-2','Issue')", assets.ctx);
operations = saved(store, "presisiOperations:spn-jabar");
check(operations.stock.find(item => item.id === "stock-2")?.quantity === stockBefore - 3, "transaksi stok tidak konsisten");
const assetBefore = store.values["presisiOperations:spn-jabar"];
const assetViewer = runtime(store, "pimpinan", "spn-jabar", "assets/js/operations-store.js", "assets/js/assets-page.js", "#assetContent");
vm.runInContext(`globalThis.__blocked=advanceLoan(${JSON.stringify(loanId)})`, assetViewer.ctx);
check(assetViewer.ctx.__blocked === false && store.values["presisiOperations:spn-jabar"] === assetBefore, "Pimpinan dapat memutasi aset");
check(assetViewer.root.innerHTML.includes("Mode baca-saja"), "indikator baca-saja aset tidak terlihat");
const operationsIsolated = runtime(store, "adminunit", "spn-bali", "assets/js/operations-store.js", "assets/js/assets-page.js", "#assetContent");
check(!operationsIsolated.root.innerHTML.includes("AST-QA-001"), "aset SPN-JBR bocor ke SPN-BLI");
check(!saved(store, "presisiOperations:spn-bali").cameras.some(item => item.name === "CAM QA"), "kamera SPN-JBR bocor ke SPN-BLI");

console.log(JSON.stringify({ result: failures.length ? "FAIL" : "PASS", checks, lifecycle: ["Library", "Channel & Chat", "CCTV & Incident", "Asset", "Loan", "Maintenance", "Stock"], failures }, null, 2));
if (failures.length) process.exitCode = 1;
