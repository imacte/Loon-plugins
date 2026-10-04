#!/usr/bin/env node
/**
 * Loon 插件仓库构建脚本
 *
 *   node tools/build.mjs          生成 gallery.json 并刷新 README 的插件表格
 *   node tools/build.mjs --check  只校验 + 比对，有差异就退出码 1（给 CI 用）
 *
 * 做三件事：
 *   1. 解析 plugins/*.plugin 的 #! 元信息与各配置段
 *   2. 校验语法（Rewrite v2 句式、正则能否编译、${参数} 是否已声明、[Rule] 策略是否合法）
 *   3. 生成 gallery.json，并把 README 两个标记之间的表格重写掉
 */

import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const PLUGIN_DIR = join(ROOT, "plugins");
const CHECK = process.argv.includes("--check");

const OWNER = "imacte";
const REPO = "Loon-plugins";
const BRANCH = "main";
const RAW = `https://raw.githubusercontent.com/${OWNER}/${REPO}/${BRANCH}`;
const REPO_URL = `https://github.com/${OWNER}/${REPO}`;

/** Loon 插件内 [Rule] 允许使用的策略（官方文档：DIRECT / REJECT 系列 / PROXY） */
const ALLOWED_RULE_POLICIES = new Set([
  "DIRECT", "REJECT", "REJECT-IMG", "REJECT-DICT", "REJECT-ARRAY", "REJECT-DROP", "PROXY",
]);

/** Rewrite 条件里可用的内置变量前缀 */
const BUILTIN_VARS = [/^url$/, /^request\./, /^response\./];

const errors = [];
const warnings = [];
const fail = (file, msg) => errors.push(`${file}: ${msg}`);

// ─────────────────────────── 解析 ───────────────────────────

function parsePlugin(path) {
  const text = readFileSync(path, "utf8").replace(/\r\n/g, "\n");
  const lines = text.split("\n");
  const meta = {};
  const sections = {};
  let current = null;

  for (const line of lines) {
    const trimmed = line.trim();

    const m = trimmed.match(/^#!\s*([A-Za-z_][\w]*)\s*=\s*(.*)$/);
    if (m) {
      meta[m[1]] = m[2].trim();
      continue;
    }
    const sec = trimmed.match(/^\[([^\]]+)\]$/);
    if (sec) {
      current = sec[1].toLowerCase();
      sections[current] ??= [];
      continue;
    }
    if (current && trimmed && !trimmed.startsWith("#")) {
      sections[current].push(trimmed);
    }
  }
  return { file: basename(path), path, text, meta, sections };
}

/** 从 `~= /re/flags` 里抽出正则字面量（按未转义的 / 找结尾） */
function extractRegexLiterals(condition) {
  const out = [];
  let idx = condition.indexOf("~= /");
  while (idx !== -1) {
    const rest = condition.slice(idx + 4);
    let end = -1;
    for (let i = 0; i < rest.length; i++) {
      if (rest[i] === "\\") { i++; continue; }
      if (rest[i] === "/") end = i;
    }
    if (end === -1) break;
    out.push(rest.slice(0, end));
    idx = condition.indexOf("~= /", idx + 4 + end + 1);
  }
  return out;
}

function declaredArguments(sections) {
  const names = new Set();
  for (const line of sections.argument ?? []) {
    const m = line.match(/^([A-Za-z_][\w]*)\s*=/);
    if (m) names.add(m[1]);
  }
  return names;
}

// ─────────────────────────── 校验 ───────────────────────────

