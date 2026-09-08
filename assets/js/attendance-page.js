renderSidebar("Attendance");
renderHeader("Attendance", "Learning / Kehadiran");
let attendance = getAttendanceData();
const attendanceEducation = getEducationData();
const attendanceLearning = getLearningData();
const attendanceRoot = document.querySelector("#attendanceContent");
const attendanceManager = ["pimpinansatdik", "adminunit", "akademik", "gadik", "pengasuh"].includes(getRole());
const attendanceStatuses = ["Hadir", "Terlambat", "Izin", "Sakit", "Alpa"];
const attendanceFilters = { classId: "", month: "" };

function attendanceParticipant(id) { return attendanceEducation.participants.find(item => item.id === id); }
function attendanceSession(id) { return attendance.sessions.find(item => item.id === id); }
function attendanceClass(id) { return attendanceEducation.classes.find(item => item.id === id); }
function refreshAttendance() { attendance = getAttendanceData(); renderAttendance(); }

function addAttendanceSession() {
  openEducationModal("Buat Sesi Kehadiran", `<div class="form-grid"><div class="form-row"><label>Kelas</label><select name="classId">${attendanceEducation.classes.map(item => `<option value="${item.id}">${escapeHtml(item.name)}</option>`).join("")}</select></div><div class="form-row"><label>Course</label><select name="courseId">${attendanceLearning.courses.map(item => `<option value="${item.id}">${escapeHtml(item.title)}</option>`).join("")}</select></div><div class="form-row"><label>Tanggal</label><input type="date" name="date" required></div><div class="form-row full"><label>Topik</label><input name="topic" required></div></div>`, form => {
    const value = Object.fromEntries(form), selectedClass = attendanceClass(value.classId), records = {};
    (selectedClass?.participantIds || []).forEach(id => { records[id] = { status: "Hadir", note: "", evidence: "Input manual Gadik" }; });
    attendance.sessions.unshift({ id: educationId("att"), ...value, records });
    saveAttendanceData(attendance); refreshAttendance(); showEducationToast("Sesi kehadiran dibuat.");
  });
}

function updateAttendance(sessionId, participantId, status) {
  const record = attendanceSession(sessionId)?.records[participantId];
  if (!record) return;
  record.status = status;
  record.note = prompt("Catatan kehadiran (opsional):", record.note || "") || "";
  record.evidence = prompt("Evidence / sumber pencatatan:", record.evidence || "Input manual Gadik") || "Belum ada evidence";
  saveAttendanceData(attendance); refreshAttendance(); showEducationToast("Kehadiran diperbarui.");
}

function requestAttendanceCorrection(sessionId) {
  const session = attendanceSession(sessionId), participantId = "p-1", record = session?.records[participantId];
  if (!record) return;
  const desired = prompt(`Status saat ini: ${record.status}\nAjukan status yang benar:`, "Hadir");
  if (!desired || !attendanceStatuses.includes(desired)) { if (desired) alert(`Gunakan salah satu: ${attendanceStatuses.join(", ")}`); return; }
  const reason = prompt("Alasan koreksi:"); if (!reason) return;
  attendance.corrections.unshift({ id: educationId("cor"), sessionId, participantId, from: record.status, to: desired, reason, status: "Pending" });
  saveAttendanceData(attendance); refreshAttendance(); showEducationToast("Koreksi dikirim untuk persetujuan.");
}

function decideAttendanceCorrection(id, decision) {
  const correction = attendance.corrections.find(item => item.id === id); if (!correction) return;
  correction.status = decision;
  if (decision === "Disetujui") attendanceSession(correction.sessionId).records[correction.participantId].status = correction.to;
  saveAttendanceData(attendance); refreshAttendance(); showEducationToast(`Koreksi ${decision.toLowerCase()}.`);
}

function setAttendanceFilter(name, value) { attendanceFilters[name] = value; renderAttendance(); }
function simulateQrScan() {
  const participantId = demoParticipantId(), session = attendance.sessions.find(item => item.records[participantId]) || attendance.sessions[0];
  if (!session) return;
  session.records[participantId] = { status: "Hadir", note: "Check-in mandiri", evidence: `QR scan simulation • ${new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}` };
  saveAttendanceData(attendance); refreshAttendance(); showEducationToast("QR valid. Kehadiran tercatat.");
}
function syncAttendanceDevice(id) {
  const device = attendance.devices.find(item => item.id === id); if (!device) return;
  const now = new Date(), discrepancy = device.status === "Warning" ? 1 : 0;
  device.status = "Online"; device.lastSync = `${now.toISOString().slice(0, 10)} ${now.toTimeString().slice(0, 5)}`;
  attendance.syncLogs.unshift({ id: educationId("sync"), deviceId: id, time: device.lastSync, records: Math.max(1, attendance.sessions.reduce((sum, item) => sum + Object.keys(item.records).length, 0)), discrepancy, status: discrepancy ? "Perlu Review" : "Berhasil" });
  saveAttendanceData(attendance); refreshAttendance(); showEducationToast(discrepancy ? "Sync selesai dengan 1 discrepancy." : "Data perangkat berhasil disinkronkan.");
}
function attendanceTotals(sessions = attendance.sessions) {
  const all = sessions.flatMap(item => Object.values(item.records));
  const present = all.filter(item => ["Hadir", "Terlambat"].includes(item.status)).length;
  return { all: all.length, present, rate: all.length ? Math.round(present / all.length * 100) : 0 };
}

