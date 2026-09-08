const competencySeed = {
  schemes: [
    { id: "scheme-lead-2", code: "SKM-KP-02", name: "Kepemimpinan Strategis Level 2", level: "Level 2", status: "Aktif", validYears: 3, units: [
      { id: "unit-lead-1", code: "KOM-KP.01", name: "Menganalisis Lingkungan Strategis", criteria: "Analisis data, risiko, dan stakeholder" },
      { id: "unit-lead-2", code: "KOM-KP.02", name: "Menetapkan Keputusan Strategis", criteria: "Alternatif, keputusan, mitigasi, dan komunikasi" }
    ]},
    { id: "scheme-ops-1", code: "SKM-OPS-01", name: "Perencanaan Operasi Kepolisian", level: "Level 1", status: "Aktif", validYears: 3, units: [
      { id: "unit-ops-1", code: "KOM-OPS.01", name: "Menyusun Rencana Operasi", criteria: "Situasi, sasaran, cara bertindak, dan kendali" }
    ]}
  ],
  assessors: [
    { id: "assessor-1", name: "Kombes Pol. Dr. Ratna Wibowo", license: "MET.000.012345", status: "Aktif" },
    { id: "assessor-2", name: "AKBP Indra Permana", license: "MET.000.067890", status: "Aktif" }
  ],
  assessments: [
    { id: "asm-lsp-1", schemeId: "scheme-lead-2", participantId: "p-1", assessorId: "assessor-1", date: "2027-04-18", method: "Observasi & Portofolio", status: "Dijadwalkan", unitResults: {} },
    { id: "asm-lsp-2", schemeId: "scheme-ops-1", participantId: "p-2", assessorId: "assessor-2", date: "2027-03-28", method: "Praktik", status: "Review", unitResults: { "unit-ops-1": { evidence: "Dokumen Rencana Operasi.pdf", checklist: true, note: "Seluruh kriteria terpenuhi.", decision: "Kompeten" } } }
  ],
  certificates: [
    { id: "cert-1", assessmentId: "asm-history-1", participantId: "p-1", schemeId: "scheme-ops-1", number: "LSP-POLRI-2026-00814", issueDate: "2026-06-20", expiryDate: "2029-06-20", status: "Terbit", verified: true }
  ]
};
function competencyKey() { return `presisiCompetency:${getWorkspace().id}`; }
function getCompetencyData() { const saved = localStorage.getItem(competencyKey()); if (saved) { const data = JSON.parse(saved); data.certificates ||= []; data.assessments.forEach(item => { item.unitResults ||= {}; item.method ||= "Observasi"; }); return data; } const data = JSON.parse(JSON.stringify(competencySeed)); localStorage.setItem(competencyKey(), JSON.stringify(data)); return data; }
function saveCompetencyData(data) { localStorage.setItem(competencyKey(), JSON.stringify(data)); }
