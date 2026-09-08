/* Interactive prototype extensions for course detail, materials, and quizzes. */
function normalizeLearningOperations() {
  let changed = false;
  learn.courses.forEach(course => {
    if (!course.syllabus) { course.syllabus = `Silabus ${course.code} • versi 1.0 • berlaku 2027`; changed = true; }
  });
  learn.materials.forEach(item => {
    if (!item.previewText) { item.previewText = `${item.title}\n\nKonten pratinjau prototype untuk materi ${item.type}. Dokumen produksi akan berasal dari Master Library atau unggahan Gadik.`; changed = true; }
    if (item.downloadable === undefined) { item.downloadable = true; changed = true; }
  });
  learn.quizzes.forEach(item => {
    if (!item.reviewRule) { item.reviewRule = "Setelah Submit"; changed = true; }
  });
  if (changed) saveLearningData(learn);
}

function moveCourseSection(courseId, sectionId, direction) {
  const course = learn.courses.find(x => x.id === courseId);
  const index = course.sections.findIndex(x => x.id === sectionId);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= course.sections.length) return;
  [course.sections[index], course.sections[target]] = [course.sections[target], course.sections[index]];
  saveLearningData(learn); reloadLearning(); showEducationToast("Urutan modul diperbarui.");
}

function courseParticipantRows(course) {
  const education = getEducationData();
  const cls = education.classes.find(x => x.id === course.classId);
  return (cls?.participantIds || []).map(id => education.participants.find(x => x.id === id)).filter(Boolean);
}

function courseActivity(id) {
  const activities = [];
  learn.assignments.filter(x => x.courseId === id).forEach(item => Object.values(item.submissions).forEach(sub => activities.push({ title: `Submission: ${item.title}`, detail: `${sub.status} • nilai ${sub.score ?? "belum ada"}`, date: sub.submittedAt })));
  learn.quizzes.filter(x => x.courseId === id).forEach(item => Object.values(item.attempts).flat().forEach(attempt => activities.push({ title: `Attempt: ${item.title}`, detail: `Nilai ${attempt.score}`, date: attempt.completedAt })));
  learn.materials.filter(x => x.courseId === id).forEach(item => { if (item.completedBy.length) activities.push({ title: `Materi diselesaikan: ${item.title}`, detail: `${item.completedBy.length} peserta`, date: "2027-03-12" }); });
  return activities.sort((a, b) => String(b.date).localeCompare(String(a.date))).slice(0, 6);
}

