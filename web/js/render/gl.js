/* ============================================================
   War of Power — محرك الرسم WebGL2: التضاريس، الإضاءة، الظلال، الضباب
   الملف: js/render/gl.js   ·   ترتيب التحميل: 5 من 43
   ============================================================ */
'use strict';
/* ===== WebGL2 renderer: terrain, lit sprites, shadows, lights, fog ===== */
const R = (function () {
  let gl = null, cv = null, ok = false, lost = false;
  let W = 1, H = 1, dpr = 1, cssW = 1, cssH = 1, resScale = 1;
  const cam = { x: 0, y: 0, z: 1 }; // z: css px per world unit
  const SUN = [-0.5, -0.62, 0.62]; { const l = Math.hypot(SUN[0], SUN[1], SUN[2]); SUN[0] /= l; SUN[1] /= l; SUN[2] /= l; }
  const SHD = [0.78, 0.98]; // shadow offset per unit height
  const env = { amb: [0.36, 0.38, 0.43], sun: [1.0, 0.95, 0.85], shadowK: 0.6, grade: [1.0, 0.9, 0.035, 0], night: 0, fogCol: [0.015, 0.018, 0.022] };
  const VF = 9; // floats per vertex
  const MAXQ = 20000;
  function batch(maxQ) { const ab = new ArrayBuffer(maxQ * 4 * VF * 4); return { ab, f: new Float32Array(ab), u: new Uint32Array(ab), n: 0, max: maxQ, segs: [], blend: -1 }; }
  const B = { main: batch(MAXQ), shadow: batch(6000), light: batch(3000), over: batch(4000) };
  let progS, progShadow, progT, progLight;
  let vao, vbo, ibo, triVao;
  let fboShadow, texShadow, fboLight, texLight, fbW = 1, fbH = 1;
  let texAlb = null, texMat = null, atlasLayers = 0;
  let ter = null; // terrain textures
  const U = {}; // uniform locations per program
  let time = 0;

  const VS = `#version 300 es
  layout(location=0) in vec2 aPos; layout(location=1) in vec3 aUV; layout(location=2) in vec2 aRot;
  layout(location=3) in vec4 aCol; layout(location=4) in vec4 aTeam;
  uniform vec4 uView; uniform vec2 uScr;
  out vec3 vUV; out vec4 vCol; out vec4 vTeam; out vec2 vRot;
  void main(){
    vec2 p = (aPos - uView.xy) / uView.z; // device px offset from center
    gl_Position = vec4(p.x / (uScr.x*0.5), -p.y / (uScr.y*0.5), 0.0, 1.0);
    vUV = aUV; vCol = aCol; vTeam = aTeam; vRot = aRot;
  }`;
  const GRADE = `
  uniform vec4 uGrade; uniform vec2 uScrF;
  vec3 grade(vec3 c, vec2 fc){
    c *= uGrade.x; c = c / (1.0 + c * 0.12);
    float l = dot(c, vec3(0.299,0.587,0.114)); c = mix(vec3(l), c, uGrade.y);
    c *= vec3(1.0 + uGrade.z, 1.0 + uGrade.z*0.3, 1.0 - uGrade.z);
    vec2 q = fc / uScrF - 0.5; c *= 1.0 - dot(q,q) * 0.42;
    return c;
  }`;
  const FS = `#version 300 es
  precision highp float; precision highp sampler2DArray;
  uniform sampler2DArray uAlb; uniform sampler2DArray uMat; uniform sampler2D uShadow; uniform sampler2D uLight;
  uniform vec3 uSun; uniform vec3 uSunCol; uniform vec3 uAmb; uniform float uShadowK;
  ${GRADE}
  in vec3 vUV; in vec4 vCol; in vec4 vTeam; in vec2 vRot;
  out vec4 o;
  void main(){
    vec4 a = texture(uAlb, vUV);
    if (a.a < 0.004) discard;
    int f = int(vTeam.a * 255.0 + 0.5);
    vec3 col = a.rgb;
    if ((f & 8) != 0) col = vCol.rgb * a.a;
    else col *= vCol.rgb;
    if ((f & 1) != 0) {
      vec4 m = texture(uMat, vUV);
      vec3 alb = col / max(a.a, 0.002);
      if ((f & 4) != 0) { float lum = dot(alb, vec3(0.3,0.59,0.11)); alb = mix(alb, vTeam.rgb * (0.28 + lum * 1.25), m.b); }
      vec2 nx = m.rg * 2.0 - 1.0; nx = vec2(nx.x*vRot.x - nx.y*vRot.y, nx.x*vRot.y + nx.y*vRot.x);
      vec3 n = vec3(nx, sqrt(max(0.0, 1.0 - dot(nx, nx))));
      vec2 sc = gl_FragCoord.xy / uScrF;
      float sh = 1.0; if ((f & 2) != 0) sh = 1.0 - texture(uShadow, sc).r * uShadowK;
      float ndl = max(dot(n, uSun), 0.0);
      float spec = m.a < 0.5 ? m.a * 2.0 : 0.0; float emi = m.a >= 0.5 ? (m.a - 0.5) * 2.0 : 0.0;
      vec3 hv = normalize(uSun + vec3(0.0,0.0,1.0)); float sp = pow(max(dot(n, hv), 0.0), 28.0) * spec * 1.4;
      vec3 L = texture(uLight, sc).rgb * 4.0;
      vec3 c = alb * (uAmb + uSunCol * ndl * sh + L * 0.9) + (uSunCol * sh + L*0.5) * sp + alb * emi * 2.2;
      col = grade(c, gl_FragCoord.xy) * a.a;
    }
    o = vec4(col, a.a) * vCol.a;
  }`;
  const FS_SHADOW = `#version 300 es
  precision highp float; precision highp sampler2DArray;
  uniform sampler2DArray uAlb; in vec3 vUV; in vec4 vCol; in vec4 vTeam; in vec2 vRot; out vec4 o;
  void main(){ float a = texture(uAlb, vUV).a * vCol.a; o = vec4(a, a, a, a); }`;
  const FS_LIGHT = `#version 300 es
  precision highp float; precision highp sampler2DArray;
  uniform sampler2DArray uAlb; in vec3 vUV; in vec4 vCol; in vec4 vTeam; in vec2 vRot; out vec4 o;
  void main(){ float a = texture(uAlb, vUV).a; o = vec4(vCol.rgb * a * vCol.a, 1.0); }`;
  const VS_T = `#version 300 es
  void main(){ vec2 p = vec2((gl_VertexID==1)?3.0:-1.0, (gl_VertexID==2)?3.0:-1.0); gl_Position = vec4(p,0.0,1.0); }`;
  const FS_T = `#version 300 es
  precision highp float; precision highp sampler2DArray;
  uniform sampler2D uData; uniform sampler2D uSplat0; uniform sampler2D uSplat1; uniform sampler2D uFog;
  uniform sampler2D uShadow; uniform sampler2D uLight; uniform sampler2DArray uDet;
  uniform vec4 uView; uniform vec2 uScr; uniform vec2 uMap; uniform vec3 uSun; uniform vec3 uSunCol; uniform vec3 uAmb;
  uniform float uSea; uniform float uShadowK; uniform float uTime; uniform vec3 uFogCol; uniform float uFogOn; uniform vec4 uGrid; uniform float uLava;
  ${GRADE}
  out vec4 o;
  void main(){
    vec2 sp = gl_FragCoord.xy;
    vec2 wp = vec2(uView.x + (sp.x - uScr.x*0.5) * uView.z, uView.y + (uScr.y*0.5 - sp.y) * uView.z);
    vec2 muv = wp / (32.0 * uMap);
    vec2 cuv = clamp(muv, vec2(0.0), vec2(1.0));
    vec4 d = texture(uData, cuv);
    vec4 s0 = texture(uSplat0, cuv); vec4 s1 = texture(uSplat1, cuv);
    float w[8]; w[0]=s0.r; w[1]=s0.g; w[2]=s0.b; w[3]=s0.a; w[4]=s1.r; w[5]=s1.g; w[6]=s1.b; w[7]=s1.a;
    int i1 = 0; float w1 = -1.0; int i2 = 0; float w2 = -1.0;
    for (int i = 0; i < 8; i++) { float v = w[i]; if (v > w1) { w2 = w1; i2 = i1; w1 = v; i1 = i; } else if (v > w2) { w2 = v; i2 = i; } }
    vec2 duv = wp / 256.0;
    vec4 t1 = texture(uDet, vec3(duv, float(i1)));
    vec4 t2 = texture(uDet, vec3(duv * 1.0, float(i2)));
    float a1 = w1 + t1.a * 0.4, a2 = w2 + t2.a * 0.4; float ma = max(a1, a2) - 0.1;
    float b1 = max(a1 - ma, 0.0), b2 = max(a2 - ma, 0.0);
    vec4 t = (t1 * b1 + t2 * b2) / max(b1 + b2, 0.0001);
    float mv = texture(uDet, vec3(wp / 2100.0, 8.0)).a;
    vec3 alb = t.rgb * (0.86 + d.a * 0.2 + (mv - 0.5) * 0.18);
    vec3 n = vec3(d.r * 2.0 - 1.0, d.g * 2.0 - 1.0, 1.0);
    float px = uView.z;
    vec2 g = vec2(dFdx(t.a), -dFdy(t.a)) / px;
    n.xy -= g * 2.0;
    float hgt = d.b;
    float depth = uSea - hgt;
    float specW = 0.0;
    vec2 wuv = wp / 560.0;
    float h1 = texture(uDet, vec3(wuv + vec2(uTime * 0.010, uTime * 0.006), 8.0), 1.6).a;
    float h2 = texture(uDet, vec3(wuv * 1.7 + vec2(-uTime * 0.008, uTime * 0.011), 8.0), 1.6).a;
    float wh = h1 + h2 * 0.6;
    vec2 wg = vec2(dFdx(wh), -dFdy(wh)) / px;
    vec3 emis = vec3(0.0);
    if (uLava > 0.5) { // volcanic land: basalt ground, glowing lava where water would be, a hot rim along the banks
      alb = mix(alb, vec3(0.17, 0.14, 0.13) * (0.75 + mv * 0.5), 0.62);
      if (depth > 0.0) {
        float flow = h1 * 0.7 + h2 * 0.5 + 0.25 * sin(uTime * 0.9 + wp.x * 0.013 - wp.y * 0.009);
        vec3 hot = mix(vec3(0.95, 0.27, 0.03), vec3(1.0, 0.8, 0.28), smoothstep(0.6, 1.15, flow));
        float crust = smoothstep(0.42, 0.18, flow) * 0.6; vec3 lv = mix(hot, vec3(0.13, 0.05, 0.03), crust);
        float edge = smoothstep(0.0, 0.05, depth); alb = mix(alb, lv * 0.3, edge); emis = lv * (1.15 - crust) * edge * 1.15; n = mix(n, vec3(0.0, 0.0, 1.0), edge);
      } else { float near = 1.0 - smoothstep(0.0, 0.045, -depth); emis = vec3(1.0, 0.33, 0.05) * near * 0.4; }
    }
    if (depth > 0.0 && uLava < 0.5) {
      float dep = clamp(depth * 9.0, 0.0, 1.0);
      vec3 wn = normalize(vec3(-wg * 30.0, 1.0));
      vec3 shallow = vec3(0.16, 0.38, 0.38), deep = vec3(0.035, 0.13, 0.2);
      vec3 wc = mix(shallow, deep, smoothstep(0.0, 1.0, dep));
      alb = mix(alb * vec3(0.7, 0.85, 0.85), wc, smoothstep(0.0, 0.35, dep) * 0.92 + 0.08);
      float foam = (1.0 - smoothstep(0.0, 0.06, dep)) * smoothstep(0.45, 0.9, h1 + 0.25 * sin(uTime * 1.6 + wp.x * 0.02 + wp.y * 0.017));
      alb = mix(alb, vec3(0.86, 0.9, 0.88), foam * 0.7);
      n = mix(n, wn, smoothstep(0.0, 0.2, dep));
      specW = 0.75 * smoothstep(0.0, 0.25, dep) * clamp(1.5 - px * 0.5, 0.3, 1.0);
      alb *= 0.94 + 0.12 * h2;
    }
    n = normalize(n);
    vec2 sc = sp / uScrF;
    float ndl = max(dot(n, uSun), 0.0);
    float sh = 1.0 - texture(uShadow, sc).r * uShadowK;
    vec3 L = texture(uLight, sc).rgb * 4.0;
    vec3 col = alb * (uAmb + uSunCol * ndl * sh + L);
    col += emis;
    if (specW > 0.0) { vec3 hv = normalize(uSun + vec3(0.0, 0.0, 1.0)); col += uSunCol * pow(max(dot(n, hv), 0.0), 44.0) * specW * sh * 1.25 + L * 0.15 * specW; }
    if (uGrid.x > 0.0) { vec2 gp = fract(wp / 32.0); float gl = step(gp.x, 0.04) + step(gp.y, 0.04); col = mix(col, vec3(0.9, 0.95, 1.0), min(gl, 1.0) * uGrid.x * 0.22); }
    col = grade(col, sp);
    if (uFogOn > 0.5) {
      vec4 fg = texture(uFog, cuv);
      float vis = smoothstep(0.05, 0.95, fg.r); float ex = smoothstep(0.1, 0.9, fg.g);
      vec3 dim = col * vec3(0.38, 0.4, 0.46);
      col = mix(uFogCol, mix(dim, col, vis), ex);
    }
    float edge = smoothstep(0.0, 0.012, min(min(muv.x, muv.y), min(1.0 - muv.x, 1.0 - muv.y)));
    col = mix(uFogCol, col, edge);
    o = vec4(col, 1.0);
  }`;

  function sh(type, src) {
    const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { const e = gl.getShaderInfoLog(s); throw new Error('shader: ' + e); }
    return s;
  }
  function prog(vs, fs, name) {
    const p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error('link ' + name + ': ' + gl.getProgramInfoLog(p));
    const u = {}; const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < n; i++) { const inf = gl.getActiveUniform(p, i); u[inf.name.replace('[0]', '')] = gl.getUniformLocation(p, inf.name); }
    U[name] = u; return p;
  }
  function mkTex(w, h, opts) {
    const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, opts && opts.data || null);
    const f = opts && opts.nearest ? gl.NEAREST : gl.LINEAR;
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, f); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, f);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  }
  function mkFbo(tex) { const f = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, f); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0); gl.bindFramebuffer(gl.FRAMEBUFFER, null); return f; }

  function initGL() {
    progS = prog(VS, FS, 'spr'); progShadow = prog(VS, FS_SHADOW, 'shd'); progLight = prog(VS, FS_LIGHT, 'lit'); progT = prog(VS_T, FS_T, 'ter');
    vao = gl.createVertexArray(); gl.bindVertexArray(vao);
    vbo = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, vbo); gl.bufferData(gl.ARRAY_BUFFER, MAXQ * 4 * VF * 4, gl.DYNAMIC_DRAW);
    const st = VF * 4;
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, st, 0);
    gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, st, 8);
    gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 2, gl.FLOAT, false, st, 20);
    gl.enableVertexAttribArray(3); gl.vertexAttribPointer(3, 4, gl.UNSIGNED_BYTE, true, st, 28);
    gl.enableVertexAttribArray(4); gl.vertexAttribPointer(4, 4, gl.UNSIGNED_BYTE, true, st, 32);
    const idx = new Uint32Array(MAXQ * 6);
    for (let i = 0, v = 0; i < MAXQ; i++, v += 4) { idx.set([v, v + 1, v + 2, v, v + 2, v + 3], i * 6); }
    ibo = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW);
    gl.bindVertexArray(null);
    triVao = gl.createVertexArray();
    texShadow = mkTex(4, 4); fboShadow = mkFbo(texShadow); texLight = mkTex(4, 4); fboLight = mkFbo(texLight);
    gl.disable(gl.DEPTH_TEST); gl.disable(gl.CULL_FACE);
  }

  function init(canvas) {
    cv = canvas;
    try {
      gl = cv.getContext('webgl2', { antialias: false, alpha: false, premultipliedAlpha: true, preserveDrawingBuffer: false, powerPreference: 'high-performance', desynchronized: true });
    } catch (e) { gl = null; }
    if (!gl) return false;
    cv.addEventListener('webglcontextlost', e => { e.preventDefault(); lost = true; ok = false; R.onLost && R.onLost(); }, false);
    cv.addEventListener('webglcontextrestored', () => { try { lost = false; initGL(); ok = true; R.onRestored && R.onRestored(); } catch (e) { console.error(e); } }, false);
    try { initGL(); } catch (e) { console.error(e); return false; }
    ok = true; return true;
  }
  function resize(cw, ch, devicePR, scale) {
    cssW = cw; cssH = ch; dpr = devicePR; resScale = scale || 1;
    W = Math.max(1, Math.round(cw * dpr * resScale)); H = Math.max(1, Math.round(ch * dpr * resScale));
    cv.width = W; cv.height = H;
    if (!gl || lost) return;
    fbW = Math.max(1, W >> 1); fbH = Math.max(1, H >> 1);
    gl.bindTexture(gl.TEXTURE_2D, texShadow); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, fbW, fbH, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.bindTexture(gl.TEXTURE_2D, texLight); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, fbW, fbH, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  }
  // world units per device px
  const inv = () => 1 / (cam.z * dpr * resScale);

  /* ---------- atlas upload ---------- */
  function uploadAtlas(pagesAlb, pagesMat, size) {
    if (texAlb) { gl.deleteTexture(texAlb); gl.deleteTexture(texMat); }
    atlasLayers = pagesAlb.length;
    texAlb = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D_ARRAY, texAlb);
    const lv = 4;
    gl.texStorage3D(gl.TEXTURE_2D_ARRAY, lv, gl.RGBA8, size, size, atlasLayers);
    for (let i = 0; i < atlasLayers; i++) gl.texSubImage3D(gl.TEXTURE_2D_ARRAY, 0, 0, 0, i, size, size, 1, gl.RGBA, gl.UNSIGNED_BYTE, pagesAlb[i]);
    gl.generateMipmap(gl.TEXTURE_2D_ARRAY);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    texMat = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D_ARRAY, texMat);
    gl.texStorage3D(gl.TEXTURE_2D_ARRAY, lv, gl.RGBA8, size, size, atlasLayers);
    for (let i = 0; i < atlasLayers; i++) gl.texSubImage3D(gl.TEXTURE_2D_ARRAY, 0, 0, 0, i, size, size, 1, gl.RGBA, gl.UNSIGNED_BYTE, pagesMat[i]);
    gl.generateMipmap(gl.TEXTURE_2D_ARRAY);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }
  /* ---------- terrain upload ---------- */
  function uploadTerrain(T) {
    // T: {w,h, data:Uint8Array(w*h*4), splat0, splat1, det: [Uint8Array(512*512*4) x 9], detSize, sea}
    freeTerrain();
    ter = { w: T.w, h: T.h, sea: T.sea, lava: T.lava ? 1 : 0 };
    ter.data = mkTex(T.w, T.h, { data: T.data }); ter.s0 = mkTex(T.w, T.h, { data: T.splat0 }); ter.s1 = mkTex(T.w, T.h, { data: T.splat1 });
    ter.fog = mkTex(T.w, T.h, { data: T.fog || null });
    const ds = T.detSize, n = T.det.length;
    ter.det = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D_ARRAY, ter.det);
    const lv = Math.floor(Math.log2(ds)) + 1;
    gl.texStorage3D(gl.TEXTURE_2D_ARRAY, lv, gl.RGBA8, ds, ds, n);
    for (let i = 0; i < n; i++) gl.texSubImage3D(gl.TEXTURE_2D_ARRAY, 0, 0, 0, i, ds, ds, 1, gl.RGBA, gl.UNSIGNED_BYTE, T.det[i]);
    gl.generateMipmap(gl.TEXTURE_2D_ARRAY);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_S, gl.REPEAT); gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_T, gl.REPEAT);
    const ext = gl.getExtension('EXT_texture_filter_anisotropic');
    if (ext) gl.texParameterf(gl.TEXTURE_2D_ARRAY, ext.TEXTURE_MAX_ANISOTROPY_EXT, 4);
  }
  function updateTerrainRegion(T, x, y, w, h) { // re-upload splat/data subregion (e.g., roads/craters)
    if (!ter) return;
    const sub = (tex, src) => { gl.bindTexture(gl.TEXTURE_2D, tex); const a = new Uint8Array(w * h * 4); for (let j = 0; j < h; j++) a.set(src.subarray(((y + j) * T.w + x) * 4, ((y + j) * T.w + x + w) * 4), j * w * 4); gl.texSubImage2D(gl.TEXTURE_2D, 0, x, y, w, h, gl.RGBA, gl.UNSIGNED_BYTE, a); };
    sub(ter.data, T.data); sub(ter.s0, T.splat0); sub(ter.s1, T.splat1);
  }
  function updateFog(buf) { if (!ter) return; gl.bindTexture(gl.TEXTURE_2D, ter.fog); gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, ter.w, ter.h, gl.RGBA, gl.UNSIGNED_BYTE, buf); }
  function freeTerrain() { if (!ter || !gl) return; for (const k of ['data', 's0', 's1', 'fog', 'det']) if (ter[k]) gl.deleteTexture(ter[k]); ter = null; }

  /* ---------- batching ---------- */
  
  function pack(r, g, b, a) { return ((a & 255) << 24 | (b & 255) << 16 | (g & 255) << 8 | (r & 255)) >>> 0; }
  function vert(f, u, o, x, y, uu, vv, l, c, s, col, team) { f[o] = x; f[o + 1] = y; f[o + 2] = uu; f[o + 3] = vv; f[o + 4] = l; f[o + 5] = c; f[o + 6] = s; u[o + 7] = col; u[o + 8] = team; }
  // s: sprite {u0,v0,u1,v1,l,w,h,ax,ay}
  function quad(b, s, x, y, rot, sx, sy, col, team, blend) {
    if (b.n >= b.max || !s) return;
    if (blend !== b.blend) { b.segs.push({ start: b.n, blend }); b.blend = blend; }
    const c = Math.cos(rot), sn = Math.sin(rot);
    const w = s.w * sx, h = s.h * sy, x0 = -s.ax * w, y0 = -s.ay * h, x1 = x0 + w, y1 = y0 + h;
    const f = b.f, u = b.u; let o = b.n * 4 * VF;
    vert(f, u, o, x + x0 * c - y0 * sn, y + x0 * sn + y0 * c, s.u0, s.v0, s.l, c, sn, col, team); o += VF;
    vert(f, u, o, x + x1 * c - y0 * sn, y + x1 * sn + y0 * c, s.u1, s.v0, s.l, c, sn, col, team); o += VF;
    vert(f, u, o, x + x1 * c - y1 * sn, y + x1 * sn + y1 * c, s.u1, s.v1, s.l, c, sn, col, team); o += VF;
    vert(f, u, o, x + x0 * c - y1 * sn, y + x0 * sn + y1 * c, s.u0, s.v1, s.l, c, sn, col, team);
    b.n++;
  }
  // axis-aligned sub-rect of a sprite (for progress reveals), fraction fx0..fx1, fy0..fy1
  function quadSub(b, s, x, y, rot, fx0, fy0, fx1, fy1, col, team, blend) {
    if (b.n >= b.max || !s) return;
    if (blend !== b.blend) { b.segs.push({ start: b.n, blend }); b.blend = blend; }
    const c = Math.cos(rot), sn = Math.sin(rot);
    const w = s.w, h = s.h; const x0 = -s.ax * w + fx0 * w, x1 = -s.ax * w + fx1 * w, y0 = -s.ay * h + fy0 * h, y1 = -s.ay * h + fy1 * h;
    const du = s.u1 - s.u0, dv = s.v1 - s.v0; const u0 = s.u0 + du * fx0, u1 = s.u0 + du * fx1, v0 = s.v0 + dv * fy0, v1 = s.v0 + dv * fy1;
    const f = b.f, u = b.u; let o = b.n * 4 * VF;
    vert(f, u, o, x + x0 * c - y0 * sn, y + x0 * sn + y0 * c, u0, v0, s.l, c, sn, col, team); o += VF;
    vert(f, u, o, x + x1 * c - y0 * sn, y + x1 * sn + y0 * c, u1, v0, s.l, c, sn, col, team); o += VF;
    vert(f, u, o, x + x1 * c - y1 * sn, y + x1 * sn + y1 * c, u1, v1, s.l, c, sn, col, team); o += VF;
    vert(f, u, o, x + x0 * c - y1 * sn, y + x0 * sn + y1 * c, u0, v1, s.l, c, sn, col, team);
    b.n++;
  }
  // Public draw helpers. flags: 1 lit, 2 recv shadow, 4 team, 8 solid
  const BL_ADD = 1;
  function spr(s, x, y, rot, sc, col, team, flags, blend) { quad(B.main, s, x, y, rot || 0, sc || 1, sc || 1, col === undefined ? 0xffffffff : col, ((flags === undefined ? 3 : flags) << 24 | (team || 0)) >>> 0, blend || 0); }
  function spr2(s, x, y, rot, sx, sy, col, team, flags, blend) { quad(B.main, s, x, y, rot || 0, sx, sy, col === undefined ? 0xffffffff : col, ((flags === undefined ? 3 : flags) << 24 | (team || 0)) >>> 0, blend || 0); }
  function sub(s, x, y, rot, fx0, fy0, fx1, fy1, col, team, flags) { quadSub(B.main, s, x, y, rot || 0, fx0, fy0, fx1, fy1, col === undefined ? 0xffffffff : col, ((flags === undefined ? 3 : flags) << 24 | (team || 0)) >>> 0, 0); }
  function over(s, x, y, rot, sx, sy, col, flags, blend) { quad(B.over, s, x, y, rot || 0, sx, sy, col === undefined ? 0xffffffff : col, ((flags === undefined ? 0 : flags) << 24) >>> 0, blend || 0); }
  function shadow(s, x, y, rot, sc, hgt, alpha) {
    if (R.lite) return; // weak-device mode: no drop shadows (halves the sprites drawn)
    const a = Math.round(clamp(alpha === undefined ? 1 : alpha, 0, 1) * 255);
    quad(B.shadow, s, x + SHD[0] * hgt, y + SHD[1] * hgt, rot || 0, sc || 1, sc || 1, (a << 24 | 0xffffff) >>> 0, 0, 0);
  }
  
  function light(s, x, y, radius, r, g, b, a) { // r,g,b 0..1 (scaled /4 in buffer)
    const k = clamp(a, 0, 1);
    const col = pack(clamp(r * 64 * k, 0, 255), clamp(g * 64 * k, 0, 255), clamp(b * 64 * k, 0, 255), 255);
    quad(B.light, s, x, y, 0, radius / (s.w * 0.5), radius / (s.h * 0.5), col, 0, 1);
  }
  function drawBatch(b, prog) {
    if (b.n === 0) return;
    gl.bindVertexArray(vao); gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, b.f, 0, b.n * 4 * VF);
    const segs = b.segs;
    for (let i = 0; i < segs.length; i++) {
      const sg = segs[i], end = i + 1 < segs.length ? segs[i + 1].start : b.n; if (end <= sg.start) continue;
      if (prog === progS) { if (sg.blend === BL_ADD) gl.blendFunc(gl.ONE, gl.ONE); else gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); }
      gl.drawElements(gl.TRIANGLES, (end - sg.start) * 6, gl.UNSIGNED_INT, sg.start * 24);
    }
    gl.bindVertexArray(null);
  }
  function resetBatch(b) { b.n = 0; b.segs.length = 0; b.blend = -1; }
  function setView(p, w, h) { const u = U[p]; gl.uniform4f(u.uView, cam.x, cam.y, w === undefined ? inv() : w, time); gl.uniform2f(u.uScr, W, H); }

  function render(gameTime) {
    time = gameTime || 0;
    if (!ok || !texAlb) { resetAll(); return; }
    const iv = inv();
    // 1) shadow mask
    gl.bindFramebuffer(gl.FRAMEBUFFER, fboShadow); gl.viewport(0, 0, fbW, fbH);
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND); gl.blendEquation(gl.MAX); gl.blendFunc(gl.ONE, gl.ONE);
    gl.useProgram(progShadow); setView('shd', iv * 1); bindAtlas(U.shd);
    // vertex shader computes clip from uScr; for half-res FBO keep same clip mapping (uScr = W,H)
    drawBatch(B.shadow, progShadow);
    // 2) lights
    gl.bindFramebuffer(gl.FRAMEBUFFER, fboLight); gl.viewport(0, 0, fbW, fbH);
    gl.clear(gl.COLOR_BUFFER_BIT); gl.blendEquation(gl.FUNC_ADD); gl.blendFunc(gl.ONE, gl.ONE);
    gl.useProgram(progLight); setView('lit', iv); bindAtlas(U.lit);
    drawBatch(B.light, progLight);
    // 3) terrain
    gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, W, H);
    gl.disable(gl.BLEND);
    if (ter) {
      gl.useProgram(progT); const u = U.ter;
      gl.uniform4f(u.uView, cam.x, cam.y, iv, time); gl.uniform2f(u.uScr, W, H); gl.uniform2f(u.uScrF, W, H);
      gl.uniform2f(u.uMap, ter.w, ter.h); gl.uniform3fv(u.uSun, SUN); gl.uniform3fv(u.uSunCol, env.sun); gl.uniform3fv(u.uAmb, env.amb);
      gl.uniform1f(u.uSea, ter.sea); if (u.uLava) gl.uniform1f(u.uLava, ter.lava || 0); gl.uniform1f(u.uShadowK, env.shadowK); gl.uniform1f(u.uTime, time); gl.uniform3fv(u.uFogCol, env.fogCol);
      gl.uniform1f(u.uFogOn, R.fogOn ? 1 : 0); gl.uniform4f(u.uGrid, R.grid || 0, 0, 0, 0); gl.uniform4fv(u.uGrade, env.grade);
      tex2(u.uData, 4, ter.data); tex2(u.uSplat0, 5, ter.s0); tex2(u.uSplat1, 6, ter.s1); tex2(u.uFog, 8, ter.fog);
      tex2(u.uShadow, 2, texShadow); tex2(u.uLight, 3, texLight);
      gl.activeTexture(gl.TEXTURE7); gl.bindTexture(gl.TEXTURE_2D_ARRAY, ter.det); gl.uniform1i(u.uDet, 7);
      gl.bindVertexArray(triVao); gl.drawArrays(gl.TRIANGLES, 0, 3); gl.bindVertexArray(null);
    } else { gl.clearColor(0.03, 0.035, 0.04, 1); gl.clear(gl.COLOR_BUFFER_BIT); }
    // 4) sprites
    gl.enable(gl.BLEND); gl.blendEquation(gl.FUNC_ADD);
    gl.useProgram(progS); const u = U.spr; setView('spr', iv);
    gl.uniform3fv(u.uSun, SUN); gl.uniform3fv(u.uSunCol, env.sun); gl.uniform3fv(u.uAmb, env.amb); gl.uniform1f(u.uShadowK, env.shadowK);
    gl.uniform2f(u.uScrF, W, H); gl.uniform4fv(u.uGrade, env.grade);
    bindAtlas(u); tex2(u.uShadow, 2, texShadow); tex2(u.uLight, 3, texLight);
    drawBatch(B.main, progS);
    drawBatch(B.over, progS);
    resetAll();
  }
  function tex2(loc, unit, t) { gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, t); gl.uniform1i(loc, unit); }
  function bindAtlas(u) {
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D_ARRAY, texAlb); if (u.uAlb) gl.uniform1i(u.uAlb, 0);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D_ARRAY, texMat); if (u.uMat) gl.uniform1i(u.uMat, 1);
  }
  function resetAll() { resetBatch(B.main); resetBatch(B.shadow); resetBatch(B.light); resetBatch(B.over); }

  // screen <-> world (css px)
  function s2w(sx, sy) { return [cam.x + (sx - cssW / 2) / cam.z, cam.y + (sy - cssH / 2) / cam.z]; }
  function w2s(wx, wy) { return [(wx - cam.x) * cam.z + cssW / 2, (wy - cam.y) * cam.z + cssH / 2]; }
  function viewRect(pad) { pad = pad || 0; const hw = cssW / 2 / cam.z + pad, hh = cssH / 2 / cam.z + pad; return [cam.x - hw, cam.y - hh, cam.x + hw, cam.y + hh]; }
  function info() { if (!gl) return {}; const d = gl.getExtension('WEBGL_debug_renderer_info'); return { renderer: d ? gl.getParameter(d.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER), maxTex: gl.getParameter(gl.MAX_TEXTURE_SIZE), layers: gl.getParameter(gl.MAX_ARRAY_TEXTURE_LAYERS) }; }

  return {
    init, resize, render, uploadAtlas, uploadTerrain, updateTerrainRegion, updateFog, freeTerrain,
    spr, spr2, sub, over, shadow,  light, pack, s2w, w2s, viewRect, info,
    cam, env,  SHD,  
    get ok() { return ok && !lost; }, get gl() { return gl; }, get W() { return W; }, 
    get cssW() { return cssW; }, get cssH() { return cssH; },  
    fogOn: true, grid: 0, onLost: null, onRestored: null,
  };
})();
