renderSidebar("Buat LMS Satdik");
renderHeader("Buat LMS Satdik", "Admin Pusat / Registry Satdik");
const provisioningManager = getRole() === "adminpusat";
function requireProvisioningManager() { if (provisioningManager) return true; alert("Akses provisioning hanya tersedia untuk Admin Pusat."); return false; }

const moduleOptions = ["Organisasi", "Personel", "Kurikulum", "Learning", "Assessment", "Absensi", "CCTV", "Aset", "Library", "Collaboration", "Pengasuhan", "8 Standar & QA", "Reporting", "Integration Hub"];
const stepLabels = ["Profil & Branding", "Template & Modul", "Struktur Organisasi", "Pimpinan & Admin", "Data & Mapping", "Review & Aktivasi"];
const state = {
  step: 1, name: "", code: "", type: "Sekolah Polisi Negara", region: "", address: "", parent: "Mandiri",
  color: "#12335c", domain: "", locale: "id-ID", academicYear: "2027", template: "Full LMS",
  modules: ["Organisasi", "Personel", "Kurikulum", "Learning", "Assessment", "Absensi", "Aset", "Library", "Collaboration"],
  subunits: "", leader: "", leaderId: "", admin: "", adminId: "", source: "Input langsung", sync: "Manual",
  mappings: [{ source: "nrp", target: "personnel_id" }, { source: "nama", target: "full_name" }, { source: "unit", target: "unit_code" }]
};

