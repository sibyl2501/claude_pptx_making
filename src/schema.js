// 入力 JSON の仕様（JSON Schema 2020-12）。
// `npm run schema` で schema/deck.schema.json に書き出す（エディタの補完・検査用）。
// build.js はこの仕様で入力を検査し、未知の項目名（書き間違い）もエラーにする。

const str = { type: "string" };
const num = { type: "number" };
const int = { type: "integer", minimum: 0 };
const bool = { type: "boolean" };
const strOrNum = { type: ["string", "number"] };
const body = { description: "本文。文字列か、1要素1段落の配列。ミニ記法が使える", oneOf: [str, { type: "array", items: str }] };
const strArr = { type: "array", items: str };
const numArr = { type: "array", items: num };
const obj = (properties, required = [], extra = {}) => ({ type: "object", properties, required, additionalProperties: false, ...extra });
const arr = (items, extra = {}) => ({ type: "array", items, ...extra });

const stat = obj({ value: strOrNum, label: str }, ["value"]);
const titled = obj({ title: str, body }, ["title"]);
const card = obj({ title: str, body, num: strOrNum, stat }, []);
const panel = obj({ title: str, body, width: num }, []);
const cell = { description: "表のセル。文字列・数値・段落の配列、または {text, fill, align}", oneOf: [strOrNum, strArr, obj({ text: body, fill: str, align: { enum: ["left", "center", "right"] } }, ["text"])] };
const rows = arr(arr(cell));
const align = arr({ enum: ["left", "center", "right"] });
const tagColors = { type: "object", description: "値 → 色（テーマのトークン名か HEX）", additionalProperties: str };

const chartTypes = ["bar", "hbar", "stacked", "hstacked", "line", "area", "pie", "doughnut"];
const series = obj({ name: str, values: numArr }, ["name", "values"]);
const chartCommon = { title: str, unit: str, min: num, max: num, majorUnit: num, format: str, valueLabels: bool, markers: bool };
const plainChart = obj({ type: { enum: chartTypes }, categories: arr(strOrNum), series: arr(series, { minItems: 1 }), highlight: int, ...chartCommon }, ["categories", "series"]);
const waterfallChart = obj({
  type: { const: "waterfall" },
  start: obj({ label: str, value: num }, ["label", "value"]),
  steps: arr(obj({ label: str, value: num }, ["label", "value"]), { minItems: 1 }),
  endLabel: str, invert: bool, increaseLabel: str, decreaseLabel: str, totalLabel: str,
  ...chartCommon,
}, ["start", "steps"]);
const chart = { oneOf: [plainChart, waterfallChart] };
const kpi = obj({ label: str, value: strOrNum, unit: str, delta: str, good: { enum: ["up", "down"] }, note: body }, ["label", "value"]);

const blockBase = { height: num, grow: num };
const block = {
  description: "derivation の列に積むブロック",
  oneOf: [
    obj({ type: { const: "card" }, title: str, body, num: strOrNum, stat, ...blockBase }, ["type"]),
    obj({ type: { const: "panel" }, title: str, body, ...blockBase }, ["type"]),
    obj({ type: { const: "table" }, headers: arr(cell), rows, widths: numArr, align, highlight: int, tagColors, ...blockBase }, ["type", "headers", "rows"]),
    obj({ type: { const: "chart" }, chart, ...blockBase }, ["type", "chart"]),
    obj({ type: { const: "kpi" }, label: str, value: strOrNum, unit: str, delta: str, good: { enum: ["up", "down"] }, note: body, ...blockBase }, ["type", "label", "value"]),
    obj({ type: { const: "diagram" }, layers: arr(int, { minItems: 2 }), labels: strArr, edgeLabels: strArr, ...blockBase }, ["type", "layers"]),
    obj({ type: { const: "image" }, path: str, alt: str, fit: { enum: ["contain", "cover", "crop"] }, ...blockBase }, ["type", "path"]),
    obj({ type: { const: "message" }, text: body, label: str, ...blockBase }, ["type", "text"]),
  ],
};

// すべての通常ページに共通の項目
const common = { pattern: str, chapter: str, title: str, lead: str, source: str, notes: str, conclusion: body, conclusionLabel: str };

