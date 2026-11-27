// TeX（LaTeX の数式記法）→ PowerPoint の数式（OMML）
//
// 本文の $…$（文中の数式）と $$…$$（段落全体の数式）をこのモジュールで解釈する。
// PowerPoint 上でそのまま編集できる数式になり、数式を表示できない環境向けに
// 同じ内容の文字列（代替テキスト）も作る。
//
// 対応する主な記法:
//   x^{2}  x_{i}  x_i^2  f'  \frac{a}{b}  \sqrt{x}  \sqrt[3]{x}
//   \sum_{i=1}^{n}  \prod  \int  \lim_{x \to 0}  \max_{θ}  \exp  \log
//   \hat{x}  \bar{x}  \vec{v}  \tilde{x}  \mathbf{x}  \mathrm{d}  \mathbb{R}  \mathcal{F}  \text{日本語}
//   \left( … \right)  \begin{bmatrix} a & b \\ c & d \end{bmatrix}（pmatrix, vmatrix, matrix, cases）
//   ギリシャ文字（\alpha … \Omega）、記号（\nabla \partial \cdot \times \le \approx \to \in など）
// 対応外の命令はエラーになる（--check で場所を示す）。JSON ではバックスラッシュを \\ と重ねて書く。
//
// 生成する XML の中で、文字の書式（a:rPr）は "\u0001" の位置に後から差し込む（build.js で
// 文字サイズ・色に合わせる）。ctrlPr（分数線などの書式）も同じ書式を使う。

const RPR = "\u0001";
const M_NS = "http://schemas.openxmlformats.org/officeDocument/2006/math";

const GREEK = {
  alpha: "α", beta: "β", gamma: "γ", delta: "δ", epsilon: "ϵ", varepsilon: "ε", zeta: "ζ", eta: "η",
  theta: "θ", vartheta: "ϑ", iota: "ι", kappa: "κ", lambda: "λ", mu: "μ", nu: "ν", xi: "ξ", pi: "π",
  varpi: "ϖ", rho: "ρ", varrho: "ϱ", sigma: "σ", varsigma: "ς", tau: "τ", upsilon: "υ", phi: "ϕ",
  varphi: "φ", chi: "χ", psi: "ψ", omega: "ω",
  Gamma: "Γ", Delta: "Δ", Theta: "Θ", Lambda: "Λ", Xi: "Ξ", Pi: "Π", Sigma: "Σ", Upsilon: "Υ",
  Phi: "Φ", Psi: "Ψ", Omega: "Ω",
};

// 記号（立体で書く）
const SYMBOLS = {
  nabla: "∇", partial: "∂", infty: "∞", ell: "ℓ", hbar: "ℏ", emptyset: "∅", varnothing: "∅",
  cdot: "⋅", times: "×", div: "÷", pm: "±", mp: "∓", ast: "∗", star: "⋆", circ: "∘", bullet: "∙",
  odot: "⊙", otimes: "⊗", oplus: "⊕", dagger: "†", top: "⊤", bot: "⊥", prime: "′",
  le: "≤", leq: "≤", ge: "≥", geq: "≥", ne: "≠", neq: "≠", approx: "≈", sim: "∼", simeq: "≃",
  cong: "≅", equiv: "≡", propto: "∝", ll: "≪", gg: "≫", lt: "<", gt: ">",
  to: "→", rightarrow: "→", leftarrow: "←", gets: "←", Rightarrow: "⇒", Leftarrow: "⇐",
  leftrightarrow: "↔", Leftrightarrow: "⇔", iff: "⇔", implies: "⇒", mapsto: "↦", uparrow: "↑", downarrow: "↓",
  in: "∈", notin: "∉", ni: "∋", subset: "⊂", supset: "⊃", subseteq: "⊆", supseteq: "⊇",
  cup: "∪", cap: "∩", setminus: "∖", forall: "∀", exists: "∃", neg: "¬", land: "∧", lor: "∨",
  wedge: "∧", vee: "∨", mid: "∣", parallel: "∥", perp: "⊥", angle: "∠",
  ldots: "…", cdots: "⋯", vdots: "⋮", ddots: "⋱", dots: "…",
  langle: "⟨", rangle: "⟩", lVert: "‖", rVert: "‖", Vert: "‖", lvert: "|", rvert: "|", vert: "|",
  lfloor: "⌊", rfloor: "⌋", lceil: "⌈", rceil: "⌉", lbrace: "{", rbrace: "}",
  "|": "‖", "{": "{", "}": "}", "%": "%", "$": "$", "#": "#", "&": "&", "_": "_",
};