function validatePlugin(p) {
  const { file, meta, sections } = p;

  for (const key of ["name", "desc", "author", "type"]) {
    if (!meta[key]) fail(file, `缺少 #!${key}`);
  }
  if (meta.type && meta.type !== "normal" && meta.type !== "parser") {
    fail(file, `#!type 只能是 normal 或 parser，当前是 ${meta.type}`);
  }
  if (meta.icon && !/^https:\/\//.test(meta.icon)) {
    fail(file, `#!icon 必须是 https 地址`);
  }

  // ── Rewrite v2 ──
  const rewriteLines = sections.rewrite ?? [];
  const args = declaredArguments(sections);
  const capturesByLine = [];

  rewriteLines.forEach((line, i) => {
    const where = `[Rewrite] 第 ${i + 1} 条`;

    if (!/^(request|response) if .+ then .+$/.test(line)) {
      fail(file, `${where} 句式不符合 "<phase> if <cond> then <action>"：${line}`);
      return;
    }

    const [condRaw, actionRaw] = [line.slice(0, line.indexOf(" then ")), line.slice(line.indexOf(" then ") + 6)];

    // 正则必须能编译
    for (const re of extractRegexLiterals(condRaw)) {
      try {
        new RegExp(re);
      } catch (e) {
        fail(file, `${where} 正则无法编译 /${re}/ → ${e.message}`);
      }
    }

    // 条件里引用的 ${参数} 必须已在 [Argument] 声明（内置变量除外）
    const used = [...condRaw.matchAll(/\$\{([^}]+)\}/g)].map((m) => m[1]);
    for (const v of used) {
      if (BUILTIN_VARS.some((r) => r.test(v))) continue;
      const head = v.split(".")[0];
      // 条件正则捕获的变量（as name）在下面统一登记
      if (!args.has(head) && !v.includes(".")) {
        fail(file, `${where} 引用了未在 [Argument] 声明的参数 \${${v}}`);
      }
    }

    // 记录本条的正则捕获名，供 Action 侧校验
    const caps = new Set();
    for (const m of condRaw.matchAll(/\bas\s+([A-Za-z_][\w]*(?:\s*\|\s*[A-Za-z_][\w]*)*)/g)) {
      m[1].split("|").forEach((n) => caps.add(n.trim()));
    }
    capturesByLine[i] = caps;

    // Action 侧引用的 ${name.n} 必须是捕获名或已声明参数
    for (const m of actionRaw.matchAll(/\$\{([^}]+)\}/g)) {
      const v = m[1];
      if (BUILTIN_VARS.some((r) => r.test(v))) continue;
      const head = v.split(".")[0];
      if (!args.has(head) && !caps.has(head)) {
        fail(file, `${where} Action 引用了未定义变量 \${${v}}`);
      }
    }

    // 阶段与动作必须匹配，且一条普通 Rewrite 不能同时含请求与响应动作
    const isRequest = line.startsWith("request ");
    const actionPart = actionRaw;
    const hasReqAction = /\brequest\.(header|body|json)\./.test(actionPart);
    const hasResAction = /\bresponse\.(header|body|json)\./.test(actionPart);
    if (isRequest && (hasResAction || /then .*\bresponse\./.test(line))) {
      fail(file, `${where} request 阶段不能使用 response.* 动作`);
    }
    if (!isRequest && hasReqAction) {
      fail(file, `${where} response 阶段不能使用 request.* 动作`);
    }
    if (hasReqAction && hasResAction) {
      fail(file, `${where} 同一条 Rewrite 不能同时包含请求与响应动作`);
    }
  });

  // ── [Rule] ──
  (sections.rule ?? []).forEach((line, i) => {
    const parts = line.split(",").map((s) => s.trim());
    if (parts.length < 2) {
      fail(file, `[Rule] 第 ${i + 1} 条缺少策略：${line}`);
      return;
    }
    const policy = parts[parts.length - 1].toUpperCase();
    if (!ALLOWED_RULE_POLICIES.has(policy)) {
      fail(file, `[Rule] 第 ${i + 1} 条策略 ${policy} 非法（插件内只允许 DIRECT / REJECT 系列 / PROXY）`);
    }
  });

  // ── MitM 与 Rewrite 的一致性 ──
  const hasMitm = (sections.mitm ?? []).some((l) => /^hostname\s*=/.test(l));
  if (rewriteLines.length > 0 && !hasMitm) {
    warnings.push(`${file}: 有 [Rewrite] 但没有 [MitM]，HTTPS 请求不会被改写`);
  }

  return {
    file,
    slug: basename(file, ".plugin"),
    name: meta.name ?? file,
    meta,
    rewriteCount: rewriteLines.length,
    ruleCount: (sections.rule ?? []).length,
    hasMitm,
  };
}

// ─────────────────────────── 产出 ───────────────────────────

function buildGallery(plugins) {
  return {
    name: "imacte 的 Loon 插件仓库",
    description: "自用 Loon 插件合集，以真实抓包为依据编写，按需开关。",
    homepage: REPO_URL,
    plugins: plugins.map((p) => ({
      name: p.meta.name,
      description: p.meta.desc ?? "",
      url: `${RAW}/plugins/${p.file}`,
      icon: p.meta.icon ?? "",
      homepage: p.meta.homepage ?? REPO_URL,
      author: p.meta.author ?? "",
      tag: (p.meta.tag ?? "").split(",").map((s) => s.trim()).filter(Boolean),
      type: p.meta.type ?? "normal",
    })),
  };
}

