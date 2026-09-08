#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];

function check(condition, message) {
  if (!condition) failures.push(message);
}

function makeStorage(seed = {}) {
  const values = { ...seed };
  return {
    values,
    api: {
      getItem(key) { return values[key] ?? null; },
      setItem(key, value) { values[key] = String(value); },
      removeItem(key) { delete values[key]; }
    }
  };
}

function makeRoot(sessionCount) {
  const inserts = { kpi: [], sessions: [], analytics: [] };
  const makeNode = () => ({
    attributes: {},
    setAttribute(name, value) { this.attributes[name] = String(value); },
    getAttribute(name) { return this.attributes[name] ?? null; },
    querySelector() { return { style: { width: "75%" } }; }
  });
  const accessibility = {
    filters: [makeNode(), makeNode()],
    tables: [makeNode(), makeNode(), makeNode()],
    selects: [makeNode(), makeNode()],
    progress: [makeNode(), makeNode()],
    trends: [makeNode()],
    bars: [makeNode(), makeNode()]
  };
  const sections = Array.from({ length: sessionCount }, () => ({
    insertAdjacentHTML(_position, html) { inserts.sessions.push(html); }
  }));
  return {
    inserts,
    accessibility,
    html: "",
    set innerHTML(value) { this.html = value; },
    get innerHTML() { return this.html; },
    querySelector(selector) {
      if (selector === ".grid.grid-3") return {
        classList: { remove() {}, add() {} },
        insertAdjacentHTML(_position, html) { inserts.kpi.push(html); }
      };
      if (selector === ".attendance-recap") return {
        insertAdjacentHTML(_position, html) { inserts.analytics.push(html); }
      };
      return null;
    },
    querySelectorAll(selector) {
      const nodes = {
        ".toolbar .control": accessibility.filters,
        table: accessibility.tables,
        ".attendance-sessions select": accessibility.selects,
        ".progress": accessibility.progress,
        ".attendance-trend": accessibility.trends,
        ".trend-bar": accessibility.bars
      };
      return selector === ".attendance-sessions > section" ? sections : nodes[selector] || [];
    }
  };
}