// パターンごとの項目と必須項目
const P = {
  cover: [{ subtitle: str, points: arr(titled, { maxItems: 4 }), date: str, org: str, author: str }, ["title"]],
  agenda: [{ items: arr(obj({ title: str, body, page: strOrNum }, ["title"]), { minItems: 2, maxItems: 9 }), current: int }, ["title", "items"]],
  section: [{ number: strOrNum, points: arr(titled, { maxItems: 5 }), pointsTitle: str }, ["title"]],
  exec_summary: [{ reasons: arr(card, { minItems: 2, maxItems: 4 }), actions: arr({ oneOf: [str, obj({ title: str, body, owner: str, due: str }, [])] }, { maxItems: 4 }), actionsLabel: str }, ["title", "conclusion", "reasons"]],
  pillars: [{ roof: body, roofLabel: str, pillars: arr(card, { minItems: 2, maxItems: 5 }), foundation: body, foundationLabel: str, numbered: bool }, ["title", "roof", "pillars"]],
  card_grid: [{ grid: { type: "string", pattern: "^[1-9]x[1-9]$" }, cards: arr(card, { minItems: 1, maxItems: 12 }), panel, numbered: bool }, ["title", "cards"]],
  comparison: [{ options: strArr, criteria: arr(obj({ name: str, note: str, values: arr(body) }, ["name", "values"])), recommend: int, widths: numArr, criteriaHeader: str }, ["title", "options", "criteria"]],
  matrix_2x2: [{
    xAxis: obj({ label: str, low: str, high: str }, ["label"]), yAxis: obj({ label: str, low: str, high: str }, ["label"]),
    quadrants: arr(obj({ title: str, body, highlight: bool }, []), { minItems: 4, maxItems: 4 }),
    items: arr(obj({ label: str, x: { type: "number", minimum: 0, maximum: 1 }, y: { type: "number", minimum: 0, maximum: 1 }, highlight: bool }, ["label", "x", "y"])),
    panel, matrixWidth: num,
  }, ["title", "xAxis", "yAxis", "quadrants"]],
  logic_tree: [{
    root: obj({ title: str, body }, ["title"]),
    children: arr(obj({ title: str, body, children: arr(obj({ title: str, body }, ["title"])) }, ["title"]), { minItems: 1 }),
    levels: strArr, ratios: numArr,
  }, ["title", "root", "children"]],
  process: [{ steps: arr(obj({ title: str, subtitle: str, body }, ["title"]), { minItems: 2, maxItems: 7 }), emphasize: int }, ["title", "steps"]],
  before_after: [{ rows: arr(obj({ label: str, before: body, after: body }, ["before", "after"]), { minItems: 1 }), beforeLabel: str, afterLabel: str, labelWidth: num }, ["title", "rows"]],
  chart_insight: [{ chart, insights: arr(card, { minItems: 1, maxItems: 5 }), chartWidth: num }, ["title", "chart", "insights"]],
  two_charts: [{ charts: arr(chart, { minItems: 2, maxItems: 2 }), insights: arr(card, { maxItems: 4 }), sameScale: bool, insightsHeight: num }, ["title", "charts"]],
  kpi_dashboard: [{ kpis: arr(kpi, { minItems: 1, maxItems: 6 }), chart, panel, insights: body, kpiHeight: num, chartWidth: num }, ["title", "kpis", "chart"]],
  data_table: [{ headers: arr(cell), rows, widths: numArr, align, highlight: int, rowsPerPage: { type: "integer", minimum: 1 }, tagColors }, ["title", "headers", "rows"]],
  waterfall: [{ waterfall: waterfallChart, insights: arr(card, { minItems: 1, maxItems: 5 }), chartWidth: num }, ["title", "waterfall", "insights"]],
  roadmap: [{
    periods: strArr, taskHeader: str,
    tasks: arr(obj({ name: str, owner: str, start: num, end: num, label: str, highlight: bool, milestone: num }, ["name"]), { minItems: 1 }),
    goals: arr(card, { maxItems: 4 }), goalsHeight: num,
  }, ["title", "periods", "tasks"]],
  issues_actions: [{ rows: arr(obj({ issue: str, detail: str, priority: { enum: ["高", "中", "低", ""] }, impact: body, action: body, owner: str }, ["issue", "action"]), { minItems: 1 }), widths: numArr, labels: { type: "object", additionalProperties: str } }, ["title", "rows"]],
  next_steps: [{ decisions: arr(obj({ title: str, body, due: str }, ["title"]), { minItems: 1 }), actions: arr(obj({ title: str, body, owner: str, due: str }, ["title"]), { minItems: 1 }), decisionsLabel: str, actionsLabel: str, leftWidth: num }, ["title", "decisions", "actions"]],
  concept_map: [{ headers: arr(cell), rows, widths: numArr, align, tagColors, flow: arr(titled, { maxItems: 5 }), flowEmphasize: int, flowHeight: num }, ["title", "headers", "rows"]],
  chart_cards: [{ chart, panel, cards: arr(card, { minItems: 1, maxItems: 8 }), grid: { type: "string", pattern: "^[1-9]x[1-9]$" }, chartWidth: num, chartHeight: num, numbered: bool }, ["title", "chart", "cards"]],
  derivation: [{ columns: arr(obj({ width: num, blocks: arr(block, { minItems: 1 }) }, ["blocks"]), { minItems: 1, maxItems: 4 }) }, ["title", "columns"]],
  cheat_sheet: [{ columns: arr(titled, { minItems: 2, maxItems: 10 }), highlight: int, grid: { type: "string", pattern: "^[1-9]x[1-9]$" } }, ["title", "columns"]],
  exercises: [{ questions: arr(obj({ q: str, hint: str, answer: str }, ["q"]), { minItems: 1, maxItems: 8 }), roadmap: arr(titled, { maxItems: 6 }), questionsLabel: str, roadmapLabel: str, questionsWidth: num }, ["title", "questions"]],
  references: [{ glossary: arr(obj({ term: str, desc: str }, ["term", "desc"])), references: strArr, glossaryLabel: str, referencesLabel: str, glossaryWidth: num }, ["title"]],
};

