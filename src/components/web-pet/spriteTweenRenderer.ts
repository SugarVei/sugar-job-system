import { SPRITE_ATLASES, type AtlasName, type SpriteTween } from './spriteAnimations';

const flowCache = new Map<AtlasName, Map<string, Uint8Array>>();
const flowRequests = new Map<AtlasName, Promise<void>>();
function loadMotion(name: AtlasName) {
  let request = flowRequests.get(name);
  if (!request) {
    request = fetch(`/pet/motion/${name}.flow`).then(async response => {
      if (!response.ok) throw new Error('Pet motion data unavailable');
      const data = await response.arrayBuffer();
      const header = new DataView(data);
      const version = new TextDecoder().decode(data.slice(0, 8));
      if (data.byteLength < 16 || !['PETFLOW1', 'PETFLOW2'].includes(version)
        || header.getUint16(8, true) !== 95 || header.getUint16(10, true) !== 140) throw new Error('Invalid pet motion data');
      const bytes = 95 * 140 * 4;
      const fields = new Map<string, Uint8Array>();
      if (version === 'PETFLOW1') {
        if (data.byteLength !== 12 + 36 * bytes) throw new Error('Invalid pet motion length');
        for (let a = 0; a < 6; a++) for (let b = 0; b < 6; b++) fields.set(`${a}:${b}`, new Uint8Array(data, 12 + (a * 6 + b) * bytes, bytes));
      } else {
        const count = header.getUint16(12, true), pairs = header.getUint16(14, true);
        if (count !== SPRITE_ATLASES[name].rects.length || data.byteLength !== 16 + pairs * (bytes + 4)) throw new Error('Invalid pet motion index');
        for (let index = 0; index < pairs; index++) {
          const offset = 16 + index * (bytes + 4);
          const a = header.getUint16(offset, true), b = header.getUint16(offset + 2, true);
          if (a >= count || b >= count) throw new Error('Invalid pet pose');
          fields.set(`${a}:${b}`, new Uint8Array(data, offset + 4, bytes));
        }
      }
      flowCache.set(name, fields);
    }).catch(() => { flowRequests.delete(name); });
    flowRequests.set(name, request);
  }
  return request;
}

const imageCache = new Map<string, Promise<HTMLImageElement>>();
export function loadSpriteAtlas(name: AtlasName): Promise<HTMLImageElement> {
  const src = SPRITE_ATLASES[name].src;
  const cached = imageCache.get(src);
  if (cached) return cached;
  const pending = new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    const motion = loadMotion(name);
    image.onload = () => { void motion.then(() => resolve(image)); };
    image.onerror = () => { imageCache.delete(src); reject(new Error('Pet atlas unavailable')); };
    image.src = src;
  });
  imageCache.set(src, pending);
  return pending;
}

function poseGeometry(name: AtlasName, pose: number) {
  const atlas = SPRITE_ATLASES[name];
  const [x, y, w, h] = atlas.rects[pose];
  const width = (w + 4) * atlas.scale, height = (h + 4) * atlas.scale;
  return { source: [x - 2, y - 2, w + 4, h + 4],
    destination: [(95 - width) / 2, 139 - height - (name === 'happy' && pose === 2 ? 7 : name === 'joy' && pose === 15 ? 7 : name === 'joy' && pose === 16 ? 3 : 0), width, height] };
}
const geometry = Object.fromEntries(Object.keys(SPRITE_ATLASES).map(key => [key,
  Array.from({ length: SPRITE_ATLASES[key as AtlasName].rects.length }, (_, pose) => poseGeometry(key as AtlasName, pose)),
])) as Record<AtlasName, ReturnType<typeof poseGeometry>[]>;

