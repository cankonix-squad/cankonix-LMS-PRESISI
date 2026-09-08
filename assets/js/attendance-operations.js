/* Completes the attendance prototype with instructor records and program trends. */
function normalizeAttendanceOperations() {
  let changed = false;
  attendance.sessions.forEach(session => {
    const cls = attendanceClass(session.classId);
    if (!session.instructorRecords || typeof session.instructorRecords !== "object") {
      session.instructorRecords = {};
      changed = true;
    }
    (cls?.instructorIds || []).forEach(id => {
      if (session.instructorRecords[id]) return;
      session.instructorRecords[id] = { status: "Hadir", note: "Mengajar sesuai jadwal", evidence: "Jadwal pembelajaran" };
      changed = true;
    });
  });
  if (changed) saveAttendanceData(attendance);
}

function updateInstructorAttendance(sessionId, instructorId, status) {
  const record = attendanceSession(sessionId)?.instructorRecords?.[instructorId];
  if (!record) return;
  record.status = status;
  record.note = prompt("Catatan kehadiran Gadik:", record.note || "") || "";
  record.evidence = prompt("Evidence / sumber pencatatan:", record.evidence || "Jadwal pembelajaran") || "Belum ada evidence";
  saveAttendanceData(attendance); refreshAttendance(); showEducationToast("Kehadiran Gadik diperbarui.");
}

function attendanceInstructor(id) { return attendanceEducation.instructors.find(item => item.id === id); }

function enhanceAttendanceAccessibility() {
  const filters = attendanceRoot.querySelectorAll(".toolbar .control");
  filters[0]?.setAttribute("aria-label", "Filter kelas Attendance");
  filters[1]?.setAttribute("aria-label", "Filter bulan Attendance");
  attendanceRoot.querySelectorAll("table").forEach(table => {
    if (!table.getAttribute("aria-label")) table.setAttribute("aria-label", "Data Attendance");
  });
  attendanceRoot.querySelectorAll(".attendance-sessions select").forEach(select => {
    if (!select.getAttribute("aria-label")) select.setAttribute("aria-label", "Ubah status kehadiran");
  });
  attendanceRoot.querySelectorAll(".progress").forEach(progress => {
    const width = Number.parseInt(progress.querySelector("span")?.style.width || "0", 10);
    progress.setAttribute("role", "progressbar");
    progress.setAttribute("aria-valuemin", "0");
    progress.setAttribute("aria-valuemax", "100");
    progress.setAttribute("aria-valuenow", String(Number.isFinite(width) ? width : 0));
  });
  attendanceRoot.querySelectorAll(".attendance-trend").forEach(trend => {
    trend.setAttribute("role", "img");
    trend.setAttribute("aria-label", "Grafik tren kehadiran periode");
  });
  attendanceRoot.querySelectorAll(".trend-bar").forEach(bar => bar.setAttribute("aria-hidden", "true"));
}

function attendanceProgramSummary(sessions) {
  return attendanceEducation.programs.map(program => {
    const classIds = attendanceEducation.classes.filter(cls => cls.programId === program.id).map(cls => cls.id);
    const scoped = sessions.filter(session => classIds.includes(session.classId));
    return { program, totals: attendanceTotals(scoped), sessions: scoped.length };
  }).filter(item => item.sessions);
}

function attendancePeriodTrend(sessions) {
  const useMonthlyBuckets = new Set(sessions.map(session => session.date.slice(0, 7))).size > 1;
  const buckets = {};
  sessions.forEach(session => {
    const period = useMonthlyBuckets ? session.date.slice(0, 7) : session.date;
    buckets[period] ||= [];
    buckets[period].push(session);
  });
  return Object.entries(buckets).sort(([a], [b]) => a.localeCompare(b)).map(([period, scoped]) => ({
    period,
    label: new Intl.DateTimeFormat("id-ID", useMonthlyBuckets ? { month: "short", year: "2-digit" } : { day: "2-digit", month: "short" }).format(new Date(`${period}${useMonthlyBuckets ? "-01" : ""}T00:00:00`)),
    ...attendanceTotals(scoped)
  }));
}

