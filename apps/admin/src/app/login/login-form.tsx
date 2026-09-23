export function LoginForm() {
  return (
    <div className="w-full max-w-[280px] sm:max-w-none">
      <a
        href="/api/auth/login"
        className="inline-flex min-h-12 w-full items-center justify-center gap-3 rounded-full border border-white/25 bg-[#d8ad57] px-6 text-sm font-extrabold text-[#061b35] shadow-[0_16px_34px_rgba(3,17,36,0.28)] transition hover:-translate-y-0.5 hover:bg-[#efc76f] focus:outline-none focus:ring-4 focus:ring-white/35 sm:w-auto sm:min-w-[220px]"
      >
        <span>Masuk</span>
        <span aria-hidden="true" className="text-lg font-black">
          →
        </span>
      </a>
    </div>
  );
}
