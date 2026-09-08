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
  const rootNode = { innerHTML: "" }, alerts = [], toasts = [];
  const ctx = {
    localStorage: store.api,
    document: { body: { dataset: { competencyPage: page }, appendChild() {} }, querySelector: selector => selector === "#competencyContent" ? rootNode : null, createElement: () => ({ classList: { add() {} }, remove() {} }) },
    location: { pathname: `/pages/${page}.html`, search: "", href: `http://qa/${page}.html` },
    navigator: { clipboard: { writeText() {} } }, window: { print() {} },
    getWorkspace: () => ({ id: workspace, name: `${workspace.toUpperCase()} QA` }), getRole: () => role,
    renderSidebar() {}, renderHeader() {}, openEducationModal() {},
    escapeHtml: value => String(value ?? ""), educationBadge: value => `<span>${value}</span>`, formatDateId: value => value || "-",
    educationId: prefix => `${prefix}-${Date.now()}`, alert: message => alerts.push(message), showEducationToast: message => toasts.push(message),
    setTimeout: callback => callback(), URLSearchParams, FormData, Intl, Date, console
  };
  vm.createContext(ctx); return { ctx, rootNode, alerts, toasts };
}
function load(ctx, ...files) { files.forEach(file => new vm.Script(fs.readFileSync(path.join(root, "assets/js", file), "utf8"), { filename: file }).runInContext(ctx)); }

const store = storage();
const assessor = context(store, "asesor", "assessments");
load(assessor.ctx, "education-store.js", "learning-store.js", "competency-store.js", "competency-pages.js");
vm.runInContext(`competency.assessments.unshift({ id: "qa-assessment", schemeId: "scheme-lead-2", participantId: "p-1", assessorId: "assessor-1", date: "2027-04-20", method: "Observasi & Portofolio", status: "Dijadwalkan", unitResults: {} }); saveCompetencyData(competency); renderCompetencyPage();`, assessor.ctx);
check(assessor.rootNode.innerHTML.includes("qa-assessment") || assessor.rootNode.innerHTML.includes("Ipda Andi Saputra"), "asesmen baru tidak dirender");
vm.runInContext("submitCompetencyReview('qa-assessment')", assessor.ctx);
check(assessor.alerts.includes("Seluruh unit kompetensi harus dinilai."), "guardrail unit belum lengkap tidak bekerja");
vm.runInContext(`competency.assessments.find(x=>x.id==="qa-assessment").unitResults={
  "unit-lead-1":{evidence:"Analisis QA.pdf",checklist:true,note:"Memenuhi",decision:"Kompeten"},
  "unit-lead-2":{evidence:"Keputusan QA.mp4",checklist:true,note:"Memenuhi",decision:"Kompeten"}
}; saveCompetencyData(competency); submitCompetencyReview("qa-assessment");`, assessor.ctx);
let state = JSON.parse(store.values["presisiCompetency:spn-jabar"]);
check(state.assessments.find(x => x.id === "qa-assessment")?.status === "Review", "asesmen lengkap gagal masuk Review");
check(Object.values(state.assessments.find(x => x.id === "qa-assessment").unitResults).every(x => x.evidence && x.checklist), "evidence atau checklist unit tidak lengkap");
vm.runInContext("approveCompetencyAssessment('qa-assessment'); approveCompetencyAssessment('qa-assessment')", assessor.ctx);
state = JSON.parse(store.values["presisiCompetency:spn-jabar"]);
const certificates = state.certificates.filter(x => x.assessmentId === "qa-assessment");
check(state.assessments.find(x => x.id === "qa-assessment")?.status === "Kompeten", "approval tidak menghasilkan keputusan Kompeten");
check(certificates.length === 1, "sertifikat tidak terbit tepat satu kali");
check(certificates[0]?.verified === true && certificates[0]?.status === "Terbit", "status sertifikat tidak valid");
check(certificates[0]?.expiryDate > certificates[0]?.issueDate, "masa berlaku sertifikat tidak valid");
vm.runInContext(`verifyCertificate(${JSON.stringify(certificates[0]?.id)})`, assessor.ctx);
check(assessor.alerts.some(message => message.includes("VALID") && message.includes(certificates[0]?.number)), "verification view tidak menunjukkan sertifikat valid");

const passport = context(store, "peserta", "passport");
load(passport.ctx, "education-store.js", "learning-store.js", "competency-store.js", "competency-pages.js");
check(passport.rootNode.innerHTML.includes(certificates[0]?.number), "sertifikat tidak muncul di Digital Passport peserta");
check(passport.rootNode.innerHTML.includes("Ipda Andi Saputra"), "identitas peserta tidak muncul di Digital Passport");

const isolated = context(store, "asesor", "assessments", "spn-bali");
load(isolated.ctx, "education-store.js", "learning-store.js", "competency-store.js", "competency-pages.js");
const isolatedState = JSON.parse(store.values["presisiCompetency:spn-bali"]);
check(!isolatedState.assessments.some(x => x.id === "qa-assessment"), "asesmen SPN-JBR bocor ke SPN-BLI");
check(!isolatedState.certificates.some(x => x.assessmentId === "qa-assessment"), "sertifikat SPN-JBR bocor ke SPN-BLI");

console.log(JSON.stringify({ result: failures.length ? "FAIL" : "PASS", checks, lifecycle: ["Dijadwalkan", "Review", "Kompeten", "Sertifikat Terbit"], failures }, null, 2));
if (failures.length) process.exitCode = 1;
