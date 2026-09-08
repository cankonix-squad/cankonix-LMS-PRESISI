const governancePage = document.body.dataset.educationGovernance || document.body.dataset.educationPage;

function normalizeAcademicGovernance() {
  edu.curricula.forEach((item, index) => {
    item.prerequisiteId ??= edu.curricula.slice(0, index).filter(candidate => candidate.programId === item.programId).at(-1)?.id || "";
    item.syllabusVersion ??= "1.0";
    item.syllabusStatus ??= item.status === "Disetujui" ? "Berlaku" : "Draft";
    item.syllabusAttachment ??= `${item.code}-Silabus-v${item.syllabusVersion}.pdf`;
    item.hanjar ??= `${item.code}-Hanjar.pdf`;
    item.approvalNote ??= item.status === "Disetujui" ? "Disetujui Kabag Akademik" : "Menunggu pengajuan";
  });
  edu.schedules.forEach(item => {
    item.approvalStatus ??= "Disetujui";
    item.rescheduleNote ??= "-";
  });
  edu.academicCalendar ??= [
    { id: "cal-1", title: "Pembukaan Program SPPK 2027", type: "Program", start: "2027-01-15", end: "2027-01-15", audience: "Seluruh peserta", status: "Disetujui" },
    { id: "cal-2", title: "Masa Orientasi Peserta", type: "Akademik", start: "2027-01-16", end: "2027-01-20", audience: "SPPK 2027", status: "Disetujui" },
    { id: "cal-3", title: "Ujian Tengah Program", type: "Ujian", start: "2027-03-15", end: "2027-03-19", audience: "SPPK 2027", status: "Review" },
    { id: "cal-4", title: "Libur Hari Raya", type: "Libur", start: "2027-04-05", end: "2027-04-09", audience: "Seluruh Satdik", status: "Draft" }
  ];
  saveEducationData(edu);
}

