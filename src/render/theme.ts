/** Every color and font the canvas uses. Colors that fade or mix are RGB tuples, turned into CSS with `rgba`. */

export type RGB = readonly [number, number, number];

export const rgba = ([r, g, b]: RGB, alpha: number) => `rgba(${r},${g},${b},${alpha})`;

/** Mixes two colors, `t` from 0 (a) to 1 (b). */
export const mix = (a: RGB, b: RGB, t: number): RGB => [
  Math.round(a[0] + (b[0] - a[0]) * t),
  Math.round(a[1] + (b[1] - a[1]) * t),
  Math.round(a[2] + (b[2] - a[2]) * t),
];

/** Night: the fire started in the early hours. */
export const SKY = {
  top: "#070d22",
  middle: "#15204a",
  horizon: "#3a3563",
  fireGlow: [255, 110, 40] as RGB,
  smoke: [40, 30, 32] as RGB,
  star: [230, 236, 255] as RGB,
  moon: "#f2f0e4",
  moonShade: "rgba(180,176,160,0.35)",
  moonGlow: [220, 225, 255] as RGB,
  cloud: [34, 42, 72] as RGB,
  cloudLit: [150, 70, 40] as RGB,
};

export const MOUNTAINS = {
  far: "#1c2744",
  farSnow: "#7e8aa8",
  near: "#16242c",
  rim: "rgba(160,175,220,0.18)",
  pine: "#0f1d17",
  pineDark: "#0a1510",
};

export const HILL = {
  back: "#18271f",
  middle: "#15231b",
  wall: "#34322d",
  wallLine: "#28261f",
  bush: "#0f1c14",
};

export const BILLBOARD_COLORS = {
  post: "#3a3128",
  board: "#f4f1ea",
  border: "#b8860b",
  text: "#2b2b2b",
  accent: "#b8860b",
  lamp: "#3a3a3a",
  light: [255, 236, 190] as RGB,
};

export const BUILDING = {
  slate: "#2c333b",
  slateShade: "#22282e",
  slateLine: "rgba(255,255,255,0.05)",
  roof: "#181b20",
  roofSlate: "#262c33",
  roofLine: "rgba(255,255,255,0.06)",
  parapet: "#3a424b",
  chimney: "#3b3f45",
  wood: "#5a4330",
  woodDark: "#3f2f22",
  railGlass: "rgba(150,190,220,0.18)",
  railTop: "rgba(200,220,235,0.45)",
  frame: "#11151a",
  glass: [24, 38, 52] as RGB,
  glassFire: [255, 140, 60] as RGB,
  glassShine: "rgba(150,180,220,0.25)",
  wet: "rgba(90,150,220,0.3)",
  burnt: "#0a0a0a",
  soot: [8, 6, 6] as RGB,
  charred: [8, 6, 6] as RGB,
  ember: [255, 90, 30] as RGB,
  /** Haze over the back rows, strongest at the back. */
  fog: [40, 48, 78] as RGB,
  fogByRow: [0, 0.18, 0.32],
};

export const FIRE = {
  core: "#fff6c8",
  mid: "#ffb22e",
  outer: "#ff5a1f",
  deep: "#c2300f",
  light: [255, 120, 40] as RGB,
  window: [255, 150, 50] as RGB,
};

export const GROUND = {
  road: "#1d1d21",
  roadLine: "#5d5d62",
  kerb: "#3a3a3d",
  river: "#0f2338",
  riverDeep: "#081624",
  ripple: "rgba(160,190,240,0.18)",
  reflection: [255, 130, 50] as RGB,
  pole: "#2c2c30",
  lamp: "#ffe7a8",
  lampLight: [255, 220, 150] as RGB,
};

