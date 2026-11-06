export function BuildingPoster({ caption }: { caption: string }) {
  return (
    <figure className="relative h-[56vh] overflow-hidden rounded-lg bg-navy-900 lg:h-full lg:min-h-[420px]">
      <svg viewBox="0 0 320 360" className="h-full w-full" role="img" aria-label={caption}>
        <rect width="320" height="360" fill="#0c1b33" />
        <rect x="70" y="250" width="180" height="18" fill="#1c3a66" />
        <rect x="86" y="168" width="148" height="82" fill="#2563a8" />
        <rect x="98" y="92" width="124" height="76" fill="#3b7bc4" />
        <rect x="118" y="48" width="84" height="44" fill="#2f7d6d" />
        <rect x="150" y="22" width="20" height="26" fill="#c27a00" />
        <rect x="108" y="188" width="22" height="28" fill="#e7eef7" />
        <rect x="148" y="188" width="22" height="28" fill="#e7eef7" />
        <rect x="188" y="188" width="22" height="28" fill="#e7eef7" />
        <rect x="148" y="214" width="24" height="36" fill="#0c1b33" />
      </svg>
      <figcaption className="absolute right-3 bottom-3 left-3 rounded-sm bg-card px-3 py-2 text-xs text-muted">
        {caption}
      </figcaption>
    </figure>
  );
}
