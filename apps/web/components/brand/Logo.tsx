export function LogoMark({ className = "h-9 w-11" }: { className?: string }) {
  return (
    <svg viewBox="0 0 52 42" className={className} aria-hidden="true">
      <path d="M2 24 26 3l24 21h-9L26 11 11 24z" fill="#F5B400" />
      <path d="M13 38V27l13-11 13 11v11h-8v-8h-10v8z" fill="#FFFFFF" />
    </svg>
  );
}

export function Logo({ tone = "light" }: { tone?: "light" | "dark" }) {
  const text = tone === "light" ? "text-white" : "text-[#071833]";
  return (
    <span className="flex items-center gap-2">
      <LogoMark />
      <span className={`text-lg leading-[1.05] font-extrabold tracking-wide ${text}`}>
        UYCHI
        <br />
        BINOKOR
      </span>
    </span>
  );
}
