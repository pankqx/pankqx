/* Version 2 · the only script visitors load. Two jobs: the soft light behind the hero, and the visitor number. */
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- the glow: a tiny WebGL shader. If WebGL is missing, the page simply stays plain. ---------- */
  const canvas = document.getElementById('glow');
  const gl = canvas && canvas.getContext('webgl', { antialias: false, alpha: true });
  if (gl) {
    const dark = matchMedia('(prefers-color-scheme: dark)');
    const vert = 'attribute vec2 p; void main(){ gl_Position = vec4(p, 0., 1.); }';
    const frag = `precision mediump float;
      uniform vec2 r; uniform float t; uniform float d;
      float blob(vec2 uv, vec2 c, float s){ return exp(-dot(uv - c, uv - c) / s); }
      void main(){
        vec2 uv = gl_FragCoord.xy / r; uv.x *= r.x / r.y;
        float a = r.x / r.y;
        float o = blob(uv, vec2(a * (.72 + .10 * sin(t * .21)), .78 + .08 * cos(t * .17)), .10);   // orange
        float b = blob(uv, vec2(a * (.30 + .12 * cos(t * .13)), .62 + .10 * sin(t * .19)), .14);   // blue
        float v = blob(uv, vec2(a * (.52 + .16 * sin(t * .09)), .95), .08);                        // violet
        vec3 col = o * vec3(1., .31, .11) + b * vec3(.20, .42, 1.) + v * vec3(.62, .30, .95);
        float alpha = clamp(o + b + v, 0., 1.) * mix(.13, .34, d);
        gl_FragColor = vec4(col * alpha, alpha);
      }`;
    const shader = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
    const prog = gl.createProgram();
    gl.attachShader(prog, shader(gl.VERTEX_SHADER, vert));
    gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, frag));
    gl.linkProgram(prog);
    if (gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      gl.useProgram(prog);
      gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);   // one big triangle covers the canvas
      const loc = gl.getAttribLocation(prog, 'p');
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      const uR = gl.getUniformLocation(prog, 'r'), uT = gl.getUniformLocation(prog, 't'), uD = gl.getUniformLocation(prog, 'd');
      const fit = () => { canvas.width = canvas.clientWidth / 2; canvas.height = canvas.clientHeight / 2; gl.viewport(0, 0, canvas.width, canvas.height); };   // half size: it is a blur anyway
      const draw = (ms) => {
        gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
        gl.uniform2f(uR, canvas.width, canvas.height); gl.uniform1f(uT, ms / 1000); gl.uniform1f(uD, dark.matches ? 1 : 0);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      };
      const loop = (ms) => { if (scrollY < innerHeight && !document.hidden) draw(ms); requestAnimationFrame(loop); };
      fit(); addEventListener('resize', fit);
      canvas.classList.add('on');
      if (reduce) draw(4000); else requestAnimationFrame(loop);
    }
  }

  /* ---------- visitor number: one count per browser session, hidden if the service is down ---------- */
  const visits = document.querySelector('[data-visits]');
  if (visits) {
    const live = location.hostname === 'pankqx.github.io';
    let counted = false;
    try { counted = !!sessionStorage.getItem('ksp-counted'); } catch (e) { /* private mode */ }
    fetch(`https://abacus.jasoncameron.dev/${live && !counted ? 'hit' : 'get'}/pankqx.github.io/visits`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('counter'))))
      .then((d) => {
        if (!d.value) return;
        try { if (live) sessionStorage.setItem('ksp-counted', '1'); } catch (e) { /* private mode */ }
        visits.querySelector('[data-visits-n]').textContent = '#' + String(d.value).padStart(4, '0');
        visits.hidden = false;
      })
      .catch(() => { /* fine without it */ });
  }
})();
