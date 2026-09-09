const APP_NAME = "LMS PRESISI LEMDIKLAT POLRI";

const roleLabels = {
  pimpinan: "Pimpinan Lemdiklat",
  adminpusat: "Admin Pusat",
  pimpinansatdik: "Pimpinan Satdik",
  adminunit: "Admin Satdik",
  akademik: "Pengelola Akademik",
  gadik: "Gadik / Instruktur",
  pengasuh: "Pengasuh",
  peserta: "Peserta Didik",
  asesor: "Asesor LSP",
  auditor: "Auditor Mutu",
  adminti: "Admin TI"
};

const roleMenus = {
  pimpinan: [
    ["Dashboard Nasional", "index.html"], ["Lembaga Pendidikan", "pages/institutions.html"],
    ["Program Nasional", "pages/programs.html"], ["Command Center", "pages/command-center.html"],
    ["LSP & Kompetensi", "pages/lsp-dashboard.html"], ["Master Library", "pages/master-library.html"], ["Collaboration", "pages/collaboration.html"],
    ["Logistic & Asset", "pages/assets.html"], ["Reporting", "pages/reports.html"]
  ],
  adminpusat: [
    ["Dashboard Admin Pusat", "pages/admin-central.html"], ["Registry Satdik", "pages/institutions.html"],
    ["Buat LMS Satdik", "pages/lms-unit-create.html"], ["Master Data", "pages/master-data.html"],
    ["User & Hak Akses", "pages/access-control.html"], ["Struktur Organisasi", "pages/organization.html"], ["Personel", "pages/personnel.html"], ["Master Library", "pages/master-library.html"], ["Collaboration", "pages/collaboration.html"], ["Integration Hub", "pages/integration-dashboard.html"],
    ["Audit Log", "pages/audit-log.html"], ["Reporting", "pages/reports.html"]
  ],
  pimpinansatdik: [
    ["Dashboard Satdik", "pages/institution-detail.html"], ["Program Pendidikan", "pages/programs.html"],
    ["Monitoring Learning", "pages/learning-dashboard.html"], ["Kehadiran", "pages/attendance.html"],
    ["Struktur Organisasi", "pages/organization.html"], ["Personel", "pages/personnel.html"], ["Gadik", "pages/instructors.html"], ["Pengasuhan", "pages/care-dashboard.html"], ["CCTV", "pages/cctv.html"], ["Announcement", "pages/announcements.html"], ["Aset", "pages/assets.html"],
    ["Mutu Pendidikan", "pages/quality-dashboard.html"], ["Laporan Unit", "pages/reports.html"]
  ],
  adminunit: [
    ["Dashboard Satdik", "pages/institution-detail.html"], ["Program Pendidikan", "pages/programs.html"],
    ["Kurikulum", "pages/curriculum.html"], ["Kalender Akademik", "pages/academic-calendar.html"], ["Kelas", "pages/classes.html"], ["Jadwal", "pages/schedule.html"],
    ["Struktur Organisasi", "pages/organization.html"], ["Personel", "pages/personnel.html"], ["Gadik", "pages/instructors.html"], ["Peserta Didik", "pages/participants.html"],
    ["Learning", "pages/learning-dashboard.html"], ["Monitoring Progress", "pages/progress.html"], ["Master Library", "pages/master-library.html"], ["Collaboration", "pages/collaboration.html"], ["Pengasuhan", "pages/care-dashboard.html"], ["CCTV", "pages/cctv.html"], ["Mutu Pendidikan", "pages/quality-dashboard.html"], ["Announcement", "pages/announcements.html"], ["Assessment", "pages/assessment.html"], ["Logistic & Asset", "pages/assets.html"]
  ],
  akademik: [
    ["Dashboard Akademik", "pages/institution-detail.html"], ["Program Pendidikan", "pages/programs.html"],
    ["Kurikulum", "pages/curriculum.html"], ["Kalender Akademik", "pages/academic-calendar.html"], ["Kelas", "pages/classes.html"], ["Jadwal", "pages/schedule.html"],
    ["Gadik", "pages/instructors.html"], ["Peserta", "pages/participants.html"],
    ["Assessment", "pages/assessment.html"], ["Monitoring Progress", "pages/progress.html"], ["Announcement", "pages/announcements.html"], ["Kehadiran", "pages/attendance.html"]
  ],
  gadik: [
    ["Dashboard Gadik", "pages/instructor-dashboard.html"], ["My Teaching", "pages/my-teaching.html"],
    ["Courses", "pages/courses.html"], ["Materi", "pages/materials.html"], ["Assignment", "pages/assignments.html"],
    ["Quiz / Ujian", "pages/quizzes.html"], ["Attendance", "pages/attendance.html"], ["Announcement", "pages/announcements.html"], ["Discussion", "pages/discussion.html"],
    ["Assessment & Nilai", "pages/assessment.html"], ["Monitoring Progress", "pages/progress.html"], ["Master Library", "pages/master-library.html"], ["Collaboration", "pages/collaboration.html"], ["Peserta", "pages/participants.html"]
  ],
  pengasuh: [
    ["Dashboard Pengasuhan", "pages/care-dashboard.html"], ["Peserta Binaan", "pages/care-dashboard.html#participants"],
    ["Kehadiran", "pages/attendance.html"], ["Catatan Pengasuhan", "pages/care-dashboard.html#notes"],
    ["Disiplin & Tindak Lanjut", "pages/care-dashboard.html#followup"]
  ],
  peserta: [
    ["Dashboard Peserta", "pages/learning-dashboard.html"], ["My Courses", "pages/courses.html"],
    ["Materi Pembelajaran", "pages/materials.html"], ["Assignment", "pages/assignments.html"], ["Quiz / Ujian", "pages/quizzes.html"],
    ["Attendance", "pages/attendance.html"], ["Discussion Forum", "pages/discussion.html"], ["Virtual Class", "pages/virtual-class.html"],
    ["Announcement", "pages/announcements.html"], ["Collaboration", "pages/collaboration.html"], ["Master Library", "pages/master-library.html"], ["Learning Progress", "pages/progress.html"], ["Digital Passport", "pages/digital-passport.html"]
  ],
  asesor: [
    ["Dashboard LSP", "pages/lsp-dashboard.html"], ["Skema Sertifikasi", "pages/lsp-schemes.html"],
    ["Unit Kompetensi", "pages/lsp-schemes.html#units"], ["Asesi & Asesor", "pages/lsp-assessments.html"],
    ["Jadwal Asesmen", "pages/lsp-assessments.html#schedule"], ["Assessment", "pages/lsp-assessments.html#assessment"],
    ["Sertifikasi", "pages/certification.html"], ["Digital Passport", "pages/digital-passport.html"]
  ],
  auditor: [
    ["Dashboard Mutu", "pages/quality-dashboard.html"], ["8 Standar Pendidikan", "pages/quality-standards.html"],
    ["Evidence", "pages/quality-standards.html#evidence"], ["Audit & Temuan", "pages/quality-audit.html"],
    ["Akreditasi", "pages/accreditation.html"]
  ],
  adminti: [
    ["Dashboard Operasional", "pages/operations-dashboard.html"], ["Integration Hub", "pages/integration-dashboard.html"],
    ["Source System", "pages/connector-catalog.html"], ["Data Mapping", "pages/data-mapping.html"], ["Data Quality", "pages/data-quality.html"],
    ["CCTV Monitoring", "pages/cctv.html"], ["Audit Log", "pages/audit-log.html"], ["System Health", "pages/system-health.html"]
  ]
};