function buildTable(plugins) {
  const rows = plugins.map((p) => {
    const raw = `${RAW}/plugins/${p.file}`;
    const importUrl = `https://www.nsloon.com/openloon/import?plugin=${raw}`;
    const tags = (p.meta.tag ?? "").split(",").map((s) => s.trim()).filter(Boolean)
      .map((t) => `\`${t}\``).join(" ");
    return `| **${p.meta.name}** | ${p.meta.desc ?? ""} | ${tags} | [一键导入](${importUrl}) · [源文件](${raw}) |`;
  });
  return [
    "| 插件 | 说明 | 标签 | 安装 |",
    "| --- | --- | --- | --- |",
    ...rows,
  ].join("\n");
}

// ─────────────────────────── 主流程 ───────────────────────────

const files = readdirSync(PLUGIN_DIR).filter((f) => f.endsWith(".plugin")).sort();

/**
 * README 与 gallery.json 里的展示顺序。
 * 不在名单里的插件按文件名排在后面，新增插件时把它加进来即可。
 */
const DISPLAY_ORDER = [
  "Coolapk-SplashAd-Block.plugin",
  "Taobao-Coolapk-AdBlock.plugin",
  "Taobao-Coolapk-AdBlock-Rule.plugin",
];
files.sort((a, b) => {
  const ia = DISPLAY_ORDER.indexOf(a);
  const ib = DISPLAY_ORDER.indexOf(b);
  return (ia === -1 ? DISPLAY_ORDER.length : ia) - (ib === -1 ? DISPLAY_ORDER.length : ib) || a.localeCompare(b);
});

if (files.length === 0) {
  console.error("plugins/ 下没有 .plugin 文件");
  process.exit(1);
}

const plugins = files.map((f) => validatePlugin(parsePlugin(join(PLUGIN_DIR, f))));

// 重名检查
const seen = new Map();
for (const p of plugins) {
  if (seen.has(p.name)) fail(p.file, `插件名与 ${seen.get(p.name)} 重复：${p.name}`);
  seen.set(p.name, p.file);
}

if (warnings.length) warnings.forEach((w) => console.warn(`⚠️  ${w}`));
if (errors.length) {
  errors.forEach((e) => console.error(`❌ ${e}`));
  console.error(`\n校验失败：${errors.length} 个问题`);
  process.exit(1);
}

console.log(`✅ 校验通过：${plugins.length} 个插件`);
for (const p of plugins) {
  console.log(`   ${p.file}  Rewrite ${p.rewriteCount} 条 / Rule ${p.ruleCount} 条 / MitM ${p.hasMitm ? "有" : "无"}`);
}

const gallery = buildGallery(plugins);
const galleryJson = JSON.stringify(gallery, null, 2) + "\n";

const readmePath = join(ROOT, "README.md");
if (!existsSync(readmePath)) {
  console.error("README.md 不存在");
  process.exit(1);
}
let readme = readFileSync(readmePath, "utf8");
const START = "<!-- PLUGINS:START -->";
const END = "<!-- PLUGINS:END -->";
const si = readme.indexOf(START);
const ei = readme.indexOf(END);
if (si === -1 || ei === -1 || ei < si) {
  console.error(`README.md 缺少 ${START} / ${END} 标记`);
  process.exit(1);
}
const nextReadme =
  readme.slice(0, si + START.length) + "\n\n" + buildTable(plugins) + "\n\n" + readme.slice(ei);

if (CHECK) {
  const galleryPath = join(ROOT, "gallery.json");
  const currentGallery = existsSync(galleryPath) ? readFileSync(galleryPath, "utf8") : "";
  const stale = [];
  if (currentGallery !== galleryJson) stale.push("gallery.json");
  if (readme !== nextReadme) stale.push("README.md");
  if (stale.length) {
    console.error(`❌ 以下文件与 plugins/ 不同步，请运行 node tools/build.mjs：${stale.join(", ")}`);
    process.exit(1);
  }
  console.log("✅ gallery.json 与 README.md 均为最新");
} else {
  writeFileSync(join(ROOT, "gallery.json"), galleryJson);
  writeFileSync(readmePath, nextReadme);
  console.log("📝 已写入 gallery.json 与 README.md");
}