// 立体の関数名
const FUNCS = new Set(["exp", "log", "ln", "lg", "sin", "cos", "tan", "sinh", "cosh", "tanh", "arcsin", "arccos", "arctan",
  "max", "min", "sup", "inf", "lim", "arg", "det", "dim", "ker", "deg", "gcd", "Pr", "sgn", "softmax"]);

// 大型演算子（直後の項を中身として取り込む）
const NARY = { sum: "∑", prod: "∏", coprod: "∐", int: "∫", iint: "∬", iiint: "∭", oint: "∮", bigcup: "⋃", bigcap: "⋂" };

const ACCENTS = { hat: "̂", widehat: "̂", tilde: "̃", widetilde: "̃", vec: "⃗", dot: "̇", ddot: "̈", check: "̌", breve: "̆" };

const SPACES = { ",": " ", ":": " ", ";": " ", " ": " ", quad: " ", qquad: "  ", "!": "" };

const MATRICES = { matrix: ["", ""], pmatrix: ["(", ")"], bmatrix: ["[", "]"], Bmatrix: ["{", "}"], vmatrix: ["|", "|"], Vmatrix: ["‖", "‖"], cases: ["{", ""] };

// 書体の変換表
function mapRange(text, upperStart, lowerStart, exceptions = {}) {
  return [...text].map((ch) => {
    if (exceptions[ch]) return exceptions[ch];
    const c = ch.codePointAt(0);
    if (upperStart && c >= 65 && c <= 90) return String.fromCodePoint(upperStart + c - 65);
    if (lowerStart && c >= 97 && c <= 122) return String.fromCodePoint(lowerStart + c - 97);
    return ch;
  }).join("");
}
const BB = { C: "ℂ", H: "ℍ", N: "ℕ", P: "ℙ", Q: "ℚ", R: "ℝ", Z: "ℤ" };
const CAL = { B: "ℬ", E: "ℰ", F: "ℱ", H: "ℋ", I: "ℐ", L: "ℒ", M: "ℳ", R: "ℛ" };
const toBB = (t) => mapRange(t, 0x1d538, 0x1d552, BB);
const toCal = (t) => mapRange(t, 0x1d49c, 0, CAL);

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// ---------------------------------------------------------------- 式の部品
// { xml, lin（代替テキスト）, em（幅の目安。文字サイズ=1）, tall（高さの目安。1行=1） }
const STY = { p: '<m:rPr><m:sty m:val="p"/></m:rPr>', b: '<m:rPr><m:sty m:val="b"/></m:rPr>', bi: '<m:rPr><m:sty m:val="bi"/></m:rPr>', i: "" };

