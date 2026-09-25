/**
 * 特效层：二维画布上的星尘粒子、环绕地球的数据轨道、时间跃迁闪光。
 * 全部绘制在 WebGL 地球之上（mix-blend-mode: screen），不参与拾取事件。
 */

const TAU = Math.PI * 2;
const rand = (a, b) => a + Math.random() * (b - a);

export function createEffects(canvas, options = {}) {
  const ctx = canvas.getContext('2d', { alpha: true });
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const getOrbit = options.getOrbit || (() => null);

  let w = 0;
  let h = 0;
  let dpr = 1;
  let raf = 0;
  let last = performance.now();
  let time = 0;
  let disposed = false;

  const pointer = { x: 0, y: 0, tx: 0, ty: 0, active: false, lastMove: 0 };
  const stars = [];
  const orbiters = [];
  const bursts = [];
  const streaks = [];

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    w = Math.round(rect.width) || canvas.clientWidth || window.innerWidth;
    h = Math.round(rect.height) || canvas.clientHeight || window.innerHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    seedStars();
    seedOrbiters();
  }

  function seedStars() {
    stars.length = 0;
    const area = (w * h) / 1000;
    const count = Math.max(80, Math.min(reduced ? 110 : 240, Math.round(area * (reduced ? 0.35 : 0.75))));
    for (let i = 0; i < count; i += 1) {
      const layer = Math.random();
      const hue = Math.random() < 0.16 ? 'violet' : Math.random() < 0.1 ? 'amber' : 'cyan';
      stars.push({
        x: Math.random() * w,
        y: Math.random() * h,
        r: layer > 0.9 ? rand(0.9, 1.8) : rand(0.25, 0.9),
        depth: rand(0.2, 1),
        phase: Math.random() * TAU,
        // 颜色串预先算好：逐帧用 globalAlpha 控制明暗，避免每帧生成数百个 rgba() 字符串
        css: `rgb(${(COLOR[hue] || COLOR.cyan).join(',')})`,
        cross: layer > 0.94,
        vx: rand(-0.05, 0.05),
        vy: rand(-0.04, 0.02),
      });
    }
  }

  function seedOrbiters() {
    orbiters.length = 0;
    const count = reduced ? 14 : 34;
    for (let i = 0; i < count; i += 1) {
      const hue = Math.random() < 0.22 ? 'amber' : Math.random() < 0.3 ? 'violet' : 'cyan';
      orbiters.push({
        a: rand(1.03, 1.42),        // 轨道半径相对地球半径
        phase: Math.random() * TAU,
        speed: rand(0.035, 0.16) * (Math.random() < 0.25 ? -1 : 1),
        size: rand(0.5, 1.7),
        tilt: rand(-0.35, 0.35),
        css: `rgb(${(COLOR[hue] || COLOR.cyan).join(',')})`,
        trail: rand(0.25, 1),
      });
    }
  }

  const COLOR = {
    cyan: [88, 232, 255],
    violet: [169, 139, 255],
    amber: [255, 195, 107],
  };

  function paint(color, alpha) {
    const c = COLOR[color] || COLOR.cyan;
    return `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${alpha})`;
  }

  function step(now) {
    if (disposed) return;
    const dt = Math.min(48, now - last);
    last = now;
    time += dt / 1000;

    // 指针缓动（视差）
    pointer.x += (pointer.tx - pointer.x) * 0.045;
    pointer.y += (pointer.ty - pointer.y) * 0.045;

    try {
      ctx.clearRect(0, 0, w, h);
      const orbit = getOrbit();
      drawStars(dt);
      if (orbit && orbit.r > 20) {
        drawHudRings(orbit);
        drawOrbiters(orbit, dt);
      }
      drawStreaks(dt);
      drawBursts(dt);
    } catch (err) {
      // 单帧绘制异常不应终止整条特效循环
      if (!step.warned) {
        step.warned = true;
        console.warn('[effects] 绘制异常：', err && err.message);
      }
    }

    raf = requestAnimationFrame(step);
  }

  function drawStars(dt) {
    for (const s of stars) {
      if (!reduced) {
        s.x += s.vx * dt * 0.25;
        s.y += s.vy * dt * 0.25;
        if (s.x < -4) s.x = w + 4;
        if (s.x > w + 4) s.x = -4;
        if (s.y < -4) s.y = h + 4;
        if (s.y > h + 4) s.y = -4;
      }
      const tw = 0.55 + 0.45 * Math.sin(time * (0.6 + s.depth) + s.phase);
      const alpha = (0.12 + 0.42 * s.depth) * tw;
      const px = s.x + pointer.x * 16 * s.depth;
      const py = s.y + pointer.y * 16 * s.depth;
      ctx.fillStyle = s.css;
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(px, py, s.r, 0, TAU);
      ctx.fill();
      if (s.cross) {
        ctx.globalAlpha = alpha * 0.22;
        ctx.fillRect(px - s.r * 4, py - 0.4, s.r * 8, 0.8);
        ctx.fillRect(px - 0.4, py - s.r * 4, 0.8, s.r * 8);
      }
    }
    ctx.globalAlpha = 1;
  }

  function ring(cx, cy, r, opt) {
    ctx.beginPath();
    ctx.ellipse(cx, cy, r, r * (opt.squash || 1), opt.rotation || 0, opt.start || 0, opt.end || TAU);
    ctx.lineWidth = opt.width || 1;
    ctx.strokeStyle = opt.stroke;
    if (opt.dash) ctx.setLineDash(opt.dash);
    ctx.stroke();
    if (opt.dash) ctx.setLineDash([]);
  }

  function drawHudRings(o) {
    const { x: cx, y: cy, r } = o;
    const px = pointer.x * 8;
    const py = pointer.y * 8;
    const c = { x: cx + px, y: cy + py };

    // 外圈刻度环
    const rOuter = r * 1.34;
    ring(c.x, c.y, rOuter, { stroke: paint('cyan', 0.16), width: 1 });
    const rot = time * 0.06;
    const segs = 72;
    for (let i = 0; i < segs; i += 1) {
      const a = (i / segs) * TAU + rot;
      const long = i % 6 === 0;
      const inner = rOuter + 2;
      const outer = rOuter + (long ? 11 : 5);
      ctx.beginPath();
      ctx.moveTo(c.x + Math.cos(a) * inner, c.y + Math.sin(a) * inner);
      ctx.lineTo(c.x + Math.cos(a) * outer, c.y + Math.sin(a) * outer);
      ctx.strokeStyle = paint('cyan', long ? 0.5 : 0.24);
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // 旋转虚线轨道
    ring(c.x, c.y, r * 1.19, { stroke: paint('violet', 0.38), width: 1.2, dash: [2, 10], rotation: rot * 2.1 });
    ring(c.x, c.y, r * 1.5, { stroke: paint('cyan', 0.2), width: 1, dash: [26, 60], rotation: -rot * 1.4 });

    // 扫描弧（顺时针扫过）——比起初的版本压低了不少，避免像一条彩色带子糊在地球上
    const scan = (time * 0.55) % TAU;
    ring(c.x, c.y, r * 1.08, { stroke: paint('amber', 0.34), width: 1.4, start: scan, end: scan + 0.5 });
    ring(c.x, c.y, r * 1.08, { stroke: paint('amber', 0.09), width: 5, start: scan, end: scan + 0.16 });

    // 四角定位括号
    const br = r * 1.52;
    const len = r * 0.11;
    for (let k = 0; k < 4; k += 1) {
      const a = k * (TAU / 4) + Math.PI / 4;
      const bx = c.x + Math.cos(a) * br;
      const by = c.y + Math.sin(a) * br;
      ctx.save();
      ctx.translate(bx, by);
      ctx.rotate(a);
      ctx.strokeStyle = paint('cyan', 0.6);
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(-len, -len);
      ctx.lineTo(-len * 0.35, -len);
      ctx.moveTo(-len, -len);
      ctx.lineTo(-len, -len * 0.35);
      ctx.stroke();
      ctx.restore();
    }

    // 前景粒子外壳：贴在地球边缘的一圈微光（刻意压得很淡，不要变成蓝色光环）
    const pulse = 0.5 + 0.5 * Math.sin(time * 1.4);
    ring(c.x, c.y, r * 1.02, { stroke: paint('cyan', 0.05 + pulse * 0.06), width: 5 });
  }

  function drawOrbiters(o, dt) {
    const { x: cx, y: cy, r } = o;
    const px = cx + pointer.x * 14;
    const py = cy + pointer.y * 14;
    for (const p of orbiters) {
      p.phase += (p.speed * dt) / 1000;
      const rr = r * p.a;
      const a = p.phase;
      const ex = Math.cos(a) * rr;
      const ey = Math.sin(a) * rr * (1 - Math.abs(p.tilt) * 0.55);
      const rot = p.tilt * 1.1;
      const cr = Math.cos(rot);
      const sr = Math.sin(rot);
      const x = px + ex * cr - ey * sr;
      const y = py + ex * sr + ey * cr;
      const depth = 0.5 + 0.5 * Math.sin(a);      // 前后景判断
      const alpha = 0.18 + depth * 0.55;
      ctx.fillStyle = p.css;
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(x, y, p.size * (0.7 + depth * 0.6), 0, TAU);
      ctx.fill();
      if (p.trail > 0.6) {
        // 尾迹用一条低透明度短线（不再逐帧新建渐变对象）
        const ex2 = Math.cos(a - 0.14) * rr;
        const ey2 = Math.sin(a - 0.14) * rr * (1 - Math.abs(p.tilt) * 0.55);
        ctx.globalAlpha = alpha * 0.4;
        ctx.strokeStyle = p.css;
        ctx.lineWidth = p.size * 0.8;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(px + ex2 * cr - ey2 * sr, py + ex2 * sr + ey2 * cr);
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  }

  function drawStreaks(dt) {
    const want = (!reduced && Math.random() < 0.012) || Math.random() < 0.04;
    if (want && streaks.length < 3) {
      {
        const fromLeft = Math.random() < 0.5;
        streaks.push({
          x: fromLeft ? rand(-40, w * 0.3) : rand(w * 0.7, w + 40),
          y: rand(-20, h * 0.6),
          vx: (fromLeft ? 1 : -1) * rand(320, 620),
          vy: rand(90, 210),
          life: 1,
          len: rand(70, 190),
        });
      }
    }
    for (let i = streaks.length - 1; i >= 0; i -= 1) {
      const s = streaks[i];
      s.x += (s.vx * dt) / 1000;
      s.y += (s.vy * dt) / 1000;
      s.life -= dt / 1400;
      if (s.life <= 0) { streaks.splice(i, 1); continue; }
      const n = Math.hypot(s.vx, s.vy) || 1;
      const ux = (s.vx / n) * s.len;
      const uy = (s.vy / n) * s.len;
      const grad = ctx.createLinearGradient(s.x - ux, s.y - uy, s.x, s.y);
      grad.addColorStop(0, paint('cyan', 0));
      grad.addColorStop(1, paint('cyan', 0.5 * s.life));
      ctx.strokeStyle = grad;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(s.x - ux, s.y - uy);
      ctx.lineTo(s.x, s.y);
      ctx.stroke();
    }
  }

  function drawBursts(dt) {
    for (let i = bursts.length - 1; i >= 0; i -= 1) {
      const b = bursts[i];
      b.t += dt / b.dur;
      if (b.t >= 1) { bursts.splice(i, 1); continue; }
      const e = 1 - Math.pow(1 - b.t, 3);
      const r = b.r0 + (b.r1 - b.r0) * e;
      const alpha = (1 - b.t) * 0.6;
      ring(b.x, b.y, r, { stroke: paint(b.hue, alpha), width: 2 - b.t });
      ring(b.x, b.y, r * 0.72, { stroke: paint(b.hue, alpha * 0.4), width: 1, dash: [4, 12] });
    }
  }

  function onPointerMove(e) {
    pointer.tx = (e.clientX / window.innerWidth - 0.5) * 2;
    pointer.ty = (e.clientY / window.innerHeight - 0.5) * 2;
    pointer.active = true;
  }

  window.addEventListener('pointermove', onPointerMove, { passive: true });
  window.addEventListener('resize', resize);
  resize();
  raf = requestAnimationFrame(step);

  return {
    /** 年代切换时的能量扩散闪光 */
    burst(hue = 'cyan', strength = 1) {
      const o = getOrbit();
      if (!o) return;
      bursts.push({ x: o.x, y: o.y, r0: o.r * 0.96, r1: o.r * (1.55 + 0.3 * strength), t: 0, dur: 760, hue });
    },
    /** 拾取政权时的小脉冲 */
    ping(x, y) {
      bursts.push({ x, y, r0: 6, r1: 120, t: 0, dur: 620, hue: 'amber' });
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('resize', resize);
    },
  };
}