const vertexSource = `
attribute vec2 position;
varying vec2 point;
void main() {
  point = vec2((position.x + 1.0) * 47.5, (1.0 - position.y) * 70.0);
  gl_Position = vec4(position, 0.0, 1.0);
}`;
const fragmentSource = `
precision highp float;
varying vec2 point;
uniform sampler2D atlas;
uniform vec4 sourceA;
uniform vec4 sourceB;
uniform vec4 destinationA;
uniform vec4 destinationB;
uniform sampler2D flowAB;
uniform sampler2D flowBA;
uniform float progress;
uniform vec4 motion;

vec4 samplePose(vec2 p, vec4 destination, vec4 source) {
  vec2 uv = (p - destination.xy) / destination.zw;
  if (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) return vec4(0.0);
  return texture2D(atlas, (source.xy + uv * source.zw) / vec2(1536.0, 1024.0));
}
vec2 decodeFlow(vec4 encoded) {
  return (vec2(encoded.r * 255.0 * 256.0 + encoded.g * 255.0,
    encoded.b * 255.0 * 256.0 + encoded.a * 255.0) - 32768.0) / 256.0;
}
void main() {
  vec2 p = (point - vec2(47.5, 139.0) - motion.xy) / motion.zw + vec2(47.5, 139.0);
  vec2 aPoint = p;
  vec2 bPoint = p;
  for (int i = 0; i < 5; i++) {
    vec2 forward = decodeFlow(texture2D(flowAB, aPoint / vec2(95.0, 140.0)));
    vec2 backward = decodeFlow(texture2D(flowBA, bPoint / vec2(95.0, 140.0)));
    aPoint = mix(aPoint, p - progress * forward, .75);
    bPoint = mix(bPoint, p - (1.0 - progress) * backward, .75);
  }
  vec4 a = samplePose(aPoint, destinationA, sourceA);
  vec4 b = samplePose(bPoint, destinationB, sourceB);
  // Textures and the drawing buffer are both premultiplied: no dark halos.
  gl_FragColor = mix(a, b, progress);
}`;

class GpuTweenRenderer {
  private readonly canvas = document.createElement('canvas');
  private readonly gl: WebGLRenderingContext;
  private readonly program: WebGLProgram;
  private readonly textures = new Map<AtlasName, WebGLTexture>();
  private readonly motionTextures = new Map<string, WebGLTexture>();
  private readonly uniforms = new Map<string, WebGLUniformLocation | null>();
  private readonly buffer: WebGLBuffer;
  private lost = false;

