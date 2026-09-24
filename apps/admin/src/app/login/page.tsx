import Image from 'next/image';
import { LoginForm } from './login-form';

export const metadata = {
  title: 'Login Admin - LMS PRESISI',
  description: 'Halaman masuk admin LMS PRESISI Lemdiklat Polri',
};

const platformPoints = [
  {
    number: '01',
    title: 'Satu Sistem',
    text: 'Integrasi pendidikan dari hulu ke hilir.',
  },
  {
    number: '02',
    title: 'Satu Data',
    text: 'Data akademik untuk keputusan yang lebih baik.',
  },
  {
    number: '03',
    title: 'Satu Ekosistem',
    text: 'Kolaborasi satdik, pendidik, peserta, dan pimpinan.',
  },
  {
    number: '04',
    title: 'Akses SSO',
    text: 'Akses resmi melalui identitas terpusat LMS PRESISI.',
  },
];

const roles = [
  {
    title: 'Administrator',
    portal: 'Portal Admin',
    text: 'Kelola data, pengguna, akses, dan monitoring operasional pendidikan.',
    href: '/api/auth/login',
  },
  {
    title: 'Pendidik',
    portal: 'Portal Educator',
    text: 'Kelola kelas, materi, tugas, evaluasi, dan interaksi peserta didik.',
    href: 'https://educator.lms-presisi.digitallearningcenter.id',
  },
  {
    title: 'Peserta Didik',
    portal: 'Portal Student',
    text: 'Akses materi, tugas, ujian, dan pantau progres belajar secara mandiri.',
    href: 'https://student.lms-presisi.digitallearningcenter.id',
  },
  {
    title: 'Pimpinan',
    portal: 'Portal Executive',
    text: 'Pantau capaian, laporan, dan analitik pendidikan secara real-time.',
    href: 'https://executive.lms-presisi.digitallearningcenter.id',
  },
];

const features: Array<[string, string]> = [
  [
    'Program dan Kurikulum',
    'Kelola struktur program, kurikulum, mata pelajaran, angkatan, dan kelas.',
  ],
  [
    'Pembelajaran',
    'Atur materi, aktivitas, tugas, dan proses belajar secara terpadu.',
  ],
  [
    'Ujian dan Penilaian',
    'Dukung asesmen, bank soal, ujian, grading, dan hasil akhir.',
  ],
  [
    'Pelaporan',
    'Sajikan ringkasan capaian akademik untuk kebutuhan operasional dan pimpinan.',
  ],
  [
    'Sertifikat',
    'Kelola kelulusan, penerbitan, dan validasi sertifikat pendidikan.',
  ],
  [
    'Audit dan Akses',
    'Kendalikan akses berbasis kewenangan dengan jejak audit yang jelas.',
  ],
];

