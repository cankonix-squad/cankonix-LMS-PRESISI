/* Interactive prototype: program governance, enrollment, and Gadik workload. */
const PROGRAM_ACTORS = { maker: "Admin Satdik", checker: "Pimpinan Satdik" };

function normalizeOperations() {
  let changed = false;
  edu.programs.forEach(item => {
    if (!item.maker) { item.maker = PROGRAM_ACTORS.maker; changed = true; }
    if (!item.checker) { item.checker = PROGRAM_ACTORS.checker; changed = true; }
    if (!Array.isArray(item.approvalHistory)) {
      item.approvalHistory = [{ at: new Date().toISOString(), actor: item.maker, action: item.status === "Draft" ? "Membuat draft" : `Status awal: ${item.status}`, note: "Data prototype" }];
      changed = true;
    }
  });
  edu.classes.forEach(item => {
    if (!Array.isArray(item.waitingListIds)) { item.waitingListIds = []; changed = true; }
  });
  edu.instructors.forEach(item => {
    if (!Number.isFinite(Number(item.maxWorkload))) { item.maxWorkload = 18; changed = true; }
  });
  if (changed) saveEducationData(edu);
}

function programTransition(id, action) {
  const item = edu.programs.find(x => x.id === id);
  const rules = {
    submit: [["Draft"], "Review", item?.maker, "Mengajukan review"],
    approve: [["Review"], "Disetujui", item?.checker, "Menyetujui program"],
    reject: [["Review"], "Draft", item?.checker, "Mengembalikan untuk revisi"],
    activate: [["Disetujui"], "Aktif", item?.checker, "Mengaktifkan program"],
    complete: [["Aktif"], "Selesai", item?.checker, "Menyelesaikan program"],
    archive: [["Selesai"], "Arsip", item?.checker, "Mengarsipkan program"]
  };
  const rule = rules[action];
  if (!item || !rule?.[0].includes(item.status)) { alert(`Aksi tidak tersedia untuk status ${item?.status || "ini"}.`); return; }
  const note = action === "reject" ? (prompt("Catatan revisi:", "Lengkapi dokumen kurikulum dan jadwal.") || "Perlu revisi") : "";
  item.status = rule[1];
  item.approvalHistory.unshift({ at: new Date().toISOString(), actor: rule[2], action: rule[3], note });
  saveEducationData(edu); refresh(); showEducationToast(`${rule[3]}. Status: ${rule[1]}.`);
}

function approvalActions(item, compact = false) {
  const cls = compact ? "" : "btn ";
  if (item.status === "Draft") return `<button class="${cls}btn-light" onclick="programTransition('${item.id}','submit')">Ajukan Review</button>`;
  if (item.status === "Review") return `<button class="${cls}btn-primary" onclick="programTransition('${item.id}','approve')">Setujui</button><button class="${cls}btn-light" onclick="programTransition('${item.id}','reject')">Tolak / Revisi</button>`;
  if (item.status === "Disetujui") return `<button class="${cls}btn-primary" onclick="programTransition('${item.id}','activate')">Aktifkan</button>`;
  if (item.status === "Aktif") return `<button class="${cls}btn-light" onclick="programTransition('${item.id}','complete')">Tandai Selesai</button>`;
  if (item.status === "Selesai") return `<button class="${cls}btn-light" onclick="programTransition('${item.id}','archive')">Arsipkan</button>`;
  return "";
}

function showProgramHistory(id) {
  const item = edu.programs.find(x => x.id === id);
  const rows = item.approvalHistory.map(entry => `<div class="approval-entry"><span class="approval-dot"></span><div><b>${escapeHtml(entry.action)}</b><small>${escapeHtml(entry.actor)} • ${new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(new Date(entry.at))}</small>${entry.note ? `<p>${escapeHtml(entry.note)}</p>` : ""}</div></div>`).join("");
  openEducationModal("Riwayat Persetujuan", `<div class="approval-timeline">${rows}</div>`, () => true);
  const modal = document.querySelector(".modal-layer:last-child");
  modal.querySelector(".modal-actions").innerHTML = '<button type="button" class="btn btn-primary modal-cancel">Tutup</button>';
  modal.querySelector(".modal-cancel").onclick = () => modal.remove();
}