function curriculumPrerequisiteOptions(item) {
  return `<option value="">Tanpa prerequisite</option>${edu.curricula.filter(x => x.id !== item.id && x.programId === item.programId).map(x => `<option value="${x.id}" ${x.id === item.prerequisiteId ? "selected" : ""}>${escapeHtml(x.code)} — ${escapeHtml(x.name)}</option>`).join("")}`;
}
function editCurriculumGovernance(id) {
  const item = edu.curricula.find(x => x.id === id); if (!item) return;
  openEducationModal("Silabus, Hanjar & Prerequisite", `<div class="form-grid">${formRow("Prerequisite", "prerequisiteId", `<select name="{name}">${curriculumPrerequisiteOptions(item)}</select>`)}${formRow("Versi silabus", "syllabusVersion", `<input name="{name}" value="${escapeHtml(item.syllabusVersion)}" required>`)}${formRow("File silabus", "syllabusAttachment", `<input name="{name}" value="${escapeHtml(item.syllabusAttachment)}" required>`)}${formRow("File Hanjar", "hanjar", `<input name="{name}" value="${escapeHtml(item.hanjar)}" required>`)}${formRow("Catatan perubahan", "approvalNote", `<textarea name="{name}" rows="3">${escapeHtml(item.approvalNote)}</textarea>`, true)}</div>`, data => {
    Object.assign(item, Object.fromEntries(data)); item.syllabusStatus = "Draft"; item.status = "Draft"; saveEducationData(edu); renderGovernedCurriculum(); showEducationToast("Silabus dan Hanjar diperbarui sebagai Draft.");
  });
}
function setCurriculumApproval(id, status) {
  const item = edu.curricula.find(x => x.id === id); if (!item) return;
  if (status === "Review") { item.status = "Review"; item.syllabusStatus = "Review"; item.approvalNote = "Diajukan untuk persetujuan Kabag Akademik"; }
  if (status === "Disetujui") { item.status = "Disetujui"; item.syllabusStatus = "Berlaku"; item.approvalNote = `Disetujui ${new Intl.DateTimeFormat("id-ID").format(new Date())}`; }
  saveEducationData(edu); renderGovernedCurriculum(); showEducationToast(status === "Review" ? "Kurikulum diajukan untuk review." : "Kurikulum, silabus, dan Hanjar disetujui.");
}
function renderGovernedCurriculum() {
  const selected = query.get("program") || edu.programs[0]?.id;
  const rows = edu.curricula.filter(x => !selected || x.programId === selected);
  root.innerHTML = `<div class="hero"><div class="page-actions spread"><div><h1>Kurikulum, Silabus & Hanjar</h1><p>Struktur mata pelajaran, JP, outcome, prerequisite, version, attachment, dan approval.</p></div><button class="btn btn-light" onclick="openCurriculumForm('${selected}')">+ Mata Pelajaran</button></div></div><div class="toolbar"><select class="control" onchange="location.href='curriculum.html?program='+this.value">${programOptions(selected)}</select><a class="btn btn-secondary" href="academic-calendar.html">Kalender Akademik</a></div><div class="grid grid-4"><div class="card kpi"><div class="kpi-label">Mata Pelajaran</div><div class="kpi-value">${rows.length}</div></div><div class="card kpi"><div class="kpi-label">Total JP</div><div class="kpi-value">${rows.reduce((n,x)=>n+x.hours,0)}</div></div><div class="card kpi"><div class="kpi-label">Berlaku</div><div class="kpi-value">${rows.filter(x=>x.syllabusStatus==='Berlaku').length}</div></div><div class="card kpi"><div class="kpi-label">Prerequisite</div><div class="kpi-value">${rows.filter(x=>x.prerequisiteId).length}</div></div></div><section class="card"><div class="curriculum-list">${rows.map((x,i)=>`<article class="curriculum-item academic-item"><span class="curriculum-order">${i+1}</span><div><b>${escapeHtml(x.code)} — ${escapeHtml(x.name)}</b><p>${escapeHtml(x.outcome)}</p><div class="academic-meta"><span>Prerequisite: <b>${escapeHtml(educationName(edu.curricula,x.prerequisiteId,'Tidak ada'))}</b></span><span>Silabus v${escapeHtml(x.syllabusVersion)} • ${escapeHtml(x.syllabusAttachment)}</span><span>Hanjar: ${escapeHtml(x.hanjar)}</span></div></div><div class="curriculum-meta"><b>${x.hours} JP</b>${educationBadge(x.status)}<span class="badge ${x.syllabusStatus==='Berlaku'?'green':x.syllabusStatus==='Review'?'orange':'blue'}">${x.syllabusStatus}</span><button onclick="editCurriculumGovernance('${x.id}')">Ubah</button>${x.status==='Draft'?`<button onclick="setCurriculumApproval('${x.id}','Review')">Ajukan</button>`:''}${x.status==='Review'?`<button onclick="setCurriculumApproval('${x.id}','Disetujui')">Setujui</button>`:''}</div></article>`).join('')||'<div class="empty-state">Belum ada mata pelajaran.</div>'}</div></section>`;
}