export default function LoginPage() {
  return (
    <main className="bg-[#f6f8fb] font-[Helvetica,Arial,sans-serif] text-[#0c1b33]">
      <section
        id="beranda"
        className="relative isolate overflow-hidden bg-[#061b34] text-white"
      >
        <Image
          src="/login/login-hero-v3.png"
          alt="LMS PRESISI Lemdiklat Polri"
          fill
          priority
          className="-z-30 object-cover object-[62%_center]"
          sizes="100vw"
        />
        <div className="absolute inset-0 -z-20 bg-[linear-gradient(90deg,rgba(6,27,52,1)_0%,rgba(6,27,52,.98)_38%,rgba(6,27,52,.52)_68%,rgba(6,27,52,.76)_100%)]" />
        <div className="absolute inset-y-0 left-0 -z-10 w-[62%] bg-[radial-gradient(circle_at_28%_40%,rgba(8,31,58,.98)_0%,rgba(8,31,58,.9)_34%,rgba(8,31,58,.08)_78%)]" />
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(6,27,52,.62)_0%,rgba(6,27,52,.18)_34%,rgba(6,27,52,.96)_100%)]" />

        <header className="mx-auto flex max-w-7xl items-center justify-between gap-5 px-5 py-5 sm:px-8 lg:px-10">
          <a href="#beranda" className="flex items-center gap-3">
            <Image
              src="/login/logo-lemdiklat-polri.png"
              alt=""
              width={44}
              height={52}
              className="h-11 w-auto object-contain"
            />
            <span className="text-sm font-black uppercase leading-tight tracking-[0.14em]">
              LMS PRESISI
              <span className="block text-xs font-semibold tracking-[0.22em] text-[#d9b768]">
                LEMDIKLAT POLRI
              </span>
            </span>
          </a>

          <nav className="hidden items-center gap-8 text-xs font-bold text-white/75 lg:flex">
            <a href="#beranda" className="text-[#e8bd5d]">
              Beranda
            </a>
            <a href="#tentang" className="transition hover:text-white">
              Tentang
            </a>
            <a href="#peran" className="transition hover:text-white">
              Peran
            </a>
            <a href="#fitur" className="transition hover:text-white">
              Fitur
            </a>
            <a href="#berita" className="transition hover:text-white">
              Berita
            </a>
            <a href="#kontak" className="transition hover:text-white">
              Kontak
            </a>
          </nav>

          <a
            href="/api/auth/login"
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#e2b652] px-6 text-sm font-black text-[#071d38] shadow-[0_18px_40px_rgba(0,0,0,.24)] transition hover:-translate-y-0.5 hover:bg-[#f1cc73] focus:outline-none focus:ring-4 focus:ring-[#e2b652]/35"
          >
            Masuk
            <span className="ml-3 text-base" aria-hidden="true">
              -&gt;
            </span>
          </a>
        </header>

        <div className="mx-auto grid min-h-[660px] max-w-7xl items-center px-5 pb-36 pt-12 sm:px-8 lg:grid-cols-[1fr_.72fr] lg:px-10">
          <div className="max-w-3xl">
            <p className="mb-5 text-xs font-black uppercase tracking-[0.34em] text-white/90">
              Lemdiklat Polri
            </p>
            <h1 className="text-5xl font-black uppercase leading-[0.98] text-white sm:text-6xl lg:text-7xl">
              LMS PRESISI
              <span className="block text-[#e8bd5d]">LEMDIKLAT POLRI</span>
            </h1>
            <p className="mt-5 text-lg font-semibold uppercase tracking-[0.22em] text-white/90">
              Platform Induk Pendidikan POLRI
            </p>
            <span className="mt-5 block h-1 w-20 bg-[#e2b652]" />
            <p className="mt-7 max-w-2xl text-base leading-8 text-white/82 sm:text-lg">
              Ekosistem digital terintegrasi untuk pendidikan, pembelajaran,
              pengelolaan satdik, kompetensi, penjaminan mutu, dan pemantauan
              nasional dalam satu sistem.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-4">
              <LoginForm />
              <a
                href="#tentang"
                className="inline-flex min-h-14 items-center justify-center rounded-xl border border-white/35 px-7 text-sm font-extrabold text-white transition hover:border-[#e2b652] hover:text-[#f5d47e]"
              >
                Tentang LMS
              </a>
            </div>
          </div>

          <div className="hidden self-start pt-20 text-right lg:block">
            <p className="ml-auto max-w-xs text-lg font-black uppercase leading-8 tracking-[0.2em] text-white/72">
              SDM Unggul Polri Presisi Untuk Indonesia Maju
            </p>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 px-5 pb-7 sm:px-8 lg:px-10">
          <div className="mx-auto grid max-w-7xl grid-cols-1 overflow-hidden rounded-xl border border-white/16 bg-[#071d38]/88 shadow-2xl backdrop-blur-md sm:grid-cols-2 lg:grid-cols-4">
            {platformPoints.map((point) => (
              <PlatformPoint key={point.title} {...point} />
            ))}
          </div>
        </div>
      </section>

      <section
        id="tentang"
        className="mx-auto grid max-w-7xl gap-12 px-5 py-20 sm:px-8 lg:grid-cols-[.9fr_1fr] lg:items-center lg:px-10 lg:py-24"
      >
        <div>
          <Eyebrow>Tentang LMS PRESISI</Eyebrow>
          <h2 className="mt-4 text-4xl font-black leading-tight text-[#08172b] sm:text-5xl">
            Transformasi Digital Pendidikan POLRI
          </h2>
          <p className="mt-6 max-w-xl text-base leading-8 text-[#51647c]">
            LMS PRESISI merupakan platform pembelajaran terpadu yang mendukung
            seluruh proses pendidikan di lingkungan Lemdiklat POLRI, mulai dari
            perencanaan program, pelaksanaan pembelajaran, hingga evaluasi dan
            pelaporan.
          </p>
          <a
            href="#fitur"
            className="mt-8 inline-flex min-h-12 items-center rounded-lg bg-[#e2b652] px-6 text-sm font-black text-[#071d38] transition hover:bg-[#f1cc73]"
          >
            Pelajari lebih lanjut
            <span className="ml-3" aria-hidden="true">
              -&gt;
            </span>
          </a>
        </div>

        <div className="relative min-h-[330px] overflow-hidden rounded-xl bg-[#071d38] shadow-[0_24px_70px_rgba(8,23,43,.18)] sm:min-h-[420px]">
          <Image
            src="/login/login-hero-v3.png"
            alt="Gedung Lemdiklat Polri"
            fill
            className="object-cover object-[78%_center] opacity-90"
            sizes="(min-width: 1024px) 48vw, 100vw"
          />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(7,29,56,.12),rgba(7,29,56,.08)_45%,rgba(7,29,56,.74))]" />
          <div className="absolute bottom-8 right-8 max-w-xs rounded-lg border border-white/16 bg-[#071d38]/78 p-5 text-right text-lg font-bold leading-7 text-white backdrop-blur-sm">
            Belajar hari ini untuk pengabdian esok yang lebih baik
          </div>
        </div>
      </section>

      <section
        id="peran"
        className="border-y border-[#dfe7f0] bg-[#f3f7fb] px-5 py-20 sm:px-8 lg:px-10"
      >
        <div className="mx-auto max-w-7xl text-center">
          <Eyebrow>Akses sesuai peran</Eyebrow>
          <h2 className="mt-4 text-4xl font-black text-[#08172b] sm:text-5xl">
            Solusi untuk Setiap Peran
          </h2>
          <div className="mt-12 grid gap-4 text-left sm:grid-cols-2 lg:grid-cols-4">
            {roles.map((role) => (
              <RoleCard key={role.title} {...role} />
            ))}
          </div>
        </div>
      </section>

      <section id="fitur" className="bg-[#061b34] px-5 py-20 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <Eyebrow dark>Ruang lingkup platform</Eyebrow>
              <h2 className="mt-4 text-4xl font-black text-white sm:text-5xl">
                Modul inti LMS PRESISI
              </h2>
            </div>
          </div>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map(([title, text]) => (
              <Feature key={title} title={title} text={text} />
            ))}
          </div>
        </div>
      </section>

      <section id="berita" className="px-5 py-20 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-10 lg:grid-cols-[.85fr_1fr] lg:items-start">
            <div>
              <Eyebrow>Informasi operasional</Eyebrow>
              <h2 className="mt-4 text-4xl font-black text-[#08172b] sm:text-5xl">
                Masuk sesuai kewenangan
              </h2>
              <p className="mt-5 max-w-xl text-base leading-8 text-[#51647c]">
                Akses portal diberikan melalui akun SSO resmi dan assignment
                yang ditetapkan oleh administrator. Hubungi pengelola LMS bila
                akun belum memiliki akses ke portal yang diperlukan.
              </p>
            </div>
            <div className="grid gap-4">
              <OperationalNote
                title="Admin Pusat"
                text="Mengelola foundation data, akses, akademik, pembelajaran, dan operasional sistem."
              />
              <OperationalNote
                title="Pendidik"
                text="Mengakses kelas, materi, tugas, ujian, kehadiran, dan penilaian sesuai penugasan."
              />
              <OperationalNote
                title="Pimpinan"
                text="Melihat laporan dan indikator kinerja sesuai scope organisasi yang diberikan."
              />
            </div>
          </div>
        </div>
      </section>

      <footer
        id="kontak"
        className="bg-[#061b34] px-5 py-12 text-white sm:px-8 lg:px-10"
      >
        <div className="mx-auto grid max-w-7xl gap-8 border-b border-white/10 pb-10 md:grid-cols-[1.2fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-3">
              <Image
                src="/login/logo-lemdiklat-polri.png"
                alt=""
                width={44}
                height={52}
                className="h-11 w-auto object-contain"
              />
              <span className="text-sm font-black uppercase tracking-[0.16em]">
                LMS PRESISI
                <span className="block text-xs text-[#d9b768]">
                  LEMDIKLAT POLRI
                </span>
              </span>
            </div>
            <p className="mt-4 text-sm text-white/58">
              Ilmu, Integritas, Pengabdian.
            </p>
          </div>
          <div className="grid gap-3 text-sm text-white/62">
            <a href="#beranda">Beranda</a>
            <a href="#tentang">Tentang</a>
            <a href="#fitur">Fitur</a>
            <a href="#berita">Berita</a>
          </div>
          <div>
            <p className="text-sm leading-6 text-white/62">
              Gunakan akun SSO resmi untuk mengakses portal LMS PRESISI.
            </p>
            <a
              href="/api/auth/login"
              className="mt-4 inline-flex font-black text-[#e2b652]"
            >
              Masuk ke LMS -&gt;
            </a>
          </div>
        </div>
        <div className="mx-auto mt-6 flex max-w-7xl flex-wrap justify-between gap-4 text-xs text-white/42">
          <p>2026 Lemdiklat POLRI. All rights reserved.</p>
          <p>Kebijakan Privasi | Syarat & Ketentuan | Bantuan</p>
        </div>
      </footer>
    </main>
  );
}