function renderGovernedPrograms() {
  normalizeOperations();
  root.innerHTML = `<div class="hero"><div class="page-actions spread"><div><h1>Program Pendidikan</h1><p>Lifecycle program dengan kontrol maker-checker pada ${escapeHtml(getWorkspace().name)}.</p></div><button class="btn btn-light" onclick="openProgramForm()">+ Buat Program</button></div></div><div class="grid grid-4"><div class="card kpi"><div class="kpi-label">Total Program</div><div class="kpi-value">${edu.programs.length}</div></div><div class="card kpi"><div class="kpi-label">Aktif</div><div class="kpi-value">${edu.programs.filter(x => x.status === "Aktif").length}</div></div><div class="card kpi"><div class="kpi-label">Menunggu Checker</div><div class="kpi-value">${edu.programs.filter(x => x.status === "Review").length}</div></div><div class="card kpi"><div class="kpi-label">Disetujui</div><div class="kpi-value">${edu.programs.filter(x => x.status === "Disetujui").length}</div></div></div><section class="card" style="margin-top:18px"><div class="toolbar"><input class="control" id="programSearch" placeholder="Cari program atau kode"><select class="control" id="programStatus"><option value="all">Semua status</option><option>Draft</option><option>Review</option><option>Disetujui</option><option>Aktif</option><option>Selesai</option><option>Arsip</option></select></div><div class="table-wrap"><table class="table"><thead><tr><th>Program</th><th>Periode</th><th>Maker / Checker</th><th>Status</th><th>Aksi</th></tr></thead><tbody id="programRows"></tbody></table></div></section>`;
  const draw = () => {
    const text = document.querySelector("#programSearch").value.toLowerCase();
    const status = document.querySelector("#programStatus").value;
    const rows = edu.programs.filter(x => (status === "all" || x.status === status) && `${x.name} ${x.code}`.toLowerCase().includes(text));
    document.querySelector("#programRows").innerHTML = rows.map(x => `<tr><td><a href="program-detail.html?id=${x.id}"><b>${escapeHtml(x.name)}</b></a><br><small class="muted">${escapeHtml(x.code)} • ${escapeHtml(x.mode)}</small></td><td>${formatDateId(x.start)} – ${formatDateId(x.end)}</td><td><small><b>M:</b> ${escapeHtml(x.maker)}</small><br><small><b>C:</b> ${escapeHtml(x.checker)}</small></td><td>${educationBadge(x.status)}</td><td><div class="row-actions"><a href="program-detail.html?id=${x.id}">Detail</a><button onclick="showProgramHistory('${x.id}')">Riwayat</button>${approvalActions(x, true)}</div></td></tr>`).join("") || '<tr><td colspan="5" class="muted">Program tidak ditemukan.</td></tr>';
  };
  document.querySelector("#programSearch").oninput = draw;
  document.querySelector("#programStatus").onchange = draw;
  draw();
}

