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
