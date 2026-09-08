import { CELL, CELLS, CELLS_BEHIND, CORE_CAP, FLOATS, FOG, LIFT, SLOT_CAPACITY, SPEED, THETA, Z_NEAR } from '../constants';
import { cameraY, focal, horizonFraction } from '../camera';
import { generateCell } from '../growth';
import { compile, cornerBuffer, NAMES, rgb, slotVao, uniforms, type Slot } from './program';
import { SEGMENT_FRAG, SEGMENT_VERT, TIP_FRAG, TIP_VERT } from './shaders';

export function mount(canvas: HTMLCanvasElement): { dispose(): void } {
  const gl = canvas.getContext('webgl2', {
    alpha: true, premultipliedAlpha: true, antialias: false, powerPreference: 'low-power',
    failIfMajorPerformanceCaveat: true,
  });
  if (!gl) { canvas.dataset.state = 'off'; return { dispose() {} }; }
  const debug = gl.getExtension('WEBGL_debug_renderer_info');
  const name = debug ? String(gl.getParameter(debug.UNMASKED_RENDERER_WEBGL)) : '';
  if (/SwiftShader|llvmpipe|Software/i.test(name)) { canvas.dataset.state = 'off'; return { dispose() {} }; }
  const style = getComputedStyle(canvas);
  const accent = rgb(style.getPropertyValue('--accent'));
  const line = rgb(style.getPropertyValue('--muted'));
  const segments = compile(gl, SEGMENT_VERT, SEGMENT_FRAG);
  const tips = compile(gl, TIP_VERT, TIP_FRAG);
  const su = uniforms(gl, segments, NAMES);
  const tu = uniforms(gl, tips, NAMES);
  const corners = cornerBuffer(gl);
  const slots: Slot[] = Array.from({ length: CELLS }, () => ({ ...slotVao(gl, corners, SLOT_CAPACITY * FLOATS * 4), cell: NaN, count: 0 }));
  let width = 0, height = 0, dpr = 1, f = 1, horizonY = 0, range = 1;
  let origin = performance.now(), paused = 0, frames = 0, lift = 0, uploaded = 0, raf = 0;
  let filling = true, lost = false, cpu = 0, stillAt = 0;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');

  const resize = () => {
    dpr = Math.min(devicePixelRatio, 2);
    width = canvas.clientWidth; height = canvas.clientHeight;
    const w = Math.round(width * dpr), h = Math.round(height * dpr);
    // Assigning width or height re-creates the drawing buffer and clears it, and under `still`
    // nothing else ever draws again.
    const resized = w !== canvas.width || h !== canvas.height;
    if (resized) { canvas.width = w; canvas.height = h; gl.viewport(0, 0, w, h); }
    f = focal(width, height);
    horizonY = horizonFraction(width, height) * height;
    range = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    if (resized && canvas.dataset.state === 'still') draw(stillAt);
  };
  const upload = (slot: Slot, cell: number, now: number) => {
    const data = generateCell(cell, now);
    gl.bindBuffer(gl.ARRAY_BUFFER, slot.buffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, data);
    slot.cell = cell; slot.count = data.length / FLOATS; uploaded += data.byteLength;
  };
  const window_ = (camZ: number, now: number, initial: boolean): boolean => {
    const here = Math.floor(camZ / CELL);
    const first = here - CELLS_BEHIND;
    const ahead = CELLS - CELLS_BEHIND;
    for (let i = 0; i < CELLS; i++) {
      const cell = i < ahead ? here + i : here - 1 - (i - ahead);
      if (slots.some((s) => s.cell === cell)) continue;
      const slot = slots.find((s) => Number.isNaN(s.cell) || s.cell < first || s.cell >= first + CELLS)!;
      const spawn = initial ? now - Math.max(0, (FOG - (cell * CELL - camZ)) / SPEED) : now;
      upload(slot, cell, spawn);
      return true;
    }
    return false;
  };
  const draw = (now: number) => {
    const started = performance.now();
    const t = (now - origin) / 1000;
    const camZ = t * SPEED;
    const scroll = Math.max(0, Math.min(1, scrollY / range));
    lift += (LIFT * scroll - lift) * 0.05;
    window_(camZ, t, filling);
    if (filling && !slots.some((s) => Number.isNaN(s.cell))) filling = false;
    const cam = [0, cameraY(camZ, lift), camZ];
    cpu = Math.max(cpu, performance.now() - started);
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND);
    for (const [program, u, blend] of [[segments, su, gl.ONE_MINUS_SRC_ALPHA], [tips, tu, gl.ONE]] as const) {
      gl.useProgram(program);
      gl.blendFunc(gl.ONE, blend);
      gl.uniform2f(u.u_size!, width, height);
      gl.uniform3f(u.u_cam!, cam[0]!, cam[1]!, cam[2]!);
      gl.uniform4f(u.u_proj!, f, Math.cos(THETA), Math.sin(THETA), Z_NEAR);
      gl.uniform3f(u.u_fog!, FOG, horizonY, CORE_CAP);
      gl.uniform1f(u.u_time!, t);
      gl.uniform3f(u.u_accent!, ...accent);
      if (u.u_line) gl.uniform3f(u.u_line, ...line);
      for (const slot of slots) {
        if (!slot.count) continue;
        gl.bindVertexArray(slot.vao);
        gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, slot.count);
      }
    }
    gl.bindVertexArray(null);
    frames++;
    canvas.dataset.frames = String(frames);
    canvas.dataset.upload = String(uploaded);
    canvas.dataset.cpu = cpu.toFixed(2);
    uploaded = 0;
    if (frames % 60 === 0) cpu = 0;
  };
  const loop = (now: number) => { raf = requestAnimationFrame(loop); draw(now); };
  const start = () => {
    if (lost) return;
    cancelAnimationFrame(raf);
    if (reduced.matches) {
      const now = performance.now();
      while (window_(((now - origin) / 1000) * SPEED, (now - origin) / 1000, true));
      filling = false;
      stillAt = now; draw(now);
      canvas.dataset.state = 'still';
      return;
    }
    canvas.dataset.state = 'running';
    raf = requestAnimationFrame(loop);
  };
  const onVisibility = () => {
    if (document.hidden) { cancelAnimationFrame(raf); paused = performance.now(); }
    else if (paused) { origin += performance.now() - paused; paused = 0; start(); }
  };
  const onLost = () => {
    cancelAnimationFrame(raf); lost = true; canvas.dataset.state = 'off';
  };
  let timer = 0;
  const observer = new ResizeObserver(() => { clearTimeout(timer); timer = window.setTimeout(resize, 150); });
  observer.observe(canvas);
  document.addEventListener('visibilitychange', onVisibility);
  canvas.addEventListener('webglcontextlost', onLost);
  reduced.addEventListener('change', start);
  resize();
  start();
  return {
    dispose() {
      cancelAnimationFrame(raf); observer.disconnect(); clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisibility);
      canvas.removeEventListener('webglcontextlost', onLost);
      reduced.removeEventListener('change', start);
      for (const slot of slots) { gl.deleteVertexArray(slot.vao); gl.deleteBuffer(slot.buffer); }
      gl.deleteBuffer(corners);
      gl.deleteProgram(segments);
      gl.deleteProgram(tips);
    },
  };
}
