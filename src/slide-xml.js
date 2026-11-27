// 書き出したスライドの XML の仕上げ
//
// 1. 文字の言語を日本語（ja-JP）にする。pptxgenjs は en-US で書き出すため、そのままだと
//    PowerPoint の日本語の禁則処理（「、」「）」を行頭に置かない等）が効かない。
// 2. 本文の数式の目印（番号）を PowerPoint の数式（OMML）に置き換える。
//    数式を含む図形・表は mc:AlternateContent で包み、数式を表示できない環境向けに
//    同じ内容の文字列（代替テキスト）を Fallback に入れる。

const { toOmml, texToText } = require("./math");

const MC = "http://schemas.openxmlformats.org/markup-compatibility/2006";
const A14 = "http://schemas.microsoft.com/office/drawing/2010/main";
const MARK = /<a:r>(<a:rPr\b(?:(?!<a:r>)[\s\S])*?(?:\/>|<\/a:rPr>))<a:t>(\d+)<\/a:t><\/a:r>/g;

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function setLang(xml) {
  return xml.replace(/ lang="en-US"(?! altLang)/g, ' lang="ja-JP" altLang="en-US"');
}

// 書式（a:rPr）の書体を差し替える
function withFont(rPr, latin, ea) {
  let r = rPr.replace(/<a:(latin|ea|cs|sym)\b[^>]*\/>/g, "").replace(/ baseline="[^"]*"/, "");
  const fontXml = `<a:latin typeface="${latin}"/><a:ea typeface="${ea}"/><a:cs typeface="${latin}"/>`;
  if (r.endsWith("/>")) return r.replace(/\/>$/, `>${fontXml}</a:rPr>`);
  return r.replace(/<\/a:rPr>$/, `${fontXml}</a:rPr>`);
}

function replaceMath(xml, math, fonts) {
  if (!xml.includes("")) return xml;
  const shapeRe = /<p:sp>(?:(?!<p:sp>)[\s\S])*?<\/p:sp>|<p:graphicFrame>(?:(?!<p:graphicFrame>)[\s\S])*?<\/p:graphicFrame>/g;
  return xml.replace(shapeRe, (shape) => {
    if (!shape.includes("")) return shape;
    const choice = shape.replace(MARK, (_, rPr, id) => {
      const m = math[Number(id)];
      const omml = m && toOmml(m.tex, withFont(rPr, "Cambria Math", "Cambria Math"), m.display, withFont(rPr, fonts.jp, fonts.jp));
      return omml || `<a:r>${rPr}<a:t>${esc(m ? texToText(m.tex) : "")}</a:t></a:r>`;
    });
    const fallback = shape.replace(MARK, (_, rPr, id) => {
      const m = math[Number(id)];
      return `<a:r>${withFont(rPr, "Cambria Math", fonts.jp)}<a:t>${esc(m ? texToText(m.tex) : "")}</a:t></a:r>`;
    });
    return `<mc:AlternateContent xmlns:mc="${MC}"><mc:Choice xmlns:a14="${A14}" Requires="a14">${choice}</mc:Choice><mc:Fallback>${fallback}</mc:Fallback></mc:AlternateContent>`;
  });
}

function finishSlideXml(xml, ctx) {
  return replaceMath(setLang(xml), ctx.math || [], ctx.fonts);
}

module.exports = { finishSlideXml, setLang };