export const HELI = {
  body: "#c62828",
  dark: "#7e1717",
  stripe: "#f2f2f2",
  glass: "#5f8fb0",
  glassShine: "rgba(255,255,255,0.35)",
  pilot: "#1b2430",
  skid: "#1c1c1c",
  mast: "#2a2a2a",
  disc: "rgba(180,190,210,0.12)",
  blade: "#0d0d0d",
  label: "#ffffff",
  navRed: "#ff3030",
  navRedGlow: [255, 60, 60] as RGB,
  navGreenGlow: [60, 255, 120] as RGB,
  beam: [255, 244, 200] as RGB,
  damaged: "rgba(20,20,20,0.5)",
};

export const BUCKET = {
  rope: "#8a7a6a",
  body: "#ff8f1f",
  rim: "#b35f0a",
  water: "#4f8fbf",
  band: "#e07a12",
  ripple: "rgba(190,215,255,0.7)",
  foam: "rgba(230,240,255,0.85)",
};

export const CREW = {
  body: "#c62828",
  dark: "#8a1c1c",
  glass: "#5f8fb0",
  ladder: "#aab4b8",
  wheels: "#111",
  hub: "#777",
  lightOn: "#3d7bff",
  lightOff: "#1e3570",
  glow: [70, 120, 255] as RGB,
  label: "#ffffff",
  suit: "#2d3a4a",
  stripe: "#f2e14a",
  helmet: "#f2c230",
};

export const SUPPLY = {
  beaconOn: "#ffb020",
  beaconOff: "#6b4a10",
  target: "#ffe27a",
};

export const PEOPLE = {
  coat: "#6b5a44",
  legs: "#27231f",
  skin: "#d9b596",
  beret: "#161616",
  cane: "#4f3824",
  suit: "#1f2a38",
  shirt: "#e8e8e8",
  tie: "#c0392b",
  sign: "#f2f0ea",
  signText: "#c0392b",
  signPost: "#4f3824",
  crowd: ["#2b3444", "#3b2f38", "#2f3a33", "#3a3428"],
  phone: "#d8ecff",
  phoneLight: [190, 220, 255] as RGB,
};

export const BUBBLE = {
  fill: "white",
  border: "black",
  text: "black",
};

export const EFFECTS = {
  smokeLit: [120, 62, 38] as RGB,
  smoke: [48, 46, 52] as RGB,
  steam: [225, 232, 242] as RGB,
  ember: [255, 150, 50] as RGB,
  splash: [150, 200, 245] as RGB,
  spark: [255, 210, 110] as RGB,
  drop: [140, 195, 245] as RGB,
  popupSaved: "#4ade80",
  popupLost: "#ff6b5b",
  popupOutline: "rgba(0,0,0,0.8)",
};

export const HUD = {
  bar: "rgba(0,0,0,0.8)",
  text: "#fff",
  label: "#9a9a9a",
  saved: "#4ade80",
  track: "#333",
  loss: "#EF4444",
  lossWarn: "#ff8a80",
  water: "#4fa3e0",
  hpHigh: "#22C55E",
  hpMid: "#EAB308",
  hpLow: "#EF4444",
  wind: "#dddddd",
  pillBg: "rgba(0,0,0,0.6)",
  hint: "#ffffff",
  warn: "#ff6b5b",
  bannerBg: "rgba(0,0,0,0.65)",
  bannerLevel: "#ffd24a",
  bannerCrew: "#8ec5ff",
  touchBg: "rgba(0,0,0,0.35)",
  touchActive: "rgba(79,163,224,0.55)",
  touchBorder: "rgba(255,255,255,0.75)",
  touchText: "#ffffff",
};

export const FONTS = {
  hud: "bold 12px monospace",
  hudBig: "bold 15px monospace",
  hudSmall: "bold 9px monospace",
  bubble: "10px monospace",
  banner: "bold 16px monospace",
  billboard: "bold 13px sans-serif",
  billboardSmall: "bold 7px sans-serif",
  label: "bold 6px monospace",
  sign: "bold 7px sans-serif",
  popup: "bold 12px monospace",
  touchButton: "bold 18px monospace",
  pill: (size: number) => `bold ${size}px monospace`,
};
