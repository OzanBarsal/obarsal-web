const PROJECT = `vec3 project(vec3 p) {
  vec3 d = p - u_cam;
  float yc = d.y * u_proj.y + d.z * u_proj.z;
  float zc = -d.y * u_proj.z + d.z * u_proj.y;
  return vec3(u_size.x * 0.5 + u_proj.x * d.x / zc, u_size.y * 0.5 - u_proj.x * yc / zc, zc);
}`;

export const SEGMENT_VERT = `#version 300 es
precision highp float;
layout(location = 0) in vec2 a_corner;
layout(location = 1) in vec3 a_p0;
layout(location = 2) in vec3 a_p1;
layout(location = 3) in vec3 a_meta;
uniform vec2 u_size;
uniform vec3 u_cam;
uniform vec4 u_proj;
uniform vec3 u_fog;
uniform float u_time;
uniform vec3 u_accent;
uniform vec3 u_line;
out float v_d;
out float v_hw;
out vec4 v_color;
${PROJECT}
// A culled instance is collapsed to one off-screen point rather than discarded per fragment:
// the rasteriser then skips it entirely, which is what keeps 60 000 instances cheap.
void main() {
  float g = clamp((u_time - a_meta.y) / a_meta.z, 0.0, 1.0);
  vec3 s0 = project(a_p0);
  vec3 s1 = project(mix(a_p0, a_p1, g));
  float zc = (s0.z + s1.z) * 0.5;
  bool cull = g <= 0.0 || s0.z <= u_proj.w || s1.z <= u_proj.w || zc > u_fog.x
    || (s0.y < u_fog.y - 2.0 && s1.y < u_fog.y - 2.0);
  if (cull) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); v_d = 0.0; v_hw = 0.0; v_color = vec4(0.0); return; }
  float fade = max(0.0, 1.0 - pow(zc / u_fog.x, 1.35));
  float depth = max(a_meta.x, 0.0);
  float hw = clamp((depth + 1.0) * 15.0 / zc, 0.4, 2.6) * 0.5;
  float alpha = min(u_fog.z, (0.13 + depth * 0.07) * fade * 1.7);
  vec2 dir = s1.xy - s0.xy;
  vec2 n = vec2(-dir.y, dir.x) / max(length(dir), 0.001);
  vec2 pos = mix(s0.xy, s1.xy, a_corner.x) + n * a_corner.y * (hw + 0.5);
  gl_Position = vec4(pos.x / u_size.x * 2.0 - 1.0, 1.0 - pos.y / u_size.y * 2.0, 0.0, 1.0);
  float age = clamp((u_time - (a_meta.y + a_meta.z)) / 2.0, 0.0, 1.0);
  v_color = vec4(mix(u_accent, u_line, age), alpha);
  v_d = a_corner.y * (hw + 0.5);
  v_hw = hw;
}`;

export const SEGMENT_FRAG = `#version 300 es
precision mediump float;
in float v_d;
in float v_hw;
in vec4 v_color;
out vec4 o;
void main() {
  float a = v_color.a * clamp(v_hw + 0.5 - abs(v_d), 0.0, 1.0);
  o = vec4(v_color.rgb * a, a);
}`;

export const TIP_VERT = `#version 300 es
precision highp float;
layout(location = 0) in vec2 a_corner;
layout(location = 1) in vec3 a_p0;
layout(location = 2) in vec3 a_p1;
layout(location = 3) in vec3 a_meta;
uniform vec2 u_size;
uniform vec3 u_cam;
uniform vec4 u_proj;
uniform vec3 u_fog;
uniform float u_time;
out vec2 v_uv;
out float v_a;
${PROJECT}
void main() {
  float g = (u_time - a_meta.y) / a_meta.z;
  vec3 s = project(mix(a_p0, a_p1, clamp(g, 0.0, 1.0)));
  bool cull = g <= 0.0 || g >= 1.0 || s.z <= u_proj.w || s.z > u_fog.x || s.y < u_fog.y - 2.0;
  if (cull) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); v_uv = vec2(0.0); v_a = 0.0; return; }
  float r = max(0.6, 8.0 / s.z) * 3.6;
  vec2 c = vec2(a_corner.x * 2.0 - 1.0, a_corner.y);
  vec2 pos = s.xy + c * r;
  gl_Position = vec4(pos.x / u_size.x * 2.0 - 1.0, 1.0 - pos.y / u_size.y * 2.0, 0.0, 1.0);
  v_uv = c;
  v_a = 0.5 * max(0.0, 1.0 - pow(s.z / u_fog.x, 1.35));
}`;

export const TIP_FRAG = `#version 300 es
precision mediump float;
in vec2 v_uv;
in float v_a;
uniform vec3 u_accent;
out vec4 o;
void main() {
  float d2 = dot(v_uv, v_uv);
  float a = v_a * exp(-4.0 * d2);
  o = vec4(u_accent * a, a);
}`;

export const FLASH_VERT = `#version 300 es
precision highp float;
layout(location = 0) in vec2 a_corner;
layout(location = 1) in vec3 a_point;
layout(location = 2) in float a_birth;
uniform vec2 u_size;
uniform vec3 u_cam;
uniform vec4 u_proj;
uniform vec3 u_fog;
uniform float u_time;
uniform float u_life;
out vec2 v_uv;
out float v_a;
${PROJECT}
void main() {
  float k = 1.0 - (u_time - a_birth) / u_life;
  vec3 s = project(a_point);
  bool cull = k <= 0.0 || k > 1.0 || s.z <= u_proj.w || s.z > u_fog.x || s.y < u_fog.y - 2.0;
  if (cull) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); v_uv = vec2(0.0); v_a = 0.0; return; }
  float r = max(0.6, 8.0 / s.z) * 3.6 * k;
  vec2 c = vec2(a_corner.x * 2.0 - 1.0, a_corner.y);
  vec2 pos = s.xy + c * r;
  gl_Position = vec4(pos.x / u_size.x * 2.0 - 1.0, 1.0 - pos.y / u_size.y * 2.0, 0.0, 1.0);
  v_uv = c;
  v_a = 0.5 * k * max(0.0, 1.0 - pow(s.z / u_fog.x, 1.35));
}`;

export const MOTE_VERT = `#version 300 es
precision highp float;
layout(location = 0) in vec2 a_corner;
layout(location = 1) in vec3 a_mote;
uniform vec2 u_size;
uniform vec3 u_fog;
uniform float u_time;
uniform float u_life;
out vec2 v_uv;
out float v_a;
void main() {
  float t = fract(u_time / u_life + a_mote.y);
  float rise = u_fog.y * (0.35 + 0.5 * a_mote.z);
  vec2 p = vec2(a_mote.x * u_size.x + sin((t + a_mote.y) * 6.2832) * 6.0, u_fog.y - t * rise);
  vec2 c = vec2(a_corner.x * 2.0 - 1.0, a_corner.y);
  vec2 pos = p + c * 1.6;
  gl_Position = vec4(pos.x / u_size.x * 2.0 - 1.0, 1.0 - pos.y / u_size.y * 2.0, 0.0, 1.0);
  v_uv = c;
  v_a = 0.16 * sin(t * 3.1416);
}`;
