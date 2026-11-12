/** Country flags drawn as small round SVGs (emoji flags do not render on Windows). */
export type CountryCode = "UZ" | "RU" | "GB" | "KR" | "JP" | "DE" | "IT";

export const FLAG_CODES: readonly string[] = ["UZ", "RU", "GB", "KR", "JP", "DE", "IT"];

export function isFlag(code: string): code is CountryCode {
  return FLAG_CODES.includes(code);
}

function Art({ code }: { code: CountryCode }) {
  switch (code) {
    case "RU":
      return (
        <>
          <rect width="24" height="8" fill="#fff" />
          <rect y="8" width="24" height="8" fill="#0039a6" />
          <rect y="16" width="24" height="8" fill="#d52b1e" />
        </>
      );
    case "GB":
      return (
        <>
          <rect width="24" height="24" fill="#012169" />
          <path d="M0 0 24 24M24 0 0 24" stroke="#fff" strokeWidth="4" />
          <path d="M0 0 24 24M24 0 0 24" stroke="#c8102e" strokeWidth="1.6" />
          <path d="M12 0v24M0 12h24" stroke="#fff" strokeWidth="7" />
          <path d="M12 0v24M0 12h24" stroke="#c8102e" strokeWidth="4" />
        </>
      );
    case "JP":
      return (
        <>
          <rect width="24" height="24" fill="#fff" />
          <circle cx="12" cy="12" r="6" fill="#bc002d" />
        </>
      );
    case "DE":
      return (
        <>
          <rect width="24" height="8" fill="#000" />
          <rect y="8" width="24" height="8" fill="#dd0000" />
          <rect y="16" width="24" height="8" fill="#ffce00" />
        </>
      );
    case "IT":
      return (
        <>
          <rect width="8" height="24" fill="#009246" />
          <rect x="8" width="8" height="24" fill="#fff" />
          <rect x="16" width="8" height="24" fill="#ce2b37" />
        </>
      );
    case "KR":
      return (
        <>
          <rect width="24" height="24" fill="#fff" />
          <path d="M6.5 12a5.5 5.5 0 0 1 11 0z" fill="#cd2e3a" />
          <path d="M6.5 12a5.5 5.5 0 0 0 11 0z" fill="#0047a0" />
          <circle cx="9.25" cy="12" r="2.75" fill="#cd2e3a" />
          <circle cx="14.75" cy="12" r="2.75" fill="#0047a0" />
          <g stroke="#000" strokeWidth="1.1">
            <path d="M2.5 4.5l3-2M3.6 6.2l3-2M1.4 2.8l3-2" />
            <path d="M18.5 22.5l3-2M19.6 24l3-2M17.4 21l3-2" />
            <path d="M19 3.5l2.5 2.5M17.5 2l2.5 2.5M20.5 5l2.5 2.5" />
            <path d="M2.5 18l2.5 2.5M4 16.5l2.5 2.5M1 19.5L3.5 22" />
          </g>
        </>
      );
    default:
      return (
        <>
          <rect width="24" height="8" fill="#0099b5" />
          <rect y="8" width="24" height="8" fill="#fff" />
          <rect y="16" width="24" height="8" fill="#1eb53a" />
          <rect y="7.4" width="24" height="1.1" fill="#ce1126" />
          <rect y="15.5" width="24" height="1.1" fill="#ce1126" />
          <circle cx="6.5" cy="4" r="2.1" fill="#fff" />
          <circle cx="7.4" cy="4" r="1.8" fill="#0099b5" />
          <circle cx="10.2" cy="2.6" r="0.5" fill="#fff" />
          <circle cx="12" cy="4" r="0.5" fill="#fff" />
          <circle cx="10.2" cy="5.4" r="0.5" fill="#fff" />
        </>
      );
  }
}

export function Flag({ code, className = "size-5" }: { code: string; className?: string }) {
  if (!isFlag(code)) return null;
  const id = `flag-${code}`;
  return (
    <svg viewBox="0 0 24 24" className={`${className} shrink-0 rounded-full ring-1 ring-black/10`} aria-hidden="true">
      <defs>
        <clipPath id={id}>
          <circle cx="12" cy="12" r="12" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${id})`}>
        <Art code={code} />
      </g>
    </svg>
  );
}
