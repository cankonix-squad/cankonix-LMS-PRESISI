const collaborationSeed = {
  channels: [
    { id: "channel-class-a", name: "Kelas A — SPPK 2027", type: "Kelas", scope: "k-1", unreadBy: ["p-1"], messages: [{ id: "msg-1", author: "Kombes Pol. Arif Pratama", time: "08:10", text: "Silakan siapkan studi kasus untuk diskusi besok." }, { id: "msg-2", author: "Ipda Budi Santoso", time: "08:24", text: "Siap, bahan kelompok sudah kami rangkum." }] },
    { id: "channel-gadik", name: "Koordinasi Gadik", type: "Role", scope: "gadik", unreadBy: [], messages: [{ id: "msg-3", author: "AKBP Maya Permatasari", time: "09:15", text: "Rapat evaluasi pembelajaran pukul 14.00." }] },
    { id: "channel-program", name: "Program SPPK 2027", type: "Program", scope: "sppk-2027", unreadBy: ["p-1", "gadik"], messages: [{ id: "msg-4", author: "Admin Satdik", time: "10:00", text: "Jadwal minggu keempat telah diperbarui." }] }
  ]
};
function collaborationKey() { return `presisiCollaboration:${getWorkspace().id}`; }
function getCollaborationData() { const saved = localStorage.getItem(collaborationKey()); if (saved) return JSON.parse(saved); const data = JSON.parse(JSON.stringify(collaborationSeed)); localStorage.setItem(collaborationKey(), JSON.stringify(data)); return data; }
function saveCollaborationData(data) { localStorage.setItem(collaborationKey(), JSON.stringify(data)); }
