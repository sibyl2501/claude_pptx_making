// 書き出した pptx のテーマ（ppt/theme/theme1.xml）に、配色と和文フォントを書き込む。
// pptxgenjs はテーマの配色を書けないため、書き出し後にこの処理で上書きする。

const fs = require("fs");
const JSZip = require("jszip");

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function clrScheme(theme) {
  const slot = (tag, hex) => `<a:${tag}><a:srgbClr val="${hex}"/></a:${tag}>`;
  return (
    `<a:clrScheme name="${esc(theme.label)}">` +
    slot("dk1", theme.ink) + slot("lt1", theme.white) + slot("dk2", theme.primaryDark) + slot("lt2", theme.primaryTint) +
    slot("accent1", theme.primary) + slot("accent2", theme.accent) + slot("accent3", theme.positive) +
    slot("accent4", theme.negative) + slot("accent5", theme.muted) + slot("accent6", theme.rule) +
    slot("hlink", theme.primary) + slot("folHlink", theme.muted) +
    `</a:clrScheme>`
  );
}

function fontScheme(fonts) {
  const f = (tag) => `<a:${tag}><a:latin typeface="${esc(fonts.jp)}"/><a:ea typeface="${esc(fonts.jp)}"/><a:cs typeface=""/></a:${tag}>`;
  return `<a:fontScheme name="${esc(fonts.jp)}">${f("majorFont")}${f("minorFont")}</a:fontScheme>`;
}

async function applyThemeXml(file, theme, fonts) {
  const zip = await JSZip.loadAsync(fs.readFileSync(file));
  const names = Object.keys(zip.files).filter((n) => /^ppt\/theme\/theme\d+\.xml$/.test(n));
  for (const n of names) {
    let xml = await zip.file(n).async("string");
    xml = xml.replace(/<a:clrScheme[\s\S]*?<\/a:clrScheme>/, clrScheme(theme));
    xml = xml.replace(/<a:fontScheme[\s\S]*?<\/a:fontScheme>/, fontScheme(fonts));
    xml = xml.replace(/(<a:theme [^>]*name=")[^"]*(")/, `$1${esc(theme.label)}$2`);
    zip.file(n, xml);
  }
  // フォルダ項目はクラウド上での共同編集で開けない原因になるため取り除く
  const out = new JSZip();
  for (const n of Object.keys(zip.files)) {
    if (zip.files[n].dir) continue;
    out.file(n, await zip.file(n).async("nodebuffer"), { createFolders: false });
  }
  const buf = await out.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
  fs.writeFileSync(file, buf);
}

module.exports = { applyThemeXml };