function renderGovernedProgramDetail() {
  normalizeOperations();
  const id = query.get("id") || edu.programs[0]?.id;
  const item = edu.programs.find(x => x.id === id);
  if (!item) { root.innerHTML = '<div class="card empty-state"><b>Program tidak ditemukan</b><a class="btn btn-primary" href="programs.html">Kembali</a></div>'; return; }
  const classes = edu.classes.filter(x => x.programId === id);
  const curricula = edu.curricula.filter(x => x.programId === id);
  const participantIds = new Set(classes.flatMap(x => x.participantIds));
  const instructorIds = new Set(classes.flatMap(x => x.instructorIds));
  root.innerHTML = `<div class="hero"><div class="page-actions spread"><div><div class="eyebrow">${escapeHtml(item.code)}</div><h1>${escapeHtml(item.name)}</h1><p>${formatDateId(item.start)} – ${formatDateId(item.end)} • ${escapeHtml(item.mode)}</p></div>${educationBadge(item.status)}</div></div><div class="grid grid-4"><div class="card kpi"><div class="kpi-label">Kurikulum</div><div class="kpi-value">${curricula.length}</div></div><div class="card kpi"><div class="kpi-label">Kelas</div><div class="kpi-value">${classes.length}</div></div><div class="card kpi"><div class="kpi-label">Peserta</div><div class="kpi-value">${participantIds.size}</div></div><div class="card kpi"><div class="kpi-label">Gadik</div><div class="kpi-value">${instructorIds.size}</div></div></div><div class="card" style="margin-top:18px"><div class="tabs"><a class="tab active">Ringkasan</a><a class="tab" href="curriculum.html?program=${id}">Kurikulum</a><a class="tab" href="classes.html?program=${id}">Kelas</a><a class="tab" href="schedule.html?program=${id}">Jadwal</a><a class="tab" href="participants.html?program=${id}">Peserta</a><a class="tab" href="instructors.html?program=${id}">Gadik</a></div><div class="split-60"><div><div class="section-title">Deskripsi Program</div><p>${escapeHtml(item.description || "Belum ada deskripsi.")}</p><p><b>Penanggung jawab:</b> ${escapeHtml(educationName(edu.instructors, item.responsibleId, "Belum ditentukan"))}</p><div class="section-title">Progress Program</div><div class="progress"><span style="width:${item.progress}%"></span></div><p class="muted">${item.progress}% dari rencana pembelajaran.</p><button class="btn btn-light" onclick="showProgramHistory('${id}')">Lihat Audit Persetujuan</button></div><aside><div class="section-title">Maker–Checker</div><div class="approval-roles"><span><small>Pembuat (Maker)</small><b>${escapeHtml(item.maker)}</b></span><span><small>Pemeriksa (Checker)</small><b>${escapeHtml(item.checker)}</b></span></div><div class="page-actions lifecycle-actions">${approvalActions(item)}</div><div class="alert" style="margin-top:16px">${item.status === "Review" ? "Program menunggu keputusan Checker dan belum dapat diaktifkan." : classes.length ? `${classes.length} kelas sudah dibuat.` : "Belum ada kelas. Buat kelas untuk memulai operasional."}</div></aside></div></div>`;
}

function openBulkEnrollment() {
  const selectedClass = query.get("class") || edu.classes[0]?.id || "";
  const content = `<div class="form-grid">${formRow("Kelas tujuan", "classId", `<select name="{name}">${classOptions(selectedClass)}</select>`)}${formRow("Format", "format", '<select name="{name}"><option>NRP,Nama,Angkatan</option></select>')}${formRow("Daftar peserta (satu baris per peserta)", "rows", '<textarea name="{name}" rows="8" placeholder="96010001,Bripda Satria Wibawa,2027\n96010002,Bripda Nabila Putri,2027" required></textarea>', true)}</div><div class="alert">Peserta yang melebihi kapasitas otomatis masuk waiting list. NRP duplikat akan dilewati.</div>`;
  openEducationModal("Bulk Enrollment Peserta", content, data => {
    const cls = edu.classes.find(x => x.id === data.get("classId"));
    const lines = String(data.get("rows")).split(/\r?\n/).map(x => x.trim()).filter(Boolean);
    let enrolled = 0, waiting = 0, duplicate = 0, invalid = 0;
    lines.forEach(line => {
      const [nrp, name, cohort = "2027"] = line.split(",").map(x => x?.trim());
      if (!nrp || !name) { invalid++; return; }
      if (edu.participants.some(x => x.nrp === nrp)) { duplicate++; return; }
      const id = educationId("p");
      edu.participants.push({ id, nrp, name, cohort, status: "Aktif", enrollmentSource: "Bulk" });
      if (cls.participantIds.length < Number(cls.capacity)) { cls.participantIds.push(id); enrolled++; }
      else { cls.waitingListIds.push(id); waiting++; }
    });
    saveEducationData(edu); refresh();
    alert(`Hasil import\nTerdaftar: ${enrolled}\nWaiting list: ${waiting}\nDuplikat: ${duplicate}\nTidak valid: ${invalid}`);
    showEducationToast("Bulk enrollment selesai diproses.");
  });
}

