// E3 解説・導出：列ごとにカード・パネル・表・図・グラフを積む自由構成

const { layoutColumns } = require("../blocks");
const S = require("./_shared");

function render(ctx, spec, section, baseDir) {
  const f = S.frame(ctx, spec, section);
  layoutColumns(ctx, f.slide, f.rec, f.box, spec.columns, baseDir);
  S.finish(ctx, f, spec);
}

module.exports = { key: "derivation", id: "E3", label: "解説・導出", use: "列ごとにカード・パネル・表・図・グラフを積む自由構成", required: ["title", "columns"], render };
