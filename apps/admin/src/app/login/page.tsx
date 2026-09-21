import Image from 'next/image';
import { LoginForm } from './login-form';

const valuePillars = ['PRESISI', 'PROFESIONAL', 'BERINTEGRITAS'];
const footerWords = ['PENDIDIKAN', 'KOMPETENSI', 'MUTU', 'PENGAWASAN'];

export const metadata = {
  title: 'Login Admin - LMS PRESISI',
  description: 'Halaman masuk admin LMS PRESISI Lemdiklat Polri',
};

export default function LoginPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#f5f6f8] text-[#1c2d46]">
      <div className="grid min-h-screen lg:grid-cols-[minmax(0,3fr)_minmax(420px,2fr)]">
        <section
          className="relative hidden min-h-screen overflow-hidden bg-[#061b35] lg:grid lg:place-items-center"
          aria-label="Identitas LMS PRESISI Lemdiklat Polri"
        >
          <Image
            src="/login/login-hero-v3.png"
            alt="LMS PRESISI Lemdiklat Polri, platform induk pendidikan Polri"
            fill
            priority
            className="object-contain object-center"
            sizes="60vw"
          />
        </section>

        <section className="relative flex min-h-screen flex-col items-center justify-center bg-[radial-gradient(circle_at_90%_5%,rgba(18,58,112,0.045),transparent_32%),linear-gradient(135deg,rgba(255,255,255,0.3),transparent_45%),#f5f6f8] px-4 py-8 sm:px-6 lg:px-8">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute right-[-70px] top-[9%] hidden h-[290px] w-[290px] rounded-full border border-[#123a70]/5 shadow-[0_0_0_42px_rgba(18,58,112,0.018),0_0_0_84px_rgba(18,58,112,0.012)] sm:block"
          />

          <p className="mb-5 flex flex-wrap items-center justify-center gap-2 text-[8px] font-extrabold tracking-[0.14em] text-[#7d8796] lg:absolute lg:right-[9%] lg:top-7 lg:mb-0">
            {valuePillars.map((item, index) => (
              <span key={item} className="flex items-center gap-2">
                {item}
                {index < valuePillars.length - 1 ? (
                  <i className="h-[3px] w-[3px] rounded-full bg-[#d8ad57]" />
                ) : null}
              </span>
            ))}
          </p>

          <LoginForm />

          <footer className="mt-5 flex max-w-lg flex-wrap items-center justify-center gap-2 text-center text-[7px] font-extrabold tracking-[0.105em] text-[#8c95a2] lg:absolute lg:bottom-5 lg:mt-0">
            {footerWords.map((item, index) => (
              <span key={item} className="flex items-center gap-2">
                {item}
                {index < footerWords.length - 1 ? (
                  <i className="h-[3px] w-[3px] rounded-full bg-[#d8ad57]" />
                ) : null}
              </span>
            ))}
            <span>UNTUK INDONESIA</span>
          </footer>
        </section>
      </div>
    </main>
  );
}
