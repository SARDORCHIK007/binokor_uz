type Site = { id: string; name: string; lat: number; lon: number; progress: number };

export function SiteMap({ sites }: { sites: Site[] }) {
  if (sites.length === 0) {
    return null;
  }
  const lats = sites.map((site) => site.lat);
  const lons = sites.map((site) => site.lon);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);
  const spanLat = maxLat - minLat || 0.01;
  const spanLon = maxLon - minLon || 0.01;
  return (
    <div
      className="relative h-80 overflow-hidden rounded-2xl border border-line bg-blue-50 shadow-sh1"
      style={{
        backgroundImage:
          "linear-gradient(var(--line-200) 1px, transparent 1px), linear-gradient(90deg, var(--line-200) 1px, transparent 1px)",
        backgroundSize: "40px 40px",
      }}
    >
      {sites.map((site) => {
        const x = ((site.lon - minLon) / spanLon) * 90 + 5;
        const y = (1 - (site.lat - minLat) / spanLat) * 80 + 8;
        return (
          <span
            key={site.id}
            className="absolute min-h-11 min-w-11 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-white bg-primary px-2 text-center text-xs leading-[36px] font-bold text-white shadow-sh2"
            style={{ left: `${x}%`, top: `${y}%` }}
            title={site.name}
          >
            {site.progress}
          </span>
        );
      })}
    </div>
  );
}
