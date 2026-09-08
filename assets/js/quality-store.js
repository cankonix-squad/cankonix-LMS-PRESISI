const qualitySeed = {
  standards: [
    ["STD-01", "Standar Kompetensi Lulusan", "Bagian Akademik", 15, 88],
    ["STD-02", "Standar Isi", "Bagian Kurikulum", 12, 82],
    ["STD-03", "Standar Proses", "Bagian Pendidikan", 15, 76],
    ["STD-04", "Standar Pendidik dan Tenaga Kependidikan", "Bagian SDM", 12, 91],
    ["STD-05", "Standar Sarana dan Prasarana", "Bagian Logistik", 12, 69],
    ["STD-06", "Standar Pengelolaan", "Pimpinan Satdik", 12, 84],
    ["STD-07", "Standar Pembiayaan", "Bagian Keuangan", 10, 73],
    ["STD-08", "Standar Penilaian Pendidikan", "Bagian Evaluasi", 12, 86]
  ].map((item, index) => ({ id: item[0].toLowerCase(), code: item[0], name: item[1], owner: item[2], weight: item[3], period: "2027", score: item[4], status: item[4] >= 85 ? "Memenuhi" : item[4] >= 75 ? "Sebagian" : "Gap", indicators: [
    { id: `ind-${index + 1}-1`, name: `Ketersediaan dokumen ${item[1].toLowerCase()}`, parameter: "Dokumen berlaku dan disahkan", weight: 50, score: item[4], status: item[4] >= 85 ? "Memenuhi" : item[4] >= 75 ? "Sebagian" : "Gap", evidenceIds: index < 3 ? [`ev-${index + 1}`] : [] },
    { id: `ind-${index + 1}-2`, name: `Implementasi dan evaluasi ${item[1].toLowerCase()}`, parameter: "Pelaksanaan, monitoring, dan tindak lanjut", weight: 50, score: Math.max(55, item[4] - 4), status: item[4] >= 89 ? "Memenuhi" : item[4] >= 75 ? "Sebagian" : "Gap", evidenceIds: [] }
  ] })),
  evidence: [
    { id: "ev-1", standardId: "std-01", indicatorId: "ind-1-1", name: "Dokumen Profil Lulusan 2027.pdf", version: "2.0", reviewer: "AKBP Maya Permatasari", validUntil: "2027-12-31", status: "Valid" },
    { id: "ev-2", standardId: "std-02", indicatorId: "ind-2-1", name: "Kurikulum SPPK 2027.pdf", version: "1.2", reviewer: "Kombes Pol. Arif Pratama", validUntil: "2027-09-30", status: "Review" },
    { id: "ev-3", standardId: "std-03", indicatorId: "ind-3-1", name: "Laporan Monitoring Pembelajaran.pdf", version: "1.0", reviewer: "Auditor Mutu", validUntil: "2027-06-30", status: "Valid" }
  ],
  actions: [{ id: "capa-1", standardId: "std-05", finding: "Rasio perangkat simulasi belum memenuhi kebutuhan kelas.", owner: "Bagian Logistik", due: "2027-05-30", action: "Pengadaan bertahap dan redistribusi perangkat.", status: "Berjalan", progress: 45 }],
  audits: [{ id: "audit-1", title: "Audit Mutu Semester I 2027", auditor: "AKBP Sari Wulandari", sample: "Program SPPK 2027 • Kelas A", date: "2027-05-10", status: "Response", findings: [{ id: "find-1", standardId: "std-05", severity: "Mayor", text: "Evidence pemeliharaan simulator belum lengkap.", response: "Dokumen dihimpun dan SOP diperbarui.", verification: "Menunggu verifikasi" }] }],
  accreditation: [{ id: "acc-1", program: "SPPK 2027", period: "2027", selfScore: 82, submissionDate: "2027-06-01", visitDate: "2027-07-15", result: "Baik Sekali", validUntil: "2032-07-15", status: "Review Dokumen" }]
};
function qualityKey() { return `presisiQuality:${getWorkspace().id}`; }
function getQualityData() { const saved = localStorage.getItem(qualityKey()); if (saved) { const data = JSON.parse(saved); data.evidence ||= []; data.actions ||= []; data.audits ||= []; data.accreditation ||= []; return data; } const data = JSON.parse(JSON.stringify(qualitySeed)); localStorage.setItem(qualityKey(), JSON.stringify(data)); return data; }
function saveQualityData(data) { localStorage.setItem(qualityKey(), JSON.stringify(data)); }