function buildSchema() {
  const slide = {
    type: "object",
    required: ["pattern"],
    properties: { pattern: { enum: Object.keys(P), description: "スライドの型（node src/build.js --catalog で一覧）" } },
    allOf: Object.entries(P).map(([k, [props, required]]) => ({
      if: { properties: { pattern: { const: k } }, required: ["pattern"] },
      then: { properties: { ...common, ...props }, required, unevaluatedProperties: false },
    })),
  };
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: "https://github.com/sibyl2501/claude_pptx_making/schema/deck.schema.json",
    title: "claude_pptx_making deck",
    type: "object",
    required: ["deck", "slides"],
    additionalProperties: false,
    properties: {
      $schema: str,
      deck: obj({
        title: str, author: str, subject: str, firstSection: str,
        theme: { enum: ["forest", "navy", "graphite", "burgundy"] },
        size: { enum: ["a4", "16:9"] },
        density: { enum: ["dense", "present"] },
        font: { enum: ["hiragino", "yu-gothic", "meiryo"] },
      }, []),
      slides: arr(slide, { minItems: 1 }),
    },
  };
}

// ajv のエラーを、どのスライドのどこが悪いかが分かる日本語にする
function explain(errors, spec) {
  const out = [];
  const seen = new Set();
  for (const e of errors) {
    if (e.keyword === "if" || e.keyword === "oneOf" && errors.some((x) => x.instancePath.startsWith(e.instancePath + "/"))) continue;
    const path = e.instancePath.split("/").filter(Boolean);
    let where = "";
    if (path[0] === "slides") {
      const s = spec.slides[Number(path[1])] || {};
      where = `slides[${path[1]}]${s.title ? `「${String(s.title).replace(/\n/g, " ").slice(0, 24)}」` : ""}${path.length > 2 ? " の " + path.slice(2).join(".") : ""}`;
    } else where = path.join(".") || "最上位";
    let msg;
    switch (e.keyword) {
      case "required": msg = `${e.params.missingProperty} が必要です`; break;
      case "unevaluatedProperties": msg = `「${e.params.unevaluatedProperty}」はこのパターンにない項目です（書き間違い？）`; break;
      case "additionalProperties": msg = `「${e.params.additionalProperty}」は使えない項目です（書き間違い？）`; break;
      case "enum": msg = `値は次のどれか: ${e.params.allowedValues.join(", ")}`; break;
      case "const": msg = `値は ${e.params.allowedValue} にしてください`; break;
      case "type": msg = `型が違います（${e.params.type} にしてください）`; break;
      case "minItems": msg = `${e.params.limit} 個以上必要です`; break;
      case "maxItems": msg = `${e.params.limit} 個までです`; break;
      case "pattern": msg = `形式が違います（例: "3x2"）`; break;
      case "minimum": case "maximum": msg = `範囲外です（${e.message}）`; break;
      case "oneOf": msg = "書き方がどの形にも合いません（README の該当パターンを参照）"; break;
      default: msg = e.message;
    }
    const line = `${where}: ${msg}`;
    if (!seen.has(line)) { seen.add(line); out.push(line); }
  }
  return out;
}

let validator = null;
function validateDeck(spec) {
  if (!validator) {
    const Ajv2020 = require("ajv/dist/2020");
    const ajv = new Ajv2020({ allErrors: true, strict: false });
    validator = ajv.compile(buildSchema());
  }
  return validator(spec) ? [] : explain(validator.errors, spec);
}

module.exports = { buildSchema, validateDeck, PATTERN_PROPS: P };

if (require.main === module) {
  const fs = require("fs"), path = require("path");
  const out = path.join(__dirname, "..", "schema", "deck.schema.json");
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(buildSchema(), null, 2) + "\n");
  console.log("書き出し: " + out);
}