function renderCompleteCourseDetail() {
  normalizeLearningOperations();
  const id = chosenCourse();
  const course = learn.courses.find(x => x.id === id);
  if (!course) { learningRoot.innerHTML = '<div class="card empty-state">Course tidak ditemukan.</div>'; return; }
  const teaching = isTeachingRole();
  const progress = courseProgress(learn, id);
  const materials = learn.materials.filter(x => x.courseId === id);
  const assignments = learn.assignments.filter(x => x.courseId === id);
  const quizzes = learn.quizzes.filter(x => x.courseId === id);
  const participants = courseParticipantRows(course);
  const activity = courseActivity(id);
  const scored = participants.map(person => {
    const scores = assignments.map(x => x.submissions[person.id]?.score).concat(quizzes.flatMap(x => (x.attempts[person.id] || []).map(a => a.score))).filter(Number.isFinite);
    return { person, score: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null };
  });
  learningRoot.innerHTML = learningHero(course.title, `${course.code} • ${course.sections.length} modul`, teaching ? `<button class="btn btn-light" onclick="publishCourse('${id}')">${course.status === "Published" ? "Unpublish" : "Publish Course"}</button>` : "") + `<div class="grid grid-4"><div class="card kpi"><div class="kpi-label">Progress</div><div class="kpi-value">${progress}%</div></div><div class="card kpi"><div class="kpi-label">Materi</div><div class="kpi-value">${materials.length}</div></div><div class="card kpi"><div class="kpi-label">Peserta</div><div class="kpi-value">${participants.length}</div></div><div class="card kpi"><div class="kpi-label">Aktivitas</div><div class="kpi-value">${assignments.length + quizzes.length}</div></div></div><div class="card course-detail-card"><div class="tabs"><button class="tab active" data-course-tab="overview">Overview</button><button class="tab" data-course-tab="syllabus">Silabus</button><button class="tab" data-course-tab="participants">Peserta</button><button class="tab" data-course-tab="gradebook">Gradebook</button><button class="tab" data-course-tab="activity">Activity Feed</button><a class="tab" href="materials.html?course=${id}">Materi</a><a class="tab" href="assignments.html?course=${id}">Tugas</a><a class="tab" href="quizzes.html?course=${id}">Quiz</a></div><section id="courseTabContent"></section></div>`;
  const views = {
    overview: `<div class="split-60"><div><div class="section-title">Learning Outcome</div><p>${escapeHtml(course.outcome)}</p><div class="section-title">Struktur Course</div><div class="course-outline">${course.sections.map((s, i) => `<div><span>${i + 1}</span><b>${escapeHtml(s.title)}</b><small>${learn.materials.filter(m => m.sectionId === s.id).length} materi</small>${teaching ? `<span class="reorder-actions"><button ${i === 0 ? "disabled" : ""} onclick="moveCourseSection('${id}','${s.id}',-1)">↑</button><button ${i === course.sections.length - 1 ? "disabled" : ""} onclick="moveCourseSection('${id}','${s.id}',1)">↓</button></span>` : ""}</div>`).join("")}</div>${teaching ? `<button class="btn btn-light" onclick="addSection('${id}')">+ Tambah Modul</button>` : ""}</div><aside class="alert">${teaching ? "Atur urutan modul dengan tombol panah, lalu siapkan aktivitas melalui tab terkait." : progress < 100 ? "Lanjutkan aktivitas yang belum selesai." : "Seluruh aktivitas course selesai."}</aside></div>`,
    syllabus: `<div class="syllabus-sheet"><div><span class="resource-format">DOC</span><h2>${escapeHtml(course.syllabus)}</h2><p>Outcome: ${escapeHtml(course.outcome)}</p></div><div class="detail-grid"><div><small>Status course</small><b>${escapeHtml(course.status)}</b></div><div><small>Jumlah modul</small><b>${course.sections.length}</b></div><div><small>Materi</small><b>${materials.length}</b></div><div><small>Evaluasi</small><b>${assignments.length + quizzes.length}</b></div></div></div>`,
    participants: `<div class="table-wrap"><table class="table"><thead><tr><th>Peserta</th><th>NRP</th><th>Angkatan</th><th>Progress</th></tr></thead><tbody>${participants.map(x => `<tr><td><b>${escapeHtml(x.name)}</b></td><td>${escapeHtml(x.nrp)}</td><td>${escapeHtml(x.cohort)}</td><td>${courseProgress(learn, id, x.id)}%</td></tr>`).join("") || '<tr><td colspan="4">Belum ada peserta pada kelas course ini.</td></tr>'}</tbody></table></div>`,
    gradebook: `<div class="table-wrap"><table class="table"><thead><tr><th>Peserta</th><th>Rata-rata nilai</th><th>Status</th></tr></thead><tbody>${scored.map(x => `<tr><td>${escapeHtml(x.person.name)}</td><td>${x.score ?? "—"}</td><td>${educationBadge(x.score === null ? "Belum Dinilai" : x.score >= 75 ? "Lulus" : "Remedial")}</td></tr>`).join("") || '<tr><td colspan="3">Belum ada data nilai.</td></tr>'}</tbody></table></div>`,
    activity: `<div class="activity-feed">${activity.map(x => `<article><span>•</span><div><b>${escapeHtml(x.title)}</b><small>${escapeHtml(x.detail)} • ${formatDateId(x.date)}</small></div></article>`).join("") || '<div class="empty-state">Belum ada aktivitas.</div>'}</div>`
  };
  const show = name => {
    document.querySelector("#courseTabContent").innerHTML = views[name];
    document.querySelectorAll("[data-course-tab]").forEach(button => button.classList.toggle("active", button.dataset.courseTab === name));
  };
  document.querySelectorAll("[data-course-tab]").forEach(button => button.onclick = () => show(button.dataset.courseTab));
  show("overview");
}

function previewMaterial(id) {
  const item = learn.materials.find(x => x.id === id);
  openEducationModal("Preview Materi", `<div class="resource-preview"><span class="resource-format">${escapeHtml(item.type.slice(0, 4).toUpperCase())}</span><h2>${escapeHtml(item.title)}</h2><p class="preview-copy">${escapeHtml(item.previewText)}</p><small>${escapeHtml(item.duration || "-")}</small></div>`, () => true);
  const modal = document.querySelector(".modal-layer:last-child");
  modal.querySelector(".modal-actions").innerHTML = '<button type="button" class="btn btn-primary modal-cancel">Tutup Preview</button>';
  modal.querySelector(".modal-cancel").onclick = () => modal.remove();
}