function charEm(ch) {
  const c = ch.codePointAt(0);
  if (c >= 0x2e80 && c <= 0x9fff) return 1.0;
  if (c >= 0xff00 && c <= 0xffef) return 1.0;
  if ("=<>≤≥≈≠→←⇒⇔∈∉⊂⊆∼≃≡∝".includes(ch)) return 1.05; // 関係記号は前後に空きが入る
  if ("+−±×⋅÷∗∘⊙⊗⊕".includes(ch)) return 0.95;
  if (/[0-9]/.test(ch)) return 0.5;
  if (/[il.,;:'|!()[\]]/.test(ch)) return 0.33;
  if (/\s/.test(ch)) return 0.25;
  return 0.58;
}
const textEm = (t) => [...t].reduce((a, ch) => a + charEm(ch), 0);

function run(text, sty = "i") {
  return { xml: `<m:r>${STY[sty] || ""}${RPR}<m:t xml:space="preserve">${esc(text)}</m:t></m:r>`, lin: text, em: textEm(text), tall: 1 };
}
const empty = () => ({ xml: "", lin: "", em: 0, tall: 1 });
const ctrl = `<m:ctrlPr>${RPR}</m:ctrlPr>`;

function join(parts) {
  return {
    xml: parts.map((p) => p.xml).join(""),
    lin: parts.map((p) => p.lin).join(""),
    em: parts.reduce((a, p) => a + p.em, 0),
    tall: parts.reduce((a, p) => Math.max(a, p.tall), 1),
  };
}

const wrapLin = (s) => (s.lin.length > 1 && !/^[(\[{]/.test(s.lin) ? `(${s.lin})` : s.lin);

function scripts(base, sub, sup) {
  const tag = sub && sup ? "sSubSup" : sub ? "sSub" : "sSup";
  const xml = `<m:${tag}><m:${tag}Pr>${ctrl}</m:${tag}Pr><m:e>${base.xml}</m:e>${sub ? `<m:sub>${sub.xml}</m:sub>` : ""}${sup ? `<m:sup>${sup.xml}</m:sup>` : ""}</m:${tag}>`;
  const lin = base.lin + (sub ? `_${wrapLin(sub)}` : "") + (sup ? (sup.lin === "′" ? "′" : `^${wrapLin(sup)}`) : "");
  const sEm = Math.max(sub ? sub.em : 0, sup ? sup.em : 0) * 0.72;
  const tall = Math.max(base.tall, 1 + (sub ? 0.12 * sub.tall : 0) + (sup ? 0.12 * sup.tall : 0));
  return { xml, lin, em: base.em + sEm + 0.05, tall };
}

function frac(num, den, noBar = false) {
  const pr = noBar ? '<m:type m:val="noBar"/>' : "";
  return {
    xml: `<m:f><m:fPr>${pr}${ctrl}</m:fPr><m:num>${num.xml}</m:num><m:den>${den.xml}</m:den></m:f>`,
    lin: `${wrapLin(num)}/${wrapLin(den)}`,
    em: Math.max(num.em, den.em) * 0.85 + 0.3,
    tall: 0.75 * (num.tall + den.tall) + 0.2,
  };
}

function radical(body, deg) {
  const pr = deg ? ctrl : `<m:degHide m:val="1"/>${ctrl}`;
  return {
    xml: `<m:rad><m:radPr>${pr}</m:radPr><m:deg>${deg ? deg.xml : ""}</m:deg><m:e>${body.xml}</m:e></m:rad>`,
    lin: `${deg ? deg.lin : ""}√${wrapLin(body)}`,
    em: body.em + 0.8 + (deg ? deg.em * 0.5 : 0),
    tall: body.tall + 0.15,
  };
}

function nary(chr, sub, sup, body) {
  const hide = (sub ? "" : '<m:subHide m:val="1"/>') + (sup ? "" : '<m:supHide m:val="1"/>');
  return {
    xml: `<m:nary><m:naryPr><m:chr m:val="${chr}"/><m:limLoc m:val="subSup"/>${hide}${ctrl}</m:naryPr><m:sub>${sub ? sub.xml : ""}</m:sub><m:sup>${sup ? sup.xml : ""}</m:sup><m:e>${body.xml}</m:e></m:nary>`,
    lin: chr + (sub ? `_${wrapLin(sub)}` : "") + (sup ? `^${wrapLin(sup)}` : "") + (body.lin ? " " + body.lin : ""),
    em: 1.0 + Math.max(sub ? sub.em : 0, sup ? sup.em : 0) * 0.72 + body.em,
    tall: Math.max(1.35, body.tall),
  };
}

function accent(body, chr) {
  return { xml: `<m:acc><m:accPr><m:chr m:val="${chr}"/>${ctrl}</m:accPr><m:e>${body.xml}</m:e></m:acc>`, lin: body.lin + chr, em: body.em, tall: body.tall + 0.1 };
}

function overbar(body) {
  return { xml: `<m:bar><m:barPr><m:pos m:val="top"/>${ctrl}</m:barPr><m:e>${body.xml}</m:e></m:bar>`, lin: body.lin + "̅", em: body.em, tall: body.tall + 0.1 };
}

function delim(body, beg, end) {
  return {
    xml: `<m:d><m:dPr><m:begChr m:val="${esc(beg)}"/><m:endChr m:val="${esc(end)}"/>${ctrl}</m:dPr><m:e>${body.xml}</m:e></m:d>`,
    lin: beg + body.lin + end,
    em: body.em + 0.5,
    tall: body.tall,
  };
}

function matrix(rows, beg, end) {
  const cols = Math.max(...rows.map((r) => r.length));
  const cells = rows.map((r) => `<m:mr>${[...Array(cols).keys()].map((j) => `<m:e>${r[j] ? r[j].xml : ""}</m:e>`).join("")}</m:mr>`).join("");
  const colEm = [...Array(cols).keys()].map((j) => Math.max(...rows.map((r) => (r[j] ? r[j].em : 0))));
  const inner = {
    xml: `<m:m><m:mPr><m:mcs><m:mc><m:mcPr><m:count m:val="${cols}"/><m:mcJc m:val="${beg === "{" && !end ? "left" : "center"}"/></m:mcPr></m:mc></m:mcs>${ctrl}</m:mPr>${cells}</m:m>`,
    lin: rows.map((r) => r.map((c) => c.lin).join(", ")).join("; "),
    em: colEm.reduce((a, b) => a + b, 0) + 0.8 * (cols - 1),
    tall: rows.reduce((a, r) => a + Math.max(...r.map((c) => c.tall)), 0) * 1.05,
  };
  return beg || end ? delim(inner, beg, end) : inner;
}

// ---------------------------------------------------------------- 読み取り
const TOKEN = /\\[A-Za-z]+|\\[^A-Za-z]|[\uD800-\uDBFF][\uDC00-\uDFFF]|[\s\S]/g;

class Parser {
  constructor(src) {
    this.src = src;
    this.t = src.match(TOKEN) || [];
    this.i = 0;
  }
  skipWs() { while (this.i < this.t.length && /^\s$/.test(this.t[this.i])) this.i++; }
  peek() { this.skipWs(); return this.t[this.i]; }
  take() {
    this.skipWs();
    if (this.i >= this.t.length) throw new Error("数式が途中で終わっています");
    return this.t[this.i++];
  }
  expect(tok) {
    const got = this.take();
    if (got !== tok) throw new Error(`「${tok}」が必要な位置に「${got}」があります`);
  }
  // 中かっこの中身を、空白も含めてそのまま読む（\text 用）
  rawGroup() {
    this.expect("{");
    let depth = 1, out = "";
    while (this.i < this.t.length) {
      const tok = this.t[this.i++];
      if (tok === "{") depth++;
      if (tok === "}" && --depth === 0) return out;
      out += tok.startsWith("\\") && tok.length === 2 ? tok[1] : tok;
    }
    throw new Error("「}」が足りません");
  }
  // 環境名や関数名など、中かっこ内の文字列
  nameGroup() { return this.rawGroup().trim(); }

  expr(stops, depth = 0) {
    if (depth > 30) throw new Error("数式の入れ子が深すぎます");
    const parts = [];
    while (this.peek() !== undefined && !stops.has(this.peek())) parts.push(this.term(depth));
    return parts.length ? join(parts) : empty();
  }

  // 1つの項（引数・添字に使う単位）
  arg(depth) {
    const tok = this.take();
    if (tok === "{") { const e = this.expr(new Set(["}"]), depth + 1); this.expect("}"); return e; }
    return this.atom(tok, depth + 1);
  }

  term(depth) {
    const tok = this.take();
    const name = tok.startsWith("\\") ? tok.slice(1) : null;
    let base;
    let naryChr = null;
    if (name && NARY[name]) { naryChr = NARY[name]; base = run(naryChr, "p"); }
    else if (tok === "{") { base = this.expr(new Set(["}"]), depth + 1); this.expect("}"); }
    else base = this.atom(tok, depth + 1);
    let sub = null, sup = null;
    for (;;) {
      const p = this.peek();
      if (p === "_" || p === "^") {
        this.take();
        if ((p === "_" && sub) || (p === "^" && sup)) throw new Error("同じ側の添字が重なっています（{} でまとめてください）");
        const s = this.arg(depth);
        if (p === "_") sub = s; else sup = sup ? join([sup, s]) : s;
      } else if (p === "'") {
        this.take();
        sup = sup ? join([sup, run("′", "p")]) : run("′", "p");
      } else break;
    }
    if (naryChr) {
      // 直後の項を中身に取り込むと、PowerPoint 上で1つの式としてまとまる
      const next = this.peek();
      const body = next !== undefined && !/^[=+\-<>,;)\]|&}]$/.test(next) && next !== "\\\\" && next !== "\\right" && next !== "\\end" ? this.term(depth + 1) : empty();
      return nary(naryChr, sub, sup, body);
    }
    if (!sub && !sup) return base;
    return scripts(base, sub, sup);
  }

  atom(tok, depth) {
    if (tok === "}") throw new Error("「}」が多すぎます");
    if (tok === "_" || tok === "^") throw new Error(`添字「${tok}」の前に文字がありません（{}${tok}… と書いてください）`);
    if (tok === "&" || tok === "\\\\") throw new Error(`「${tok}」は行列（\\begin{bmatrix}…）の中でだけ使えます`);
    if (!tok.startsWith("\\")) {
      if (tok === "-") return run("−", "p");
      if (tok === "*") return run("∗", "p");
      if (tok === "~") return run(" ", "p");
      if (tok === "'") return run("′", "p");
      if (/[0-9]/.test(tok)) {
        // 続く数字・小数点をまとめる
        let s = tok;
        while (this.i < this.t.length && /^[0-9.]$/.test(this.t[this.i])) s += this.t[this.i++];
        return run(s, "p");
      }
      if (/[A-Za-zͰ-Ͽ]/.test(tok)) return run(tok, "i");
      if (/[　-鿿＀-￯]/.test(tok)) return run(tok, "p");
      return run(tok, "p");
    }
    const name = tok.slice(1);
    if (name in SPACES) return run(SPACES[name], "p");
    if (GREEK[name]) return run(GREEK[name], /^[A-Z]/.test(name) ? "p" : "i");
    if (SYMBOLS[name]) return run(SYMBOLS[name], "p");
    if (FUNCS.has(name)) return run(name, "p");
    switch (name) {
      case "frac": case "dfrac": case "tfrac": case "cfrac": return frac(this.arg(depth), this.arg(depth));
      case "binom": return delim(frac(this.arg(depth), this.arg(depth), true), "(", ")");
      case "sqrt": {
        let deg = null;
        if (this.peek() === "[") { this.take(); deg = this.expr(new Set(["]"]), depth + 1); this.expect("]"); }
        return radical(this.arg(depth), deg);
      }
      case "overline": case "bar": case "widebar": return name === "bar" ? accent(this.arg(depth), "̅") : overbar(this.arg(depth));
      case "mathbf": case "boldsymbol": case "bm": return this.styled(depth, "b");
      case "mathrm": case "textrm": case "mathsf": case "mathtt": return this.styled(depth, "p");
      case "mathit": return this.styled(depth, "i");
      case "operatorname": return run(this.nameGroup(), "p");
      case "text": case "textbf": case "mbox": return { ...run(this.rawGroup(), "p"), text: true };
      case "mathbb": return run(toBB(this.nameGroup()), "p");
      case "mathcal": case "mathscr": return run(toCal(this.nameGroup()), "p");
      case "left": {
        const beg = this.delimChar();
        const body = this.expr(new Set(["\\right"]), depth + 1);
        this.expect("\\right");
        return delim(body, beg, this.delimChar());
      }
      case "big": case "Big": case "bigg": case "Bigg": case "bigl": case "bigr": case "Bigl": case "Bigr": return run(this.delimChar(), "p");
      case "begin": return this.environment(depth);
      case "displaystyle": case "textstyle": case "limits": case "nolimits": return empty();
      default:
        if (ACCENTS[name]) return accent(this.arg(depth), ACCENTS[name]);
        throw new Error(`未対応の命令です（\\${name}）`);
    }
  }

  styled(depth, sty) {
    const tok = this.take();
    if (tok !== "{") return run(tok.startsWith("\\") ? GREEK[tok.slice(1)] || SYMBOLS[tok.slice(1)] || tok : tok, sty);
    // 中身の文字をすべて同じ書体にする（入れ子の構造はそのまま）
    const e = this.expr(new Set(["}"]), depth + 1);
    this.expect("}");
    const tag = STY[sty] || "";
    return { ...e, xml: e.xml.replace(/<m:r>(?:<m:rPr>.*?<\/m:rPr>)?/g, `<m:r>${tag}`) };
  }

  delimChar() {
    const tok = this.take();
    if (tok === ".") return "";
    if (tok.startsWith("\\")) {
      const n = tok.slice(1);
      if (SYMBOLS[n]) return SYMBOLS[n];
      throw new Error(`かっことして使えない記号です（${tok}）`);
    }
    return tok;
  }

  environment(depth) {
    const env = this.nameGroup();
    if (!MATRICES[env]) throw new Error(`未対応の環境です（${env}）。bmatrix, pmatrix, vmatrix, matrix, cases が使えます`);
    const rows = [[]];
    for (;;) {
      rows[rows.length - 1].push(this.expr(new Set(["&", "\\\\", "\\end"]), depth + 1));
      const sep = this.take();
      if (sep === "&") continue;
      if (sep === "\\\\") { rows.push([]); continue; }
      const endName = this.nameGroup();
      if (endName !== env) throw new Error(`\\begin{${env}} と \\end{${endName}} が対応していません`);
      break;
    }
    // 最後の \\ の後の空行は除く
    if (rows.length > 1 && rows[rows.length - 1].length === 1 && !rows[rows.length - 1][0].lin) rows.pop();
    const [beg, end] = MATRICES[env];
    return matrix(rows, beg, end);
  }
}

const cache = new Map();

// TeX を解釈する。戻り値 { xml, lin, em, tall } または { error }
function parseTex(tex) {
  if (cache.has(tex)) return cache.get(tex);
  let out;
  try {
    const p = new Parser(tex);
    const e = p.expr(new Set());
    if (p.peek() !== undefined) throw new Error(`「${p.peek()}」が対応していません`);
    out = e;
  } catch (err) {
    out = { error: err.message, lin: tex, em: textEm(tex), tall: 1 };
  }
  cache.set(tex, out);
  return out;
}

// 数式を代替テキスト（Unicode の文字列）にする。グラフの題名など、数式を置けない所で使う
function texToText(tex) {
  return parseTex(tex).lin;
}

// 文字列中の $…$ を代替テキストに置き換える
function replaceMath(text) {
  return String(text).replace(/\$\$([^$]+)\$\$|\$([^$]+)\$/g, (_, d, i) => texToText(d || i));
}

// OMML 本体。rPr は文字の書式（a:rPr 要素）、textRPr は \text{} 用の書式
function toOmml(tex, rPr, display, textRPr) {
  const r = parseTex(tex);
  if (r.error) return null;
  let xml = r.xml.split(RPR).join(rPr);
  if (textRPr) xml = xml.replace(/<m:r>(<m:rPr><m:sty m:val="p"\/><\/m:rPr>)(<a:rPr[\s\S]*?(?:\/>|<\/a:rPr>))(<m:t xml:space="preserve">[^<]*[　-鿿＀-￯][^<]*<\/m:t>)/g, (_, s, __, t) => `<m:r>${s}${textRPr}${t}`);
  const math = `<m:oMath>${xml}</m:oMath>`;
  return display
    ? `<a14:m><m:oMathPara xmlns:m="${M_NS}"><m:oMathParaPr><m:jc m:val="center"/></m:oMathParaPr>${math}</m:oMathPara></a14:m>`
    : `<a14:m>${math.replace("<m:oMath>", `<m:oMath xmlns:m="${M_NS}">`)}</a14:m>`;
}

module.exports = { parseTex, texToText, replaceMath, toOmml, M_NS };
