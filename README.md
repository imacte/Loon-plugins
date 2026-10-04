# Loon 插件仓库

[![CI](https://github.com/imacte/Loon-plugins/actions/workflows/ci.yml/badge.svg)](https://github.com/imacte/Loon-plugins/actions/workflows/ci.yml)
![Loon](https://img.shields.io/badge/Loon-3.5.1%20(978)%2B-blue)
![License](https://img.shields.io/badge/license-MIT-green)

自用 Loon 插件合集。每个插件都基于**真实抓包**编写，规则里的每一条拦截都能对应到具体的请求记录，不堆砌网上抄来的域名清单。

## 插件列表

<!-- PLUGINS:START -->

| 插件 | 说明 | 标签 | 安装 |
| --- | --- | --- | --- |
| **酷安 开屏广告拦截** | 直接改掉酷安自己 /v6/main/init 下发的开屏广告配置（穿山甲 GroMore 聚合，site 5156243），关掉「切回前台也弹」和「广告预加载」，并把摇一摇/滑动误触的灵敏度归零。不需要拦截广告 SDK 域名，因此不怕素材被预缓存。 | `去广告` `酷安` `开屏广告` | [一键导入](https://www.nsloon.com/openloon/import?plugin=https://raw.githubusercontent.com/imacte/Loon-plugins/main/plugins/Coolapk-SplashAd-Block.plugin) · [源文件](https://raw.githubusercontent.com/imacte/Loon-plugins/main/plugins/Coolapk-SplashAd-Block.plugin) |
| **去广告·淘宝/天猫/酷安** | 拦截淘宝、天猫、酷安中仍在放行的广告 SDK（阿里妈妈 Tanx、穿山甲、京东联盟）、埋点上报、设备指纹与推广落地页。规则由真实抓包 30_1791116195395 生成，6 个开关可按需裁剪。 | `去广告` `淘宝` `天猫` `酷安` | [一键导入](https://www.nsloon.com/openloon/import?plugin=https://raw.githubusercontent.com/imacte/Loon-plugins/main/plugins/Taobao-Coolapk-AdBlock.plugin) · [源文件](https://raw.githubusercontent.com/imacte/Loon-plugins/main/plugins/Taobao-Coolapk-AdBlock.plugin) |
| **去广告·淘宝/酷安（规则版）** | 与「去广告·淘宝/天猫/酷安」同一份域名清单，改用 Rule 规则在连接层直接拦截。不需要开启 MitM，不做证书解密，适合不想装证书或想彻底掐断广告域名的场景。 | `去广告` `淘宝` `天猫` `酷安` | [一键导入](https://www.nsloon.com/openloon/import?plugin=https://raw.githubusercontent.com/imacte/Loon-plugins/main/plugins/Taobao-Coolapk-AdBlock-Rule.plugin) · [源文件](https://raw.githubusercontent.com/imacte/Loon-plugins/main/plugins/Taobao-Coolapk-AdBlock-Rule.plugin) |

<!-- PLUGINS:END -->

## 安装

### 方式一：一键导入（推荐）

点击上面表格里的 **一键导入**，Loon 会自动打开并询问是否添加。

### 方式二：手动从 URL 添加

Loon → 配置 → 插件 → 右上角 `+` → 从 URL 添加，粘贴插件的 raw 地址：

```
https://raw.githubusercontent.com/imacte/Loon-plugins/main/plugins/Taobao-Coolapk-AdBlock.plugin
```

### 方式三：作为插件仓库订阅

如果你的 Loon 版本支持「插件仓库」，订阅本仓库的索引文件：

```
https://raw.githubusercontent.com/imacte/Loon-plugins/main/gallery.json
```

> 注：`gallery.json` 是仓库索引，字段沿用社区 Loon Gallery 的约定。如果当前 Loon 版本读取该索引失败，用方式一或方式二即可，效果完全一样。

---

## 淘宝 / 天猫 / 酷安 去广告

抓包样本：103 条请求 / 49 个域名，覆盖 **淘宝 10.66.30** 与 **酷安 16.6**。

### 拦掉了什么

| 类别 | 具体目标 |
| --- | --- |
| 广告 SDK | 阿里妈妈 Tanx（`sdk-config.tanx.com` 等）、穿山甲 Pangle（`webcast-open.douyin.com`、`lf-cdn-tos.bytescm.com`、`mssdk.volces.com`、`tnc*.zijieapi.com`）、京东开普勒联盟（`dg.k.jd.com`、`dgstatic.jd.com`） |
| 广告归因 | 数盟 `idfa2.shuzilm.cn`、中国移动 IDAA `iuni.telecome.cn` |
| 淘宝广告位 | `adashx.m.taobao.com`、`h-adashx.ut.taobao.com`、阿里妈妈 / 搜广视频素材、`amdc` 的裸 IP 直连绕过 |
| 埋点上报 | `*.mmstat.com`（`gm` / `log` / `s-gm` / `wgo`）、`loggw-ex.alipay.com`、阿里云 SLS、`apmplus.volces.com` |
| 设备指纹 | `fourier.taobao.com`、`cdn.ynuf.aliapp.org`、`alsc-fingerprint.ele.me` |

### 两个版本的差别

| | Rewrite 版 | 规则版 |
| --- | --- | --- |
| 原理 | `[Rewrite]` 在解密后的请求上返回假响应 | `[Rule]` 在连接层直接断连 |
| 需要 MitM | **需要** | **不需要** |
| 可开关 | 6 个开关，按需裁剪 | 无（Loon 插件规则不支持参数化） |
| 适合 | 想精细控制、只要拦一部分 | 不想装证书、想彻底掐断 |

### 开关说明（Rewrite 版）

| 开关 | 默认 | 作用 |
| --- | --- | --- |
| `AdSDK` | 开 | 三家广告 SDK 与广告归因，收益最大 |
| `Tracker` | 开 | 埋点统计与日志上报 |
| `TaobaoAd` | 开 | 淘宝天猫广告接口 |
| `DeviceId` | 开 | `fourier` 指纹脚本与阿里 UMID，风控影响很小 |
| `AliSec` | **关** | 阿里安全无痕验证，拦狠了可能出现登录异常或「系统繁忙」 |
| `Promo` | **关** | 推广弹窗与天猫落地页，会连带干掉正常活动页 |

### 不会误伤的域名

以下虽然也在抓包里出现，但属于正常业务，**没有**被拦截：

`gw.alipayobjects.com` · `*.alicdn.com` · `mdn.alipayobjects.com` · `modeldownload.taobao.com` · `image.coolapk.com` · `avatar.coolapk.com` · `acs.m.taobao.com` · `mobilegw.alipay.com` · `119.29.29.88`（HTTPDNS）· `amdc-sibling.alipay.com.cn`（网络调度）

---

## 酷安开屏广告（重点）

抓包样本：`32_1791120312806`（跳京东）、`30_1791116195395`（跳淘宝）。

### 为什么拦域名没用

两个抓包对比下来结论很明确：

- `32` 这次，穿山甲域名配置 `tnc3-aliec2.zijieapi.com/get_domains` **已经被拦成 `{}`**，酷安照样弹开屏、照样跳京东；
- `32` 的 Coolapk 阶段总共只有 4 个请求，**完全没有广告请求**——因为广告是**预加载**的（`Ad.PRELOAD = "1"`），素材在你看不到的时候就已经拉好缓存在本地了；
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

[Coolapk-SplashAd-Block](plugins/Coolapk-SplashAd-Block.plugin) 对这 10 个键做正则替换：广告位清空、缓存时间归零、预加载关掉、误触灵敏度归零，**其余 25 个业务配置一个不动**。

验证脚本已接入 CI，用的是从真实响应里裁出来的 fixture：

```bash
node tools/verify-splash.mjs
# ✅ SplashAd.Type = ""     ✅ 保留 selectedHomeTab = "V9_HOME_TAB_HEADLINE"
# ✅ Ad.PRELOAD    = "0"    ✅ 保留 Ad.TANX_APP_ID  = "101876"
# ✅ 改写后 JSON 仍可解析
```

### ⚠️ 先删掉旧规则

如果你之前用 `response.body.mock` 之类的方式把 `/v6/main/init` 整个替换成 `{"data":[]}`，**请删掉它**：

1. 它会把首页 / Tab 配置一起干掉；
2. 响应内容为空时，酷安很可能沿用上一份缓存的配置，`SplashAd.*` 反而一直活着 —— 这大概就是为什么 `init` 被清空了，开屏广告却还在。

---

## 仓库结构

```
.
├── plugins/                 插件源文件，一个 .plugin 一个插件
├── icons/                   插件图标
├── tools/
│   ├── build.mjs            校验 + 生成 gallery.json 与 README 表格
│   ├── verify-splash.mjs    用 fixture 验证开屏广告改写规则
│   └── make_icons.py        生成图标
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

# 重新生成图标
python tools/make_icons.py
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

1. 把 `xxx.plugin` 丢进 `plugins/`，文件头写上 `#!name` / `#!desc` / `#!author` / `#!icon` / `#!tag` / `#!type`
2. 跑 `node tools/build.mjs`
3. 提交，CI 会自动校验

## 免责声明

本项目仅供学习与网络调试研究使用。所有规则均来自作者本机流量的分析结果，不保证适用于其他版本的应用。请勿用于任何商业或非法用途，使用产生的一切后果由使用者自行承担。

## License

[MIT](LICENSE)
