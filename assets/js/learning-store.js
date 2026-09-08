const learningSeed = {
  courses: [
    { id: "course-leadership", curriculumId: "cur-1", classId: "k-1", title: "Kepemimpinan Strategis", code: "KPM-101", outcome: "Mampu menganalisis situasi organisasi dan mengambil keputusan strategis.", status: "Published", sections: [{ id: "sec-1", title: "Fondasi Kepemimpinan" }, { id: "sec-2", title: "Strategic Leadership" }] },
    { id: "course-operations", curriculumId: "cur-2", classId: "k-2", title: "Manajemen Operasi Kepolisian", code: "MOP-201", outcome: "Mampu menyusun rencana operasi kepolisian berbasis risiko.", status: "Published", sections: [{ id: "sec-3", title: "Perencanaan Operasi" }] }
  ],
  materials: [
    { id: "mat-1", courseId: "course-leadership", sectionId: "sec-1", title: "Video Pengantar Kepemimpinan", type: "Video", duration: "12 menit", prerequisiteId: "", published: true, completedBy: ["p-1", "p-2", "p-3"] },
    { id: "mat-2", courseId: "course-leadership", sectionId: "sec-2", title: "Modul Strategic Leadership", type: "PDF", duration: "28 halaman", prerequisiteId: "mat-1", published: true, completedBy: ["p-2"] },
    { id: "mat-3", courseId: "course-leadership", sectionId: "sec-2", title: "Studi Kasus Organisasi", type: "Link", duration: "20 menit", prerequisiteId: "mat-2", published: true, completedBy: [] },
    { id: "mat-4", courseId: "course-operations", sectionId: "sec-3", title: "Kerangka Manajemen Operasi", type: "PDF", duration: "35 halaman", prerequisiteId: "", published: true, completedBy: ["p-1"] }
  ],
  assignments: [
    { id: "asg-1", courseId: "course-leadership", title: "Analisis Kepemimpinan", instruction: "Analisis satu kasus kepemimpinan pada organisasi bertekanan tinggi.", due: "2027-03-15", points: 100, weight: 60, rubric: "Analisis 40% • Argumentasi 30% • Rekomendasi 30%", status: "Published", submissions: { "p-2": { status: "Dinilai", submittedAt: "2027-03-13", text: "Analisis kasus terlampir.", score: 82, feedback: "Argumentasi baik." } } },
    { id: "asg-2", courseId: "course-operations", title: "Rencana Operasi Ringkas", instruction: "Susun rencana operasi berdasarkan skenario yang tersedia.", due: "2027-03-20", points: 100, weight: 60, rubric: "Struktur 30% • Risiko 40% • Kejelasan 30%", status: "Published", submissions: { "p-1": { status: "Dinilai", submittedAt: "2027-03-10", text: "Rencana operasi terlampir.", score: 88, feedback: "Struktur dan mitigasi risiko sudah baik." } } }
  ],
  quizzes: [
    { id: "quiz-1", courseId: "course-leadership", title: "Quiz Strategic Leadership", duration: 20, weight: 40, passingScore: 75, maxAttempts: 2, status: "Available", questions: [{ text: "Fokus utama kepemimpinan strategis adalah...", options: ["Administrasi rutin", "Arah jangka panjang organisasi", "Pengadaan barang"], answer: 1 }, { text: "Keputusan strategis sebaiknya berbasis...", options: ["Asumsi", "Data dan risiko", "Kebiasaan"], answer: 1 }], attempts: { "p-2": [{ score: 80, completedAt: "2027-03-12" }], "p-3": [{ score: 50, completedAt: "2027-03-12" }] } },
    { id: "quiz-2", courseId: "course-operations", title: "Quiz Dasar Operasi", duration: 15, weight: 40, passingScore: 75, maxAttempts: 2, status: "Available", questions: [{ text: "Tahap awal perencanaan operasi adalah...", options: ["Evaluasi", "Analisis situasi", "Penutupan"], answer: 1 }], attempts: { "p-1": [{ score: 86, completedAt: "2027-03-09" }] } }
  ],
  threads: [{ id: "thread-1", courseId: "course-leadership", category: "Diskusi Materi", title: "Kepemimpinan dalam situasi krisis", body: "Bagaimana menjaga kualitas keputusan saat informasi belum lengkap?", author: "Kombes Pol. Arif Pratama", pinned: true, moderated: false, readBy: ["gadik"], replies: [{ author: "Ipda Andi Saputra", body: "Tetapkan fakta minimum, risiko, dan batas waktu keputusan." }] }],
  meetings: [{ id: "meet-1", courseId: "course-leadership", title: "Diskusi Strategic Leadership", date: "2027-03-12", start: "08:00", end: "10:00", provider: "Zoom", status: "Terjadwal", attendees: [], recording: "Rekaman tersedia setelah sesi berakhir", resource: "Bahan Diskusi Strategic Leadership.pdf" }],
  questionBank: [{ id: "qb-1", category: "Kepemimpinan", text: "Apa fokus kepemimpinan strategis?", difficulty: "Sedang" }, { id: "qb-2", category: "Operasi", text: "Apa langkah awal perencanaan operasi?", difficulty: "Mudah" }],
  announcements: [{ id: "ann-1", title: "Pembukaan Semester Pendidikan 2027", body: "Seluruh peserta wajib memeriksa jadwal dan course masing-masing.", audience: "Semua Pengguna", priority: "Penting", publishedAt: "2027-01-10", link: "schedule.html", readBy: [] }],
  gradebookPublished: { "course-leadership": false, "course-operations": true }
};

