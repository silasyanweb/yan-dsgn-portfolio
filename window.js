/* =========================================================
   JANELA: cidade 3D em escala real (1 unidade = 1 metro)
   O quarto fica no 5º andar; lá embaixo a rua, do outro lado os prédios,
   ao fundo a cidade e o céu numa cúpula que acompanha a câmera (infinito).
   Cenas: pôr do sol · noite com avião · chuva · dia de sol · neve · Godzilla
   ========================================================= */
export function setupWindow(THREE, scene, opt) {
  const { LEFT, sun, hemi, amb, reduce } = opt;
  const GY = -13;                      // nível da rua (o chão do quarto é 0)
  const rng = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296 };
  const mkCanvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c };
  const mkTex = c => { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t };
  const basic = (map, o = {}) => new THREE.MeshBasicMaterial({ map, transparent: true, fog: false, depthWrite: o.dw ?? false, toneMapped: false, opacity: o.op ?? 1, blending: o.add ? THREE.AdditiveBlending : THREE.NormalBlending });
  const plane = (w, h, mat, x, y, z, parent = scene) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); m.rotation.y = Math.PI / 2; m.position.set(x, y, z); parent.add(m); return m };
  const glowDot = c => { const cv = mkCanvas(64, 64), x = cv.getContext('2d'); const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, c); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); return mkTex(cv) };
  const glowPts = (col, size, ro) => { const p = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial({ map: glowDot('rgba(255,255,255,1)'), color: col, size, transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending, toneMapped: false })); p.renderOrder = ro; scene.add(p); return p };
  const setPts = (p, arr) => { p.geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(arr.flat()), 3)); p.geometry.computeBoundingSphere(); p.visible = arr.length > 0 };

  /* ---------- cenas ---------- */
  const SCENES = [
    { id: 'dusk', name: 'Pôr do sol', sky: ['#1a1f45', '#4a3466', '#c7637a', '#f2a35c', '#f7c56f'], stops: [0, .42, .68, .86, 1], sun: ['#ffb27a', 1.6], hemi: .35, amb: .35, lit: .5, orb: 'sunset' },
    { id: 'night', name: 'Noite com avião', sky: ['#05081a', '#0b1233', '#182452', '#2b3566'], stops: [0, .5, .85, 1], sun: ['#8fa6ff', .45], hemi: .22, amb: .3, lit: .62, orb: 'moon', plane: true },
    { id: 'rain', name: 'Chuva', sky: ['#0d1118', '#1a2230', '#2a3443', '#3a4556'], stops: [0, .5, .85, 1], sun: ['#7d8fb0', .35], hemi: .2, amb: .28, lit: .45, rain: true, clouds: 'storm' },
    { id: 'day', name: 'Dia de sol', sky: ['#3d8ee8', '#6fb1f2', '#a9d3f7', '#dcecf7'], stops: [0, .45, .8, 1], sun: ['#fff1d6', 2.7], hemi: .75, amb: .55, lit: 0, orb: 'sun', clouds: 'fair', birds: true, day: true },
    { id: 'snow', name: 'Neve', sky: ['#121a2e', '#25324f', '#4a5a78', '#7c8aa6'], stops: [0, .5, .85, 1], sun: ['#c4d6ff', .8], hemi: .35, amb: .4, lit: .6, snow: true, clouds: 'soft' },
    { id: 'kaiju', name: 'Godzilla', sky: ['#14060a', '#3a0b12', '#7a1c12', '#d1451a', '#ff8a2a'], stops: [0, .35, .65, .88, 1], sun: ['#ff6a3a', 1.5], hemi: .3, amb: .32, lit: .35, kaiju: true, fires: true },
  ];

  const horizon = S => S.day ? '#c4d8ea' : S.sky[S.sky.length - 1];

  /* ---------- céu infinito: cúpula centrada na câmera ---------- */
  const skyC = mkCanvas(1024, 1024), skyT = mkTex(skyC);
  const sky = new THREE.Mesh(new THREE.SphereGeometry(1500, 48, 24), new THREE.MeshBasicMaterial({ map: skyT, side: THREE.BackSide, fog: false, depthWrite: false, toneMapped: false }));
  sky.renderOrder = -20; scene.add(sky);
  function drawSky(S) {
    const x = skyC.getContext('2d'), w = 1024, h = 1024, hz = h * .5;
    const g = x.createLinearGradient(0, 0, 0, hz); S.sky.forEach((c, i) => g.addColorStop(S.stops[i], c)); x.fillStyle = g; x.fillRect(0, 0, w, hz);
    x.fillStyle = S.sky[S.sky.length - 1]; x.fillRect(0, hz, w, h - hz);
    if (!S.day && S.id !== 'rain') { const r = rng(9); for (let i = 0; i < 700; i++) { const a = r() * (S.id === 'kaiju' ? .25 : .85); x.fillStyle = `rgba(255,255,255,${a})`; const s = r() < .06 ? 2 : 1; x.fillRect(r() * w, 40 + r() * hz * .8, s, s) } }
    skyT.needsUpdate = true;
  }
  // tudo o que está "no céu" acompanha a câmera (distância infinita)
  const skyG = new THREE.Group(); scene.add(skyG);
  const orbC = mkCanvas(512, 512), orbT = mkTex(orbC);
  const orb = plane(14, 14, basic(orbT), LEFT - 70, 24, -45, skyG); orb.renderOrder = -19;
  function drawOrb(kind) {
    const x = orbC.getContext('2d'); x.clearRect(0, 0, 512, 512); orb.visible = !!kind; if (!kind) return;
    const glow = (r, c) => { const g = x.createRadialGradient(256, 256, 0, 256, 256, r); g.addColorStop(0, c); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, 512, 512) };
    if (kind === 'moon') { glow(240, 'rgba(180,200,255,.35)'); x.fillStyle = '#eee8cf'; x.beginPath(); x.arc(256, 256, 70, 0, 7); x.fill(); x.fillStyle = 'rgba(160,150,120,.35)';[[230, 236, 16], [282, 270, 11], [250, 292, 8], [292, 228, 7]].forEach(([a, b, r]) => { x.beginPath(); x.arc(a, b, r, 0, 7); x.fill() }) }
    if (kind === 'sun') { glow(256, 'rgba(255,240,200,.6)'); glow(130, 'rgba(255,250,230,.9)'); x.fillStyle = '#fffbea'; x.beginPath(); x.arc(256, 256, 62, 0, 7); x.fill() }
    if (kind === 'sunset') { glow(256, 'rgba(255,170,90,.55)'); x.fillStyle = '#ffd38a'; x.beginPath(); x.arc(256, 256, 78, 0, 7); x.fill() }
    orbT.needsUpdate = true;
  }


  /* ---------- nuvens ---------- */
  const cloudC = mkCanvas(512, 256), cloudT = mkTex(cloudC);
  (() => { const x = cloudC.getContext('2d'); const r = rng(4); for (let i = 0; i < 26; i++) { const cx = 90 + r() * 330, cy = 140 + (r() - .5) * 60, rad = 30 + r() * 60; const g = x.createRadialGradient(cx, cy, 0, cx, cy, rad); g.addColorStop(0, 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 512, 256) } cloudT.needsUpdate = true })();
  const clouds = []; for (let i = 0; i < 8; i++) { const c = plane(30 + i % 3 * 10, 12, basic(cloudT, { op: 0 }), LEFT - 80 + i * .2, 16 + (i % 3) * 6, -150 + i * 30, skyG); c.renderOrder = -18; clouds.push(c) }

  /* ---------- chão distante (sob a cidade) ---------- */
  const farGround = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000), new THREE.MeshBasicMaterial({ color: '#0b0d14', fog: false, depthWrite: false }));
  farGround.rotation.x = -Math.PI / 2; farGround.position.set(LEFT - 2000, GY - .02, 0); farGround.renderOrder = -15; scene.add(farGround);
  // luzes da cidade espalhadas até o horizonte
  const cityLights = (() => { const r = rng(77), pts = [], cols = []; for (let i = 0; i < 1400; i++) { const d = 20 + Math.pow(r(), .7) * 440, zc = 2.55 - .64 * (d + 5.55); pts.push([LEFT - d, GY + .4, zc + (r() - .5) * (d * 2.6 + 60)]) }
    const p = glowPts('#ffcf8a', 2.2, -14); setPts(p, pts); return p })();

  /* ---------- prédios em camadas (distâncias reais, do chão até o topo) ---------- */
  // d = distância da janela (m), w = largura, h = altura total, bw = largura dos prédios, hmin/hmax = altura dos prédios
  const LAYERS = [
    { n: 0, d: 460, w: 2400, h: 230, z: -296, seed: 5, bw: [26, 60], hmin: 30, hmax: 190, cw: 4096 },
    { n: 1, d: 290, w: 1500, h: 170, z: -186, seed: 11, bw: [22, 50], hmin: 25, hmax: 140, cw: 4096 },
    { n: 2, d: 170, w: 900, h: 120, z: -110, seed: 23, bw: [20, 42], hmin: 18, hmax: 100, cw: 4096 },
    { n: 3, d: 21, w: 240, h: 22, z: -14, seed: 37, bw: [8, 18], hmin: 5, hmax: 15 },
  ];
  LAYERS.forEach(L => { const CW = L.cw || 2048; L.c = mkCanvas(CW, Math.round(CW * L.h / L.w)); L.ppm = CW / L.w; L.t = mkTex(L.c);
    L.mesh = plane(L.w, L.h, basic(L.t), LEFT - L.d, GY + L.h / 2, L.z); L.mesh.renderOrder = L.n;
    L.bpos = []; L.bp = glowPts('#ff4a3a', .3 + L.d * .012, L.n + .2) });
  const toWorld = (L, u, v) => [LEFT - L.d + .05, GY + L.h * (1 - v / L.c.height), L.z + (.5 - u / L.c.width) * L.w];
  const winLights = [], neons = [];
  function drawLayer(L, S) {
    const x = L.c.getContext('2d'), W = L.c.width, H = L.c.height, m = L.ppm; x.clearRect(0, 0, W, H);
    const r = rng(L.seed); L.bpos.length = 0;
    const tone = (hex, k) => { const c = new THREE.Color(hex); return '#' + c.multiplyScalar(k).getHexString() };
    const baseCol = S.day ? ['#8ea6bf', '#9db2c7', '#7d93ab', '#b3c2d1', '#a89f94'] : S.id === 'kaiju' ? ['#1a0c10', '#22101a', '#140a10'] : S.id === 'snow' ? ['#1e2840', '#252f4a', '#1a2338'] : ['#141634', '#1b1b3c', '#201a40', '#121530'];
    let px = -20, bb = L.n === 3 ? false : true;
    while (px < W) {
      const bw = (L.bw[0] + r() * (L.bw[1] - L.bw[0])) * m, bh = (L.hmin + r() * (L.hmax - L.hmin)) * m, top = H - bh;
      const c0 = baseCol[Math.floor(r() * baseCol.length)];
      const k = S.day ? (.82 + L.n * .05) : (.75 + L.n * .07);
      const side = bw * .16;
      x.fillStyle = tone(c0, k * (S.day ? .78 : .7)); x.fillRect(px + bw - side, top + .5 * m, side, bh);
      const g = x.createLinearGradient(0, top, 0, H); g.addColorStop(0, tone(c0, k * (S.day ? 1.08 : 1.15))); g.addColorStop(1, tone(c0, k * .75)); x.fillStyle = g; x.fillRect(px, top, bw - side, bh);
      x.fillStyle = S.day ? 'rgba(255,255,255,.35)' : S.id === 'kaiju' ? 'rgba(255,120,60,.35)' : 'rgba(255,190,150,.18)'; x.fillRect(px, top, bw - side, Math.max(1, .25 * m));
      // telhado
      const roof = r(), fw = bw - side;
      if (roof < .2) { x.fillStyle = tone(c0, k * .9); x.fillRect(px + fw * .2, top - 3 * m, fw * .45, 3 * m); x.fillRect(px + fw * .32, top - 5 * m, fw * .2, 2 * m) }
      else if (roof < .4) { const ax = px + fw * .45; x.fillStyle = tone(c0, k * .8); x.fillRect(ax, top - 7 * m, Math.max(1, .3 * m), 7 * m); x.fillStyle = '#ff3b3b'; x.fillRect(ax - 1, top - 7.2 * m, Math.max(2, .25 * m), Math.max(2, .25 * m)); if (!S.day) L.bpos.push(toWorld(L, ax, top - 7.2 * m)) }
      else if (roof < .55) { x.fillStyle = tone(c0, k * .75); const tx = px + fw * .6, tw = 3 * m; x.fillRect(tx, top - 4.5 * m, tw, 3 * m); x.fillRect(tx + .3 * m, top - 1.5 * m, .3 * m, 1.5 * m); x.fillRect(tx + tw - .6 * m, top - 1.5 * m, .3 * m, 1.5 * m); x.beginPath(); x.moveTo(tx - .2 * m, top - 4.5 * m); x.lineTo(tx + tw / 2, top - 5.6 * m); x.lineTo(tx + tw + .2 * m, top - 4.5 * m); x.fill() }
      else if (roof < .65) { x.fillStyle = tone(c0, k * .95); x.beginPath(); x.moveTo(px, top); x.lineTo(px + fw / 2, top - fw * .35); x.lineTo(px + fw, top); x.fill() }
      else { x.fillStyle = tone(c0, k * .65); x.fillRect(px - 1, top - .8 * m, fw + 2, .8 * m) }
      if (S.snow) { x.fillStyle = '#eef3ff'; x.fillRect(px - 1, top - .6 * m, bw + 2, .6 * m) }
      // janelas (andares de 3,2 m)
      const ww = (1.1 + r() * .7) * m, wh = (1.4 + r() * .6) * m, gx = ww + (.8 + r() * .8) * m, gy = 3.2 * m, style = r();
      const shop = L.n >= 2 ? 4.2 * m : 0;
      for (let yy = top + 1.2 * m; yy < H - shop - wh - .4 * m; yy += gy) {
        for (let xx = px + .9 * m; xx < px + fw - ww - .6 * m; xx += gx) {
          if (S.day) { x.fillStyle = style < .5 ? 'rgba(200,225,245,.75)' : 'rgba(120,150,180,.55)'; x.fillRect(xx, yy, ww, wh); x.fillStyle = 'rgba(255,255,255,.35)'; x.fillRect(xx, yy, ww, Math.max(1, wh * .15)); continue }
          if (r() < S.lit) { const c = ['#ffd27a', '#ffb35a', '#ffe7a8', '#9fd0ff', '#ffc48a'][Math.floor(r() * 5)]; x.fillStyle = c; x.fillRect(xx, yy, ww, wh); if (L.n >= 2 && r() < (L.n === 3 ? .3 : .14)) winLights.push({ L, x: xx, y: yy, w: ww, h: wh, c }) }
          else { x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(xx, yy, ww, wh) }
        }
      }
      // térreo com lojas (camadas próximas)
      if (shop) { const sy = H - shop; const aw = ['#c8743a', '#2c5240', '#8a2f2f', '#1b4f6b', '#d9b36a'][Math.floor(r() * 5)];
        x.fillStyle = S.day ? 'rgba(170,200,220,.7)' : 'rgba(255,214,150,.85)'; x.fillRect(px + .6 * m, sy + 1.4 * m, fw - 1.2 * m, shop - 1.6 * m);
        x.fillStyle = tone(c0, k * .6); for (let q = px + 4 * m; q < px + fw - 1 * m; q += 4 * m) x.fillRect(q, sy + 1.4 * m, .3 * m, shop - 1.6 * m);
        x.fillStyle = aw; x.fillRect(px + .3 * m, sy + .6 * m, fw - .6 * m, .8 * m) }
      // neon vertical
      if (!S.day && L.n >= 2 && r() < (L.n === 3 ? .35 : .2) && bh > 14 * m) { const nc = ['#ff4fa3', '#4fe3ff', '#ffb347', '#9b7bff', '#5dff9b'][Math.floor(r() * 5)]; const nw = .9 * m, nh = Math.min(9 * m, bh * .4), nx = px + (r() < .5 ? .4 * m : fw - nw - .4 * m), ny = top + 2 * m;
        const n = { L, x: nx, y: ny, w: nw, h: nh, c: nc, on: true }; drawNeon(x, n); neons.push(n) }
      // outdoor YAN DSGN no telhado de um prédio da frente
      if (!bb && px > W * .44 && bh < 14 * m) { bb = true; drawBillboard(x, px + fw / 2, top, m, S) }
      // fogo (Godzilla)
      if (S.fires && r() < .3) { const fy = top + bh * (.15 + r() * .4); const fg = x.createRadialGradient(px + bw / 2, fy, 0, px + bw / 2, fy, bw * .7); fg.addColorStop(0, 'rgba(255,170,60,.9)'); fg.addColorStop(.4, 'rgba(255,80,20,.45)'); fg.addColorStop(1, 'rgba(255,60,20,0)'); x.fillStyle = fg; x.fillRect(px - bw * .3, fy - bw * .7, bw * 1.6, bw * 1.4) }
      px += bw + (r() < .25 ? (4 + r() * 10) * m : (.3 + r() * 1.5) * m);
    }
    // perspectiva atmosférica: quanto mais longe, mais a cor do horizonte
    const fogA = [.6, .44, .28, .04][L.n]; x.globalCompositeOperation = 'source-atop'; x.globalAlpha = fogA; x.fillStyle = horizon(S); x.fillRect(0, 0, W, H); x.globalAlpha = 1; x.globalCompositeOperation = 'source-over';
    setPts(L.bp, L.bpos); L.t.needsUpdate = true;
  }
  function drawNeon(x, n) { x.save(); if (n.on) { x.shadowColor = n.c; x.shadowBlur = 16; x.fillStyle = n.c } else x.fillStyle = 'rgba(30,25,40,1)'; x.fillRect(n.x, n.y, n.w, n.h); if (n.on) { x.shadowBlur = 0; x.fillStyle = 'rgba(255,255,255,.7)'; for (let k = 6; k < n.h - 6; k += 14) x.fillRect(n.x + 3, n.y + k, n.w - 6, 6) } x.restore() }
  function drawBillboard(x, cx, roofY, m, S) {
    const bw = 9 * m, bh = 3.4 * m, bx = cx - bw / 2, by = roofY - bh - 2 * m;
    x.fillStyle = '#0b0b10'; x.fillRect(bx + bw * .2, by + bh, .4 * m, 2 * m); x.fillRect(bx + bw * .8, by + bh, .4 * m, 2 * m);
    x.fillStyle = S.day ? '#2c5240' : '#101614'; x.fillRect(bx, by, bw, bh);
    x.strokeStyle = '#e39a5c'; x.lineWidth = Math.max(2, .3 * m); x.strokeRect(bx + .4 * m, by + .4 * m, bw - .8 * m, bh - .8 * m);
    x.font = `700 ${Math.round(1.8 * m)}px "Pixelify Sans", "Silkscreen", monospace`; x.textAlign = 'center'; x.textBaseline = 'middle';
    if (!S.day) { x.shadowColor = '#ff9a52'; x.shadowBlur = 18 } x.fillStyle = S.day ? '#e4dcc8' : '#ffe2c4'; x.fillText('YAN DSGN', bx + bw / 2, by + bh / 2 + 1); x.shadowBlur = 0;
    if (S.snow) { x.fillStyle = '#eef3ff'; x.fillRect(bx - 2, by - .5 * m, bw + 4, .5 * m) }
  }

  /* ---------- névoa entre as camadas ---------- */
  const hazeC = mkCanvas(4, 256), hazeT = mkTex(hazeC);
  const hazes = [[380, .55, .5, 2200, -245, 160], [230, .4, 1.5, 1400, -150, 110], [95, .3, 2.5, 800, -65, 70]].map(([d, op, ro, w, z, h]) => { const m = plane(w, h, basic(hazeT, { op }), LEFT - d, GY + h / 2, z); m.renderOrder = ro; m.userData.op = op; return m });
  function drawHaze(S) { const x = hazeC.getContext('2d'); x.clearRect(0, 0, 4, 256); const c = new THREE.Color(horizon(S)); const rgb = `${c.r * 255 | 0},${c.g * 255 | 0},${c.b * 255 | 0}`; const g = x.createLinearGradient(0, 0, 0, 256); g.addColorStop(0, `rgba(${rgb},0)`); g.addColorStop(.6, `rgba(${rgb},.3)`); g.addColorStop(1, `rgba(${rgb},.85)`); x.fillStyle = g; x.fillRect(0, 0, 4, 256); hazeT.needsUpdate = true }

  /* ---------- a rua lá embaixo ---------- */
  // calçada perto (0–3 m), avenida de 4 faixas (3–17 m), calçada do outro lado (17–20 m)
  const SW = 20, LEN = 320;
  const stC = mkCanvas(512, 512), stT = mkTex(stC); stT.wrapT = THREE.RepeatWrapping; stT.repeat.set(1, LEN / 20);
  const street = new THREE.Mesh(new THREE.PlaneGeometry(SW, LEN), new THREE.MeshBasicMaterial({ map: stT, fog: false }));
  street.rotation.x = -Math.PI / 2; street.position.set(LEFT - SW / 2, GY, -30); street.renderOrder = 3.5; scene.add(street);
  const U = mm => 512 - mm / SW * 512; // metros a partir da janela → coluna do canvas (0 = lado de lá)
  function drawStreet(S) {
    const x = stC.getContext('2d'); const day = !!S.day;
    x.fillStyle = day ? '#9a9a96' : '#3a3b44'; x.fillRect(0, 0, 512, 512);                      // calçadas
    x.fillStyle = day ? '#8a8a86' : '#33343c'; for (let v = 0; v < 512; v += 26) { x.fillRect(U(3), v, U(0) - U(3), 2); x.fillRect(U(20), v, U(17) - U(20), 2) }
    x.fillStyle = day ? '#4a4d52' : '#17181f'; x.fillRect(U(17), 0, U(3) - U(17), 512);         // asfalto
    if (S.rain) { x.fillStyle = 'rgba(160,180,220,.14)'; for (let i = 0; i < 60; i++) x.fillRect(U(17) + Math.random() * (U(3) - U(17)), Math.random() * 512, 8 + Math.random() * 26, 3) }
    x.fillStyle = day ? '#c9c7c0' : '#565865'; x.fillRect(U(3), 0, 4, 512); x.fillRect(U(17) - 4, 0, 4, 512); // meio-fio
    x.fillStyle = day ? '#f2d24a' : '#a08a32'; x.fillRect(U(10) - 5, 0, 3, 512); x.fillRect(U(10) + 2, 0, 3, 512);   // faixa dupla amarela
    x.fillStyle = day ? 'rgba(255,255,255,.8)' : 'rgba(200,200,210,.5)'; for (let v = 0; v < 512; v += 128) { x.fillRect(U(6.5) - 2, v, 3, 64); x.fillRect(U(13.5) - 2, v, 3, 64) }
    if (S.snow) { x.fillStyle = 'rgba(235,240,255,.85)'; x.fillRect(U(3), 0, U(0) - U(3), 512); x.fillRect(U(20), 0, U(17) - U(20), 512); x.fillStyle = 'rgba(235,240,255,.3)'; x.fillRect(U(17), 0, U(3) - U(17), 512) }
    stT.needsUpdate = true;
  }
  // postes (dos dois lados) + poças de luz no chão
  const poleM = new THREE.MeshBasicMaterial({ color: '#15161c', fog: false }), lampTop = [], pools = [];
  const poolT = glowDot('rgba(255,200,130,.55)');
  for (let z = -140; z <= 80; z += 18) [[1.4, 1], [18.6, -1]].forEach(([dx, s], k) => { const zz = z + k * 8, px = LEFT - dx;
    const pole = new THREE.Mesh(new THREE.BoxGeometry(.18, 7, .18), poleM); pole.position.set(px, GY + 3.5, zz); scene.add(pole); pole.renderOrder = 4;
    const arm = new THREE.Mesh(new THREE.BoxGeometry(1.6, .12, .12), poleM); arm.position.set(px - s * .75, GY + 7, zz); scene.add(arm); arm.renderOrder = 4;
    lampTop.push([px - s * 1.45, GY + 6.85, zz]);
    const pool = new THREE.Mesh(new THREE.PlaneGeometry(9, 9), basic(poolT, { add: true })); pool.rotation.x = -Math.PI / 2; pool.position.set(px - s * 1.6, GY + .03, zz); pool.renderOrder = 3.6; scene.add(pool); pools.push(pool) });
  const lamps = glowPts('#ffcf8a', 2.4, 4.5); setPts(lamps, lampTop);
  // carros em 3D
  const CARC0 = ['#d94a3a', '#e7e2d6', '#3a6fd6', '#f2b233', '#2b2b30', '#3fa36b'];
  const headT = glowDot('rgba(255,245,215,1)'), tailT = glowDot('rgba(255,50,40,1)');
  const cars = [];
  for (let i = 0; i < 16; i++) { const dir = i % 2 ? 1 : -1, col = new THREE.Color(CARC0[i % CARC0.length]);
    const g = new THREE.Group(); scene.add(g);
    const bodyM = new THREE.MeshBasicMaterial({ color: col.clone(), fog: false }), cabM = new THREE.MeshBasicMaterial({ color: '#1d2633', fog: false });
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.8, .75, 4.3), bodyM); body.position.y = .55; g.add(body);
    const cab = new THREE.Mesh(new THREE.BoxGeometry(1.6, .6, 2.2), cabM); cab.position.set(0, 1.2, -.2 * dir); g.add(cab);
    const roofM = new THREE.MeshBasicMaterial({ color: col.clone().multiplyScalar(.85), fog: false }); const roof = new THREE.Mesh(new THREE.BoxGeometry(1.5, .05, 1.9), roofM); roof.position.set(0, 1.52, -.2 * dir); g.add(roof);
    const hd = new THREE.Sprite(new THREE.SpriteMaterial({ map: headT, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, transparent: true })); hd.scale.set(3.2, 1.6, 1); hd.position.set(0, .6, 2.4 * dir); g.add(hd);
    const tl = new THREE.Sprite(new THREE.SpriteMaterial({ map: tailT, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, transparent: true })); tl.scale.set(1.8, 1, 1); tl.position.set(0, .6, -2.25 * dir); g.add(tl);
    g.children.forEach(o => o.renderOrder = 4);
    cars.push({ g, mats: [bodyM, roofM], base: col, hd, tl, dir, v: 7 + Math.random() * 8, z: -140 + Math.random() * 220 });
    g.position.set(LEFT - (dir > 0 ? [4.8, 8.3][i >> 1 & 1] : [11.7, 15.2][i >> 1 & 1]), GY, 0) }

  /* ---------- avião ---------- */
  const apC = mkCanvas(512, 192), apT = mkTex(apC);
  (() => { const x = apC.getContext('2d'); x.fillStyle = '#0a0d18'; x.beginPath(); x.ellipse(256, 96, 150, 16, 0, 0, 7); x.fill(); x.beginPath(); x.moveTo(230, 96); x.lineTo(150, 30); x.lineTo(180, 30); x.lineTo(290, 96); x.fill(); x.beginPath(); x.moveTo(230, 96); x.lineTo(160, 170); x.lineTo(190, 170); x.lineTo(290, 96); x.fill(); x.beginPath(); x.moveTo(380, 96); x.lineTo(410, 40); x.lineTo(430, 40); x.lineTo(410, 96); x.fill(); apT.needsUpdate = true })();
  const airplane = plane(9, 3.4, basic(apT), LEFT - 75, 22, -60, skyG); airplane.visible = false; airplane.renderOrder = -17;
  const redL = plane(2.4, 2.4, basic(glowDot('rgba(255,60,60,1)'), { add: true }), LEFT - 74.8, 22, -60, skyG), greenL = plane(2.4, 2.4, basic(glowDot('rgba(80,255,120,1)'), { add: true }), LEFT - 74.8, 22, -60, skyG), whiteL = plane(3, 3, basic(glowDot('rgba(255,255,255,1)'), { add: true }), LEFT - 74.8, 22, -60, skyG);
  [redL, greenL, whiteL].forEach(o => o.renderOrder = -16);
  const trailC = mkCanvas(512, 32); (() => { const x = trailC.getContext('2d'); const g = x.createLinearGradient(0, 0, 512, 0); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(230,235,255,.45)'); x.fillStyle = g; x.fillRect(0, 12, 512, 8) })();
  const trail = plane(42, 1.2, basic(mkTex(trailC)), LEFT - 75.5, 22.1, -80, skyG); trail.renderOrder = -17;

  /* ---------- pássaros (dia) ---------- */
  const birdC = mkCanvas(64, 32); (() => { const x = birdC.getContext('2d'); x.strokeStyle = '#1b2633'; x.lineWidth = 3; x.beginPath(); x.moveTo(4, 12); x.quadraticCurveTo(18, 2, 32, 16); x.quadraticCurveTo(46, 2, 60, 12); x.stroke() })();
  const birdT = mkTex(birdC); const birds = []; for (let i = 0; i < 7; i++) { const b = plane(.9, .45, basic(birdT), LEFT - 24 - i * .5, 6 + (i % 3) * .8, -30 - i * 1.5, skyG); b.visible = false; b.renderOrder = -14; birds.push(b) }

  /* ---------- Godzilla (entre a 2ª e a 3ª fileira de prédios) ---------- */
  const gzC = mkCanvas(1024, 1024), gzT = mkTex(gzC);
  (() => {
    const x = gzC.getContext('2d'); x.fillStyle = '#07060a';
    x.beginPath(); // corpo
    x.moveTo(330, 1024); x.bezierCurveTo(300, 820, 330, 640, 420, 520); x.bezierCurveTo(450, 440, 470, 360, 520, 300); // costas
    x.bezierCurveTo(540, 250, 590, 200, 650, 205); x.bezierCurveTo(720, 210, 760, 240, 770, 268); // cabeça
    x.lineTo(740, 285); x.lineTo(755, 300); x.bezierCurveTo(720, 300, 690, 300, 665, 320); // boca
    x.bezierCurveTo(640, 360, 650, 420, 660, 470); x.bezierCurveTo(700, 560, 700, 700, 690, 820); x.lineTo(720, 1024); x.closePath(); x.fill();
    x.beginPath(); x.moveTo(640, 430); x.bezierCurveTo(700, 450, 740, 470, 760, 500); x.lineTo(745, 512); x.bezierCurveTo(720, 495, 690, 480, 640, 470); x.fill(); // braço
    x.beginPath(); x.moveTo(380, 860); x.bezierCurveTo(250, 900, 120, 960, 0, 1000); x.lineTo(0, 1024); x.lineTo(380, 1024); x.fill(); // cauda
    // espinhos
    const sp = [[520, 300, 46], [490, 350, 56], [462, 410, 62], [440, 470, 58], [418, 530, 52], [395, 600, 44], [380, 670, 36]];
    sp.forEach(([sx, sy, s]) => { x.beginPath(); x.moveTo(sx + 14, sy + 8); x.lineTo(sx - s * .7, sy - s * .35); x.lineTo(sx - s * .2, sy + s * .05); x.lineTo(sx - s, sy + s * .3); x.lineTo(sx, sy + s * .45); x.fill() });
    x.fillStyle = '#ffdf7a'; x.beginPath(); x.ellipse(712, 248, 9, 4, -.2, 0, 7); x.fill();
    gzT.needsUpdate = true;
  })();
  const spineC = mkCanvas(1024, 1024), spineT = mkTex(spineC);
  (() => { const x = spineC.getContext('2d'); x.shadowColor = '#7fd8ff'; x.shadowBlur = 40; x.strokeStyle = 'rgba(140,220,255,.9)'; x.lineWidth = 8;[[520, 300, 46], [490, 350, 56], [462, 410, 62], [440, 470, 58], [418, 530, 52], [395, 600, 44], [380, 670, 36]].forEach(([sx, sy, s]) => { x.beginPath(); x.moveTo(sx - s * .7, sy - s * .35); x.lineTo(sx - s, sy + s * .3); x.stroke() }); spineT.needsUpdate = true })();
  const GZS = 22, GZD = 215; // escala e distância
  const kaiju = new THREE.Group(); kaiju.position.set(LEFT - GZD, GY + 1.3 * GZS, -140); kaiju.rotation.y = -Math.PI / 2; kaiju.scale.setScalar(GZS); scene.add(kaiju); kaiju.visible = false;
  const gzBody = new THREE.Mesh(new THREE.PlaneGeometry(5.4, 5.4), basic(gzT)); gzBody.material.side = THREE.DoubleSide; gzBody.position.y = 1.4; gzBody.renderOrder = 1.6; kaiju.add(gzBody);
  const gzSpine = new THREE.Mesh(new THREE.PlaneGeometry(5.4, 5.4), basic(spineT, { add: true, op: .6 })); gzSpine.material.side = THREE.DoubleSide; gzSpine.position.set(0, 1.4, -.01); gzSpine.renderOrder = 1.7; kaiju.add(gzSpine);
  const beamC = mkCanvas(512, 64); (() => { const x = beamC.getContext('2d'); const g = x.createLinearGradient(0, 0, 0, 64); g.addColorStop(0, 'rgba(120,200,255,0)'); g.addColorStop(.5, 'rgba(230,248,255,1)'); g.addColorStop(1, 'rgba(120,200,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 512, 64) })();
  const beamG = new THREE.PlaneGeometry(1, .35); beamG.translate(.5, 0, 0); const beam = new THREE.Mesh(beamG, basic(mkTex(beamC), { add: true, op: 0 })); beam.material.side = THREE.DoubleSide; beam.renderOrder = 1.8; kaiju.add(beam);
  const blast = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.4), basic(glowDot('rgba(170,225,255,1)'), { add: true, op: 0 })); blast.material.side = THREE.DoubleSide; blast.position.set(3.45, .58, .02); blast.renderOrder = 2.2; kaiju.add(blast);
  const fireGlow = new THREE.PointLight('#ff6a2a', 0, 12, 1.4); fireGlow.position.set(LEFT - .5, 1.6, -1); scene.add(fireGlow);

  /* ---------- chuva e neve (perto da janela) ---------- */
  const N = 1600, pg = new THREE.BufferGeometry(), pp = new Float32Array(N * 3), pv = new Float32Array(N);
  const box = { x0: LEFT - 7, x1: LEFT - .25, y0: -4, y1: 5, z0: -7, z1: 2 };
  for (let i = 0; i < N; i++) { pp[i * 3] = box.x0 + Math.random() * (box.x1 - box.x0); pp[i * 3 + 1] = box.y0 + Math.random() * (box.y1 - box.y0); pp[i * 3 + 2] = box.z0 + Math.random() * (box.z1 - box.z0); pv[i] = .6 + Math.random() * .8 }
  pg.setAttribute('position', new THREE.BufferAttribute(pp, 3));
  const flakeC = mkCanvas(32, 32); (() => { const x = flakeC.getContext('2d'); const g = x.createRadialGradient(16, 16, 0, 16, 16, 16); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 32, 32) })();
  const dropC = mkCanvas(8, 64); (() => { const x = dropC.getContext('2d'); const g = x.createLinearGradient(0, 0, 0, 64); g.addColorStop(0, 'rgba(190,210,240,0)'); g.addColorStop(1, 'rgba(210,225,255,.85)'); x.fillStyle = g; x.fillRect(3, 0, 2, 64) })();
  const snowM = new THREE.PointsMaterial({ size: .07, map: mkTex(flakeC), transparent: true, depthWrite: false, fog: false, opacity: .95 });
  const rainM = new THREE.PointsMaterial({ size: .16, map: mkTex(dropC), transparent: true, depthWrite: false, fog: false, opacity: .7 });
  const parts = new THREE.Points(pg, snowM); parts.visible = false; parts.renderOrder = 6; scene.add(parts);
  const boltC = mkCanvas(256, 1024), boltT = mkTex(boltC);
  function drawBolt() { const x = boltC.getContext('2d'); x.clearRect(0, 0, 256, 1024); x.strokeStyle = '#f4f8ff'; x.shadowColor = '#9ec4ff'; x.shadowBlur = 24; x.lineWidth = 6; x.beginPath(); let bx = 128, by = 0; x.moveTo(bx, by); while (by < 1024) { bx += (Math.random() - .5) * 90; by += 40 + Math.random() * 60; x.lineTo(bx, by); if (Math.random() < .2) { x.moveTo(bx, by); x.lineTo(bx + (Math.random() - .5) * 140, by + 90); x.moveTo(bx, by) } } x.stroke(); boltT.needsUpdate = true }
  const bolt = plane(16, 64, basic(boltT, { add: true, op: 0 }), LEFT - 90, 20, -40, skyG); bolt.renderOrder = -13;
  // estrela cadente
  const shootC = mkCanvas(256, 16); (() => { const x = shootC.getContext('2d'); const g = x.createLinearGradient(0, 0, 256, 0); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(255,255,255,1)'); x.fillStyle = g; x.fillRect(0, 6, 256, 4) })();
  const shoot = plane(14, .8, basic(mkTex(shootC), { add: true, op: 0 }), LEFT - 80, 30, -40, skyG); shoot.renderOrder = -12;

  /* ---------- véu de transição ---------- */
  const veil = plane(30, 16, new THREE.MeshBasicMaterial({ color: '#000', transparent: true, opacity: 0, fog: false, depthWrite: false }), LEFT - .2, 1.8, -1); veil.renderOrder = 20;

  /* ---------- céu acompanha a câmera ---------- */
  let camRef = null;
  function follow() { const cam = opt.camera; if (!cam) return; if (!camRef) camRef = cam.position.clone();
    sky.position.copy(cam.position); skyG.position.subVectors(cam.position, camRef) }

  /* ---------- aplicar cena ---------- */
  let cur = 0, S = SCENES[0], sceneT = 0, trans = null;
  function apply(i) {
    S = SCENES[i]; cur = i; winLights.length = 0; neons.length = 0;
    drawSky(S); drawOrb(S.orb); LAYERS.forEach(L => drawLayer(L, S)); drawHaze(S); drawStreet(S);
    const dim = S.day ? 1 : S.id === 'kaiju' ? .5 : .42;
    farGround.material.color.set(S.day ? '#6d7680' : horizon(S)).multiplyScalar(S.day ? 1 : .35);
    lamps.visible = !S.day; pools.forEach(p => p.visible = !S.day); cityLights.visible = !S.day;
    cars.forEach(c => { c.mats.forEach((m, k) => m.color.copy(c.base).multiplyScalar(dim * (k ? .85 : 1))); c.hd.visible = c.tl.visible = !S.day });
    hazes.forEach(h => h.material.opacity = h.userData.op * (S.day ? .8 : 1));
    sun.color.set(S.sun[0]); sun.intensity = S.sun[1]; hemi.intensity = S.hemi; amb.intensity = S.amb;
    airplane.visible = redL.visible = greenL.visible = whiteL.visible = trail.visible = !!S.plane;
    birds.forEach(b => b.visible = !!S.birds); kaiju.visible = !!S.kaiju; fireGlow.intensity = S.kaiju ? 1.4 : 0;
    parts.visible = !!(S.rain || S.snow); parts.material = S.rain ? rainM : snowM; bolt.visible = !!S.rain;
    clouds.forEach(c => { c.visible = !!S.clouds; c.material.opacity = S.clouds === 'storm' ? .9 : S.clouds === 'fair' ? .85 : .5; c.material.color.set(S.clouds === 'storm' ? '#5a6478' : S.clouds === 'soft' ? '#9aa6c2' : '#ffffff') });
    sky.material.color.set('#ffffff');
    opt.onScene && opt.onScene(S);
  }
  function next(dir = 1) { if (trans) return; trans = { t0: performance.now(), to: (cur + dir + SCENES.length) % SCENES.length, swapped: false } }
  apply(0);
  const DUR = 14;
  let lastT = 0;
  function update(t) {
    const dt = Math.min(.05, t - lastT); lastT = t; follow();
    if (!trans && t - sceneT > DUR && !reduce && !api.paused) next(1);
    if (trans) { const k = (performance.now() - trans.t0) / 900; veil.material.opacity = k < .5 ? k * 2 : Math.max(0, 2 - k * 2); if (k >= .5 && !trans.swapped) { trans.swapped = true; apply(trans.to) } if (k >= 1) { trans = null; sceneT = t; veil.material.opacity = 0 } }
    const st = t - sceneT;
    // janelas, antenas e letreiros
    if (winLights.length && Math.random() < .12) { const w = winLights[Math.floor(Math.random() * winLights.length)]; const x = w.L.c.getContext('2d'); w.on = !w.on; x.fillStyle = w.on === false ? 'rgba(10,10,25,1)' : w.c; x.fillRect(w.x, w.y, w.w, w.h); w.L.t.needsUpdate = true }
    const blink = (t * 1.1 % 1) < .45 ? 1 : .08; LAYERS.forEach(L => L.bp.material.opacity = blink);
    if (neons.length && Math.random() < .03) { const n = neons[Math.floor(Math.random() * neons.length)]; n.on = false; drawNeon(n.L.c.getContext('2d'), n); n.L.t.needsUpdate = true; setTimeout(() => { n.on = true; drawNeon(n.L.c.getContext('2d'), n); n.L.t.needsUpdate = true }, 80 + Math.random() * 250) }
    // carros
    cars.forEach(c => { c.z += c.dir * c.v * dt * (S.rain || S.snow ? .65 : 1); if (c.z > 90) c.z = -170; if (c.z < -170) c.z = 90; c.g.position.z = c.z });
    // estrela cadente
    if ((S.id === 'night' || S.id === 'snow') && !reduce) { const sd = shoot.userData; if (!sd.next || t > sd.next + 1) { sd.next = t + 5 + Math.random() * 7; sd.y = 20 + Math.random() * 12; sd.z = -60 + Math.random() * 30 }
      const e = t - sd.next; if (e > 0 && e < .7) { shoot.position.set(LEFT - 80, sd.y - e * 8, sd.z + e * 34); shoot.rotation.x = .24; shoot.material.opacity = Math.sin(e / .7 * Math.PI) } else shoot.material.opacity = 0 } else shoot.material.opacity = 0;
    // nuvens
    clouds.forEach((c, k) => { c.position.z += dt * (1 + k * .2) * (S.clouds === 'storm' ? 2.5 : 1); if (c.position.z > 90) c.position.z = -160 });
    // avião
    if (S.plane) { const p = -110 + ((st * 7) % 120); airplane.position.z = p; redL.position.z = p - 3.4; greenL.position.z = p + 3.4; whiteL.position.z = p + 4.2; trail.position.z = p - 22;
      const bl = (Math.sin(t * 6) > .6) ? 1 : 0; redL.material.opacity = bl; greenL.material.opacity = bl; whiteL.material.opacity = (t * 1.5 % 1) < .08 ? 1 : 0 }
    // pássaros
    if (S.birds) birds.forEach((b, i) => { b.position.z = -48 + ((st * 3 + i * 3) % 60); b.position.y = 6 + (i % 3) * .8 + Math.sin(t * 2 + i) * .3; b.scale.y = .6 + Math.abs(Math.sin(t * 8 + i)) * .6 });
    // chuva / neve
    if (parts.visible) { const a = pg.attributes.position.array; const sp = S.rain ? 9 : .55;
      for (let i = 0; i < N; i++) { a[i * 3 + 1] -= dt * sp * pv[i]; if (S.snow) a[i * 3 + 2] += Math.sin(t + i) * dt * .12; if (S.rain) a[i * 3 + 2] += dt * .8; if (a[i * 3 + 1] < box.y0) { a[i * 3 + 1] = box.y1; a[i * 3 + 2] = box.z0 + Math.random() * (box.z1 - box.z0) } }
      pg.attributes.position.needsUpdate = true }
    // relâmpago
    if (S.rain) { if (!bolt.userData.next || t > bolt.userData.next) { bolt.userData.next = t + 3 + Math.random() * 5; bolt.userData.at = t; drawBolt(); bolt.position.z = -70 + Math.random() * 50 }
      const e = t - (bolt.userData.at || -9), f = e < .08 || (e > .16 && e < .24) ? 1 : Math.max(0, 1 - e * 3);
      bolt.material.opacity = e < .3 ? f : 0; sky.material.color.setScalar(1 + f * 1.4); sun.intensity = S.sun[1] + f * 7 }
    // Godzilla
    if (S.kaiju) { const walk = st / DUR; kaiju.position.z = -160 + walk * 40; kaiju.position.y = GY + 1.3 * GZS + Math.abs(Math.sin(st * 1.6)) * 2; gzBody.rotation.z = Math.sin(st * 1.6) * .02;
      const cyc = st % 4.2, firing = cyc > 2.6 && cyc < 3.8; gzSpine.material.opacity = firing ? 1 : .35 + Math.sin(t * 3) * .15;
      beam.material.opacity = firing ? .95 : 0; beam.position.set(1.26, 2.62, -.02); beam.scale.x = firing ? 3 : .01; beam.rotation.z = -.75;
      blast.material.opacity = firing ? .85 + Math.random() * .15 : Math.max(0, blast.material.opacity - dt * 2);
      fireGlow.intensity = 1.2 + Math.random() * .5 + (firing ? 2.5 : 0); fireGlow.color.set(firing ? '#9fd8ff' : '#ff6a2a'); sun.intensity = S.sun[1] + Math.sin(t * 9) * .15 }
  }
  const api = { update, next, set(i) { apply(i); sceneT = lastT }, paused: false, scenes: SCENES, get current() { return S } };
  return api;
}
