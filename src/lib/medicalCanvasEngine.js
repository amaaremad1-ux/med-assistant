/**
 * Medical Canvas Engine — the animated background used by EVERY module.
 *
 * WHAT IS DRAWN (all of it procedural, no images, no network):
 *   1. A perspective "space mosaic" grid that gives the layout visual depth.
 *   2. A particle mesh: floating nodes joined by proximity lines (the medical
 *      particle mesh). Nodes are deterministic for a given seed.
 *   3. Floating glass cards carrying medical glyphs (DNA, molecule, stethoscope,
 *      pills, ECG heart, cross) with a 3-D float + parallax offset.
 *   4. A live ECG pulse line that keeps drawing itself across the viewport.
 *
 * HONESTY: this is decorative geometry, not data. The ECG trace is synthesised
 * from a fixed PQRST shape — it is NOT a recording of anybody's heart, and it
 * carries no measurement. Nothing here is exported to any other module.
 *
 * PERFORMANCE: one animation frame loop, device-pixel-ratio aware (capped at 2),
 * particle count derived from viewport area, mesh pairs limited by a spatial
 * grid, and the loop pauses when the tab is hidden or the OS asks for reduced
 * motion.
 */

const TAU = Math.PI * 2;

/* ---------- deterministic RNG so the field never "jumps" between mounts ---- */
function mulberry32(seed) {
  let a = seed >>> 0;
  return function rng() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------- theme palettes ---------- */
export const CANVAS_PALETTES = {
  light: {
    mosaic: 'rgba(14, 116, 144, 0.055)',
    mosaicAlt: 'rgba(14, 116, 144, 0.022)',
    grid: 'rgba(14, 116, 144, 0.07)',
    node: 'rgba(14, 116, 144, 0.55)',
    nodeCore: 'rgba(12, 95, 118, 0.75)',
    link: 'rgba(14, 116, 144, 0.16)',
    glass: 'rgba(255, 255, 255, 0.42)',
    glassEdge: 'rgba(14, 116, 144, 0.20)',
    glyph: 'rgba(14, 116, 144, 0.42)',
    ecg: 'rgba(23, 138, 80, 0.55)',
    ecgGlow: 'rgba(23, 138, 80, 0.20)',
  },
  dark: {
    mosaic: 'rgba(42, 176, 204, 0.055)',
    mosaicAlt: 'rgba(42, 176, 204, 0.02)',
    grid: 'rgba(111, 211, 232, 0.08)',
    node: 'rgba(111, 211, 232, 0.6)',
    nodeCore: 'rgba(180, 240, 255, 0.8)',
    link: 'rgba(111, 211, 232, 0.2)',
    glass: 'rgba(24, 40, 62, 0.5)',
    glassEdge: 'rgba(111, 211, 232, 0.24)',
    glyph: 'rgba(111, 211, 232, 0.5)',
    ecg: 'rgba(62, 201, 132, 0.6)',
    ecgGlow: 'rgba(62, 201, 132, 0.24)',
  },
};

/* ---------- helpers ---------- */
function roundedRect(w, h, r) {
  const p = new Path2D();
  const rad = Math.min(r, w / 2, h / 2);
  p.moveTo(rad, 0);
  p.lineTo(w - rad, 0);
  p.quadraticCurveTo(w, 0, w, rad);
  p.lineTo(w, h - rad);
  p.quadraticCurveTo(w, h, w - rad, h);
  p.lineTo(rad, h);
  p.quadraticCurveTo(0, h, 0, h - rad);
  p.lineTo(0, rad);
  p.quadraticCurveTo(0, 0, rad, 0);
  p.closePath();
  return p;
}

/** One PQRST cycle shape, phase 0..1. Used by the decorative ECG line. */
function pqrSt(phase) {
  const g = (centre, width, amp) => amp * Math.exp(-Math.pow((phase - centre) / width, 2));
  return (
    g(0.16, 0.026, 0.16) - // P wave
    g(0.285, 0.008, 0.16) + // Q
    g(0.31, 0.011, 1) - // R
    g(0.345, 0.012, 0.28) + // S
    g(0.62, 0.05, 0.24) // T wave
  );
}


/* ---------- medical glyphs as Path2D builders (drawn in a 0..100 box) ------ */
const GLYPHS = {
  /** Double helix: two antiparallel strands + base-pair rungs. */
  dna() {
    const p = new Path2D();
    for (const flip of [0, 1]) {
      p.moveTo(0, 0);
      for (let i = 1; i <= 24; i += 1) {
        const t = i / 24;
        const x = 26 + Math.sin(t * TAU * 1.15 + flip * Math.PI) * 20;
        p.lineTo(x, t * 100);
      }
    }
    for (let i = 1; i < 8; i += 1) {
      const t = i / 8;
      const a = 26 + Math.sin(t * TAU * 1.15) * 20;
      const b = 26 + Math.sin(t * TAU * 1.15 + Math.PI) * 20;
      p.moveTo(a, t * 100);
      p.lineTo(b, t * 100);
    }
    return p;
  },
  /** Hexagonal molecule: ring plus three bonded atoms. */
  molecule() {
    const p = new Path2D();
    const cx = 50;
    const cy = 50;
    for (let i = 0; i <= 6; i += 1) {
      const a = TAU * (i / 6) + TAU * 0.08;
      const x = cx + 22 * Math.cos(a);
      const y = cy + 22 * Math.sin(a);
      if (i === 0) p.moveTo(x, y);
      else p.lineTo(x, y);
    }
    p.closePath();
    for (const a of [TAU * 0.08, TAU * 0.42, TAU * 0.75]) {
      p.moveTo(cx + 22 * Math.cos(a), cy + 22 * Math.sin(a));
      p.lineTo(cx + 40 * Math.cos(a), cy + 40 * Math.sin(a));
    }
    return p;
  },
  /** Stethoscope: binaurals, tubing loop, chest piece. */
  stethoscope() {
    const p = new Path2D();
    p.moveTo(26, 6);
    p.lineTo(26, 30);
    p.moveTo(54, 6);
    p.lineTo(54, 30);
    p.moveTo(26, 30);
    p.quadraticCurveTo(26, 52, 40, 60);
    p.quadraticCurveTo(54, 52, 54, 30);
    p.moveTo(40, 60);
    p.lineTo(40, 74);
    p.moveTo(50, 84);
    p.arc(40, 84, 10, 0, Math.PI * 1.75);
    return p;
  },
  /** Capsule + round tablet. */
  pills() {
    const p = new Path2D();
    p.moveTo(14, 34);
    p.quadraticCurveTo(14, 16, 32, 16);
    p.lineTo(52, 16);
    p.quadraticCurveTo(70, 16, 70, 34);
    p.quadraticCurveTo(70, 52, 52, 52);
    p.lineTo(32, 52);
    p.quadraticCurveTo(14, 52, 14, 34);
    p.closePath();
    p.moveTo(42, 16);
    p.lineTo(42, 52);
    p.moveTo(54, 76);
    p.arc(40, 76, 14, 0, TAU);
    p.moveTo(40, 62);
    p.lineTo(40, 90);
    return p;
  },
  /** Heart with a pulse trace running through it. */
  heartPulse() {
    const p = new Path2D();
    p.moveTo(50, 88);
    p.bezierCurveTo(8, 62, 10, 22, 34, 14);
    p.bezierCurveTo(44, 11, 50, 18, 50, 24);
    p.bezierCurveTo(50, 18, 56, 11, 66, 14);
    p.bezierCurveTo(90, 22, 92, 62, 50, 88);
    p.moveTo(18, 48);
    p.lineTo(34, 48);
    p.lineTo(41, 34);
    p.lineTo(48, 62);
    p.lineTo(55, 44);
    p.lineTo(62, 48);
    p.lineTo(84, 48);
    return p;
  },
  /** Medical cross inside a shield. */
  cross() {
    const p = new Path2D();
    p.moveTo(24, 8);
    p.lineTo(76, 8);
    p.lineTo(76, 58);
    p.quadraticCurveTo(76, 84, 50, 94);
    p.quadraticCurveTo(24, 84, 24, 58);
    p.closePath();
    p.moveTo(50, 24);
    p.lineTo(50, 68);
    p.moveTo(28, 46);
    p.lineTo(72, 46);
    return p;
  },
};

/* ========================================================================== */
/* Engine                                                                     */
/* ========================================================================== */

/**
 * Create the animated background engine for one canvas element.
 *
 * @param {HTMLCanvasElement} canvas
 * @param {object} opts  { theme: 'light'|'dark', reducedMotion: boolean, seed: number }
 * @returns {{ resize, renderOnce, start, stop, setTheme, setReducedMotion, setPointer, dispose }}
 */
export function createMedicalCanvasEngine(canvas, opts = {}) {
  const ctx = canvas.getContext('2d');
  const rand = mulberry32(opts.seed ?? 20260927);
  let theme = opts.theme === 'dark' ? 'dark' : 'light';
  let reducedMotion = Boolean(opts.reducedMotion);

  let width = 0;
  let height = 0;
  let rafId = null;
  let running = false;
  let lastTs = 0;
  let elapsed = 0;
  const pointer = { x: 0, y: 0, targetX: 0, targetY: 0, scroll: 0 };

  let particles = [];
  let tiles = [];
  let icons = [];

  function buildField() {
    const area = Math.max(1, width * height);
    const count = Math.round(Math.min(84, Math.max(26, area / 26000)));
    particles = Array.from({ length: count }, () => ({
      x: rand() * width,
      y: rand() * height,
      vx: (rand() - 0.5) * 12,
      vy: (rand() - 0.5) * 12,
      r: 1.1 + rand() * 2.1,
      depth: 0.35 + rand() * 0.75,
      pulse: rand() * TAU,
    }));

    const tile = 92;
    const cols = Math.ceil(width / tile) + 1;
    const rows = Math.ceil(height / tile) + 1;
    tiles = [];
    for (let cx = 0; cx < cols; cx += 1) {
      for (let cy = 0; cy < rows; cy += 1) {
        if (rand() > 0.34) continue; // sparse mosaic, never a full sheet
        tiles.push({
          x: cx * tile,
          y: cy * tile,
          size: tile * (0.42 + rand() * 0.34),
          phase: rand() * TAU,
          speed: 0.12 + rand() * 0.28,
          alt: rand() > 0.5,
        });
      }
    }

    const iconCount = width < 720 ? 3 : 6;
    icons = Array.from({ length: iconCount }, (_, i) => ({
      glyph: GLYPH_KEYS[i % GLYPH_KEYS.length],
      x: 0.08 + rand() * 0.84,
      y: 0.08 + rand() * 0.76,
      size: 44 + rand() * 54,
      depth: 0.4 + rand() * 0.6,
      rot: (rand() - 0.5) * 0.5,
      rotSpeed: (rand() - 0.5) * 0.06,
      bobSpeed: 0.14 + rand() * 0.2,
      phase: rand() * TAU,
    }));
  }

  function resize() {
    const parent = canvas.parentElement;
    const cssW = Math.max(320, parent?.clientWidth || window.innerWidth);
    const cssH = Math.max(320, parent?.clientHeight || window.innerHeight);
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${cssH}px`;
    width = cssW;
    height = cssH;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    buildField();
    renderOnce();
  }

  const parallaxX = (depth) => pointer.x * 22 * depth;
  const parallaxY = (depth) => pointer.y * 16 * depth;

  /* ---------- layers ---------- */

  function drawMosaic(pal, t) {
    ctx.save();
    for (const tile of tiles) {
      const a = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * tile.speed + tile.phase));
      ctx.fillStyle = tile.alt ? pal.mosaicAlt : pal.mosaic;
      ctx.globalAlpha = a;
      ctx.save();
      ctx.translate(tile.x, tile.y);
      ctx.scale(tile.size / 100, tile.size / 100);
      ctx.fill(HEX_TILE);
      ctx.restore();
    }
    ctx.restore();
  }

  function drawDepthGrid(pal, t) {
    if (width < 560) return; // the perspective floor needs room to read
    const horizon = height * 0.58;
    const vanishX = width * 0.5 + pointer.x * 26;
    ctx.save();
    ctx.strokeStyle = pal.grid;
    ctx.lineWidth = 1;
    for (let i = -8; i <= 8; i += 1) {
      ctx.beginPath();
      ctx.moveTo(vanishX + i * 12, horizon);
      ctx.lineTo(vanishX + i * (width / 10), height);
      ctx.stroke();
    }
    for (let i = 0; i < 9; i += 1) {
      const p = ((t * 0.06 + i / 9) % 1) ** 2.1;
      const y = horizon + p * (height - horizon);
      ctx.globalAlpha = 0.28 + p * 0.5;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawMesh(pal, t) {
    const cell = 150;
    const buckets = new Map();
    for (const p of particles) {
      const key = `${Math.floor(p.x / cell)}:${Math.floor(p.y / cell)}`;
      const arr = buckets.get(key);
      if (arr) arr.push(p);
      else buckets.set(key, [p]);
    }

    ctx.save();
    ctx.lineWidth = 0.7;
    ctx.globalAlpha = 0.9;
    for (const p of particles) {
      const cx = Math.floor(p.x / cell);
      const cy = Math.floor(p.y / cell);
      const ax = p.x + parallaxX(p.depth * 0.4);
      const ay = p.y + parallaxY(p.depth * 0.4);
      for (let ix = cx - 1; ix <= cx + 1; ix += 1) {
        for (let iy = cy - 1; iy <= cy + 1; iy += 1) {
          const bucket = buckets.get(`${ix}:${iy}`);
          if (!bucket) continue;
          for (const q of bucket) {
            if (q === p) continue;
            const d2 = (q.x - p.x) ** 2 + (q.y - p.y) ** 2;
            if (d2 > 22500 || d2 < 1) continue; // inside the 150 px neighbourhood
            const d = Math.sqrt(d2);
            ctx.globalAlpha = (1 - d / 150) * 0.85;
            ctx.strokeStyle = pal.link;
            ctx.beginPath();
            ctx.moveTo(ax, ay);
            ctx.lineTo(q.x + parallaxX(q.depth * 0.4), q.y + parallaxY(q.depth * 0.4));
            ctx.stroke();
          }
        }
      }
    }

    for (const p of particles) {
      const pulse = 0.7 + 0.3 * Math.sin(t * 1.6 + p.pulse);
      const x = p.x + parallaxX(p.depth * 0.4);
      const y = p.y + parallaxY(p.depth * 0.4);
      ctx.globalAlpha = 0.75 * p.depth * pulse;
      ctx.fillStyle = pal.node;
      ctx.beginPath();
      ctx.arc(x, y, p.r * p.depth * pulse, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = 0.35 * p.depth;
      ctx.fillStyle = pal.nodeCore;
      ctx.beginPath();
      ctx.arc(x, y, p.r * 0.5, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawIcons(pal, t) {
    ctx.save();
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    for (const icon of icons) {
      const bob = Math.sin(t * icon.bobSpeed + icon.phase) * 14 * icon.depth;
      const x = icon.x * width + parallaxX(icon.depth * 1.6);
      const y = icon.y * height + bob + parallaxY(icon.depth * 1.6) - pointer.scroll * 0.12;
      const rot = icon.rot + Math.sin(t * icon.rotSpeed + icon.phase) * 0.08;
      const s = (icon.size / 100) * (0.72 + icon.depth * 0.5);

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rot);
      ctx.scale(s, s);

      // Glass card behind the glyph: translucent plate + hairline edge.
      const plate = new Path2D();
      plate.roundRect(-58, -58, 116, 116, 30);
      ctx.globalAlpha = 0.34 + icon.depth * 0.35;
      ctx.fillStyle = pal.glass;
      ctx.fill(plate);
      ctx.globalAlpha = 0.6;
      ctx.strokeStyle = pal.glassEdge;
      ctx.lineWidth = 1.1 / s;
      ctx.stroke(plate);

      // The glyph itself, with a soft halo for the 3-D float feel.
      ctx.globalAlpha = 0.55 + icon.depth * 0.35;
      ctx.strokeStyle = pal.glyph;
      ctx.lineWidth = 4.6;
      ctx.shadowColor = pal.glyph;
      ctx.shadowBlur = 14;
      ctx.stroke(GLYPHS[icon.glyph]());
      ctx.shadowBlur = 0;
      ctx.restore();
    }
    ctx.restore();
  }

  function drawEcg(pal, t) {
    if (height < 420) return;
    const baseY = height * 0.74;
    const amp = 22 + pointer.y * 6;
    const cyclePx = 170; // one heartbeat roughly every 170 px
    const scroll = (t * 120) % cyclePx;

    ctx.save();
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    const trace = new Path2D();
    for (let x = -4; x <= width + 4; x += 3) {
      const phase = (((x + scroll) / cyclePx) % 1 + 1) % 1;
      const y = baseY - pqrSt(phase) * amp;
      if (x <= -4 + 0.001) trace.moveTo(x, y);
      else trace.lineTo(x, y);
    }

    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = pal.ecgGlow;
    ctx.lineWidth = 8;
    ctx.stroke(trace);

    ctx.globalAlpha = 0.95;
    ctx.strokeStyle = pal.ecg;
    ctx.lineWidth = 1.6;
    ctx.shadowColor = pal.ecg;
    ctx.shadowBlur = 10;
    ctx.stroke(trace);

    ctx.shadowBlur = 0;

    ctx.globalAlpha = 0.25;
    ctx.strokeStyle = pal.grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, baseY);
    ctx.lineTo(width, baseY);
    ctx.stroke();

    const leadX = Math.max(6, width - scroll * 0.35);
    const leadPhase = ((((leadX + scroll) / cyclePx) % 1) + 1) % 1;
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = pal.ecg;
    ctx.beginPath();
    ctx.arc(leadX, baseY - pqrSt(leadPhase) * amp, 3.4, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  /* ---------- frame loop ---------- */

  function step(dt) {
    for (const p of particles) {
      p.x += p.vx * dt * 0.4 * p.depth;
      p.y += p.vy * dt * 0.4 * p.depth;
      if (p.x < -20) p.x = width + 20;
      if (p.x > width + 20) p.x = -20;
      if (p.y < -20) p.y = height + 20;
      if (p.y > height + 20) p.y = -20;
    }
    pointer.x += (pointer.targetX - pointer.x) * Math.min(1, dt * 2.4);
    pointer.y += (pointer.targetY - pointer.y) * Math.min(1, dt * 2.4);
  }

  function renderOnce() {
    const pal = CANVAS_PALETTES[theme] ?? CANVAS_PALETTES.light;
    ctx.clearRect(0, 0, width, height);
    drawMosaic(pal, elapsed);
    drawDepthGrid(pal, elapsed);
    drawMesh(pal, elapsed);
    drawIcons(pal, elapsed);
    drawEcg(pal, elapsed);
  }

  function frame(ts) {
    if (!running) return;
    const dt = Math.min(0.05, (ts - lastTs) / 1000 || 0);
    lastTs = ts;
    elapsed += dt;
    step(dt);
    renderOnce();
    rafId = window.requestAnimationFrame(frame);
  }

  function start() {
    if (running || reducedMotion) {
      renderOnce();
      return;
    }
    running = true;
    lastTs = performance.now();
    rafId = window.requestAnimationFrame(frame);
  }

  function stop() {
    running = false;
    if (rafId != null) window.cancelAnimationFrame(rafId);
    rafId = null;
  }

  return {
    resize,
    renderOnce,
    start,
    stop,
    isRunning: () => running,
    setReducedMotion(value) {
      reducedMotion = Boolean(value);
      if (reducedMotion) {
        stop();
        renderOnce();
      } else {
        start();
      }
    },
    setTheme(next) {
      theme = next === 'dark' ? 'dark' : 'light';
      renderOnce();
    },
    setPointer(nx, ny) {
      pointer.targetX = Math.max(-1, Math.min(1, nx));
      pointer.targetY = Math.max(-1, Math.min(1, ny));
    },
    setScroll(px) {
      pointer.scroll = Number.isFinite(px) ? px : 0;
    },
    dispose() {
      stop();
      particles = [];
      tiles = [];
      icons = [];
    },
  };
}

const GLYPH_KEYS = Object.keys(GLYPHS);
const HEX_TILE = roundedRect(100, 100, 26);