function learningKey() { return `presisiLearning:${getWorkspace().id}`; }
function getLearningData() { const saved = localStorage.getItem(learningKey()); if (saved) { const data=JSON.parse(saved); data.questionBank ||= JSON.parse(JSON.stringify(learningSeed.questionBank)); data.announcements ||= JSON.parse(JSON.stringify(learningSeed.announcements)); data.gradebookPublished ||= {}; data.materials.forEach(x=>x.prerequisiteId??=""); data.assignments.forEach(x=>{x.weight??=60;x.rubric??="Kualitas 50% • Ketepatan 50%"}); data.quizzes.forEach(x=>{x.weight??=40;x.passingScore??=75;x.maxAttempts??=2;Object.entries(x.attempts||{}).forEach(([participantId,attempts])=>{if(!Array.isArray(attempts))x.attempts[participantId]=[attempts]})}); data.threads.forEach(x=>{x.category??="Diskusi Umum";x.readBy??=[];x.moderated??=false}); data.meetings.forEach(x=>{x.recording??="Belum tersedia";x.resource??="Belum ada resource"}); data.announcements.forEach(x=>x.link??="learning-dashboard.html"); return data; } const data = JSON.parse(JSON.stringify(learningSeed)); localStorage.setItem(learningKey(), JSON.stringify(data)); return data; }
function saveLearningData(data) { localStorage.setItem(learningKey(), JSON.stringify(data)); }
function learningId(prefix) { return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`; }
function courseName(data, id) { return data.courses.find(item => item.id === id)?.title || "-"; }
function demoParticipantId() { return "p-1"; }
function isTeachingRole() { return ["gadik", "adminunit", "akademik"].includes(getRole()); }
function courseProgress(data, courseId, participantId = demoParticipantId()) {
  const materials = data.materials.filter(item => item.courseId === courseId && item.published);
  const assignments = data.assignments.filter(item => item.courseId === courseId && item.status === "Published");
  const quizzes = data.quizzes.filter(item => item.courseId === courseId && item.status === "Available");
  const total = materials.length + assignments.length + quizzes.length;
  const complete = materials.filter(item => item.completedBy.includes(participantId)).length + assignments.filter(item => item.submissions[participantId]).length + quizzes.filter(item => (item.attempts[participantId] || []).length).length;
  return total ? Math.round(complete / total * 100) : 0;
}