function field(id) { return document.querySelector(`#${id}`)?.value.trim() || ""; }
function selectedValue(id, fallback = "") { return document.querySelector(`#${id}`)?.value || fallback; }
function alertRequired(message) { const box = document.querySelector("#wizardAlert"); if (box) { box.textContent = message; box.hidden = false; } }
function captureStep() {
  if (state.step === 1) {
    Object.assign(state, { name: field("satdikName"), code: field("satdikCode").toUpperCase(), type: selectedValue("satdikType"), region: field("satdikRegion"), address: field("satdikAddress"), parent: selectedValue("satdikParent"), color: selectedValue("brandColor"), domain: field("satdikDomain"), locale: selectedValue("satdikLocale"), academicYear: field("academicYear") });
    if (!state.name || !state.code || !state.region) { alertRequired("Nama, kode, dan wilayah wajib diisi."); return false; }
    const duplicate = getStoredWorkspaces().some(item => item.code === state.code);
    if (duplicate) { alertRequired("Kode satdik sudah digunakan. Gunakan kode unik lain."); return false; }
  }
  if (state.step === 2) {
    state.template = selectedValue("workspaceTemplate");
    state.modules = [...document.querySelectorAll("[name=module]:checked")].map(item => item.value);
    if (!state.modules.length) { alertRequired("Pilih minimal satu modul."); return false; }
  }
  if (state.step === 3) state.subunits = field("subunits");
  if (state.step === 4) {
    Object.assign(state, { leader: field("leaderName"), leaderId: field("leaderId"), admin: field("adminName"), adminId: field("adminId") });
    if (!state.leader || !state.admin) { alertRequired("Pimpinan dan Admin Satdik wajib ditentukan."); return false; }
  }
  if (state.step === 5) {
    state.source = selectedValue("dataSource"); state.sync = selectedValue("syncFrequency");
    state.mappings = [...document.querySelectorAll(".mapping-row")].map(row => ({ source: row.querySelector(".source-field").value, target: row.querySelector(".target-field").value })).filter(item => item.source && item.target);
  }
  return true;
}
function nextStep() { if (!requireProvisioningManager() || !captureStep()) return; state.step = Math.min(6, state.step + 1); render(); }
function previousStep() { state.step = Math.max(1, state.step - 1); render(); }
function renderSteps() { document.querySelector("#steps").innerHTML = stepLabels.map((label, index) => `<div class="wizard-step ${state.step === index + 1 ? "active" : ""} ${state.step > index + 1 ? "done" : ""}"><span>${state.step > index + 1 ? "✓" : index + 1}</span>${label}</div>`).join(""); }
function footer(nextLabel = "Lanjut") { return `<div class="wizard-footer"><button class="btn btn-light" ${state.step === 1 ? "disabled" : ""} onclick="previousStep()">Kembali</button><div class="page-actions"><button class="btn btn-light" onclick="saveDraft()">Simpan Draft</button><button class="btn btn-primary" onclick="nextStep()">${nextLabel}</button></div></div>`; }
function selectOptions(items, value) { return items.map(item => `<option ${item === value ? "selected" : ""}>${item}</option>`).join(""); }
function moduleMarkup() { return moduleOptions.map(name => `<label class="module-option"><input type="checkbox" name="module" value="${name}" ${state.modules.includes(name) ? "checked" : ""}><span><b>${name}</b><small>${["Learning", "Assessment", "Kurikulum"].includes(name) ? "Operasi pendidikan inti" : "Capability workspace"}</small></span></label>`).join(""); }
function mappingMarkup() { return state.mappings.map((item, index) => `<div class="mapping-row"><input class="control source-field" value="${escapeHtml(item.source)}" aria-label="Field sumber"><span>→</span><select class="control target-field" aria-label="Field LMS"><option ${item.target === "personnel_id" ? "selected" : ""}>personnel_id</option><option ${item.target === "full_name" ? "selected" : ""}>full_name</option><option ${item.target === "unit_code" ? "selected" : ""}>unit_code</option><option ${item.target === "email" ? "selected" : ""}>email</option><option ${item.target === "role" ? "selected" : ""}>role</option></select><button class="btn btn-light" onclick="removeMapping(${index})" aria-label="Hapus mapping">×</button></div>`).join(""); }
function addMapping() { if (!requireProvisioningManager()) return; captureStep(); state.mappings.push({ source: "", target: "email" }); render(); }
function removeMapping(index) { if (!requireProvisioningManager()) return; captureStep(); state.mappings.splice(index, 1); render(); }
function workspaceRecord(status) {
  return { id: `${state.code.toLowerCase()}-${Date.now()}`, code: state.code || `DRAFT-${Date.now().toString().slice(-4)}`, name: state.name || "Draft LMS Satdik", type: state.type, region: state.region || "Belum ditentukan", address: state.address, parent: state.parent, status, modules: state.modules.length, moduleList: state.modules, branding: { color: state.color, domain: state.domain }, locale: state.locale, academicYear: state.academicYear, subunits: state.subunits.split("\n").map(item => item.trim()).filter(Boolean), leader: { name: state.leader, id: state.leaderId }, admin: { name: state.admin, id: state.adminId }, source: state.source, sync: state.sync, mappings: state.mappings, onboarding: [false, false, false, false, false], createdAt: new Date().toISOString() };
}
function persist(status) { if (!requireProvisioningManager()) return null; const custom = JSON.parse(localStorage.getItem("presisiCustomWorkspaces") || "[]"), record = workspaceRecord(status); if (getStoredWorkspaces().some(item => item.code === record.code)) { alert("Kode satdik sudah digunakan. Gunakan kode unik lain."); return null; } custom.push(record); saveCustomWorkspaces(custom); return record; }
function saveDraft() {
  if (!requireProvisioningManager()) return;
  if (state.step === 1) Object.assign(state, { name: field("satdikName"), code: field("satdikCode").toUpperCase(), type: selectedValue("satdikType", state.type), region: field("satdikRegion"), address: field("satdikAddress"), parent: selectedValue("satdikParent", state.parent), color: selectedValue("brandColor", state.color), domain: field("satdikDomain"), locale: selectedValue("satdikLocale", state.locale), academicYear: field("academicYear") || state.academicYear });
  else captureStep();
  const record = persist("Draft");
  if (!record) return;
  alert(`Draft ${record.name} tersimpan.`);
  location.href = "institutions.html";
}
function activate() { if (!requireProvisioningManager()) return; const record = persist("Aktif"); if (!record) return; setWorkspace(record.id); state.step = 7; render(); }

