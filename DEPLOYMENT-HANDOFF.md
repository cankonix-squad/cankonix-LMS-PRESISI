# Deployment Handoff — LMS PRESISI

Dokumen ini mencatat pekerjaan deployment yang sudah dilakukan di VPS agar developer berikutnya dapat melanjutkan dari kondisi aktual.

## Target deployment

- VPS: `187.77.127.202`
- SSH alias: `cankonix-hunter`
- Folder aplikasi: `/root/cankonix-node/apps/cankonix-lms-lemdiklat`
- Repository: `https://github.com/cankonix-squad/cankonix-LMS-PRESISI`
- Reverse proxy: Traefik container `cankonix-traefik`
- Docker network proxy: `cankonix-proxy`

## URL aktif

- Main/Admin: `https://lms-presisi.digitallearningcenter.id`
- Admin: `https://admin.lms-presisi.digitallearningcenter.id`
- Educator: `https://educator.lms-presisi.digitallearningcenter.id`
- Student: `https://student.lms-presisi.digitallearningcenter.id`
- Executive: `https://executive.lms-presisi.digitallearningcenter.id`
- API: `https://api.lms-presisi.digitallearningcenter.id`
- Keycloak: `https://auth.lms-presisi.digitallearningcenter.id`

Semua record DNS `A` mengarah ke `187.77.127.202`. Smoke test terakhir menunjukkan seluruh frontend HTTP `200`, API health HTTP `200`, dan OpenID configuration Keycloak HTTP `200`.

## Service production

Compose production berada di `docker-compose.production.yml` dan menjalankan:

- `admin` — port internal `3000`
- `educator` — port internal `3001`
- `student` — port internal `3002`
- `executive` — port internal `3003`
- `api` — port internal `4000`
- `postgres`
- `redis`
- `minio`
- `keycloak-db`
- `keycloak`

Data persisten berada pada volume Docker:

- `cankonix-lms-lemdiklat_postgres-data`
- `cankonix-lms-lemdiklat_keycloak-db-data`
- `cankonix-lms-lemdiklat_minio-data`

File environment production berada hanya di VPS pada:

`/root/cankonix-node/apps/cankonix-lms-lemdiklat/.env`

Jangan commit atau menyalin file tersebut ke repository.

## Authentication

Realm Keycloak: `lemdiklat`

Issuer:

`https://auth.lms-presisi.digitallearningcenter.id/realms/lemdiklat`

Client OIDC frontend:

- `lms-admin`
- `lms-educator`
- `lms-student`
- `lms-executive`

Setiap client sudah memiliki callback URL portal masing-masing dan audience mapper `lemdiklat-api`.

Portal memiliki route:

- `/api/auth/login`
- `/api/auth/callback`
- `/api/auth/logout`

Token disimpan pada cookie HttpOnly `lms_access_token`. API client admin, educator, dan student membaca token tersebut dari cookie server-side.

## Akun bootstrap

Akun awal sudah dibuat di Keycloak realm `lemdiklat` dan dipetakan ke tabel `persons` serta `user_accounts`:

- Username: `bootstrap-admin`
- Email: `bootstrap-admin@digitallearningcenter.id`
- Personnel number: `BOOTSTRAP-ADMIN`

Password awal diberikan secara terpisah kepada pemilik deployment. Password harus diganti setelah login pertama. File kredensial bootstrap sementara di VPS:

- `/root/cankonix-node/apps/cankonix-lms-lemdiklat/.bootstrap-admin-password`
- `/root/cankonix-node/apps/cankonix-lms-lemdiklat/.bootstrap-admin-id`

File tersebut memiliki permission terbatas dan tidak boleh masuk Git.

## Database

Seluruh migration Prisma yang tersedia pada repository sudah dijalankan dengan:

```bash
/app/node_modules/.bin/prisma migrate deploy --schema=/app/prisma/schema.prisma
```

API health yang sudah diverifikasi:

```text
GET https://api.lms-presisi.digitallearningcenter.id/api/v1/health
200 {"status":"ok"}
```

Endpoint protected juga sudah diuji menggunakan token bootstrap dan mengembalikan `200`.

## Perubahan deployment/source

Perubahan lokal yang perlu dipertahankan:

- `docker-compose.production.yml` menambahkan empat frontend, API, PostgreSQL, Redis, MinIO, Keycloak, router Traefik, dan environment OIDC.
- `apps/api/Dockerfile` menjalankan `prisma generate` sebelum build dan setelah deploy package agar Prisma Client tersedia pada runtime image.
- Portal frontend memiliki route login/callback/logout OIDC.
- API client portal membaca access token dari cookie HttpOnly.
- Shell Admin, Educator, Student, dan Executive memiliki tombol Masuk/Keluar.

Perubahan tersebut saat ini ada di workspace lokal dan sudah disinkronkan ke folder deployment VPS. Commit ke GitHub perlu dilakukan sebagai pekerjaan repository berikutnya.

## Cara operasi umum di VPS

Masuk ke server:

```bash
ssh cankonix-hunter
cd /root/cankonix-node/apps/cankonix-lms-lemdiklat
```

Cek status:

```bash
docker compose -f docker-compose.production.yml ps
```

Deploy ulang setelah perubahan source:

```bash
docker compose -f docker-compose.production.yml up -d --build
```

Cek log API:

```bash
docker logs --tail 100 cankonix-lms-lemdiklat-api
```

## Task lanjutan

- Commit dan push perubahan deployment/OIDC ke GitHub.
- Buat role dan permission awal untuk akun bootstrap melalui API atau seed resmi.
- Tambahkan provisioning user Keycloak dan `UserAccount` melalui workflow admin, bukan SQL manual.
- Tambahkan refresh token atau mekanisme session renewal sebelum access token kedaluwarsa.
- Tambahkan logout terpusat ke endpoint logout Keycloak jika diperlukan.
- Tambahkan konfigurasi backup PostgreSQL, Keycloak, dan MinIO.
- Tambahkan healthcheck Docker Compose untuk API, database, Redis, MinIO, dan Keycloak.
- Perbaiki warning Prisma terkait OpenSSL pada image Node production dengan memasang OpenSSL atau memilih base image yang sesuai.
- Jalankan lint, typecheck, test, dan build dari workspace sebelum setiap deployment.
- Tambahkan CI/CD agar deployment tidak lagi memerlukan sinkronisasi manual dari laptop.
- Jangan menghapus file `.env`, `.bootstrap-admin-password`, atau `.bootstrap-admin-id` saat melakukan sinkronisasi ke VPS.
