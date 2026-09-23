import Image from 'next/image';
import { LoginForm } from './login-form';

export const metadata = {
  title: 'Login Admin - LMS PRESISI',
  description: 'Halaman masuk admin LMS PRESISI Lemdiklat Polri',
};

export default function LoginPage() {
  return (
    <main className="bg-[#f7f8fa] text-[#102b4c]">
      <section className="relative isolate min-h-[760px] overflow-hidden bg-[#071d38] text-white sm:min-h-[820px]">
        <Image
          src="/login/login-hero-v3.png"
          alt="Gedung Lemdiklat Polri"
          fill
          priority
          className="-z-20 object-cover object-[64%_center] opacity-65 lg:object-[72%_center]"
          sizes="100vw"
        />
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,#071d38_0%,rgba(7,29,56,.96)_35%,rgba(7,29,56,.48)_68%,rgba(7,29,56,.7)_100%)]" />
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(0deg,#071d38_0%,transparent_38%)]" />

        <header className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-5 py-5 sm:px-8 lg:px-10">
          <a
            href="#beranda"
            className="flex items-center gap-3"
            aria-label="LMS PRESISI beranda"
          >
            <Image
              src="/login/logo-lemdiklat-polri.png"
              alt=""
              width={42}
              height={50}
              className="h-11 w-auto object-contain"
            />
            <span className="border-l border-white/25 pl-3 text-xs font-black uppercase leading-tight tracking-[0.14em] sm:text-sm">
              LMS <span className="text-[#d5aa59]">PRESISI</span>
              <span className="block text-[9px] font-medium tracking-[0.18em] text-white/60">
                LEMDIKLAT POLRI
              </span>
            </span>
          </a>
          <nav
            className="hidden items-center gap-7 text-xs font-bold text-white/75 lg:flex"
            aria-label="Navigasi utama"
          >
            <a href="#beranda" className="text-[#d5aa59]">
              Beranda
            </a>
            <a href="#tentang" className="transition hover:text-white">
              Tentang
            </a>
            <a href="#fitur" className="transition hover:text-white">
              Fitur
            </a>
            <a href="#keunggulan" className="transition hover:text-white">
              Keunggulan
            </a>
            <a href="#berita" className="transition hover:text-white">
              Berita
            </a>
            <a href="#kontak" className="transition hover:text-white">
              Kontak
            </a>
          </nav>
          <div className="flex items-center gap-3">
            <a
              href="/api/auth/login"
              className="hidden rounded-full border border-[#d5aa59] px-5 py-2.5 text-xs font-extrabold text-[#f3d18a] transition hover:bg-[#d5aa59] hover:text-[#071d38] sm:inline-flex"
            >
              Masuk
            </a>
            <details className="relative lg:hidden">
              <summary className="cursor-pointer list-none rounded-full border border-white/30 px-4 py-2 text-xs font-bold">
                Menu
              </summary>
              <div className="absolute right-0 top-12 z-30 grid min-w-44 gap-1 rounded-2xl bg-white p-2 text-sm font-bold text-[#102b4c] shadow-2xl">
                <a
                  href="#tentang"
                  className="rounded-xl px-3 py-2 hover:bg-[#f0f3f7]"
                >
                  Tentang
                </a>
                <a
                  href="#fitur"
                  className="rounded-xl px-3 py-2 hover:bg-[#f0f3f7]"
                >
                  Fitur
                </a>
                <a
                  href="#berita"
                  className="rounded-xl px-3 py-2 hover:bg-[#f0f3f7]"
                >
                  Berita
                </a>
                <a
                  href="/api/auth/login"
                  className="mt-1 rounded-xl bg-[#c99b45] px-3 py-2 text-center"
                >
                  Masuk
                </a>
              </div>
            </details>
          </div>
        </header>

        <div
          id="beranda"
          className="mx-auto flex max-w-7xl px-5 pb-36 pt-24 sm:px-8 sm:pt-32 lg:px-10 lg:pt-36"
        >
          <div className="max-w-2xl">
            <p className="mb-5 flex items-center gap-3 text-xs font-bold uppercase tracking-[0.3em] text-[#d5aa59]">
              <span className="h-px w-8 bg-[#d5aa59]" /> Platform Induk
              Pendidikan POLRI
            </p>
            <h1 className="max-w-3xl text-4xl font-black uppercase leading-[1.03] tracking-tight sm:text-6xl lg:text-7xl">
              LMS PRESISI
              <br />
              <span className="text-[#d5aa59]">LEMDIKLAT POLRI</span>
            </h1>
            <p className="mt-7 max-w-xl text-base leading-7 text-white/75 sm:text-lg">
              Transformasi digital pendidikan untuk membentuk insan Bhayangkara
              yang Presisi, profesional, modern, dan terpercaya.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-4">
              <LoginForm />
              <a
                href="#tentang"
                className="inline-flex min-h-14 items-center rounded-full border border-white/35 px-7 text-sm font-bold text-white transition hover:border-[#d5aa59] hover:text-[#f3d18a]"
              >
                Tentang LMS <span className="ml-3">↓</span>
              </a>
            </div>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 border-t border-white/15 bg-[#071d38]/75 backdrop-blur-sm">
          <div className="mx-auto grid max-w-7xl grid-cols-2 divide-x divide-white/15 px-5 py-5 sm:grid-cols-4 sm:px-8 lg:px-10">
            <Stat value="500+" label="Institusi Pendidikan" />
            <Stat value="200.000+" label="Pengguna Aktif" />
            <Stat value="50+" label="Program Pendidikan" />
            <Stat value="100%" label="Terintegrasi" />
          </div>
        </div>
      </section>

      <section
        id="tentang"
        className="mx-auto grid max-w-7xl gap-12 px-5 py-20 sm:px-8 lg:grid-cols-[1fr_.85fr] lg:items-center lg:px-10 lg:py-28"
      >
        <div>
          <p className="text-xs font-black uppercase tracking-[0.25em] text-[#bd8c37]">
            Tentang LMS PRESISI
          </p>
          <h2 className="mt-4 text-3xl font-black leading-tight text-[#102b4c] sm:text-5xl">
            Transformasi Digital
            <br />
            Pendidikan POLRI
          </h2>
          <p className="mt-6 max-w-xl leading-8 text-[#607086]">
            LMS PRESISI hadir sebagai platform pembelajaran terintegrasi yang
            menghubungkan seluruh ekosistem pendidikan POLRI. Belajar lebih
            mudah, terukur, dan berdampak.
          </p>
          <a
            href="#fitur"
            className="mt-7 inline-flex font-extrabold text-[#a97827]"
          >
            Jelajahi platform <span className="ml-2">→</span>
          </a>
        </div>
        <div className="relative min-h-[320px] overflow-hidden rounded-[2rem] bg-[#102b4c] p-5 shadow-2xl sm:min-h-[390px]">
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[#d5aa59]/20 blur-2xl" />
          <div className="relative h-full rounded-2xl border border-white/15 bg-white/10 p-5 backdrop-blur">
            <div className="flex items-center justify-between border-b border-white/15 pb-4">
              <span className="text-xs font-bold text-white/70">
                DASHBOARD LMS PRESISI
              </span>
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
            </div>
            <div className="mt-6 grid grid-cols-3 gap-3">
              <div className="rounded-xl bg-white/10 p-3">
                <span className="text-[10px] text-white/60">Kelas Aktif</span>
                <strong className="mt-2 block text-2xl text-white">128</strong>
              </div>
              <div className="rounded-xl bg-[#d5aa59] p-3 text-[#102b4c]">
                <span className="text-[10px]">Peserta</span>
                <strong className="mt-2 block text-2xl">24.8K</strong>
              </div>
              <div className="rounded-xl bg-white/10 p-3">
                <span className="text-[10px] text-white/60">Progress</span>
                <strong className="mt-2 block text-2xl text-white">86%</strong>
              </div>
            </div>
            <div className="mt-5 rounded-xl bg-white p-4">
              <div className="flex items-end gap-2">
                <span className="h-12 w-1/6 rounded-t bg-[#d5aa59]" />
                <span className="h-20 w-1/6 rounded-t bg-[#d5aa59]" />
                <span className="h-16 w-1/6 rounded-t bg-[#d5aa59]" />
                <span className="h-28 w-1/6 rounded-t bg-[#102b4c]" />
                <span className="h-24 w-1/6 rounded-t bg-[#d5aa59]" />
                <span className="h-32 w-1/6 rounded-t bg-[#102b4c]" />
              </div>
              <p className="mt-3 text-[10px] font-bold text-[#607086]">
                Performa pembelajaran terukur
              </p>
            </div>
          </div>
        </div>
      </section>

      <section
        id="keunggulan"
        className="bg-[#eef2f6] px-5 py-20 sm:px-8 lg:px-10 lg:py-24"
      >
        <div className="mx-auto max-w-7xl">
          <div className="max-w-2xl">
            <p className="text-xs font-black uppercase tracking-[0.25em] text-[#bd8c37]">
              Satu platform, banyak peran
            </p>
            <h2 className="mt-4 text-3xl font-black text-[#102b4c] sm:text-5xl">
              Dirancang untuk seluruh ekosistem pendidikan
            </h2>
          </div>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <RoleCard
              icon="⌘"
              title="Administrator"
              text="Kelola data, organisasi, akses, dan operasional pendidikan."
            />
            <RoleCard
              icon="◈"
              title="Pendidik"
              text="Rancang pembelajaran, evaluasi, dan pantau perkembangan peserta."
            />
            <RoleCard
              icon="◎"
              title="Peserta Didik"
              text="Akses materi, tugas, ujian, dan progres belajar dalam satu tempat."
            />
            <RoleCard
              icon="◉"
              title="Pimpinan"
              text="Dapatkan insight dan laporan strategis untuk keputusan yang tepat."
            />
          </div>
        </div>
      </section>

      <section
        id="fitur"
        className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:px-10 lg:py-28"
      >
        <div className="text-center">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-[#bd8c37]">
            Fitur unggulan
          </p>
          <h2 className="mt-4 text-3xl font-black text-[#102b4c] sm:text-5xl">
            Semua yang dibutuhkan untuk berkembang
          </h2>
        </div>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <Feature
            icon="▣"
            title="Pembelajaran Terintegrasi"
            text="Kelola materi, aktivitas, kelas, dan progres pembelajaran secara menyeluruh."
          />
          <Feature
            icon="✓"
            title="Evaluasi & Asesmen"
            text="Ujian dan penilaian yang terukur untuk mendukung standar kompetensi."
          />
          <Feature
            icon="⌁"
            title="Data & Analitik"
            text="Ubah data pendidikan menjadi insight yang mudah dipahami dan ditindaklanjuti."
          />
          <Feature
            icon="♧"
            title="Kolaborasi Ekosistem"
            text="Hubungkan administrator, pendidik, peserta didik, dan pimpinan."
          />
          <Feature
            icon="◌"
            title="Akses Aman"
            text="Otentikasi terpusat dan pengelolaan akses berbasis kewenangan."
          />
          <Feature
            icon="↗"
            title="Siap Bertumbuh"
            text="Arsitektur modern yang siap mendukung kebutuhan pendidikan POLRI."
          />
        </div>
      </section>

      <section
        id="berita"
        className="bg-[#f1f4f7] px-5 py-20 sm:px-8 lg:px-10 lg:py-24"
      >
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.25em] text-[#bd8c37]">
                Informasi terkini
              </p>
              <h2 className="mt-4 text-3xl font-black text-[#102b4c] sm:text-5xl">
                Berita & kegiatan
              </h2>
            </div>
            <a href="/api/auth/login" className="font-extrabold text-[#a97827]">
              Masuk untuk melihat lebih banyak →
            </a>
          </div>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            <News
              title="LMS PRESISI untuk Pendidikan POLRI yang Adaptif"
              label="INOVASI"
            />
            <News
              title="Membangun budaya belajar berkelanjutan"
              label="PENDIDIKAN"
            />
            <News
              title="Kolaborasi untuk insan Bhayangkara unggul"
              label="KEGIATAN"
            />
          </div>
        </div>
      </section>

      <footer
        id="kontak"
        className="bg-[#071d38] px-5 py-12 text-white sm:px-8 lg:px-10"
      >
        <div className="mx-auto grid max-w-7xl gap-8 sm:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-3">
              <Image
                src="/login/logo-lemdiklat-polri.png"
                alt=""
                width={38}
                height={44}
                className="h-10 w-auto object-contain"
              />
              <span className="text-sm font-black uppercase tracking-[0.16em]">
                LMS <span className="text-[#d5aa59]">PRESISI</span>
              </span>
            </div>
            <p className="mt-5 max-w-sm text-sm leading-6 text-white/55">
              Platform Induk Pendidikan POLRI. Membangun masa depan pendidikan
              yang Presisi.
            </p>
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#d5aa59]">Navigasi</h3>
            <div className="mt-4 grid gap-2 text-sm text-white/60">
              <a href="#tentang">Tentang LMS</a>
              <a href="#fitur">Fitur unggulan</a>
              <a href="#berita">Berita</a>
            </div>
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#d5aa59]">Akses</h3>
            <p className="mt-4 text-sm leading-6 text-white/60">
              Gunakan akun SSO resmi untuk mengakses portal LMS PRESISI.
            </p>
            <a
              href="/api/auth/login"
              className="mt-4 inline-block text-sm font-bold text-white"
            >
              Masuk ke LMS →
            </a>
          </div>
        </div>
        <div className="mx-auto mt-10 max-w-7xl border-t border-white/10 pt-5 text-xs text-white/40">
          © 2026 Lemdiklat Polri. LMS PRESISI.
        </div>
      </footer>
    </main>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="px-3 text-center first:pl-0 last:pr-0 sm:px-6">
      <strong className="block text-xl font-black text-[#d5aa59] sm:text-2xl">
        {value}
      </strong>
      <span className="mt-1 block text-[10px] text-white/55 sm:text-xs">
        {label}
      </span>
    </div>
  );
}

function RoleCard({
  icon,
  title,
  text,
}: {
  icon: string;
  title: string;
  text: string;
}) {
  return (
    <article className="rounded-2xl bg-white p-6 shadow-[0_10px_30px_rgba(16,43,76,.06)] transition hover:-translate-y-1">
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#e9d6ae] text-xl font-black text-[#8f6824]">
        {icon}
      </span>
      <h3 className="mt-5 font-black text-[#102b4c]">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-[#718096]">{text}</p>
    </article>
  );
}

function Feature({
  icon,
  title,
  text,
}: {
  icon: string;
  title: string;
  text: string;
}) {
  return (
    <article className="rounded-2xl border border-[#e2e8f0] bg-white p-6">
      <span className="text-2xl font-black text-[#bd8c37]">{icon}</span>
      <h3 className="mt-5 font-black text-[#102b4c]">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-[#718096]">{text}</p>
    </article>
  );
}

function News({ title, label }: { title: string; label: string }) {
  return (
    <article className="overflow-hidden rounded-2xl bg-white shadow-[0_8px_24px_rgba(16,43,76,.05)]">
      <div className="h-36 bg-[linear-gradient(135deg,#102b4c,#3d607d)] p-5">
        <span className="rounded-full bg-[#d5aa59] px-3 py-1 text-[10px] font-black text-[#102b4c]">
          {label}
        </span>
      </div>
      <div className="p-5">
        <h3 className="font-black leading-6 text-[#102b4c]">{title}</h3>
        <p className="mt-4 text-xs font-bold text-[#bd8c37]">Selengkapnya →</p>
      </div>
    </article>
  );
}
