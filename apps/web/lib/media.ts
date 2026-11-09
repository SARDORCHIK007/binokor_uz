export const HERO_IMAGE = "/media/hero/hero-foreman.webp";
export const HERO_TEAM = "/media/hero/hero-team.webp";

export const TRADE_IMAGES: Record<string, string> = {
  bricklayer: "/media/trades/bricklayer.webp",
  carpenter: "/media/trades/carpenter.webp",
  concrete: "/media/trades/concrete.webp",
  drafting: "/media/trades/drafting.webp",
  electrician: "/media/trades/electrician.webp",
  painter: "/media/trades/painter.webp",
  plasterer: "/media/trades/plasterer.webp",
  plumber: "/media/trades/plumber.webp",
  rebar: "/media/trades/rebar.webp",
  roofer: "/media/trades/roofer.webp",
  tiler: "/media/trades/tiler.webp",
  welder: "/media/trades/welder.webp",
};

export function tradeImage(code: string): string {
  return TRADE_IMAGES[code] ?? "/media/misc/tools.webp";
}