function scheduleConflict(values, excludedId = "") {
  return edu.schedules.some(x => x.id !== excludedId && x.date === values.date && x.start < values.end && values.start < x.end && (x.room === values.room || x.instructorId === values.instructorId));
}
function rescheduleEducation(id) {
  const item=edu.schedules.find(x=>x.id===id);if(!item)return;
  openEducationModal("Reschedule Pembelajaran", `<div class="form-grid">${formRow("Tanggal","date",`<input name="{name}" type="date" value="${item.date}" required>`)}${formRow("Mulai","start",`<input name="{name}" type="time" value="${item.start}" required>`)}${formRow("Selesai","end",`<input name="{name}" type="time" value="${item.end}" required>`)}${formRow("Ruang","room",`<input name="{name}" value="${escapeHtml(item.room)}" required>`)}${formRow("Alasan reschedule","rescheduleNote",'<textarea name="{name}" rows="3" required></textarea>',true)}</div>`,data=>{const values=Object.fromEntries(data);values.instructorId=item.instructorId;if(scheduleConflict(values,id)){alert('Jadwal bentrok: ruang atau Gadik sudah digunakan.');return false}Object.assign(item,values);item.approvalStatus='Review';saveEducationData(edu);renderGovernedSchedule();showEducationToast('Reschedule diajukan untuk persetujuan.')});
}
function approveSchedule(id) { const item=edu.schedules.find(x=>x.id===id);if(!item)return;item.approvalStatus='Disetujui';saveEducationData(edu);renderGovernedSchedule();showEducationToast('Perubahan jadwal disetujui.'); }
function scheduleCards(rows) { return rows.map(x=>`<article class="card schedule-item"><div class="schedule-date"><b>${new Date(x.date+'T00:00:00').getDate()}</b><span>${new Intl.DateTimeFormat('id-ID',{month:'short'}).format(new Date(x.date+'T00:00:00'))}</span></div><div><b>${escapeHtml(educationName(edu.curricula,x.curriculumId))}</b><p>${escapeHtml(educationName(edu.classes,x.classId))} • ${escapeHtml(x.room)}</p><small>${x.rescheduleNote!=='-'?`Reschedule: ${escapeHtml(x.rescheduleNote)}`:'Jadwal awal'}</small></div><div><b>${x.start} – ${x.end}</b><p>${escapeHtml(educationName(edu.instructors,x.instructorId))}</p></div><div class="schedule-actions">${educationBadge(x.mode)}<span class="badge ${x.approvalStatus==='Disetujui'?'green':'orange'}">${x.approvalStatus}</span><button class="text-action" onclick="rescheduleEducation('${x.id}')">Reschedule</button>${x.approvalStatus==='Review'?`<button class="text-action" onclick="approveSchedule('${x.id}')">Setujui</button>`:''}</div></article>`).join('') || '<div class="card empty-state">Belum ada jadwal.</div>'; }
function renderGovernedSchedule() {
  const classId=query.get('class')||'',programId=query.get('program')||'',classIds=programId?edu.classes.filter(x=>x.programId===programId).map(x=>x.id):[],rows=edu.schedules.filter(x=>(!classId||x.classId===classId)&&(!programId||classIds.includes(x.classId))).sort((a,b)=>`${a.date}${a.start}`.localeCompare(`${b.date}${b.start}`));
  root.innerHTML=`<div class="hero"><div class="page-actions spread"><div><h1>Jadwal Pembelajaran</h1><p>Calendar/list view, deteksi bentrok, reschedule, dan approval perubahan jadwal.</p></div><button class="btn btn-light" onclick="openScheduleForm('${classId}')">+ Tambah Jadwal</button></div></div><div class="page-actions schedule-view-switch"><button class="btn btn-secondary active" id="listView">List</button><button class="btn btn-light" id="calendarView">Kalender</button><a class="btn btn-light" href="academic-calendar.html">Kalender Akademik</a></div><div id="scheduleView">${scheduleCards(rows)}</div>`;
  document.querySelector('#listView').onclick=()=>{document.querySelector('#scheduleView').className='';document.querySelector('#scheduleView').innerHTML=scheduleCards(rows);document.querySelector('#listView').className='btn btn-secondary active';document.querySelector('#calendarView').className='btn btn-light'};
  document.querySelector('#calendarView').onclick=()=>{const dates=[...new Set(rows.map(x=>x.date))];document.querySelector('#scheduleView').className='schedule-calendar';document.querySelector('#scheduleView').innerHTML=dates.map(date=>`<section class="calendar-day"><header><b>${new Intl.DateTimeFormat('id-ID',{weekday:'short'}).format(new Date(date+'T00:00:00'))}</b><span>${formatDateId(date)}</span></header>${rows.filter(x=>x.date===date).map(x=>`<button onclick="rescheduleEducation('${x.id}')"><b>${x.start}</b><span>${escapeHtml(educationName(edu.curricula,x.curriculumId))}</span><small>${escapeHtml(educationName(edu.classes,x.classId))}</small></button>`).join('')}</section>`).join('')||'<div class="empty-state">Belum ada jadwal kalender.</div>';document.querySelector('#calendarView').className='btn btn-secondary active';document.querySelector('#listView').className='btn btn-light'};
}