  constructor() {
    this.canvas.width = 380; this.canvas.height = 560;
    const gl = this.canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false });
    if (!gl) throw new Error('WebGL unavailable');
    this.gl = gl;
    const compile = (type: number, source: string) => {
      const shader = gl.createShader(type);
      if (!shader) throw new Error('Shader allocation failed');
      gl.shaderSource(shader, source); gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        gl.deleteShader(shader); throw new Error('Pet shader compilation failed');
      }
      return shader;
    };
    const vertex = compile(gl.VERTEX_SHADER, vertexSource);
    const fragment = compile(gl.FRAGMENT_SHADER, fragmentSource);
    const program = gl.createProgram();
    if (!program) throw new Error('Program allocation failed');
    gl.attachShader(program, vertex); gl.attachShader(program, fragment); gl.linkProgram(program);
    gl.deleteShader(vertex); gl.deleteShader(fragment);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) { gl.deleteProgram(program); throw new Error('Pet shader linking failed'); }
    this.program = program;
    const buffer = gl.createBuffer();
    if (!buffer) throw new Error('Buffer allocation failed');
    this.buffer = buffer;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
    this.canvas.addEventListener('webglcontextlost', event => { event.preventDefault(); this.lost = true; });
  }

  draw(ctx: CanvasRenderingContext2D, name: AtlasName, image: HTMLImageElement, tween: SpriteTween, motion: number[]) {
    const gl = this.gl;
    const flow = flowCache.get(name);
    if (this.lost || gl.isContextLost() || !flow) return false;
    gl.useProgram(this.program);
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    const attribute = gl.getAttribLocation(this.program, 'position');
    gl.enableVertexAttribArray(attribute); gl.vertexAttribPointer(attribute, 2, gl.FLOAT, false, 0, 0);
    gl.activeTexture(gl.TEXTURE0);
    let texture = this.textures.get(name);
    if (!texture) {
      texture = gl.createTexture() ?? undefined;
      if (!texture) return false;
      this.textures.set(name, texture);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    } else gl.bindTexture(gl.TEXTURE_2D, texture);
    const a = geometry[name][tween.from], b = geometry[name][tween.to];
    for (const [unit, from, to] of [[1, tween.from, tween.to], [2, tween.to, tween.from]]) {
      gl.activeTexture(gl.TEXTURE0 + unit);
      const key = `${name}:${from}:${to}`;
      let field = this.motionTextures.get(key);
      if (!field) {
        const vectorField = flow.get(`${from}:${to}`);
        if (!vectorField) return false;
        field = gl.createTexture() ?? undefined;
        if (!field) return false;
        this.motionTextures.set(key, field);
        gl.bindTexture(gl.TEXTURE_2D, field);
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 95, 140, 0, gl.RGBA, gl.UNSIGNED_BYTE, vectorField);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      } else gl.bindTexture(gl.TEXTURE_2D, field);
    }
    const uniform = (key: string) => {
      if (!this.uniforms.has(key)) this.uniforms.set(key, gl.getUniformLocation(this.program, key));
      return this.uniforms.get(key) ?? null;
    };
    gl.uniform1i(uniform('atlas'), 0);
    gl.uniform1i(uniform('flowAB'), 1); gl.uniform1i(uniform('flowBA'), 2);
    gl.uniform4fv(uniform('sourceA'), a.source); gl.uniform4fv(uniform('sourceB'), b.source);
    gl.uniform4fv(uniform('destinationA'), a.destination); gl.uniform4fv(uniform('destinationB'), b.destination);
    gl.uniform1f(uniform('progress'), tween.mix); gl.uniform4fv(uniform('motion'), motion);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    ctx.drawImage(this.canvas, 0, 0, ctx.canvas.width, ctx.canvas.height);
    return true;
  }
}

// One bounded GPU context/texture cache serves the floating pet and the preview.
// State changes never recompile shaders, decode atlases or allocate contexts.
let gpu: GpuTweenRenderer | null | undefined;
export function drawSpriteTween(ctx: CanvasRenderingContext2D, name: AtlasName, image: HTMLImageElement,
  tween: SpriteTween, elapsed: number, reducedMotion = false): 'optical-flow' | 'blend-fallback' {
  const phase = elapsed / 1000 * Math.PI * 2;
  const motion = reducedMotion ? [0, 0, 1, 1] : name === 'crawl'
    ? [Math.sin(phase / .88) * .25, Math.cos(phase / .44) * .3, 1, 1]
    : [0, Math.sin(phase / 3.6) * -.25, 1, 1 + Math.sin(phase / 3.6) * .004];
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  if (gpu === undefined) {
    try { gpu = new GpuTweenRenderer(); } catch { gpu = null; }
  }
  if (gpu?.draw(ctx, name, image, tween, motion)) return 'optical-flow';
  // Graceful 2D fallback: still interpolated at rAF, never returns to hard cuts.
  ctx.save();
  ctx.scale(ctx.canvas.width / 95, ctx.canvas.height / 140);
  ctx.translate(47.5 + motion[0], 139 + motion[1]); ctx.scale(motion[2], motion[3]); ctx.translate(-47.5, -139);
  ctx.globalCompositeOperation = 'lighter';
  for (const [pose, opacity] of [[tween.from, 1 - tween.mix], [tween.to, tween.mix]]) {
    if (opacity <= 0) continue;
    ctx.globalAlpha = opacity;
    const { source: s, destination: d } = geometry[name][pose];
    ctx.drawImage(image, s[0], s[1], s[2], s[3], d[0], d[1], d[2], d[3]);
  }
  ctx.restore();
  return 'blend-fallback';
}
