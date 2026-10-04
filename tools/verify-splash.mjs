#!/usr/bin/env node
/**
 * 用真实抓包里的 init 响应验证 Coolapk-SplashAd-Block 的正则是否真的能改写成功。
 * 只做本地验证，不联网。抓包目录不存在时自动跳过。
 *
 *   node tools/verify-splash.mjs
 */
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const PLUGIN = join(ROOT, "plugins", "Coolapk-AdBlock.plugin");
const FIXTURE = join(ROOT, "tests", "fixtures", "coolapk-init-splash.json");
const CANDIDATES = [
  FIXTURE,
  "E:/work/去广告/cap_30/23_33_1791116206467/response_body_raw",
];

const src = CANDIDATES.find((p) => existsSync(p));
if (!src) {
  console.log("⏭  未找到测试样本，跳过");
  process.exit(0);
}
console.log("样本：" + (src === FIXTURE ? "tests/fixtures/coolapk-init-splash.json（内置）" : src));

// ── 从插件里抽出所有 response.body.replace 的 (regex, replacement) ──

/** 按顶层逗号切分参数，能正确跳过字符串、正则字面量和括号嵌套 */
function splitArgs(s) {
  const args = [];
  let depth = 0, cur = "", inStr = false, inRe = false, esc = false;
  for (const c of s) {
    if (esc) { cur += c; esc = false; continue; }
    if (c === "\\") { cur += c; esc = true; continue; }
    if (inStr) { cur += c; if (c === '"') inStr = false; continue; }
    if (inRe) { cur += c; if (c === "/") inRe = false; continue; }
    if (c === '"') { cur += c; inStr = true; continue; }
    // 值起始位置的 / 视为正则字面量开始
    if (c === "/" && (cur.trim() === "" || /[\[,\s]$/.test(cur))) { cur += c; inRe = true; continue; }
    if (c === "[" || c === "(") { depth++; cur += c; continue; }
    if (c === "]" || c === ")") { depth--; cur += c; continue; }
    if (c === "," && depth === 0) { args.push(cur.trim()); cur = ""; continue; }
    cur += c;
  }
  if (cur.trim()) args.push(cur.trim());
  return args;
}

/** "[ a, b ]" -> ["a","b"]；"x" -> ["x"] */
function asList(arg) {
  const t = arg.trim();
  if (t.startsWith("[") && t.endsWith("]")) return splitArgs(t.slice(1, -1));
  return [t];
}

/** "/re/flags" -> {pattern, flags} */
function asRegex(lit) {
  if (!lit.startsWith("/")) throw new Error("不是正则字面量: " + lit);
  let end = -1;
  for (let p = 1; p < lit.length; p++) {
    if (lit[p] === "\\") { p++; continue; }
    if (lit[p] === "/") end = p;
  }
  if (end === -1) throw new Error("正则缺少结束斜杠: " + lit);
  return { pattern: lit.slice(1, end), flags: lit.slice(end + 1) };
}

/** 去掉外层双引号并还原 \" 与 \\ */
function asString(lit) {
  if (!lit.startsWith('"') || !lit.endsWith('"')) throw new Error("不是字符串字面量: " + lit);
  return lit.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, "\\");
}

const text = readFileSync(PLUGIN, "utf8").replace(/\r\n/g, "\n");
const pairs = [];
for (const line of text.split("\n")) {
  const s = line.trim();
  const MARK = "response.body.replace(";
  if (!s.startsWith("response if ") || !s.includes(MARK)) continue;
  const call = s.slice(s.indexOf(MARK) + MARK.length);
  const args = splitArgs(call.slice(0, call.lastIndexOf(")")));
  if (args.length !== 2) throw new Error(`response.body.replace 需要 2 个参数，实际 ${args.length}`);

  const rxSrc = asList(args[0]);
  const repSrc = asList(args[1]);
  if (rxSrc.length !== repSrc.length) {
    throw new Error(`数组长度不一致：${rxSrc.length} vs ${repSrc.length}`);
  }
  for (let k = 0; k < rxSrc.length; k++) {
    const { pattern, flags } = asRegex(rxSrc[k]);
    pairs.push({ pattern, flags, rep: asString(repSrc[k]), raw: s });
  }
}
console.log(`从插件解析出 ${pairs.length} 条替换规则`);

// ── 应用到真实响应 ──
let body = readFileSync(src, "utf8");
console.log(`原始 init 响应：${body.length} 字节`);
const before = JSON.parse(body);

for (const { pattern, flags, rep } of pairs) {
  const re = new RegExp(pattern, flags.includes("g") ? flags : flags + "g");
  const n = (body.match(re) || []).length;
  if (n === 0) console.log(`  ⚠️  0 次命中  /${pattern}/`);
  body = body.replace(re, rep);
}

let after;
try {
  after = JSON.parse(body);
} catch (e) {
  console.error("❌ 改写后 JSON 解析失败：" + e.message);
  process.exit(1);
}
console.log(`改写后：${body.length} 字节，JSON 仍可解析 ✅`);

// ── 断言 ──
const EXPECT = [
  ["SplashAd.Type", ""],
  ["SplashAd.hType", ""],
  ["SplashAd.resumeType", ""],
  ["SplashAd.onResume", 0],
  ["SplashAd.Expires", 0],
  ["SplashAd.resumeExpires", "0"],
  ["Ad.PRELOAD", "0"],
  ["SplashAd.openType", "click"],
  ["SplashAd.sensitivity", "0"],
  ["SplashAd.sensorDelay", "999"],
];

// 在整棵树里找 extraDataArr
function findAll(node, key, out = []) {
  if (Array.isArray(node)) node.forEach((v) => findAll(v, key, out));
  else if (node && typeof node === "object") {
    if (key in node) out.push(node[key]);
    Object.values(node).forEach((v) => findAll(v, key, out));
  }
  return out;
}

let fail = 0;
for (const [k, want] of EXPECT) {
  const got = findAll(after, k);
  const ok = got.length === 1 && got[0] === want;
  console.log(`  ${ok ? "✅" : "❌"} ${k.padEnd(26)} = ${JSON.stringify(got[0])}  (期望 ${JSON.stringify(want)})`);
  if (!ok) fail++;
}

// 其它业务配置必须原封不动
const KEEP = ["selectedHomeTab", "Ad.TANX_APP_ID", "Headline.HeadStyle", "MediaPlayer.jar.md5"];
for (const k of KEEP) {
  const a = findAll(before, k)[0], b = findAll(after, k)[0];
  const ok = a === b;
  console.log(`  ${ok ? "✅" : "❌"} 保留 ${k.padEnd(20)} = ${JSON.stringify(b)}`);
  if (!ok) fail++;
}

if (fail) {
  console.error(`\n❌ ${fail} 项断言失败`);
  process.exit(1);
}
console.log("\n✅ 全部通过：开屏广告配置已清除，其余配置保持原样");
