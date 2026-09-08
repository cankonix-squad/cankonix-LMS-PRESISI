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
function runtime(store, role, page, workspace = "spn-jabar", search = "") {
  const alerts = [];
  const makeNode = () => ({ innerHTML: "", textContent: "", value: "", disabled: false, dataset: {}, classList: { add() {}, remove() {}, toggle() {} }, remove() {}, addEventListener() {}, setAttribute() {}, querySelector: () => makeNode(), querySelectorAll: () => [], insertAdjacentHTML(_position, html) { this.innerHTML = `${html}${this.innerHTML}`; }, scrollIntoView() {} });
  const platformRoot = makeNode(), nodes = new Map([["#platformContent", platformRoot]]);
  platformRoot.querySelectorAll = () => [];
  const document = { body: { dataset: { platformPage: page }, appendChild() {} }, querySelector(selector) { if (!nodes.has(selector)) nodes.set(selector, makeNode()); return nodes.get(selector); }, querySelectorAll: () => [], createElement: makeNode };
  const ctx = { localStorage: store.api, document, location: { pathname: `/pages/${page}.html`, search, reload() {} }, getWorkspace: () => ({ id: workspace, name: `${workspace.toUpperCase()} QA` }), getRole: () => role, renderSidebar() {}, renderHeader() {}, escapeHtml: value => String(value ?? ""), alert: message => alerts.push(message), setTimeout: callback => callback(), URLSearchParams, FormData, Intl, Date, Math, JSON, console };
  vm.createContext(ctx); new vm.Script(source, { filename: "platform-modules.js" }).runInContext(ctx); return { ctx, platformRoot, nodes, alerts };
}
const state = (store, workspace = "spn-jabar") => JSON.parse(store.values[`presisiPlatform:${workspace}`]);

const store = storage();
const organization = runtime(store, "adminunit", "organization");
check(organization.platformRoot.innerHTML.includes("Struktur Organisasi"), "halaman organisasi tidak dirender");
vm.runInContext(`const orgState=getPlatformState();globalThis.__org=addOrganizationUnit(orgState,{name:"Bagian Teknologi QA",parent:"SPN-JBR",leader:"Kabag Teknologi",positions:"4"});savePlatformState(orgState)`, organization.ctx);
let data = state(store);
check(organization.ctx.__org.ok && data.units.some(item => item.name === "Bagian Teknologi QA"), "unit organisasi tidak tersimpan");
check(data.units.find(item => item.name === "Bagian Teknologi QA")?.positions === 4, "jumlah jabatan unit tidak valid");
vm.runInContext(`const duplicateOrg=getPlatformState();globalThis.__duplicateOrg=addOrganizationUnit(duplicateOrg,{name:"bagian teknologi qa",parent:"SPN-JBR",leader:"Kabag",positions:2})`, organization.ctx);
check(!organization.ctx.__duplicateOrg.ok, "nama unit duplikat masih diterima");
vm.runInContext(`const invalidParent=getPlatformState();globalThis.__invalidParent=addOrganizationUnit(invalidParent,{name:"Unit Tanpa Induk",parent:"Tidak Ada",leader:"Kabag",positions:2})`, organization.ctx);
check(!organization.ctx.__invalidParent.ok, "parent organisasi yang tidak ada masih diterima");

const personnel = runtime(store, "adminunit", "personnel");
check(personnel.platformRoot.innerHTML.includes("Registry Personel"), "registry personel tidak dirender");
vm.runInContext(`const personState=getPlatformState();globalThis.__person=addPersonnelRecord(personState,{name:"Kompol Personel QA",nrp:"99112233",rank:"Kompol",unit:"SPN-JBR",position:"Analis QA",competency:"Penjaminan Mutu"});savePlatformState(personState)`, personnel.ctx);
data = state(store);
const person = data.personnel.find(item => item.nrp === "99112233");
check(personnel.ctx.__person.ok && Boolean(person), "personel baru tidak tersimpan");
check(Array.isArray(person?.assignments), "personel baru tidak memiliki koleksi assignment");
vm.runInContext(`const duplicatePerson=getPlatformState();globalThis.__duplicatePerson=addPersonnelRecord(duplicatePerson,{name:"Duplikat",nrp:"99112233",rank:"AKP",unit:"SPN-BLI",position:"Analis",competency:"Audit"})`, personnel.ctx);
check(!personnel.ctx.__duplicatePerson.ok, "NRP/NIP duplikat masih diterima");
vm.runInContext(`const incompletePerson=getPlatformState();globalThis.__incompletePerson=addPersonnelRecord(incompletePerson,{name:"Tidak Lengkap",nrp:"1"})`, personnel.ctx);
check(!personnel.ctx.__incompletePerson.ok, "personel tidak lengkap masih diterima");

