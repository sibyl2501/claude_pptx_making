// テーマ（配色）。主色1＋その濃淡＋アクセント1＋中立色、という構成で統一する。
// 各色はテーマの配色スロットにも書き込まれ、PowerPoint の［デザイン］→［バリエーション］→［配色］に表示される。
//
// トークン → テーマのスロット
//   ink(dk1)  primaryDark(dk2)  white(lt1)  primaryTint(lt2)
//   primary(accent1)  accent(accent2)  positive(accent3)  negative(accent4)  muted(accent5)  rule(accent6)

const THEMES = {
  forest: {
    label: "Forest（学習・解説）",
    ink: "1E2723",
    primaryDark: "1F3A34",
    white: "FFFFFF",
    primaryTint: "EDF3F0",
    primary: "2E6B5E",
    accent: "E39B2D",
    positive: "2E8B57",
    negative: "C8553D",
    muted: "6B7C76",
    rule: "C9D6D1",
    series: ["2E6B5E", "E39B2D", "6B8FB3", "C8553D", "8AA69C"],
  },
  navy: {
    label: "Navy（報告・提案）",
    ink: "1C2330",
    primaryDark: "14233F",
    white: "FFFFFF",
    primaryTint: "EDF1F7",
    primary: "24457A",
    accent: "E07A2E",
    positive: "2E8B57",
    negative: "C0392B",
    muted: "6A7385",
    rule: "CCD4E0",
    series: ["24457A", "E07A2E", "7FA3C9", "C0392B", "9AA5B5"],
  },
  graphite: {
    label: "Graphite（技術）",
    ink: "1F2326",
    primaryDark: "24292E",
    white: "FFFFFF",
    primaryTint: "EEF1F2",
    primary: "3D4A52",
    accent: "1C9C8C",
    positive: "2E8B57",
    negative: "C8553D",
    muted: "6F7980",
    rule: "CFD5D8",
    series: ["3D4A52", "1C9C8C", "8FA3AE", "C8553D", "B5BEC3"],
  },
  burgundy: {
    label: "Burgundy（提案・経営）",
    ink: "2A1F22",
    primaryDark: "3E1622",
    white: "FFFFFF",
    primaryTint: "F6EEF0",
    primary: "7A2238",
    accent: "C9A227",
    positive: "3F8A5A",
    negative: "B23A3A",
    muted: "7A6E71",
    rule: "E0D3D6",
    series: ["7A2238", "C9A227", "A8798A", "4F6D8F", "BFAFB3"],
  },
};

// 2色を混ぜて淡色を作る（t=0 で c1、t=1 で c2）
function mix(c1, c2, t) {
  const a = parseInt(c1, 16), b = parseInt(c2, 16);
  const ch = (v, s) => (v >> s) & 255;
  const m = (s) => Math.round(ch(a, s) * (1 - t) + ch(b, s) * t);
  return ((m(16) << 16) | (m(8) << 8) | m(0)).toString(16).padStart(6, "0").toUpperCase();
}

function getTheme(name) {
  const t = THEMES[name];
  if (!t) throw new Error(`テーマ "${name}" はありません。使えるテーマ: ${Object.keys(THEMES).join(", ")}`);
  return {
    ...t,
    name,
    accentTint: mix(t.accent, "FFFFFF", 0.82),
    primaryTint2: mix(t.primary, "FFFFFF", 0.78),
    onDarkMuted: mix(t.primaryDark, "FFFFFF", 0.7),
    onDarkPanel: mix(t.primaryDark, "FFFFFF", 0.1),
  };
}

module.exports = { THEMES, getTheme, mix };
