import { CORE_CAP, FOG, THETA, Z_NEAR } from '../constants';
import type { View } from '../camera';

export const NAMES = ['u_size', 'u_cam', 'u_proj', 'u_fog', 'u_time', 'u_accent', 'u_line', 'u_life'] as const;

export function rgb(css: string): [number, number, number] {
  const hex = css.trim();
  if (!/^#[0-9a-f]{6}$/i.test(hex)) throw new Error(`expected a six-digit hex colour, got "${hex}"`);
  const n = parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

export function compile(gl: WebGL2RenderingContext, vert: string, frag: string): WebGLProgram {
  const make = (type: number, src: string) => {
    const shader = gl.createShader(type)!;
    gl.shaderSource(shader, src);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      throw new Error(gl.getShaderInfoLog(shader) ?? 'shader failed to compile');
    }
    return shader;
  };
  const program = gl.createProgram()!;
  gl.attachShader(program, make(gl.VERTEX_SHADER, vert));
  gl.attachShader(program, make(gl.FRAGMENT_SHADER, frag));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(program) ?? 'program failed to link');
  }
  return program;
}

export function uniforms(gl: WebGL2RenderingContext, program: WebGLProgram, names: readonly string[]) {
  const out: Record<string, WebGLUniformLocation | null> = {};
  for (const name of names) out[name] = gl.getUniformLocation(program, name);
  return out;
}

const CORNERS = new Float32Array([0, -1, 0, 1, 1, -1, 1, 1]);

export function cornerBuffer(gl: WebGL2RenderingContext): WebGLBuffer {
  const buffer = gl.createBuffer()!;
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, CORNERS, gl.STATIC_DRAW);
  return buffer;
}

export function instancedVao(gl: WebGL2RenderingContext, corners: WebGLBuffer, capacityBytes: number, sizes: readonly number[]) {
  const vao = gl.createVertexArray()!;
  const buffer = gl.createBuffer()!;
  gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, corners);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, capacityBytes, gl.DYNAMIC_DRAW);
  const stride = sizes.reduce((a, b) => a + b, 0) * 4;
  let offset = 0;
  for (const [i, size] of sizes.entries()) {
    gl.enableVertexAttribArray(i + 1);
    gl.vertexAttribPointer(i + 1, size, gl.FLOAT, false, stride, offset);
    gl.vertexAttribDivisor(i + 1, 1);
    offset += size * 4;
  }
  gl.bindVertexArray(null);
  return { vao, buffer };
}

export function seeds(count: number): Float32Array {
  const out = new Float32Array(count * 3);
  for (let i = 0; i < out.length; i += 1) out[i] = Math.random();
  return out;
}

export type Pass = { program: WebGLProgram; u: ReturnType<typeof uniforms>; blend: number; vao: WebGLVertexArrayObject; life: number; count(): number };

export type Frame = { v: View; camZ: number; clock: number; width: number; height: number; accent: [number, number, number]; line: [number, number, number] };

export function pass(gl: WebGL2RenderingContext, program: WebGLProgram, blend: number, vao: WebGLVertexArrayObject, life: number, count: () => number): Pass {
  return { program, u: uniforms(gl, program, NAMES), blend, vao, life, count };
}

export function draw(gl: WebGL2RenderingContext, p: Pass, f: Frame): void {
  const count = p.count();
  if (!count) return;
  gl.useProgram(p.program);
  gl.blendFunc(gl.ONE, p.blend);
  gl.uniform2f(p.u.u_size!, f.width, f.height);
  gl.uniform3f(p.u.u_cam!, 0, f.v.camY, f.camZ);
  gl.uniform4f(p.u.u_proj!, f.v.f, Math.cos(THETA), Math.sin(THETA), Z_NEAR);
  gl.uniform3f(p.u.u_fog!, FOG, f.v.horizon, CORE_CAP);
  gl.uniform1f(p.u.u_time!, f.clock);
  gl.uniform3f(p.u.u_accent!, ...f.accent);
  if (p.u.u_line) gl.uniform3f(p.u.u_line, ...f.line);
  if (p.u.u_life) gl.uniform1f(p.u.u_life, p.life);
  gl.bindVertexArray(p.vao);
  gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, count);
}
