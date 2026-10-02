window.__ModuleLoader__.load({ id: "dsh-effort-slider", factory: (require) => {
  var module = { exports: {} }
  var exports = module.exports
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
//#region web/widget.js
function mountDshEffortSliderWidget() {
	if (window.__dshEffortSliderV2 && document.querySelector("[data-dse-slot]")) return function() {};
	window.__dshEffortSliderV2 = true;
	var TOKEN = {};
	window.__dshEffortSliderToken = TOKEN;
	var STATE_URL = "/dsh-effort-slider/state.json";
	function el(tag, className, html) {
		var node = document.createElement(tag);
		if (className) node.className = className;
		if (html != null) node.innerHTML = html;
		return node;
	}
	function clamp(v, lo, hi) {
		return v < lo ? lo : v > hi ? hi : v;
	}
	function text(n) {
		return n && (n.textContent || "").trim() || "";
	}
	function rowLabel(btn) {
		if (!btn) return "";
		var t = text(btn.querySelector ? btn.querySelector("span span") : null);
		if (t) return t;
		var aria = btn.getAttribute && btn.getAttribute("aria-label");
		if (aria && aria.trim()) return aria.trim();
		var spans = btn.querySelectorAll ? btn.querySelectorAll("span") : null;
		if (spans && spans.length) for (var i = spans.length - 1; i >= 0; i--) {
			var s = text(spans[i]);
			if (s) return s;
		}
		return text(btn);
	}
	var EFFORT_ORDER = {
		off: 0,
		low: 1,
		high: 2,
		max: 3
	};
	function effortId(btn) {
		var label = rowLabel(btn).replace(/[^A-Za-z]/g, "").toLowerCase();
		return Object.prototype.hasOwnProperty.call(EFFORT_ORDER, label) ? label : null;
	}
	var CSS = [
		"[role=\"menu\"][data-dse-position-lock]{left:var(--dse-lock-left)!important;top:var(--dse-lock-top)!important;z-index:2147483000!important}",
		"[data-dse-slot]{position:relative;z-index:2147483000;isolation:isolate;box-sizing:border-box;width:100%;min-width:300px;padding:4px;zoom:.78;user-select:none;color:var(--dsw-alias-label-primary);font-family:inherit}",
		"[data-dse-slot] *{box-sizing:border-box}",
		".dse-nav{display:flex;align-items:center;justify-content:space-between;height:36px}",
		".dse-nav .dse-f-btn{height:32px;border:none;background:transparent;color:var(--dsw-alias-label-primary);cursor:pointer;padding:0 8px;font:inherit;font-size:13px;font-weight:500;border-radius:8px}",
		".dse-nav .dse-f-btn:hover,.dse-nav .dse-f-btn:focus-visible{background:var(--dsw-alias-interactive-bg-hover);outline:none}",
		".dse-h{display:flex;align-items:center;justify-content:space-between;gap:8px;height:34px;padding:0 10px;perspective:280px;perspective-origin:center 120%}",
		".dse-h-label{color:var(--dsw-alias-label-primary);font-weight:500;font-size:14px;line-height:22px}",
		".dse-h-status{display:inline-block;color:var(--dsw-alias-label-tertiary);font-weight:500;font-size:14px;line-height:22px;will-change:transform,opacity,filter;transform-origin:center bottom;transition:color .3s,text-shadow .3s}",
		".dse-h-status.dse-glowing{color:#3964FE;text-shadow:0 0 8px rgba(57,100,254,.22);font-weight:600}",
		".dse-h-status.dse-low-glow,.dse-h-status.dse-mid-glow{color:var(--dsw-alias-label-tertiary);text-shadow:none}",
		".dse-h-status.dse-default{color:var(--dsw-alias-label-tertiary)}",
		"@keyframes dseFlipUp{0%{opacity:0;transform:translateY(14px) rotateX(-80deg);filter:blur(4px)}100%{opacity:1;transform:translateY(0) rotateX(0deg);filter:blur(0)}}",
		".dse-h-status.dse-animate{animation:dseFlipUp .42s cubic-bezier(.33,1,.68,1) forwards}",
		".dse-scale{display:flex;justify-content:space-between;font-size:11px;font-weight:400;color:var(--dsw-alias-label-tertiary);margin:0 10px 4px}",
		".dse-track{position:relative;height:32px;margin:0 8px;border-radius:10px;overflow:hidden;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-module-platform);isolation:isolate;box-shadow:inset 0 1px 2px rgba(0,0,0,.06)}",
		".dse-track-bg{position:absolute;inset:0;background:var(--dsw-alias-bg-module-platform);z-index:0}",
		".dse-canvas{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;opacity:0;mix-blend-mode:normal;z-index:2;transition:opacity .35s ease}",
		".dse-track.dse-ultra .dse-canvas{opacity:1;z-index:4}",
		"body:not([data-ds-dark-theme]) .dse-track.dse-ultra .dse-canvas{filter:none}",
		".dse-dots{position:absolute;inset:0;pointer-events:none;z-index:1}",
		".dse-dot{position:absolute;width:3.5px;height:3.5px;border-radius:50%;background:#484854;top:50%;transform:translate(-50%,-50%);transition:opacity .4s ease,background .4s ease}",
		".dse-track.dse-ultra .dse-dot{opacity:.2}",
		".dse-dot.dse-dot-on{background:#9a9aae}",
		".dse-dot.dse-dot-on.dse-dot-ultra{background:#b9aaff;box-shadow:0 0 6px rgba(150,125,255,.8)}",
		".dse-track.dse-ultra .dse-dot.dse-dot-ultra{opacity:.55}",
		".dse-levels{position:relative;height:17px;margin:5px 8px 4px;font-size:11px;font-weight:400;color:var(--dsw-alias-label-tertiary)}",
		".dse-levels span{position:absolute;top:0;transform:translateX(-50%);white-space:nowrap;transition:color .2s ease,text-shadow .2s ease}",
		".dse-levels span.dse-on{color:var(--dsw-alias-label-primary)}",
		".dse-levels span.dse-on.dse-a-low,.dse-levels span.dse-on.dse-a-mid{color:var(--dsw-alias-label-primary);text-shadow:none;font-weight:600}",
		".dse-levels span.dse-on.dse-a-max{color:#3964FE;text-shadow:0 0 7px rgba(57,100,254,.2);font-weight:600}",
		"[data-dse-slot] input[type=range]{position:absolute;inset:0;width:100%;height:100%;background:transparent;-webkit-appearance:none;appearance:none;cursor:pointer;z-index:10;outline:none;margin:0;padding:0}",
		"[data-dse-slot] input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:29px;height:29px;border-radius:10px;background:#fff;border:1px solid var(--dsw-alias-border-l2);box-shadow:0 1px 4px rgba(0,0,0,.2);cursor:grab;transition:none}",
		"body[data-ds-dark-theme] [data-dse-slot] input[type=range]::-webkit-slider-thumb{background:#f4f6ff;border:1px solid rgba(255,255,255,.82);box-shadow:0 1px 4px rgba(0,0,0,.55),0 0 0 1px rgba(57,100,254,.5),0 0 9px rgba(57,100,254,.32)}",
		"[data-dse-slot] input[type=range]::-webkit-slider-thumb:active{cursor:grabbing}",
		"[data-dse-slot].dse-ultra input[type=range]::-webkit-slider-thumb{box-shadow:0 1px 3px rgba(0,0,0,.18),0 0 10px rgba(57,100,254,.52),0 0 22px rgba(57,100,254,.22)}",
		"body[data-ds-dark-theme] [data-dse-slot].dse-ultra input[type=range]::-webkit-slider-thumb{background:#fff;border-color:#fff;box-shadow:0 1px 4px rgba(0,0,0,.58),0 0 0 1px rgba(57,100,254,.78),0 0 12px rgba(57,100,254,.7),0 0 24px rgba(57,100,254,.34)}",
		"[data-dse-slot] input[type=range]::-moz-range-thumb{width:29px;height:29px;border-radius:10px;background:#fff;border:1px solid rgba(0,0,0,.12);box-shadow:0 1px 4px rgba(0,0,0,.2);cursor:grab;transition:none}",
		"body[data-ds-dark-theme] [data-dse-slot] input[type=range]::-moz-range-thumb{background:#f4f6ff;border:1px solid rgba(255,255,255,.82);box-shadow:0 1px 4px rgba(0,0,0,.55),0 0 0 1px rgba(57,100,254,.5),0 0 9px rgba(57,100,254,.32)}",
		"[data-dse-slot].dse-ultra input[type=range]::-moz-range-thumb{box-shadow:0 1px 3px rgba(0,0,0,.18),0 0 10px rgba(57,100,254,.52),0 0 22px rgba(57,100,254,.22)}",
		"body[data-ds-dark-theme] [data-dse-slot].dse-ultra input[type=range]::-moz-range-thumb{background:#fff;border-color:#fff;box-shadow:0 1px 4px rgba(0,0,0,.58),0 0 0 1px rgba(57,100,254,.78),0 0 12px rgba(57,100,254,.7),0 0 24px rgba(57,100,254,.34)}",
		"[data-dse-slot] input[type=range]::-moz-range-track{background:transparent;border:none;height:22px}",
		"[data-dse-slot] input[type=range]:focus-visible{outline:1px solid rgba(120,130,255,.6);outline-offset:2px;border-radius:9px}",
		".dse-foot{display:none;align-items:center;padding:3px 10px 5px;font-size:11px;color:var(--dsw-alias-label-tertiary)}",
		".dse-foot .dse-f-err{color:#f0716b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
		".dse-foot .dse-f-busy{color:#8ea6ff}",
		".dse-actions{display:flex;align-items:center;gap:2px}",
		"[data-dse-slot].dse-ultra .dse-track::after{content:\"\";position:absolute;inset:-1px;border-radius:9px;pointer-events:none;z-index:3;background:radial-gradient(120% 220% at 100% 50%,rgba(120,100,255,.16),transparent 55%);opacity:1}",
		"body:not([data-ds-dark-theme]) [data-dse-slot].dse-ultra .dse-track::after{background:radial-gradient(105% 220% at 100% 50%,rgba(57,100,254,.12),rgba(57,100,254,.035) 42%,transparent 68%)}"
	].join("\n");
	if (!document.querySelector("style[data-plugin-css=\"dse-effort-slider-v2\"]")) {
		var styleTag = document.createElement("style");
		styleTag.setAttribute("data-plugin-css", "dse-effort-slider-v2");
		styleTag.textContent = CSS;
		document.head.appendChild(styleTag);
	}
	function createFire(canvasEl) {
		var MAX_IDLE = 180;
		var gl = null;
		var rafId = null;
		var ro = null;
		var resizeTimer = null;
		var loopRunning = false;
		var idleFrames = 0;
		var wasActive = false;
		var activeStart = null;
		var simProg = null;
		var blurProg = null;
		var compProg = null;
		var vao = null;
		var vbo = null;
		var ready = false;
		var simA = null;
		var simB = null;
		var blurH = null;
		var blurV = null;
		var U = {};
		var VERT = [
			"#version 300 es",
			"layout(location=0) in vec2 a_pos;",
			"out vec2 v_uv;",
			"void main(){ v_uv=a_pos*0.5+0.5; gl_Position=vec4(a_pos,0.0,1.0); }"
		].join("\n");
		var FRAG_SIM = [
			"#version 300 es",
			"precision highp float;",
			"in vec2 v_uv; out vec4 fc;",
			"uniform float u_time, u_slider, u_elapsed;",
			"uniform sampler2D u_back;",
			"float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }",
			"void main(){",
			"  vec2 uv=v_uv;",
			"  vec2 g=uv*vec2(72.0,6.0);",
			"  vec2 id=floor(g);",
			"  vec2 cf=fract(g);",
			"  float h=hash(id);",
			"  vec2 ap=abs(cf-0.5);",
			"  float cell=smoothstep(0.34,0.22,max(ap.x*0.9,ap.y));",
			"  vec3 prev=texture(u_back,uv).rgb;",
			"  float fade_mask = smoothstep(0.0, 0.45, uv.x);",
			"  vec3 decay = prev * 0.90 * fade_mask;",
			"  float act=smoothstep(0.95,1.0,u_slider);",
			"  if(act<0.01||u_elapsed<0.0){ fc=vec4(decay,1.0); return; }",
			"  float t=u_time;",
			"  float cellDelay = h * 1.2;",
			"  float cellAge   = max(u_elapsed - cellDelay, 0.0);",
			"  float ignited   = step(0.001, cellAge);",
			"  float cellSpd   = 0.85 + h * 0.30;",
			"  float eased = 1.0 - pow(1.0 - clamp(cellAge / 2.5, 0.0, 1.0), 3.0);",
			"  float dist  = eased * u_slider * cellSpd * ignited;",
			"  float cellOff = (h - 0.5) * 0.05;",
			"  float front   = max(u_slider - dist - cellOff, 0.02);",
			"  float tail    = max(u_slider - front, 0.001);",
			"  float inZ   = step(front - 0.003, uv.x) * step(uv.x, u_slider + 0.003);",
			"  float dn    = clamp(max(u_slider - uv.x, 0.0) / tail, 0.0, 1.0);",
			"  float bright = pow(1.0 - dn, 0.65);",
			"  bright = max(bright, 0.04 * ignited) * inZ;",
			"  bright *= 1.0 - smoothstep(0.94, 1.05, dn);",
			"  float es = mix(0.15, 0.5, min(u_elapsed / 1.0, 1.0));",
			"  float vy = abs(uv.y - 0.5) * 2.0;",
			"  float vf = pow(max(1.0 - vy * vy * 0.45, 0.0), 0.75);",
			"  float ts = mix(0.85, 1.0, min(u_elapsed / 1.5, 1.0));",
			"  float f1 = sin(uv.x * 30.0 + t * 15.0 * ts + h * 6.28);",
			"  float f2 = sin(uv.x * 17.0 + t * 8.0 * ts + h * 3.14);",
			"  float f3 = sin(uv.x * 52.0 + t * 25.0 * ts + h * 10.0);",
			"  float flame = smoothstep(0.08, 0.92, (f1 + f2 * 0.5 + f3 * 0.25) * 0.35 + 0.5);",
			"  float r1 = sin(dn * 16.0 - t * 5.0 * ts + h * 3.0);",
			"  float r2 = sin(dn * 8.0 - t * 2.5 * ts + h * 5.0);",
			"  float rhythm = smoothstep(-0.15, 0.55, r1) * (r2 * 0.5 + 0.5);",
			"  rhythm = pow(max(rhythm, 0.0), 1.2);",
			"  float avgSpd = dist / max(cellAge, 0.001);",
			"  float age    = max(cellAge - max(u_slider - uv.x, 0.0) / max(avgSpd, 0.001), 0.0);",
			"  float flash  = step(0.0, age) * exp(-age * 3.2);",
			"  float sp  = fract(t * (0.38 + h * 0.15) + h * 7.0);",
			"  float sX  = u_slider - sp * tail;",
			"  float sY  = 0.5 + sin(sp * 11.0 + h * 6.28) * 0.28;",
			"  float spark = smoothstep(0.014, 0.0, abs(uv.x - sX))",
			"              * smoothstep(0.18, 0.0, abs(uv.y - sY))",
			"              * (1.0 - sp) * (1.0 - sp) * es;",
			"  float energy = bright * vf * (flame * 0.42 + rhythm * 0.38)",
			"               + flash * bright * vf * 0.55",
			"               + spark * 0.7 * inZ;",
			"  energy *= es;",
			"  float edgeBase = exp(-pow((uv.x - front) * 18.0, 2.0));",
			"  float ef1 = sin(uv.x * 45.0 + t * 20.0 * ts + h * 6.28) * 0.5 + 0.5;",
			"  float ef2 = sin(uv.x * 28.0 + t * 11.0 * ts + h * 3.14) * 0.5 + 0.5;",
			"  float edge = edgeBase * (0.25 + ef1 * ef2 * 1.5) * 1.6 * act * es;",
			"  float leadD    = front - uv.x;",
			"  float leadZone = smoothstep(0.07, 0.0, leadD) * step(0.0, leadD) * vf;",
			"  float h2       = hash(id + vec2(99.0, 33.0));",
			"  float leadF    = sin(leadD * 100.0 + t * 20.0 * ts + h2 * 6.28) * 0.5 + 0.5;",
			"  float leadSpark = leadZone * step(0.6, h2) * leadF * act * es * 0.5;",
			"  float total = energy + edge + leadSpark;",
			"  vec3 ember = vec3(0.055, 0.145, 0.52);",
			"  vec3 wpur  = vec3(0.224, 0.392, 0.996);",
			"  vec3 wht   = vec3(0.62, 0.72, 1.0);",
			"  float temp = 1.0 - dn;",
			"  vec3 col   = mix(ember, wpur, temp);",
			"  col        = mix(col, wht, pow(temp, 4.5));",
			"  col       *= total;",
			"  float pulse = sin(t * 2.8) * 0.15 + 1.0;",
			"  float core  = exp(-pow((uv.x - u_slider) * 16.0, 2.0));",
			"  col += wht * core * 2.2 * pulse * act * es;",
			"  col += wpur * exp(-pow((uv.x - u_slider) * 3.5, 2.0)) * 0.14 * act * es;",
			"  col *= cell;",
			"  col *= fade_mask;",
			"  fc = vec4(min(decay + col, vec3(1.5)), 1.0);",
			"}"
		].join("\n");
		var FRAG_BLUR = [
			"#version 300 es",
			"precision highp float;",
			"in vec2 v_uv; out vec4 fc;",
			"uniform sampler2D u_tex;",
			"uniform vec2 u_dir, u_res;",
			"uniform float u_ext;",
			"vec3 s(vec2 uv){",
			"  vec3 c=texture(u_tex,uv).rgb;",
			"  return u_ext>0.5 && dot(c,vec3(0.2126,0.7152,0.0722))<0.3 ? vec3(0.0) : c;",
			"}",
			"void main(){",
			"  vec2 o=u_dir*1.8/u_res;",
			"  vec3 r=s(v_uv)*0.227027;",
			"  r+=s(v_uv+o)*0.194595;    r+=s(v_uv-o)*0.194595;",
			"  r+=s(v_uv+o*2.0)*0.121622;r+=s(v_uv-o*2.0)*0.121622;",
			"  r+=s(v_uv+o*3.0)*0.054054;r+=s(v_uv-o*3.0)*0.054054;",
			"  fc=vec4(r,1.0);",
			"}"
		].join("\n");
		var FRAG_COMP = [
			"#version 300 es",
			"precision highp float;",
			"in vec2 v_uv; out vec4 fc;",
			"uniform sampler2D u_scene, u_glow;",
			"uniform float u_light;",
			"void main(){",
			"  vec3 s=texture(u_scene,v_uv).rgb;",
			"  vec3 g=texture(u_glow,v_uv).rgb;",
			"  vec3 c;",
			"  float a;",
			"  if(u_light>0.5){",
			"    float peak=max(max(s.r,s.g),s.b);",
			"    float clean=pow(smoothstep(0.11,0.62,peak),1.35);",
			"    float halo=smoothstep(0.16,0.72,max(max(g.r,g.g),g.b))*0.22;",
			"    vec3 brand=vec3(0.224,0.392,0.996);",
			"    vec3 core=vec3(0.64,0.74,1.0);",
			"    c=mix(brand,core,smoothstep(0.62,1.05,peak)*0.48)*(clean+halo);",
			"    a=clamp(clean*0.92+halo*0.55,0.0,0.94);",
			"  }else{",
			"    c=1.0-exp(-(s+g*1.2+s*g*0.35)*1.15);",
			"    a=smoothstep(0.018,0.38,max(max(c.r,c.g),c.b));",
			"  }",
			"  fc=vec4(c*a,a);",
			"}"
		].join("\n");
		function compileShader(type, src) {
			var sh = gl.createShader(type);
			gl.shaderSource(sh, src);
			gl.compileShader(sh);
			if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
				gl.deleteShader(sh);
				return null;
			}
			return sh;
		}
		function linkProgram(vsSrc, fsSrc) {
			var v = compileShader(gl.VERTEX_SHADER, vsSrc);
			var f = compileShader(gl.FRAGMENT_SHADER, fsSrc);
			if (!v || !f) return null;
			var p = gl.createProgram();
			gl.attachShader(p, v);
			gl.attachShader(p, f);
			gl.bindAttribLocation(p, 0, "a_pos");
			gl.linkProgram(p);
			gl.deleteShader(v);
			gl.deleteShader(f);
			if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
				gl.deleteProgram(p);
				return null;
			}
			return p;
		}
		function compilePrograms() {
			ready = false;
			simProg = linkProgram(VERT, FRAG_SIM);
			blurProg = linkProgram(VERT, FRAG_BLUR);
			compProg = linkProgram(VERT, FRAG_COMP);
			if (!simProg || !blurProg || !compProg) return;
			vao = gl.createVertexArray();
			gl.bindVertexArray(vao);
			vbo = gl.createBuffer();
			gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
			gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
				-1,
				-1,
				1,
				-1,
				-1,
				1,
				-1,
				1,
				1,
				-1,
				1,
				1
			]), gl.STATIC_DRAW);
			gl.enableVertexAttribArray(0);
			gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
			U.simTime = gl.getUniformLocation(simProg, "u_time");
			U.simSlider = gl.getUniformLocation(simProg, "u_slider");
			U.simElapsed = gl.getUniformLocation(simProg, "u_elapsed");
			U.simBack = gl.getUniformLocation(simProg, "u_back");
			U.blurDir = gl.getUniformLocation(blurProg, "u_dir");
			U.blurExt = gl.getUniformLocation(blurProg, "u_ext");
			U.blurTex = gl.getUniformLocation(blurProg, "u_tex");
			U.blurRes = gl.getUniformLocation(blurProg, "u_res");
			U.compScene = gl.getUniformLocation(compProg, "u_scene");
			U.compGlow = gl.getUniformLocation(compProg, "u_glow");
			U.compLight = gl.getUniformLocation(compProg, "u_light");
			ready = true;
		}
		function makeFBO() {
			var fbo = gl.createFramebuffer();
			var tex = gl.createTexture();
			gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
			gl.bindTexture(gl.TEXTURE_2D, tex);
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, canvasEl.width, canvasEl.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
			gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
			gl.clearColor(0, 0, 0, 1);
			gl.clear(gl.COLOR_BUFFER_BIT);
			return {
				fbo,
				tex
			};
		}
		function createFBOs() {
			simA = makeFBO();
			simB = makeFBO();
			blurH = makeFBO();
			blurV = makeFBO();
		}
		function destroyFBO(entry) {
			if (entry) {
				gl.deleteFramebuffer(entry.fbo);
				gl.deleteTexture(entry.tex);
			}
		}
		function destroyFBOs() {
			destroyFBO(simA);
			simA = null;
			destroyFBO(simB);
			simB = null;
			destroyFBO(blurH);
			blurH = null;
			destroyFBO(blurV);
			blurV = null;
		}
		function destroyPrograms() {
			if (simProg) {
				gl.deleteProgram(simProg);
				simProg = null;
			}
			if (blurProg) {
				gl.deleteProgram(blurProg);
				blurProg = null;
			}
			if (compProg) {
				gl.deleteProgram(compProg);
				compProg = null;
			}
			if (vao) {
				gl.deleteVertexArray(vao);
				vao = null;
			}
			if (vbo) {
				gl.deleteBuffer(vbo);
				vbo = null;
			}
			ready = false;
		}
		function resize() {
			var rect = canvasEl.getBoundingClientRect();
			if (!rect.width || !rect.height) return;
			var dpr = window.devicePixelRatio || 1;
			canvasEl.width = Math.max(1, Math.round(rect.width * dpr));
			canvasEl.height = Math.max(1, Math.round(rect.height * dpr));
			destroyFBOs();
			createFBOs();
		}
		function ensureLoop() {
			if (loopRunning) {
				idleFrames = 0;
				return;
			}
			if (!simA || !simB) {
				resize();
				if (!simA || !simB) return;
			}
			loopRunning = true;
			idleFrames = 0;
			wasActive = false;
			gl.bindFramebuffer(gl.FRAMEBUFFER, simA.fbo);
			gl.clear(gl.COLOR_BUFFER_BIT);
			gl.bindFramebuffer(gl.FRAMEBUFFER, simB.fbo);
			gl.clear(gl.COLOR_BUFFER_BIT);
			rafId = requestAnimationFrame(render);
		}
		function isActiveNow() {
			var lv = uiLevels[uiIdx];
			return slotActive && !!lv && lv.isMax && !document.hidden;
		}
		function render(t) {
			var active = isActiveNow();
			if (!active && !wasActive) {
				if (++idleFrames > MAX_IDLE) {
					loopRunning = false;
					rafId = null;
					return;
				}
				rafId = requestAnimationFrame(render);
				return;
			}
			idleFrames = 0;
			if (active && !wasActive) {
				activeStart = performance.now();
				gl.bindFramebuffer(gl.FRAMEBUFFER, simA.fbo);
				gl.clear(gl.COLOR_BUFFER_BIT);
				gl.bindFramebuffer(gl.FRAMEBUFFER, simB.fbo);
				gl.clear(gl.COLOR_BUFFER_BIT);
			}
			wasActive = active;
			var elapsed = active ? (performance.now() - (activeStart || 0)) / 1e3 : -1;
			gl.viewport(0, 0, canvasEl.width, canvasEl.height);
			gl.bindFramebuffer(gl.FRAMEBUFFER, simB.fbo);
			gl.useProgram(simProg);
			gl.uniform1f(U.simTime, t * .001);
			gl.uniform1f(U.simSlider, 1);
			gl.uniform1f(U.simElapsed, elapsed);
			gl.activeTexture(gl.TEXTURE0);
			gl.bindTexture(gl.TEXTURE_2D, simA.tex);
			gl.uniform1i(U.simBack, 0);
			gl.drawArrays(gl.TRIANGLES, 0, 6);
			gl.useProgram(blurProg);
			gl.uniform2f(U.blurRes, canvasEl.width, canvasEl.height);
			gl.bindFramebuffer(gl.FRAMEBUFFER, blurH.fbo);
			gl.uniform2f(U.blurDir, 1, 0);
			gl.uniform1f(U.blurExt, 1);
			gl.bindTexture(gl.TEXTURE_2D, simB.tex);
			gl.uniform1i(U.blurTex, 0);
			gl.drawArrays(gl.TRIANGLES, 0, 6);
			gl.bindFramebuffer(gl.FRAMEBUFFER, blurV.fbo);
			gl.uniform2f(U.blurDir, 0, 1);
			gl.uniform1f(U.blurExt, 0);
			gl.bindTexture(gl.TEXTURE_2D, blurH.tex);
			gl.drawArrays(gl.TRIANGLES, 0, 6);
			gl.bindFramebuffer(gl.FRAMEBUFFER, null);
			gl.useProgram(compProg);
			gl.activeTexture(gl.TEXTURE0);
			gl.bindTexture(gl.TEXTURE_2D, simB.tex);
			gl.uniform1i(U.compScene, 0);
			gl.activeTexture(gl.TEXTURE1);
			gl.bindTexture(gl.TEXTURE_2D, blurV.tex);
			gl.uniform1i(U.compGlow, 1);
			gl.uniform1f(U.compLight, document.body && !document.body.hasAttribute("data-ds-dark-theme") ? 1 : 0);
			gl.drawArrays(gl.TRIANGLES, 0, 6);
			var tmp = simA;
			simA = simB;
			simB = tmp;
			rafId = requestAnimationFrame(render);
		}
		var glCtx = null;
		try {
			glCtx = canvasEl.getContext("webgl2", {
				preserveDrawingBuffer: false,
				antialias: false,
				alpha: true,
				premultipliedAlpha: true
			});
		} catch (err) {
			glCtx = null;
		}
		if (!glCtx) {
			canvasEl.style.display = "none";
			return { ok: false };
		}
		gl = glCtx;
		var onLost = function(e) {
			e.preventDefault();
		};
		var onRestored = function() {
			compilePrograms();
			if (ready) {
				resize();
				if (isActiveNow()) ensureLoop();
			}
		};
		canvasEl.addEventListener("webglcontextlost", onLost);
		canvasEl.addEventListener("webglcontextrestored", onRestored);
		compilePrograms();
		if (!ready) {
			canvasEl.style.display = "none";
			return { ok: false };
		}
		if (typeof ResizeObserver === "function") {
			ro = new ResizeObserver(function() {
				clearTimeout(resizeTimer);
				resizeTimer = setTimeout(resize, 80);
			});
			ro.observe(canvasEl);
		}
		resize();
		return {
			ok: true,
			kick: function() {
				if (ready && slotActive) ensureLoop();
			},
			dispose: function() {
				if (rafId) cancelAnimationFrame(rafId);
				if (ro) ro.disconnect();
				clearTimeout(resizeTimer);
				loopRunning = false;
				destroyFBOs();
				destroyPrograms();
				canvasEl.removeEventListener("webglcontextlost", onLost);
				canvasEl.removeEventListener("webglcontextrestored", onRestored);
			}
		};
	}
	var slot = el("div", "");
	slot.setAttribute("data-dse-slot", "");
	var statusEl = el("span", "dse-h-status");
	var h = el("div", "dse-h");
	h.appendChild(el("span", "dse-h-label", "推理等级"));
	h.appendChild(statusEl);
	var scale = el("div", "dse-scale");
	scale.appendChild(el("span", "", "更快"));
	scale.appendChild(el("span", "", "更强"));
	var track = el("div", "dse-track");
	var canvas = el("canvas", "dse-canvas");
	var dots = el("div", "dse-dots");
	var slider = el("input", "");
	slider.type = "range";
	slider.min = "0";
	slider.max = "100";
	slider.step = "1";
	slider.value = "50";
	slider.setAttribute("aria-label", "推理等级滑块");
	track.appendChild(el("div", "dse-track-bg"));
	track.appendChild(dots);
	track.appendChild(canvas);
	track.appendChild(slider);
	var levelRow = el("div", "dse-levels");
	var nav = el("div", "dse-nav");
	var foot = el("div", "dse-foot");
	var backBtn = el("button", "dse-f-btn", "返回");
	backBtn.type = "button";
	var resetBtn = el("button", "dse-f-btn", "恢复默认");
	resetBtn.type = "button";
	var footMsg = el("span", "");
	var actions = el("span", "dse-actions");
	actions.appendChild(resetBtn);
	nav.appendChild(backBtn);
	nav.appendChild(actions);
	foot.appendChild(footMsg);
	slot.appendChild(nav);
	slot.appendChild(h);
	slot.appendChild(scale);
	slot.appendChild(track);
	slot.appendChild(levelRow);
	slot.appendChild(foot);
	var dotNodes = dots.children;
	var slotActive = false;
	var rows = [];
	var defaultRow = null;
	var labels = [];
	var uiLevels = [];
	var uiIdx = -1;
	var checkedRow = null;
	var dragging = false;
	var activePointerId = null;
	var movedSinceCommit = false;
	var fire = null;
	var suppressObserve = false;
	var seatIntent = typeof WeakMap === "function" ? /* @__PURE__ */ new WeakMap() : null;
	function flip() {
		statusEl.classList.remove("dse-animate");
		statusEl.offsetWidth;
		statusEl.classList.add("dse-animate");
	}
	function segs() {
		return Math.max(1, uiLevels.length - 1);
	}
	function paint(animate, preserveThumb) {
		var isUltra = !!uiLevels[uiIdx] && uiLevels[uiIdx].isMax;
		slot.classList.toggle("dse-ultra", isUltra);
		track.classList.toggle("dse-ultra", isUltra);
		if (uiIdx >= 0 && uiIdx < uiLevels.length) {
			var lv = uiLevels[uiIdx];
			statusEl.textContent = lv.label;
			statusEl.classList.remove("dse-glowing", "dse-low-glow", "dse-mid-glow", "dse-default");
			if (isUltra) statusEl.classList.add("dse-glowing");
			else if (uiLevels.length === 4 && uiIdx === 1) statusEl.classList.add("dse-low-glow");
			else if (uiLevels.length === 4 && uiIdx === 2) statusEl.classList.add("dse-mid-glow");
			if (animate) flip();
			if (!preserveThumb) slider.value = String(Math.round(uiIdx * 100 / segs()));
			slider.setAttribute("aria-valuetext", lv.label);
		} else {
			statusEl.textContent = defaultRow && checkedRow === defaultRow ? "Default · 跟随模型" : "";
			statusEl.classList.add("dse-default");
			statusEl.classList.remove("dse-glowing", "dse-low-glow", "dse-mid-glow");
			if (uiLevels.length > 0) {
				var fallback = Math.min(2, uiLevels.length - 1);
				slider.value = String(Math.round(fallback * 100 / segs()));
			}
		}
		var lit = uiIdx;
		for (var i = 0; i < dotNodes.length; i++) {
			dotNodes[i].classList.toggle("dse-dot-on", i <= lit);
			dotNodes[i].classList.toggle("dse-dot-ultra", isUltra && i === dotNodes.length - 1);
		}
		var spans = levelRow.children;
		for (var j = 0; j < spans.length; j++) {
			var on = uiIdx === j;
			spans[j].classList.toggle("dse-on", on);
			spans[j].classList.toggle("dse-a-low", on && j === 1);
			spans[j].classList.toggle("dse-a-mid", on && j === 2);
			spans[j].classList.toggle("dse-a-max", on && j === 3);
		}
		resetBtn.style.display = defaultRow ? "" : "none";
		if (fire && fire.ok && isUltra && slotActive) fire.kick();
	}
	function setFoot(msg, kind) {
		footMsg.textContent = msg || "";
		footMsg.className = kind === "err" ? "dse-f-err" : kind === "busy" ? "dse-f-busy" : "";
		foot.style.display = msg && kind === "err" ? "flex" : "none";
	}
	function isChecked(btn) {
		return btn && (btn.getAttribute("aria-checked") === "true" || btn.classList.contains("dse-sel"));
	}
	function selectNativeRowKeepingOpen(btn) {
		if (!btn || !btn.isConnected || btn.disabled) return false;
		setFoot("正在应用…", "busy");
		var originalThen = Promise.prototype.then;
		var intercepted = false;
		Promise.prototype.then = function(onFulfilled, onRejected) {
			var source = "";
			try {
				source = typeof onFulfilled === "function" ? Function.prototype.toString.call(onFulfilled) : "";
			} catch (err) {}
			if (!intercepted && /closeAfterSelection/.test(source) && /\.ok/.test(source)) {
				intercepted = true;
				return originalThen.call(this, function(result) {
					if (!result || !result.ok) return onFulfilled(result);
					setFoot("已应用");
				}, onRejected);
			}
			return originalThen.call(this, onFulfilled, onRejected);
		};
		try {
			btn.dispatchEvent(new MouseEvent("click", {
				bubbles: true,
				cancelable: true,
				view: window
			}));
		} catch (err) {
			try {
				btn.click();
			} catch (err2) {
				return false;
			}
		} finally {
			Promise.prototype.then = originalThen;
		}
		if (!intercepted) setFoot("正在应用…", "busy");
		return true;
	}
	function collectRows(menu) {
		var radios = menu.querySelectorAll("button[role=\"menuitemradio\"]");
		var out = {
			rows: [],
			defaultRow: null
		};
		for (var i = 0; i < radios.length; i++) {
			if (radios[i].closest && radios[i].closest("[role=\"menu\"]") !== menu) continue;
			var lbl = rowLabel(radios[i]);
			if (!lbl) continue;
			if (/^default$/i.test(lbl)) {
				if (!out.defaultRow) out.defaultRow = radios[i];
				continue;
			}
			out.rows.push(radios[i]);
		}
		if (out.rows.length > 1 && out.rows.every(function(row) {
			return effortId(row) !== null;
		})) out.rows.sort(function(a, b) {
			return EFFORT_ORDER[effortId(a)] - EFFORT_ORDER[effortId(b)];
		});
		return out;
	}
	function syncFromDom(menu) {
		var c = collectRows(menu);
		if (!(c.rows.length >= 1 || !!c.defaultRow)) return false;
		defaultRow = c.defaultRow;
		rows = c.rows;
		labels = rows.map(rowLabel);
		uiLevels = labels.map(function(lbl, idx) {
			var id = effortId(rows[idx]);
			return {
				id,
				label: lbl,
				isMax: id === "max" || !id && idx === rows.length - 1
			};
		});
		dots.innerHTML = "";
		levelRow.innerHTML = "";
		uiLevels.forEach(function(lv, idx) {
			var fraction = uiLevels.length > 1 ? idx / (uiLevels.length - 1) : .5;
			var position = "calc(" + fraction * 100 + "% + " + (14.5 - fraction * 29) + "px)";
			var dot = el("span", "dse-dot");
			dot.style.left = position;
			dots.appendChild(dot);
			var s = el("span", "", lv.label);
			s.style.left = position;
			levelRow.appendChild(s);
		});
		checkedRow = null;
		for (var i = 0; i < c.rows.length; i++) if (isChecked(c.rows[i])) {
			checkedRow = c.rows[i];
			uiIdx = i;
			break;
		}
		if (checkedRow === null && defaultRow && isChecked(defaultRow)) {
			checkedRow = defaultRow;
			uiIdx = -1;
			fetchDefaultEffort();
		}
		if (checkedRow === null && c.rows.length > 0) uiIdx = Math.min(2, c.rows.length - 1);
		paint(false);
		return true;
	}
	var hideList = [];
	var lockedMenu = null;
	var lockedMenuZ = null;
	function lockMenuPosition(menu, rect) {
		if (!menu || !rect) return;
		if (lockedMenu && lockedMenu !== menu) unlockMenuPosition();
		lockedMenu = menu;
		if (lockedMenuZ === null) lockedMenuZ = {
			value: menu.style.getPropertyValue("z-index"),
			priority: menu.style.getPropertyPriority("z-index")
		};
		menu.style.setProperty("--dse-lock-left", Math.round(rect.left) + "px");
		menu.style.setProperty("--dse-lock-top", Math.round(rect.top) + "px");
		menu.style.setProperty("z-index", "2147483000", "important");
		menu.setAttribute("data-dse-position-lock", "");
	}
	function unlockMenuPosition() {
		if (!lockedMenu) return;
		try {
			lockedMenu.removeAttribute("data-dse-position-lock");
			lockedMenu.style.removeProperty("--dse-lock-left");
			lockedMenu.style.removeProperty("--dse-lock-top");
			if (lockedMenuZ && lockedMenuZ.value) lockedMenu.style.setProperty("z-index", lockedMenuZ.value, lockedMenuZ.priority);
			else lockedMenu.style.removeProperty("z-index");
		} catch (err) {}
		lockedMenu = null;
		lockedMenuZ = null;
	}
	function hideRow(node) {
		if (!node || node.__dseHidden) return;
		node.__dseHidden = true;
		hideList.push({
			node,
			prev: node.style.display
		});
		node.style.display = "none";
	}
	function mount(menu) {
		if (slotActive) unmount();
		if (!menu || !menu.isConnected) return;
		var c = collectRows(menu);
		if (c.rows.length === 0 && !c.defaultRow) return;
		var openingRect = menu.getBoundingClientRect ? menu.getBoundingClientRect() : null;
		suppressObserve = true;
		try {
			var foreign = menu.querySelector(":scope > [data-dse-slot]");
			if (foreign && foreign !== slot) try {
				foreign.parentNode.removeChild(foreign);
			} catch (err) {}
			if (slot.parentNode && slot.parentNode !== menu) try {
				slot.parentNode.removeChild(slot);
			} catch (err) {}
			menu.appendChild(slot);
			var focusedNode = document.activeElement;
			var focusedNativeRow = focusedNode === c.defaultRow;
			for (var fi = 0; !focusedNativeRow && fi < c.rows.length; fi++) focusedNativeRow = c.rows[fi] === focusedNode;
			if (focusedNativeRow) try {
				slider.focus({ preventScroll: true });
			} catch (err) {
				try {
					slider.focus();
				} catch (err2) {}
			}
			for (var i = 0; i < c.rows.length; i++) hideRow(c.rows[i]);
			if (c.defaultRow) hideRow(c.defaultRow);
			var positionedRect = openingRect;
			var menuId = menu.getAttribute && menu.getAttribute("id");
			if (menuId && openingRect) {
				var triggers = document.querySelectorAll("button[aria-haspopup=\"menu\"][aria-controls]");
				for (var ti = 0; ti < triggers.length; ti++) {
					if (triggers[ti].getAttribute("aria-controls") !== menuId) continue;
					var triggerRect = triggers[ti].getBoundingClientRect();
					var menuHeight = menu.getBoundingClientRect ? menu.getBoundingClientRect().height : menu.offsetHeight;
					var top = Math.max(12, triggerRect.top - 8 - menuHeight);
					positionedRect = {
						left: openingRect.left,
						top
					};
					break;
				}
			}
			lockMenuPosition(menu, positionedRect);
			slotActive = true;
			if (!syncFromDom(menu)) {
				unmount();
				return;
			}
			if (fire === null) try {
				fire = createFire(canvas);
				if (fire && fire.ok) paint(false);
			} catch (err) {
				fire = { ok: false };
			}
			else if (fire && fire.ok && uiIdx === uiLevels.length - 1 && uiLevels.length === 4) fire.kick();
		} finally {
			suppressObserve = false;
		}
	}
	function unmount() {
		abortDrag();
		suppressObserve = true;
		try {
			if (slot.parentNode) slot.parentNode.removeChild(slot);
		} catch (err) {}
		unlockMenuPosition();
		for (var i = 0; i < hideList.length; i++) {
			var item = hideList[i];
			try {
				if (item.node && item.node.isConnected) item.node.style.display = item.prev;
			} catch (err) {}
			try {
				delete item.node.__dseHidden;
			} catch (err) {}
		}
		hideList = [];
		slotActive = false;
		rows = [];
		defaultRow = null;
		checkedRow = null;
		uiIdx = -1;
		suppressObserve = false;
	}
	var defCache = {
		at: 0,
		effort: null
	};
	var fetchEpoch = 0;
	function fetchDefaultEffort() {
		var now = Date.now();
		if (defCache.at && now - defCache.at < 6e4) {
			applyDefaultEffort(defCache.effort);
			return;
		}
		fetchEpoch++;
		var epoch = fetchEpoch;
		fetch(STATE_URL, { credentials: "same-origin" }).then(function(r) {
			return r.json();
		}).then(function(d) {
			if (!d || !d.ok) return;
			var effort = d.capability && d.capability.defaultEffort ? d.capability.defaultEffort : null;
			defCache = {
				at: now,
				effort
			};
			if (epoch !== fetchEpoch) return;
			if (dragging || !slotActive || checkedRow !== defaultRow) return;
			applyDefaultEffort(effort);
		}).catch(function() {});
	}
	function applyDefaultEffort(id) {
		if (!slotActive || dragging || checkedRow !== defaultRow) return;
		if (!id) return;
		var want = -1;
		for (var i = 0; i < uiLevels.length; i++) if (uiLevels[i].id === id) {
			want = i;
			break;
		}
		if (want < 0) return;
		uiIdx = want;
		paint(false);
	}
	var snapRaf = 0;
	function cancelSnap() {
		if (!snapRaf) return;
		cancelAnimationFrame(snapRaf);
		snapRaf = 0;
	}
	function animateSnap(targetValue, done) {
		cancelSnap();
		var from = Number(slider.value);
		var distance = Math.abs(targetValue - from);
		if (distance < .1) {
			slider.value = String(targetValue);
			done();
			return;
		}
		var startedAt = performance.now();
		var duration = Math.min(240, 140 + distance * 1.2);
		function frame(now) {
			var progress = clamp((now - startedAt) / duration, 0, 1);
			var eased = 1 - Math.pow(1 - progress, 3);
			slider.value = String(from + (targetValue - from) * eased);
			if (progress < 1 && slotActive) {
				snapRaf = requestAnimationFrame(frame);
				return;
			}
			snapRaf = 0;
			slider.value = String(targetValue);
			if (slotActive) done();
		}
		snapRaf = requestAnimationFrame(frame);
	}
	function releaseDragPointer() {
		if (activePointerId === null) return;
		try {
			if (slider.hasPointerCapture && slider.hasPointerCapture(activePointerId)) slider.releasePointerCapture(activePointerId);
		} catch (err) {}
		activePointerId = null;
	}
	function abortDrag() {
		cancelSnap();
		releaseDragPointer();
		dragging = false;
		movedSinceCommit = false;
	}
	slider.addEventListener("pointerdown", function(event) {
		cancelSnap();
		activePointerId = event.pointerId;
		dragging = true;
		try {
			slider.setPointerCapture(event.pointerId);
		} catch (err) {}
	});
	slider.addEventListener("input", function() {
		cancelSnap();
		dragging = true;
		movedSinceCommit = true;
		fetchEpoch++;
		var idx = uiLevels.length === 0 ? -1 : clamp(Math.round(Number(slider.value) * segs() / 100), 0, uiLevels.length - 1);
		if (idx !== uiIdx) {
			uiIdx = idx;
			paint(true, true);
		} else paint(false, true);
	});
	var committedAt = 0;
	function commit() {
		dragging = false;
		if (!slotActive) return;
		if (!movedSinceCommit) return;
		movedSinceCommit = false;
		if (Date.now() - committedAt < 350) return;
		if (uiIdx < 0 || uiIdx >= rows.length) return;
		var targetValue = Math.round(uiIdx * 100 / segs());
		var target = rows[uiIdx];
		animateSnap(targetValue, function() {
			if (target === checkedRow && checkedRow) return;
			if (!target || !target.isConnected) {
				setFoot("界面已更新，请重新选择", "err");
				return;
			}
			if (selectNativeRowKeepingOpen(target)) committedAt = Date.now();
		});
	}
	slider.addEventListener("change", commit);
	slider.addEventListener("keyup", commit);
	slider.addEventListener("pointerup", function() {
		releaseDragPointer();
		commit();
	});
	slider.addEventListener("pointercancel", abortDrag);
	var finishOrphanedDrag = function(event) {
		if (activePointerId === null || event.pointerId !== activePointerId) return;
		releaseDragPointer();
		dragging = false;
		movedSinceCommit = false;
	};
	var abortDragOnBlur = function() {
		abortDrag();
	};
	window.addEventListener("pointerup", finishOrphanedDrag);
	window.addEventListener("pointercancel", finishOrphanedDrag);
	window.addEventListener("blur", abortDragOnBlur);
	resetBtn.addEventListener("click", function() {
		if (!defaultRow) return;
		selectNativeRowKeepingOpen(defaultRow);
	});
	backBtn.addEventListener("mousedown", function(event) {
		event.preventDefault();
	});
	backBtn.addEventListener("click", function() {
		var menu = slot.parentNode;
		var root = menu && menu.parentElement;
		var trigger = null;
		var menuId = menu && menu.getAttribute ? menu.getAttribute("id") : null;
		if (menuId && document.querySelectorAll) {
			var candidates = document.querySelectorAll("button[aria-haspopup=\"menu\"]");
			for (var i = 0; i < candidates.length; i++) if (candidates[i].getAttribute("aria-controls") === menuId) {
				trigger = candidates[i];
				break;
			}
		}
		if (!trigger && root && root.querySelector) trigger = root.querySelector("button[aria-haspopup=\"menu\"]");
		if (trigger && typeof trigger.focus === "function") trigger.focus();
		if (trigger) {
			unmount();
			try {
				trigger.click();
			} catch (err) {
				return;
			}
			setTimeout(function() {
				if (!trigger.isConnected) return;
				try {
					trigger.click();
				} catch (err) {}
			}, 50);
		} else setFoot("无法返回，请按 Esc", "err");
	});
	function canonicalCount(menu) {
		var c = collectRows(menu);
		var n = 0;
		for (var i = 0; i < c.rows.length; i++) if (effortId(c.rows[i]) !== null) n++;
		return n;
	}
	function isVisibleMenu(menu) {
		if (!menu || !menu.isConnected || menu.hidden) return false;
		try {
			return !menu.getClientRects || menu.getClientRects().length > 0;
		} catch (err) {
			return true;
		}
	}
	function anchoredToComposer(menu) {
		try {
			if (menu.closest && menu.closest("[data-composer-card]")) return true;
			var menuId = menu.getAttribute && menu.getAttribute("id");
			if (menuId && document.querySelectorAll) {
				var triggers = document.querySelectorAll("button[aria-haspopup=\"menu\"][aria-expanded=\"true\"]");
				for (var i = 0; i < triggers.length; i++) {
					if (triggers[i].getAttribute("aria-controls") !== menuId) continue;
					if (triggers[i].closest && triggers[i].closest("[data-composer-card]")) return true;
					var triggerName = (triggers[i].getAttribute("aria-label") || text(triggers[i])).toLowerCase();
					var menuName = (menu.getAttribute("aria-label") || "").toLowerCase();
					if (/推理等级|模型与推理等级|reasoning effort/.test(triggerName) || /模型与推理等级|model and reasoning effort/.test(menuName)) return true;
				}
			}
			if (document.querySelector && !document.querySelector("[data-composer-card]")) return true;
		} catch (err) {}
		return false;
	}
	function isComposerSeatMenu(menu) {
		if (canonicalCount(menu) >= 2) return anchoredToComposer(menu);
		var intent = false;
		if (seatIntent) try {
			intent = Date.now() - (seatIntent.get(menu) || 0) < 6e4;
		} catch (err) {}
		var c = collectRows(menu);
		if (intent) return c.rows.length > 0 || !!c.defaultRow;
		if (!c.defaultRow || c.rows.length === 0) return false;
		return anchoredToComposer(menu);
	}
	var onIntentClick = function(e) {
		if (window.__dshEffortSliderToken !== TOKEN) return;
		var t = e.target;
		var btn = t && t.closest ? t.closest("button") : null;
		if (!btn) return;
		var menu = btn.closest("[role=\"menu\"]");
		if (!menu) return;
		var txt = text(btn);
		if (/推理等级/.test(txt) || /^effort/i.test(txt.replace(/^\s+/, ""))) {
			if (seatIntent) try {
				seatIntent.set(menu, Date.now());
			} catch (err) {}
		}
	};
	document.addEventListener("click", onIntentClick, true);
	function refreshMounted(menu) {
		suppressObserve = true;
		try {
			var kept = [];
			for (var i = 0; i < hideList.length; i++) {
				var item = hideList[i];
				if (item.node && item.node.isConnected) kept.push(item);
				else try {
					delete item.node.__dseHidden;
				} catch (err) {}
			}
			hideList = kept;
			var current = collectRows(menu);
			for (var j = 0; j < current.rows.length; j++) hideRow(current.rows[j]);
			if (current.defaultRow) hideRow(current.defaultRow);
			syncFromDom(menu);
		} finally {
			suppressObserve = false;
		}
	}
	function resyncIfChanged(menu) {
		var c = collectRows(menu);
		var changed = c.rows.length !== rows.length || !!c.defaultRow !== !!defaultRow;
		if (!changed) {
			for (var i = 0; i < rows.length; i++) if (!rows[i] || !rows[i].isConnected) {
				changed = true;
				break;
			}
		}
		if (!changed) {
			for (var j = 0; j < rows.length; j++) if (rowLabel(c.rows[j]) !== labels[j]) {
				changed = true;
				break;
			}
			if (!changed) {
				var ck = -1;
				var cur = -1;
				for (var a = 0; a < c.rows.length; a++) if (isChecked(c.rows[a])) {
					ck = a;
					break;
				}
				for (var b = 0; b < rows.length; b++) if (isChecked(rows[b])) {
					cur = b;
					break;
				}
				if (ck !== cur) changed = true;
			}
		}
		if (changed) refreshMounted(menu);
	}
	function mountedMenuIsOpen(menu) {
		if (!menu || !menu.isConnected) return false;
		var menuId = menu.getAttribute && menu.getAttribute("id");
		if (menuId) {
			var triggers = document.querySelectorAll("button[aria-haspopup=\"menu\"]");
			for (var i = 0; i < triggers.length; i++) {
				if (triggers[i].getAttribute("aria-controls") !== menuId) continue;
				return triggers[i].getAttribute("aria-expanded") === "true";
			}
		}
		return isVisibleMenu(menu) && isComposerSeatMenu(menu);
	}
	function reconcileMenus() {
		if (suppressObserve) return;
		if (window.__dshEffortSliderToken !== TOKEN) {
			if (slotActive) unmount();
			return;
		}
		if (slotActive && slot.parentNode) {
			var host = slot.parentNode;
			if (dragging && host.isConnected || mountedMenuIsOpen(host)) {
				if (!dragging) resyncIfChanged(host);
				var lv = uiLevels[uiIdx];
				if (fire && fire.ok && lv && lv.isMax) fire.kick();
				return;
			}
			unmount();
		}
		if (!document.body) return;
		var menus = document.querySelectorAll("div[role=\"menu\"], ul[role=\"menu\"], [role=\"menu\"]");
		var best = null;
		for (var i = 0; i < menus.length; i++) {
			var m = menus[i];
			if (!isVisibleMenu(m)) continue;
			if (m === slot.parentNode) continue;
			if (isComposerSeatMenu(m)) {
				best = m;
				break;
			}
		}
		if (best) mount(best);
	}
	var mo = new MutationObserver(function() {
		reconcileMenus();
	});
	if (document.body) mo.observe(document.body, {
		childList: true,
		subtree: true,
		attributes: true,
		attributeFilter: [
			"aria-checked",
			"aria-disabled",
			"disabled"
		]
	});
	else {
		var onReady = function() {
			mo.observe(document.body, {
				childList: true,
				subtree: true,
				attributes: true,
				attributeFilter: [
					"aria-checked",
					"aria-disabled",
					"disabled"
				]
			});
		};
		document.addEventListener("DOMContentLoaded", onReady);
	}
	var scanTimer = setInterval(reconcileMenus, 800);
	var disposed = false;
	var onBeforeUnload = function() {
		dispose();
	};
	function dispose() {
		if (disposed) return;
		disposed = true;
		document.removeEventListener("click", onIntentClick, true);
		document.removeEventListener("DOMContentLoaded", onReady);
		window.removeEventListener("beforeunload", onBeforeUnload);
		window.removeEventListener("pointerup", finishOrphanedDrag);
		window.removeEventListener("pointercancel", finishOrphanedDrag);
		window.removeEventListener("blur", abortDragOnBlur);
		clearInterval(scanTimer);
		try {
			mo.disconnect();
		} catch (err) {}
		unmount();
		if (fire && typeof fire.dispose === "function") {
			try {
				fire.dispose();
			} catch (err) {}
			fire = null;
		}
		if (window.__dshEffortSliderToken === TOKEN) {
			window.__dshEffortSliderToken = null;
			window.__dshEffortSliderV2 = false;
		}
	}
	window.addEventListener("beforeunload", onBeforeUnload);
	return dispose;
}
//#endregion
//#region src/client/index.js
var name = "effort-slider";
var inject = [];
function apply(ctx) {
	const dispose = mountDshEffortSliderWidget();
	ctx.effect(() => dispose);
}
//#endregion
exports.apply = apply;
exports.inject = inject;
exports.name = name;

  return module.exports
} })
