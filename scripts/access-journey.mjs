#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const appSource = fs.readFileSync(path.join(root, "assets/js/app.js"), "utf8");
const authSource = fs.readFileSync(path.join(root, "assets/js/auth-launcher.js"), "utf8");
const failures = [];
let checks = 0;
const check = (condition, message) => { checks += 1; if (!condition) failures.push(message); };
function storage(seed = {}) {
  const values = { ...seed };
  return { values, api: {
    get length() { return Object.keys(values).length; }, key: index => Object.keys(values)[index] ?? null,
    getItem: key => values[key] ?? null, setItem: (key, value) => { values[key] = String(value); }, removeItem: key => { delete values[key]; }
  } };
}
function appRuntime(store, pathname = "/launcher.html", document = { querySelector: () => null }) {
  const location = { pathname, href: `http://qa${pathname}`, reload() {} };
  const ctx = { localStorage: store.api, document, location, window: { matchMedia: null }, confirm: () => true, alert() {}, Intl, Date, Math, JSON, console };
  vm.createContext(ctx); new vm.Script(appSource, { filename: "app.js" }).runInContext(ctx); return ctx;
}

const store = storage();
const core = appRuntime(store);
const spnSurfaceFiles = ["assets/js/app.js", "assets/js/platform-modules.js", "assets/js/dashboard-enhancements.js", "index.html", "launcher.html", "pages/command-center.html", "data/institutions.json", "data/programs.json"];
const legacySurface = spnSurfaceFiles.filter(file => /\b(SESPIM|STIK)\b/i.test(fs.readFileSync(path.join(root, file), "utf8")));
check(legacySurface.length === 0, `label Satdik lama masih muncul pada surface aktif: ${legacySurface.join(", ")}`);
const activeInstitutions = JSON.parse(fs.readFileSync(path.join(root, "data/institutions.json"), "utf8"));
check(activeInstitutions.length === 1 && activeInstitutions[0].id === "spn-jabar", "dataset institusi aktif tidak eksklusif SPN Jawa Barat");
check(vm.runInContext('validateDemoCredentials("demo.presisi","prototype","adminpusat")', core), "credential demo valid ditolak");
check(!vm.runInContext('validateDemoCredentials("demo.presisi","salah","adminpusat")', core), "password salah diterima");
check(!vm.runInContext('validateDemoCredentials("","prototype","adminpusat")', core), "username kosong diterima");
check(!vm.runInContext('startDemoSession("role-tidak-ada","demo")', core), "role tidak dikenal dapat membuat sesi");

const roles = vm.runInContext("Object.keys(roleLabels)", core);
check(vm.runInContext("defaultWorkspaces.filter(item=>item.id!=='nasional').length===1 && defaultWorkspaces.some(item=>item.id==='spn-jabar')", core), "workspace Satdik aktif tidak eksklusif SPN Jawa Barat");
for (const role of roles) {
  const started = vm.runInContext(`startDemoSession(${JSON.stringify(role)},"demo.${role}")`, core);
  const session = JSON.parse(store.values.presisiSession);
  const access = vm.runInContext(`accessibleWorkspaces(${JSON.stringify(role)})`, core);
  const home = vm.runInContext(`getHomeForRole(${JSON.stringify(role)})`, core);
  check(started && session.role === role && session.username === `demo.${role}`, `sesi ${role} tidak terbentuk dengan benar`);
  check(access.length > 0 && access.some(item => item.id === store.values.presisiWorkspace), `workspace awal ${role} tidak berada dalam scope akses`);
  check(fs.existsSync(path.join(root, home)), `home ${role} tidak ditemukan: ${home}`);
  const services = vm.runInContext(`accessibleSharedServices(${JSON.stringify(role)})`, core);
  check(services.every(name => vm.runInContext(`roleMenus[${JSON.stringify(role)}].some(item=>item[1].split("#")[0]===sharedServiceRoutes[${JSON.stringify(name)}])`, core)), `shared service ${role} tidak mengikuti menu role`);
}
vm.runInContext('setRole("peserta");setWorkspace("nasional")', core);
check(store.values.presisiWorkspace === "spn-jabar", "Peserta dapat memilih workspace di luar SPN");

store.values.presisiSession = "{rusak";
check(vm.runInContext("getDemoSession()", core) === null, "session JSON rusak tidak ditolak");
vm.runInContext('startDemoSession("peserta","demo.peserta")', core);
check(vm.runInContext("getDemoSession().role", core) === "peserta", "session valid tidak dapat dibaca");
vm.runInContext("endDemoSession()", core);
check(!store.values.presisiSession && store.values.demoRole === "peserta", "logout menghapus state selain session");
const protectedStore = storage({ demoRole: "peserta" });
const protectedPage = appRuntime(protectedStore, "/pages/courses.html");
check(!vm.runInContext("requireDemoSession()", protectedPage) && protectedPage.location.href === "../login.html", "halaman modul tanpa sesi tidak diarahkan ke login");
vm.runInContext('startDemoSession("peserta","demo.peserta")', protectedPage);
check(vm.runInContext("requireDemoSession()", protectedPage), "halaman modul menolak sesi valid");

