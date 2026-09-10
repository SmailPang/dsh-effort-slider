// ============================================================================
// dsh-effort-slider — browser widget v2: IN-PLACE effort pane replacement
// ----------------------------------------------------------------------------
// 不再使用左下角浮动药丸。本脚本监视“模型座位”弹层：当原生「推理等级 / Effort」
// 面板打开时，隐藏原生的 Default/Off/Low/High/Max 单选行，并在同一位置渲染一颗
// 参考 claude-range-slider EffortCard 的美丽滑块卡片。
//
// 关键设计：拖动滑块选择档位后，仍点击原生选项、走官方 selectModel 链路，
// 但仅抑制 chooseEffort() 成功结算时的 close UI 副作用。返回按钮通过 DSH
// 自己的键盘状态机把 effort pane 切回 root pane。
//
// 由宿主插件注入（defer），无依赖、无打包。
// ============================================================================
(function () {
  // Re-inject safe: only one live instance per document. If a full-body remount
  // destroys our nodes, the newest injected copy supersedes older ones via the
  // token below (stale copies go dormant instead of double-mounting sliders).
  if (window.__dshEffortSliderV2 && document.querySelector('[data-dse-slot]')) return
  window.__dshEffortSliderV2 = true
  var TOKEN = {}
  window.__dshEffortSliderToken = TOKEN

  var STATE_URL = '/dsh-effort-slider/state.json'

  /* ---------- tiny helpers ---------- */
  function el(tag, className, html) {
    var node = document.createElement(tag)
    if (className) node.className = className
    if (html != null) node.innerHTML = html
    return node
  }
  function clamp(v, lo, hi) {
    return v < lo ? lo : v > hi ? hi : v
  }
  function text(n) {
    return (n && (n.textContent || '').trim()) || ''
  }
  function rowLabel(btn) {
    if (!btn) return ''
    // native row: <button role=menuitemradio><span><span>Label</span></span><span check></span></button>
    var nameEl = btn.querySelector ? btn.querySelector('span span') : null
    var t = text(nameEl)
    if (t) return t
    var aria = btn.getAttribute && btn.getAttribute('aria-label')
    if (aria && aria.trim()) return aria.trim()
    // last inner span is the label in most DOM shapes
    var spans = btn.querySelectorAll ? btn.querySelectorAll('span') : null
    if (spans && spans.length) {
      for (var i = spans.length - 1; i >= 0; i--) {
        var s = text(spans[i])
        if (s) return s
      }
    }
    return text(btn)
  }
  var EFFORT_ORDER = { off: 0, low: 1, high: 2, max: 3 }
  function effortId(btn) {
    var label = rowLabel(btn).replace(/[^A-Za-z]/g, '').toLowerCase()
    return Object.prototype.hasOwnProperty.call(EFFORT_ORDER, label) ? label : null
  }

  /* ======================================================================
   * CSS (namespaced, sized to sit inside the model-seat popover)
   * ====================================================================== */
  var CSS = [
    '[data-dse-slot]{box-sizing:border-box;width:100%;min-width:300px;padding:4px;user-select:none;color:var(--dsw-alias-label-primary);font-family:inherit}',
    '[data-dse-slot] *{box-sizing:border-box}',
    '.dse-nav{display:flex;align-items:center;justify-content:space-between;height:36px}',
    '.dse-nav .dse-f-btn{height:32px;border:none;background:transparent;color:var(--dsw-alias-label-primary);cursor:pointer;padding:0 8px;font:inherit;font-size:13px;font-weight:500;border-radius:8px}',
    '.dse-nav .dse-f-btn:hover,.dse-nav .dse-f-btn:focus-visible{background:var(--dsw-alias-interactive-bg-hover);outline:none}',
    '.dse-h{display:flex;align-items:center;justify-content:space-between;gap:8px;height:34px;padding:0 10px;perspective:280px;perspective-origin:center 120%}',
    '.dse-h-label{color:var(--dsw-alias-label-primary);font-weight:500;font-size:14px;line-height:22px}',
    '.dse-h-status{display:inline-block;color:var(--dsw-alias-label-tertiary);font-weight:500;font-size:14px;line-height:22px;will-change:transform,opacity,filter;transform-origin:center bottom;transition:color .3s,text-shadow .3s}',
    '.dse-h-status.dse-glowing{color:#3964FE;text-shadow:0 0 8px rgba(57,100,254,.22);font-weight:600}',
    '.dse-h-status.dse-low-glow,.dse-h-status.dse-mid-glow{color:var(--dsw-alias-label-tertiary);text-shadow:none}',
    '.dse-h-status.dse-default{color:var(--dsw-alias-label-tertiary)}',
    '@keyframes dseFlipUp{0%{opacity:0;transform:translateY(14px) rotateX(-80deg);filter:blur(4px)}100%{opacity:1;transform:translateY(0) rotateX(0deg);filter:blur(0)}}',
    '.dse-h-status.dse-animate{animation:dseFlipUp .42s cubic-bezier(.33,1,.68,1) forwards}',
    '.dse-scale{display:flex;justify-content:space-between;font-size:11px;font-weight:400;color:var(--dsw-alias-label-tertiary);margin:0 10px 4px}',
    '.dse-track{position:relative;height:32px;margin:0 8px;border-radius:10px;overflow:hidden;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-module-platform);isolation:isolate;box-shadow:inset 0 1px 2px rgba(0,0,0,.06)}',
    '.dse-track-bg{position:absolute;inset:0;background:var(--dsw-alias-bg-module-platform);z-index:0}',
    '.dse-canvas{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;opacity:0;mix-blend-mode:normal;z-index:2;transition:opacity .35s ease}',
    '.dse-track.dse-ultra .dse-canvas{opacity:1;z-index:4}',
    'body:not([data-ds-dark-theme]) .dse-track.dse-ultra .dse-canvas{filter:none}',
    '.dse-dots{position:absolute;inset:0;pointer-events:none;z-index:1}',
    '.dse-dot{position:absolute;width:3.5px;height:3.5px;border-radius:50%;background:#484854;top:50%;transform:translate(-50%,-50%);transition:opacity .4s ease,background .4s ease}',
    '.dse-track.dse-ultra .dse-dot{opacity:.2}',
    '.dse-dot.dse-dot-on{background:#9a9aae}',
    '.dse-dot.dse-dot-on.dse-dot-ultra{background:#b9aaff;box-shadow:0 0 6px rgba(150,125,255,.8)}',
    '.dse-track.dse-ultra .dse-dot.dse-dot-ultra{opacity:.55}',
    '.dse-levels{display:flex;justify-content:space-between;margin:5px 10px 4px;font-size:11px;font-weight:400;color:var(--dsw-alias-label-tertiary)}',
    '.dse-levels span{transition:color .2s ease,text-shadow .2s ease}',
    '.dse-levels span.dse-on{color:var(--dsw-alias-label-primary)}',
    '.dse-levels span.dse-on.dse-a-low,.dse-levels span.dse-on.dse-a-mid{color:var(--dsw-alias-label-primary);text-shadow:none;font-weight:600}',
    '.dse-levels span.dse-on.dse-a-max{color:#3964FE;text-shadow:0 0 7px rgba(57,100,254,.2);font-weight:600}',
    '[data-dse-slot] input[type=range]{position:absolute;inset:0;width:100%;height:100%;background:transparent;-webkit-appearance:none;appearance:none;cursor:pointer;z-index:5;outline:none;margin:0;padding:0}',
    '[data-dse-slot] input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:29px;height:29px;border-radius:10px;background:var(--dsw-specific-menu);border:1px solid var(--dsw-alias-border-l2);box-shadow:0 1px 4px rgba(0,0,0,.2);cursor:grab;transition:box-shadow .2s ease,transform .12s ease}',
    'body[data-ds-dark-theme] [data-dse-slot] input[type=range]::-webkit-slider-thumb{background:#f4f6ff;border:1px solid rgba(255,255,255,.82);box-shadow:0 1px 4px rgba(0,0,0,.55),0 0 0 1px rgba(57,100,254,.5),0 0 9px rgba(57,100,254,.32)}',
    '[data-dse-slot] input[type=range]::-webkit-slider-thumb:active{cursor:grabbing;transform:scale(.93)}',
    '[data-dse-slot].dse-ultra input[type=range]::-webkit-slider-thumb{box-shadow:0 1px 3px rgba(0,0,0,.18),0 0 10px rgba(57,100,254,.52),0 0 22px rgba(57,100,254,.22)}',
    'body[data-ds-dark-theme] [data-dse-slot].dse-ultra input[type=range]::-webkit-slider-thumb{background:#fff;border-color:#fff;box-shadow:0 1px 4px rgba(0,0,0,.58),0 0 0 1px rgba(57,100,254,.78),0 0 12px rgba(57,100,254,.7),0 0 24px rgba(57,100,254,.34)}',
    '[data-dse-slot] input[type=range]::-moz-range-thumb{width:29px;height:29px;border-radius:10px;background:linear-gradient(170deg,#ffffff 0%,#f2f2f6 42%,#e4e4ea 100%);border:1px solid rgba(0,0,0,.12);box-shadow:0 1px 4px rgba(0,0,0,.2);cursor:grab}',
    'body[data-ds-dark-theme] [data-dse-slot] input[type=range]::-moz-range-thumb{background:#f4f6ff;border:1px solid rgba(255,255,255,.82);box-shadow:0 1px 4px rgba(0,0,0,.55),0 0 0 1px rgba(57,100,254,.5),0 0 9px rgba(57,100,254,.32)}',
    '[data-dse-slot].dse-ultra input[type=range]::-moz-range-thumb{box-shadow:0 1px 3px rgba(0,0,0,.18),0 0 10px rgba(57,100,254,.52),0 0 22px rgba(57,100,254,.22)}',
    'body[data-ds-dark-theme] [data-dse-slot].dse-ultra input[type=range]::-moz-range-thumb{background:#fff;border-color:#fff;box-shadow:0 1px 4px rgba(0,0,0,.58),0 0 0 1px rgba(57,100,254,.78),0 0 12px rgba(57,100,254,.7),0 0 24px rgba(57,100,254,.34)}',
    '[data-dse-slot] input[type=range]::-moz-range-track{background:transparent;border:none;height:22px}',
    '[data-dse-slot] input[type=range]:focus-visible{outline:1px solid rgba(120,130,255,.6);outline-offset:2px;border-radius:9px}',
    '.dse-foot{display:none;align-items:center;padding:3px 10px 5px;font-size:11px;color:var(--dsw-alias-label-tertiary)}',
    '.dse-foot .dse-f-err{color:#f0716b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.dse-foot .dse-f-busy{color:#8ea6ff}',
    '.dse-actions{display:flex;align-items:center;gap:2px}',
    /* ultra aura fallback when WebGL unavailable */
    '[data-dse-slot].dse-ultra .dse-track::after{content:"";position:absolute;inset:-1px;border-radius:9px;pointer-events:none;z-index:3;background:radial-gradient(120% 220% at 100% 50%,rgba(120,100,255,.16),transparent 55%);opacity:1}',
    'body:not([data-ds-dark-theme]) [data-dse-slot].dse-ultra .dse-track::after{background:radial-gradient(105% 220% at 100% 50%,rgba(57,100,254,.12),rgba(57,100,254,.035) 42%,transparent 68%)}',
  ].join('\n')
  if (!document.querySelector('style[data-plugin-css="dse-effort-slider-v2"]')) {
    var styleTag = document.createElement('style')
    styleTag.setAttribute('data-plugin-css', 'dse-effort-slider-v2')
    styleTag.textContent = CSS
    document.head.appendChild(styleTag)
  }

  /* ======================================================================
   * WebGL fire engine (vanilla port, DeepSeek-blue palette)
   * ====================================================================== */
  function createFire(canvasEl) {
    var MAX_IDLE = 180
    var gl = null
    var rafId = null
    var ro = null
    var resizeTimer = null
    var loopRunning = false
    var idleFrames = 0
    var wasActive = false
    var activeStart = null
    var simProg = null
    var blurProg = null
    var compProg = null
    var vao = null
    var vbo = null
    var ready = false
    var simA = null
    var simB = null
    var blurH = null
    var blurV = null
    var U = {}

    var VERT = [
      '#version 300 es',
      'layout(location=0) in vec2 a_pos;',
      'out vec2 v_uv;',
      'void main(){ v_uv=a_pos*0.5+0.5; gl_Position=vec4(a_pos,0.0,1.0); }',
    ].join('\n')

    var FRAG_SIM = [
      '#version 300 es',
      'precision highp float;',
      'in vec2 v_uv; out vec4 fc;',
      'uniform float u_time, u_slider, u_elapsed;',
      'uniform sampler2D u_back;',
      'float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }',
      'void main(){',
      '  vec2 uv=v_uv;',
      '  vec2 g=uv*vec2(72.0,6.0);',
      '  vec2 id=floor(g);',
      '  vec2 cf=fract(g);',
      '  float h=hash(id);',
      '  vec2 ap=abs(cf-0.5);',
      '  float cell=smoothstep(0.34,0.22,max(ap.x*0.9,ap.y));',
      '  vec3 prev=texture(u_back,uv).rgb;',
      '  float fade_mask = smoothstep(0.0, 0.45, uv.x);',
      '  vec3 decay = prev * 0.90 * fade_mask;',
      '  float act=smoothstep(0.95,1.0,u_slider);',
      '  if(act<0.01||u_elapsed<0.0){ fc=vec4(decay,1.0); return; }',
      '  float t=u_time;',
      '  float cellDelay = h * 1.2;',
      '  float cellAge   = max(u_elapsed - cellDelay, 0.0);',
      '  float ignited   = step(0.001, cellAge);',
      '  float cellSpd   = 0.85 + h * 0.30;',
      '  float eased = 1.0 - pow(1.0 - clamp(cellAge / 2.5, 0.0, 1.0), 3.0);',
      '  float dist  = eased * u_slider * cellSpd * ignited;',
      '  float cellOff = (h - 0.5) * 0.05;',
      '  float front   = max(u_slider - dist - cellOff, 0.02);',
      '  float tail    = max(u_slider - front, 0.001);',
      '  float inZ   = step(front - 0.003, uv.x) * step(uv.x, u_slider + 0.003);',
      '  float dn    = clamp(max(u_slider - uv.x, 0.0) / tail, 0.0, 1.0);',
      '  float bright = pow(1.0 - dn, 0.65);',
      '  bright = max(bright, 0.04 * ignited) * inZ;',
      '  bright *= 1.0 - smoothstep(0.94, 1.05, dn);',
      '  float es = mix(0.15, 0.5, min(u_elapsed / 1.0, 1.0));',
      '  float vy = abs(uv.y - 0.5) * 2.0;',
      '  float vf = pow(max(1.0 - vy * vy * 0.45, 0.0), 0.75);',
      '  float ts = mix(0.85, 1.0, min(u_elapsed / 1.5, 1.0));',
      '  float f1 = sin(uv.x * 30.0 + t * 15.0 * ts + h * 6.28);',
      '  float f2 = sin(uv.x * 17.0 + t * 8.0 * ts + h * 3.14);',
      '  float f3 = sin(uv.x * 52.0 + t * 25.0 * ts + h * 10.0);',
      '  float flame = smoothstep(0.08, 0.92, (f1 + f2 * 0.5 + f3 * 0.25) * 0.35 + 0.5);',
      '  float r1 = sin(dn * 16.0 - t * 5.0 * ts + h * 3.0);',
      '  float r2 = sin(dn * 8.0 - t * 2.5 * ts + h * 5.0);',
      '  float rhythm = smoothstep(-0.15, 0.55, r1) * (r2 * 0.5 + 0.5);',
      '  rhythm = pow(max(rhythm, 0.0), 1.2);',
      '  float avgSpd = dist / max(cellAge, 0.001);',
      '  float age    = max(cellAge - max(u_slider - uv.x, 0.0) / max(avgSpd, 0.001), 0.0);',
      '  float flash  = step(0.0, age) * exp(-age * 3.2);',
      '  float sp  = fract(t * (0.38 + h * 0.15) + h * 7.0);',
      '  float sX  = u_slider - sp * tail;',
      '  float sY  = 0.5 + sin(sp * 11.0 + h * 6.28) * 0.28;',
      '  float spark = smoothstep(0.014, 0.0, abs(uv.x - sX))',
      '              * smoothstep(0.18, 0.0, abs(uv.y - sY))',
      '              * (1.0 - sp) * (1.0 - sp) * es;',
      '  float energy = bright * vf * (flame * 0.42 + rhythm * 0.38)',
      '               + flash * bright * vf * 0.55',
      '               + spark * 0.7 * inZ;',
      '  energy *= es;',
      '  float edgeBase = exp(-pow((uv.x - front) * 18.0, 2.0));',
      '  float ef1 = sin(uv.x * 45.0 + t * 20.0 * ts + h * 6.28) * 0.5 + 0.5;',
      '  float ef2 = sin(uv.x * 28.0 + t * 11.0 * ts + h * 3.14) * 0.5 + 0.5;',
      '  float edge = edgeBase * (0.25 + ef1 * ef2 * 1.5) * 1.6 * act * es;',
      '  float leadD    = front - uv.x;',
      '  float leadZone = smoothstep(0.07, 0.0, leadD) * step(0.0, leadD) * vf;',
      '  float h2       = hash(id + vec2(99.0, 33.0));',
      '  float leadF    = sin(leadD * 100.0 + t * 20.0 * ts + h2 * 6.28) * 0.5 + 0.5;',
      '  float leadSpark = leadZone * step(0.6, h2) * leadF * act * es * 0.5;',
      '  float total = energy + edge + leadSpark;',
      '  vec3 ember = vec3(0.055, 0.145, 0.52);',
      '  vec3 wpur  = vec3(0.224, 0.392, 0.996);',
      '  vec3 wht   = vec3(0.62, 0.72, 1.0);',
      '  float temp = 1.0 - dn;',
      '  vec3 col   = mix(ember, wpur, temp);',
      '  col        = mix(col, wht, pow(temp, 4.5));',
      '  col       *= total;',
      '  float pulse = sin(t * 2.8) * 0.15 + 1.0;',
      '  float core  = exp(-pow((uv.x - u_slider) * 16.0, 2.0));',
      '  col += wht * core * 2.2 * pulse * act * es;',
      '  col += wpur * exp(-pow((uv.x - u_slider) * 3.5, 2.0)) * 0.14 * act * es;',
      '  col *= cell;',
      '  col *= fade_mask;',
      '  fc = vec4(min(decay + col, vec3(1.5)), 1.0);',
      '}',
    ].join('\n')

    var FRAG_BLUR = [
      '#version 300 es',
      'precision highp float;',
      'in vec2 v_uv; out vec4 fc;',
      'uniform sampler2D u_tex;',
      'uniform vec2 u_dir, u_res;',
      'uniform float u_ext;',
      'vec3 s(vec2 uv){',
      '  vec3 c=texture(u_tex,uv).rgb;',
      '  return u_ext>0.5 && dot(c,vec3(0.2126,0.7152,0.0722))<0.3 ? vec3(0.0) : c;',
      '}',
      'void main(){',
      '  vec2 o=u_dir*1.8/u_res;',
      '  vec3 r=s(v_uv)*0.227027;',
      '  r+=s(v_uv+o)*0.194595;    r+=s(v_uv-o)*0.194595;',
      '  r+=s(v_uv+o*2.0)*0.121622;r+=s(v_uv-o*2.0)*0.121622;',
      '  r+=s(v_uv+o*3.0)*0.054054;r+=s(v_uv-o*3.0)*0.054054;',
      '  fc=vec4(r,1.0);',
      '}',
    ].join('\n')

    var FRAG_COMP = [
      '#version 300 es',
      'precision highp float;',
      'in vec2 v_uv; out vec4 fc;',
      'uniform sampler2D u_scene, u_glow;',
      'uniform float u_light;',
      'void main(){',
      '  vec3 s=texture(u_scene,v_uv).rgb;',
      '  vec3 g=texture(u_glow,v_uv).rgb;',
      '  vec3 c;',
      '  float a;',
      '  if(u_light>0.5){',
      '    float peak=max(max(s.r,s.g),s.b);',
      '    float clean=pow(smoothstep(0.11,0.62,peak),1.35);',
      '    float halo=smoothstep(0.16,0.72,max(max(g.r,g.g),g.b))*0.22;',
      '    vec3 brand=vec3(0.224,0.392,0.996);',
      '    vec3 core=vec3(0.64,0.74,1.0);',
      '    c=mix(brand,core,smoothstep(0.62,1.05,peak)*0.48)*(clean+halo);',
      '    a=clamp(clean*0.92+halo*0.55,0.0,0.94);',
      '  }else{',
      '    c=1.0-exp(-(s+g*1.2+s*g*0.35)*1.15);',
      '    a=smoothstep(0.018,0.38,max(max(c.r,c.g),c.b));',
      '  }',
      '  fc=vec4(c*a,a);',
      '}',
    ].join('\n')

    function compileShader(type, src) {
      var sh = gl.createShader(type)
      gl.shaderSource(sh, src)
      gl.compileShader(sh)
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        gl.deleteShader(sh)
        return null
      }
      return sh
    }
    function linkProgram(vsSrc, fsSrc) {
      var v = compileShader(gl.VERTEX_SHADER, vsSrc)
      var f = compileShader(gl.FRAGMENT_SHADER, fsSrc)
      if (!v || !f) return null
      var p = gl.createProgram()
      gl.attachShader(p, v)
      gl.attachShader(p, f)
      gl.bindAttribLocation(p, 0, 'a_pos')
      gl.linkProgram(p)
      gl.deleteShader(v)
      gl.deleteShader(f)
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
        gl.deleteProgram(p)
        return null
      }
      return p
    }
    function compilePrograms() {
      ready = false // any failed (re)compile leaves the engine disabled
      simProg = linkProgram(VERT, FRAG_SIM)
      blurProg = linkProgram(VERT, FRAG_BLUR)
      compProg = linkProgram(VERT, FRAG_COMP)
      if (!simProg || !blurProg || !compProg) return
      vao = gl.createVertexArray()
      gl.bindVertexArray(vao)
      vbo = gl.createBuffer()
      gl.bindBuffer(gl.ARRAY_BUFFER, vbo)
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
        gl.STATIC_DRAW,
      )
      gl.enableVertexAttribArray(0)
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
      U.simTime = gl.getUniformLocation(simProg, 'u_time')
      U.simSlider = gl.getUniformLocation(simProg, 'u_slider')
      U.simElapsed = gl.getUniformLocation(simProg, 'u_elapsed')
      U.simBack = gl.getUniformLocation(simProg, 'u_back')
      U.blurDir = gl.getUniformLocation(blurProg, 'u_dir')
      U.blurExt = gl.getUniformLocation(blurProg, 'u_ext')
      U.blurTex = gl.getUniformLocation(blurProg, 'u_tex')
      U.blurRes = gl.getUniformLocation(blurProg, 'u_res')
      U.compScene = gl.getUniformLocation(compProg, 'u_scene')
      U.compGlow = gl.getUniformLocation(compProg, 'u_glow')
      U.compLight = gl.getUniformLocation(compProg, 'u_light')
      ready = true
    }
    function makeFBO() {
      var fbo = gl.createFramebuffer()
      var tex = gl.createTexture()
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo)
      gl.bindTexture(gl.TEXTURE_2D, tex)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, canvasEl.width, canvasEl.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0)
      gl.clearColor(0, 0, 0, 1)
      gl.clear(gl.COLOR_BUFFER_BIT)
      return { fbo: fbo, tex: tex }
    }
    function createFBOs() {
      simA = makeFBO()
      simB = makeFBO()
      blurH = makeFBO()
      blurV = makeFBO()
    }
    function destroyFBO(entry) {
      if (entry) {
        gl.deleteFramebuffer(entry.fbo)
        gl.deleteTexture(entry.tex)
      }
    }
    function destroyFBOs() {
      destroyFBO(simA); simA = null
      destroyFBO(simB); simB = null
      destroyFBO(blurH); blurH = null
      destroyFBO(blurV); blurV = null
    }
    function destroyPrograms() {
      if (simProg) { gl.deleteProgram(simProg); simProg = null }
      if (blurProg) { gl.deleteProgram(blurProg); blurProg = null }
      if (compProg) { gl.deleteProgram(compProg); compProg = null }
      if (vao) { gl.deleteVertexArray(vao); vao = null }
      if (vbo) { gl.deleteBuffer(vbo); vbo = null }
      ready = false
    }
    function resize() {
      var rect = canvasEl.getBoundingClientRect()
      if (!rect.width || !rect.height) return
      var dpr = window.devicePixelRatio || 1
      canvasEl.width = Math.max(1, Math.round(rect.width * dpr))
      canvasEl.height = Math.max(1, Math.round(rect.height * dpr))
      destroyFBOs()
      createFBOs()
    }
    function ensureLoop() {
      if (loopRunning) {
        idleFrames = 0
        return
      }
      if (!simA || !simB) {
        resize()
        if (!simA || !simB) return
      }
      loopRunning = true
      idleFrames = 0
      wasActive = false
      gl.bindFramebuffer(gl.FRAMEBUFFER, simA.fbo)
      gl.clear(gl.COLOR_BUFFER_BIT)
      gl.bindFramebuffer(gl.FRAMEBUFFER, simB.fbo)
      gl.clear(gl.COLOR_BUFFER_BIT)
      rafId = requestAnimationFrame(render)
    }
    function isActiveNow() {
      var lv = uiLevels[uiIdx]
      return slotActive && !!lv && lv.isMax && !document.hidden
    }
    function render(t) {
      var active = isActiveNow()
      if (!active && !wasActive) {
        if (++idleFrames > MAX_IDLE) {
          loopRunning = false
          rafId = null
          return
        }
        rafId = requestAnimationFrame(render)
        return
      }
      idleFrames = 0
      if (active && !wasActive) {
        activeStart = performance.now()
        gl.bindFramebuffer(gl.FRAMEBUFFER, simA.fbo)
        gl.clear(gl.COLOR_BUFFER_BIT)
        gl.bindFramebuffer(gl.FRAMEBUFFER, simB.fbo)
        gl.clear(gl.COLOR_BUFFER_BIT)
      }
      wasActive = active
      var elapsed = active ? (performance.now() - (activeStart || 0)) / 1000 : -1
      gl.viewport(0, 0, canvasEl.width, canvasEl.height)

      gl.bindFramebuffer(gl.FRAMEBUFFER, simB.fbo)
      gl.useProgram(simProg)
      gl.uniform1f(U.simTime, t * 0.001)
      gl.uniform1f(U.simSlider, 1.0)
      gl.uniform1f(U.simElapsed, elapsed)
      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, simA.tex)
      gl.uniform1i(U.simBack, 0)
      gl.drawArrays(gl.TRIANGLES, 0, 6)

      gl.useProgram(blurProg)
      gl.uniform2f(U.blurRes, canvasEl.width, canvasEl.height)
      gl.bindFramebuffer(gl.FRAMEBUFFER, blurH.fbo)
      gl.uniform2f(U.blurDir, 1.0, 0.0)
      gl.uniform1f(U.blurExt, 1.0)
      gl.bindTexture(gl.TEXTURE_2D, simB.tex)
      gl.uniform1i(U.blurTex, 0)
      gl.drawArrays(gl.TRIANGLES, 0, 6)

      gl.bindFramebuffer(gl.FRAMEBUFFER, blurV.fbo)
      gl.uniform2f(U.blurDir, 0.0, 1.0)
      gl.uniform1f(U.blurExt, 0.0)
      gl.bindTexture(gl.TEXTURE_2D, blurH.tex)
      gl.drawArrays(gl.TRIANGLES, 0, 6)

      gl.bindFramebuffer(gl.FRAMEBUFFER, null)
      gl.useProgram(compProg)
      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, simB.tex)
      gl.uniform1i(U.compScene, 0)
      gl.activeTexture(gl.TEXTURE1)
      gl.bindTexture(gl.TEXTURE_2D, blurV.tex)
      gl.uniform1i(U.compGlow, 1)
      gl.uniform1f(U.compLight, document.body && !document.body.hasAttribute('data-ds-dark-theme') ? 1.0 : 0.0)
      gl.drawArrays(gl.TRIANGLES, 0, 6)

      var tmp = simA
      simA = simB
      simB = tmp
      rafId = requestAnimationFrame(render)
    }

    var glCtx = null
    try {
      glCtx = canvasEl.getContext('webgl2', { preserveDrawingBuffer: false, antialias: false, alpha: true, premultipliedAlpha: true })
    } catch (err) {
      glCtx = null
    }
    if (!glCtx) {
      canvasEl.style.display = 'none'
      return { ok: false }
    }
    gl = glCtx
    var onLost = function (e) {
      e.preventDefault()
    }
    var onRestored = function () {
      compilePrograms()
      if (ready) {
        resize()
        if (isActiveNow()) ensureLoop()
      }
    }
    canvasEl.addEventListener('webglcontextlost', onLost)
    canvasEl.addEventListener('webglcontextrestored', onRestored)
    compilePrograms()
    if (!ready) {
      canvasEl.style.display = 'none'
      return { ok: false }
    }
    if (typeof ResizeObserver === 'function') {
      ro = new ResizeObserver(function () {
        clearTimeout(resizeTimer)
        resizeTimer = setTimeout(resize, 80)
      })
      ro.observe(canvasEl)
    }
    resize()
    return {
      ok: true,
      kick: function () {
        if (ready && slotActive) ensureLoop()
      },
      dispose: function () {
        if (rafId) cancelAnimationFrame(rafId)
        if (ro) ro.disconnect()
        clearTimeout(resizeTimer)
        loopRunning = false
        destroyFBOs()
        destroyPrograms()
        canvasEl.removeEventListener('webglcontextlost', onLost)
        canvasEl.removeEventListener('webglcontextrestored', onRestored)
      },
    }
  }

  /* ======================================================================
   * UI card (built once; re-parented into each open menu)
   * ====================================================================== */
  var slot = el('div', '')
  slot.setAttribute('data-dse-slot', '')
  var statusEl = el('span', 'dse-h-status')
  var h = el('div', 'dse-h')
  h.appendChild(el('span', 'dse-h-label', '推理等级'))
  h.appendChild(statusEl)
  var scale = el('div', 'dse-scale')
  scale.appendChild(el('span', '', '更快'))
  scale.appendChild(el('span', '', '更强'))
  var track = el('div', 'dse-track')
  var canvas = el('canvas', 'dse-canvas')
  var dots = el('div', 'dse-dots')
  for (var di = 0; di < 5; di++) {
    var ddot = el('span', 'dse-dot')
    ddot.style.left = di * 25 + '%'
    dots.appendChild(ddot)
  }
  var slider = el('input', '')
  slider.type = 'range'
  slider.min = '0'
  slider.max = '100'
  slider.step = '1'
  slider.value = '50'
  slider.setAttribute('aria-label', '推理等级滑块')
  track.appendChild(el('div', 'dse-track-bg'))
  track.appendChild(dots)
  track.appendChild(canvas)
  track.appendChild(slider)
  var levelRow = el('div', 'dse-levels')
  var nav = el('div', 'dse-nav')
  var foot = el('div', 'dse-foot')
  var backBtn = el('button', 'dse-f-btn', '返回')
  backBtn.type = 'button'
  var resetBtn = el('button', 'dse-f-btn', '恢复默认')
  resetBtn.type = 'button'
  var footMsg = el('span', '')
  var actions = el('span', 'dse-actions')
  actions.appendChild(resetBtn)
  nav.appendChild(backBtn)
  nav.appendChild(actions)
  foot.appendChild(footMsg)
  slot.appendChild(nav)
  slot.appendChild(h)
  slot.appendChild(scale)
  slot.appendChild(track)
  slot.appendChild(levelRow)
  slot.appendChild(foot)

  var dotNodes = dots.children

  /* ---- mutable view state --------------------------------------------- */
  var slotActive = false // our card currently mounted & visible in a menu
  var rows = [] // native level rows (menuitemradio buttons, no Default row)
  var defaultRow = null // native Default option (may not exist)
  var labels = [] // display names for rows
  var uiLevels = [] // {label, isMax}
  var uiIdx = -1 // -1 when current native selection is Default/unknown
  var checkedRow = null
  var dragging = false
  var movedSinceCommit = false // true once the slider actually moved this gesture
  var fire = null
  var suppressObserve = false
  var seatIntent = typeof WeakMap === 'function' ? new WeakMap() : null // menu → last effort-cell click ts

  function flip() {
    statusEl.classList.remove('dse-animate')
    void statusEl.offsetWidth
    statusEl.classList.add('dse-animate')
  }
  function segs() {
    return Math.max(1, uiLevels.length - 1)
  }
  function paint(animate, preserveThumb) {
    var isUltra = !!uiLevels[uiIdx] && uiLevels[uiIdx].isMax
    slot.classList.toggle('dse-ultra', isUltra)
    track.classList.toggle('dse-ultra', isUltra)
    if (uiIdx >= 0 && uiIdx < uiLevels.length) {
      var lv = uiLevels[uiIdx]
      statusEl.textContent = lv.label
      statusEl.classList.remove('dse-glowing', 'dse-low-glow', 'dse-mid-glow', 'dse-default')
      if (isUltra) statusEl.classList.add('dse-glowing')
      else if (uiLevels.length === 4 && uiIdx === 1) statusEl.classList.add('dse-low-glow')
      else if (uiLevels.length === 4 && uiIdx === 2) statusEl.classList.add('dse-mid-glow')
      if (animate) flip()
      if (!preserveThumb) slider.value = String(Math.round((uiIdx * 100) / segs()))
      slider.setAttribute('aria-valuetext', lv.label)
    } else {
      // Default selected (provider default) or unknown → neutral state
      statusEl.textContent = defaultRow && checkedRow === defaultRow ? 'Default · 跟随模型' : ''
      statusEl.classList.add('dse-default')
      statusEl.classList.remove('dse-glowing', 'dse-low-glow', 'dse-mid-glow')
      if (uiLevels.length > 0) {
        // park the thumb at the deployment default level when known
        var fallback = Math.min(2, uiLevels.length - 1)
        slider.value = String(Math.round((fallback * 100) / segs()))
      }
    }
    // ticks / level labels
    var lit = uiIdx >= 0 ? Math.round((uiIdx / segs()) * 4) : -1
    for (var i = 0; i < dotNodes.length; i++) {
      dotNodes[i].classList.toggle('dse-dot-on', i <= lit)
      dotNodes[i].classList.toggle('dse-dot-ultra', isUltra && i === dotNodes.length - 1)
    }
    var spans = levelRow.children
    for (var j = 0; j < spans.length; j++) {
      var on = uiIdx === j
      spans[j].classList.toggle('dse-on', on)
      spans[j].classList.toggle('dse-a-low', on && j === 1)
      spans[j].classList.toggle('dse-a-mid', on && j === 2)
      spans[j].classList.toggle('dse-a-max', on && j === 3)
    }
    resetBtn.style.display = defaultRow ? '' : 'none'
    if (fire && fire.ok && isUltra && slotActive) fire.kick()
  }

  function setFoot(msg, kind) {
    footMsg.textContent = msg || ''
    footMsg.className = kind === 'err' ? 'dse-f-err' : kind === 'busy' ? 'dse-f-busy' : ''
    foot.style.display = msg && kind === 'err' ? 'flex' : 'none'
  }

  /* ---- native row helpers ---------------------------------------------- */
  function isChecked(btn) {
    return btn && (btn.getAttribute('aria-checked') === 'true' || btn.classList.contains('dse-sel'))
  }
  function selectNativeRowKeepingOpen(btn) {
    if (!btn || !btn.isConnected || btn.disabled) return false
    setFoot('正在应用…', 'busy')
    var originalThen = Promise.prototype.then
    var intercepted = false
    // chooseEffort calls select(selection).then(settleSelection) synchronously.
    // Suppress only that success-settlement callback; selectModel and every
    // store/projection update still run on the original promise chain.
    Promise.prototype.then = function (onFulfilled, onRejected) {
      var source = ''
      try { source = typeof onFulfilled === 'function' ? Function.prototype.toString.call(onFulfilled) : '' } catch (err) {}
      if (!intercepted && /accepted/.test(source) && /close\(true\)/.test(source)) {
        intercepted = true
        return originalThen.call(this, function (accepted) {
          if (!accepted) return onFulfilled(accepted)
          setFoot('已应用')
        }, onRejected)
      }
      return originalThen.call(this, onFulfilled, onRejected)
    }
    try {
      btn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }))
    } catch (err) {
      try { btn.click() } catch (err2) { return false }
    } finally {
      Promise.prototype.then = originalThen
    }
    if (!intercepted) setFoot('正在应用…', 'busy')
    return true
  }

  /* ---- find native bits inside a menu ---------------------------------- */
  function collectRows(menu) {
    var radios = menu.querySelectorAll('button[role="menuitemradio"]')
    var out = { rows: [], defaultRow: null }
    for (var i = 0; i < radios.length; i++) {
      // A popover can contain a nested menu. Never hide or click rows owned by
      // that child menu when replacing the current effort pane.
      if (radios[i].closest && radios[i].closest('[role="menu"]') !== menu) continue
      var lbl = rowLabel(radios[i])
      if (!lbl) continue
      if (/^default$/i.test(lbl)) {
        if (!out.defaultRow) out.defaultRow = radios[i]
        continue
      }
      out.rows.push(radios[i])
    }
    // Some DSH/provider builds render the choices in catalog order rather than
    // increasing effort order. A left-to-right slider must always mean
    // faster -> smarter, so sort only when every native row has a canonical id.
    if (out.rows.length > 1 && out.rows.every(function (row) { return effortId(row) !== null })) {
      out.rows.sort(function (a, b) { return EFFORT_ORDER[effortId(a)] - EFFORT_ORDER[effortId(b)] })
    }
    return out
  }

  /* ---- view sync from the native DOM ----------------------------------- */
  function syncFromDom(menu) {
    var c = collectRows(menu)
    var found = c.rows.length >= 1 || !!c.defaultRow
    if (!found) return false
    defaultRow = c.defaultRow
    rows = c.rows
    labels = rows.map(rowLabel)
    uiLevels = labels.map(function (lbl, idx) {
      var id = effortId(rows[idx])
      return { id: id, label: lbl, isMax: id === 'max' || (!id && idx === rows.length - 1) }
    })
    // rebuild tick labels
    levelRow.innerHTML = ''
    uiLevels.forEach(function (lv) {
      var s = el('span', '', lv.label)
      levelRow.appendChild(s)
    })
    // current = checked radio
    checkedRow = null
    for (var i = 0; i < c.rows.length; i++) {
      if (isChecked(c.rows[i])) {
        checkedRow = c.rows[i]
        uiIdx = i
        break
      }
    }
    if (checkedRow === null && defaultRow && isChecked(defaultRow)) {
      checkedRow = defaultRow
      uiIdx = -1 // Default: resolve to default effort for display only
      fetchDefaultEffort()
    }
    if (checkedRow === null && c.rows.length > 0) {
      uiIdx = Math.min(2, c.rows.length - 1)
    }
    paint(false)
    return true
  }

  /* ---- hide native rows and mount our card in place --------------------- */
  var hideList = [] // [{node, prev}] rows hidden by us (restored on unmount)
  function hideRow(node) {
    if (!node || node.__dseHidden) return
    node.__dseHidden = true
    hideList.push({ node: node, prev: node.style.display })
    node.style.display = 'none'
  }
  function mount(menu) {
    if (slotActive) unmount()
    if (!menu || !menu.isConnected) return
    var c = collectRows(menu)
    if (c.rows.length === 0 && !c.defaultRow) return
    suppressObserve = true
    try {
      // remove a foreign duplicate card that a stale instance may have mounted
      var foreign = menu.querySelector(':scope > [data-dse-slot]')
      if (foreign && foreign !== slot) {
        try { foreign.parentNode.removeChild(foreign) } catch (err) {}
      }
      if (slot.parentNode && slot.parentNode !== menu) {
        try { slot.parentNode.removeChild(slot) } catch (err) {}
      }
      // hide the native option rows — the menu re-flows around our card
      for (var i = 0; i < c.rows.length; i++) hideRow(c.rows[i])
      if (c.defaultRow) hideRow(c.defaultRow)
      menu.appendChild(slot)
      slotActive = true
      if (!syncFromDom(menu)) {
        unmount()
        return
      }
      if (fire === null) {
        try {
          fire = createFire(canvas)
          if (fire && fire.ok) paint(false)
        } catch (err) {
          fire = { ok: false }
        }
      } else if (fire && fire.ok && uiIdx === uiLevels.length - 1 && uiLevels.length === 4) {
        fire.kick()
      }
    } finally {
      suppressObserve = false
    }
  }
  function unmount() {
    suppressObserve = true
    try {
      if (slot.parentNode) slot.parentNode.removeChild(slot)
    } catch (err) {}
    // restore any native rows we hid (no-op when React already removed them)
    for (var i = 0; i < hideList.length; i++) {
      var item = hideList[i]
      try {
        if (item.node && item.node.isConnected) item.node.style.display = item.prev
      } catch (err) {}
      try { delete item.node.__dseHidden } catch (err) {}
    }
    hideList = []
    slotActive = false
    rows = []
    defaultRow = null
    checkedRow = null
    uiIdx = -1
    suppressObserve = false
  }

  /* ---- default-effort resolver (for the Default badge) ------------------ */
  var defCache = { at: 0, effort: null }
  var fetchEpoch = 0
  function fetchDefaultEffort() {
    var now = Date.now()
    if (defCache.at && now - defCache.at < 60000) {
      applyDefaultEffort(defCache.effort)
      return
    }
    fetchEpoch++
    var epoch = fetchEpoch
    fetch(STATE_URL, { credentials: 'same-origin' })
      .then(function (r) { return r.json() })
      .then(function (d) {
        if (!d || !d.ok) return
        var effort = d.capability && d.capability.defaultEffort ? d.capability.defaultEffort : null
        defCache = { at: now, effort: effort }
        // only apply if nothing changed since the fetch started
        if (epoch !== fetchEpoch) return
        if (dragging || !slotActive || checkedRow !== defaultRow) return
        applyDefaultEffort(effort)
      })
      .catch(function () {})
  }
  function applyDefaultEffort(id) {
    if (!slotActive || dragging || checkedRow !== defaultRow) return
    if (!id) return
    var want = -1
    for (var i = 0; i < uiLevels.length; i++) {
      if (uiLevels[i].id === id) { want = i; break }
    }
    if (want < 0) return
    uiIdx = want
    paint(false)
  }

  /* ---- slider interaction: preview + commit via native row click --------- */
  slider.addEventListener('input', function () {
    dragging = true
    movedSinceCommit = true
    fetchEpoch++ // invalidate any in-flight Default resolution (user moved)
    var idx = uiLevels.length === 0 ? -1 : clamp(Math.round((Number(slider.value) * segs()) / 100), 0, uiLevels.length - 1)
    if (idx !== uiIdx) {
      uiIdx = idx
      paint(true, true)
    } else {
      paint(false, true)
    }
  })
  var committedAt = 0
  function commit() {
    dragging = false
    if (!slotActive) return
    if (!movedSinceCommit) return // a click/tab with no actual move must not commit
    movedSinceCommit = false
    var now = Date.now()
    if (now - committedAt < 350) return // pointerup + change fire together
    if (uiIdx < 0 || uiIdx >= rows.length) return
    // Dragging is continuous; release snaps the thumb to the chosen semantic
    // effort before the native DSH selection is committed.
    paint(false)
    var target = rows[uiIdx]
    if (target === checkedRow && checkedRow) return
    if (!target || !target.isConnected) {
      setFoot('界面已更新，请重新选择', 'err')
      return
    }
    if (selectNativeRowKeepingOpen(target)) {
      committedAt = now
    }
  }
  slider.addEventListener('change', commit)
  slider.addEventListener('keyup', commit)
  slider.addEventListener('pointerup', commit)
  resetBtn.addEventListener('click', function () {
    if (!defaultRow) return
    selectNativeRowKeepingOpen(defaultRow)
  })
  backBtn.addEventListener('mousedown', function (event) {
    // Do not move focus onto a node that the pane transition immediately removes.
    event.preventDefault()
  })
  backBtn.addEventListener('click', function () {
    var menu = slot.parentNode
    var root = menu && menu.parentElement
    var trigger = root && root.querySelector ? root.querySelector('button[aria-haspopup="menu"]') : null
    // ModelSelect closes on blur. Move focus to its persistent trigger before
    // removing this plugin-owned button so blur remains inside the same root.
    if (trigger && typeof trigger.focus === 'function') trigger.focus()
    if (trigger) trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true, cancelable: true }))
    else setFoot('无法返回，请按 Esc', 'err')
  })

  /* ======================================================================
   * Menu detection & reconcile
   * ====================================================================== */
  function canonicalCount(menu) {
    var c = collectRows(menu)
    var n = 0
    for (var i = 0; i < c.rows.length; i++) {
      if (effortId(c.rows[i]) !== null) n++
    }
    return n
  }
  function anchoredToComposer(menu) {
    try {
      if (menu.closest && menu.closest('[data-composer-card]')) return true
      if (document.querySelector && !document.querySelector('[data-composer-card]')) return true
    } catch (err) {}
    return false
  }
  function isComposerSeatMenu(menu) {
    var strong = canonicalCount(menu) >= 2
    if (strong) return anchoredToComposer(menu) // hijack-proof: label-only is not enough
    // weak paths (provider-custom level names):
    //   a) user just clicked the native “推理等级/Effort” cell of this menu
    var intent = false
    if (seatIntent) {
      try { intent = Date.now() - (seatIntent.get(menu) || 0) < 60000 } catch (err) {}
    }
    var c = collectRows(menu)
    if (intent) return c.rows.length > 0 || !!c.defaultRow
    //   b) Default row + other rows, anchored to the composer seat
    if (!c.defaultRow || c.rows.length === 0) return false
    return anchoredToComposer(menu)
  }
  // remember when the user opens the effort pane so custom-name providers are
  // still detected without relying on English labels
  document.addEventListener(
    'click',
    function (e) {
      if (window.__dshEffortSliderToken !== TOKEN) return
      var t = e.target
      var btn = t && t.closest ? t.closest('button') : null
      if (!btn) return
      var menu = btn.closest('[role="menu"]')
      if (!menu) return
      var txt = text(btn)
      if (/推理等级/.test(txt) || /^effort/i.test(txt.replace(/^\s+/, ''))) {
        if (seatIntent) {
          try { seatIntent.set(menu, Date.now()) } catch (err) {}
        }
      }
    },
    true,
  )

  /* refresh our mounted card when React swapped the underlying native rows */
  function resyncIfChanged(menu) {
    var c = collectRows(menu)
    var changed = c.rows.length !== rows.length || !!c.defaultRow !== !!defaultRow
    if (!changed) {
      for (var i = 0; i < rows.length; i++) {
        if (!rows[i] || !rows[i].isConnected) {
          changed = true
          break
        }
      }
    }
    if (!changed) {
      for (var j = 0; j < rows.length; j++) {
        if (rowLabel(c.rows[j]) !== labels[j]) {
          changed = true
          break
        }
      }
      if (!changed) {
        var ck = -1
        var cur = -1
        for (var a = 0; a < c.rows.length; a++) if (isChecked(c.rows[a])) { ck = a; break }
        for (var b = 0; b < rows.length; b++) if (isChecked(rows[b])) { cur = b; break }
        if (ck !== cur) changed = true
      }
    }
    if (changed) {
      suppressObserve = true
      try {
        unmount()
        mount(menu)
      } finally {
        suppressObserve = false
      }
    }
  }
  function reconcileMenus() {
    if (suppressObserve) return
    if (window.__dshEffortSliderToken !== TOKEN) {
      if (slotActive) unmount() // superseded copy must not leave its card behind
      return
    }
    // already mounted and the pane is still here → keep (resync cheaply)
    if (slotActive && slot.parentNode) {
      var host = slot.parentNode
      if (host.isConnected && host.offsetParent !== null && isComposerSeatMenu(host)) {
        if (!dragging) resyncIfChanged(host)
        var lv = uiLevels[uiIdx]
        if (fire && fire.ok && lv && lv.isMax) fire.kick() // wake engine when sized later
        return
      }
      unmount()
    }
    if (!document.body) return
    var menus = document.querySelectorAll('div[role="menu"], ul[role="menu"], [role="menu"]')
    var best = null
    for (var i = 0; i < menus.length; i++) {
      var m = menus[i]
      if (!m.isConnected || m.offsetParent === null) continue
      if (m === slot.parentNode) continue
      if (isComposerSeatMenu(m)) {
        best = m
        break
      }
    }
    if (best) mount(best)
  }

  // Reconcile when React re-renders any menu / the DOM changes around us.
  var mo = new MutationObserver(function () {
    reconcileMenus()
  })
  if (document.body) {
    mo.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['aria-checked', 'aria-disabled', 'disabled'] })
  } else {
    document.addEventListener('DOMContentLoaded', function () {
      mo.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['aria-checked', 'aria-disabled', 'disabled'] })
    })
  }

  // Cheap idle fallback scan in case of exotic menu markup.
  setInterval(reconcileMenus, 800)

  // Restore rows / release GL on page teardown (best-effort; React owns rows).
  window.addEventListener('beforeunload', function () {
    unmount()
    if (fire && typeof fire.dispose === 'function') {
      try { fire.dispose() } catch (err) {}
      fire = null
    }
  })
})()
