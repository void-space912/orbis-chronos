# 第三方资源与授权 / Third-party notices

本项目（寰宇纪年 · ORBIS CHRONOS）能跑起来，靠的是下面这些公开数据与开源软件。
**发布或再分发时必须保留本文件的署名内容**，其中 historical-basemaps 还要求"相同方式共享"。

## 1. 版图数据（有传染性条款，务必保留）

| 资源 | 用途 | 出处 | 许可 |
| --- | --- | --- | --- |
| historical-basemaps | 前 10000 年 — 2010 年共 53 个世界政权版图快照，即 `data/eras/*.json` | <https://github.com/aourednik/historical-basemaps>（作者 Andrei Ourednik） | **CC BY-SA 4.0** | 
| Natural Earth 110m admin-0 countries | 2025 年现代国家，即 `data/modern.json` | <https://www.naturalearthdata.com/> · <https://github.com/nvkelso/natural-earth-vector> | 公有领域（Public Domain） |

- `data/eras/*.json`、`data/manifest.json`、`data/name-report.json` 是 historical-basemaps 的**改编作品**
  （做了合并同名要素、坐标取 3 位小数、面积估算等处理），因此继续以 **CC BY-SA 4.0** 发布。
- 依据 CC BY-SA 4.0 第 3(a) 条，使用/再分发时你需要：
  1. **署名**：注明来源于 historical-basemaps 与本项目；
  2. **标明许可**：说明适用 CC BY-SA 4.0 并给出许可全文链接 <https://creativecommons.org/licenses/by-sa/4.0/>；
  3. **标明改动**：说明做过上述处理（非原样数据）；
  4. **相同方式共享**：若你发布基于这些版图数据的改编作品，需继续以 CC BY-SA 4.0（或兼容许可）发布。
- 许可全文：<https://github.com/aourednik/historical-basemaps/blob/master/LICENSE.md>

> **重要**：`data/eras/*.json` 的 CC BY-SA 义务**独立于**本项目代码的 MIT 许可。
> 想以更宽松的方式使用代码、但不接受数据传染条款，可以只取代码，自己接数据源
> （`scripts/build-data.mjs` 就是干这个的）。

## 2. 地球贴图

| 资源 | 用途 | 出处 | 说明 |
| --- | --- | --- | --- |
| `vendor/img/earth-blue-marble.jpg` | 地球白天地表 | three-globe 示例素材（源自 NASA Blue Marble 影像） | NASA 影像通常可自由使用；three-globe 仓库为 MIT |
| `vendor/img/earth-topology.jpg` | 地形凹凸 | 同上（由 `earth-topology.png` 压缩而来） | 同上 |
| `vendor/img/earth-water.jpg` | 海面高光 | 同上（由 `earth-water.png` 压缩而来） | 同上 |
| `vendor/img/night-sky.jpg` | 星空背景 | 同上（由 `night-sky.png` 压缩而来） | 同上，原始出处未在仓库中标注 |

- three-globe：<https://github.com/vasturiano/three-globe>（MIT License）
- `vendor/img/_source/` 里保留了**未经压缩的原始贴图**（默认不纳入 git，可用 `node scripts/fetch-assets.mjs` 重新取回）。
- 若你要用于商业场景且对影像来源有严格要求，建议自行替换为明确授权的贴图
  （例如 NASA Visible Earth 的 Blue Marble 原始产品）。

## 3. 运行时库

| 库 | 版本 | 用途 | 许可 |
| --- | --- | --- | --- |
| globe.gl | 2.46.2 | 三维地球渲染组件（`vendor/globe.gl.min.js`，内含 three.js） | MIT |

- globe.gl：<https://github.com/vasturiano/globe.gl>
- 其中打包的 three.js：<https://github.com/mrdoob/three.js>（MIT）
- 版本与校验值见 `vendor/VERSIONS.json`（含 sha256）。

## 4. 本项目自行撰写的内容（可自由使用）

| 内容 | 说明 |
| --- | --- |
| `data/events.json` | 94 条历史大事索引，**人工整理**；年份取公历，地点为度级精度的"大致位置" |
| `js/i18n.js` | 政权名称中英对照表（约 330 条）与类型/分类映射 |
| `js/eras.js` | 54 个年代定义与中文年代标注（时间锚点说明为本项目撰写） |
| 其余代码与文档 | `index.html`、`css/`、`js/`、`scripts/`、`README.md` |

以上内容以本项目 `LICENSE`（MIT）授权。

## 5. 关于呈现立场（供使用者知悉）

- 现代层（2025）依据**中国官方立场**，将台湾的几何要素与中国的要素合并为同一要素
  （见 `scripts/build-data.mjs` 中 `buildModern()` 的注释）。
- 历史层不做政治性改写，直接使用 historical-basemaps 的原始政权名与边界；
  中文译名为本项目补充，未收录者保留原文。
- 因此本项目**不适合**被直接当作"领土主张"或测绘依据使用：历史疆界本身在学术界存在争议，
  数据精度也只到行政轮廓级。