function runScenario(role) {
  const storage = makeStorage();
  const attendanceRoot = makeRoot(2);
  const prompts = [];
  const toasts = [];
  const education = {
    programs: [
      { id: "program-1", name: "Program Kepemimpinan" },
      { id: "program-2", name: "Program Lanjutan" }
    ],
    classes: [
      { id: "k-1", programId: "program-1", name: "Kelas A", instructorIds: ["g-1", "g-2"], participantIds: ["p-1", "p-2", "p-3"] },
      { id: "k-2", programId: "program-1", name: "Kelas B", instructorIds: ["g-3"], participantIds: ["p-4", "p-5", "p-6"] }
    ],
    instructors: [
      { id: "g-1", nrp: "7001", name: "Gadik Satu" },
      { id: "g-2", nrp: "7002", name: "Gadik Dua" },
      { id: "g-3", nrp: "7003", name: "Gadik Tiga" }
    ],
    participants: [
      { id: "p-1", nrp: "9001", name: "Peserta Satu" },
      { id: "p-2", nrp: "9002", name: "Peserta Dua" },
      { id: "p-3", nrp: "9003", name: "Peserta Tiga" },
      { id: "p-4", nrp: "9004", name: "Peserta Empat" },
      { id: "p-5", nrp: "9005", name: "Peserta Lima" },
      { id: "p-6", nrp: "9006", name: "Peserta Enam" }
    ]
  };
  const learning = { courses: [
    { id: "course-leadership", title: "Leadership" },
    { id: "course-operations", title: "Operations" }
  ] };
  const context = {
    localStorage: storage.api,
    document: { querySelector(selector) { return selector === "#attendanceContent" ? attendanceRoot : null; } },
    location: { href: "attendance.html" },
    renderSidebar() {},
    renderHeader() {},
    getWorkspace() { return { id: "qa", name: "QA Workspace" }; },
    getRole() { return role; },
    getEducationData() { return education; },
    getLearningData() { return learning; },
    demoParticipantId() { return "p-1"; },
    escapeHtml(value) { return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;"); },
    educationBadge(status) { return `<span>${status}</span>`; },
    educationId(prefix) { return `${prefix}-qa`; },
    formatDateId(value) { return value; },
    openEducationModal() {},
    showEducationToast(message) { toasts.push(message); },
    prompt(_message, fallback) { return prompts.length ? prompts.shift() : fallback; },
    alert() {},
    confirm() { return true; },
    FormData,
    Intl,
    Date,
    console
  };
  vm.createContext(context);
  for (const file of ["attendance-store.js", "attendance-page.js", "attendance-operations.js"]) {
    const source = fs.readFileSync(path.join(root, "assets/js", file), "utf8");
    new vm.Script(source, { filename: file }).runInContext(context);
  }
  return { context, storage, attendanceRoot, prompts, toasts };
}

const manager = runScenario("gadik");
const managerData = JSON.parse(manager.storage.values["presisiAttendance:qa"]);
check(Object.keys(managerData.sessions[0].instructorRecords || {}).length === 2, "migrasi Gadik Kelas A gagal");
check(Object.keys(managerData.sessions[1].instructorRecords || {}).length === 1, "migrasi Gadik Kelas B gagal");
check(manager.attendanceRoot.inserts.kpi.at(-1)?.includes("Kehadiran Gadik"), "KPI kehadiran Gadik tidak dirender");
check(manager.attendanceRoot.inserts.sessions.length === 2, "tabel Gadik tidak dirender pada setiap sesi");
check(manager.attendanceRoot.inserts.analytics.at(-1)?.includes("Rekap per Program"), "rekap program tidak dirender");
check(manager.attendanceRoot.inserts.analytics.at(-1)?.includes("Tren Kehadiran Periode"), "tren periode tidak dirender");
check(manager.attendanceRoot.inserts.analytics.at(-1)?.includes("10 Mar") && manager.attendanceRoot.inserts.analytics.at(-1)?.includes("12 Mar"), "tren satu bulan tidak memakai bucket per sesi");
check(manager.attendanceRoot.accessibility.filters[0].attributes["aria-label"] === "Filter kelas Attendance", "filter kelas tidak memiliki label aksesibel");
check(manager.attendanceRoot.accessibility.filters[1].attributes["aria-label"] === "Filter bulan Attendance", "filter bulan tidak memiliki label aksesibel");
check(manager.attendanceRoot.accessibility.tables.every(node => node.attributes["aria-label"]), "tabel Attendance tidak memiliki nama aksesibel");
check(manager.attendanceRoot.accessibility.selects.every(node => node.attributes["aria-label"]), "kontrol status tidak memiliki label aksesibel");
check(manager.attendanceRoot.accessibility.progress.every(node => node.attributes.role === "progressbar" && node.attributes["aria-valuenow"] === "75"), "progress tidak memiliki nilai aksesibel");
check(manager.attendanceRoot.accessibility.trends.every(node => node.attributes.role === "img" && node.attributes["aria-label"]), "grafik tren tidak memiliki deskripsi aksesibel");
check(manager.attendanceRoot.accessibility.bars.every(node => node.attributes["aria-hidden"] === "true"), "batang dekoratif masih dibaca screen reader");

manager.prompts.push("Tugas luar", "Surat tugas QA.pdf");
vm.runInContext("updateInstructorAttendance('att-1','g-1','Izin')", manager.context);
const updated = JSON.parse(manager.storage.values["presisiAttendance:qa"]);
check(updated.sessions[0].instructorRecords["g-1"].status === "Izin", "status Gadik tidak tersimpan");
check(updated.sessions[0].instructorRecords["g-1"].note === "Tugas luar", "catatan Gadik tidak tersimpan");
check(updated.sessions[0].instructorRecords["g-1"].evidence === "Surat tugas QA.pdf", "evidence Gadik tidak tersimpan");
check(manager.toasts.includes("Kehadiran Gadik diperbarui."), "feedback pembaruan Gadik tidak tampil");

vm.runInContext("setAttendanceFilter('classId','k-2')", manager.context);
check(manager.attendanceRoot.inserts.analytics.at(-1)?.includes("1 sesi"), "rekap program tidak mengikuti filter kelas");

vm.runInContext(`attendanceFilters.classId = ""; attendance.sessions.push({ id: "att-old", classId: "k-1", courseId: "course-leadership", date: "2027-02-08", topic: "Sesi Lama", records: { "p-1": { status: "Hadir" } }, instructorRecords: {} }); renderAttendance()`, manager.context);
check(manager.attendanceRoot.inserts.analytics.at(-1)?.includes("Feb 27") && manager.attendanceRoot.inserts.analytics.at(-1)?.includes("Mar 27"), "tren lintas bulan tidak memakai bucket bulanan");

const participant = runScenario("peserta");
check(participant.attendanceRoot.html.includes("Ajukan Koreksi"), "aksi koreksi peserta tidak tersedia");
check(!participant.attendanceRoot.html.includes("Perangkat & Sinkronisasi"), "panel perangkat bocor ke role peserta");
check(participant.attendanceRoot.inserts.analytics.length === 0, "analytics pengelola bocor ke role peserta");
check(participant.attendanceRoot.inserts.sessions.length === 0, "data kehadiran Gadik bocor ke role peserta");

console.log(JSON.stringify({
  result: failures.length ? "FAIL" : "PASS",
  checks: 24,
  failures
}, null, 2));

if (failures.length) process.exitCode = 1;