function downloadMaterial(id) {
  const item = learn.materials.find(x => x.id === id);
  const blob = new Blob([`${item.title}\n${item.type} • ${item.duration}\n\n${item.previewText}`], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url; link.download = `${item.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.txt`; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 500); showEducationToast("File prototype diunduh.");
}

function renderCompleteMaterials() {
  normalizeLearningOperations();
  const id = chosenCourse(), course = learn.courses.find(x => x.id === id), teaching = isTeachingRole(), rows = learn.materials.filter(x => x.courseId === id), pid = demoParticipantId();
  learningRoot.innerHTML = learningHero("Materi Pembelajaran", course?.title || "Course", teaching ? `<button class="btn btn-light" onclick="addMaterial('${id}')">+ Tambah Materi</button>` : "") + `<div class="toolbar"><select class="control" onchange="location.href='materials.html?course='+this.value">${courseOptions(id)}</select></div><div class="course-sections">${course.sections.map(section => `<section class="card"><div class="section-title">${escapeHtml(section.title)}</div><div class="list">${rows.filter(x => x.sectionId === section.id).map(x => { const done = x.completedBy.includes(pid), pre = rows.find(p => p.id === x.prerequisiteId), locked = pre && !pre.completedBy.includes(pid); return `<div class="list-item material-row"><span><b>${locked ? "🔒 " : ""}${escapeHtml(x.title)}</b><small>${escapeHtml(x.type)} • ${escapeHtml(x.duration || "-")}${pre ? ` • Prasyarat: ${escapeHtml(pre.title)}` : ""}</small></span><div class="material-actions"><button class="btn btn-light" ${locked ? "disabled" : ""} onclick="previewMaterial('${x.id}')">Preview</button>${x.downloadable ? `<button class="btn btn-light" ${locked ? "disabled" : ""} onclick="downloadMaterial('${x.id}')">Download</button>` : ""}${!teaching ? `<button class="btn ${done || locked ? "btn-light" : "btn-primary"}" ${locked ? "disabled" : ""} onclick="completeMaterial('${x.id}')">${done ? "Selesai ✓" : locked ? "Terkunci" : "Tandai Selesai"}</button>` : educationBadge(x.published ? "Published" : "Draft")}</div></div>`; }).join("") || '<span class="muted">Belum ada materi.</span>'}</div></section>`).join("")}</div>`;
}

function setQuizReviewRule(id) {
  const quiz = learn.quizzes.find(x => x.id === id);
  const value = prompt("Aturan review (Setelah Submit / Setelah Ujian Ditutup / Tidak Ditampilkan):", quiz.reviewRule);
  if (!value) return;
  const allowed = ["Setelah Submit", "Setelah Ujian Ditutup", "Tidak Ditampilkan"];
  quiz.reviewRule = allowed.find(x => x.toLowerCase() === value.toLowerCase()) || value;
  saveLearningData(learn); reloadLearning(); showEducationToast("Aturan review diperbarui.");
}