const defaultWorkspaces = [
  { id: "nasional", code: "PUSAT", name: "Lemdiklat Polri Nasional", type: "Platform Induk", region: "Nasional", status: "Aktif", modules: 14 },
  { id: "spn-jabar", code: "SPN-JBR", name: "SPN Polda Jawa Barat", type: "Sekolah Polisi Negara", region: "Jawa Barat", status: "Aktif", modules: 12 }
];

function getStoredWorkspaces() {
  const custom = JSON.parse(localStorage.getItem("presisiCustomWorkspaces") || "[]").filter(item => item.type === "Sekolah Polisi Negara");
  return [...defaultWorkspaces, ...custom];
}
function saveCustomWorkspaces(items) { localStorage.setItem("presisiCustomWorkspaces", JSON.stringify(items)); }
function getWorkspaceById(id) { return getStoredWorkspaces().find(item => item.id === id); }
function updateCustomWorkspace(id, changes) {
  const custom = JSON.parse(localStorage.getItem("presisiCustomWorkspaces") || "[]");
  const index = custom.findIndex(item => item.id === id);
  if (index < 0) return false;
  custom[index] = { ...custom[index], ...changes, updatedAt: new Date().toISOString() };
  saveCustomWorkspaces(custom);
  return true;
}
const workspaceStatusTransitions = { Draft: ["Review", "Arsip"], Review: ["Draft", "Aktif", "Arsip"], Aktif: ["Suspend", "Arsip"], Suspend: ["Aktif", "Arsip"], Arsip: ["Draft"] };
function canTransitionWorkspaceStatus(from, to) { return (workspaceStatusTransitions[from] || []).includes(to); }
function escapeHtml(value = "") {
  return String(value).replace(/[&<>'"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]);
}
function getRole() { return localStorage.getItem("demoRole") || "pimpinan"; }
function setRole(role) { localStorage.setItem("demoRole", role); }
function validateDemoCredentials(username, password, role) { return Boolean(String(username || "").trim()) && password === "prototype" && Boolean(roleLabels[role]); }
function getDemoSession() { try { const session = JSON.parse(localStorage.getItem("presisiSession") || "null"); return session && roleLabels[session.role] && session.username ? session : null; } catch { return null; } }
function endDemoSession() { localStorage.removeItem("presisiSession"); }
function requireDemoSession() { if (getDemoSession()) return true; location.href = resolveHref("login.html"); return false; }
function resetPrototypeData() {
  const exactKeys = new Set([
    "presisiCustomWorkspaces", "presisiMasterLibrary", "presisiIntegrationHub", "presisiWorkspace"
  ]);
  const scopedPrefixes = [
    "presisiEducation:", "presisiLearning:", "presisiAttendance:", "presisiCare:",
    "presisiCompetency:", "presisiQuality:", "presisiOperations:",
    "presisiCollaboration:", "presisiNotificationPrefs:", "presisiPlatform:", "presisiDashboard:"
  ];
  const keys = Array.from({ length: localStorage.length }, (_, index) => localStorage.key(index)).filter(Boolean);
  const removable = keys.filter(key => exactKeys.has(key) || scopedPrefixes.some(prefix => key.startsWith(prefix)));
  removable.forEach(key => localStorage.removeItem(key));
  return removable.length;
}
function getWorkspace() {
  const role = getRole();
  const centralRole = ["pimpinan", "adminpusat", "adminti"].includes(role);
  const fallback = centralRole ? "nasional" : "spn-jabar";
  const id = localStorage.getItem("presisiWorkspace") || fallback;
  const permitted = centralRole ? getStoredWorkspaces() : getStoredWorkspaces().filter(item => item.id === "spn-jabar");
  const workspace = permitted.find(item => item.id === id) || getWorkspaceById(fallback) || getWorkspaceById("spn-jabar");
  if (workspace && workspace.id !== id) localStorage.setItem("presisiWorkspace", workspace.id);
  return workspace;
}
function setWorkspace(id) { const allowed = accessibleWorkspaces(getRole()); const target = allowed.find(item => item.id === id) || allowed[0]; if (!target) return false; localStorage.setItem("presisiWorkspace", target.id); return true; }
function accessibleWorkspaces(role = getRole()) {
  const all = getStoredWorkspaces();
  if (["pimpinan", "adminpusat", "adminti"].includes(role)) return all;
  if (["asesor", "auditor"].includes(role)) return all.filter(item => item.id !== "nasional" && item.status === "Aktif");
  return all.filter(item => item.id === "spn-jabar" && item.status === "Aktif");
}
function resolveHref(path) {
  const inPages = location.pathname.includes("/pages/");
  if (/^(https?:|#)/.test(path)) return path;
  if (inPages && path.startsWith("pages/")) return path.slice(6);
  if (inPages && !path.startsWith("pages/")) return `../${path}`;
  return path;
}
function getHomeForRole(role = getRole()) { return (roleMenus[role] || roleMenus.pimpinan)[0][1]; }
function openRoleHome() { location.href = resolveHref(getHomeForRole()); }
const sharedServiceRoutes = { "Master Library": "pages/master-library.html", "LSP & Kompetensi": "pages/lsp-dashboard.html", "Integration Hub": "pages/integration-dashboard.html", "Command Center": "pages/command-center.html" };
function accessibleSharedServices(role = getRole()) { const routes = new Set((roleMenus[role] || []).map(item => item[1].split("#")[0])); return Object.entries(sharedServiceRoutes).filter(([, route]) => routes.has(route)).map(([name]) => name); }

function profileStorageKey(role = getRole()) { return `presisiProfile:${role}`; }
function getRoleProfile(role = getRole()) {
  const session = getDemoSession();
  const centralRole = ["pimpinan", "adminpusat", "adminti"].includes(role);
  const defaults = {
    fullName: `Demo ${roleLabels[role] || "Pengguna"}`,
    personnelId: `DEMO-${role.toUpperCase()}`,
    position: roleLabels[role] || "Pengguna",
    unit: centralRole ? "Lemdiklat Polri Nasional" : "SPN Polda Jawa Barat",
    email: session?.username?.includes("@") ? session.username : `${role}@presisi.demo`,
    phone: "",
    photo: ""
  };
  try { return { ...defaults, ...JSON.parse(localStorage.getItem(profileStorageKey(role)) || "{}") }; }
  catch { return defaults; }
}
function saveRoleProfile(profile, role = getRole()) { localStorage.setItem(profileStorageKey(role), JSON.stringify(profile)); }
function profileInitials(name = "") {
  return String(name).trim().split(/\s+/).filter(Boolean).slice(-2).map(part => part[0]).join("").toUpperCase() || "PR";
}
function profileAvatarContent(profile) {
  return profile.photo ? `<img src="${escapeHtml(profile.photo)}" alt="Foto profil ${escapeHtml(profile.fullName)}">` : `<span>${escapeHtml(profileInitials(profile.fullName))}</span>`;
}
function showProfileToast(message) {
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.setAttribute("role", "status");
  toast.textContent = message;
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add("show"));
  setTimeout(() => { toast.classList.remove("show"); setTimeout(() => toast.remove(), 220); }, 2200);
}
function resizeProfileImage(file) {
  return new Promise((resolve, reject) => {
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) { reject(new Error("Gunakan gambar JPG, PNG, atau WebP.")); return; }
    if (file.size > 3 * 1024 * 1024) { reject(new Error("Ukuran foto maksimal 3 MB.")); return; }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Foto tidak dapat dibaca."));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error("Format foto tidak valid."));
      image.onload = () => {
        const size = 512;
        const scale = Math.max(size / image.width, size / image.height);
        const width = image.width * scale, height = image.height * scale;
        const canvas = document.createElement("canvas");
        canvas.width = size; canvas.height = size;
        const context = canvas.getContext("2d");
        context.fillStyle = "#ffffff"; context.fillRect(0, 0, size, size);
        context.drawImage(image, (size - width) / 2, (size - height) / 2, width, height);
        resolve(canvas.toDataURL("image/jpeg", .84));
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
function updateHeaderProfile(profile = getRoleProfile()) {
  const button = document.querySelector("#profileMenu");
  if (!button) return;
  button.innerHTML = profileAvatarContent(profile);
  button.title = `Profil ${profile.fullName}`;
  button.setAttribute("aria-label", `Buka pengaturan profil ${profile.fullName}`);
}
function openProfileSettings() {
  const role = getRole();
  const current = getRoleProfile(role);
  let pendingPhoto = current.photo;
  const trigger = document.querySelector("#profileMenu");
  const layer = document.createElement("div");
  layer.className = "modal-layer profile-settings-layer";
  layer.innerHTML = `<section class="modal-card profile-settings-card" role="dialog" aria-modal="true" aria-labelledby="profileSettingsTitle">
    <div class="modal-head"><div><h2 id="profileSettingsTitle">Profil Saya</h2><p>${escapeHtml(roleLabels[role])} • ${escapeHtml(getWorkspace().code)}</p></div><button class="modal-close" type="button" aria-label="Tutup pengaturan profil">×</button></div>
    <form id="profileSettingsForm"><div class="profile-settings-layout"><aside class="profile-photo-panel"><div class="profile-photo-preview" id="profilePhotoPreview">${profileAvatarContent(current)}</div><b>Foto profil</b><small>JPG, PNG, atau WebP. Maksimal 3 MB.</small><label class="btn btn-light profile-upload-button" for="profilePhotoInput">Pilih Foto</label><input class="profile-file-input" id="profilePhotoInput" type="file" accept="image/jpeg,image/png,image/webp"><button class="text-action profile-remove-photo" id="removeProfilePhoto" type="button" ${current.photo ? "" : "hidden"}>Hapus foto</button><span class="field-error" id="profilePhotoError" aria-live="polite"></span></aside>
    <div class="profile-fields"><div class="form-grid"><div class="form-row"><label for="profileFullName">Nama lengkap</label><input id="profileFullName" name="fullName" value="${escapeHtml(current.fullName)}" required maxlength="80"></div><div class="form-row"><label for="profilePersonnelId">NRP / NIP</label><input id="profilePersonnelId" name="personnelId" value="${escapeHtml(current.personnelId)}" maxlength="40"></div><div class="form-row"><label for="profilePosition">Jabatan</label><input id="profilePosition" name="position" value="${escapeHtml(current.position)}" maxlength="80"></div><div class="form-row"><label for="profileUnit">Satuan kerja</label><input id="profileUnit" name="unit" value="${escapeHtml(current.unit)}" maxlength="100"></div><div class="form-row"><label for="profileEmail">Email</label><input id="profileEmail" name="email" type="email" value="${escapeHtml(current.email)}" maxlength="100"></div><div class="form-row"><label for="profilePhone">Nomor telepon</label><input id="profilePhone" name="phone" type="tel" value="${escapeHtml(current.phone)}" placeholder="Contoh: 0812 3456 7890" maxlength="30"></div></div><div class="profile-scope-note"><b>Profil khusus role</b><span>Perubahan ini hanya berlaku untuk role ${escapeHtml(roleLabels[role])} pada browser ini.</span></div></div></div>
    <div class="modal-actions profile-settings-actions"><button class="btn profile-logout-button" id="profileLogout" type="button">Keluar</button><span><button class="btn btn-light modal-cancel" type="button">Batal</button><button class="btn btn-primary" type="submit">Simpan Perubahan</button></span></div></form></section>`;
  document.body.appendChild(layer);
  const preview = layer.querySelector("#profilePhotoPreview");
  const removeButton = layer.querySelector("#removeProfilePhoto");
  const photoError = layer.querySelector("#profilePhotoError");
  const updatePreview = () => {
    const name = layer.querySelector("#profileFullName").value || current.fullName;
    preview.innerHTML = profileAvatarContent({ fullName: name, photo: pendingPhoto });
    removeButton.hidden = !pendingPhoto;
  };
  const close = () => { layer.remove(); trigger?.focus(); };
  layer.querySelector(".modal-close").addEventListener("click", close);
  layer.querySelector(".modal-cancel").addEventListener("click", close);
  layer.addEventListener("click", event => { if (event.target === layer) close(); });
  layer.addEventListener("keydown", event => { if (event.key === "Escape") close(); });
  layer.querySelector("#profileFullName").addEventListener("input", () => { if (!pendingPhoto) updatePreview(); });
  layer.querySelector("#profilePhotoInput").addEventListener("change", async event => {
    const file = event.target.files?.[0];
    if (!file) return;
    photoError.textContent = "";
    try { pendingPhoto = await resizeProfileImage(file); updatePreview(); }
    catch (error) { photoError.textContent = error.message; event.target.value = ""; }
  });
  removeButton.addEventListener("click", () => { pendingPhoto = ""; layer.querySelector("#profilePhotoInput").value = ""; photoError.textContent = ""; updatePreview(); });
  layer.querySelector("#profileLogout").addEventListener("click", () => { endDemoSession(); location.href = resolveHref("login.html"); });
  layer.querySelector("#profileSettingsForm").addEventListener("submit", event => {
    event.preventDefault();
    if (!event.currentTarget.reportValidity()) return;
    const data = new FormData(event.currentTarget);
    const profile = { fullName: String(data.get("fullName") || "").trim(), personnelId: String(data.get("personnelId") || "").trim(), position: String(data.get("position") || "").trim(), unit: String(data.get("unit") || "").trim(), email: String(data.get("email") || "").trim(), phone: String(data.get("phone") || "").trim(), photo: pendingPhoto, updatedAt: new Date().toISOString() };
    try { saveRoleProfile(profile, role); }
    catch { photoError.textContent = "Penyimpanan browser penuh. Hapus foto lama atau gunakan gambar yang lebih kecil."; return; }
    updateHeaderProfile(profile); close(); showProfileToast("Profil berhasil diperbarui.");
  });
  layer.querySelector("#profileFullName").focus();
}

function renderSidebar(activeLabel = "") {
  if (!requireDemoSession()) return;
  const el = document.querySelector("#sidebar");
  if (!el) return;
  const role = getRole();
  const workspace = getWorkspace();
  const items = roleMenus[role] || roleMenus.pimpinan;
  const logoPath = resolveHref("assets/logos/logo-lemdiklat-polri.png");
  const nav = items.map(([label, href]) => `<a class="nav-item ${label === activeLabel ? "active" : ""}" href="${resolveHref(href)}"><span class="nav-icon" aria-hidden="true">•</span><span>${label}</span></a>`).join("");
  el.innerHTML = `<div class="brand"><div class="brand-logo"><img src="${logoPath}" alt="" onerror="this.style.display='none';this.parentElement.textContent='LP'"></div><div><div class="brand-title">LMS PRESISI</div><div class="brand-sub">LEMDIKLAT POLRI</div></div></div>
    <a class="workspace-chip" href="${resolveHref("launcher.html")}" title="Ganti workspace"><span class="workspace-code">${workspace.code}</span><span><b>${workspace.name}</b><small>Ganti workspace</small></span></a>
    <nav class="nav-section" aria-label="Navigasi utama"><div class="nav-label">Menu ${roleLabels[role]}</div>${nav}</nav><div class="sidebar-footer">Prototype v2 • ${roleLabels[role]}</div>`;
}

function renderHeader(title, breadcrumb = "") {
  if (!requireDemoSession()) return;
  const h = document.querySelector("#topbar");
  if (!h) return;
  const role = getRole();
  const current = getWorkspace();
  const options = accessibleWorkspaces(role).map(item => `<option value="${item.id}" ${item.id === current.id ? "selected" : ""}>${item.code}</option>`).join("");
  const date = new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "long", year: "numeric" }).format(new Date());
  h.innerHTML = `<button class="mobile-menu-toggle" id="mobileMenuToggle" type="button" aria-label="Sembunyikan menu navigasi" aria-controls="sidebar" aria-expanded="true" title="Sembunyikan sidebar"><svg class="sidebar-toggle-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="3"></rect><path d="M9 3v18"></path><path d="m15 9-3 3 3 3"></path></svg></button><div class="topbar-heading"><div class="breadcrumb">${breadcrumb || APP_NAME}</div><div class="page-title">${title}</div></div><div class="userbox">
    <select class="control workspace-switch" id="workspaceSwitch" aria-label="Pilih workspace">${options}</select><a class="launcher-link" href="${resolveHref("launcher.html")}">Launcher</a>
    <div class="header-date"><b>${date}</b><span>${roleLabels[role]}</span></div><button class="avatar" id="profileMenu" type="button" title="Buka profil" aria-label="Buka pengaturan profil" aria-haspopup="dialog"></button></div>`;
  updateHeaderProfile();
  const menuToggle = document.querySelector("#mobileMenuToggle");
  const sidebar = document.querySelector("#sidebar");
  const sidebarPreferenceKey = "presisiSidebarCollapsed";
  const setMobileMenu = open => {
    document.body.classList.toggle("sidebar-open", open);
    menuToggle?.setAttribute("aria-expanded", String(open));
    menuToggle?.setAttribute("aria-label", open ? "Tutup menu navigasi" : "Buka menu navigasi");
    menuToggle?.setAttribute("title", open ? "Tutup sidebar" : "Buka sidebar");
    sidebar?.setAttribute("aria-hidden", String(!open));
    if (open) sidebar?.querySelector(".nav-item")?.focus();
  };
  const mobileViewport = window.matchMedia?.("(max-width: 860px)");
  const setDesktopSidebar = (collapsed, persist = true) => {
    document.body.classList.toggle("sidebar-collapsed", collapsed);
    menuToggle?.setAttribute("aria-expanded", String(!collapsed));
    menuToggle?.setAttribute("aria-label", collapsed ? "Tampilkan menu navigasi" : "Sembunyikan menu navigasi");
    menuToggle?.setAttribute("title", collapsed ? "Tampilkan sidebar" : "Sembunyikan sidebar");
    sidebar?.setAttribute("aria-hidden", String(collapsed));
    if (persist) localStorage.setItem(sidebarPreferenceKey, String(collapsed));
  };
  const syncMobileMenu = event => {
    if (event.matches) {
      document.body.classList.remove("sidebar-collapsed");
      setMobileMenu(false);
    }
    else {
      document.body.classList.remove("sidebar-open");
      sidebar?.removeAttribute("aria-hidden");
      setDesktopSidebar(localStorage.getItem(sidebarPreferenceKey) === "true", false);
    }
  };
  if (mobileViewport) {
    syncMobileMenu(mobileViewport);
    mobileViewport.addEventListener?.("change", syncMobileMenu);
  }
  menuToggle?.addEventListener("click", () => {
    if (mobileViewport?.matches) setMobileMenu(!document.body.classList.contains("sidebar-open"));
    else setDesktopSidebar(!document.body.classList.contains("sidebar-collapsed"));
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && mobileViewport?.matches && document.body.classList.contains("sidebar-open")) setMobileMenu(false);
  });
  document.addEventListener("click", event => {
    if (!document.body.classList.contains("sidebar-open") || sidebar?.contains(event.target) || menuToggle?.contains(event.target)) return;
    setMobileMenu(false);
  });
  document.querySelector("#workspaceSwitch")?.addEventListener("change", event => { setWorkspace(event.target.value); location.reload(); });
  document.querySelector("#profileMenu")?.addEventListener("click", openProfileSettings);
}

function startDemoSession(role, username) {
  if (!roleLabels[role] || !String(username || "").trim()) return false;
  setRole(role);
  localStorage.setItem("presisiSession", JSON.stringify({ username, role, loginAt: new Date().toISOString() }));
  const firstWorkspace = accessibleWorkspaces(role)[0];
  if (firstWorkspace) setWorkspace(firstWorkspace.id);
  return true;
}
