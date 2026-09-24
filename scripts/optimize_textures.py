# -*- coding: utf-8 -*-
"""
压缩 vendor/img 下的地球贴图：原图保存在 vendor/img/_source/，
输出覆盖到 vendor/img/，在几乎看不出差别的前提下把首屏体积降下来。

用法：
    python scripts/optimize_textures.py            # 只处理缺失的输出
    python scripts/optimize_textures.py --force    # 全部重做
"""
from __future__ import annotations

import os
import sys
from PIL import Image, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "vendor", "img", "_source")
OUT = os.path.join(ROOT, "vendor", "img")

# 文件名 -> (目标尺寸, 格式, 参数, 用途说明)
PLAN = {
    # 白天贴图是首屏最大的一笔开销：屏幕上地球直径最多千把像素，2048 宽足够。
    # 4:4:4 采样 + q90：海洋大面积渐变上不会出现 8x8 色块。
    "earth-blue-marble.jpg": (
        (2048, 1024), "JPEG",
        {"quality": 90, "progressive": True, "optimize": True, "subsampling": 0},
        "地表主贴图",
    ),
    # 星空背景只做底衬，压成 JPEG 后看不出差别
    "night-sky.jpg": (
        (2048, 1024), "JPEG",
        {"quality": 84, "progressive": True, "optimize": True, "subsampling": 0},
        "星空背景",
    ),
    # 凹凸图/海面高光都是低频灰度信息：先轻微模糊再压缩，
    # 否则 JPEG 的块效应会变成地表上一块块方形阴影。
    "earth-topology.jpg": (
        (2048, 1024), "JPEG",
        {"quality": 88, "progressive": True, "optimize": True, "subsampling": 0, "blur": 1.0},
        "地形凹凸",
    ),
    "earth-water.jpg": (
        (1024, 512), "JPEG",
        {"quality": 86, "progressive": True, "optimize": True, "subsampling": 0, "blur": 1.0},
        "海面高光",
    ),
}

# 兼容旧的 .png 源文件名映射（first fetch 用的是 png 名）
SOURCE_ALIASES = {
    "night-sky.jpg": "night-sky.png",
    "earth-topology.jpg": "earth-topology.png",
    "earth-water.jpg": "earth-water.png",
}


def output_name(src_name: str) -> str:
    base = os.path.splitext(src_name)[0]
    return f"{base}.jpg"


def main() -> int:
    force = "--force" in sys.argv
    if not os.path.isdir(SRC):
        print(f"[跳过] 找不到原图目录 {SRC}，请先运行 node scripts/fetch-assets.mjs")
        return 1

    total_before = 0
    total_after = 0
    for out_name, (size, fmt, params, note) in PLAN.items():
        src_name = SOURCE_ALIASES.get(out_name, out_name)
        src_path = os.path.join(SRC, src_name)
        if not os.path.exists(src_path):
            print(f"[跳过] 缺少原图 {src_name}")
            continue
        dst_path = os.path.join(OUT, out_name)
        before = os.path.getsize(src_path)
        total_before += before
        if os.path.exists(dst_path) and not force:
            after = os.path.getsize(dst_path)
            total_after += after
            print(f"[已有] {out_name:26} {before/1024:7.0f}KB -> {after/1024:7.0f}KB  ({note})")
            continue
        im = Image.open(src_path)
        if im.size != size:
            im = im.resize(size, Image.LANCZOS)
        params = dict(params)
        blur = params.pop("blur", 0)
        im = im.convert("RGB")
        if blur:
            im = im.filter(ImageFilter.GaussianBlur(blur))
        im.save(dst_path, fmt, **params)
        after = os.path.getsize(dst_path)
        total_after += after
        print(f"[完成] {out_name:26} {before/1024:7.0f}KB -> {after/1024:7.0f}KB  ({note})")

    if total_before:
        print(f"\n贴图合计 {total_before/1048576:.2f}MB -> {total_after/1048576:.2f}MB，"
              f"省掉 {(1 - total_after/total_before)*100:.0f}%")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
