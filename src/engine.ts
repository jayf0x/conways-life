import { CONWAY, DEFAULT_PATTERNS, normalizePattern } from './patterns.js';
import type { LifeConfig, LifeControls, LifeRule } from './types.js';

const DEFAULT_COLORS = [
  '#0f1950',
  '#193282',
  '#2d5fb9',
  '#55afff',
  '#4196eb',
  '#3073c8',
  '#2250a5',
  '#163a8c',
  '#0e266e',
];

/** Resolve any CSS color to normalized [r,g,b] in 0..1, via a 1x1 canvas. */
function resolveColor(color: string): [number, number, number] {
  const c = document.createElement('canvas');
  c.width = c.height = 1;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
  return [r / 255, g / 255, b / 255];
}

/** Pad/clamp a color list to exactly 9 entries (index = neighbor count). */
function normalizeColors(colors: string[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < 9; i++) out.push(colors[Math.min(i, colors.length - 1)]);
  return out;
}

/** WGSL boolean expression: `n == a || n == b || ...`, or `false` if empty. */
function ruleExpr(counts: number[]): string {
  return counts.length ? counts.map((c) => `n == ${c}u`).join(' || ') : 'false';
}

function buildComputeWGSL(rule: LifeRule): string {
  return `
  @group(0) @binding(0) var<storage, read>       cur  : array<u32>;
  @group(0) @binding(1) var<storage, read_write> nxt  : array<u32>;
  @group(0) @binding(2) var<storage, read_write> cnt  : array<u32>;
  @group(0) @binding(3) var<uniform>             dims : vec2u;

  @compute @workgroup_size(8, 8)
  fn main(@builtin(global_invocation_id) id: vec3u) {
    let x = id.x; let y = id.y;
    if (x >= dims.x || y >= dims.y) { return; }
    var n: u32 = 0u;
    for (var dy: i32 = -1; dy <= 1; dy++) {
      for (var dx: i32 = -1; dx <= 1; dx++) {
        if (dx == 0 && dy == 0) { continue; }
        let nx = i32(x) + dx; let ny = i32(y) + dy;
        if (nx < 0 || nx >= i32(dims.x) || ny < 0 || ny >= i32(dims.y)) { continue; }
        n += cur[u32(ny) * dims.x + u32(nx)];
      }
    }
    cnt[y * dims.x + x] = n;
    let alive = cur[y * dims.x + x];
    let birth   = (${ruleExpr(rule.birth)});
    let survive = (${ruleExpr(rule.survive)});
    nxt[y * dims.x + x] = select(
      select(0u, 1u, birth),
      select(0u, 1u, survive),
      alive == 1u
    );
  }
`;
}

function buildRenderWGSL(colors: string[]): string {
  const rgb = colors.map(resolveColor);
  const arr = rgb.map(([r, g, b]) => `    vec3f(${r}, ${g}, ${b}),`).join('\n');
  return `
  const CELL_COLORS: array<vec3f, 9> = array<vec3f, 9>(
${arr}
  );

  struct P {
    cols: u32, rows: u32, cell: u32, grid: u32,
    hx: i32, hy: i32,
    hr: f32, hg: f32, hb: f32,
  }

  @group(0) @binding(0) var<storage, read> grid : array<u32>;
  @group(0) @binding(1) var<storage, read> cnt  : array<u32>;
  @group(0) @binding(2) var<uniform>       p    : P;

  @vertex
  fn vs(@builtin(vertex_index) vi: u32) -> @builtin(position) vec4f {
    var pos = array<vec2f, 3>(vec2f(-1.0,-1.0), vec2f(3.0,-1.0), vec2f(-1.0,3.0));
    return vec4f(pos[vi], 0.0, 1.0);
  }

  @fragment
  fn fs(@builtin(position) fc: vec4f) -> @location(0) vec4f {
    let px = u32(fc.x); let py = u32(fc.y);
    let cx = px / p.cell; let cy = py / p.cell;
    if (cx >= p.cols || cy >= p.rows) { return vec4f(0.0); }

    let lx = px % p.cell; let ly = py % p.cell;
    if (p.grid == 1u && (lx == 0u || lx >= p.cell - 1u || ly == 0u || ly >= p.cell - 1u)) { return vec4f(0.0); }

    let i = cy * p.cols + cx;

    if (grid[i] == 0u) {
      if (i32(cx) == p.hx && i32(cy) == p.hy && (p.hr + p.hg + p.hb) > 0.0) {
        return vec4f(p.hr, p.hg, p.hb, 1.0);
      }
      return vec4f(0.0);
    }

    let c = CELL_COLORS[min(cnt[i], 8u)];
    return vec4f(c, 1.0);
  }
`;
}