function exitParticipant(id) {
  const participant = edu.participants.find(x => x.id === id);
  if (!participant || !confirm(`Keluarkan ${participant.name} dari enrollment aktif?`)) return;
  participant.status = "Keluar";
  participant.exitReason = prompt("Alasan keluar/pembatalan:", "Mutasi / pembatalan pendidikan") || "Tidak dicantumkan";
  edu.classes.forEach(cls => {
    cls.participantIds = cls.participantIds.filter(x => x !== id);
    cls.waitingListIds = cls.waitingListIds.filter(x => x !== id);
  });
  saveEducationData(edu); refresh(); showEducationToast("Status peserta menjadi Keluar.");
}

function promoteWaiting(classId) {
  const cls = edu.classes.find(x => x.id === classId);
  if (!cls || !cls.waitingListIds.length) return;
  if (cls.participantIds.length >= Number(cls.capacity)) { alert("Belum ada kursi tersedia pada kelas ini."); return; }
  cls.participantIds.push(cls.waitingListIds.shift());
  saveEducationData(edu); refresh(); showEducationToast("Peserta pertama di waiting list berhasil dipromosikan.");
}

function enrollParticipantOperational(id, classId) {
  if (!classId) return;
  const target = edu.classes.find(x => x.id === classId);
  edu.classes.forEach(cls => {
    cls.participantIds = cls.participantIds.filter(pid => pid !== id);
    cls.waitingListIds = cls.waitingListIds.filter(pid => pid !== id);
  });
  if (target.participantIds.length >= Number(target.capacity)) {
    target.waitingListIds.push(id); showEducationToast("Kelas penuh. Peserta masuk waiting list.");
  } else {
    target.participantIds.push(id); showEducationToast("Enrollment peserta diperbarui.");
  }
  saveEducationData(edu); refresh();
}