function Eyebrow({
  children,
  dark = false,
}: {
  children: string;
  dark?: boolean;
}) {
  return (
    <p
      className={`inline-flex items-center gap-4 text-xs font-black uppercase tracking-[0.24em] ${
        dark ? 'text-[#e2b652]' : 'text-[#8f6824]'
      }`}
    >
      <span className="h-px w-12 bg-[#e2b652]" />
      {children}
    </p>
  );
}

function PlatformPoint({
  number,
  title,
  text,
}: {
  number: string;
  title: string;
  text: string;
}) {
  return (
    <div className="flex items-start gap-4 border-b border-white/10 px-5 py-5 last:border-b-0 sm:even:border-l lg:border-b-0 lg:border-l lg:first:border-l-0 lg:px-7">
      <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded border border-[#e2b652]/50 text-xs font-black text-[#e2b652]">
        {number}
      </span>
      <div>
        <strong className="block text-sm font-black text-white">{title}</strong>
        <span className="mt-1 block text-xs leading-5 text-white/64">
          {text}
        </span>
      </div>
    </div>
  );
}

function RoleCard({
  portal,
  title,
  text,
  href,
}: {
  portal: string;
  title: string;
  text: string;
  href: string;
}) {
  return (
    <article className="rounded-lg border border-[#dbe5ef] bg-white p-6 text-left shadow-[0_10px_32px_rgba(8,23,43,.06)]">
      <div className="flex items-center justify-between gap-4">
        <span className="block h-1 w-12 bg-[#e2b652]" />
        <span className="rounded-full border border-[#dbe5ef] px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-[#64748b]">
          {portal}
        </span>
      </div>
      <h3 className="mt-5 text-lg font-black text-[#08172b]">{title}</h3>
      <p className="mt-3 min-h-20 text-sm leading-6 text-[#51647c]">{text}</p>
      <a
        href={href}
        className="mt-5 inline-flex text-sm font-black text-[#1263b0]"
      >
        Masuk sebagai {title} -&gt;
      </a>
    </article>
  );
}

function Feature({ title, text }: { title: string; text: string }) {
  return (
    <article className="rounded-lg border border-white/12 bg-white/[0.055] p-5 text-white">
      <h3 className="mt-5 text-sm font-black">{title}</h3>
      <p className="mt-3 text-xs leading-6 text-white/68">{text}</p>
    </article>
  );
}

function OperationalNote({ title, text }: { title: string; text: string }) {
  return (
    <article className="rounded-lg border border-[#dbe5ef] bg-white p-5 shadow-sm">
      <h3 className="text-base font-black text-[#08172b]">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-[#51647c]">{text}</p>
    </article>
  );
}