const detail = runtime(store, "adminunit", "personnel-detail", "spn-jabar", `?id=${person?.id}`);
check(detail.platformRoot.innerHTML.includes("Kompol Personel QA"), "profil personel baru tidak dirender");
vm.runInContext(`const assignmentState=getPlatformState();globalThis.__assignment=assignPersonnelRecord(assignmentState,${JSON.stringify(person?.id)},{unit:"SPN-JBR",assignment:"SPPK 2028 / Kelas A",role:"Gadik"});savePlatformState(assignmentState)`, detail.ctx);
data = state(store);
check(detail.ctx.__assignment.ok && data.personnel.find(item => item.id === person?.id)?.assignments.length === 1, "assignment personel tidak tersimpan");
vm.runInContext(`const duplicateAssignment=getPlatformState();globalThis.__duplicateAssignment=assignPersonnelRecord(duplicateAssignment,${JSON.stringify(person?.id)},{unit:"SPN-JBR",assignment:"SPPK 2028 / Kelas A",role:"Gadik"})`, detail.ctx);
check(!detail.ctx.__duplicateAssignment.ok, "assignment duplikat masih diterima");
vm.runInContext(`const updateState=getPlatformState();globalThis.__update=updatePersonnelRecord(updateState,${JSON.stringify(person?.id)},{position:"Lead QA",status:"Aktif"});savePlatformState(updateState)`, detail.ctx);
data = state(store);
check(detail.ctx.__update.ok && data.personnel.find(item => item.id === person?.id)?.position === "Lead QA", "profil personel tidak diperbarui");
vm.runInContext(`const duplicateNrp=getPlatformState();globalThis.__duplicateNrp=updatePersonnelRecord(duplicateNrp,${JSON.stringify(person?.id)},{nrp:"76080421"})`, detail.ctx);
check(!detail.ctx.__duplicateNrp.ok, "update profil dapat memakai NRP personel lain");

const reports = runtime(store, "adminunit", "reports");
check(reports.platformRoot.innerHTML.includes("Report Center"), "Report Center tidak dirender");
check(reports.platformRoot.innerHTML.includes("Buka Laporan"), "katalog laporan tidak tersedia");
vm.runInContext(`const reportState=getPlatformState();globalThis.__schedule=addReportSchedule(reportState,{report:"Rekap Kehadiran Peserta",frequency:"Mingguan",recipient:"Pimpinan Satdik QA"});savePlatformState(reportState)`, reports.ctx);
data = state(store);
check(reports.ctx.__schedule.ok && data.schedules.some(item => item.recipient === "Pimpinan Satdik QA"), "jadwal laporan tidak tersimpan");
check(data.schedules.find(item => item.recipient === "Pimpinan Satdik QA")?.status === "Aktif", "jadwal laporan baru tidak aktif");
vm.runInContext(`const duplicateSchedule=getPlatformState();globalThis.__duplicateSchedule=addReportSchedule(duplicateSchedule,{report:"Rekap Kehadiran Peserta",frequency:"Mingguan",recipient:"pimpinan satdik qa"})`, reports.ctx);
check(!reports.ctx.__duplicateSchedule.ok, "jadwal laporan duplikat masih diterima");
check(source.includes("Pilih Kolom") && source.includes("Print") && source.includes("Export"), "aksi report viewer tidak lengkap");
check(source.includes("Filter periode laporan") && source.includes("Filter Satdik laporan"), "filter report viewer belum memiliki label aksesibel");

const beforeUnauthorized = store.values["presisiPlatform:spn-jabar"];
const viewer = runtime(store, "pimpinansatdik", "personnel-detail", "spn-jabar", `?id=${person?.id}`);
vm.runInContext(`const illegal=getPlatformState();illegal.personnel[0].position="ILLEGAL";globalThis.__blocked=savePlatformState(illegal)`, viewer.ctx);
check(viewer.ctx.__blocked === false && store.values["presisiPlatform:spn-jabar"] === beforeUnauthorized, "Pimpinan Satdik dapat memutasi profil personel");
check(viewer.platformRoot.innerHTML.includes("Mode baca-saja"), "profil personel read-only tidak diberi indikator");

const isolated = runtime(store, "adminunit", "personnel", "spn-bali");
vm.runInContext(`const isolatedState=getPlatformState();globalThis.__isolated=isolatedState.personnel.some(item=>item.nrp==="99112233");globalThis.__isolatedSchedule=isolatedState.schedules.some(item=>item.recipient==="Pimpinan Satdik QA")`, isolated.ctx);
check(isolated.ctx.__isolated === false, "personel SPN-JBR bocor ke SPN-BLI");
check(isolated.ctx.__isolatedSchedule === false, "jadwal laporan SPN-JBR bocor ke SPN-BLI");

console.log(JSON.stringify({ result: failures.length ? "FAIL" : "PASS", checks, lifecycle: ["Organisasi", "Personel", "Assignment", "Profile Update", "Report Viewer", "Report Schedule"], failures }, null, 2));
if (failures.length) process.exitCode = 1;
