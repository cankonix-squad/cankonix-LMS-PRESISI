const operationsSeed = {
  cameras: [
    { id: "cam-1", name: "CAM Lobby Utama", building: "Gedung Utama", location: "Lobby", stream: "RTSP", owner: "Bagian Umum", retention: 30, status: "Online", lastSignal: "1 menit lalu", storage: 68 },
    { id: "cam-2", name: "CAM Garuda 1", building: "Gedung Pendidikan", location: "Ruang Garuda 1", stream: "ONVIF", owner: "Bagian Pendidikan", retention: 14, status: "Online", lastSignal: "2 menit lalu", storage: 52 },
    { id: "cam-3", name: "CAM Koridor Asrama", building: "Asrama A", location: "Koridor Lt. 2", stream: "RTSP", owner: "Pengasuhan", retention: 30, status: "Offline", lastSignal: "42 menit lalu", storage: 77 },
    { id: "cam-4", name: "CAM Lapangan", building: "Area Terbuka", location: "Lapangan Upacara", stream: "HLS", owner: "Bagian Umum", retention: 7, status: "Maintenance", lastSignal: "2 jam lalu", storage: 31 }
  ],
  recordings: [{ id: "rec-1", cameraId: "cam-1", date: "2027-03-12", start: "07:00", end: "08:00", size: "1.8 GB", status: "Available" }, { id: "rec-2", cameraId: "cam-2", date: "2027-03-12", start: "08:00", end: "10:00", size: "3.4 GB", status: "Available" }],
  incidents: [{ id: "inc-1", cameraId: "cam-3", title: "Camera offline", severity: "High", openedAt: "2027-03-12 08:42", ticket: "MT-2027-014", status: "Open" }],
  cctvAccessLog: [{ id: "acl-1", actor: "Admin TI", cameraId: "cam-1", time: "2027-03-12 09:10", action: "Live View" }],
  categories: ["Perangkat Pembelajaran", "Elektronik", "Kendaraan", "Furniture"],
  assets: [
    { id: "asset-1", code: "AST-SIM-001", name: "Simulator Taktis", category: "Perangkat Pembelajaran", subcategory: "Simulator", type: "Unit", building: "Gedung Pendidikan", room: "Lab Simulasi", value: 850000000, condition: "Baik", status: "Available", history: ["2026-12-10 • Registrasi aset", "2027-02-01 • Inspeksi berkala"] },
    { id: "asset-2", code: "AST-LCD-014", name: "Projector Epson", category: "Elektronik", subcategory: "Display", type: "Unit", building: "Gedung Pendidikan", room: "Ruang Garuda 1", value: 18000000, condition: "Baik", status: "In Use", history: ["2027-01-05 • Dipasang di Ruang Garuda 1"] },
    { id: "asset-3", code: "AST-VEH-003", name: "Kendaraan Latihan", category: "Kendaraan", subcategory: "Roda Empat", type: "Unit", building: "Garasi", room: "Bay 3", value: 420000000, condition: "Perlu Perbaikan", status: "Maintenance", history: ["2027-03-01 • Ticket maintenance MT-2027-013"] }
  ],
  rooms: [{ id: "room-1", name: "Ruang Garuda 1", building: "Gedung Pendidikan", capacity: 30, occupancy: 24, resources: ["Projector", "Audio", "CCTV"], status: "Occupied" }, { id: "room-2", name: "Lab Simulasi", building: "Gedung Pendidikan", capacity: 20, occupancy: 0, resources: ["Simulator", "Workstation"], status: "Available" }],
  loans: [{ id: "loan-1", assetId: "asset-1", borrower: "Gadik KPM-101", start: "2027-03-15", due: "2027-03-16", returnDate: "", conditionOut: "Baik", conditionIn: "", status: "Requested" }],
  maintenance: [{ id: "maint-1", assetId: "asset-3", schedule: "2027-03-18", vendor: "PT Mitra Teknik", cost: 7500000, downtime: "3 hari", issue: "Sistem pengereman perlu inspeksi", status: "Scheduled" }],
  disposals: [{ id: "disp-1", assetId: "asset-2", reason: "Usia pakai dan biaya perbaikan", evidence: "BA Pemeriksaan Aset.pdf", status: "Requested" }],
  stock: [{ id: "stock-1", name: "Kertas A4", unit: "Rim", quantity: 18, minimum: 20, status: "Low Stock" }, { id: "stock-2", name: "Toner Printer", unit: "Unit", quantity: 12, minimum: 5, status: "Available" }],
  stockRequests: [{ id: "stockreq-1", stockId: "stock-1", requester: "Bagian Akademik", quantity: 5, type: "Issue", status: "Requested" }]
};
function operationsKey() { return `presisiOperations:${getWorkspace().id}`; }
function getOperationsData() { const saved = localStorage.getItem(operationsKey()); if (saved) { const data = JSON.parse(saved); Object.keys(operationsSeed).forEach(key => { data[key] ||= JSON.parse(JSON.stringify(operationsSeed[key])); }); return data; } const data = JSON.parse(JSON.stringify(operationsSeed)); localStorage.setItem(operationsKey(), JSON.stringify(data)); return data; }
function saveOperationsData(data) { localStorage.setItem(operationsKey(), JSON.stringify(data)); }
