# LMS Lemdiklat Polri Presisi
## Master Blueprint v1

**Tagline:** Satu Sistem • Satu Data • Satu Ekosistem Pendidikan Polri

---

## 1. Visi

**LMS Lemdiklat Polri Presisi** adalah platform induk pendidikan Polri yang menghubungkan seluruh lembaga pendidikan, proses pembelajaran, sertifikasi kompetensi, layanan kolaborasi, perpustakaan digital, logistik, aset, serta monitoring nasional ke dalam satu ekosistem yang terintegrasi, bertahap, dan mudah dioperasikan.

Platform ini tidak hanya berfungsi sebagai LMS konvensional, tetapi sebagai **Education Operating Platform** untuk mendukung penyelenggaraan pendidikan Polri secara nasional.

---

## 2. Prinsip Utama

1. **Satu Sistem**  
   Seluruh LMS unit menggunakan core platform yang sama.

2. **Satu Data**  
   Data peserta, Gadik, program pendidikan, kurikulum, kelas, kompetensi, aset, dan sertifikasi dikelola secara terstandar.

3. **Satu Ekosistem Pendidikan**  
   Seluruh lembaga pendidikan dapat tetap memiliki identitas LMS masing-masing, namun tetap berada dalam ekosistem LMS Lemdiklat Polri Presisi.

4. **Terintegrasi Bertahap**  
   Integrasi dengan sistem existing dilakukan secara bertahap tanpa harus mengganti seluruh sistem sekaligus.

5. **Mudah Dioperasikan**  
   Antarmuka sederhana, role-based, dan berorientasi kebutuhan pengguna.

6. **Scalable & Modular**  
   Sistem dapat berkembang dari prototype menjadi platform enterprise tanpa mengubah konsep dasarnya.

---

# 3. Arsitektur Konseptual

## Layer 1 — LMS Unit / Lembaga Pendidikan

LMS Lemdiklat Polri Presisi menjadi platform induk yang menaungi LMS masing-masing lembaga pendidikan.

### LMS Unit Utama
- LMS STIK
- LMS Sespim Polri
  - Sespimti
  - Sespimmen
  - Sespimma
  - SPPK
- LMS AKPOL
- LMS Sepolwan
- LMS Sekolah Polisi / SPN
- LMS Pusdik
- LMS unit pendidikan lainnya

Setiap LMS Unit memiliki workspace sendiri, identitas sendiri, serta kewenangan pengelolaan pendidikan masing-masing, tetapi tetap menggunakan platform dan data model yang terstandar.

### Capability di LMS Unit
- Education Management
- Learning Management
- Assessment
- Collaboration
- Master Library
- Logistic & Asset Management

---

## Layer 2 — Shared Platform Services

Shared Platform Services merupakan layanan bersama yang dapat digunakan oleh seluruh LMS Unit.

### A. Collaboration
Fungsi:
- Chat
- Forum Diskusi
- Pengumuman
- Virtual Class
- Zoom / Meeting Integration

### B. Master Library
Fungsi:
- Kurikulum
- Modul
- Materi Pembelajaran
- Video
- Bank Soal
- Referensi
- Repository Pengetahuan

### C. Logistic & Asset Management
Fungsi:
- Sarana dan Prasarana
- Ruang Kelas
- Perangkat
- Peralatan Pendidikan
- Logistik
- Monitoring Pemanfaatan Aset

### D. LSP Sertifikasi & Kompetensi
Berfungsi sebagai layanan lintas lembaga untuk:
- Skema Sertifikasi
- Unit Kompetensi
- Asesmen Kompetensi
- Asesor
- Jadwal Uji Kompetensi
- Hasil Asesmen
- Status Kompeten / Belum Kompeten
- Sertifikat Kompetensi
- Rekam Sertifikasi ke Digital Passport

LSP tidak diposisikan sebagai LMS Unit, tetapi sebagai **cross-platform certification & competency service**.

---

# 4. Layer 3 — National Layer

## A. Command Center

Command Center digunakan oleh pimpinan Lemdiklat untuk memperoleh gambaran nasional secara real-time atau near real-time.

### Informasi Utama
- Jumlah lembaga pendidikan aktif
- Program pendidikan aktif
- Peserta aktif
- Gadik aktif
- Kelas aktif
- Kehadiran
- Progress pembelajaran
- Assessment
- Sertifikasi kompetensi
- Status program
- Kinerja lembaga pendidikan
- Persebaran nasional berbasis peta

## B. Single Data & Integration

Lapisan ini menjadi fondasi data nasional.

### Fungsi
- Master Data Nasional
- Konsolidasi data LMS Unit
- Standardisasi data
- Single Identity
- Integration Hub
- API Gateway
- Audit Trail
- Sinkronisasi sistem existing
- Reporting nasional

---

# 5. Role Utama

## 1. Pimpinan Lemdiklat
Fokus:
- Dashboard Nasional
- Monitoring seluruh lembaga pendidikan
- Performance
- Command Center
- Reporting
- Analytics

## 2. Admin Pusat
Fokus:
- Master Data
- Konfigurasi lembaga
- Program pendidikan
- Integrasi
- Governance
- Monitoring