function renderEnrollmentOperations() {
  normalizeOperations();
  const selectedClass = query.get("class") || "";
  const programId = query.get("program") || "";
  const allowedClasses = programId ? edu.classes.filter(x => x.programId === programId) : edu.classes;
  const cohorts = [...new Set(edu.participants.map(x => x.cohort).filter(Boolean))].sort();
  const waitingTotal = allowedClasses.reduce((n, x) => n + x.waitingListIds.length, 0);
  root.innerHTML = `<div class="hero"><div class="page-actions spread"><div><h1>Peserta Didik</h1><p>Enrollment manual, bulk, cohort, waiting list, pindah kelas, dan peserta keluar.</p></div><div class="page-actions"><button class="btn btn-light" onclick="openBulkEnrollment()">⇧ Bulk Import</button><button class="btn btn-light" onclick="openParticipantForm()">+ Tambah Peserta</button></div></div></div><div class="grid grid-3"><div class="card kpi"><div class="kpi-label">Peserta Aktif</div><div class="kpi-value">${edu.participants.filter(x => x.status === "Aktif").length}</div></div><div class="card kpi"><div class="kpi-label">Waiting List</div><div class="kpi-value">${waitingTotal}</div></div><div class="card kpi"><div class="kpi-label">Kapasitas Tersedia</div><div class="kpi-value">${allowedClasses.reduce((n, x) => n + Math.max(0, Number(x.capacity) - x.participantIds.length), 0)}</div></div></div><section class="card" style="margin-top:18px"><div class="toolbar"><input class="control" id="participantSearch" placeholder="Cari nama atau NRP"><select class="control" id="classFilter"><option value="">Semua kelas</option>${classOptions(selectedClass)}</select><select class="control" id="cohortFilter"><option value="">Semua angkatan</option>${cohorts.map(x => `<option>${escapeHtml(x)}</option>`).join("")}</select></div><div class="waiting-summary">${allowedClasses.map(cls => `<span><b>${escapeHtml(cls.name)}</b> ${cls.participantIds.length}/${cls.capacity} • waiting ${cls.waitingListIds.length} ${cls.waitingListIds.length ? `<button onclick="promoteWaiting('${cls.id}')">Promosikan</button>` : ""}</span>`).join("")}</div><div class="table-wrap"><table class="table"><thead><tr><th>Peserta</th><th>Angkatan</th><th>Kelas / antrean</th><th>Status</th><th>Enrollment</th><th></th></tr></thead><tbody id="participantRows"></tbody></table></div></section>`;
  const draw = () => {
    const text = document.querySelector("#participantSearch").value.toLowerCase();
    const cohort = document.querySelector("#cohortFilter").value;
    const rows = edu.participants.filter(x => {
      const active = allowedClasses.find(c => c.participantIds.includes(x.id));
      const waiting = allowedClasses.find(c => c.waitingListIds.includes(x.id));
      return (!programId || active || waiting) && (!selectedClass || active?.id === selectedClass || waiting?.id === selectedClass) && (!cohort || x.cohort === cohort) && `${x.name} ${x.nrp}`.toLowerCase().includes(text);
    });
    document.querySelector("#participantRows").innerHTML = rows.map(x => {
      const cls = allowedClasses.find(c => c.participantIds.includes(x.id));
      const wait = allowedClasses.find(c => c.waitingListIds.includes(x.id));
      const placement = wait ? `${escapeHtml(wait.name)} — Waiting #${wait.waitingListIds.indexOf(x.id) + 1}` : escapeHtml(cls?.name || "Belum ada");
      return `<tr><td><b>${escapeHtml(x.name)}</b><br><small class="muted">NRP ${escapeHtml(x.nrp)}</small></td><td>${escapeHtml(x.cohort)}</td><td>${placement}</td><td>${educationBadge(wait ? "Waiting List" : x.status)}</td><td><select class="control compact" ${x.status === "Keluar" ? "disabled" : ""} onchange="enrollParticipantOperational('${x.id}',this.value)"><option value="">Pilih / pindah kelas</option>${allowedClasses.map(c => `<option value="${c.id}" ${c.id === cls?.id || c.id === wait?.id ? "selected" : ""}>${escapeHtml(c.name)} (${c.participantIds.length}/${c.capacity})</option>`).join("")}</select></td><td>${x.status !== "Keluar" ? `<button class="text-action danger-text" onclick="exitParticipant('${x.id}')">Keluar</button>` : `<small class="muted">${escapeHtml(x.exitReason || "-")}</small>`}</td></tr>`;
    }).join("") || '<tr><td colspan="6" class="muted">Peserta tidak ditemukan.</td></tr>';
  };
  document.querySelector("#participantSearch").oninput = draw;
  document.querySelector("#cohortFilter").onchange = draw;
  document.querySelector("#classFilter").onchange = event => { location.href = event.target.value ? `participants.html?class=${event.target.value}` : "participants.html"; };
  draw();
}

function openInstructorOperationalForm() {
  const content = `<div class="form-grid">${formRow("Nama lengkap *", "name", '<input name="{name}" required>')}${formRow("NRP *", "nrp", '<input name="{name}" required>')}${formRow("Keahlian", "expertise", '<input name="{name}" required>')}${formRow("Beban awal (JP)", "workload", '<input name="{name}" type="number" min="0" value="0">')}${formRow("Beban maksimum (JP)", "maxWorkload", '<input name="{name}" type="number" min="1" value="18" required>')}</div>`;
  openEducationModal("Tambah Gadik", content, data => {
    const v = Object.fromEntries(data);
    edu.instructors.push({ id: educationId("g"), ...v, workload: Number(v.workload), maxWorkload: Number(v.maxWorkload), status: "Aktif" });
    saveEducationData(edu); refresh(); showEducationToast("Gadik berhasil ditambahkan.");
  });
}

