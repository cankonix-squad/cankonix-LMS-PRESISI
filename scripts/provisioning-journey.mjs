#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];
let checks = 0;
const check = (condition, message) => { checks += 1; if (!condition) failures.push(message); };
function storage(role) {
  const values = { demoRole: role };
  return { values, api: {
    get length() { return Object.keys(values).length; },
    getItem: key => values[key] ?? null,
    setItem: (key, value) => { values[key] = String(value); },
    removeItem: key => { delete values[key]; },
    key: index => Object.keys(values)[index] ?? null
  } };
}
function runtime(store) {
  const nodes = {
    "#steps": { innerHTML: "" },
    "#wizardPanel": { innerHTML: "", insertAdjacentHTML(_position, html) { this.innerHTML = `${html}${this.innerHTML}`; } },
    "#saveDraftTop": { addEventListener() {}, disabled: false }
  };
  const alerts = [];
  const document = {
    body: { classList: { toggle() {}, remove() {}, contains() { return false; } } },
    querySelector: selector => nodes[selector] || null,
    querySelectorAll: () => [], addEventListener() {}
  };
  const ctx = {
    localStorage: store.api, document, window: { matchMedia: null },
    location: { pathname: "/pages/lms-unit-create.html", href: "http://qa/pages/lms-unit-create.html", reload() {} },
    alert: message => alerts.push(message), confirm: () => true,
    URLSearchParams, Intl, Date, Math, JSON, console
  };
  vm.createContext(ctx);
  new vm.Script(fs.readFileSync(path.join(root, "assets/js/app.js"), "utf8"), { filename: "app.js" }).runInContext(ctx);
  vm.runInContext("renderSidebar=()=>{};renderHeader=()=>{}", ctx);
  new vm.Script(fs.readFileSync(path.join(root, "assets/js/provisioning.js"), "utf8"), { filename: "provisioning.js" }).runInContext(ctx);
  return { ctx, nodes, alerts };
}
const custom = store => JSON.parse(store.values.presisiCustomWorkspaces || "[]");

const store = storage("adminpusat");
const admin = runtime(store);
check(admin.nodes["#wizardPanel"].innerHTML.includes("Profil dan Branding Satdik"), "wizard provisioning tidak dirender");
vm.runInContext(`Object.assign(state,{
  name:"SPN Polda QA",code:"SPN-QA",type:"Sekolah Polisi Negara",region:"Jawa Barat",address:"Kompleks QA",
  parent:"Mandiri",color:"#174a78",domain:"spn-qa.presisi.test",locale:"id-ID",academicYear:"2028",template:"Full LMS",
  modules:["Organisasi","Kurikulum","Learning","Assessment","Absensi"],subunits:"Bagian Akademik\\nBagian Pengasuhan",
  leader:"Kombes Pol. Pimpinan QA",leaderId:"70000001",admin:"AKBP Admin QA",adminId:"admin.qa@presisi.test",
  source:"REST API",sync:"Setiap 15 menit",mappings:[{source:"nrp",target:"personnel_id"},{source:"nama",target:"full_name"}]
});globalThis.__draft=persist("Draft")`, admin.ctx);
let records = custom(store);
const draft = records.find(item => item.code === "SPN-QA");
check(Boolean(draft), "draft workspace tidak tersimpan");
check(draft?.status === "Draft", "workspace awal bukan Draft");
check(draft?.moduleList.length === 5 && draft?.modules === 5, "capability workspace tidak tersimpan konsisten");
check(draft?.subunits.length === 2, "struktur subunit tidak tersimpan");
check(draft?.leader.name === "Kombes Pol. Pimpinan QA" && draft?.admin.name === "AKBP Admin QA", "pimpinan atau admin awal tidak tersimpan");
check(draft?.mappings.length === 2 && draft?.source === "REST API", "sumber data atau mapping tidak tersimpan");
check(draft?.onboarding.every(value => value === false), "checklist onboarding awal tidak kosong");

