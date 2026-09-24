# ORBIS CHRONOS · 寰宇纪年

[中文](README.md) | **English**

A sci-fi styled 3D globe for historical borders. It paints each era's states and polities
onto a real Earth texture (NASA Blue Marble), lets you travel from 10,000 BC to 2025 AD with a
time slider, animates the border changes, and pins major historical events — wars, treaties,
dynastic shifts — right onto the sphere.

![Main view](docs/preview-globe.jpg)

| Events & era annotations | Close-up with polity labels | Mobile |
| --- | --- | --- |
| ![Events](docs/preview-events.jpg) | ![Close-up](docs/preview-zoom.jpg) | ![Mobile](docs/preview-mobile.jpg) |

Live demo: <https://void-space912.github.io/orbis-chronos/>

---

## Quick start

```bash
git clone https://github.com/void-space912/orbis-chronos.git
cd orbis-chronos
npm start            # = node scripts/serve.mjs 3180
# open http://127.0.0.1:3180/
```

Node.js 18+ is only needed for the local static server — the site itself is plain
HTML/CSS/ES modules and needs no build step. On Windows you can also just double-click `启动.cmd`.

> Do **not** open `index.html` directly via `file://`: browsers block ES modules and local data
> reads, so the page will show a hint instead of loading.

## Features

- **Real map, real data** — Blue Marble day texture with topology bump and ocean specular;
  borders come from GeoJSON, not hand-drawn art.
- **54 era snapshots** from 10,000 BC to 2025 AD, selectable by slider, keyboard (`←` `→`),
  deep link (`#y=1900`) or auto-play with four speeds.
- **Smooth era transitions** — outgoing polygons sink, incoming ones rise from the surface.
- **Historical events layer** — 94 hand-curated events (39 wars, 20 dynastic changes,
  13 science/culture, 8 treaties, 7 revolutions, 6 explorations, 1 disaster) rendered as
  colored diamond markers plus a clickable "大事记" list; timeline ticks turn red for eras
  containing wars.
- **Polity interaction** — hover highlight with tooltip, click to fly to a polity and open its
  dossier (Chinese/English name, category, share of mapped land, era span, source link).
- **Sci-fi HUD** — holographic panels, scanlines, vignette, graticule, orbit tick rings,
  star dust and orbiting particles on a 2D effect layer.
- **Layer switches** — fill, borders, polity labels, events, pulsing rings (off by default),
  decorative energy arcs, graticule, "more polities".
- **Offline capable** — globe.gl and all textures are vendored in `vendor/`; nothing is fetched
  from a CDN at runtime.

## Data sources & licensing

| Part | License | Notes |
| --- | --- | --- |
| Source code (`index.html`, `css/`, `js/`, `scripts/`), docs, event table, name glossary | **MIT** | see `LICENSE` |
| Border data derived from historical-basemaps (`data/eras/*.json`, `data/manifest.json`, `data/name-report.json`) | **CC BY-SA 4.0** | attribution + indication of changes + **share-alike are required** |
| Modern borders (`data/modern.json`) from Natural Earth 110m | Public domain | — |
| `vendor/` — globe.gl, three-globe textures | MIT (textures derive from NASA imagery) | versions + sha256 in `vendor/VERSIONS.json` |

Attribution text you must keep when redistributing:

> Border data from [historical-basemaps](https://github.com/aourednik/historical-basemaps)
> (CC BY-SA 4.0, by Andrei Ourednik); modern borders from
> [Natural Earth](https://www.naturalearthdata.com/) (public domain); rendering by
> [globe.gl](https://github.com/vasturiano/globe.gl) (MIT); compiled into era snapshots and
> compressed by "ORBIS CHRONOS · 寰宇纪年".

Full details, the four CC BY-SA obligations and the list of modifications are in
**`THIRD-PARTY.md`**. If you want a fully permissive project, drop `data/` and regenerate it
yourself with `node scripts/build-data.mjs`.

### Presentation note

The modern (2025) layer follows the official position of the People's Republic of China and
merges Taiwan's geometry into China's feature. Historical layers keep the upstream dataset's
original borders and polity names (Chinese translations are additive and marked). Historical
boundaries are academically contested and the data is only administrative-outline precision —
do not use this project for cartography, legal, or territorial claims.

## Project layout

```
index.html            page shell (HUD / timeline / console / boot overlay)
css/style.css         sci-fi styling, responsive + reduced-motion
js/app.js             globe setup, layers, era switching, interaction, UI wiring
js/data.js            era loading, caching, palette and anchor preprocessing
js/eras.js            54 era definitions (year, Chinese label, historical anchor note)
js/events.js          event table loader, per-era slicing, types and colors
js/i18n.js            polity name glossary, type translation, classification and colors
js/effects.js         2D effect layer: star dust, orbiting particles, HUD rings, bursts
vendor/               globe.gl + Earth textures (pinned, with checksums)
data/                 era snapshots, modern layer, event table, derived indexes
scripts/              serve / build-data / build-index / fetch-assets / check /
                      verify / perf / tune / measure-data / texcheck / optimize_textures.py
docs/                 README preview images
```

## Scripts

```bash
npm start                    # local static server with gzip + cache headers
npm run check                # static self-check: eras, event table, assets, DOM ids
npm run verify               # headless-browser acceptance: screenshots, interaction, playback
npm run perf                 # cold vs warm first-load timing
npm run tune                 # per-step playback cost and frame times
npm run measure              # pure data-side cost: parse, ring and vertex counts
npm run data:build           # regenerate data/ from upstream (historical-basemaps + Natural Earth)
npm run textures:optimize    # re-compress textures (requires Python + Pillow)
```

`verify`, `perf` and `tune` connect to an already-running browser with a debugging port
(see the header comment in `scripts/verify.mjs`); they never launch one themselves.

## Performance notes

First load ships about **1.2 MB** (engine 514 KB + day texture 534 KB + one era snapshot 183 KB
+ code); the starfield, bump and specular maps are attached after the globe appears.
Textures were re-encoded from 4096×2048 JPEG/PNG down to 2048×1024 (3.03 MB → 0.86 MB);
the bump and specular maps are blurred before compression because DCT blocks otherwise show up
as square shading artifacts on the surface. Data and vendor assets are served with long cache
lifetimes, so a reload transfers nothing. During auto-play the next eras are prefetched ahead,
which took per-step data cost from 30–200 ms down to 1–3 ms.

## Known limitations

- Eras are discrete snapshots — there is no year-by-year geometry, so the slider switches
  between snapshots and the transition animates that replacement.
- Deep-prehistory entries are archaeological cultures, not states.
- By default only the 300 largest polities per era are drawn (1492 has 1307); the
  "more polities" switch raises the cap to 500.
- The event table has 94 representative entries with degree-level approximate locations.
- Roughly 2250 draw calls per frame at the default settings; on integrated GPUs or phones,
  turn off borders / more polities and lower the playback speed.

## Contributing

Data corrections, additional events, and name/translation fixes are welcome: edit
`data/events.json`, `js/i18n.js` or `js/eras.js`, then run `npm run check` (validates era
coverage, event schema, coordinate ranges, asset references and DOM id consistency).
Please prefix commits with `feat:` / `fix:` / `docs:` / `perf:`.

## License

Code: MIT (`LICENSE`). Border data: CC BY-SA 4.0 (`THIRD-PARTY.md`).