function renderAttendance() {
  let visibleSessions = attendanceManager ? attendance.sessions : attendance.sessions.filter(item => item.records["p-1"]);
  if (attendanceFilters.classId) visibleSessions = visibleSessions.filter(item => item.classId === attendanceFilters.classId);
  if (attendanceFilters.month) visibleSessions = visibleSessions.filter(item => item.date.startsWith(attendanceFilters.month));
  const totals = attendanceTotals(visibleSessions), recaps = attendanceEducation.classes.map(item => ({ item, totals: attendanceTotals(attendance.sessions.filter(session => session.classId === item.id)) }));
  attendanceRoot.innerHTML = `<div class="hero"><div class="page-actions" style="justify-content:space-between"><div><h1>Attendance</h1><p>Kehadiran per sesi, evidence, rekap periode, dan alur koreksi terkontrol.</p></div>${attendanceManager ? '<button class="btn btn-light" onclick="addAttendanceSession()">+ Buat Sesi</button>' : '<button class="btn btn-light" onclick="simulateQrScan()">Scan QR Kehadiran</button>'}</div></div>
  <div class="toolbar"><select class="control" onchange="setAttendanceFilter('classId',this.value)"><option value="">Semua Kelas</option>${attendanceEducation.classes.map(item => `<option value="${item.id}" ${item.id===attendanceFilters.classId?"selected":""}>${escapeHtml(item.name)}</option>`).join("")}</select><input class="control" type="month" value="${attendanceFilters.month}" onchange="setAttendanceFilter('month',this.value)"></div>
  <div class="grid grid-3"><div class="card kpi"><div class="kpi-label">Tingkat Kehadiran</div><div class="kpi-value">${totals.rate}%</div></div><div class="card kpi"><div class="kpi-label">Hadir / Terlambat</div><div class="kpi-value">${totals.present}</div></div><div class="card kpi"><div class="kpi-label">Koreksi Pending</div><div class="kpi-value">${attendance.corrections.filter(item => item.status === "Pending").length}</div></div></div>
  ${attendanceManager?`<section class="card attendance-recap"><div class="section-title">Rekap Kehadiran per Kelas</div><div class="grid grid-2">${recaps.map(({item,totals})=>`<div class="recap-row"><span><b>${escapeHtml(item.name)}</b><small>${totals.all} pencatatan</small></span><strong>${totals.rate}%</strong><div class="progress"><span style="width:${totals.rate}%"></span></div></div>`).join("")}</div></section>`:""}
  <div class="attendance-sessions">${visibleSessions.map(session => { const selectedRecords = attendanceManager ? Object.entries(session.records) : [["p-1", session.records["p-1"]]]; return `<section class="card"><div class="attendance-head"><div><div class="section-title">${escapeHtml(session.topic)}</div><span class="muted">${formatDateId(session.date)} • ${escapeHtml(attendanceClass(session.classId)?.name || "-")} • ${escapeHtml(attendanceLearning.courses.find(item => item.id === session.courseId)?.title || "-")}</span></div>${educationBadge("Berjalan")}</div><div class="table-wrap"><table class="table"><thead><tr><th>Peserta</th><th>Status</th><th>Catatan</th><th>Evidence</th><th>Aksi</th></tr></thead><tbody>${selectedRecords.map(([participantId, record]) => `<tr><td><b>${escapeHtml(attendanceParticipant(participantId)?.name || participantId)}</b><br><small class="muted">${escapeHtml(attendanceParticipant(participantId)?.nrp || "")}</small></td><td>${educationBadge(record.status)}</td><td>${escapeHtml(record.note || "-")}</td><td><small>${escapeHtml(record.evidence || "Belum ada")}</small></td><td>${attendanceManager ? `<select class="control compact" onchange="updateAttendance('${session.id}','${participantId}',this.value)">${attendanceStatuses.map(status => `<option ${status === record.status ? "selected" : ""}>${status}</option>`).join("")}</select>` : `<button class="btn btn-light" onclick="requestAttendanceCorrection('${session.id}')">Ajukan Koreksi</button>`}</td></tr>`).join("")}</tbody></table></div></section>`; }).join("") || '<div class="card empty-state">Tidak ada sesi pada filter ini.</div>'}</div>
  ${attendanceManager ? `<section class="card device-panel"><div class="section-title">Perangkat & Sinkronisasi</div><div class="grid grid-2">${attendance.devices.map(device=>{const last=attendance.syncLogs.find(log=>log.deviceId===device.id);return`<div class="device-card"><div><b>${escapeHtml(device.name)}</b><small>${escapeHtml(device.type)} • ${escapeHtml(device.location)}</small></div>${educationBadge(device.status)}<div class="device-meta"><span>Last sync<br><b>${escapeHtml(device.lastSync)}</b></span><span>Discrepancy<br><b>${last?.discrepancy||0}</b></span></div><button class="btn btn-light" onclick="syncAttendanceDevice('${device.id}')">Sync / Retry</button></div>`}).join("")}</div></section><section class="card"><div class="section-title">Permintaan Koreksi</div><div class="table-wrap"><table class="table"><thead><tr><th>Peserta</th><th>Perubahan</th><th>Alasan</th><th>Status / Aksi</th></tr></thead><tbody>${attendance.corrections.map(item => `<tr><td>${escapeHtml(attendanceParticipant(item.participantId)?.name || item.participantId)}</td><td>${escapeHtml(item.from)} → <b>${escapeHtml(item.to)}</b></td><td>${escapeHtml(item.reason)}</td><td>${item.status === "Pending" ? `<div class="row-actions"><button onclick="decideAttendanceCorrection('${item.id}','Disetujui')">Setujui</button><button onclick="decideAttendanceCorrection('${item.id}','Ditolak')">Tolak</button></div>` : educationBadge(item.status)}</td></tr>`).join("") || '<tr><td colspan="4">Belum ada permintaan.</td></tr>'}</tbody></table></div></section>` : ""}`;
}

renderAttendance();
