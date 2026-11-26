// 用紙・領域・文字サイズ・フォントの定義。座標の単位はすべてインチ。

const PAGES = {
  a4: {
    name: "A4_LANDSCAPE",
    width: 11.69,
    height: 8.27,
    body: { x: 0.45, y: 1.32, w: 10.79, h: 6.43 }, // y: 1.32〜7.75
    footerY: 7.86,
  },
  "16:9": {
    name: "WIDE_16x9",
    width: 13.333,
    height: 7.5,
    body: { x: 0.45, y: 1.32, w: 12.43, h: 5.68 }, // y: 1.32〜7.00
    footerY: 7.1,
  },
};

// ブロック間の間隔（インチ）。パターン内の余白はすべてこの値を使う。
const GAP = 0.15;

// 文字サイズ（pt）。body は [最大, 最小] で、枠に合わせてこの範囲で自動調整する。
const DENSITY = {
  dense: {
    title: { a4: 22, "16:9": 24, min: 18 },
    lead: { size: 12, min: 10.5 },
    chapter: 9,
    cardTitle: 13,
    body: [12, 9.5],
    table: [12, 8.5],
    source: 8.5,
    kpiValue: 30,
  },
  present: {
    title: { a4: 30, "16:9": 32, min: 26 },
    lead: { size: 16, min: 14 },
    chapter: 11,
    cardTitle: 18,
    body: [18, 14],
    table: [16, 12],
    source: 10,
    kpiValue: 44,
  },
};

const FONTS = {
  hiragino: { jp: "Hiragino Sans", math: "Cambria", mono: "Menlo" },
  "yu-gothic": { jp: "Yu Gothic", math: "Cambria", mono: "Consolas" },
  meiryo: { jp: "Meiryo", math: "Cambria", mono: "Consolas" },
};

// 文字幅の目安（1em = 文字サイズ）。ヒラギノ角ゴシックを PowerPoint で実測した値に合わせてある。
const METRICS = {
  lineHeight: 1.2, // 行送り = 文字サイズ × 1.2（単一行間）
  cjk: 1.0,
  space: 0.28,
  digit: 0.6,
  upper: 0.68,
  lower: 0.53,
  punct: 0.38,
  other: 0.62,
  safety: 1.06, // 折り返しの誤差を吸収する余裕
};

module.exports = { PAGES, GAP, DENSITY, FONTS, METRICS };
