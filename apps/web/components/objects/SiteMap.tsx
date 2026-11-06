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
    <div className="relative h-80 rounded-md border border-line bg-teal-100">
      {sites.map((site) => {
        const x = ((site.lon - minLon) / spanLon) * 90 + 5;
        const y = (1 - (site.lat - minLat) / spanLat) * 80 + 8;
        return (
          <span
            key={site.id}
            className="absolute min-h-11 min-w-11 -translate-x-1/2 -translate-y-1/2 rounded-full bg-navy-900 px-2 text-xs leading-[44px] text-white"
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