function addAcademicEvent() {
  openEducationModal("Tambah Agenda Akademik", `<div class="form-grid">${formRow("Nama agenda","title",'<input name="{name}" required>')}${formRow("Jenis","type",'<select name="{name}"><option>Program</option><option>Akademik</option><option>Ujian</option><option>Libur</option></select>')}${formRow("Mulai","start",'<input name="{name}" type="date" required>')}${formRow("Selesai","end",'<input name="{name}" type="date" required>')}${formRow("Audiens","audience",'<input name="{name}" required>',true)}</div>`,data=>{const values=Object.fromEntries(data);if(values.end<values.start){alert('Tanggal selesai harus setelah tanggal mulai.');return false}edu.academicCalendar.push({id:educationId('cal'),...values,status:'Draft'});saveEducationData(edu);renderAcademicCalendar();showEducationToast('Agenda akademik dibuat sebagai Draft.')});
}
function approveAcademicEvent(id) { const item=edu.academicCalendar.find(x=>x.id===id);item.status=item.status==='Draft'?'Review':'Disetujui';saveEducationData(edu);renderAcademicCalendar();showEducationToast(item.status==='Review'?'Agenda diajukan untuk review.':'Agenda akademik disetujui.'); }
function renderAcademicCalendar() {
  renderSidebar('Kalender Akademik');renderHeader('Kalender Akademik','Education Management / Agenda');
  const events=[...edu.academicCalendar].sort((a,b)=>a.start.localeCompare(b.start));
  root.innerHTML=`<div class="hero"><div class="page-actions spread"><div><h1>Kalender Akademik</h1><p>Agenda program, pembelajaran, ujian, libur, audiens, dan status persetujuan.</p></div><button class="btn btn-light" onclick="addAcademicEvent()">+ Tambah Agenda</button></div></div><div class="grid grid-4"><div class="card kpi"><div class="kpi-label">Total Agenda</div><div class="kpi-value">${events.length}</div></div><div class="card kpi"><div class="kpi-label">Program</div><div class="kpi-value">${events.filter(x=>x.type==='Program').length}</div></div><div class="card kpi"><div class="kpi-label">Ujian</div><div class="kpi-value">${events.filter(x=>x.type==='Ujian').length}</div></div><div class="card kpi"><div class="kpi-label">Menunggu Approval</div><div class="kpi-value">${events.filter(x=>x.status!=='Disetujui').length}</div></div></div><section class="card"><div class="academic-timeline">${events.map(x=>`<article><time>${formatDateId(x.start)}${x.end!==x.start?` – ${formatDateId(x.end)}`:''}</time><div><span class="badge blue">${escapeHtml(x.type)}</span><h3>${escapeHtml(x.title)}</h3><p>${escapeHtml(x.audience)}</p></div><div>${educationBadge(x.status)}${x.status!=='Disetujui'?`<button class="text-action" onclick="approveAcademicEvent('${x.id}')">${x.status==='Draft'?'Ajukan':'Setujui'}</button>`:''}</div></article>`).join('')}</div></section>`;
}

normalizeAcademicGovernance();
if (governancePage === 'curriculum') renderGovernedCurriculum();
if (governancePage === 'schedule') renderGovernedSchedule();
if (governancePage === 'academic-calendar') renderAcademicCalendar();