function assignInstructorOperational(id) {
  const instructor = edu.instructors.find(x => x.id === id);
  const content = `<div class="form-row"><label>Pilih kelas</label><select name="classId">${classOptions()}</select></div><div class="form-row"><label>Estimasi tambahan JP</label><input name="additional" type="number" min="1" value="4" required></div><div class="alert">Beban saat ini ${instructor.workload} JP dari maksimum ${instructor.maxWorkload} JP.</div>`;
  openEducationModal("Tugaskan Gadik", content, data => {
    const cls = edu.classes.find(x => x.id === data.get("classId"));
    const additional = Number(data.get("additional"));
    if (cls.instructorIds.includes(id)) { alert("Gadik sudah ditugaskan pada kelas tersebut."); return false; }
    const projected = Number(instructor.workload) + additional;
    if (projected > Number(instructor.maxWorkload) && !confirm(`PERINGATAN BEBAN MAKSIMUM\nProyeksi ${projected} JP melewati batas ${instructor.maxWorkload} JP. Simpan sebagai override prototype?`)) return false;
    cls.instructorIds.push(id);
    instructor.workload = projected;
    instructor.lastAssignmentOverride = projected > Number(instructor.maxWorkload);
    saveEducationData(edu); refresh(); showEducationToast(projected > Number(instructor.maxWorkload) ? "Penugasan disimpan dengan penanda overload." : "Gadik ditugaskan ke kelas.");
  });
}

function renderInstructorOperations() {
  normalizeOperations();
  const overloaded = edu.instructors.filter(x => Number(x.workload) > Number(x.maxWorkload)).length;
  root.innerHTML = `<div class="hero"><div class="page-actions spread"><div><h1>Gadik dan Instruktur</h1><p>Penugasan kelas dengan pemantauan beban dan peringatan maksimum.</p></div><button class="btn btn-light" onclick="openInstructorOperationalForm()">+ Tambah Gadik</button></div></div>${overloaded ? `<div class="alert workload-alert"><b>${overloaded} Gadik melewati beban maksimum.</b> Tinjau penugasan sebelum jadwal disahkan.</div>` : ""}<div class="grid grid-3">${edu.instructors.map(x => {
    const assigned = edu.classes.filter(c => c.instructorIds.includes(x.id));
    const pct = Math.round(Number(x.workload) / Number(x.maxWorkload) * 100);
    const level = pct > 100 ? "over" : pct >= 85 ? "warning" : "safe";
    return `<article class="card person-card"><div class="avatar large">${x.name.split(" ").slice(-2).map(v => v[0]).join("").slice(0, 2)}</div><div><h3>${escapeHtml(x.name)}</h3><p>${escapeHtml(x.expertise)}</p><small>NRP ${escapeHtml(x.nrp)}</small></div><div class="person-metrics"><span><b>${x.workload}/${x.maxWorkload}</b> JP</span><span><b>${assigned.length}</b> kelas</span><span>${educationBadge(level === "over" ? "Overload" : level === "warning" ? "Mendekati Batas" : "Aman")}</span></div><div class="workload-meter ${level}"><span style="width:${Math.min(pct, 100)}%"></span></div><small class="assigned-classes">${assigned.length ? `Kelas: ${assigned.map(c => escapeHtml(c.name)).join(", ")}` : "Belum ada penugasan kelas"}</small><button class="btn btn-light" onclick="assignInstructorOperational('${x.id}')">Tugaskan ke Kelas</button></article>`;
  }).join("")}</div>`;
}

function renderEducationOperationsPage() {
  const enhanced = { programs: renderGovernedPrograms, "program-detail": renderGovernedProgramDetail, participants: renderEnrollmentOperations, instructors: renderInstructorOperations };
  (enhanced[educationPage] || ({ curriculum: renderCurriculum, classes: renderClasses, schedule: renderSchedule }[educationPage]))?.();
}

renderEducationPage = renderEducationOperationsPage;
renderEducationOperationsPage();