## 3. Admin LMS Unit
Fokus:
- Program pendidikan
- Kurikulum
- Kelas
- Jadwal
- Gadik
- Peserta
- Pengelolaan learning operation

## 4. Gadik
Fokus:
- Course
- Materi
- Assignment
- Quiz
- Virtual Class
- Kehadiran
- Nilai
- Monitoring peserta

## 5. Peserta Didik
Fokus:
- My Learning
- My Courses
- Materi
- Assignment
- Quiz/Ujian
- Discussion
- Virtual Class
- Progress
- Digital Passport

## 6. Asesor LSP
Fokus:
- Skema sertifikasi
- Asesi
- Jadwal asesmen
- Assessment kompetensi
- Hasil asesmen
- Sertifikasi

---

# 6. Navigation Model

## A. Pimpinan / Pusat
- Dashboard Nasional
- Lembaga Pendidikan
- Program Nasional
- Monitoring
- Master Library
- Logistic & Asset
- LSP & Kompetensi
- Command Center
- Reporting
- Integration

## B. Admin LMS Unit
- Dashboard
- Education Management
  - Lembaga / Unit
  - Program Pendidikan
  - Kurikulum
  - Kelas
  - Jadwal
  - Gadik
  - Peserta Didik
- Learning
- Assessment
- Collaboration
- Master Library
- Logistic & Asset

## C. Peserta
- Dashboard
- My Learning
- My Courses
- Materi Pembelajaran
- Assignment
- Quiz / Ujian
- Attendance
- Discussion Forum
- Virtual Class
- Learning Progress
- Announcement
- Digital Passport

## D. Gadik
- Dashboard
- My Teaching
- Courses
- Materi
- Assignment
- Quiz/Ujian
- Attendance
- Discussion
- Virtual Class
- Assessment
- Nilai
- Peserta

---

# 7. User Flow Utama

## Flow Peserta
Login  
→ Dashboard  
→ My Course  
→ Materi  
→ Virtual Class  
→ Assignment / Quiz  
→ Nilai  
→ Learning Progress  
→ Digital Passport

## Flow Gadik
Login  
→ Dashboard Gadik  
→ My Teaching  
→ Course  
→ Pilih/Upload Materi  
→ Buat Assignment/Quiz  
→ Virtual Class  
→ Attendance  
→ Penilaian  
→ Monitoring Peserta

## Flow Pimpinan
Login  
→ Dashboard Nasional  
→ Peta Persebaran Lembaga  
→ Pilih LMS Unit  
→ Program Pendidikan  
→ Kelas  
→ Peserta / Gadik  
→ Progress / Assessment / Sertifikasi  
→ Command Center

---

# 8. Prototype HTML/CSS — Scope Tahap Awal

Prototype tahap awal berfungsi untuk validasi konsep dan presentasi kepada pimpinan, belum sebagai aplikasi production.

### Fokus
- HTML
- CSS
- JavaScript ringan
- Static JSON / dummy data
- Leaflet untuk peta
- Responsive desktop-first
- Role-based navigation simulation
- Klik antarhalaman
- Tidak membutuhkan backend/database terlebih dahulu

### Halaman Prioritas
1. Login
2. National Dashboard
3. Lembaga Pendidikan
4. Detail LMS Unit
5. Program Pendidikan
6. Detail Program
7. Kurikulum
8. Kelas
9. Jadwal
10. Gadik
11. Peserta Didik
12. LMS Dashboard Peserta
13. Course Detail
14. Materi
15. Assignment
16. Quiz/Ujian
17. Dashboard Gadik
18. Master Library
19. Logistic & Asset
20. LSP Sertifikasi & Kompetensi
21. Command Center
22. Digital Passport

---

# 9. Prinsip UI/UX

- Modern, clean, enterprise-government style
- Dominan navy, white, red accent
- Identitas resmi Lemdiklat Polri
- Sidebar role-based
- Dashboard executive-friendly
- Card, table, chart, map, progress indicator
- Leaflet map untuk persebaran nasional
- Minimum klik
- Mudah dipahami tanpa pelatihan panjang
- Tidak terasa seperti sistem akademik yang rumit

---

# 10. Target Implementasi Bertahap

## Phase 1 — Prototype & Core LMS
- Education Management
- Learning
- Assessment dasar
- Collaboration
- Master Library
- Digital Passport
- Dashboard Pusat

## Phase 2 — Operational Expansion
- Logistic & Asset
- LSP Sertifikasi & Kompetensi
- Advanced Assessment
- Executive Monitoring
- Reporting

## Phase 3 — Integration & Single Data
- Integrasi sistem existing
- Master Data Nasional
- API & Integration Hub
- Single Identity
- Advanced Command Center
- Data Analytics

---

# 11. Positioning

**LMS Lemdiklat Polri Presisi bukan sekadar Learning Management System.**

Platform ini diposisikan sebagai:

> **Platform Induk Pendidikan Polri yang menyatukan LMS lembaga pendidikan, proses belajar, assessment, kolaborasi, knowledge, logistik, aset, sertifikasi kompetensi, serta monitoring nasional ke dalam satu sistem dan satu data.**

---

**Status:** Master Blueprint v1  
**Tahap berikutnya:** PRD Prototype HTML/CSS
