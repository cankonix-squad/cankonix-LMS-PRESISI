import Image from 'next/image';
import { LoginForm } from './login-form';

export const metadata = {
  title: 'Login Admin - LMS PRESISI',
  description: 'Halaman masuk admin LMS PRESISI Lemdiklat Polri',
};

export default function LoginPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#061b35] text-white">
      <Image
        src="/login/login-hero-v3.png"
        alt="LMS PRESISI Lemdiklat Polri, platform induk pendidikan Polri"
        fill
        priority
        className="object-contain object-center"
        sizes="100vw"
      />

      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(circle_at_86%_82%,rgba(3,17,36,0.18),transparent_24%),linear-gradient(180deg,rgba(3,17,36,0.04),rgba(3,17,36,0.12))]"
      />

      <section
        className="relative z-10 flex min-h-screen items-end justify-center px-5 py-6 sm:justify-end sm:px-8 sm:py-8 lg:px-12 lg:py-10"
        aria-label="Login Admin LMS PRESISI"
      >
        <div className="flex w-full justify-center sm:w-auto">
          <LoginForm />
        </div>
      </section>

      <h1 className="sr-only">LMS PRESISI Lemdiklat Polri</h1>
    </main>
  );
}
