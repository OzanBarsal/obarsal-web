import { CATCHUP, CORE_CAP, FLASH_FLOATS, FLASH_LIFE, FLOATS, FOG, GROWTH_INTERVAL, LIFT, MAX_FLASHES, MAX_NODES, SETTLE, SPEED, THETA, Z_NEAR } from '../constants';
import { view, type View } from '../camera';
import { createField } from '../life';
import { compile, cornerBuffer, instancedVao, NAMES, rgb, uniforms } from './program';
import { FLASH_VERT, SEGMENT_FRAG, SEGMENT_VERT, TIP_FRAG, TIP_VERT } from './shaders';

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
  const veins = compile(gl, SEGMENT_VERT, SEGMENT_FRAG);
  const tips = compile(gl, TIP_VERT, TIP_FRAG);
  const sparks = compile(gl, FLASH_VERT, TIP_FRAG);
  const corners = cornerBuffer(gl);
  const ring = instancedVao(gl, corners, MAX_NODES * FLOATS * 4, [3, 3, 3]);
  const flashes = instancedVao(gl, corners, MAX_FLASHES * FLASH_FLOATS * 4, [3, 1]);
  const passes = [
    { program: veins, u: uniforms(gl, veins, NAMES), blend: gl.ONE_MINUS_SRC_ALPHA, vao: ring.vao },
    { program: tips, u: uniforms(gl, tips, NAMES), blend: gl.ONE, vao: ring.vao },
    { program: sparks, u: uniforms(gl, sparks, NAMES), blend: gl.ONE, vao: flashes.vao },
  ] as const;
  const spark = new Float32Array(MAX_FLASHES * FLASH_FLOATS);
  const field = createField();
  let width = canvas.clientWidth, height = canvas.clientHeight, range = 1;
  let origin = performance.now(), paused = 0, frames = 0, lift = 0, raf = 0;
  let lost = false, cpu = 0, clock = 0, camZ = 0;
  let v: View = view(width, height, 0, 0);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');

  const advance = (now: number, hold = false) => {
    const started = performance.now();
    const was = clock;
    clock = Math.min((now - origin) / 1000, clock + CATCHUP);
    if (!hold) camZ += (clock - was) * SPEED;
    lift += (LIFT * Math.max(0, Math.min(1, scrollY / range)) - lift) * 0.05;
    v = view(width, height, camZ, lift);
    field.step(clock, v.seed, v.visible, v.detail);
    cpu = Math.max(cpu, performance.now() - started);
  };

  const render = () => {
    const lit = field.flashes.length;
    for (let i = 0; i < lit; i++) {
      const { x, y, z, birth } = field.flashes[i]!;
      const o = i * FLASH_FLOATS;
      spark[o] = x; spark[o + 1] = y; spark[o + 2] = z; spark[o + 3] = birth;
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, ring.buffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, field.segments, 0, field.live * FLOATS);
    gl.bindBuffer(gl.ARRAY_BUFFER, flashes.buffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, spark, 0, lit * FLASH_FLOATS);
    const uploaded = (field.live * FLOATS + lit * FLASH_FLOATS) * 4;
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND);
    for (const { program, u, blend, vao } of passes) {
      const count = vao === ring.vao ? field.live : lit;
      if (!count) continue;
      gl.useProgram(program);
      gl.blendFunc(gl.ONE, blend);
      gl.uniform2f(u.u_size!, width, height);
      gl.uniform3f(u.u_cam!, 0, v.camY, camZ);
      gl.uniform4f(u.u_proj!, v.f, Math.cos(THETA), Math.sin(THETA), Z_NEAR);
      gl.uniform3f(u.u_fog!, FOG, v.horizon, CORE_CAP);
      gl.uniform1f(u.u_time!, clock);
      gl.uniform3f(u.u_accent!, ...accent);
      if (u.u_line) gl.uniform3f(u.u_line, ...line);
      if (u.u_life) gl.uniform1f(u.u_life, FLASH_LIFE);
      gl.bindVertexArray(vao);
      gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, count);
    }
    gl.bindVertexArray(null);
    frames++;
    canvas.dataset.frames = String(frames);
    canvas.dataset.upload = String(uploaded);
    canvas.dataset.cpu = cpu.toFixed(2);
    canvas.dataset.live = String(field.live);
    canvas.dataset.nodes = String(field.nodes);
    canvas.dataset.attractors = String(field.attractors);
    canvas.dataset.reroots = String(field.reroots);
    if (frames % 60 === 0) cpu = 0;
  };

  const resize = () => {
    const dpr = Math.min(devicePixelRatio, 2);
    width = canvas.clientWidth; height = canvas.clientHeight;
    const w = Math.round(width * dpr), h = Math.round(height * dpr);
    // Assigning width or height re-creates the drawing buffer and clears it, and under `still`
    // nothing else ever draws again.
    const resized = w !== canvas.width || h !== canvas.height;
    if (resized) { canvas.width = w; canvas.height = h; gl.viewport(0, 0, w, h); }
    v = view(width, height, camZ, lift);
    range = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    if (resized && canvas.dataset.state === 'still') render();
  };
  const loop = (now: number) => { raf = requestAnimationFrame(loop); advance(now); render(); };
  const start = () => {
    if (lost) return;
    cancelAnimationFrame(raf);
    if (reduced.matches) {
      const settled = Math.max(performance.now(), origin + SETTLE * 1000);
      for (let t = origin + clock * 1000; t <= settled; t += GROWTH_INTERVAL * 1000) advance(t, true);
      render();
      canvas.dataset.state = 'still';
      return;
    }
    origin = performance.now() - clock * 1000;
    canvas.dataset.state = 'running';
    raf = requestAnimationFrame(loop);
  };
  const onVisibility = () => {
    if (document.hidden) { cancelAnimationFrame(raf); paused = performance.now(); }
    else if (paused) { paused = 0; start(); }
  };
  const onLost = () => { cancelAnimationFrame(raf); lost = true; canvas.dataset.state = 'off'; };
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
      for (const { vao, buffer } of [ring, flashes]) { gl.deleteVertexArray(vao); gl.deleteBuffer(buffer); }
      gl.deleteBuffer(corners);
      for (const { program } of passes) gl.deleteProgram(program);
    },
  };
}