function takeTimedQuiz(id) {
  const quiz = learn.quizzes.find(x => x.id === id), pid = demoParticipantId(), attempts = quiz.attempts[pid] || [];
  if (attempts.length >= quiz.maxAttempts) { alert("Batas percobaan sudah tercapai."); return; }
  let remaining = Math.max(1, Number(quiz.duration)) * 60;
  const layer = document.createElement("div"); layer.className = "modal-layer";
  layer.innerHTML = `<div class="modal-card quiz-runner"><div class="modal-head"><div><small>Percobaan ${attempts.length + 1}/${quiz.maxAttempts}</small><h2>${escapeHtml(quiz.title)}</h2></div><b id="quizTimer" class="quiz-timer"></b></div><form id="timedQuizForm">${quiz.questions.map((q, index) => `<fieldset><legend>${index + 1}. ${escapeHtml(q.text)}</legend>${q.options.map((option, optionIndex) => `<label><input type="radio" name="q${index}" value="${optionIndex}" required> ${escapeHtml(option)}</label>`).join("")}</fieldset>`).join("")}<div class="modal-actions"><button type="button" class="btn btn-light" id="cancelQuiz">Batal</button><button type="submit" class="btn btn-primary">Kirim Jawaban</button></div></form></div>`;
  document.body.appendChild(layer);
  const timer = layer.querySelector("#quizTimer");
  const finish = timedOut => {
    clearInterval(interval);
    const form = layer.querySelector("form");
    let correct = 0;
    quiz.questions.forEach((q, index) => { if (Number(new FormData(form).get(`q${index}`)) === q.answer) correct++; });
    const score = Math.round(correct / quiz.questions.length * 100);
    attempts.push({ score, completedAt: new Date().toISOString().slice(0, 10), timedOut });
    quiz.attempts[pid] = attempts; saveLearningData(learn); layer.remove(); reloadLearning();
    const review = quiz.reviewRule === "Setelah Submit" ? `Benar ${correct}/${quiz.questions.length}.` : `Review jawaban: ${quiz.reviewRule}.`;
    alert(`${timedOut ? "Waktu habis. " : ""}Nilai: ${score} — ${score >= quiz.passingScore ? "Lulus" : "Remedial"}\n${review}`);
  };
  const tick = () => { timer.textContent = `${String(Math.floor(remaining / 60)).padStart(2, "0")}:${String(remaining % 60).padStart(2, "0")}`; if (remaining-- <= 0) finish(true); };
  const interval = setInterval(tick, 1000); tick();
  layer.querySelector("form").onsubmit = event => { event.preventDefault(); finish(false); };
  layer.querySelector("#cancelQuiz").onclick = () => { clearInterval(interval); layer.remove(); };
}

function renderCompleteQuizzes() {
  normalizeLearningOperations();
  const id = chosenCourse(), teaching = isTeachingRole(), rows = learn.quizzes.filter(x => x.courseId === id);
  learningRoot.innerHTML = learningHero("Quiz / Ujian", courseName(learn, id), teaching ? `<button class="btn btn-light" onclick="addQuiz('${id}')">+ Buat Quiz</button>` : "") + `<div class="grid grid-2">${rows.map(x => { const attempts = x.attempts[demoParticipantId()] || [], best = attempts.length ? Math.max(...attempts.map(a => a.score)) : null; return `<article class="card quiz-card"><div>${educationBadge(x.status)}<h2>${escapeHtml(x.title)}</h2><p>${x.questions.length} soal • ${x.duration} menit • Bobot ${x.weight}%</p><small>Nilai lulus ${x.passingScore} • ${attempts.length}/${x.maxAttempts} percobaan</small><small class="review-rule">Review: ${escapeHtml(x.reviewRule)}</small></div><div class="quiz-score">${best !== null ? `<b>${best}</b><span>${best >= x.passingScore ? "Lulus" : "Remedial"}</span>` : '<b>—</b><span>Belum dikerjakan</span>'}</div>${teaching ? `<button class="btn btn-light" onclick="setQuizReviewRule('${x.id}')">Atur Review</button>` : `<button class="btn btn-primary" ${attempts.length >= x.maxAttempts ? "disabled" : ""} onclick="takeTimedQuiz('${x.id}')">${attempts.length ? "Remedial / Coba Lagi" : "Mulai Quiz Bertimer"}</button>`}</article>`; }).join("")}</div>${teaching ? `<section class="card" style="margin-top:18px"><div class="page-actions spread"><div class="section-title">Bank Soal (${learn.questionBank.length})</div><button class="btn btn-light" onclick="addQuestionBank()">+ Tambah Soal</button></div><div class="table-wrap"><table class="table"><thead><tr><th>Kategori</th><th>Pertanyaan</th><th>Kesulitan</th></tr></thead><tbody>${learn.questionBank.map(item => `<tr><td>${escapeHtml(item.category)}</td><td>${escapeHtml(item.text)}</td><td>${educationBadge(item.difficulty)}</td></tr>`).join("")}</tbody></table></div></section>` : ""}`;
}

function renderLearningOperationsPage() {
  const enhanced = { "course-detail": renderCompleteCourseDetail, materials: renderCompleteMaterials, quizzes: renderCompleteQuizzes };
  if (enhanced[learningPage]) enhanced[learningPage](); else renderLearningPage();
}

if (["course-detail", "materials", "quizzes"].includes(learningPage)) {
  renderLearningPage = renderLearningOperationsPage;
  renderLearningOperationsPage();
}
