// 縦に積む「ブロック」の配置。複数の列（columns）にブロックを並べ、各列の高さを使い切るように配分する。
//
// ブロックの type:
//   card   { title, body, num?, stat? }        panel  { title, body }
//   table  { headers, rows, widths?, ... }     chart  { chart: {...} }
//   kpi    { label, value, unit?, delta?, note? }
//   diagram { layers, labels?, edgeLabels? }   image  { path, alt }
//   message { text }（結論帯）
// 共通: height（インチ固定）、grow（余白の取り分の重み）

const C = require("./components");
const { toParagraphs } = require("./markup");
const { measure } = require("./textfit");
const { GAP } = require("./config");

const FLEX = new Set(["chart", "diagram", "image"]);

function naturalHeight(ctx, b, w) {
  // 本文は最大サイズで見積もる（図と並ぶ列で文字が小さくなりすぎないように）
  const size = ctx.sizes.body[0];
  switch (b.type) {
    case "card":
    case "panel": {
      const m = measure(toParagraphs(b.body), w - 0.3, size);
      const titleW = w - (b.num !== undefined ? 0.66 : 0.28);
      const titleLines = b.title ? measure([{ text: b.title, bullet: false, level: 0 }], titleW, ctx.sizes.cardTitle, 0).lines : 0;
      return m.height + 0.3 + (titleLines * ctx.sizes.cardTitle * 1.2) / 72 + (b.stat ? 0.6 : 0);
    }
    case "table": {
      const rows = 1 + b.rows.length;
      return rows * ((ctx.sizes.table[1] + 1) / 72) * 1.2 + rows * 0.1 + 0.1;
    }
    case "kpi": return 1.3;
    case "message": return 0.72;
    default: return 1.6;
  }
}

// columns: [{ width: 比率, blocks: [...] }]  box: 配置する範囲
function layoutColumns(ctx, slide, rec, box, columns, baseDir) {
  const totalRatio = columns.reduce((a, c) => a + (c.width || 1), 0);
  const colW = columns.map((c) => ((box.w - GAP * (columns.length - 1)) * (c.width || 1)) / totalRatio);
  const textPlans = [];
  const later = [];
  let x = box.x;
  columns.forEach((col, ci) => {
    const w = colW[ci];
    const blocks = col.blocks || [];
    const avail = box.h - GAP * (blocks.length - 1);
    const nat = blocks.map((b) => (b.height ? b.height : naturalHeight(ctx, b, w)));
    const isFlex = blocks.map((b) => !b.height && FLEX.has(b.type));
    const isText = blocks.map((b) => !b.height && (b.type === "card" || b.type === "panel" || b.type === "table"));
    const fixedSum = blocks.reduce((a, b, i) => a + (isFlex[i] ? 0 : nat[i]), 0);
    const h = nat.slice();
    const flexIdx = blocks.map((_, i) => i).filter((i) => isFlex[i]);
    if (flexIdx.length) {
      const weights = flexIdx.map((i) => blocks[i].grow || 1);
      const wsum = weights.reduce((a, b) => a + b, 0);
      let rest = avail - fixedSum;
      const minFlex = 1.2 * flexIdx.length;
      if (rest < minFlex) {
        // 文字ブロックを縮めて図の最低限の高さを確保する
        const textSum = blocks.reduce((a, b, i) => a + (isText[i] ? nat[i] : 0), 0) || 1;
        const shrink = (fixedSum - (avail - minFlex)) / textSum;
        blocks.forEach((_, i) => { if (isText[i]) h[i] = nat[i] * (1 - shrink); });
        rest = minFlex;
      }
      flexIdx.forEach((i, k) => { h[i] = (rest * weights[k]) / wsum; });
    } else {
      // 図がない列は、文字ブロックを伸ばして列を満たす
      const textIdx = blocks.map((_, i) => i).filter((i) => isText[i]);
      const textSum = textIdx.reduce((a, i) => a + nat[i], 0) || 1;
      const diff = avail - fixedSum;
      textIdx.forEach((i) => { h[i] = nat[i] + (diff * nat[i]) / textSum; });
    }
    let y = box.y;
    blocks.forEach((b, i) => {
      const bb = { x, y, w, h: h[i] };
      y += h[i] + GAP;
      if (b.type === "card") textPlans.push(C.planCard(ctx, slide, bb, b));
      else if (b.type === "panel") textPlans.push(C.planPanel(ctx, slide, bb, b));
      else later.push(() => drawBlock(ctx, slide, rec, bb, b, baseDir));
    });
    x += w + GAP;
  });
  if (textPlans.length) C.renderGroup(ctx, rec, textPlans);
  later.forEach((f) => f());
}

function drawBlock(ctx, slide, rec, box, b, baseDir) {
  switch (b.type) {
    case "table": return C.table(ctx, slide, rec, box, b);
    case "chart": return C.chart(ctx, slide, rec, box, b.chart || b);
    case "kpi": return C.kpiTile(ctx, slide, rec, box, b);
    case "diagram": return C.layerDiagram(ctx, slide, rec, box, b);
    case "image": return C.image(ctx, slide, rec, box, b, baseDir);
    case "message": return C.keyMessage(ctx, slide, rec, box, b.text, b.label);
    default: throw new Error(`ブロックの type "${b.type}" は未対応です`);
  }
}

module.exports = { layoutColumns };
