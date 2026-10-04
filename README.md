# Loon 插件仓库

[![CI](https://github.com/imacte/Loon-plugins/actions/workflows/ci.yml/badge.svg)](https://github.com/imacte/Loon-plugins/actions/workflows/ci.yml)
![Loon](https://img.shields.io/badge/Loon-3.5.1%20(978)%2B-blue)
![License](https://img.shields.io/badge/license-MIT-green)

自用 Loon 插件合集。每个插件都基于**真实抓包**编写，规则里的每一条拦截都能对应到具体的请求记录，不堆砌网上抄来的域名清单。

**约定**：插件按 App 组织，一个 App 一个插件；图标用该 App 在 App Store 的官方图标。

## 插件列表

<!-- PLUGINS:START -->

| 插件 | 说明 | 标签 | 一键导入 | 源文件 |
| --- | --- | --- | --- | --- |
| **酷安 去广告** | 改掉酷安 /v6/main/init 下发的开屏广告配置（穿山甲 GroMore 聚合，site 5156243）：清空广告位、关掉「切回前台也弹」和广告预加载、把摇一摇/滑动误触灵敏度归零。不动广告 SDK 域名，因此不怕素材被预缓存。 | `去广告` `酷安` `开屏广告` | [一键导入](https://www.nsloon.com/openloon/import?plugin=https://raw.githubusercontent.com/imacte/Loon-plugins/main/plugins/Coolapk-AdBlock.plugin) | [源文件](https://raw.githubusercontent.com/imacte/Loon-plugins/main/plugins/Coolapk-AdBlock.plugin) |

<!-- PLUGINS:END -->

## 安装

### 方式一：一键导入（推荐）

点击上面表格里的 **一键导入**，Loon 会自动打开并询问是否添加。

### 方式二：手动从 URL 添加

Loon → 配置 → 插件 → 右上角 `+` → 从 URL 添加，粘贴插件的 raw 地址：

```
https://raw.githubusercontent.com/imacte/Loon-plugins/main/plugins/Coolapk-AdBlock.plugin
```

### 方式三：作为插件仓库订阅

如果你的 Loon 版本支持「插件仓库」，订阅本仓库的索引文件：

```
https://raw.githubusercontent.com/imacte/Loon-plugins/main/gallery.json
```

> 注：`gallery.json` 是仓库索引，字段沿用社区 Loon Gallery 的约定。如果当前 Loon 版本读取该索引失败，用方式一或方式二即可，效果完全一样。

---

## 酷安 去广告

抓包样本：`32_1791120312806`（开屏广告 → 京东）、`30_1791116195395`（开屏广告 → 淘宝）。

### 为什么拦 SDK 域名没用

两个抓包对比下来的结论很明确：

- `32` 这次，穿山甲域名配置 `tnc3-aliec2.zijieapi.com/get_domains` **已经被拦成 `{}`**，酷安照样弹开屏、照样跳京东；
- `32` 的酷安阶段总共只有 4 个请求，**完全没有广告请求** —— 因为广告是**预加载**的（`Ad.PRELOAD = "1"`），素材在你看不到的时候就已经拉好缓存在本地了；
- 点击跳转走的是 iOS deeplink，网络层工具拦不到 scheme。

所以「拦广告 SDK 域名」只能阻止**下一次**拉取，拦不住已经在缓存里的那条广告。

### 真正的开关在酷安自己的接口里

`GET https://api.coolapk.com/v6/main/init` 的 `extraDataArr` 里直接下发了全套开屏广告配置：

| 键 | 实测值 | 含义 |
| --- | --- | --- |
| `SplashAd.Type` | `GM_SPLASH \| 5156243 \| 102140761` | 穿山甲 GroMore 聚合开屏，`5156243` 就是 pangle_site_id |
| `SplashAd.hType` | `GM_SPLASH \| 5156243 \| 103293853` | 第二个广告位 |
| `SplashAd.onResume` | `1` | **切回前台也弹开屏** |
| `SplashAd.resumeExpires` | `"60"` | 60 秒后切回前台就再弹一次 |
| `SplashAd.Expires` | `900` | 配置缓存 15 分钟，所以热启动照样弹 |
| `SplashAd.openType` | `"swipe_or_click"` | **滑动也算点击** |
| `SplashAd.sensitivity` | `"11"` | **摇一摇灵敏度 11，极易误触跳转** |
| `Ad.PRELOAD` | `"1"` | 广告预加载 |
| `Ad.TANX_APP_ID` / `Ad.GM_APP_ID` / `Ad.GDT_APP_ID` / `Ad.KS_APP_ID` / `Ad.BZ_APP_ID` | … | 聚合的各家广告平台 ID |

**这可能就是「莫名其妙跳到淘宝 / 京东」的原因**：`swipe_or_click` + `sensitivity: 11` + `sensorDelay: 1`，手一晃就跳。

### 插件怎么做的

[Coolapk-AdBlock.plugin](plugins/Coolapk-AdBlock.plugin) 对这 10 个键做正则替换：广告位清空、缓存归零、预加载关掉、误触灵敏度归零，**其余 25 个业务配置一个不动**。

| 开关 | 默认 | 作用 |
| --- | --- | --- |
| `SplashAd` | 开 | 清空 `SplashAd.Type` / `hType` / `resumeType`，客户端不再向聚合 SDK 请求开屏 |
| `ResumeAd` | 开 | 关掉 `onResume`（切回前台也弹）并把 `Expires` 归零 |
| `Preload` | 开 | 关掉 `Ad.PRELOAD` |
| `AntiMisclick` | 开 | `openType` 只认点击、`sensitivity` 归零、`sensorDelay` 拉长 |

验证脚本已接入 CI，用的是从真实响应里裁出来的 fixture：

```bash
node tools/verify-splash.mjs
# ✅ SplashAd.Type = ""     ✅ 保留 selectedHomeTab = "V9_HOME_TAB_HEADLINE"
# ✅ Ad.PRELOAD    = "0"    ✅ 保留 Ad.TANX_APP_ID  = "101876"
# ✅ 改写后 JSON 仍可解析   （10 个广告键清除，25 个业务键零改动）
```

### ⚠️ 先删掉旧规则

如果你之前用 `response.body.mock` 之类的方式把 `/v6/main/init` 整个替换成 `{"data":[]}`，**请删掉它**：

1. 它会把首页 / Tab 配置一起干掉；
2. 响应内容为空时，酷安很可能沿用上一份缓存的配置，`SplashAd.*` 反而一直活着 —— 这大概就是为什么 `init` 被清空了，开屏广告却还在。

---

## 仓库结构

```
.
├── plugins/                 插件源文件，一个 App 一个 .plugin
├── icons/                   插件图标，用对应 App 的 App Store 官方图标
├── tools/
│   ├── build.mjs            校验 + 生成 gallery.json 与 README 表格
│   ├── verify-splash.mjs    用 fixture 验证开屏广告改写规则
│   └── fetch_app_icons.py   从 App Store 抓取 App 官方图标
├── tests/fixtures/          从真实抓包裁剪出来的测试样本
├── gallery.json             插件仓库索引
└── .github/workflows/ci.yml 提交时自动校验
```

## 开发

```bash
# 校验所有插件 + 重新生成 gallery.json 和 README 表格
node tools/build.mjs

# 只校验，并检查产物是否与 plugins/ 同步（CI 用）
node tools/build.mjs --check

# 用内置 fixture 验证开屏广告改写规则，断言 JSON 仍可解析且业务配置未被改动
node tools/verify-splash.mjs

# 抓取 App 官方图标（新增 App 时先改 tools/fetch_app_icons.py 里的 APPS）
python tools/fetch_app_icons.py
```

`tools/build.mjs` 会检查：

- `#!name` / `#!desc` / `#!author` / `#!type` 是否齐全，`#!type` 是否合法
- 每条 `[Rewrite]` 是否符合 `<phase> if <cond> then <action>` 句式
- 条件里的正则能否编译
- 条件与 Action 里引用的 `${参数}` 是否已在 `[Argument]` 声明、是否引用了未捕获的变量
- `request` 阶段是否误用了 `response.*` 动作
- `[Rule]` 的策略是否在插件允许的 `DIRECT / REJECT 系列 / PROXY` 之内
- 插件名是否重复
- 有 `[Rewrite]` 却没有 `[MitM]` 时给出警告

## 添加新插件

以「给某个 App 去广告」为例：

1. 在 `tools/fetch_app_icons.py` 的 `APPS` 里加上 `App 名: App Store 数字 ID`，跑 `python tools/fetch_app_icons.py` 拿到官方图标
2. 把 `App-AdBlock.plugin` 丢进 `plugins/`，`#!icon` 指向 `icons/<App>.png`
3. 跑到真实流量抓包，把规则依据写进文件头的注释里
4. 跑 `node tools/build.mjs`
5. 提交，CI 会自动校验

## 免责声明

本项目仅供学习与网络调试研究使用。所有规则均来自作者本机流量的分析结果，不保证适用于其他版本的应用。插件图标版权归各 App 开发者所有，此处仅用于标示插件对应的 App。请勿用于任何商业或非法用途，使用产生的一切后果由使用者自行承担。

## License

[MIT](LICENSE)
