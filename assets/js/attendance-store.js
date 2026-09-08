const attendanceSeed = {
  sessions: [{
    id: "att-1", classId: "k-1", courseId: "course-leadership", date: "2027-03-12",
    topic: "Diskusi Strategic Leadership",
    records: {
      "p-1": { status: "Hadir", note: "", evidence: "QR ruang kelas • 07:54" },
      "p-2": { status: "Hadir", note: "", evidence: "Daftar hadir digital" },
      "p-3": { status: "Terlambat", note: "10 menit", evidence: "Log gerbang • 08:10" }
    }
  }, {
    id: "att-2", classId: "k-2", courseId: "course-operations", date: "2027-03-10",
    topic: "Perencanaan Operasi Berbasis Risiko",
    records: {
      "p-4": { status: "Hadir", note: "", evidence: "QR ruang kelas • 09:57" },
      "p-5": { status: "Sakit", note: "Rawat jalan", evidence: "Surat dokter demo.pdf" },
      "p-6": { status: "Izin", note: "Kegiatan dinas", evidence: "Surat tugas demo.pdf" }
    }
  }],
  corrections: [{ id: "cor-1", sessionId: "att-1", participantId: "p-3", from: "Terlambat", to: "Hadir", reason: "Kendala pemeriksaan gerbang", status: "Pending" }],
  devices: [
    { id: "dev-1", name: "QR Gate Garuda 1", type: "QR Scanner", location: "Ruang Garuda 1", status: "Online", lastSync: "2027-03-12 08:15" },
    { id: "dev-2", name: "Face Device Lobby", type: "Face Recognition", location: "Lobby Utama", status: "Warning", lastSync: "2027-03-12 07:45" }
  ],
  syncLogs: [{ id: "sync-1", deviceId: "dev-1", time: "2027-03-12 08:15", records: 3, discrepancy: 0, status: "Berhasil" }]
};

function attendanceKey() { return `presisiAttendance:${getWorkspace().id}`; }
function getAttendanceData() {
  const saved = localStorage.getItem(attendanceKey());
  if (saved) {
    const data = JSON.parse(saved);
    data.sessions.forEach(session => Object.values(session.records).forEach(record => { record.evidence ??= "Belum ada evidence"; }));
    data.devices ||= JSON.parse(JSON.stringify(attendanceSeed.devices));
    data.syncLogs ||= JSON.parse(JSON.stringify(attendanceSeed.syncLogs));
    return data;
  }
  const data = JSON.parse(JSON.stringify(attendanceSeed));
  localStorage.setItem(attendanceKey(), JSON.stringify(data));
  return data;
}
function saveAttendanceData(data) { localStorage.setItem(attendanceKey(), JSON.stringify(data)); }
