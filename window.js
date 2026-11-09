/* =========================================================
   JANELA: cidade em camadas + cenas que se revezam
   pôr do sol · noite com avião · chuva · dia de sol · neve · Godzilla
   ========================================================= */
export function setupWindow(THREE, scene, opt) {
  const { LEFT, sun, hemi, amb, reduce } = opt;
  const rng = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296 };
  const mkCanvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c };
  const mkTex = c => { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t };
  const basic = (map, o = {}) => new THREE.MeshBasicMaterial({ map, transparent: true, fog: false, depthWrite: o.dw ?? false, toneMapped: false, opacity: o.op ?? 1, blending: o.add ? THREE.AdditiveBlending : THREE.NormalBlending });
  const plane = (w, h, mat, x, y, z) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); m.rotation.y = Math.PI / 2; m.position.set(x, y, z); scene.add(m); return m };

  /* ---------- cenas ---------- */
  const SCENES = [
    { id: 'dusk', name: 'Pôr do sol', sky: ['#1a1f45', '#4a3466', '#c7637a', '#f2a35c', '#f7c56f'], stops: [0, .42, .68, .86, 1], sun: ['#ffb27a', 1.6], hemi: .35, amb: .35, lit: .5, orb: 'sunset' },
    { id: 'night', name: 'Noite com avião', sky: ['#05081a', '#0b1233', '#182452', '#2b3566'], stops: [0, .5, .85, 1], sun: ['#8fa6ff', .45], hemi: .22, amb: .3, lit: .62, orb: 'moon', plane: true },
    { id: 'rain', name: 'Chuva', sky: ['#0d1118', '#1a2230', '#2a3443', '#3a4556'], stops: [0, .5, .85, 1], sun: ['#7d8fb0', .35], hemi: .2, amb: .28, lit: .45, rain: true, clouds: 'storm' },
    { id: 'day', name: 'Dia de sol', sky: ['#3d8ee8', '#6fb1f2', '#a9d3f7', '#dcecf7'], stops: [0, .45, .8, 1], sun: ['#fff1d6', 2.7], hemi: .75, amb: .55, lit: 0, orb: 'sun', clouds: 'fair', birds: true, day: true },
    { id: 'snow', name: 'Neve', sky: ['#121a2e', '#25324f', '#4a5a78', '#7c8aa6'], stops: [0, .5, .85, 1], sun: ['#c4d6ff', .8], hemi: .35, amb: .4, lit: .6, snow: true, clouds: 'soft' },
    { id: 'kaiju', name: 'Godzilla', sky: ['#14060a', '#3a0b12', '#7a1c12', '#d1451a', '#ff8a2a'], stops: [0, .35, .65, .88, 1], sun: ['#ff6a3a', 1.5], hemi: .3, amb: .32, lit: .35, kaiju: true, fires: true },
  ];

  /* ---------- céu ---------- */
  const skyC = mkCanvas(1024, 512), skyT = mkTex(skyC);
  const skyM = basic(skyT, { dw: true }); skyM.transparent = false;
  const sky = plane(46, 22, skyM, LEFT - 15, 3, -6);
  function drawSky(S) {
    const x = skyC.getContext('2d'), w = skyC.width, h = skyC.height;
    const g = x.createLinearGradient(0, 0, 0, h); S.sky.forEach((c, i) => g.addColorStop(S.stops[i], c)); x.fillStyle = g; x.fillRect(0, 0, w, h);
    if (!S.day && S.id !== 'rain') { const r = rng(9); for (let i = 0; i < 260; i++) { const a = r() * (S.id === 'kaiju' ? .25 : .8); x.fillStyle = `rgba(255,255,255,${a})`; const s = r() < .08 ? 2 : 1; x.fillRect(r() * w, r() * h * .55, s, s) } }
    if (S.id === 'snow') { x.fillStyle = 'rgba(200,215,255,.08)'; x.fillRect(0, h * .55, w, h * .45) }
    skyT.needsUpdate = true;
  }
  // astro (sol/lua)
  const orbC = mkCanvas(512, 512), orbT = mkTex(orbC);
  const orb = plane(3.2, 3.2, basic(orbT), LEFT - 14.5, 4.4, -7.5);
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
  const clouds = []; for (let i = 0; i < 6; i++) { const m = basic(cloudT, { op: 0 }); const c = plane(6 + i % 3 * 2, 3, m, LEFT - 13 + i * .1, 3.2 + (i % 3) * .7, -14 + i * 4.2); clouds.push(c) }

  /* ---------- skyline em camadas ---------- */
  const LAYERS = [
    { d: 11, w: 26, h: 4.8, base: -2.2, z: -7, seed: 11, n: 1, col: [.42, .5], hmin: .25, hmax: .85 },
    { d: 7.5, w: 18, h: 3.9, base: -2.1, z: -5.5, seed: 23, n: 2, col: [.6, .7], hmin: .3, hmax: .95 },
    { d: 4.6, w: 12, h: 3.3, base: -2.1, z: -3.6, seed: 37, n: 3, col: [.85, 1], hmin: .25, hmax: .9, palms: true },
  ];
  LAYERS.forEach(L => { L.c = mkCanvas(2048, Math.round(2048 * L.h / L.w)); L.t = mkTex(L.c); L.mesh = plane(L.w, L.h, basic(L.t), LEFT - L.d, L.base + L.h / 2, L.z); L.mesh.renderOrder = 10 - L.n });
  const winLights = []; // janelas que piscam (camada da frente)
  function drawLayer(L, S) {
    const x = L.c.getContext('2d'), W = L.c.width, H = L.c.height; x.clearRect(0, 0, W, H);
    const r = rng(L.seed); const dk = L.col[0];
    const tone = (hex, k) => { const c = new THREE.Color(hex); return '#' + c.multiplyScalar(k).getHexString() };
    const baseCol = S.day ? ['#8ea6bf', '#9db2c7', '#7d93ab', '#b3c2d1'] : S.id === 'kaiju' ? ['#1a0c10', '#22101a', '#140a10'] : S.id === 'snow' ? ['#1e2840', '#252f4a', '#1a2338'] : ['#141634', '#1b1b3c', '#201a40', '#121530'];
    let px = -20;
    while (px < W) {
      const bw = 70 + r() * (L.n === 3 ? 170 : 130), bh = H * (L.hmin + r() * (L.hmax - L.hmin)), top = H - bh;
      const c0 = baseCol[Math.floor(r() * baseCol.length)];
      const k = S.day ? (.78 + L.n * .07) : (dk + L.n * .05 + .45);
      // corpo + face lateral
      const side = bw * .18;
      x.fillStyle = tone(c0, k * (S.day ? .78 : .7)); x.fillRect(px + bw - side, top + 6, side, bh);
      const g = x.createLinearGradient(0, top, 0, H); g.addColorStop(0, tone(c0, k * (S.day ? 1.08 : 1.15))); g.addColorStop(1, tone(c0, k * .8)); x.fillStyle = g; x.fillRect(px, top, bw - side, bh);
      // borda iluminada pelo céu
      x.fillStyle = S.day ? 'rgba(255,255,255,.35)' : S.id === 'kaiju' ? 'rgba(255,120,60,.35)' : 'rgba(255,190,150,.18)'; x.fillRect(px, top, bw - side, 2);
      // topo
      const roof = r();
      if (roof < .22) { x.fillStyle = tone(c0, k * .9); x.fillRect(px + bw * .2, top - bh * .08, bw * .45, bh * .08); x.fillRect(px + bw * .32, top - bh * .14, bw * .2, bh * .06) }
      else if (roof < .4) { x.fillStyle = tone(c0, k * .8); x.fillRect(px + bw * .45, top - 70, 4, 70); x.fillStyle = '#ff3b3b'; x.beginPath(); x.arc(px + bw * .45 + 2, top - 72, 4, 0, 7); x.fill() }
      else if (roof < .55) { x.fillStyle = tone(c0, k * .75); const tx = px + bw * .6; x.fillRect(tx, top - 34, 30, 26); x.fillRect(tx + 4, top - 8, 3, 8); x.fillRect(tx + 23, top - 8, 3, 8); x.beginPath(); x.moveTo(tx - 2, top - 34); x.lineTo(tx + 15, top - 46); x.lineTo(tx + 32, top - 34); x.fill() }
      else if (roof < .65) { x.fillStyle = tone(c0, k * .95); x.beginPath(); x.moveTo(px, top); x.lineTo(px + (bw - side) / 2, top - bh * .12); x.lineTo(px + bw - side, top); x.fill() }
      else { x.fillStyle = tone(c0, k * .65); x.fillRect(px - 2, top - 6, bw - side + 4, 6) }
      // neve nos telhados
      if (S.snow) { x.fillStyle = '#eef3ff'; x.fillRect(px - 2, top - 7, bw + 2, 7); x.fillStyle = 'rgba(238,243,255,.6)'; for (let i = 0; i < 5; i++) x.fillRect(px + r() * bw, top + r() * 6, 8 + r() * 14, 3) }
      // janelas
      const ww = 7 + Math.floor(r() * 5), wh = 9 + Math.floor(r() * 6), gx = ww + 6 + Math.floor(r() * 6), gy = wh + 8;
      const style = r();
      for (let yy = top + 16; yy < H - 14; yy += gy) {
        for (let xx = px + 10; xx < px + bw - side - ww - 6; xx += gx) {
          if (S.day) { x.fillStyle = style < .5 ? 'rgba(200,225,245,.75)' : 'rgba(120,150,180,.55)'; x.fillRect(xx, yy, ww, wh); x.fillStyle = 'rgba(255,255,255,.35)'; x.fillRect(xx, yy, ww, 2); continue }
          const on = r() < S.lit;
          if (on) { const c = ['#ffd27a', '#ffb35a', '#ffe7a8', '#9fd0ff', '#ffc48a'][Math.floor(r() * 5)]; x.fillStyle = c; x.fillRect(xx, yy, ww, wh); if (L.n === 3 && r() < .25) winLights.push({ L, x: xx, y: yy, w: ww, h: wh, c }) }
          else { x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(xx, yy, ww, wh) }
        }
      }
      // fogo (Godzilla)
      if (S.fires && r() < .3) { const fy = top + bh * (.15 + r() * .4); const fg = x.createRadialGradient(px + bw / 2, fy, 0, px + bw / 2, fy, bw * .7); fg.addColorStop(0, 'rgba(255,170,60,.9)'); fg.addColorStop(.4, 'rgba(255,80,20,.45)'); fg.addColorStop(1, 'rgba(255,60,20,0)'); x.fillStyle = fg; x.fillRect(px - bw * .3, fy - bw * .7, bw * 1.6, bw * 1.4) }
      px += bw + 4 + r() * 18;
    }
    // névoa na base
    const hz = x.createLinearGradient(0, H * .6, 0, H); hz.addColorStop(0, 'rgba(0,0,0,0)');
    hz.addColorStop(1, S.day ? 'rgba(200,215,230,.55)' : S.id === 'kaiju' ? 'rgba(255,90,30,.35)' : S.id === 'snow' ? 'rgba(220,230,255,.35)' : 'rgba(255,140,120,.12)'); x.fillStyle = hz; x.fillRect(0, H * .6, W, H * .4);
    if (L.palms) { drawPalms(x, W, H, S); drawBillboard(x, W, H, S) }
    L.t.needsUpdate = true;
  }
  function drawPalms(x, W, H, S) {
    const col = S.day ? '#24412f' : S.id === 'snow' ? '#1c2433' : '#0b0a14';
    [[W * .1, .55], [W * .17, .48], [W * .62, .52], [W * .86, .58]].forEach(([bx, hh]) => {
      const ht = H * hh, topX = bx + 24, topY = H - ht;
      x.strokeStyle = col; x.lineCap = 'round';
      for (let i = 0; i < 14; i++) { const t0 = i / 14, t1 = (i + 1) / 14; x.lineWidth = 16 - i * .6; x.beginPath(); x.moveTo(bx + Math.sin(t0 * 1.6) * 24, H - t0 * ht); x.lineTo(bx + Math.sin(t1 * 1.6) * 24, H - t1 * ht); x.stroke() }
      for (let f = 0; f < 9; f++) {
        const a = -Math.PI / 2 + (f - 4) * .38, len = 110 + (f % 3) * 25, droop = 70;
        x.lineWidth = 4; x.beginPath(); const ex = topX + Math.cos(a) * len, ey = topY + Math.sin(a) * len * .5 + droop;
        const cx = topX + Math.cos(a) * len * .55, cy = topY + Math.sin(a) * len * .7 - 18; x.moveTo(topX, topY); x.quadraticCurveTo(cx, cy, ex, ey); x.stroke();
        for (let s = 2; s < 16; s++) { const t = s / 16; const qx = (1 - t) * (1 - t) * topX + 2 * (1 - t) * t * cx + t * t * ex, qy = (1 - t) * (1 - t) * topY + 2 * (1 - t) * t * cy + t * t * ey; x.lineWidth = 2.4; x.beginPath(); x.moveTo(qx, qy); x.lineTo(qx + Math.cos(a + 1.2) * 26 * (1 - t * .5), qy + 22 * (1 - t * .4)); x.moveTo(qx, qy); x.lineTo(qx + Math.cos(a - 1.2) * 26 * (1 - t * .5), qy + 22 * (1 - t * .4)); x.stroke() }
      }
      if (S.snow) { x.fillStyle = 'rgba(238,243,255,.8)'; x.beginPath(); x.ellipse(topX, topY - 6, 40, 9, 0, 0, 7); x.fill() }
    });
  }
  function drawBillboard(x, W, H, S) {
    const bx = W * .36, by = H * .42, bw = 220, bh = 88;
    x.fillStyle = '#0b0b10'; x.fillRect(bx + 40, by + bh, 8, H - by - bh); x.fillRect(bx + bw - 48, by + bh, 8, H - by - bh);
    x.fillStyle = S.day ? '#2c5240' : '#101614'; x.fillRect(bx, by, bw, bh);
    x.strokeStyle = '#e39a5c'; x.lineWidth = 4; x.strokeRect(bx + 6, by + 6, bw - 12, bh - 12);
    x.font = '700 40px "Pixelify Sans", "Silkscreen", monospace'; x.textAlign = 'center'; x.textBaseline = 'middle';
    if (!S.day) { x.shadowColor = '#ff9a52'; x.shadowBlur = 22 } x.fillStyle = S.day ? '#e4dcc8' : '#ffe2c4'; x.fillText('YAN DSGN', bx + bw / 2, by + bh / 2 + 2); x.shadowBlur = 0;
    if (S.snow) { x.fillStyle = '#eef3ff'; x.fillRect(bx - 4, by - 8, bw + 8, 9) }
  }

  /* ---------- avião ---------- */
  const apC = mkCanvas(512, 192), apT = mkTex(apC);
  (() => { const x = apC.getContext('2d'); x.fillStyle = '#0a0d18'; x.beginPath(); x.ellipse(256, 96, 150, 16, 0, 0, 7); x.fill(); x.beginPath(); x.moveTo(230, 96); x.lineTo(150, 30); x.lineTo(180, 30); x.lineTo(290, 96); x.fill(); x.beginPath(); x.moveTo(230, 96); x.lineTo(160, 170); x.lineTo(190, 170); x.lineTo(290, 96); x.fill(); x.beginPath(); x.moveTo(380, 96); x.lineTo(410, 40); x.lineTo(430, 40); x.lineTo(410, 96); x.fill(); apT.needsUpdate = true })();
  const airplane = plane(1.5, .56, basic(apT), LEFT - 12.4, 3.6, -14); airplane.visible = false;
  const glowDot = c => { const cv = mkCanvas(64, 64), x = cv.getContext('2d'); const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, c); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); return mkTex(cv) };
  const redL = plane(.45, .45, basic(glowDot('rgba(255,60,60,1)'), { add: true }), LEFT - 12.3, 3.6, -14), greenL = plane(.45, .45, basic(glowDot('rgba(80,255,120,1)'), { add: true }), LEFT - 12.3, 3.6, -14), whiteL = plane(.55, .55, basic(glowDot('rgba(255,255,255,1)'), { add: true }), LEFT - 12.3, 3.6, -14);
  const trailC = mkCanvas(512, 32); (() => { const x = trailC.getContext('2d'); const g = x.createLinearGradient(0, 0, 512, 0); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(230,235,255,.45)'); x.fillStyle = g; x.fillRect(0, 12, 512, 8) })();
  const trail = plane(7, .2, basic(mkTex(trailC)), LEFT - 12.5, 3.62, -18);

  /* ---------- pássaros (dia) ---------- */
  const birdC = mkCanvas(64, 32); (() => { const x = birdC.getContext('2d'); x.strokeStyle = '#1b2633'; x.lineWidth = 3; x.beginPath(); x.moveTo(4, 12); x.quadraticCurveTo(18, 2, 32, 16); x.quadraticCurveTo(46, 2, 60, 12); x.stroke() })();
  const birdT = mkTex(birdC); const birds = []; for (let i = 0; i < 7; i++) { const b = plane(.3, .15, basic(birdT), LEFT - 9 - i * .2, 3 + (i % 3) * .25, -10 - i * .6); b.visible = false; birds.push(b) }

  /* ---------- Godzilla ---------- */
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
  const kaiju = new THREE.Group(); kaiju.position.set(LEFT - 9.2, 0, -10.5); kaiju.rotation.y = -Math.PI / 2; kaiju.scale.setScalar(.8); scene.add(kaiju); kaiju.visible = false;
  const gzBody = new THREE.Mesh(new THREE.PlaneGeometry(5.4, 5.4), basic(gzT, { dw: false })); gzBody.material.side = THREE.DoubleSide; gzBody.position.y = 1.4; kaiju.add(gzBody);
  const gzSpine = new THREE.Mesh(new THREE.PlaneGeometry(5.4, 5.4), basic(spineT, { add: true, op: .6 })); gzSpine.material.side = THREE.DoubleSide; gzSpine.position.set(0, 1.4, -.01); kaiju.add(gzSpine);
  const beamC = mkCanvas(512, 64); (() => { const x = beamC.getContext('2d'); const g = x.createLinearGradient(0, 0, 0, 64); g.addColorStop(0, 'rgba(120,200,255,0)'); g.addColorStop(.5, 'rgba(230,248,255,1)'); g.addColorStop(1, 'rgba(120,200,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 512, 64) })();
  const beamG = new THREE.PlaneGeometry(1, .35); beamG.translate(.5, 0, 0); const beam = new THREE.Mesh(beamG, basic(mkTex(beamC), { add: true, op: 0 })); beam.material.side = THREE.DoubleSide; kaiju.add(beam);
  const blast = plane(2.4, 2.4, basic(glowDot('rgba(170,225,255,1)'), { add: true, op: 0 }), LEFT - 7.3, 1.2, -6.4);
  const fireGlow = new THREE.PointLight('#ff6a2a', 0, 12, 1.4); fireGlow.position.set(LEFT - .5, 1.6, -1); scene.add(fireGlow);

  /* ---------- chuva e neve (partículas) ---------- */
  const N = 1400, pg = new THREE.BufferGeometry(), pp = new Float32Array(N * 3), pv = new Float32Array(N);
  const box = { x0: LEFT - 6, x1: LEFT - .25, y0: -.5, y1: 4.2, z0: -5.5, z1: 1.2 };
  for (let i = 0; i < N; i++) { pp[i * 3] = box.x0 + Math.random() * (box.x1 - box.x0); pp[i * 3 + 1] = box.y0 + Math.random() * (box.y1 - box.y0); pp[i * 3 + 2] = box.z0 + Math.random() * (box.z1 - box.z0); pv[i] = .6 + Math.random() * .8 }
  pg.setAttribute('position', new THREE.BufferAttribute(pp, 3));
  const flakeC = mkCanvas(32, 32); (() => { const x = flakeC.getContext('2d'); const g = x.createRadialGradient(16, 16, 0, 16, 16, 16); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 32, 32) })();
  const dropC = mkCanvas(8, 64); (() => { const x = dropC.getContext('2d'); const g = x.createLinearGradient(0, 0, 0, 64); g.addColorStop(0, 'rgba(190,210,240,0)'); g.addColorStop(1, 'rgba(210,225,255,.85)'); x.fillStyle = g; x.fillRect(3, 0, 2, 64) })();
  const snowM = new THREE.PointsMaterial({ size: .07, map: mkTex(flakeC), transparent: true, depthWrite: false, fog: false, opacity: .95 });
  const rainM = new THREE.PointsMaterial({ size: .16, map: mkTex(dropC), transparent: true, depthWrite: false, fog: false, opacity: .7 });
  const parts = new THREE.Points(pg, snowM); parts.visible = false; scene.add(parts);
  // relâmpago
  const boltC = mkCanvas(256, 1024), boltT = mkTex(boltC);
  function drawBolt() { const x = boltC.getContext('2d'); x.clearRect(0, 0, 256, 1024); x.strokeStyle = '#f4f8ff'; x.shadowColor = '#9ec4ff'; x.shadowBlur = 24; x.lineWidth = 6; x.beginPath(); let bx = 128, by = 0; x.moveTo(bx, by); while (by < 1024) { bx += (Math.random() - .5) * 90; by += 40 + Math.random() * 60; x.lineTo(bx, by); if (Math.random() < .2) { x.moveTo(bx, by); x.lineTo(bx + (Math.random() - .5) * 140, by + 90); x.moveTo(bx, by) } } x.stroke(); boltT.needsUpdate = true }
  const bolt = plane(2, 8, basic(boltT, { add: true, op: 0 }), LEFT - 10.5, 3, -6);

  /* ---------- véu de transição ---------- */
  const veil = plane(30, 16, new THREE.MeshBasicMaterial({ color: '#000', transparent: true, opacity: 0, fog: false, depthWrite: false }), LEFT - .2, 1.8, -1); veil.renderOrder = 20;

  /* ---------- aplicar cena ---------- */
  let cur = 0, S = SCENES[0], sceneT = 0, trans = null;
  function apply(i) {
    S = SCENES[i]; cur = i; winLights.length = 0;
    drawSky(S); drawOrb(S.orb); LAYERS.forEach(L => drawLayer(L, S));
    sun.color.set(S.sun[0]); sun.intensity = S.sun[1]; hemi.intensity = S.hemi; amb.intensity = S.amb;
    airplane.visible = redL.visible = greenL.visible = whiteL.visible = trail.visible = !!S.plane;
    birds.forEach(b => b.visible = !!S.birds); kaiju.visible = !!S.kaiju; blast.visible = !!S.kaiju; fireGlow.intensity = S.kaiju ? 1.4 : 0;
    parts.visible = !!(S.rain || S.snow); parts.material = S.rain ? rainM : snowM; bolt.visible = !!S.rain;
    clouds.forEach((c, k) => { c.visible = !!S.clouds; c.material.opacity = S.clouds === 'storm' ? .9 : S.clouds === 'fair' ? .85 : .5; c.material.color.set(S.clouds === 'storm' ? '#5a6478' : S.clouds === 'soft' ? '#9aa6c2' : '#ffffff') });
    sky.material.color.set('#ffffff');
    opt.onScene && opt.onScene(S);
  }
  function next(dir = 1) { if (trans) return; trans = { t0: performance.now(), to: (cur + dir + SCENES.length) % SCENES.length, swapped: false } }
  apply(0);
  const DUR = 14;
  let lastT = 0;
  function update(t) {
    const dt = Math.min(.05, t - lastT); lastT = t;
    if (!trans && t - sceneT > DUR && !reduce && !api.paused) next(1);
    if (trans) { const k = (performance.now() - trans.t0) / 900; veil.material.opacity = k < .5 ? k * 2 : Math.max(0, 2 - k * 2); if (k >= .5 && !trans.swapped) { trans.swapped = true; apply(trans.to) } if (k >= 1) { trans = null; sceneT = t; veil.material.opacity = 0 } }
    const st = t - sceneT;
    // janelas piscando
    if (winLights.length && Math.random() < .05) { const w = winLights[Math.floor(Math.random() * winLights.length)]; const x = w.L.c.getContext('2d'); w.on = !w.on; x.fillStyle = w.on === false ? 'rgba(10,10,25,1)' : w.c; x.fillRect(w.x, w.y, w.w, w.h); w.L.t.needsUpdate = true }
    // nuvens
    clouds.forEach((c, k) => { c.position.z += dt * (.18 + k * .03) * (S.clouds === 'storm' ? 2 : 1); if (c.position.z > 10) c.position.z = -18 });
    // avião
    if (S.plane) { const p = -14 + ((st * 1.1) % 16); airplane.position.z = p; airplane.position.y = 2.9; redL.position.set(airplane.position.x + .05, 2.9, p - .58); greenL.position.set(airplane.position.x + .05, 2.9, p + .58); whiteL.position.set(airplane.position.x + .05, 2.92, p + .7); trail.position.y = 2.92;
      const bl = (Math.sin(t * 6) > .6) ? 1 : 0; redL.material.opacity = bl; greenL.material.opacity = bl; whiteL.material.opacity = (t * 1.5 % 1) < .08 ? 1 : 0; trail.position.z = p - 3.6 }
    // pássaros
    if (S.birds) birds.forEach((b, i) => { b.position.z = -12 + ((st * .5 + i * .7) % 18); b.position.y = 3 + (i % 3) * .25 + Math.sin(t * 2 + i) * .08; b.scale.y = .6 + Math.abs(Math.sin(t * 8 + i)) * .6 });
    // partículas
    if (parts.visible) { const a = pg.attributes.position.array; const sp = S.rain ? 9 : .55;
      for (let i = 0; i < N; i++) { a[i * 3 + 1] -= dt * sp * pv[i]; if (S.snow) a[i * 3 + 2] += Math.sin(t + i) * dt * .12; if (S.rain) a[i * 3 + 2] += dt * .8; if (a[i * 3 + 1] < box.y0) { a[i * 3 + 1] = box.y1; a[i * 3 + 2] = box.z0 + Math.random() * (box.z1 - box.z0) } }
      pg.attributes.position.needsUpdate = true }
    // relâmpago
    if (S.rain) { if (!bolt.userData.next || t > bolt.userData.next) { bolt.userData.next = t + 3 + Math.random() * 5; bolt.userData.at = t; drawBolt(); bolt.position.z = -9 + Math.random() * 6 }
      const e = t - (bolt.userData.at || -9), f = e < .08 || (e > .16 && e < .24) ? 1 : Math.max(0, 1 - e * 3);
      bolt.material.opacity = e < .3 ? f : 0; sky.material.color.setScalar(1 + f * 1.4); sun.intensity = S.sun[1] + f * 7 }
    // Godzilla
    if (S.kaiju) { const walk = st / DUR; kaiju.position.z = -11 + walk * 1.6; kaiju.position.y = Math.abs(Math.sin(st * 1.6)) * .12; gzBody.rotation.z = Math.sin(st * 1.6) * .02;
      const cyc = st % 4.2, firing = cyc > 2.6 && cyc < 3.8; const glowK = firing ? 1 : .35 + Math.sin(t * 3) * .15; gzSpine.material.opacity = glowK;
      beam.material.opacity = firing ? .95 : 0; beam.position.set(1.26, 2.62, -.02); beam.scale.x = firing ? 3 : .01; beam.rotation.z = -.75;
      blast.material.opacity = firing ? .85 + Math.random() * .15 : Math.max(0, blast.material.opacity - dt * 2); blast.position.z = kaiju.position.z + 2.76; blast.position.y = .45;
      fireGlow.intensity = 1.2 + Math.random() * .5 + (firing ? 2.5 : 0); fireGlow.color.set(firing ? '#9fd8ff' : '#ff6a2a'); sun.intensity = S.sun[1] + Math.sin(t * 9) * .15 }
  }
  const api = { update, next, set(i) { apply(i); sceneT = lastT }, paused: false, scenes: SCENES, get current() { return S } };
  return api;
}
