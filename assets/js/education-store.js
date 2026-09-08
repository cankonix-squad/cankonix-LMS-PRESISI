const educationSeed = {
  programs: [
    { id: "sppk-2027", code: "SPPK-2027", name: "Sekolah Pengembangan Profesi Kepolisian 2027", mode: "Blended", start: "2027-01-15", end: "2027-06-30", capacity: 180, responsibleId: "g-1", status: "Aktif", progress: 24, description: "Program pengembangan kepemimpinan dan profesi kepolisian." },
    { id: "diktuk-bintara-67", code: "DIKTUK-67", name: "Diktuk Bintara Dikreg ke-67", mode: "Tatap Muka", start: "2027-02-01", end: "2027-09-30", capacity: 225, responsibleId: "g-2", status: "Draft", progress: 8, description: "Pendidikan pengembangan umum tingkat menengah Polri." }
  ],
  curricula: [
    { id: "cur-1", programId: "sppk-2027", code: "KPM-101", name: "Kepemimpinan Strategis", hours: 24, outcome: "Mampu menerapkan kepemimpinan strategis", status: "Disetujui" },
    { id: "cur-2", programId: "sppk-2027", code: "MOP-201", name: "Manajemen Operasi Kepolisian", hours: 32, outcome: "Mampu merencanakan operasi kepolisian", status: "Review" },
    { id: "cur-3", programId: "diktuk-bintara-67", code: "ETK-101", name: "Etika Profesi Kepolisian", hours: 16, outcome: "Menerapkan etika profesi", status: "Draft" }
  ],
  instructors: [
    { id: "g-1", nrp: "72010456", name: "Kombes Pol. Arif Pratama", expertise: "Kepemimpinan Strategis", workload: 12, status: "Aktif" },
    { id: "g-2", nrp: "73020811", name: "Kombes Pol. Rina Kusumawardani", expertise: "Manajemen Operasi", workload: 16, status: "Aktif" },
    { id: "g-3", nrp: "74110672", name: "AKBP Dimas Kurniawan", expertise: "Etika Profesi", workload: 8, status: "Aktif" },
    { id: "g-4", nrp: "75031298", name: "AKBP Maya Permatasari", expertise: "Transformasi Digital", workload: 10, status: "Aktif" }
  ],
  participants: [
    { id: "p-1", nrp: "95011234", name: "Ipda Andi Saputra", cohort: "2027", status: "Aktif" },
    { id: "p-2", nrp: "95021235", name: "Ipda Budi Santoso", cohort: "2027", status: "Aktif" },
    { id: "p-3", nrp: "95031236", name: "Ipda Citra Lestari", cohort: "2027", status: "Aktif" },
    { id: "p-4", nrp: "95041237", name: "Ipda Dedi Prabowo", cohort: "2027", status: "Aktif" },
    { id: "p-5", nrp: "95051238", name: "Ipda Eka Wulandari", cohort: "2027", status: "Aktif" },
    { id: "p-6", nrp: "95061239", name: "Ipda Farhan Akbar", cohort: "2027", status: "Aktif" }
  ],
  classes: [
    { id: "k-1", programId: "sppk-2027", name: "Kelas A", room: "Ruang Garuda 1", capacity: 30, guardianId: "g-3", instructorIds: ["g-1", "g-4"], participantIds: ["p-1", "p-2", "p-3"], status: "Aktif" },
    { id: "k-2", programId: "sppk-2027", name: "Kelas B", room: "Ruang Garuda 2", capacity: 30, guardianId: "g-4", instructorIds: ["g-2"], participantIds: ["p-4", "p-5", "p-6"], status: "Aktif" }
  ],
  schedules: [
    { id: "sch-1", classId: "k-1", curriculumId: "cur-1", instructorId: "g-1", date: "2027-02-08", start: "08:00", end: "10:00", room: "Ruang Garuda 1", mode: "Tatap Muka" },
    { id: "sch-2", classId: "k-2", curriculumId: "cur-2", instructorId: "g-2", date: "2027-02-08", start: "10:30", end: "12:30", room: "Ruang Garuda 2", mode: "Blended" }
  ]
};

function cloneData(value) { return JSON.parse(JSON.stringify(value)); }
function educationStorageKey() { return `presisiEducation:${getWorkspace().id}`; }
function getEducationData() {
  const stored = localStorage.getItem(educationStorageKey());
  if (stored) {
    const current = JSON.parse(stored);
    current.programs?.forEach((item, index) => { if (!item.responsibleId) item.responsibleId = educationSeed.instructors[index % educationSeed.instructors.length].id; });
    current.classes?.forEach((item, index) => { if (!item.guardianId) item.guardianId = educationSeed.instructors[(index + 2) % educationSeed.instructors.length].id; });
    return current;
  }
  const initial = cloneData(educationSeed);
  localStorage.setItem(educationStorageKey(), JSON.stringify(initial));
  return initial;
}
function saveEducationData(data) { localStorage.setItem(educationStorageKey(), JSON.stringify(data)); }
function educationId(prefix) { return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`; }
function educationName(items, id, fallback = "-") { return items.find(item => item.id === id)?.name || fallback; }
function formatDateId(value) { if (!value) return "-"; return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(`${value}T00:00:00`)); }
function educationBadge(status) { const color = { Aktif: "green", Berjalan: "green", Disetujui: "green", Draft: "blue", Review: "orange", Selesai: "blue", Arsip: "red", Dibatalkan: "red" }[status] || "blue"; return `<span class="badge ${color}">${escapeHtml(status)}</span>`; }
function showEducationToast(message) {
  document.querySelector(".toast")?.remove();
  const toast = document.createElement("div"); toast.className = "toast"; toast.textContent = message; document.body.appendChild(toast);
  setTimeout(() => toast.classList.add("show"), 10); setTimeout(() => toast.remove(), 2600);
}
function openEducationModal(title, content, onSubmit) {
  const layer = document.createElement("div"); layer.className = "modal-layer";
  layer.innerHTML = `<div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="modalTitle"><div class="modal-head"><h2 id="modalTitle">${escapeHtml(title)}</h2><button type="button" class="modal-close" aria-label="Tutup">×</button></div><form id="educationModalForm">${content}<div class="modal-actions"><button type="button" class="btn btn-light modal-cancel">Batal</button><button type="submit" class="btn btn-primary">Simpan</button></div></form></div>`;
  document.body.appendChild(layer); layer.querySelector("input,select")?.focus();
  const close = () => layer.remove(); layer.querySelector(".modal-close").onclick = close; layer.querySelector(".modal-cancel").onclick = close;
  layer.onclick = event => { if (event.target === layer) close(); };
  layer.querySelector("form").onsubmit = event => { event.preventDefault(); if (onSubmit(new FormData(event.currentTarget)) !== false) close(); };
}
