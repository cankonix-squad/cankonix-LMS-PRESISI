function initLoginPage() {
  const form = document.querySelector("#loginForm"), password = document.querySelector("#password"), toggle = document.querySelector("#togglePassword");
  if (!form || !password || !toggle) return;
  toggle.addEventListener("click", event => {
    password.type = password.type === "password" ? "text" : "password";
    event.currentTarget.textContent = password.type === "password" ? "Lihat" : "Sembunyikan";
  });
  form.addEventListener("submit", event => {
    event.preventDefault();
    const username = document.querySelector("#username").value.trim(), role = document.querySelector("#role").value;
    const usernameValid = Boolean(username), passwordValid = password.value === "prototype";
    document.querySelector("#usernameError").textContent = usernameValid ? "" : "NRP, NIP, atau email wajib diisi.";
    document.querySelector("#passwordError").textContent = passwordValid ? "" : "Kata sandi prototipe tidak sesuai.";
    const valid = validateDemoCredentials(username, password.value, role);
    document.querySelector("#formAlert").hidden = valid;
    if (!valid) return;
    startDemoSession(role, username);
    location.href = "launcher.html";
  });
}

function initLauncherPage() {
  const session = getDemoSession();
  if (!session) { location.href = "login.html"; return; }
  setRole(session.role);
  const role = session.role, all = accessibleWorkspaces(role), allowedServices = new Set(accessibleSharedServices(role));
  document.querySelector("#launcherRole").textContent = roleLabels[role];
  document.querySelector("#logoutLink").addEventListener("click", () => endDemoSession());
  document.querySelector("#resetDemoButton").addEventListener("click", () => {
    if (!confirm("Reset seluruh data transaksi prototype ke kondisi awal? Role dan sesi login tetap dipertahankan.")) return;
    const count = resetPrototypeData(); alert(`${count} data demo berhasil direset.`); location.reload();
  });
  function renderWorkspaces() {
    const query = document.querySelector("#workspaceSearch").value.toLowerCase(), type = document.querySelector("#workspaceFilter").value;
    const filtered = all.filter(item => (type === "all" || item.type === type) && `${item.name} ${item.code} ${item.region}`.toLowerCase().includes(query));
    document.querySelector("#accessCount").textContent = filtered.length;
    document.querySelector("#workspaceGrid").innerHTML = filtered.length ? filtered.map(item => `<article class="workspace-card"><div class="workspace-card-top"><span class="workspace-monogram">${escapeHtml(item.code.slice(0, 2))}</span><span class="badge green">${escapeHtml(item.status)}</span></div><div><div class="workspace-type">${escapeHtml(item.type)}</div><h2>${escapeHtml(item.name)}</h2><p>${escapeHtml(item.region)} • ${item.modules} modul aktif</p></div><button class="btn btn-primary" data-id="${escapeHtml(item.id)}">Buka Workspace</button></article>`).join("") : '<div class="empty-state"><b>Workspace tidak ditemukan</b><span>Ubah kata kunci atau filter pencarian.</span></div>';
    document.querySelectorAll("[data-id]").forEach(button => button.addEventListener("click", () => { setWorkspace(button.dataset.id); openRoleHome(); }));
  }
  document.querySelector("#workspaceSearch").addEventListener("input", renderWorkspaces);
  document.querySelector("#workspaceFilter").addEventListener("change", renderWorkspaces);
  document.querySelectorAll("[data-service]").forEach(button => {
    const allowed = allowedServices.has(button.dataset.service);
    button.hidden = !allowed; button.disabled = !allowed;
    if (allowed) button.addEventListener("click", () => { location.href = sharedServiceRoutes[button.dataset.service]; });
  });
  renderWorkspaces();
}

if (location.pathname.endsWith("/login.html") || location.pathname === "login.html") initLoginPage();
if (location.pathname.endsWith("/launcher.html") || location.pathname === "launcher.html") initLauncherPage();
