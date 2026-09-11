import { BLOOM_SPREAD, BLOOM_STRENGTH, DRIFT, DRIFT_PERIOD, FIELD_CAP } from '../constants';
import { compile, uniforms } from './program';

export type RGB = readonly [number, number, number];

export type Post = {
  resize(width: number, height: number): void;
  scene(): void;
  bloom(draw: () => void): void;
  composite(u: { time: number; horizon: number; width: number; height: number }): void;
  dispose(): void;
};

type Target = { fbo: WebGLFramebuffer; tex: WebGLTexture; w: number; h: number };

const QUAD_VERT = `#version 300 es
out vec2 v_uv;
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  v_uv = p;
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

const BLUR_FRAG = `#version 300 es
precision mediump float;
uniform sampler2D u_src;
uniform vec2 u_dir;
in vec2 v_uv;
out vec4 o;
void main() {
  const float w[5] = float[](0.227027, 0.1945946, 0.1216216, 0.054054, 0.016216);
  vec4 c = texture(u_src, v_uv) * w[0];
  for (int i = 1; i < 5; i++) {
    vec2 d = u_dir * float(i);
    c += (texture(u_src, v_uv + d) + texture(u_src, v_uv - d)) * w[i];
  }
  o = c;
}`;

// Drift varies with the row and time only, so a row's darkest pixel is always sky (the guards
// depend on that); the dither is the only in-row variation and stays inside half a step.
const COMPOSITE_FRAG = `#version 300 es
precision highp float;
uniform sampler2D u_scene;
uniform sampler2D u_bloom;
uniform vec2 u_size;
uniform float u_horizon;
uniform float u_time;
uniform vec3 u_ground;
uniform vec3 u_mid;
uniform vec3 u_low;
uniform vec4 u_post;
in vec2 v_uv;
out vec4 o;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(float x) { float i = floor(x); float f = fract(x); f = f * f * (3.0 - 2.0 * f); return mix(hash(vec2(i, 1.0)), hash(vec2(i + 1.0, 1.0)), f); }
void main() {
  float t = 1.0 - v_uv.y;
  float h = u_horizon / u_size.y;
  vec3 sky = t < h ? mix(u_ground, u_mid, t / h) : mix(u_mid, u_low, (t - h) / max(1.0 - h, 0.001));
  float phase = u_time / u_post.w;
  float drift = noise(t * 6.0 + phase) * 0.65 + noise(t * 13.0 - phase * 1.7) * 0.35;
  sky += u_post.z * (drift * 2.0 - 1.0) * u_mid / max(max(u_mid.r, u_mid.g), max(u_mid.b, 0.001));
  sky += (hash(gl_FragCoord.xy + fract(u_time) * 61.0) - 0.5) / 255.0;
  vec4 s = texture(u_scene, v_uv);
  vec3 f = s.rgb + texture(u_bloom, v_uv).rgb * u_post.y;
  o = vec4(sky * (1.0 - s.a) + u_post.x * (1.0 - exp(-f / u_post.x)), 1.0);
}`;

const target = (gl: WebGL2RenderingContext, w: number, h: number): Target => {
  const tex = gl.createTexture()!;
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  const fbo = gl.createFramebuffer()!;
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  return { fbo, tex, w, h };
};

const free = (gl: WebGL2RenderingContext, t: Target) => { gl.deleteFramebuffer(t.fbo); gl.deleteTexture(t.tex); };

export function createPost(gl: WebGL2RenderingContext, sky: { ground: RGB; mid: RGB; low: RGB }): Post {
  const blur = compile(gl, QUAD_VERT, BLUR_FRAG);
  const mix = compile(gl, QUAD_VERT, COMPOSITE_FRAG);
  const ub = uniforms(gl, blur, ['u_src', 'u_dir']);
  const um = uniforms(gl, mix, ['u_scene', 'u_bloom', 'u_size', 'u_horizon', 'u_time', 'u_ground', 'u_mid', 'u_low', 'u_post']);
  let scene = target(gl, 1, 1), a = target(gl, 1, 1), b = target(gl, 1, 1);
  const into = (t: Target) => { gl.bindFramebuffer(gl.FRAMEBUFFER, t.fbo); gl.viewport(0, 0, t.w, t.h); };
  const quad = (program: WebGLProgram) => { gl.useProgram(program); gl.drawArrays(gl.TRIANGLES, 0, 3); };
  const pass = (from: Target, to: Target, dx: number, dy: number) => {
    into(to);
    gl.useProgram(blur);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, from.tex);
    gl.uniform1i(ub.u_src!, 0);
    gl.uniform2f(ub.u_dir!, dx, dy);
    quad(blur);
  };
  return {
    resize(width, height) {
      for (const t of [scene, a, b]) free(gl, t);
      scene = target(gl, width, height);
      a = target(gl, Math.max(1, Math.round(width / 2)), Math.max(1, Math.round(height / 2)));
      b = target(gl, a.w, a.h);
    },
    scene() { into(scene); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); },
    bloom(draw) {
      into(a); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      draw();
      gl.disable(gl.BLEND);
      pass(a, b, BLOOM_SPREAD / a.w, 0);
      pass(b, a, 0, BLOOM_SPREAD / a.h);
    },
    composite({ time, horizon, width, height }) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, width, height);
      gl.disable(gl.BLEND);
      gl.useProgram(mix);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, scene.tex); gl.uniform1i(um.u_scene!, 0);
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, a.tex); gl.uniform1i(um.u_bloom!, 1);
      gl.uniform2f(um.u_size!, width, height);
      gl.uniform1f(um.u_horizon!, horizon);
      gl.uniform1f(um.u_time!, time);
      gl.uniform3f(um.u_ground!, ...sky.ground);
      gl.uniform3f(um.u_mid!, ...sky.mid);
      gl.uniform3f(um.u_low!, ...sky.low);
      gl.uniform4f(um.u_post!, FIELD_CAP, BLOOM_STRENGTH, DRIFT, DRIFT_PERIOD);
      quad(mix);
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, null);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, null);
    },
    dispose() { for (const t of [scene, a, b]) free(gl, t); gl.deleteProgram(blur); gl.deleteProgram(mix); },
  };
}