const countBeforeDuplicate = records.length;
vm.runInContext('globalThis.__duplicate=persist("Draft")', admin.ctx);
records = custom(store);
check(admin.ctx.__duplicate === null && records.length === countBeforeDuplicate, "kode duplikat masih dapat dipersist");
check(admin.alerts.some(message => message.includes("Kode satdik sudah digunakan")), "pesan kode duplikat tidak tampil");

check(vm.runInContext('canTransitionWorkspaceStatus("Draft","Review")', admin.ctx), "transisi Draft ke Review tidak tersedia");
check(!vm.runInContext('canTransitionWorkspaceStatus("Draft","Aktif")', admin.ctx), "Draft dapat melewati tahap Review dari registry");
vm.runInContext(`updateCustomWorkspace(${JSON.stringify(draft?.id)},{status:"Review"})`, admin.ctx);
records = custom(store);
check(records.find(item => item.id === draft?.id)?.status === "Review", "pengajuan Review tidak tersimpan");
check(vm.runInContext('canTransitionWorkspaceStatus("Review","Aktif")', admin.ctx), "transisi Review ke Aktif tidak tersedia");
vm.runInContext(`updateCustomWorkspace(${JSON.stringify(draft?.id)},{status:"Aktif",onboarding:[true,true,false,false,false]})`, admin.ctx);
records = custom(store);
const active = records.find(item => item.id === draft?.id);
check(active?.status === "Aktif", "aktivasi workspace tidak tersimpan");
check(active?.onboarding.filter(Boolean).length === 2, "progress onboarding tidak tersimpan");
check(vm.runInContext(`accessibleWorkspaces("adminpusat").some(item=>item.id===${JSON.stringify(draft?.id)})`, admin.ctx), "workspace aktif tidak muncul untuk Admin Pusat");
check(vm.runInContext(`updateCustomWorkspace("spn-jabar",{status:"Arsip"})`, admin.ctx) === false, "workspace master dapat dimutasi");

vm.runInContext(`state.code="SPN-QA2";state.name="SPN Aktivasi Langsung QA";activate()`, admin.ctx);
records = custom(store);
const direct = records.find(item => item.code === "SPN-QA2");
check(direct?.status === "Aktif", "aktivasi langsung dari review wizard gagal");
check(store.values.presisiWorkspace === direct?.id, "workspace aktif tidak dipilih setelah aktivasi");
check(admin.nodes["#wizardPanel"].innerHTML.includes("berhasil diaktifkan"), "success state aktivasi tidak dirender");

store.values.demoRole = "peserta";
const viewer = runtime(store);
const beforeUnauthorized = store.values.presisiCustomWorkspaces;
vm.runInContext('state.code="ILLEGAL";globalThis.__blocked=persist("Draft")', viewer.ctx);
check(viewer.ctx.__blocked === null && store.values.presisiCustomWorkspaces === beforeUnauthorized, "role Peserta dapat melakukan provisioning");
check(viewer.alerts.some(message => message.includes("Admin Pusat")), "pesan pembatasan provisioning tidak tampil");
check(viewer.nodes["#wizardPanel"].innerHTML.includes("Mode baca-saja"), "mode baca-saja provisioning tidak dirender");

const registryHtml = fs.readFileSync(path.join(root, "pages/institutions.html"), "utf8");
const manageHtml = fs.readFileSync(path.join(root, "pages/institution-manage.html"), "utf8");
check(registryHtml.includes("<option>Review</option>"), "filter Review belum tersedia di registry");
check(manageHtml.includes("Ajukan Review"), "aksi Ajukan Review belum tersedia di pengelolaan workspace");
check(manageHtml.includes("canTransitionWorkspaceStatus"), "pengelolaan workspace tidak memakai guard transisi");

console.log(JSON.stringify({ result: failures.length ? "FAIL" : "PASS", checks, lifecycle: ["Draft", "Review", "Aktif", "Onboarding"], failures }, null, 2));
if (failures.length) process.exitCode = 1;