export function createLife(canvas: HTMLCanvasElement, config: LifeConfig = {}): LifeControls {
  const {
    rule = CONWAY,
    colors: colorsIn = DEFAULT_COLORS,
    patterns = DEFAULT_PATTERNS,
    targetCols = 80,
    cellSize,
    stepMs = 240,
    showGrid: showGridInitial = true,
    hoverColor,
    seed: doSeed = true,
  } = config;

  const colors = normalizeColors(colorsIn);
  const WGSL_COMPUTE = buildComputeWGSL(rule);
  const WGSL_RENDER = buildRenderWGSL(colors);
  const hoverRGB = hoverColor ? resolveColor(hoverColor) : ([0, 0, 0] as const);
  let gridOn = showGridInitial;

  // Precompute rule lookup for the CPU path.
  const birthSet = new Uint8Array(9);
  const surviveSet = new Uint8Array(9);
  for (const b of rule.birth) if (b < 9) birthSet[b] = 1;
  for (const s of rule.survive) if (s < 9) surviveSet[s] = 1;

  const norm = patterns.map(normalizePattern);

  let cols = 0;
  let rows = 0;
  let cell = 0;
  let total = 0;
  let current = new Uint8Array(0);
  let scratch = new Uint8Array(0);
  let counts = new Uint8Array(0);
  let paused = false;
  let lastStep = 0;
  let raf = 0;
  let hovered: { x: number; y: number } | null = null;
  let mode: 'cpu' | 'gpu' = 'cpu';
  let destroyed = false;

  const allocGrid = (w: number, h: number) => {
    cell = cellSize ?? Math.max(4, Math.floor(w / targetCols));
    cols = Math.floor(w / cell);
    rows = Math.floor(h / cell);
    total = cols * rows;
    current = new Uint8Array(total);
    scratch = new Uint8Array(total);
    counts = new Uint8Array(total);
  };

  const placePattern = (cells: Array<[number, number]>, ox: number, oy: number) => {
    for (const [c, r] of cells) {
      const gx = ox + c;
      const gy = oy + r;
      if (gx >= 0 && gx < cols && gy >= 0 && gy < rows) current[gy * cols + gx] = 1;
    }
  };

  const seed = () => {
    current.fill(0);
    if (!doSeed || norm.length === 0) return;
    const margin = 5;
    const count = Math.max(6, Math.round((cols * rows) / 350));
    for (let i = 0; i < count; i++) {
      const p = norm[i % norm.length];
      const maxX = cols - margin - p.width;
      const maxY = rows - margin - p.height;
      if (maxX <= margin || maxY <= margin) continue;
      const x = margin + Math.floor(Math.random() * (maxX - margin));
      const y = margin + Math.floor(Math.random() * (maxY - margin));
      placePattern(p.cells, x, y);
    }
  };

  const cpuStep = () => {
    counts.fill(0);
    for (let y = 0; y < rows; y++) {
      const row = y * cols;
      const rowU = y > 0 ? (y - 1) * cols : -1;
      const rowD = y < rows - 1 ? (y + 1) * cols : -1;
      for (let x = 0; x < cols; x++) {
        if (current[row + x] === 0) continue;
        const xL = x > 0 ? x - 1 : -1;
        const xR = x < cols - 1 ? x + 1 : -1;
        if (rowU >= 0) {
          if (xL >= 0) counts[rowU + xL]++;
          counts[rowU + x]++;
          if (xR >= 0) counts[rowU + xR]++;
        }
        if (xL >= 0) counts[row + xL]++;
        if (xR >= 0) counts[row + xR]++;
        if (rowD >= 0) {
          if (xL >= 0) counts[rowD + xL]++;
          counts[rowD + x]++;
          if (xR >= 0) counts[rowD + xR]++;
        }
      }
    }
    for (let i = 0; i < total; i++) {
      const c = counts[i];
      scratch[i] = current[i] ? surviveSet[c] : birthSet[c];
    }
    const tmp = current;
    current = scratch;
    scratch = tmp;
  };

  const ctx2d = canvas.getContext('2d', { willReadFrequently: false })!;
  ctx2d.imageSmoothingEnabled = false;
  const buckets: number[][] = Array.from({ length: 9 }, () => []);

  const cpuDraw = () => {
    const inset = gridOn ? 1 : 0;
    ctx2d.clearRect(0, 0, canvas.width, canvas.height);
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const i = y * cols + x;
        if (current[i] === 0) continue;
        const nc = counts[i];
        buckets[nc < 9 ? nc : 8].push(x, y);
      }
    }
    for (let ci = 0; ci < 9; ci++) {
      const b = buckets[ci];
      if (b.length === 0) continue;
      ctx2d.fillStyle = colors[ci];
      for (let j = 0; j < b.length; j += 2)
        ctx2d.fillRect(b[j] * cell + inset, b[j + 1] * cell + inset, cell - inset * 2, cell - inset * 2);
      b.length = 0;
    }
    if (hovered && hoverColor) {
      const { x, y } = hovered;
      if (x >= 0 && x < cols && y >= 0 && y < rows && current[y * cols + x] === 0) {
        ctx2d.fillStyle = hoverColor;
        ctx2d.fillRect(x * cell + inset, y * cell + inset, cell - inset * 2, cell - inset * 2);
      }
    }
  };

  const cpuLoop = (now: number) => {
    if (mode === 'gpu') return;
    if (!paused && now - lastStep > stepMs) {
      lastStep = now;
      cpuStep();
    }
    cpuDraw();
    raf = requestAnimationFrame(cpuLoop);
  };

  // --- GPU path ---
  let gpuDevice: GPUDevice | null = null;
  let gpuCanvas: HTMLCanvasElement | null = null;
  let gpuCtx: GPUCanvasContext | null = null;
  let gpuFormat: GPUTextureFormat = 'bgra8unorm';
  let gpuBufA: GPUBuffer | null = null;
  let gpuBufB: GPUBuffer | null = null;
  let gpuBufCnt: GPUBuffer | null = null;
  let gpuBufDims: GPUBuffer | null = null;
  let gpuBufParams: GPUBuffer | null = null;
  let computePipeline: GPUComputePipeline | null = null;
  let renderPipeline: GPURenderPipeline | null = null;
  let computeBG_AB: GPUBindGroup | null = null;
  let computeBG_BA: GPUBindGroup | null = null;
  let renderBG_A: GPUBindGroup | null = null;
  let renderBG_B: GPUBindGroup | null = null;
  let gpuFlip = false;

  const rpBuf = new ArrayBuffer(36);
  const rpU32 = new Uint32Array(rpBuf);
  const rpI32 = new Int32Array(rpBuf);
  const rpF32 = new Float32Array(rpBuf);

  const initGPUBuffers = () => {
    if (!gpuDevice || !computePipeline || !renderPipeline || total === 0) return;
    const byteLen = total * 4;
    const mk = (usage: number) => gpuDevice!.createBuffer({ size: byteLen, usage });

    gpuBufA?.destroy();
    gpuBufB?.destroy();
    gpuBufCnt?.destroy();
    gpuBufDims?.destroy();
    gpuBufParams?.destroy();

    gpuBufA = mk(GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST);
    gpuBufB = mk(GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST);
    gpuBufCnt = mk(GPUBufferUsage.STORAGE);
    gpuBufDims = gpuDevice.createBuffer({
      size: 8,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    gpuBufParams = gpuDevice.createBuffer({
      size: 36,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    gpuDevice.queue.writeBuffer(gpuBufDims, 0, new Uint32Array([cols, rows]));
    gpuDevice.queue.writeBuffer(gpuBufA, 0, new Uint32Array(current));
    gpuFlip = false;

    const cLayout = computePipeline.getBindGroupLayout(0);
    const rLayout = renderPipeline.getBindGroupLayout(0);
    const mkCBG = (a: GPUBuffer, b: GPUBuffer) =>
      gpuDevice!.createBindGroup({
        layout: cLayout,
        entries: [
          { binding: 0, resource: { buffer: a } },
          { binding: 1, resource: { buffer: b } },
          { binding: 2, resource: { buffer: gpuBufCnt! } },
          { binding: 3, resource: { buffer: gpuBufDims! } },
        ],
      });
    computeBG_AB = mkCBG(gpuBufA, gpuBufB);
    computeBG_BA = mkCBG(gpuBufB, gpuBufA);

    const mkRBG = (gridBuf: GPUBuffer) =>
      gpuDevice!.createBindGroup({
        layout: rLayout,
        entries: [
          { binding: 0, resource: { buffer: gridBuf } },
          { binding: 1, resource: { buffer: gpuBufCnt! } },
          { binding: 2, resource: { buffer: gpuBufParams! } },
        ],
      });
    renderBG_A = mkRBG(gpuBufA);
    renderBG_B = mkRBG(gpuBufB);
  };

  const configureGPUCanvas = () => {
    if (!gpuCanvas || !gpuDevice || !gpuCtx) return;
    gpuCtx.configure({ device: gpuDevice, format: gpuFormat, alphaMode: 'premultiplied' });
  };

  const initGPU = async () => {
    if (!navigator.gpu) return;
    try {
      const adapter = await navigator.gpu.requestAdapter();
      if (!adapter || destroyed) return;
      gpuDevice = await adapter.requestDevice();
      if (destroyed) {
        gpuDevice.destroy();
        gpuDevice = null;
        return;
      }
      gpuFormat = navigator.gpu.getPreferredCanvasFormat();

      gpuCanvas = document.createElement('canvas');
      gpuCanvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;display:none';
      gpuCanvas.width = canvas.width;
      gpuCanvas.height = canvas.height;
      canvas.parentElement!.insertBefore(gpuCanvas, canvas.nextSibling);

      gpuCtx = gpuCanvas.getContext('webgpu') as GPUCanvasContext | null;
      if (!gpuCtx) throw new Error('no webgpu context');
      configureGPUCanvas();

      const computeModule = gpuDevice.createShaderModule({ code: WGSL_COMPUTE });
      const renderModule = gpuDevice.createShaderModule({ code: WGSL_RENDER });
      computePipeline = gpuDevice.createComputePipeline({
        layout: 'auto',
        compute: { module: computeModule, entryPoint: 'main' },
      });
      renderPipeline = gpuDevice.createRenderPipeline({
        layout: 'auto',
        vertex: { module: renderModule, entryPoint: 'vs' },
        fragment: {
          module: renderModule,
          entryPoint: 'fs',
          targets: [{ format: gpuFormat }],
        },
        primitive: { topology: 'triangle-list' },
      });

      initGPUBuffers();

      cancelAnimationFrame(raf);
      ctx2d.clearRect(0, 0, canvas.width, canvas.height);
      gpuCanvas.style.display = 'block';
      mode = 'gpu';
      lastStep = performance.now();
      raf = requestAnimationFrame(gpuLoop);
    } catch {
      gpuCanvas?.remove();
      gpuCanvas = null;
      gpuDevice?.destroy();
      gpuDevice = null;
    }
  };

  const gpuLoop = (now: number) => {
    if (
      mode !== 'gpu' ||
      !gpuDevice ||
      !gpuCtx ||
      !computePipeline ||
      !renderPipeline ||
      !computeBG_AB ||
      !computeBG_BA ||
      !renderBG_A ||
      !renderBG_B ||
      !gpuBufParams
    ) {
      raf = requestAnimationFrame(gpuLoop);
      return;
    }

    const shouldStep = !paused && now - lastStep > stepMs;
    if (shouldStep) lastStep = now;

    rpU32[0] = cols;
    rpU32[1] = rows;
    rpU32[2] = cell;
    rpU32[3] = gridOn ? 1 : 0;
    rpI32[4] = hovered ? hovered.x : -1;
    rpI32[5] = hovered ? hovered.y : -1;
    rpF32[6] = hoverRGB[0];
    rpF32[7] = hoverRGB[1];
    rpF32[8] = hoverRGB[2];
    gpuDevice.queue.writeBuffer(gpuBufParams, 0, rpBuf);

    const enc = gpuDevice.createCommandEncoder();

    if (shouldStep) {
      const pass = enc.beginComputePass();
      pass.setPipeline(computePipeline);
      pass.setBindGroup(0, gpuFlip ? computeBG_BA : computeBG_AB);
      pass.dispatchWorkgroups(Math.ceil(cols / 8), Math.ceil(rows / 8));
      pass.end();
      gpuFlip = !gpuFlip;
    }

    const renderBG = gpuFlip ? renderBG_B : renderBG_A;
    const renderPass = enc.beginRenderPass({
      colorAttachments: [
        {
          view: gpuCtx.getCurrentTexture().createView(),
          clearValue: { r: 0, g: 0, b: 0, a: 0 },
          loadOp: 'clear',
          storeOp: 'store',
        },
      ],
    });
    renderPass.setPipeline(renderPipeline);
    renderPass.setBindGroup(0, renderBG);
    renderPass.draw(3);
    renderPass.end();

    gpuDevice.queue.submit([enc.finish()]);
    raf = requestAnimationFrame(gpuLoop);
  };

  const writeCellToGPU = (i: number, alive: number) => {
    if (!gpuDevice) return;
    const curBuf = gpuFlip ? gpuBufB : gpuBufA;
    if (curBuf) gpuDevice.queue.writeBuffer(curBuf, i * 4, new Uint32Array([alive]));
  };

  const onResize = (w = canvas.clientWidth, h = canvas.clientHeight) => {
    const width = w || window.innerWidth;
    const height = h || window.innerHeight;
    canvas.width = width;
    canvas.height = height;
    if (gpuCanvas) {
      gpuCanvas.width = width;
      gpuCanvas.height = height;
      configureGPUCanvas();
    }
    allocGrid(width, height);
    seed();
    if (gpuDevice) initGPUBuffers();
  };

  const ro = new ResizeObserver((entries) => {
    const r = entries[0]?.contentRect;
    if (r) onResize(r.width, r.height);
  });

  onResize();
  ro.observe(canvas);
  raf = requestAnimationFrame(cpuLoop);
  initGPU();

  return {
    destroy() {
      destroyed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      gpuCanvas?.remove();
      gpuBufA?.destroy();
      gpuBufB?.destroy();
      gpuBufCnt?.destroy();
      gpuBufDims?.destroy();
      gpuBufParams?.destroy();
      gpuDevice?.destroy();
    },
    setPaused(p) {
      paused = p;
    },
    togglePaused() {
      paused = !paused;
      return paused;
    },
    step() {
      // CPU authoritative step; GPU path re-syncs from `current`.
      cpuStep();
      if (gpuDevice) gpuDevice.queue.writeBuffer(gpuFlip ? gpuBufB! : gpuBufA!, 0, new Uint32Array(current));
    },
    reset() {
      seed();
      if (gpuDevice) initGPUBuffers();
    },
    setCell(x, y, alive) {
      if (x < 0 || x >= cols || y < 0 || y >= rows) return;
      const i = y * cols + x;
      current[i] = alive ? 1 : 0;
      writeCellToGPU(i, current[i]);
    },
    isAlive(x, y) {
      if (x < 0 || x >= cols || y < 0 || y >= rows) return false;
      return current[y * cols + x] === 1;
    },
    cellAt(offsetX, offsetY) {
      return { x: Math.floor(offsetX / cell), y: Math.floor(offsetY / cell) };
    },
    setHover(x, y) {
      hovered = x === null || y === null ? null : { x, y };
    },
    setShowGrid(show) {
      gridOn = show;
    },
    get cols() {
      return cols;
    },
    get rows() {
      return rows;
    },
    get cellSize() {
      return cell;
    },
    get mode() {
      return mode;
    },
  };
}

export type { LifeConfig, LifeControls, LifePattern, LifeRule } from './types.js';
