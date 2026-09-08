#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];
let checks = 0;

function check(condition, message) {
  checks += 1;
  if (!condition) failures.push(message);
}

function makeStorage() {
  const values = {};
  return {
    values,
    api: {
      get length() { return Object.keys(values).length; },
      key(index) { return Object.keys(values)[index] ?? null; },
      getItem(key) { return values[key] ?? null; },
      setItem(key, value) { values[key] = String(value); },
      removeItem(key) { delete values[key]; }
    }
  };
}

function makeContext(storage, role, workspace = "spn-jabar", options = {}) {
  const prompts = [...(options.prompts || [])];
  const alerts = [];
  const toasts = [];
  const pageRoot = { innerHTML: "", querySelectorAll() { return []; }, querySelector() { return null; } };
  const document = {
    body: { dataset: { learningPage: options.learningPage || "materials" }, appendChild() {} },
    createElement() { return { className: "", textContent: "", classList: { add() {} }, remove() {} }; },
    querySelector(selector) {
      if (selector === "#learningContent" || selector === "#attendanceContent") return pageRoot;
      return null;
    }
  };
  const context = {
    localStorage: storage.api,
    document,
    location: { pathname: options.pathname || "/pages/materials.html", search: options.search || "", href: "" },
    getWorkspace() { return { id: workspace, code: workspace.toUpperCase(), name: `${workspace.toUpperCase()} QA` }; },
    getRole() { return role; },
    renderSidebar() {},
    renderHeader() {},
    escapeHtml(value = "") { return String(value).replace(/[&<>'"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]); },
    educationBadge(status) { return `<span>${status}</span>`; },
    formatDateId(value) { return value || "-"; },
    openEducationModal() {},
    showEducationToast(message) { toasts.push(message); },
    prompt(_message, fallback = "") { return prompts.length ? prompts.shift() : fallback; },
    alert(message) { alerts.push(message); },
    confirm() { return true; },
    roleLabels: { adminunit: "Admin Satdik", gadik: "Gadik / Instruktur", peserta: "Peserta Didik" },
    URLSearchParams,
    FormData,
    Intl,
    Date,
    setTimeout(callback) { callback(); return 0; },
    console
  };
  vm.createContext(context);
  return { context, prompts, alerts, toasts, pageRoot };
}

function load(context, ...files) {
  for (const file of files) {
    const source = fs.readFileSync(path.join(root, "assets/js", file), "utf8");
    new vm.Script(source, { filename: file }).runInContext(context);
  }
}

const storage = makeStorage();

// 1. Admin Satdik menyiapkan program, kelas, dan enrollment pada workspace SPN-JBR.
const adminEducation = makeContext(storage, "adminunit");
load(adminEducation.context, "education-store.js");
vm.runInContext(`(() => {
  const data = getEducationData();
  data.programs.push({ id: "qa-program", code: "QA-2027", name: "Program QA Lintas Role", mode: "Blended", start: "2027-04-01", end: "2027-06-30", capacity: 30, responsibleId: "g-1", status: "Aktif", progress: 0, description: "Regression journey" });
  data.curricula.push({ id: "qa-curriculum", programId: "qa-program", code: "QA-101", name: "Kolaborasi Lintas Role", hours: 8, outcome: "State konsisten", status: "Disetujui" });
  data.classes.push({ id: "qa-class", programId: "qa-program", name: "Kelas QA", room: "Ruang QA", capacity: 30, guardianId: "g-1", instructorIds: ["g-1"], participantIds: ["p-1"], status: "Aktif" });
  saveEducationData(data);
})()`, adminEducation.context);

let educationState = JSON.parse(storage.values["presisiEducation:spn-jabar"]);
check(educationState.programs.some(item => item.id === "qa-program"), "Admin Satdik gagal menyimpan program");
check(educationState.curricula.some(item => item.id === "qa-curriculum"), "Admin Satdik gagal menyimpan kurikulum");
check(educationState.classes.some(item => item.id === "qa-class" && item.participantIds.includes("p-1") && item.instructorIds.includes("g-1")), "kelas tidak menghubungkan Gadik dan Peserta");

// 2. Gadik menyiapkan course, materi, assignment, quiz, diskusi, dan virtual class.
const instructor = makeContext(storage, "gadik");
load(instructor.context, "learning-store.js");
vm.runInContext(`(() => {
  const data = getLearningData();
  data.courses.push({ id: "qa-course", curriculumId: "qa-curriculum", classId: "qa-class", title: "Course QA Lintas Role", code: "QA-101", outcome: "Menguji alur end-to-end", status: "Published", sections: [{ id: "qa-section", title: "Modul QA" }] });
  data.materials.push({ id: "qa-material", courseId: "qa-course", sectionId: "qa-section", title: "Materi QA", type: "PDF", duration: "5 halaman", prerequisiteId: "", published: true, completedBy: [] });
  data.assignments.push({ id: "qa-assignment", courseId: "qa-course", title: "Tugas QA", instruction: "Jawab tugas QA", due: "2027-04-10", points: 100, weight: 100, rubric: "Kelengkapan 100%", status: "Published", submissions: {} });
  data.quizzes.push({ id: "qa-quiz", courseId: "qa-course", title: "Quiz QA", duration: 10, weight: 100, passingScore: 75, maxAttempts: 1, status: "Available", questions: [{ text: "Jawaban benar berada pada pilihan?", options: ["Nol", "Satu", "Dua"], answer: 1 }], attempts: {} });
  data.threads.push({ id: "qa-thread", courseId: "qa-course", category: "Diskusi Materi", title: "Diskusi QA", body: "Berikan tanggapan peserta", author: "Gadik QA", pinned: false, moderated: false, readBy: ["gadik"], replies: [] });
  data.meetings.push({ id: "qa-meeting", courseId: "qa-course", title: "Virtual Class QA", date: "2027-04-05", start: "09:00", end: "10:00", provider: "Internal Meeting", status: "Terjadwal", attendees: [], recording: "Belum tersedia", resource: "Materi QA.pdf" });
  data.gradebookPublished["qa-course"] = false;
  saveLearningData(data);
})()`, instructor.context);

let learningState = JSON.parse(storage.values["presisiLearning:spn-jabar"]);
check(learningState.courses.some(item => item.id === "qa-course" && item.status === "Published"), "Gadik gagal mempublikasikan course");
check(learningState.materials.some(item => item.id === "qa-material"), "Gadik gagal menyimpan materi");
check(learningState.assignments.some(item => item.id === "qa-assignment"), "Gadik gagal menyimpan assignment");
check(learningState.quizzes.some(item => item.id === "qa-quiz"), "Gadik gagal menyimpan quiz");
check(learningState.threads.some(item => item.id === "qa-thread"), "Gadik gagal membuat thread diskusi");
check(learningState.meetings.some(item => item.id === "qa-meeting"), "Gadik gagal menyimpan virtual class");

// 3. Peserta menyelesaikan materi, mengirim tugas, mengerjakan quiz, membalas diskusi, dan join virtual class.
const participantLearning = makeContext(storage, "peserta", "spn-jabar", {
  learningPage: "materials",
  pathname: "/pages/materials.html",
  search: "?course=qa-course",
  prompts: ["Jawaban tugas QA dari peserta", "1", "Balasan diskusi dari peserta"]
});
load(participantLearning.context, "education-store.js", "learning-store.js", "attendance-store.js", "learning-pages.js");
vm.runInContext("completeMaterial('qa-material'); submitAssignment('qa-assignment'); takeQuiz('qa-quiz'); takeQuiz('qa-quiz'); replyThread('qa-thread'); joinMeeting('qa-meeting');", participantLearning.context);

learningState = JSON.parse(storage.values["presisiLearning:spn-jabar"]);
let attendanceState = JSON.parse(storage.values["presisiAttendance:spn-jabar"]);
check(learningState.materials.find(item => item.id === "qa-material").completedBy.includes("p-1"), "penyelesaian materi peserta tidak tersimpan");
check(learningState.assignments.find(item => item.id === "qa-assignment").submissions["p-1"]?.status === "Submitted", "submission peserta tidak tersimpan");
check(learningState.assignments.find(item => item.id === "qa-assignment").submissions["p-1"]?.text === "Jawaban tugas QA dari peserta", "isi submission berubah atau hilang");
check(learningState.quizzes.find(item => item.id === "qa-quiz").attempts["p-1"]?.[0]?.score === 100, "hasil quiz peserta tidak tersimpan");
check(learningState.quizzes.find(item => item.id === "qa-quiz").attempts["p-1"]?.length === 1, "jumlah percobaan quiz tidak tepat");
check(participantLearning.alerts.includes("Batas percobaan sudah tercapai."), "batas percobaan quiz tidak ditegakkan");
check(learningState.threads.find(item => item.id === "qa-thread").replies.some(item => item.body === "Balasan diskusi dari peserta"), "balasan diskusi peserta tidak tersimpan");
check(learningState.meetings.find(item => item.id === "qa-meeting").attendees.includes("p-1"), "join virtual class tidak menyimpan attendee");
const meetingAttendance = attendanceState.sessions.find(item => item.meetingId === "qa-meeting");
check(meetingAttendance?.records["p-1"]?.status === "Hadir", "join virtual class tidak tersinkron ke Attendance");
check(meetingAttendance?.records["p-1"]?.evidence.includes("join log"), "evidence Attendance dari virtual class tidak tersedia");

// 4. Peserta mengajukan koreksi, lalu Admin Satdik menyetujuinya.
const participantAttendance = makeContext(storage, "peserta", "spn-jabar", {
  pathname: "/pages/attendance.html",
  prompts: ["Izin", "Kegiatan dinas QA"]
});
load(participantAttendance.context, "education-store.js", "learning-store.js", "attendance-store.js", "attendance-page.js");
vm.runInContext(`requestAttendanceCorrection(${JSON.stringify(meetingAttendance.id)})`, participantAttendance.context);
attendanceState = JSON.parse(storage.values["presisiAttendance:spn-jabar"]);
const correction = attendanceState.corrections.find(item => item.sessionId === meetingAttendance.id && item.participantId === "p-1");
check(correction?.status === "Pending" && correction?.to === "Izin", "koreksi peserta tidak masuk antrean approval");

const approvingAdmin = makeContext(storage, "adminunit", "spn-jabar", { pathname: "/pages/attendance.html" });
load(approvingAdmin.context, "education-store.js", "learning-store.js", "attendance-store.js", "attendance-page.js");
vm.runInContext(`decideAttendanceCorrection(${JSON.stringify(correction?.id)}, 'Disetujui')`, approvingAdmin.context);
attendanceState = JSON.parse(storage.values["presisiAttendance:spn-jabar"]);
check(attendanceState.corrections.find(item => item.id === correction?.id)?.status === "Disetujui", "Admin Satdik gagal menyetujui koreksi");
check(attendanceState.sessions.find(item => item.id === meetingAttendance.id)?.records["p-1"]?.status === "Izin", "hasil koreksi tidak memperbarui record Attendance");

// 5. Gadik menilai tugas, memoderasi thread, dan mempublikasikan gradebook.
const gradingInstructor = makeContext(storage, "gadik", "spn-jabar", {
  learningPage: "assignments",
  pathname: "/pages/assignments.html",
  search: "?course=qa-course",
  prompts: ["90", "Memenuhi rubric QA"]
});
load(gradingInstructor.context, "education-store.js", "learning-store.js", "learning-pages.js");
vm.runInContext("gradeAssignment('qa-assignment'); toggleThreadPin('qa-thread'); toggleGradebook('qa-course');", gradingInstructor.context);
learningState = JSON.parse(storage.values["presisiLearning:spn-jabar"]);
const gradedSubmission = learningState.assignments.find(item => item.id === "qa-assignment").submissions["p-1"];
check(gradedSubmission.status === "Dinilai" && gradedSubmission.score === 90, "penilaian tugas Gadik tidak tersimpan");
check(gradedSubmission.feedback === "Memenuhi rubric QA", "feedback Gadik tidak tersimpan");
check(learningState.threads.find(item => item.id === "qa-thread").pinned === true, "moderasi pin thread tidak tersimpan");
check(learningState.gradebookPublished["qa-course"] === true, "gradebook tidak dipublikasikan");

// 6. Peserta melihat nilai yang sudah dipublikasi dan progress penuh.
const participantGradebook = makeContext(storage, "peserta", "spn-jabar", {
  learningPage: "assessment",
  pathname: "/pages/assessment.html",
  search: "?course=qa-course"
});
load(participantGradebook.context, "learning-store.js", "learning-pages.js");
const participantProgress = vm.runInContext("courseProgress(getLearningData(), 'qa-course', 'p-1')", participantGradebook.context);
check(participantProgress === 100, `progress peserta seharusnya 100%, aktual ${participantProgress}%`);
check(participantGradebook.pageRoot.innerHTML.includes("<td>90</td>"), "nilai published tidak tampil pada gradebook peserta");
check(!participantGradebook.pageRoot.innerHTML.includes("Nilai belum dipublikasikan"), "peserta masih melihat state gradebook belum published");

// 7. State SPN-JBR tidak boleh bocor ke workspace lain.
const isolatedWorkspace = makeContext(storage, "peserta", "spn-bali");
load(isolatedWorkspace.context, "education-store.js", "learning-store.js", "attendance-store.js");
const isolation = vm.runInContext(`({
  education: getEducationData().programs.some(item => item.id === "qa-program"),
  learning: getLearningData().courses.some(item => item.id === "qa-course"),
  attendance: getAttendanceData().sessions.some(item => item.meetingId === "qa-meeting")
})`, isolatedWorkspace.context);
check(!isolation.education && !isolation.learning && !isolation.attendance, "data SPN-JBR bocor ke workspace SPN-BLI");
check(Boolean(storage.values["presisiEducation:spn-bali"] && storage.values["presisiLearning:spn-bali"] && storage.values["presisiAttendance:spn-bali"]), "store workspace SPN-BLI tidak dibuat terpisah");

console.log(JSON.stringify({
  result: failures.length ? "FAIL" : "PASS",
  checks,
  journey: ["Admin Satdik", "Gadik", "Peserta", "Admin Satdik approval"],
  workspace: "SPN-JBR",
  isolationWorkspace: "SPN-BLI",
  failures
}, null, 2));

if (failures.length) process.exitCode = 1;
