export const HERO_IMAGE = "/media/hero/hero-foreman.png";
export const HERO_TEAM = "/media/hero/hero-team.jpg";

export const TRADE_IMAGES: Record<string, string> = {
  bricklayer: "/media/trades/bricklayer.jpg",
  carpenter: "/media/trades/carpenter.jpg",
  concrete: "/media/trades/concrete.jpg",
  drafting: "/media/trades/drafting.jpg",
  electrician: "/media/trades/electrician.jpg",
  painter: "/media/trades/painter.png",
  plasterer: "/media/trades/plasterer.jpg",
  plumber: "/media/trades/plumber.jpg",
  rebar: "/media/trades/rebar.jpg",
  roofer: "/media/trades/roofer.jpg",
  tiler: "/media/trades/tiler.jpg",
  welder: "/media/trades/welder.jpg",
};

export function tradeImage(code: string): string {
  return TRADE_IMAGES[code] ?? "/media/misc/tools.jpg";
}
