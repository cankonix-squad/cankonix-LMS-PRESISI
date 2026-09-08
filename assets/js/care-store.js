const careSeed = {
  notes: [
    { id: "care-1", participantId: "p-3", date: "2027-03-12", type: "Pelanggaran", severity: "Sedang", summary: "Terlambat mengikuti sesi pagi.", followUp: "Klarifikasi dan pembinaan kedisiplinan.", evidence: "Log attendance 12 Maret", status: "Dalam Tindak Lanjut", confidential: false },
    { id: "care-2", participantId: "p-2", date: "2027-03-11", type: "Prestasi", severity: "Rendah", summary: "Aktif memimpin diskusi kelompok.", followUp: "Catat sebagai capaian perilaku positif.", evidence: "Notulensi diskusi kelompok", status: "Selesai", confidential: false },
    { id: "care-3", participantId: "p-5", date: "2027-03-10", type: "Konseling", severity: "Tinggi", summary: "Pendampingan terkait kondisi kesehatan.", followUp: "Monitoring bersama tenaga kesehatan.", evidence: "Dokumen terbatas", status: "Open", confidential: true }
  ]
};
function careKey() { return `presisiCare:${getWorkspace().id}`; }
function getCareData() { const saved = localStorage.getItem(careKey()); if (saved) { const data = JSON.parse(saved); data.notes.forEach(item => { item.evidence ??= "Belum ada evidence"; }); return data; } const data = JSON.parse(JSON.stringify(careSeed)); localStorage.setItem(careKey(), JSON.stringify(data)); return data; }
function saveCareData(data) { localStorage.setItem(careKey(), JSON.stringify(data)); }
