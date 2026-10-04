"""按 App 抓取官方图标，生成 Loon 插件用的 256x256 PNG。

约定：**哪个 App 的去广告插件，就用哪个 App 自己的图标。**
数据源是 Apple 的 iTunes Lookup API（App Store 官方素材），不是自己画的。

用法：
    python tools/fetch_app_icons.py              # 抓取全部
    python tools/fetch_app_icons.py Coolapk      # 只抓其中一个

新增 App：把 App Store 的数字 ID 填进下面的 APPS 即可。
    ID 可以从 App Store 链接里拿到： apps.apple.com/cn/app/id1422581869
"""
from __future__ import annotations

import io
import json
import os
import sys
import urllib.request

from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ICON_DIR = os.path.join(ROOT, "icons")
RAW_DIR = os.path.join(ICON_DIR, "_raw")

SIZE = 256
RADIUS = 58  # 与 iOS 图标视觉接近的圆角

# 本地文件名 -> App Store ID
APPS: dict[str, int] = {
    "Coolapk": 1422581869,   # 酷安-分享美好科技生活
}

UA = {"User-Agent": "Mozilla/5.0 (compatible; loon-plugins-icon-fetcher)"}


def http_get(url: str) -> bytes:
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=30) as resp:
        return resp.read()


def lookup_artwork(app_id: int) -> str:
    """拿到 1024x1024 的 PNG 素材地址。"""
    url = f"https://itunes.apple.com/lookup?id={app_id}&country=cn"
    data = json.loads(http_get(url).decode("utf-8"))
    if data.get("resultCount", 0) == 0:
        raise RuntimeError(f"App Store 查不到 id={app_id}")
    art = data["results"][0]["artworkUrl512"]
    # .../512x512bb.jpg -> .../1024x1024bb.png
    for suffix in ("512x512bb.jpg", "512x512bb.png"):
        if art.endswith(suffix):
            art = art[: -len(suffix)] + "1024x1024bb.png"
            break
    return art


def rounded(img: Image.Image, radius: int) -> Image.Image:
    mask = Image.new("L", img.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, img.size[0] - 1, img.size[1] - 1), radius=radius, fill=255)
    out = Image.new("RGBA", img.size, (0, 0, 0, 0))
    out.paste(img.convert("RGB"), (0, 0), mask)
    return out


def build(name: str, app_id: int) -> None:
    art = lookup_artwork(app_id)
    raw = http_get(art)
    os.makedirs(RAW_DIR, exist_ok=True)
    with open(os.path.join(RAW_DIR, f"{name}-1024.png"), "wb") as f:
        f.write(raw)

    img = Image.open(io.BytesIO(raw)).convert("RGB").resize((SIZE, SIZE), Image.LANCZOS)
    out = os.path.join(ICON_DIR, f"{name}.png")
    rounded(img, RADIUS).save(out, "PNG", optimize=True)
    print(f"  ✅ {name}.png  <- App Store id={app_id}  ({len(raw)} B 原始素材)")


def main() -> None:
    targets = sys.argv[1:] or list(APPS)
    unknown = [t for t in targets if t not in APPS]
    if unknown:
        raise SystemExit(f"未知的 App：{unknown}；可选 {list(APPS)}")
    print("从 App Store 抓取官方图标：")
    for name in targets:
        build(name, APPS[name])


if __name__ == "__main__":
    main()