function render() {
  renderSteps(); const panel = document.querySelector("#wizardPanel");
  if (state.step === 1) panel.innerHTML = `<h2>Profil dan Branding Satdik</h2><p class="muted">Tentukan identitas workspace yang akan tampil pada launcher dan laporan nasional.</p><div class="form-grid"><div class="form-row"><label>Nama satdik *</label><input id="satdikName" value="${escapeHtml(state.name)}" placeholder="Contoh: SPN Polda Bali"></div><div class="form-row"><label>Kode unik *</label><input id="satdikCode" value="${escapeHtml(state.code)}" placeholder="Contoh: SPN-BLI"></div><div class="form-row"><label>Jenis satdik</label><select id="satdikType">${selectOptions(["Sekolah Polisi Negara"], state.type)}</select></div><div class="form-row"><label>Wilayah *</label><input id="satdikRegion" value="${escapeHtml(state.region)}" placeholder="Provinsi / wilayah"></div><div class="form-row full"><label>Alamat</label><input id="satdikAddress" value="${escapeHtml(state.address)}" placeholder="Alamat satdik"></div><div class="form-row"><label>Induk organisasi</label><select id="satdikParent">${selectOptions(["Mandiri", "SPN"], state.parent)}</select></div><div class="form-row"><label>Warna identitas</label><input id="brandColor" type="color" value="${state.color}"></div><div class="form-row"><label>Domain/subdomain</label><input id="satdikDomain" value="${escapeHtml(state.domain)}" placeholder="spn-bali.presisi.polri.go.id"></div><div class="form-row"><label>Bahasa</label><select id="satdikLocale">${selectOptions(["id-ID", "id-ID / en-US"], state.locale)}</select></div><div class="form-row"><label>Tahun akademik awal</label><input id="academicYear" value="${escapeHtml(state.academicYear)}"></div></div><div class="form-alert" id="wizardAlert" hidden></div>${footer()}`;
  else if (state.step === 2) panel.innerHTML = `<h2>Template dan Modul</h2><p class="muted">Template mempercepat konfigurasi; modul tetap dapat disesuaikan per satdik.</p><div class="form-row"><label>Template workspace</label><select id="workspaceTemplate">${selectOptions(["Full LMS", "Integrated Dashboard", "LSP", "Custom"], state.template)}</select></div><div class="module-grid">${moduleMarkup()}</div><div class="form-alert" id="wizardAlert" hidden></div>${footer()}`;
  else if (state.step === 3) panel.innerHTML = `<h2>Struktur Organisasi Awal</h2><p class="muted">Workspace SPN dapat memiliki subunit operasional sesuai struktur organisasi aktif.</p><div class="org-preview"><div class="org-root"><b>${escapeHtml(state.name || "Nama Satdik")}</b><small>${escapeHtml(state.code || "KODE")}</small></div><div class="org-line"></div><div class="form-row"><label>Daftar subunit (satu per baris)</label><textarea id="subunits" rows="7" placeholder="Contoh:\nBagian Akademik\nBagian Pengasuhan\nBagian Sarpras">${escapeHtml(state.subunits)}</textarea></div></div><div class="alert">Struktur rinci, jabatan, dan pejabat dapat dilengkapi oleh Admin Satdik setelah aktivasi.</div>${footer()}`;
  else if (state.step === 4) panel.innerHTML = `<h2>Pimpinan dan Administrator</h2><p class="muted">Akun awal menerima workspace access dan checklist onboarding.</p><div class="form-grid"><div class="form-row"><label>Nama Pimpinan Satdik *</label><input id="leaderName" value="${escapeHtml(state.leader)}" placeholder="Nama lengkap"></div><div class="form-row"><label>NRP / NIP Pimpinan</label><input id="leaderId" value="${escapeHtml(state.leaderId)}"></div><div class="form-row"><label>Nama Admin Satdik *</label><input id="adminName" value="${escapeHtml(state.admin)}" placeholder="Nama lengkap"></div><div class="form-row"><label>NRP / Email Admin</label><input id="adminId" value="${escapeHtml(state.adminId)}"></div></div><div class="permission-summary"><b>Akses awal otomatis</b><span>Pimpinan: dashboard, monitoring, dan laporan unit</span><span>Admin: konfigurasi, master unit, pendidikan, user, dan laporan</span></div><div class="form-alert" id="wizardAlert" hidden></div>${footer()}`;
  else if (state.step === 5) panel.innerHTML = `<h2>Sumber Data dan Mapping</h2><p class="muted">Pilih jalur onboarding data dan petakan field sumber ke model data LMS PRESISI.</p><div class="form-grid"><div class="form-row"><label>Sumber data awal</label><select id="dataSource">${selectOptions(["Input langsung", "Import Excel / CSV", "REST API", "Database read-only", "SSO / OIDC"], state.source)}</select></div><div class="form-row"><label>Frekuensi sinkronisasi</label><select id="syncFrequency">${selectOptions(["Manual", "Setiap 15 menit", "Setiap jam", "Harian"], state.sync)}</select></div></div><div class="mapping-head"><b>Mapping data personel</b><button class="btn btn-light" onclick="addMapping()">+ Tambah Field</button></div><div id="mappingRows">${mappingMarkup()}</div><div class="data-quality"><span><b>3</b> field terpetakan</span><span><b>0</b> duplikasi</span><span><b>100%</b> validasi contoh</span></div>${footer("Review")}`;
  else if (state.step === 6) panel.innerHTML = `<h2>Review dan Aktivasi</h2><p class="muted">Periksa konfigurasi. Simpan Draft bila masih memerlukan persetujuan.</p><div class="review-list"><div class="review-item"><small>Satdik</small><b>${escapeHtml(state.name)}</b></div><div class="review-item"><small>Kode / Wilayah</small><b>${escapeHtml(state.code)} • ${escapeHtml(state.region)}</b></div><div class="review-item"><small>Jenis / Induk</small><b>${escapeHtml(state.type)} • ${escapeHtml(state.parent)}</b></div><div class="review-item"><small>Branding / Domain</small><b><i class="brand-swatch" style="background:${state.color}"></i>${escapeHtml(state.domain || "Domain belum ditentukan")}</b></div><div class="review-item"><small>Template / Modul</small><b>${escapeHtml(state.template)} • ${state.modules.length} modul</b></div><div class="review-item"><small>Subunit</small><b>${state.subunits.split("\n").filter(Boolean).length} subunit</b></div><div class="review-item"><small>Pimpinan</small><b>${escapeHtml(state.leader)}</b></div><div class="review-item"><small>Admin Satdik</small><b>${escapeHtml(state.admin)}</b></div><div class="review-item"><small>Sumber Data</small><b>${escapeHtml(state.source)} • ${escapeHtml(state.sync)}</b></div><div class="review-item"><small>Mapping</small><b>${state.mappings.length} field</b></div></div><div class="wizard-footer"><button class="btn btn-light" onclick="previousStep()">Kembali</button><div class="page-actions"><button class="btn btn-light" onclick="saveDraft()">Simpan Draft</button><button class="btn btn-primary" onclick="activate()">Aktifkan LMS Satdik</button></div></div>`;
  else panel.innerHTML = `<div class="success-panel"><div class="success-icon">✓</div><h2>LMS Satdik berhasil diaktifkan</h2><p class="muted"><b>${escapeHtml(state.name)}</b> telah tersedia di Dynamic Launcher dengan ${state.modules.length} modul aktif.</p><div class="onboarding-preview"><b>Checklist onboarding berikutnya</b><span>1. Lengkapi struktur dan jabatan</span><span>2. Validasi akun dan hak akses</span><span>3. Import data personel dan peserta</span><span>4. Buat program pendidikan pertama</span><span>5. Verifikasi dashboard dan laporan</span></div><div class="page-actions" style="justify-content:center;margin-top:22px"><a class="btn btn-light" href="institutions.html">Registry Satdik</a><a class="btn btn-primary" href="../launcher.html">Buka di Launcher</a></div></div>`;
}
document.querySelector("#saveDraftTop").addEventListener("click", saveDraft);
render();
if (!provisioningManager) {
  document.querySelector("#wizardPanel")?.insertAdjacentHTML("afterbegin", '<div class="alert">Mode baca-saja. Provisioning hanya tersedia untuk Admin Pusat.</div>');
  document.querySelectorAll("#wizardPanel button,#saveDraftTop").forEach(button => { button.disabled = true; });
}
