"""生成 Loon 插件仓库图标（256x256 PNG）。

用法： python tools/make_icons.py
"""
from __future__ import annotations

import math
import os
from PIL import Image, ImageDraw

SIZE = 256
OUT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "icons")


def rounded_gradient(size: int, c1: tuple[int, int, int], c2: tuple[int, int, int], radius: int) -> Image.Image:
    """圆角矩形 + 对角线性渐变。"""
    grad = Image.new("RGB", (size, size))
    px = grad.load()
    for y in range(size):
        for x in range(size):
            t = (x + y) / (2 * (size - 1))
            px[x, y] = tuple(round(a + (b - a) * t) for a, b in zip(c1, c2))

    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, size - 1, size - 1), radius=radius, fill=255)

    out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    out.paste(grad, (0, 0), mask)
    return out


def _lerp(p, q, t):
    return (p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t)


def _quad(p0, p1, p2, steps=14):
    """二次贝塞尔采样，用来把盾牌两侧画圆。"""
    out = []
    for i in range(steps + 1):
        t = i / steps
        u = 1 - t
        out.append((
            u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0],
            u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1],
        ))
    return out


def shield_points(cx: float, top: float, half_w: float, bottom: float):
    """盾牌轮廓：顶部圆弧肩线 + 两侧竖直 + 底部收尖。"""
    top_r = (cx + half_w, top + 24)
    top_l = (cx - half_w, top + 24)
    mid_r = (cx + half_w, bottom - 74)
    mid_l = (cx - half_w, bottom - 74)
    tip = (cx, bottom)

    pts = [top_l]
    pts += _quad(top_l, (cx - half_w * 0.35, top - 8), (cx, top))
    pts += _quad((cx, top), (cx + half_w * 0.35, top - 8), top_r)
    pts += _quad(top_r, (cx + half_w * 1.06, (top + 24 + bottom - 74) / 2), mid_r)
    pts += _quad(mid_r, (cx + half_w * 0.86, bottom - 24), tip)
    pts += _quad(tip, (cx - half_w * 0.86, bottom - 24), mid_l)
    pts += _quad(mid_l, (cx - half_w * 1.06, (top + 24 + bottom - 74) / 2), top_l)
    return [(round(x, 2), round(y, 2)) for x, y in pts]


def make_icon(c1, c2, slash_color, path: str) -> None:
    img = rounded_gradient(SIZE, c1, c2, radius=58)
    d = ImageDraw.Draw(img)

    # 白色盾牌
    d.polygon(shield_points(cx=SIZE / 2, top=52, half_w=58, bottom=208), fill=(255, 255, 255, 255))

    # 斜杠（禁止符）——先画同色描边做出「挖空」观感，再画纯色主体
    def bar(width: int, color):
        a = (46, 198)
        b = (210, 56)
        ang = math.atan2(b[1] - a[1], b[0] - a[0])
        nx, ny = -math.sin(ang) * width / 2, math.cos(ang) * width / 2
        d.polygon(
            [
                (a[0] + nx, a[1] + ny),
                (b[0] + nx, b[1] + ny),
                (b[0] - nx, b[1] - ny),
                (a[0] - nx, a[1] - ny),
            ],
            fill=color,
        )

    bar(26, (255, 255, 255, 255))
    bar(16, slash_color + (255,))

    img.save(path, "PNG", optimize=True)
    print("wrote", path, img.size)


def main() -> None:
    os.makedirs(OUT_DIR, exist_ok=True)
    # Rewrite 版：淘宝橙 → 红
    make_icon((255, 122, 32), (226, 42, 48), (226, 42, 48),
              os.path.join(OUT_DIR, "Taobao-Coolapk-AdBlock.png"))
    # 规则版：深蓝 → 青，配色区分
    make_icon((38, 84, 214), (18, 168, 196), (18, 126, 160),
              os.path.join(OUT_DIR, "Taobao-Coolapk-AdBlock-Rule.png"))


if __name__ == "__main__":
    main()
