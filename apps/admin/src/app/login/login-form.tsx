export function LoginForm() {
  return (
    <a
      href="/api/auth/login"
      className="inline-flex min-h-14 items-center justify-center gap-3 rounded-full bg-[#c99b45] px-7 text-sm font-extrabold text-[#071d38] shadow-[0_16px_32px_rgba(7,29,56,0.2)] transition hover:-translate-y-0.5 hover:bg-[#e0b963] focus:outline-none focus:ring-4 focus:ring-[#c99b45]/40"
    >
      <span>Masuk ke LMS</span>
      <span aria-hidden="true" className="text-lg font-black">
        -&gt;
      </span>
    </a>
  );
}
