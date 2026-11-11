/*! War of Power — © 2026 محمد فادي سيف (Mohammad Fadi Saif) — سوريا (Syria). جميع الحقوق محفوظة للمالك فقط · All rights reserved to the owner only. Unauthorized copying, modification, redistribution or sale is prohibited. */
"use strict";const R=(function(){let e=null,b=null,ne=!1,q=!1,m=!1,D=1,y=1,K=1,O=1,Y=1,j=1;const E={x:0,y:0,z:1},M=[-.5,-.62,.62];{const t=Math.hypot(M[0],M[1],M[2]);M[0]/=t,M[1]/=t,M[2]/=t}const ae=[.78,.98],A={amb:[.36,.38,.43],sun:[1,.95,.85],shadowK:.6,grade:[1,.9,.035,0],night:0,fogCol:[.015,.018,.022]},s={gl2:!1,full:null,lite:!1,maxTex:2048,idx32:!0,minmax:!0},x={terrain:"full",sprite:"full",shadows:"fbo",lights:!0,lightDiv:2,mip:"tri"},_=9,Ge=2e4,Xe=16383;function ue(t){const r=new ArrayBuffer(t*4*_*4);return{ab:r,f:new Float32Array(r),u:new Uint32Array(r),n:0,max:t,segs:[],blend:-1,lay:-1,vbo:null,vao:null}}const g={main:ue(Ge),shadow:ue(6e3),light:ue(3e3),over:ue(4e3)};let pe,be,_e,Se,le={},we,De,ie,H=null,Ve=null,ye,$,Fe,Q,fe=1,ce=1,ve=1,se=1,Z=!0,J=!0,S=null,F=null,ee=0,l=null,te=null,me=null;const z={};let oe=0;const Ue=`#version 300 es
  layout(location=0) in vec2 aPos; layout(location=1) in vec3 aUV; layout(location=2) in vec2 aRot;
  layout(location=3) in vec4 aCol; layout(location=4) in vec4 aTeam;
  uniform vec4 uView; uniform vec2 uScr;
  out vec3 vUV; out vec4 vCol; out vec4 vTeam; out vec2 vRot;
  void main(){
    vec2 p = (aPos - uView.xy) / uView.z; // device px offset from center
    gl_Position = vec4(p.x / (uScr.x*0.5), -p.y / (uScr.y*0.5), 0.0, 1.0);
    vUV = aUV; vCol = aCol; vTeam = aTeam; vRot = aRot;
  }`,Oe=`
  uniform vec4 uGrade; uniform vec2 uScrF;
  vec3 grade(vec3 c, vec2 fc){
    c *= uGrade.x; c = c / (1.0 + c * 0.12);
    float l = dot(c, vec3(0.299,0.587,0.114)); c = mix(vec3(l), c, uGrade.y);
    c *= vec3(1.0 + uGrade.z, 1.0 + uGrade.z*0.3, 1.0 - uGrade.z);
    vec2 q = fc / uScrF - 0.5; c *= 1.0 - dot(q,q) * 0.42;
    return c;
  }`,it=`#version 300 es
  precision highp float; precision highp sampler2DArray;
  uniform sampler2DArray uAlb; uniform sampler2DArray uMat; uniform sampler2D uShadow; uniform sampler2D uLight;
  uniform vec3 uSun; uniform vec3 uSunCol; uniform vec3 uAmb; uniform float uShadowK;
  ${Oe}
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
  }`,ot=`#version 300 es
  precision highp float; precision highp sampler2DArray;
  uniform sampler2DArray uAlb; in vec3 vUV; in vec4 vCol; in vec4 vTeam; in vec2 vRot; out vec4 o;
  void main(){ float a = texture(uAlb, vUV).a * vCol.a; o = vec4(a, a, a, a); }`,ut=`#version 300 es
  precision highp float; precision highp sampler2DArray;
  uniform sampler2DArray uAlb; in vec3 vUV; in vec4 vCol; in vec4 vTeam; in vec2 vRot; out vec4 o;
  void main(){ float a = texture(uAlb, vUV).a; o = vec4(vCol.rgb * a * vCol.a, 1.0); }`,lt=`#version 300 es
  void main(){ vec2 p = vec2((gl_VertexID==1)?3.0:-1.0, (gl_VertexID==2)?3.0:-1.0); gl_Position = vec4(p,0.0,1.0); }`,ft=`#version 300 es
  precision highp float; precision highp sampler2DArray;
  uniform sampler2D uData; uniform sampler2D uSplat0; uniform sampler2D uSplat1; uniform sampler2D uFog;
  uniform sampler2D uShadow; uniform sampler2D uLight; uniform sampler2DArray uDet;
  uniform vec4 uView; uniform vec2 uScr; uniform vec2 uMap; uniform vec3 uSun; uniform vec3 uSunCol; uniform vec3 uAmb;
  uniform float uSea; uniform float uShadowK; uniform float uTime; uniform vec3 uFogCol; uniform float uFogOn; uniform vec4 uGrid; uniform float uLava;
  ${Oe}
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
  }`,de=()=>(m?`#version 300 es
#define attribute in
#define varying out
`:"")+`#define HP highp
`,Ee=t=>(m?`#version 300 es
`:"")+`#ifdef GL_FRAGMENT_PRECISION_HIGH
#define HP highp
#else
#define HP mediump
#endif
precision mediump float;
`+(m?`precision mediump sampler2DArray;
#define varying in
#define texture2D texture
out vec4 oCol;
#define gl_FragColor oCol
#define ATL sampler2DArray
#define atl(s,uv) texture(s,uv)
`:`#define ATL sampler2D
#define atl(s,uv) texture2D(s,(uv).xy)
`)+(t||[]).map(r=>"#define "+r+`
`).join(""),Le=`
  attribute vec2 aPos; attribute vec3 aUV; attribute vec2 aRot; attribute vec4 aCol; attribute vec4 aTeam;
  uniform vec4 uView; uniform vec2 uScr;
  varying HP vec3 vUV; varying HP vec2 vScr; varying vec4 vCol; varying vec3 vTeam; varying vec2 vRot; varying vec3 vF;
  void main(){
    vec2 p = (aPos - uView.xy) / uView.z;
    vec2 c = vec2(p.x / (uScr.x*0.5), -p.y / (uScr.y*0.5));
    gl_Position = vec4(c, 0.0, 1.0);
    vScr = c * 0.5 + 0.5; vUV = aUV; vCol = aCol; vTeam = aTeam.rgb; vRot = aRot;
    float f = floor(aTeam.a * 255.0 + 0.5); // draw flags: 1 lit · 2 receives shadow · 4 team colour · 8 solid colour
    float so = step(7.5, f); f -= so * 8.0; float tm = step(3.5, f); f -= tm * 4.0; f -= step(1.5, f) * 2.0;
    vF = vec3(step(0.5, f), tm, so);
  }`,Ye=`
  uniform ATL uAlb; uniform ATL uMat;
  #ifdef LIGHTS
  uniform sampler2D uLight;
  #endif
  uniform vec3 uSun; uniform vec3 uSunCol; uniform vec3 uAmb; uniform vec4 uGrade;
  varying HP vec3 vUV; varying HP vec2 vScr; varying vec4 vCol; varying vec3 vTeam; varying vec2 vRot; varying vec3 vF;
  void main(){
    vec4 a = atl(uAlb, vUV);
    vec4 m = atl(uMat, vUV);
    vec3 tint = a.rgb * vCol.rgb;
    float lum = dot(tint, vec3(0.3, 0.59, 0.11));
    vec3 alb = mix(tint, vTeam * (0.28 * a.a + lum * 1.25), m.b * vF.y);
    vec2 nx = m.rg * 2.0 - 1.0; nx = vec2(nx.x * vRot.x - nx.y * vRot.y, nx.x * vRot.y + nx.y * vRot.x);
    float nz = sqrt(max(0.0, 1.0 - dot(nx, nx)));
    float ndl = max(nx.x * uSun.x + nx.y * uSun.y + nz * uSun.z, 0.0);
    vec3 lt = uAmb + uSunCol * ndl + vec3(max(m.a - 0.5, 0.0) * 4.4);
  #ifdef LIGHTS
    lt += texture2D(uLight, vScr).rgb * 3.6;
  #endif
    vec3 c = alb * lt * uGrade.x; c = c / (1.0 + c * 0.12);
    float l = dot(c, vec3(0.299, 0.587, 0.114)); c = mix(vec3(l), c, uGrade.y);
    c *= vec3(1.0 + uGrade.z, 1.0 + uGrade.z * 0.3, 1.0 - uGrade.z);
    vec2 q = vScr - 0.5; c *= 1.0 - dot(q, q) * 0.42;
    vec3 col = mix(tint, c, vF.x);
    col = mix(col, vCol.rgb * a.a, vF.z);
    gl_FragColor = vec4(col, a.a) * vCol.a;
  }`,ct=`
  uniform ATL uAlb;
  varying HP vec3 vUV; varying HP vec2 vScr; varying vec4 vCol; varying vec3 vTeam; varying vec2 vRot; varying vec3 vF;
  void main(){ float a = atl(uAlb, vUV).a; gl_FragColor = vec4(vCol.rgb * a * vCol.a, 1.0); }`,vt=`
  attribute vec2 aPos;
  uniform vec4 uView; uniform vec2 uScr; uniform vec2 uMap; uniform vec3 uTile;
  varying HP vec2 vMuv; varying HP vec2 vDuv; varying HP vec2 vScr; varying HP vec2 vG;
  void main(){
    gl_Position = vec4(aPos, 0.0, 1.0);
    vScr = aPos * 0.5 + 0.5;
    vec2 wp = uView.xy + vec2(aPos.x, -aPos.y) * 0.5 * uScr * uView.z; // world position of this screen corner
    vMuv = wp / (32.0 * uMap);
    vDuv = (wp - uTile.xy) * uTile.z; // grain, measured from a tile near the camera so the numbers stay small
    vG = (wp - uTile.xy) / 32.0;
  }`,st=`
  uniform sampler2D uBase; uniform sampler2D uDetail; uniform sampler2D uFog;
  #ifdef SHADOWS
  uniform sampler2D uShadow; uniform float uShadowK;
  #endif
  #ifdef LIGHTS
  uniform sampler2D uLight;
  #endif
  uniform vec3 uFogCol; uniform vec4 uFx; // x fog on · y build grid · z light gain · w grain strength
  varying HP vec2 vMuv; varying HP vec2 vDuv; varying HP vec2 vScr; varying HP vec2 vG;
  void main(){
    vec4 b = texture2D(uBase, vMuv);
    vec3 col = b.rgb * (1.0 + (texture2D(uDetail, vDuv).g - 0.5) * uFx.w);
  #ifdef SHADOWS
    col *= 1.0 - b.a * texture2D(uShadow, vScr).r * uShadowK;
  #endif
  #ifdef LIGHTS
    col += b.rgb * texture2D(uLight, vScr).rgb * uFx.z;
  #endif
  #ifdef GRID
    vec2 gp = fract(vG); col = mix(col, vec3(0.9, 0.95, 1.0), min(step(gp.x, 0.04) + step(gp.y, 0.04), 1.0) * uFx.y * 0.22);
  #endif
    vec2 q = vScr - 0.5; col *= 1.0 - dot(q, q) * 0.42;
    vec4 fg = texture2D(uFog, vMuv);
    float vis = mix(1.0, smoothstep(0.05, 0.95, fg.r), uFx.x), ex = mix(1.0, smoothstep(0.1, 0.9, fg.g), uFx.x);
    col = mix(uFogCol, mix(col * vec3(0.38, 0.4, 0.46), col, vis), ex);
    float e = smoothstep(0.0, 0.012, min(min(vMuv.x, vMuv.y), min(1.0 - vMuv.x, 1.0 - vMuv.y)));
    gl_FragColor = vec4(mix(uFogCol, col, e), 1.0);
  }`;function He(t,r){const n=e.createShader(t);if(e.shaderSource(n,r),e.compileShader(n),!e.getShaderParameter(n,e.COMPILE_STATUS)){const a=e.getShaderInfoLog(n);throw e.deleteShader(n),new Error("shader: "+a)}return n}const mt=["aPos","aUV","aRot","aCol","aTeam"];function X(t,r,n){const a=e.createProgram(),o=He(e.VERTEX_SHADER,t),u=He(e.FRAGMENT_SHADER,r);if(e.attachShader(a,o),e.attachShader(a,u),mt.forEach((f,c)=>e.bindAttribLocation(a,c,f)),e.linkProgram(a),e.deleteShader(o),e.deleteShader(u),!e.getProgramParameter(a,e.LINK_STATUS)){const f=e.getProgramInfoLog(a);throw e.deleteProgram(a),new Error("link "+n+": "+f)}const i={},v=e.getProgramParameter(a,e.ACTIVE_UNIFORMS);for(let f=0;f<v;f++){const c=e.getActiveUniform(a,f);i[c.name.replace("[0]","")]=e.getUniformLocation(a,c.name)}return z[n]=i,a}function W(t){if(le[t]!==void 0)return le[t];let r=null;try{if(t==="lspr0")r=X(de()+Le,Ee()+Ye,t);else if(t==="lspr1")r=X(de()+Le,Ee(["LIGHTS"])+Ye,t);else if(t==="llit")r=X(de()+Le,Ee()+ct,t);else{const n=+t.slice(4),a=[];n&1&&a.push("LIGHTS"),n&2&&a.push("SHADOWS"),n&4&&a.push("GRID"),r=X(de()+vt,Ee(a)+st,t)}}catch(n){console.error(n),r=null}return le[t]=r,r}function C(t,r,n){n=n||{};const a=e.createTexture();e.bindTexture(e.TEXTURE_2D,a),e.texImage2D(e.TEXTURE_2D,0,m?e.RGBA8:e.RGBA,t,r,0,e.RGBA,e.UNSIGNED_BYTE,n.data||null);const o=n.nearest?e.NEAREST:e.LINEAR;let u=o;n.mip&&(e.generateMipmap(e.TEXTURE_2D),u=n.mip==="tri"?e.LINEAR_MIPMAP_LINEAR:e.LINEAR_MIPMAP_NEAREST),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,u),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,o);const i=n.repeat?e.REPEAT:e.CLAMP_TO_EDGE;return e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,i),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,i),a}function ze(t){const r=e.createFramebuffer();return e.bindFramebuffer(e.FRAMEBUFFER,r),e.framebufferTexture2D(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,t,0),e.bindFramebuffer(e.FRAMEBUFFER,null),r}function We(t){if(m){const r=e.createVertexArray();return e.bindVertexArray(r),t(),e.bindVertexArray(null),{bind:()=>e.bindVertexArray(r),unbind:()=>e.bindVertexArray(null)}}if(H){const r=H.createVertexArrayOES();return H.bindVertexArrayOES(r),t(),H.bindVertexArrayOES(null),{bind:()=>H.bindVertexArrayOES(r),unbind:()=>H.bindVertexArrayOES(null)}}return{bind:t,unbind:()=>{}}}function Pe(t){const r=_*4;e.vertexAttribPointer(0,2,e.FLOAT,!1,r,t),e.vertexAttribPointer(1,3,e.FLOAT,!1,r,t+8),e.vertexAttribPointer(2,2,e.FLOAT,!1,r,t+20),e.vertexAttribPointer(3,4,e.UNSIGNED_BYTE,!0,r,t+28),e.vertexAttribPointer(4,4,e.UNSIGNED_BYTE,!0,r,t+32)}function Me(){s.gl2=m,s.maxTex=e.getParameter(e.MAX_TEXTURE_SIZE)||2048,s.full=m?null:!1,le={},pe=be=_e=Se=null,H=m?null:e.getExtension("OES_vertex_array_object"),Ve=m?null:e.getExtension("EXT_blend_minmax"),s.minmax=m||!!Ve,s.idx32=m||!!e.getExtension("OES_element_index_uint"),R&&R.force16&&(s.idx32=!1);const t=s.idx32?Ge:Xe,r=s.idx32?new Uint32Array(t*6):new Uint16Array(t*6);for(let n=0,a=0;n<t;n++,a+=4){const o=n*6;r[o]=a,r[o+1]=a+1,r[o+2]=a+2,r[o+3]=a,r[o+4]=a+2,r[o+5]=a+3}we=e.createBuffer(),e.bindBuffer(e.ELEMENT_ARRAY_BUFFER,we),e.bufferData(e.ELEMENT_ARRAY_BUFFER,r,e.STATIC_DRAW),e.bindBuffer(e.ELEMENT_ARRAY_BUFFER,null);for(const n in g){const a=g[n];a.vbo=e.createBuffer(),e.bindBuffer(e.ARRAY_BUFFER,a.vbo),e.bufferData(e.ARRAY_BUFFER,1024,e.STREAM_DRAW),a.vao=We(()=>{e.bindBuffer(e.ARRAY_BUFFER,a.vbo),e.bindBuffer(e.ELEMENT_ARRAY_BUFFER,we);for(let o=0;o<5;o++)e.enableVertexAttribArray(o);Pe(0)})}if(De=e.createBuffer(),e.bindBuffer(e.ARRAY_BUFFER,De),e.bufferData(e.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),e.STATIC_DRAW),ie=We(()=>{e.bindBuffer(e.ARRAY_BUFFER,De),e.enableVertexAttribArray(0);for(let n=1;n<5;n++)e.disableVertexAttribArray(n);e.vertexAttribPointer(0,2,e.FLOAT,!1,8,0)}),$=C(4,4),ye=ze($),Q=C(4,4),Fe=ze(Q),Z=J=!0,S=F=null,ee=0,l=null,te=null,me&&Ke(me.data,me.size),e.disable(e.DEPTH_TEST),e.disable(e.CULL_FACE),e.pixelStorei(e.UNPACK_ALIGNMENT,1),s.lite=!!(W("lspr1")&&W("llit")&&W("lter1")),!s.lite&&!(m&&xe()))throw new Error("no usable shader pipeline")}function xe(){if(!m||!e)return!1;if(s.full!==null)return s.full;try{pe=X(Ue,it,"spr"),be=X(Ue,ot,"shd"),Se=X(Ue,ut,"lit"),_e=X(lt,ft,"ter"),s.full=!0}catch(t){console.error(t),s.full=!1}return s.full}const dt={antialias:!1,alpha:!1,depth:!1,stencil:!1,premultipliedAlpha:!0,preserveDrawingBuffer:!1,powerPreference:"high-performance",desynchronized:!0};function Ce(t,r){try{return t.getContext(r,dt)}catch(n){return null}}function Et(){b.addEventListener("webglcontextlost",t=>{t.preventDefault(),q=!0,ne=!1,S=F=null,l=null,R.onLost&&R.onLost()},!1),b.addEventListener("webglcontextrestored",()=>{try{q=!1,Me(),ne=!0,Ne(O,Y,K,j),R.onRestored&&R.onRestored()}catch(t){console.error(t)}},!1)}function xt(t,r){if(r=r||{},b=t,e=null,m=!1,r.gl1||(e=Ce(b,"webgl2"),m=!!e),e)try{Me()}catch(n){console.error(n),e=null,m=!1;try{const a=b.cloneNode(!1);b.parentNode.replaceChild(a,b),b=a}catch(a){}}if(!e){if(e=Ce(b,"webgl")||Ce(b,"experimental-webgl"),m=!1,!e)return!1;try{Me()}catch(n){return console.error(n),e=null,!1}}return Et(),ne=!0,!0}function Ne(t,r,n,a){O=t,Y=r,K=n,j=a||1;const o=Math.max(256,s.maxTex||2048);if(D=clamp(Math.round(t*K*j),1,o),y=clamp(Math.round(r*K*j),1,o),b.width=D,b.height=y,!e||q)return;fe=Math.max(1,D>>1),ce=Math.max(1,y>>1);const u=x.lightDiv>=4?2:1;ve=Math.max(1,D>>u),se=Math.max(1,y>>u);const i=m?e.RGBA8:e.RGBA;e.bindTexture(e.TEXTURE_2D,$),e.texImage2D(e.TEXTURE_2D,0,i,fe,ce,0,e.RGBA,e.UNSIGNED_BYTE,null),e.bindTexture(e.TEXTURE_2D,Q),e.texImage2D(e.TEXTURE_2D,0,i,ve,se,0,e.RGBA,e.UNSIGNED_BYTE,null),Z=J=!0}const ke=()=>1/(E.z*K*j);function gt(t){t=t||{};const r=m&&(t.terrain==="full"||t.sprite==="full"||t.shadows==="fbo")?xe():!1,n=x.lightDiv;return x.terrain=t.terrain==="full"&&r?"full":s.lite?"baked":"full",x.sprite=t.sprite==="full"&&r?"full":s.lite?"lite":"full",x.shadows=t.shadows==="fbo"?r&&x.sprite==="full"?"fbo":"direct":t.shadows==="direct"?"direct":"off",x.lights=t.lights!==!1,x.lightDiv=t.lightDiv>=4?4:2,x.mip=t.mip==="bi"?"bi":"tri",!s.lite&&m&&(xe(),x.terrain="full",x.sprite="full"),Z=J=!1,n!==x.lightDiv&&e&&!q&&Ne(O,Y,K,j),x}function Rt(){if(e){if(Array.isArray(S)){for(const t of S)e.deleteTexture(t);for(const t of F)e.deleteTexture(t)}else S&&(e.deleteTexture(S),e.deleteTexture(F));S=F=null,ee=0}}function Tt(t,r,n){Rt(),ee=t.length;const a=x.mip!=="bi";if(!m){const v=f=>C(n,n,{data:f,mip:a?"tri":"bi"});S=t.map(v),F=r.map(v);return}const o=4,u=a?e.LINEAR_MIPMAP_LINEAR:e.LINEAR_MIPMAP_NEAREST,i=v=>{const f=e.createTexture();e.bindTexture(e.TEXTURE_2D_ARRAY,f),e.texStorage3D(e.TEXTURE_2D_ARRAY,o,e.RGBA8,n,n,ee);for(let c=0;c<ee;c++)e.texSubImage3D(e.TEXTURE_2D_ARRAY,0,0,0,c,n,n,1,e.RGBA,e.UNSIGNED_BYTE,v[c]);return e.generateMipmap(e.TEXTURE_2D_ARRAY),e.texParameteri(e.TEXTURE_2D_ARRAY,e.TEXTURE_MIN_FILTER,u),e.texParameteri(e.TEXTURE_2D_ARRAY,e.TEXTURE_MAG_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D_ARRAY,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D_ARRAY,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE),f};S=i(t),F=i(r)}function At(t){if(je(),l={w:t.w,h:t.h,sea:t.sea,lava:t.lava?1:0},l.fog=C(t.w,t.h,{data:t.fog||null}),t.base&&qe(t.base),!m||!t.det||!s.full)return;l.data=C(t.w,t.h,{data:t.data}),l.s0=C(t.w,t.h,{data:t.splat0}),l.s1=C(t.w,t.h,{data:t.splat1});const r=t.detSize,n=t.det.length;l.det=e.createTexture(),e.bindTexture(e.TEXTURE_2D_ARRAY,l.det);const a=Math.floor(Math.log2(r))+1;e.texStorage3D(e.TEXTURE_2D_ARRAY,a,e.RGBA8,r,r,n);for(let u=0;u<n;u++)e.texSubImage3D(e.TEXTURE_2D_ARRAY,0,0,0,u,r,r,1,e.RGBA,e.UNSIGNED_BYTE,t.det[u]);e.generateMipmap(e.TEXTURE_2D_ARRAY),e.texParameteri(e.TEXTURE_2D_ARRAY,e.TEXTURE_MIN_FILTER,e.LINEAR_MIPMAP_LINEAR),e.texParameteri(e.TEXTURE_2D_ARRAY,e.TEXTURE_MAG_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D_ARRAY,e.TEXTURE_WRAP_S,e.REPEAT),e.texParameteri(e.TEXTURE_2D_ARRAY,e.TEXTURE_WRAP_T,e.REPEAT);const o=e.getExtension("EXT_texture_filter_anisotropic");o&&e.texParameterf(e.TEXTURE_2D_ARRAY,o.TEXTURE_MAX_ANISOTROPY_EXT,4)}function qe(t){!l||!e||(l.base&&e.deleteTexture(l.base),l.base=C(t.w,t.h,{data:t.data}),l.bk=t.k)}function ht(t,r,n,a,o){!l||!l.base||(e.bindTexture(e.TEXTURE_2D,l.base),e.texSubImage2D(e.TEXTURE_2D,0,t,r,n,a,e.RGBA,e.UNSIGNED_BYTE,o))}function Ke(t,r){me={data:t,size:r},!(!e||q)&&(te&&e.deleteTexture(te),te=C(r,r,{data:t,repeat:!0,mip:"bi"}))}function pt(t,r,n,a,o){if(!l||!l.data)return;const u=(i,v)=>{e.bindTexture(e.TEXTURE_2D,i);const f=new Uint8Array(a*o*4);for(let c=0;c<o;c++)f.set(v.subarray(((n+c)*t.w+r)*4,((n+c)*t.w+r+a)*4),c*a*4);e.texSubImage2D(e.TEXTURE_2D,0,r,n,a,o,e.RGBA,e.UNSIGNED_BYTE,f)};u(l.data,t.data),u(l.s0,t.splat0),u(l.s1,t.splat1)}function bt(t){l&&(e.bindTexture(e.TEXTURE_2D,l.fog),e.texSubImage2D(e.TEXTURE_2D,0,0,0,l.w,l.h,e.RGBA,e.UNSIGNED_BYTE,t))}function je(){if(!(!l||!e)){for(const t of["data","s0","s1","fog","det","base"])l[t]&&e.deleteTexture(l[t]);l=null}}function $e(t,r,n,a){return((a&255)<<24|(n&255)<<16|(r&255)<<8|t&255)>>>0}function V(t,r,n,a,o,u,i,v,f,c,d,T){t[n]=a,t[n+1]=o,t[n+2]=u,t[n+3]=i,t[n+4]=v,t[n+5]=f,t[n+6]=c,r[n+7]=d,r[n+8]=T}function Qe(t,r,n){(n!==t.blend||!m&&r.l!==t.lay)&&(t.segs.push({start:t.n,blend:n,l:r.l}),t.blend=n,t.lay=r.l)}function re(t,r,n,a,o,u,i,v,f,c){if(t.n>=t.max||!r)return;Qe(t,r,c);const d=Math.cos(o),T=Math.sin(o),h=r.w*u,p=r.h*i,U=-r.ax*h,L=-r.ay*p,N=U+h,I=L+p,B=t.f,G=t.u;let P=t.n*4*_;V(B,G,P,n+U*d-L*T,a+U*T+L*d,r.u0,r.v0,r.l,d,T,v,f),P+=_,V(B,G,P,n+N*d-L*T,a+N*T+L*d,r.u1,r.v0,r.l,d,T,v,f),P+=_,V(B,G,P,n+N*d-I*T,a+N*T+I*d,r.u1,r.v1,r.l,d,T,v,f),P+=_,V(B,G,P,n+U*d-I*T,a+U*T+I*d,r.u0,r.v1,r.l,d,T,v,f),t.n++}function _t(t,r,n,a,o,u,i,v,f,c,d,T){if(t.n>=t.max||!r)return;Qe(t,r,T);const h=Math.cos(o),p=Math.sin(o),U=r.w,L=r.h,N=-r.ax*U+u*U,I=-r.ax*U+v*U,B=-r.ay*L+i*L,G=-r.ay*L+f*L,P=r.u1-r.u0,et=r.v1-r.v0,tt=r.u0+P*u,rt=r.u0+P*v,nt=r.v0+et*i,at=r.v0+et*f,Ae=t.f,he=t.u;let k=t.n*4*_;V(Ae,he,k,n+N*h-B*p,a+N*p+B*h,tt,nt,r.l,h,p,c,d),k+=_,V(Ae,he,k,n+I*h-B*p,a+I*p+B*h,rt,nt,r.l,h,p,c,d),k+=_,V(Ae,he,k,n+I*h-G*p,a+I*p+G*h,rt,at,r.l,h,p,c,d),k+=_,V(Ae,he,k,n+N*h-G*p,a+N*p+G*h,tt,at,r.l,h,p,c,d),t.n++}const St=1;function wt(t,r,n,a,o,u,i,v,f){re(g.main,t,r,n,a||0,o||1,o||1,u===void 0?4294967295:u,((v===void 0?3:v)<<24|(i||0))>>>0,f||0)}function Dt(t,r,n,a,o,u,i,v,f,c){re(g.main,t,r,n,a||0,o,u,i===void 0?4294967295:i,((f===void 0?3:f)<<24|(v||0))>>>0,c||0)}function yt(t,r,n,a,o,u,i,v,f,c,d){_t(g.main,t,r,n,a||0,o,u,i,v,f===void 0?4294967295:f,((d===void 0?3:d)<<24|(c||0))>>>0,0)}function Ft(t,r,n,a,o,u,i,v,f){re(g.over,t,r,n,a||0,o,u,i===void 0?4294967295:i,(v===void 0?0:v)<<24>>>0,f||0)}function Ut(t,r,n,a,o,u,i){const v=x.shadows;if(v==="off")return;const f=clamp(i===void 0?1:i,0,1);if(v==="fbo"){re(g.shadow,t,r+ae[0]*u,n+ae[1]*u,a||0,o||1,o||1,(Math.round(f*255)<<24|16777215)>>>0,0,0);return}re(g.main,t,r+ae[0]*u,n+ae[1]*u,a||0,o||1,o||1,Math.round(f*A.shadowK*178)<<24>>>0,134217728,0)}function Lt(t,r,n,a,o,u,i,v){if(!x.lights)return;const f=clamp(v,0,1),c=$e(clamp(o*64*f,0,255),clamp(u*64*f,0,255),clamp(i*64*f,0,255),255);re(g.light,t,r,n,0,a/(t.w*.5),a/(t.h*.5),c,0,1)}function ge(t,r){if(t.n===0)return;e.bindBuffer(e.ARRAY_BUFFER,t.vbo),m?e.bufferData(e.ARRAY_BUFFER,t.f,e.STREAM_DRAW,0,t.n*4*_):e.bufferData(e.ARRAY_BUFFER,t.f.subarray(0,t.n*4*_),e.STREAM_DRAW),t.vao.bind();const n=t.segs;let a=-1;for(let o=0;o<n.length;o++){const u=n[o],i=o+1<n.length?n[o+1].start:t.n;if(!(i<=u.start))if(r===0&&(u.blend===St?e.blendFunc(e.ONE,e.ONE):e.blendFunc(e.ONE,e.ONE_MINUS_SRC_ALPHA)),!m&&u.l!==a&&(a=u.l,e.activeTexture(e.TEXTURE0),e.bindTexture(e.TEXTURE_2D,S[a]||S[0]),e.activeTexture(e.TEXTURE1),e.bindTexture(e.TEXTURE_2D,F[a]||F[0])),s.idx32)e.drawElements(e.TRIANGLES,(i-u.start)*6,e.UNSIGNED_INT,u.start*24);else for(let v=u.start,f=i-u.start;f>0;){const c=Math.min(f,Xe);Pe(v*4*_*4),e.drawElements(e.TRIANGLES,c*6,e.UNSIGNED_SHORT,0),v+=c,f-=c}}s.idx32||Pe(0),t.vao.unbind()}function Re(t){t.n=0,t.segs.length=0,t.blend=-1,t.lay=-1}function Ie(t,r){const n=z[t];e.uniform4f(n.uView,E.x,E.y,r===void 0?ke():r,oe),e.uniform2f(n.uScr,D,y)}function Te(t,r,n){e.bindFramebuffer(e.FRAMEBUFFER,t),e.viewport(0,0,r,n),e.clearColor(0,0,0,0),e.clear(e.COLOR_BUFFER_BIT)}const Ze=t=>t[0]*.299+t[1]*.587+t[2]*.114;function Pt(t){if(oe=t||0,!ne||!S){Je();return}const r=ke(),n=x.sprite==="full"&&s.full===!0,a=s.full===!0&&l&&l.det&&(x.terrain==="full"||!l.base);if(e.enable(e.BLEND),x.shadows==="fbo"&&s.full===!0?(Te(ye,fe,ce),Z=g.shadow.n===0,e.blendEquation(e.MAX),e.blendFunc(e.ONE,e.ONE),e.useProgram(be),Ie("shd",r),Be(z.shd),ge(g.shadow,1)):Z||(Te(ye,fe,ce),Z=!0),x.lights){Te(Fe,ve,se),J=g.light.n===0,e.blendEquation(e.FUNC_ADD),e.blendFunc(e.ONE,e.ONE);const i=s.full===!0?Se:W("llit"),v=s.full===!0?"lit":"llit";i&&(e.useProgram(i),Ie(v,r),Be(z[v]),ge(g.light,1))}else J||(Te(Fe,ve,se),J=!0);if(e.bindFramebuffer(e.FRAMEBUFFER,null),e.viewport(0,0,D,y),e.blendEquation(e.FUNC_ADD),e.disable(e.BLEND),l&&a){e.useProgram(_e);const i=z.ter;e.uniform4f(i.uView,E.x,E.y,r,oe),e.uniform2f(i.uScr,D,y),e.uniform2f(i.uScrF,D,y),e.uniform2f(i.uMap,l.w,l.h),e.uniform3fv(i.uSun,M),e.uniform3fv(i.uSunCol,A.sun),e.uniform3fv(i.uAmb,A.amb),e.uniform1f(i.uSea,l.sea),i.uLava&&e.uniform1f(i.uLava,l.lava||0),e.uniform1f(i.uShadowK,A.shadowK),e.uniform1f(i.uTime,oe),e.uniform3fv(i.uFogCol,A.fogCol),e.uniform1f(i.uFogOn,R.fogOn?1:0),e.uniform4f(i.uGrid,R.grid||0,0,0,0),e.uniform4fv(i.uGrade,A.grade),w(i.uData,4,l.data),w(i.uSplat0,5,l.s0),w(i.uSplat1,6,l.s1),w(i.uFog,8,l.fog),w(i.uShadow,2,$),w(i.uLight,3,Q),e.activeTexture(e.TEXTURE7),e.bindTexture(e.TEXTURE_2D_ARRAY,l.det),e.uniform1i(i.uDet,7),ie.bind(),e.drawArrays(e.TRIANGLES,0,3),ie.unbind()}else if(l&&l.base&&te){const i=x.shadows==="fbo"&&s.full===!0;let v=(x.lights?1:0)|(i?2:0)|(R.grid?4:0),f=W("lter"+v);if(f||(v&=1,f=W("lter"+v)),f){e.useProgram(f);const c=z["lter"+v],d=128;e.uniform4f(c.uView,E.x,E.y,r,oe),e.uniform2f(c.uScr,D,y),e.uniform2f(c.uMap,l.w,l.h),e.uniform3f(c.uTile,Math.floor(E.x/d)*d,Math.floor(E.y/d)*d,1/d),e.uniform3fv(c.uFogCol,A.fogCol),e.uniform4f(c.uFx,R.fogOn?1:0,R.grid||0,4/Math.max(.2,Ze(A.amb)+.75*Ze(A.sun)),.5),w(c.uBase,4,l.base),w(c.uDetail,5,te),w(c.uFog,6,l.fog),c.uShadow&&(w(c.uShadow,2,$),e.uniform1f(c.uShadowK,A.shadowK)),c.uLight&&w(c.uLight,3,Q),ie.bind(),e.drawArrays(e.TRIANGLES,0,3),ie.unbind()}else e.clearColor(.2,.22,.16,1),e.clear(e.COLOR_BUFFER_BIT)}else e.clearColor(.03,.035,.04,1),e.clear(e.COLOR_BUFFER_BIT);e.enable(e.BLEND),e.blendEquation(e.FUNC_ADD);const o=n?"spr":x.lights?"lspr1":"lspr0",u=n?pe:W(o);if(u){e.useProgram(u);const i=z[o];Ie(o,r),e.uniform3fv(i.uSun,M),e.uniform3fv(i.uSunCol,A.sun),e.uniform3fv(i.uAmb,A.amb),e.uniform4fv(i.uGrade,A.grade),n&&(e.uniform1f(i.uShadowK,A.shadowK),e.uniform2f(i.uScrF,D,y)),Be(i),i.uShadow&&w(i.uShadow,2,$),i.uLight&&w(i.uLight,3,Q),ge(g.main,0),ge(g.over,0)}Je()}function w(t,r,n){e.activeTexture(e.TEXTURE0+r),e.bindTexture(e.TEXTURE_2D,n),e.uniform1i(t,r)}function Be(t){t.uAlb&&e.uniform1i(t.uAlb,0),t.uMat&&e.uniform1i(t.uMat,1),m&&(e.activeTexture(e.TEXTURE0),e.bindTexture(e.TEXTURE_2D_ARRAY,S),e.activeTexture(e.TEXTURE1),e.bindTexture(e.TEXTURE_2D_ARRAY,F))}function Je(){Re(g.main),Re(g.shadow),Re(g.light),Re(g.over)}function Mt(t,r){return[E.x+(t-O/2)/E.z,E.y+(r-Y/2)/E.z]}function Ct(t,r){return[(t-E.x)*E.z+O/2,(r-E.y)*E.z+Y/2]}function Nt(t){t=t||0;const r=O/2/E.z+t,n=Y/2/E.z+t;return[E.x-r,E.y-n,E.x+r,E.y+n]}function It(){if(!e)return{};let t=null;try{t=e.getExtension("WEBGL_debug_renderer_info")}catch(r){}return{renderer:t?e.getParameter(t.UNMASKED_RENDERER_WEBGL):e.getParameter(e.RENDERER),maxTex:s.maxTex,layers:m?e.getParameter(e.MAX_ARRAY_TEXTURE_LAYERS):0,gl2:m}}return{init:xt,resize:Ne,render:Pt,uploadAtlas:Tt,uploadTerrain:At,updateTerrainRegion:pt,updateFog:bt,freeTerrain:je,setFx:gt,ensureFull:xe,setBase:qe,updateBase:ht,setDetail:Ke,spr:wt,spr2:Dt,sub:yt,over:Ft,shadow:Ut,light:Lt,pack:$e,s2w:Mt,w2s:Ct,viewRect:Nt,info:It,cam:E,env:A,SHD:ae,SUN:M,caps:s,fx:x,get ok(){return ne&&!q},get gl(){return e},get W(){return D},get H(){return y},get canvas(){return b},get cssW(){return O},get cssH(){return Y},get hasBase(){return!!(l&&l.base)},get baseK(){return l&&l.bk||0},get pages(){return ee},fogOn:!0,grid:0,lite:!1,force16:!1,onLost:null,onRestored:null}})();