const renderAttendanceBase = renderAttendance;
renderAttendance = function renderCompleteAttendance() {
  normalizeAttendanceOperations();
  renderAttendanceBase();
  enhanceAttendanceAccessibility();
  if (!attendanceManager) return;

  let visibleSessions = attendance.sessions;
  if (attendanceFilters.classId) visibleSessions = visibleSessions.filter(item => item.classId === attendanceFilters.classId);
  if (attendanceFilters.month) visibleSessions = visibleSessions.filter(item => item.date.startsWith(attendanceFilters.month));

  const instructorRecords = visibleSessions.flatMap(item => Object.values(item.instructorRecords || {}));
  const instructorPresent = instructorRecords.filter(item => ["Hadir", "Terlambat"].includes(item.status)).length;
  const instructorRate = instructorRecords.length ? Math.round(instructorPresent / instructorRecords.length * 100) : 0;
  const kpis = attendanceRoot.querySelector(".grid.grid-3");
  if (kpis) {
    kpis.classList.remove("grid-3"); kpis.classList.add("grid-4");
    kpis.insertAdjacentHTML("beforeend", `<div class="card kpi"><div class="kpi-label">Kehadiran Gadik</div><div class="kpi-value">${instructorRate}%</div><div class="kpi-note">${instructorPresent}/${instructorRecords.length} pencatatan</div></div>`);
  }

  attendanceRoot.querySelectorAll(".attendance-sessions > section").forEach((section, index) => {
    const session = visibleSessions[index];
    if (!session) return;
    const rows = Object.entries(session.instructorRecords || {});
    section.insertAdjacentHTML("beforeend", `<div class="instructor-attendance"><div class="section-title">Kehadiran Gadik</div><div class="table-wrap"><table class="table"><thead><tr><th>Gadik</th><th>Status</th><th>Catatan</th><th>Evidence</th><th>Aksi</th></tr></thead><tbody>${rows.map(([id, record]) => `<tr><td><b>${escapeHtml(attendanceInstructor(id)?.name || id)}</b><br><small class="muted">${escapeHtml(attendanceInstructor(id)?.nrp || "")}</small></td><td>${educationBadge(record.status)}</td><td>${escapeHtml(record.note || "-")}</td><td><small>${escapeHtml(record.evidence || "-")}</small></td><td><select class="control compact" onchange="updateInstructorAttendance('${session.id}','${id}',this.value)">${attendanceStatuses.map(status => `<option ${status === record.status ? "selected" : ""}>${status}</option>`).join("")}</select></td></tr>`).join("") || '<tr><td colspan="5">Belum ada Gadik pada sesi ini.</td></tr>'}</tbody></table></div></div>`);
  });

  const summaries = attendanceProgramSummary(visibleSessions);
  const trendSessions = attendanceFilters.classId ? attendance.sessions.filter(item => item.classId === attendanceFilters.classId) : attendance.sessions;
  const trends = attendancePeriodTrend(trendSessions);
  const maxRecords = Math.max(1, ...trends.map(item => item.all));
  const recap = attendanceRoot.querySelector(".attendance-recap");
  recap?.insertAdjacentHTML("afterend", `<div class="attendance-analytics"><section class="card"><div class="section-title">Rekap per Program</div><div class="program-recap">${summaries.map(({ program, totals, sessions }) => `<article><span><b>${escapeHtml(program.name)}</b><small>${sessions} sesi • ${totals.present}/${totals.all} hadir</small></span><strong>${totals.rate}%</strong><div class="progress"><span style="width:${totals.rate}%"></span></div></article>`).join("") || '<div class="empty-state">Belum ada data program pada filter ini.</div>'}</div></section><section class="card"><div class="section-title">Tren Kehadiran Periode</div><div class="attendance-trend">${trends.map(item => `<div><span class="trend-bar"><i style="height:${item.all / maxRecords * 100}%"></i></span><b>${item.rate}%</b><small>${item.label}</small></div>`).join("") || '<div class="empty-state">Belum ada data tren.</div>'}</div><p class="muted trend-caption">Persentase menunjukkan hadir + terlambat. Tinggi batang menunjukkan volume pencatatan.</p></section></div>`);
  enhanceAttendanceAccessibility();
};

renderAttendance();
