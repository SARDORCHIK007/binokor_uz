/** Chizma (ILLUSTRATION). Real Uychi suratlari `public/media/real` ga qo'yilgach almashtiriladi. */
export function WorkerIllustration({ label }: { label: string }) {
  return (
    <svg viewBox="0 0 480 440" role="img" aria-label={label} className="h-full w-full">
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#1b4fa8" />
          <stop offset="1" stopColor="#0a2a63" />
        </linearGradient>
      </defs>
      <rect width="480" height="440" rx="28" fill="url(#sky)" />
      {/* qurilayotgan bino */}
      <g fill="none" stroke="#8fb4f0" strokeOpacity="0.55" strokeWidth="3">
        <rect x="250" y="120" width="190" height="320" />
        <path d="M250 180h190M250 240h190M250 300h190M250 360h190M300 120v320M350 120v320M400 120v320" />
      </g>
      <g fill="#F5B400">
        <rect x="262" y="40" width="10" height="90" />
        <rect x="262" y="40" width="150" height="9" />
        <rect x="402" y="49" width="3" height="40" />
        <rect x="392" y="89" width="22" height="14" rx="2" />
      </g>
      <rect x="0" y="400" width="480" height="40" fill="#071833" opacity="0.55" />
      {/* usta */}
      <g>
        <path d="M70 440c0-70 38-112 100-112s100 42 100 112z" fill="#12306b" />
        <path d="M120 440l8-70h84l8 70z" fill="#F5B400" opacity="0.9" />
        <rect x="120" y="396" width="104" height="8" fill="#e6edf8" opacity="0.9" />
        <circle cx="170" cy="262" r="48" fill="#f1c9a5" />
        <path d="M122 252c0-40 22-62 48-62s48 22 48 62z" fill="#F5B400" />
        <rect x="112" y="248" width="116" height="14" rx="7" fill="#e49f00" />
        <rect x="160" y="196" width="20" height="26" rx="6" fill="#e49f00" />
        <circle cx="154" cy="270" r="4" fill="#3a2a20" />
        <circle cx="188" cy="270" r="4" fill="#3a2a20" />
        <path d="M156 290q14 10 30 0" fill="none" stroke="#3a2a20" strokeWidth="3" strokeLinecap="round" />
      </g>
    </svg>
  );
}