function interactiveNode(value = "") {
  return { value, textContent: "", hidden: false, disabled: false, type: "text", dataset: {}, handlers: {}, addEventListener(type, handler) { this.handlers[type] = handler; } };
}
const loginStore = storage();
const loginNodes = {
  "#loginForm": interactiveNode(), "#password": interactiveNode("salah"), "#togglePassword": interactiveNode(),
  "#username": interactiveNode("demo.presisi"), "#role": interactiveNode("adminpusat"),
  "#usernameError": interactiveNode(), "#passwordError": interactiveNode(), "#formAlert": interactiveNode()
};
const loginDocument = { body: { dataset: {} }, querySelector: selector => loginNodes[selector] || null, querySelectorAll: () => [], addEventListener() {} };
const login = appRuntime(loginStore, "/login.html", loginDocument);
new vm.Script(authSource, { filename: "auth-launcher.js" }).runInContext(login);
loginNodes["#loginForm"].handlers.submit({ preventDefault() {} });
check(!loginStore.values.presisiSession, "form login menerima password salah");
check(loginNodes["#passwordError"].textContent.includes("tidak sesuai"), "error password salah tidak tampil");
loginNodes["#password"].value = "prototype";
loginNodes["#loginForm"].handlers.submit({ preventDefault() {} });
check(JSON.parse(loginStore.values.presisiSession).role === "adminpusat", "submit login valid tidak membuat sesi");
check(login.location.href === "launcher.html", "login valid tidak menuju Launcher");

const noSessionStore = storage();
const noSession = appRuntime(noSessionStore, "/launcher.html", { body: { dataset: {} }, querySelector: () => null, querySelectorAll: () => [] });
new vm.Script(authSource, { filename: "auth-launcher.js" }).runInContext(noSession);
check(noSession.location.href === "login.html", "Launcher tanpa sesi tidak diarahkan ke login");

const launcherStore = storage({ demoRole: "peserta", presisiSession: JSON.stringify({ username: "demo.peserta", role: "peserta", loginAt: new Date().toISOString() }), presisiWorkspace: "spn-jabar", "presisiLearning:spn-jabar": "{}", unrelatedKey: "keep" });
const launcherNodes = {
  "#launcherRole": interactiveNode(), "#logoutLink": interactiveNode(), "#resetDemoButton": interactiveNode(),
  "#workspaceSearch": interactiveNode(""), "#workspaceFilter": interactiveNode("all"),
  "#accessCount": interactiveNode(), "#workspaceGrid": interactiveNode()
};
const serviceNames = ["Master Library", "LSP & Kompetensi", "Integration Hub", "Command Center"];
const serviceButtons = serviceNames.map(name => ({ ...interactiveNode(), dataset: { service: name } }));
const launcherDocument = { body: { dataset: {} }, querySelector: selector => launcherNodes[selector] || null, querySelectorAll: selector => selector === "[data-service]" ? serviceButtons : [], addEventListener() {} };
const launcher = appRuntime(launcherStore, "/launcher.html", launcherDocument);
launcher.alerts = [];
launcher.alert = message => launcher.alerts.push(message);
new vm.Script(authSource, { filename: "auth-launcher.js" }).runInContext(launcher);
check(launcherNodes["#launcherRole"].textContent === "Peserta Didik", "label role Launcher tidak sesuai sesi");
check(Number(launcherNodes["#accessCount"].textContent) === 1, "scope workspace Peserta bukan satu SPN aktif");
check(launcherNodes["#workspaceGrid"].innerHTML.includes("SPN Polda Jawa Barat") && !launcherNodes["#workspaceGrid"].innerHTML.includes("Lemdiklat Polri Nasional"), "Launcher menampilkan workspace di luar scope SPN Peserta");
check(!launcherNodes["#workspaceGrid"].innerHTML.includes("SPN-BLI"), "Launcher Peserta masih menampilkan SPN di luar fokus");
const allowedParticipant = new Set(vm.runInContext('accessibleSharedServices("peserta")', launcher));
check(serviceButtons.every(button => button.hidden === !allowedParticipant.has(button.dataset.service)), "visibility shared service Peserta tidak sesuai scope");
check(serviceButtons.find(button => button.dataset.service === "Integration Hub")?.disabled, "Integration Hub masih aktif untuk Peserta");
launcherNodes["#resetDemoButton"].handlers.click();
check(!launcherStore.values["presisiLearning:spn-jabar"] && launcherStore.values.presisiSession && launcherStore.values.demoRole === "peserta", "Reset Data Demo menghapus sesi/role atau menyisakan transaksi");
check(launcherStore.values.unrelatedKey === "keep", "Reset Data Demo menghapus key di luar scope");
launcherNodes["#logoutLink"].handlers.click();
check(!launcherStore.values.presisiSession, "logout dari Launcher tidak menghapus sesi");

console.log(JSON.stringify({ result: failures.length ? "FAIL" : "PASS", checks, roles: roles.length, lifecycle: ["Login", "Launcher", "Workspace", "Shared Service", "Reset", "Logout"], failures }, null, 2));
if (failures.length) process.exitCode = 1;
