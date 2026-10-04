# Loon 插件仓库

[![CI](https://github.com/imacte/Loon-plugins/actions/workflows/ci.yml/badge.svg)](https://github.com/imacte/Loon-plugins/actions/workflows/ci.yml)
![Loon](https://img.shields.io/badge/Loon-3.5.1%20(978)%2B-blue)
![License](https://img.shields.io/badge/license-MIT-green)

自用 Loon 插件合集。每个插件都基于**真实抓包**编写，规则里的每一条拦截都能对应到具体的请求记录，不堆砌网上抄来的域名清单。

## 插件列表

<!-- PLUGINS:START -->

| 插件 | 说明 | 标签 | 安装 |
| --- | --- | --- | --- |
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

## 仓库结构

```
.
├── plugins/                 插件源文件，一个 .plugin 一个插件
├── icons/                   插件图标
├── tools/
│   ├── build.mjs            校验 + 生成 gallery.json 与 README 表格
│   └── make_icons.py        生成图标
├── gallery.json             插件仓库索引
└── .github/workflows/ci.yml 提交时自动校验
```

## 开发

```bash
# 校验所有插件 + 重新生成 gallery.json 和 README 表格
node tools/build.mjs

# 只校验，并检查产物是否与 plugins/ 同步（CI 用）
node tools/build.mjs --check

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
