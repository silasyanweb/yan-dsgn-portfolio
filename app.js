import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { DecalGeometry } from 'three/addons/geometries/DecalGeometry.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { setupWindow } from './window.js';

const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
const isMobile=()=>innerWidth<760;

/* =========================================================
   BOOT (tela de carregamento)
   ========================================================= */
const LOG=['carregando pincéis e fontes','importando 38 camadas','calibrando cores: #C8743A #2C5240','montando o quarto: mesa, monitor, neon','acendendo o abajur','renderizando o Yan'];
const bar=$('#bar'); bar.innerHTML='<i></i>'.repeat(28);
let bootP=0, bootReady=false;
function setBoot(p){ bootP=Math.max(bootP,p); const n=Math.round(bootP*28);
  $$('#bar i').forEach((c,i)=>c.classList.toggle('on',i<n)); $('#mpct').textContent=Math.round(bootP*100)+'%';
  const lines=Math.min(LOG.length,Math.floor(bootP*LOG.length+.001));
  const ul=$('#log'); while(ul.children.length<lines){const i=ul.children.length;const li=document.createElement('li');li.innerHTML=`<span class="ok">[ OK ]</span> ${LOG[i]}`;ul.append(li)}
  if(bootP>=1&&!bootReady){bootReady=true;$('#mlabel').textContent='PRONTO';$('#enter').classList.add('show');$('#enMudo').focus()}
}
let fake=0; const fakeT=setInterval(()=>{fake=Math.min(.85,fake+.04+Math.random()*.03);setBoot(Math.min(fake,loadP*0.85+fake*.15))},140);
let loadP=0;
function enter(sound){ $('#boot').classList.add('gone'); if(sound) audio.start(); started=true; setTimeout(()=>{ if(location.hash.length>1) route(); },600); }
$('#enSom').onclick=()=>enter(true); $('#enMudo').onclick=()=>enter(false);

/* =========================================================
   ÁUDIO (ambiente lo-fi + cliques de teclado)
   ========================================================= */
const audio={ctx:null,on:false,master:null,
  start(){ try{ this.ctx=this.ctx||new (window.AudioContext||window.webkitAudioContext)(); }catch(e){return}
    const c=this.ctx; this.master=c.createGain(); this.master.gain.value=0; this.master.connect(c.destination);
    // pad
    const lp=c.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=900; lp.connect(this.master);
    [110,164.81,207.65,246.94].forEach((f,i)=>{const o=c.createOscillator();o.type=i%2?'triangle':'sine';o.frequency.value=f;o.detune.value=(i-1.5)*6;const g=c.createGain();g.gain.value=.05;o.connect(g);g.connect(lp);o.start();
      const l=c.createOscillator();l.frequency.value=.07+i*.03;const lg=c.createGain();lg.gain.value=.03;l.connect(lg);lg.connect(g.gain);l.start()});
    // vinyl/rain noise
    const buf=c.createBuffer(1,c.sampleRate*2,c.sampleRate),d=buf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*(Math.random()<.002?1:.25);
    const n=c.createBufferSource();n.buffer=buf;n.loop=true;const bp=c.createBiquadFilter();bp.type='bandpass';bp.frequency.value=2400;bp.Q.value=.6;const ng=c.createGain();ng.gain.value=.05;n.connect(bp);bp.connect(ng);ng.connect(this.master);n.start();
    this.on=true; this.master.gain.linearRampToValueAtTime(.55,c.currentTime+2); this.ui(); },
  toggle(){ if(!this.ctx){this.start();return} this.on=!this.on; this.master.gain.linearRampToValueAtTime(this.on?.55:0,this.ctx.currentTime+.4); this.ui() },
  ui(){ $('#snd').textContent='♪ Som: '+(this.on?'on':'off'); $('#snd').setAttribute('aria-pressed',this.on) },
  click(){ if(!this.on||!this.ctx)return; const c=this.ctx,t=c.currentTime; const b=c.createBuffer(1,c.sampleRate*.03,c.sampleRate),d=b.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/d.length,6);
    const s=c.createBufferSource();s.buffer=b;const hp=c.createBiquadFilter();hp.type='highpass';hp.frequency.value=1800+Math.random()*900;const g=c.createGain();g.gain.value=.16;s.connect(hp);hp.connect(g);g.connect(this.master);s.start(t) }
};
$('#snd').onclick=()=>audio.toggle();

/* =========================================================
   CENA 3D
   ========================================================= */
let started=false;
const canvas=$('#gl');
let renderer;
try{ renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'}); }
catch(e){ $('#nogl').style.display='grid'; clearInterval(fakeT); setBoot(1); }
const scene=new THREE.Scene();
scene.background=new THREE.Color('#0d1311');
scene.fog=new THREE.Fog('#0d1311',9,16);
const camera=new THREE.PerspectiveCamera(42,innerWidth/innerHeight,.05,60);
const manager=new THREE.LoadingManager();
manager.onProgress=(u,l,t)=>{loadP=l/t};
manager.onLoad=()=>{loadP=1; clearInterval(fakeT); let p=bootP; const fin=setInterval(()=>{p=Math.min(1,p+.05);setBoot(p);if(p>=1)clearInterval(fin)},60)};
const tl=new THREE.TextureLoader(manager);
const tex=(u,srgb=true)=>{const t=tl.load(u);if(srgb)t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;return t};

if(renderer){
  renderer.setPixelRatio(Math.min(devicePixelRatio,2));
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping; renderer.toneMappingExposure=1.05;
  renderer.shadowMap.enabled=true; renderer.shadowMap.type=THREE.PCFSoftShadowMap;
}

/* ---------- helpers ---------- */
const M=(c,o={})=>new THREE.MeshStandardMaterial({color:c,roughness:o.r??.75,metalness:o.m??0,emissive:o.e??0x000000,emissiveIntensity:o.ei??1,map:o.map??null,transparent:!!o.t,opacity:o.op??1,side:o.side??THREE.FrontSide});
function box(w,h,d,mat,x,y,z,parent=scene,rounded=0){const g=rounded?new RoundedBoxGeometry(w,h,d,3,rounded):new THREE.BoxGeometry(w,h,d);const m=new THREE.Mesh(g,mat);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;parent.add(m);return m}
function cyl(rt,rb,h,mat,x,y,z,parent=scene,seg=24){const m=new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,seg),mat);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;parent.add(m);return m}
function canvasTex(w,h,draw){const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');draw(x,w,h);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;t.userData.ctx=x;t.userData.canvas=c;return t}

/* ---------- luzes ---------- */
const hemi=new THREE.HemisphereLight('#9fb6d6','#2a1d16',.35); scene.add(hemi);
const amb=new THREE.AmbientLight('#4b4560',.35); scene.add(amb);
const sun=new THREE.DirectionalLight('#ffb27a',1.6); sun.position.set(-7,4.2,-0.5); sun.target.position.set(0,0.4,-1);
sun.castShadow=true; sun.shadow.mapSize.set(2048,2048); Object.assign(sun.shadow.camera,{left:-4,right:4,top:4,bottom:-2,near:1,far:16}); sun.shadow.bias=-.0008;
scene.add(sun,sun.target);
const lampL=new THREE.PointLight('#ffb36b',5,4.2,1.6); lampL.position.set(-0.95,1.32,-1.55); lampL.castShadow=true; lampL.shadow.mapSize.set(1024,1024); lampL.shadow.bias=-.002; scene.add(lampL);
const screenL=new THREE.PointLight('#a8cfff',.9,2.2,2); scene.add(screenL);
const fill=new THREE.DirectionalLight('#ffd9b8',.75); fill.position.set(3.2,2.6,3.2); scene.add(fill,fill.target);
const corkSpot=new THREE.SpotLight('#ffcf9a',9,4,.55,.6,1.5); corkSpot.position.set(1.75,3.0,-1.3); scene.add(corkSpot,corkSpot.target);
const neonL=new THREE.PointLight('#ff9a52',2.4,3.5,1.8); neonL.position.set(-0.15,2.2,-2.1); scene.add(neonL);

/* ---------- quarto ---------- */
const RW=6.4,RD=5.2,RH=3.1, BACK=-2.5, LEFT=-3.2, RIGHT=3.2;
const floorTex=canvasTex(1024,1024,(x,w,h)=>{x.fillStyle='#3a2a20';x.fillRect(0,0,w,h);const rows=16;for(let r=0;r<rows;r++){const y=r*h/rows;let off=(r*137)%256;for(let px=-off;px<w;px+=256){const l=28+Math.random()*14;x.fillStyle=`hsl(22,${30+Math.random()*10}%,${l*0.62}%)`;x.fillRect(px+1,y+1,254,h/rows-2);x.fillStyle='rgba(0,0,0,.08)';for(let k=0;k<6;k++)x.fillRect(px+Math.random()*250,y+3+Math.random()*(h/rows-8),60+Math.random()*120,1)}}});
floorTex.wrapS=floorTex.wrapT=THREE.RepeatWrapping; floorTex.repeat.set(2,2);
const floor=new THREE.Mesh(new THREE.PlaneGeometry(RW,RD+3),M('#ffffff',{map:floorTex,r:.55}));floor.rotation.x=-Math.PI/2;floor.position.set(0,0,0);floor.receiveShadow=true;scene.add(floor);
const wallTex=canvasTex(512,512,(x,w,h)=>{x.fillStyle='#232b28';x.fillRect(0,0,w,h);x.fillStyle='#1d2422';for(let i=0;i<w;i+=128)x.fillRect(i,0,3,h);x.fillRect(0,h*.5,w,3)});
wallTex.wrapS=wallTex.wrapT=THREE.RepeatWrapping;
const wallMat=M('#ffffff',{map:wallTex,r:.9});
const backWall=new THREE.Mesh(new THREE.PlaneGeometry(RW,RH),wallMat);backWall.position.set(0,RH/2,BACK);backWall.receiveShadow=true;scene.add(backWall);
wallTex.repeat.set(3,1.5);
const rightWall=new THREE.Mesh(new THREE.PlaneGeometry(RD+3,RH),wallMat);rightWall.rotation.y=-Math.PI/2;rightWall.position.set(RIGHT,RH/2,0);rightWall.receiveShadow=true;scene.add(rightWall);
// parede esquerda com janela (4 peças)
const winX0=-2.0,winX1=0.0,winY0=1.0,winY1=2.55; // em z (ao longo da parede) e y
function leftPiece(z0,z1,y0,y1){const m=new THREE.Mesh(new THREE.PlaneGeometry(z1-z0,y1-y0),wallMat);m.rotation.y=Math.PI/2;m.position.set(LEFT,(y0+y1)/2,(z0+z1)/2);m.receiveShadow=true;scene.add(m)}
leftPiece(BACK,winX0,0,RH);leftPiece(winX1,RD/2+1.5,0,RH);leftPiece(winX0,winX1,0,winY0);leftPiece(winX0,winX1,winY1,RH);
const ceil=new THREE.Mesh(new THREE.PlaneGeometry(RW,RD+3),M('#151a18'));ceil.rotation.x=Math.PI/2;ceil.position.y=RH;scene.add(ceil);
// rodapé
box(RW,.1,.02,M('#141917'),0,.05,BACK+.01);
// janela: moldura + cidade
const frameM=M('#101412',{r:.5});
box(.08,winY1-winY0+.12,.08,frameM,LEFT+.02,(winY0+winY1)/2,winX0);box(.08,winY1-winY0+.12,.08,frameM,LEFT+.02,(winY0+winY1)/2,winX1);
box(.08,.06,winX1-winX0,frameM,LEFT+.02,winY0,(winX0+winX1)/2);box(.08,.06,winX1-winX0,frameM,LEFT+.02,winY1,(winX0+winX1)/2);
box(.05,winY1-winY0,.04,frameM,LEFT+.02,(winY0+winY1)/2,(winX0+winX1)/2);
box(.24,.04,winX1-winX0+.2,M('#2c3833'),LEFT+.1,winY0-.03,(winX0+winX1)/2);
const win=setupWindow(THREE,scene,{LEFT,sun,hemi,amb,reduce});window.__win=win;
const winHit=new THREE.Mesh(new THREE.PlaneGeometry(winX1-winX0,winY1-winY0),new THREE.MeshBasicMaterial({visible:false}));winHit.rotation.y=Math.PI/2;winHit.position.set(LEFT+.03,(winY0+winY1)/2,(winX0+winX1)/2);scene.add(winHit);
// planta na janela
const potM=M('#8a5532',{r:.7}),leafM=M('#3f8a55',{r:.6,side:THREE.DoubleSide});
const leafM2=M('#2f6d43',{r:.6,side:THREE.DoubleSide});
const leafGeo=(()=>{const sh=new THREE.Shape();sh.moveTo(0,0);sh.bezierCurveTo(.07,.08,.06,.26,0,.36);sh.bezierCurveTo(-.06,.26,-.07,.08,0,0);const g=new THREE.ShapeGeometry(sh,10);const p=g.attributes.position;for(let i=0;i<p.count;i++){const y=p.getY(i),x=p.getX(i);p.setZ(i,-y*y*.9+Math.abs(x)*.25)}g.computeVertexNormals();return g})();
function plant(x,y,z,s=1){const g=new THREE.Group();g.position.set(x,y,z);g.scale.setScalar(s);scene.add(g);cyl(.11,.08,.2,potM,0,.1,0,g);cyl(.115,.115,.025,potM,0,.2,0,g);cyl(.1,.1,.01,M('#2a1a10'),0,.195,0,g);
  for(let i=0;i<18;i++){const l=new THREE.Mesh(leafGeo,i%3?leafM:leafM2);l.position.y=.19;const k=.7+Math.random()*.5;l.scale.set(k,k,k);l.rotation.order='YXZ';l.rotation.set(-.15-Math.random()*.75,i*2.4+Math.random()*.3,0);l.castShadow=true;g.add(l)}return g}
plant(LEFT+.18,winY0,-1.65,1);
plant(2.7,0,-2.15,1.9);

/* ---------- mesa ---------- */
const D={x:0,y:.76,z:-1.55,w:2.3,d:.85};
const deskM=M('#24242a',{r:.45}), darkM=M('#151519',{r:.6});
box(D.w,.05,D.d,deskM,D.x,D.y,D.z,scene,.012);
box(.05,D.y,.05,darkM,D.x-D.w/2+.08,D.y/2,D.z-D.d/2+.08);box(.05,D.y,.05,darkM,D.x-D.w/2+.08,D.y/2,D.z+D.d/2-.08);
box(.05,D.y,.05,darkM,D.x+D.w/2-.08,D.y/2,D.z-D.d/2+.08);box(.05,D.y,.05,darkM,D.x+D.w/2-.08,D.y/2,D.z+D.d/2-.08);
box(.55,.42,D.d-.1,darkM,D.x-D.w/2+.35,D.y-.24,D.z);
const led=box(D.w,.012,.012,M('#ff9a52',{e:'#ff8a3c',ei:2.2}),D.x,D.y-.03,D.z+D.d/2+.003);led.castShadow=false;
const ledL=new THREE.PointLight('#ff8a3c',1.2,1.6,2);ledL.position.set(0,.55,D.z+D.d/2+.2);scene.add(ledL);
// monitor (vira para o personagem)
const CH={x:.75,z:-2.0,yaw:-.52};
const FWD=new THREE.Vector3(Math.sin(CH.yaw),0,Math.cos(CH.yaw)), RGT=new THREE.Vector3(Math.cos(CH.yaw),0,-Math.sin(CH.yaw));
const MON={x:CH.x+FWD.x*.82,y:D.y+.3,z:CH.z+FWD.z*.82,w:.95,h:.42,yaw:CH.yaw+Math.PI};
const monG=new THREE.Group();monG.position.set(MON.x,MON.y,MON.z);monG.rotation.y=MON.yaw;scene.add(monG);
box(MON.w+.04,MON.h+.04,.035,M('#0c0c0e',{r:.35}),0,0,0,monG,.01);
const scr=canvasTex(1024,448,()=>{});
const screen=new THREE.Mesh(new THREE.PlaneGeometry(MON.w,MON.h),new THREE.MeshBasicMaterial({map:scr,toneMapped:false}));screen.position.z=.019;monG.add(screen);
const backTex=canvasTex(1024,448,(x,w,h)=>{x.fillStyle='#16161a';x.fillRect(0,0,w,h);x.fillStyle='#ffb0c0';x.font='600 92px "Silkscreen", monospace';x.textAlign='center';x.textBaseline='middle';x.fillStyle='#ff9a52';x.fillText('TRABALHOS',w/2,h/2)});
const back=new THREE.Mesh(new THREE.PlaneGeometry(MON.w,MON.h),new THREE.MeshStandardMaterial({map:backTex,emissive:'#ffffff',emissiveMap:backTex,emissiveIntensity:.55,roughness:.6}));back.position.z=-.019;back.rotation.y=Math.PI;monG.add(back);
cyl(.025,.025,.12,M('#2a2a30',{m:.6,r:.35}),0,-.25,-.06,monG);box(.3,.012,.18,M('#2a2a30',{m:.6,r:.35}),0,-(MON.y-D.y-.03),-.06,monG);
screenL.position.copy(monG.localToWorld(new THREE.Vector3(0,0,.4)));
// teclado, mouse, caneca, celular, abajur
const kbp=new THREE.Vector3(CH.x,0,CH.z).addScaledVector(FWD,.5);const kb=box(.46,.02,.15,M('#1b1b20',{r:.5}),kbp.x,D.y+.035,kbp.z,scene,.006);kb.rotation.y=CH.yaw;
const keysTex=canvasTex(256,80,(x,w,h)=>{x.fillStyle='#1b1b20';x.fillRect(0,0,w,h);for(let r=0;r<4;r++)for(let c=0;c<14;c++){x.fillStyle='#2e2e36';x.fillRect(4+c*18,4+r*19,15,15)}});
const kTop=new THREE.Mesh(new THREE.PlaneGeometry(.46,.13),M('#ffffff',{map:keysTex,r:.5}));kTop.rotation.x=-Math.PI/2;kTop.position.y=.011;kb.add(kTop);
{const mp=new THREE.Vector3(CH.x,0,CH.z).addScaledVector(FWD,.5).addScaledVector(RGT,-.36);const ms=box(.06,.03,.1,M('#d8d8dc',{r:.3}),mp.x,D.y+.04,mp.z,scene,.014);ms.rotation.y=CH.yaw}
const mug=new THREE.Group();mug.position.set(-.55,D.y+.025,-1.3);scene.add(mug);cyl(.045,.04,.11,M('#e4dcc8',{r:.4}),0,.055,0,mug);
const tor=new THREE.Mesh(new THREE.TorusGeometry(.03,.008,8,16),M('#e4dcc8',{r:.4}));tor.position.set(.05,.06,0);mug.add(tor);
cyl(.04,.04,.005,M('#3a2214'),0,.106,0,mug);
const phoneG=new THREE.Group();{const pp=new THREE.Vector3(CH.x,0,CH.z).addScaledVector(FWD,.6).addScaledVector(RGT,.36);phoneG.position.set(pp.x,D.y+.03,pp.z);phoneG.rotation.y=CH.yaw+.3}scene.add(phoneG);
box(.08,.012,.16,M('#0c0c0e',{r:.3}),0,0,0,phoneG,.006);
const phoneScr=new THREE.Mesh(new THREE.PlaneGeometry(.07,.145),new THREE.MeshBasicMaterial({color:'#5aa0ff',toneMapped:false}));phoneScr.rotation.x=-Math.PI/2;phoneScr.position.y=.007;phoneG.add(phoneScr);
const lampG=new THREE.Group();lampG.position.set(-.95,D.y+.025,-1.75);scene.add(lampG);
const copper=M('#c8743a',{m:.6,r:.35});
cyl(.08,.09,.025,M('#222226',{m:.5,r:.4}),0,0,0,lampG);
const arm1=cyl(.012,.012,.42,M('#2a2a30',{m:.5,r:.4}),0,.2,0,lampG);arm1.rotation.z=.25;
const shade=new THREE.Mesh(new THREE.ConeGeometry(.12,.17,24,1,true),copper);shade.position.set(.05,.5,.08);shade.rotation.x=.5;shade.material.side=THREE.DoubleSide;lampG.add(shade);
const bulb=new THREE.Mesh(new THREE.SphereGeometry(.035,12,12),new THREE.MeshBasicMaterial({color:'#ffd9a0'}));bulb.position.set(.05,.45,.1);lampG.add(bulb);
lampL.position.copy(lampG.localToWorld(new THREE.Vector3(.05,.42,.12)));

/* ---------- neon do logo ---------- */
const logoTex=tex('img/3d/logo.png');
const neon=new THREE.Mesh(new THREE.PlaneGeometry(1.25,.93),new THREE.MeshBasicMaterial({map:logoTex,transparent:true,toneMapped:false,color:'#fff3e2'}));
neon.position.set(-.15,2.25,BACK+.03);scene.add(neon);
const glowTex=canvasTex(256,256,(x,w,h)=>{const g=x.createRadialGradient(w/2,h/2,0,w/2,h/2,w/2);g.addColorStop(0,'rgba(255,150,80,.55)');g.addColorStop(1,'rgba(255,150,80,0)');x.fillStyle=g;x.fillRect(0,0,w,h)});
const glow=new THREE.Mesh(new THREE.PlaneGeometry(2.4,1.7),new THREE.MeshBasicMaterial({map:glowTex,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false}));glow.position.set(-.15,2.25,BACK+.02);scene.add(glow);

/* ---------- pôsteres (capas) ---------- */
const posterAnchor=new THREE.Vector3(-1.45,1.95,BACK+.03);
const coverList=GALLERY.capas.map(g=>`img/w/${g.s}-sm.webp`);const coverTex={},ctl=new THREE.TextureLoader();const ctex=u=>coverTex[u]||(coverTex[u]=(()=>{const t=ctl.load(u);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;return t})());coverList.forEach(ctex);
const posters=[[-1.78,2.1,0],[-1.12,1.82,Math.floor(coverList.length/2)]].map(([x,y,i0],k)=>{
  box(.56,.56,.02,M('#0b0b0c',{r:.4}),x,y,BACK+.012);
  const a=new THREE.Mesh(new THREE.PlaneGeometry(.5,.5),M('#ffffff',{map:ctex(coverList[i0%coverList.length]),r:.5}));a.position.set(x,y,BACK+.025);scene.add(a);
  const b=new THREE.Mesh(new THREE.PlaneGeometry(.5,.5),M('#ffffff',{map:ctex(coverList[(i0+1)%coverList.length]),r:.5,t:true,op:0}));b.position.set(x,y,BACK+.027);scene.add(b);
  return {a,b,i:i0,next:4+k*2,fade:-1}});
function stepPosters(t){posters.forEach(P=>{if(P.fade<0&&t>P.next){P.i=(P.i+1)%coverList.length;P.b.material.map=ctex(coverList[P.i]);P.b.material.needsUpdate=true;P.fade=t}
  if(P.fade>=0){const k=Math.min(1,(t-P.fade)/1.1);P.b.material.opacity=k;if(k>=1){P.a.material.map=P.b.material.map;P.a.material.needsUpdate=true;P.b.material.opacity=0;P.fade=-1;P.next=t+4.5}}})}

/* ---------- mural (serviços) ---------- */
const corkPos=new THREE.Vector3(1.75,1.62,BACK+.05);
box(1.35,.95,.04,M('#4a3626',{r:.8}),corkPos.x,corkPos.y,BACK+.02);
const corkTex=canvasTex(1024,720,(x,w,h)=>{x.fillStyle='#9a7650';x.fillRect(0,0,w,h);for(let i=0;i<9000;i++){x.fillStyle=['#8d6c48','#a8845c','#86663f'][i%3];x.fillRect(Math.random()*w,Math.random()*h,2,2)}
  const notes=[[60,60,'#e9e1cd','Identidade'],[300,40,'#d98a4a','Lettering'],[540,70,'#2f5a46','Capas'],[780,50,'#e9e1cd','Social'],[120,330,'#2f5a46','Logos'],[380,350,'#e9e1cd','Ebooks'],[640,320,'#d98a4a','Merch'],[860,360,'#e9e1cd','Motion']];
  notes.forEach(([nx,ny,c,t],i)=>{x.save();x.translate(nx+90,ny+110);x.rotate((i%2?1:-1)*0.06);x.fillStyle='rgba(0,0,0,.25)';x.fillRect(-84,-98,180,210);x.fillStyle=c;x.fillRect(-90,-104,180,210);
    x.fillStyle=c==='#2f5a46'?'#efe7d4':'#1b1714';x.font='700 30px "Pixelify Sans", sans-serif';x.fillText(t,-70,-50);for(let k=0;k<4;k++)x.fillRect(-70,-20+k*26,90+Math.random()*50,6);
    x.fillStyle='#c93a32';x.beginPath();x.arc(0,-92,10,0,7);x.fill();x.restore()});
  ['#002345','#d3aa54','#6d4299','#c20008','#00b7ff'].forEach((c,i)=>{x.fillStyle=c;x.fillRect(40+i*60,640,46,46)})});
corkSpot.target.position.copy(corkPos);
const cork=new THREE.Mesh(new THREE.PlaneGeometry(1.27,.87),M('#ffffff',{map:corkTex,r:.95}));cork.position.copy(corkPos);scene.add(cork);

/* ---------- estante + porta-retrato (sobre) ---------- */
const shelfPos=new THREE.Vector3(-2.1,1.25,BACK+.22);
box(1.1,.04,.32,M('#3d2e25',{r:.6}),shelfPos.x,shelfPos.y,shelfPos.z);
box(1.1,.04,.32,M('#3d2e25',{r:.6}),shelfPos.x,shelfPos.y+.48,shelfPos.z);
['#c8743a','#2c5240','#e4dcc8','#3a3348','#8a2f2f','#1b4f6b','#d9b36a','#2a2a2e'].forEach((c,i)=>{const h=.24+((i*7)%5)*.025;const b=box(.05,h,.2,M(c,{r:.7}),shelfPos.x-.5+i*.06,shelfPos.y+.02+h/2,shelfPos.z,scene);if(i===7)b.rotation.z=.25});
const frameG=new THREE.Group();frameG.position.set(shelfPos.x+.28,shelfPos.y+.2,shelfPos.z-.02);frameG.rotation.set(-.1,.25,0);scene.add(frameG);
box(.26,.32,.02,M('#ece6d6',{r:.6}),0,0,0,frameG);
const photo=new THREE.Mesh(new THREE.PlaneGeometry(.21,.22),M('#ffffff',{map:tex('img/3d/face.png'),r:.7,t:true}));photo.position.set(0,.03,.011);
const photoBg=new THREE.Mesh(new THREE.PlaneGeometry(.21,.22),M('#2c5240'));photoBg.position.set(0,.03,.0105);frameG.add(photoBg,photo);
plant(shelfPos.x-.15,shelfPos.y+.5,shelfPos.z,.45);
// tapete
const rug=new THREE.Mesh(new THREE.PlaneGeometry(3.2,2.2),M('#3a3348',{r:.95}));rug.rotation.x=-Math.PI/2;rug.position.set(0,.003,-1.1);rug.receiveShadow=true;scene.add(rug);
const rug2=new THREE.Mesh(new THREE.PlaneGeometry(2.9,1.9),M('#2f2a3a',{r:.95}));rug2.rotation.x=-Math.PI/2;rug2.position.set(0,.005,-1.1);rug2.receiveShadow=true;scene.add(rug2);

/* ---------- cadeira ---------- */
const chairG=new THREE.Group();chairG.position.set(CH.x,0,CH.z);chairG.rotation.y=CH.yaw;scene.add(chairG);
const chM=M('#1b211e',{r:.6}),chA=M('#2c5240',{r:.7});
box(.5,.08,.5,chM,0,.46,0,chairG,.03);
box(.48,.62,.08,chM,0,.86,-.26,chairG,.04);box(.32,.44,.02,chA,0,.88,-.215,chairG,.01);
cyl(.03,.03,.38,M('#111114',{m:.6,r:.4}),0,.24,0,chairG);
for(let i=0;i<5;i++){const a=i/5*Math.PI*2;const l=box(.3,.025,.04,M('#111114',{m:.5}),Math.cos(a)*.14,.04,Math.sin(a)*.14,chairG);l.rotation.y=-a}

/* =========================================================
   PERSONAGEM (humano, com o rosto do Yan)
   ========================================================= */
const skin=M('#9a5634',{r:.6}), tee=M('#151517',{r:.92}), pants=M('#1d3a2b',{r:.85}), stripe=M('#e6dfcf',{r:.7}), shoeW=M('#ece6da',{r:.55}), shoeB=M('#141414',{r:.5}), hairM=M('#0d0b0a',{r:.95});
const Y=new THREE.Group(); Y.position.set(CH.x,0,CH.z); Y.rotation.y=CH.yaw; scene.add(Y);
const up=new THREE.Vector3(0,1,0);
function seg(mat,r){const g=new THREE.Group();const c=new THREE.Mesh(new THREE.CylinderGeometry(r,r*.92,1,20,1,true),mat);c.castShadow=true;g.add(c);
  const s1=new THREE.Mesh(new THREE.SphereGeometry(r,18,14),mat),s2=s1.clone();s1.castShadow=s2.castShadow=true;g.add(s1,s2);g.userData={c,s1,s2};Y.add(g);return g}
function place(sg,a,b){const {c,s1,s2}=sg.userData;const d=new THREE.Vector3().subVectors(b,a);const L=d.length();c.position.copy(a).addScaledVector(d,.5);c.scale.set(1,L,1);c.quaternion.setFromUnitVectors(up,d.normalize());s1.position.copy(a);s2.position.copy(b)}
const V=(x,y,z)=>new THREE.Vector3(x,y,z);
// quadril + pernas (sentado)
const hips=new THREE.Mesh(new RoundedBoxGeometry(.36,.16,.3,4,.07),pants);hips.position.set(0,.56,-.02);hips.castShadow=true;Y.add(hips);
const legs=[];
[-1,1].forEach(s=>{const th=seg(pants,.075),sh=seg(pants,.06);place(th,V(s*.1,.56,0),V(s*.11,.56,.42));place(sh,V(s*.11,.55,.42),V(s*.12,.1,.46));
  const st=box(.012,.012,.42,stripe,s*.185,.6,.2,Y);st.castShadow=false;
  const st2=box(.012,.42,.012,stripe,s*.18,.33,.44,Y);st2.castShadow=false;
  const shoe=new THREE.Group();shoe.position.set(s*.12,.05,.5);Y.add(shoe);
  box(.11,.07,.26,shoeW,0,0,.03,shoe,.03);box(.115,.025,.27,M('#cfc6b4'),0,-.03,.03,shoe,.01);box(.112,.03,.1,shoeB,0,.015,-.04,shoe,.012);box(.004,.03,.12,shoeB,s*.056,0,.06,shoe);
  legs.push(th,sh)});
// tronco
const torso=new THREE.Group();torso.position.set(0,.62,-.04);Y.add(torso);
const chest=new THREE.Mesh(new THREE.CapsuleGeometry(.16,.26,10,24),tee);chest.scale.set(1.3,1,.74);chest.position.y=.24;
const belly=new THREE.Mesh(new THREE.CapsuleGeometry(.15,.12,8,20),tee);belly.scale.set(1.15,1,.8);belly.position.set(0,.06,.01);belly.castShadow=true;torso.add(belly);chest.castShadow=true;torso.add(chest);
const crown=new THREE.Mesh(new THREE.PlaneGeometry(.09,.078),new THREE.MeshStandardMaterial({map:tex('img/3d/crown.png'),transparent:true,roughness:.9}));crown.position.set(.08,.36,.124);crown.rotation.y=.18;torso.add(crown);
const neck=new THREE.Mesh(new THREE.CylinderGeometry(.05,.055,.1,16),skin);neck.position.y=.55;torso.add(neck);
// cabeça
const headG=new THREE.Group();headG.position.set(0,.66,.01);torso.add(headG);
const head=new THREE.Mesh(new THREE.SphereGeometry(.115,40,32),skin);head.scale.set(.92,1.12,1);head.castShadow=true;headG.add(head);
const jaw=new THREE.Mesh(new THREE.SphereGeometry(.085,24,18),skin);jaw.scale.set(1,.8,1);jaw.position.set(0,-.07,.02);headG.add(jaw);
[-1,1].forEach(s=>{const e=new THREE.Mesh(new THREE.SphereGeometry(.026,12,10),skin);e.scale.set(.5,1,.8);e.position.set(s*.103,0,-.005);headG.add(e);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(.012,.003,8,16),M('#d9d9dc',{m:.9,r:.2}));ring.position.set(s*.108,-.032,.0);ring.rotation.y=Math.PI/2;headG.add(ring)});
// cabelo: fade nas laterais + cachos no topo
const fade=new THREE.Mesh(new THREE.SphereGeometry(.119,40,24,0,Math.PI*2,0,Math.PI*.42),M('#1a1513',{r:1}));fade.scale.set(.93,1.12,1.01);fade.position.y=.006;fade.rotation.x=-.18;headG.add(fade);
for(let i=0;i<140;i++){const t=Math.random()*Math.PI*2,p=Math.acos(1-Math.random()*.55);const r=.118;const x=Math.sin(p)*Math.cos(t)*r*.93,y=Math.cos(p)*r*1.12+.012,z=Math.sin(p)*Math.sin(t)*r;
  if(z>.07&&y<.09)continue;const c=new THREE.Mesh(new THREE.SphereGeometry(.017+Math.random()*.008,8,6),hairM);c.position.set(x,y+.005,z-.006);headG.add(c)}
// rosto (decal)
headG.updateMatrixWorld(true);Y.updateMatrixWorld(true);
const faceMat=new THREE.MeshStandardMaterial({map:tex('img/3d/face.png'),transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-4,roughness:.6});
function buildFace(){scene.updateMatrixWorld(true);
  const pos=head.localToWorld(V(0,-.022,.1)); const q=new THREE.Quaternion();head.getWorldQuaternion(q);const ori=new THREE.Euler().setFromQuaternion(q);
  const g=new DecalGeometry(head,pos,ori,V(.185,.3,.12));
  g.applyMatrix4(head.matrixWorld.clone().invert());const m=new THREE.Mesh(g,faceMat);head.add(m);
  const g2=new DecalGeometry(jaw,pos,ori,V(.185,.3,.16));g2.applyMatrix4(jaw.matrixWorld.clone().invert());jaw.add(new THREE.Mesh(g2,faceMat));
}
buildFace();
// braços
const arms=[-1,1].map(s=>({s,up:seg(skin,.046),fo:seg(skin,.04)}));
arms.forEach(a=>{
  const sh=new THREE.Mesh(new THREE.SphereGeometry(.082,20,16),tee);sh.scale.set(1,.9,.95);sh.castShadow=true;Y.add(sh);a.shoulder=sh;
  const sl=new THREE.Mesh(new THREE.CylinderGeometry(.064,.058,1,20),tee);sl.castShadow=true;Y.add(sl);a.sleeve=sl;
  const h=new THREE.Group();Y.add(h);a.hand=h;
  const palm=new THREE.Mesh(new RoundedBoxGeometry(.075,.032,.085,3,.015),skin);palm.castShadow=true;h.add(palm);
  for(let f=0;f<4;f++){const fg=new THREE.Mesh(new THREE.CapsuleGeometry(.009,.035,4,8),skin);fg.rotation.x=Math.PI/2+.5;fg.position.set(-.027+f*.018,-.012,.058);h.add(fg)}
  const th=new THREE.Mesh(new THREE.CapsuleGeometry(.01,.03,4,8),skin);th.rotation.set(Math.PI/2,0,a.s*.8);th.position.set(-a.s*.042,-.005,.02);h.add(th);
  const w=new THREE.Mesh(new THREE.TorusGeometry(.041,.01,8,18),shoeB);Y.add(w);a.watch=w;
  const br=new THREE.Mesh(new THREE.TorusGeometry(.042,.006,6,18),M('#3a2a20',{r:.6}));Y.add(br);a.brace=br});
// alvo das mãos = teclado (em coordenadas do personagem)
const kbLocal=Y.worldToLocal(kb.position.clone());
function poseArms(t){
  arms.forEach((a,i)=>{const s=a.s;
    const sh=V(s*.205,1.02+torso.position.y-.62,-.02);   // ombro
    const tap=typing?Math.max(0,Math.sin(t*16+i*1.9))*.016:0;
    const hand=V(kbLocal.x+s*.12+Math.sin(t*1.3+i)*.008,kbLocal.y+.05+tap,kbLocal.z-.03);
    const el=V(s*.25,.8,.1);                             // cotovelo
    place(a.up,sh,el);place(a.fo,el,hand);
    a.shoulder.position.copy(sh).add(V(s*-.01,.015,0));
    const dir=new THREE.Vector3().subVectors(el,sh).normalize();
    a.sleeve.position.copy(sh).addScaledVector(dir,.08);a.sleeve.scale.set(1,.17,1);a.sleeve.quaternion.setFromUnitVectors(up,dir);
    const fd=new THREE.Vector3().subVectors(hand,el).normalize();
    a.hand.position.copy(hand).addScaledVector(fd,.045);a.hand.quaternion.setFromUnitVectors(V(0,0,1),fd);a.hand.rotateZ(s*.15);
    a.watch.position.copy(el).lerp(hand,.88);a.watch.quaternion.setFromUnitVectors(V(0,0,1),fd);a.watch.visible=s<0;
    a.brace.position.copy(el).lerp(hand,.84);a.brace.quaternion.copy(a.watch.quaternion);a.brace.visible=s>0;
  })}
let typing=true;
torso.rotation.x=.06;

/* =========================================================
   TELA DO MONITOR (editor) — desenhada a cada quadro
   ========================================================= */
const shots=[...CASES.map(c=>`img/cases/${c.id}.webp`),...GALLERY.capas.slice(0,4).map(g=>`img/w/${g.s}-sm.webp`),...GALLERY.artistas.slice(0,4).map(g=>`img/w/${g.s}-sm.webp`)];
const shotImgs=shots.map(u=>{const i=new Image();i.src=u;return i});
let shotI=0,shotT=0;
function drawScreen(t){
  const x=scr.userData.ctx,w=1024,h=448;
  x.fillStyle='#1e1f1f';x.fillRect(0,0,w,h);
  x.fillStyle='#2b2c2c';x.fillRect(0,0,w,26);x.fillStyle='#4aa8ff';x.fillRect(10,6,26,16);x.fillStyle='#0b2033';x.font='700 12px sans-serif';x.fillText('Yd',14,18);
  x.fillStyle='#8f8f8f';x.font='13px sans-serif';['Arquivo','Editar','Imagem','Camada','Tipo','Filtro','Exibir'].forEach((m,i)=>x.fillText(m,52+i*64,18));
  x.fillStyle='#262727';x.fillRect(0,26,40,h);for(let i=0;i<10;i++){x.fillStyle=i===2?'#4a4f52':'#3a3c3c';x.fillRect(10,40+i*34,20,20)}
  x.fillStyle='#262727';x.fillRect(w-230,26,230,h);x.fillStyle='#1b1c1c';x.fillRect(w-230,26,230,24);x.fillStyle='#a8a8a8';x.font='11px sans-serif';x.fillText('CAMADAS',w-218,42);
  const cats=['Identidade visual','Logotipos','Capas de música','Artistas','Lançamentos'];
  cats.forEach((c,i)=>{const yy=56+i*40;const on=i===Math.floor(shotI/3)%5;x.fillStyle=on?'#24405a':'#2a2b2b';x.fillRect(w-226,yy,222,36);x.fillStyle='#555';x.fillRect(w-216,yy+6,38,24);x.fillStyle=on?'#fff':'#cfcfcf';x.font='13px sans-serif';x.fillText(c,w-168,yy+23)});
  // canvas
  const cx0=60,cy0=40,cw=w-230-80,ch=h-60;
  for(let yy=cy0;yy<cy0+ch;yy+=16)for(let xx=cx0;xx<cx0+cw;xx+=16){x.fillStyle=((xx+yy)/16)%2?'#2a2a2a':'#333';x.fillRect(xx,yy,16,16)}
  const im=shotImgs[shotI%shotImgs.length];
  if(im.complete&&im.naturalWidth){const k=Math.min(cw/im.naturalWidth,ch/im.naturalHeight)*.92;const iw=im.naturalWidth*k,ih=im.naturalHeight*k;const ix=cx0+(cw-iw)/2,iy=cy0+(ch-ih)/2;
    const p=Math.min(1,(t-shotT)/0.6);x.save();x.beginPath();x.rect(ix,iy,iw*p,ih);x.clip();x.drawImage(im,ix,iy,iw,ih);x.restore();
    // seleção (formigas marchando)
    x.setLineDash([8,6]);x.lineDashOffset=-t*30;x.strokeStyle='#fff';x.lineWidth=2;const sx=ix+iw*.2+Math.sin(t*.7)*20,sy=iy+ih*.25;x.strokeRect(sx,sy,iw*.45,ih*.4);x.setLineDash([]);
    // cursor
    const cxp=sx+iw*.45*(.5+.5*Math.sin(t*1.1)),cyp=sy+ih*.4*(.5+.5*Math.cos(t*.9));x.fillStyle='#fff';x.beginPath();x.moveTo(cxp,cyp);x.lineTo(cxp,cyp+18);x.lineTo(cxp+5,cyp+13);x.lineTo(cxp+12,cyp+13);x.closePath();x.fill();x.strokeStyle='#000';x.lineWidth=1;x.stroke()}
  x.fillStyle='#1a1b1b';x.fillRect(40,h-18,w-270,18);x.fillStyle='#888';x.font='11px sans-serif';x.fillText('yan_portfolio.psd  ·  100%  ·  RGB/8',52,h-5);
  scr.needsUpdate=true;
  if(t-shotT>4.2){shotT=t;shotI++}
}

/* =========================================================
   CÂMERA, CONTROLES E PONTOS
   ========================================================= */
const controls=new OrbitControls(camera,canvas);
controls.enableDamping=true;controls.dampingFactor=.06;controls.enableZoom=false;controls.enablePan=false;controls.rotateSpeed=.45;
const HOME={pos:V(2.35,2.05,2.55),target:V(-.05,1.05,-1.55)};
function homeView(){const m=isMobile();return {pos:m?V(2.9,2.3,4.2):HOME.pos.clone(),target:HOME.target.clone()}}
function setLimits(){const h=homeView();const off=h.pos.clone().sub(h.target);const sph=new THREE.Spherical().setFromVector3(off);
  controls.minAzimuthAngle=sph.theta-.55;controls.maxAzimuthAngle=sph.theta+.45;controls.minPolarAngle=sph.phi-.25;controls.maxPolarAngle=Math.min(1.45,sph.phi+.18)}
{const h=homeView();camera.position.copy(h.pos);controls.target.copy(h.target);controls.update();setLimits()}

const monWorld=monG.position.clone();
const monNormal=V(0,0,1).applyQuaternion(monG.quaternion);
const SPOTS={
  trabalhos:{label:'Abrir trabalhos',anchor:monG.localToWorld(V(0,.3,0)),view:()=>({pos:monWorld.clone().addScaledVector(monNormal,1.15).addScaledVector(RGT,.42).add(V(0,.32,0)),target:monWorld.clone()})},
  capas:{label:'Capas de música',anchor:posterAnchor,view:()=>({pos:posterAnchor.clone().add(V(.2,0,1.5)),target:posterAnchor.clone()}),panel:'trabalhos',tab:'capas'},
  servicos:{label:'Serviços',anchor:corkPos.clone().add(V(.5,.42,0)),view:()=>({pos:corkPos.clone().add(V(-.2,0,1.45)),target:corkPos.clone()})},
  sobre:{label:'Sobre mim',anchor:frameG.position.clone().add(V(0,.22,0)),view:()=>({pos:frameG.position.clone().add(V(.45,.15,1.05)),target:frameG.position.clone()})},
  contato:{label:'Pedir orçamento',anchor:phoneG.position.clone().add(V(0,.12,0)),view:()=>({pos:phoneG.position.clone().add(V(.25,.55,.45)),target:phoneG.position.clone()})},
};
const hots=$('#hots');
Object.entries(SPOTS).forEach(([k,s])=>{const b=document.createElement('button');b.className='hs';b.dataset.go=k;b.setAttribute('aria-label',s.label);b.innerHTML=`<span class="dot"><i></i></span><span class="tag">${s.label}</span>`;hots.append(b);s.el=b});
const tmpV=new THREE.Vector3();
function placeHots(){Object.values(SPOTS).forEach(s=>{tmpV.copy(s.anchor).project(camera);const vis=tmpV.z<1&&Math.abs(tmpV.x)<1.05&&Math.abs(tmpV.y)<1.05;
  s.el.style.transform=`translate(${(tmpV.x*.5+.5)*innerWidth}px,${(-tmpV.y*.5+.5)*innerHeight}px)`;s.el.classList.toggle('hidden',!vis)})}

let tween=null;
function flyTo(v,dur=1.25,done){const p0=camera.position.clone(),t0=controls.target.clone();const start=performance.now();
  if(reduce)dur=.01;tween={p0,t0,p1:v.pos,t1:v.target,start,dur,done};controls.enabled=false}
function stepTween(now){if(!tween)return;const k=Math.min(1,(now-tween.start)/(tween.dur*1000));const e=k<.5?4*k*k*k:1-Math.pow(-2*k+2,3)/2;
  camera.position.lerpVectors(tween.p0,tween.p1,e);controls.target.lerpVectors(tween.t0,tween.t1,e);camera.lookAt(controls.target);
  if(k>=1){const d=tween.done;tween=null;if(d)d()}}

/* ---------- loop ---------- */
const clock=new THREE.Clock();let lookT=0,typeT=0;
const steam=[];for(let i=0;i<5;i++){const s=new THREE.Mesh(new THREE.SphereGeometry(.012,8,6),new THREE.MeshBasicMaterial({color:'#ffffff',transparent:true,opacity:0,depthWrite:false}));scene.add(s);steam.push({m:s,t:i/5})}
function loop(){
  const t=clock.getElapsedTime(),now=performance.now();
  stepTween(now); if(!tween&&controls.enabled)controls.update();
  // personagem: digitar, pausar, olhar para a câmera
  if(t>typeT){typing=!typing;typeT=t+(typing?2.5+Math.random()*3:1+Math.random()*1.5)}
  poseArms(t);
  if(typing&&Math.sin(t*18)>.96&&Math.random()<.5)audio.click();
  if(t>lookT+9)lookT=t;
  const look=(t-lookT)<1.8?Math.sin((t-lookT)/1.8*Math.PI):0;
  headG.rotation.y=-.05+look*.55+Math.sin(t*.6)*.03; headG.rotation.x=.08-look*.12+(typing?Math.sin(t*2)*.01:0);
  torso.rotation.z=Math.sin(t*.8)*.012; torso.position.y=.62+Math.sin(t*1.6)*.004;
  // luzes vivas
  neon.material.opacity=Math.random()<.008?.55:1; glow.material.opacity=.85+Math.sin(t*3)*.08;
  phoneScr.material.color.setHSL(.6,.8,.45+Math.max(0,Math.sin(t*3))*.18);
  steam.forEach(s=>{s.t=(s.t+.004)%1;s.m.position.set(mug.position.x+Math.sin(s.t*9+s.m.id)*.012,mug.position.y+.13+s.t*.22,mug.position.z);s.m.material.opacity=(1-s.t)*.25;s.m.scale.setScalar(1+s.t*2)});
  drawScreen(t); win.update(t); if(!reduce)stepPosters(t);
  renderer.render(scene,camera); placeHots();
  requestAnimationFrame(loop);
}
function resize(){camera.aspect=innerWidth/innerHeight;camera.fov=isMobile()?58:42;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight,false);if(!tween&&!document.body.classList.contains('zoomed')){const h=homeView();camera.position.copy(h.pos);controls.target.copy(h.target);setLimits()}}
if(renderer){addEventListener('resize',resize);resize();loop()}
let pdn=null;canvas.addEventListener('pointerup',e=>{if(!pdn||Math.hypot(e.clientX-pdn[0],e.clientY-pdn[1])>6)return;const r=canvas.getBoundingClientRect(),rc=new THREE.Raycaster();rc.setFromCamera(new THREE.Vector2((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1),camera);if(rc.intersectObject(winHit).length)win.next(1)});
canvas.addEventListener('pointerdown',e=>{pdn=[e.clientX,e.clientY];$('#view').classList.add('drag');$('#dragHint').style.opacity=0});addEventListener('pointerup',()=>$('#view').classList.remove('drag'));

/* =========================================================
   NAVEGAÇÃO ENTRE SEÇÕES
   ========================================================= */
let current=null,lastFocus=null;
const PANELS=['trabalhos','servicos','sobre','contato'];
function go(k){ if(!SPOTS[k])return; if(location.hash!=='#'+k) location.hash=k; else route() }
function route(){const k=location.hash.slice(1);
  if(!SPOTS[k]){closeAll();return}
  const s=SPOTS[k],pk=s.panel||k;
  lastFocus=document.activeElement;
  $$('.panel.open').forEach(p=>p.classList.remove('open'));
  document.body.classList.add('zoomed');document.body.classList.toggle('on-trabalhos',pk==='trabalhos');
  $$('.dock button').forEach(b=>b.setAttribute('aria-current',b.dataset.go===pk));
  current=k;
  const open=()=>{if(current!==k)return;if(pk==='trabalhos')ed.select(s.tab||ed.cur||'idv');const p=$('#p-'+pk);p.classList.add('open');setTimeout(()=>(p.querySelector('[data-close],button,a,input')||p).focus({preventScroll:true}),350)};
  if(renderer)flyTo(s.view(),1.25,open);else open();
}
function closeAll(){current=null;$$('.panel.open').forEach(p=>p.classList.remove('open'));document.body.classList.remove('zoomed','on-trabalhos');$$('.dock button').forEach(b=>b.setAttribute('aria-current','false'));
  if(renderer)flyTo(homeView(),1.1,()=>{controls.enabled=true;setLimits()});if(lastFocus&&lastFocus.focus)lastFocus.focus({preventScroll:true})}
function home(){if(location.hash&&location.hash!=='#quarto')location.hash='quarto';else closeAll()}
addEventListener('hashchange',route);
document.addEventListener('click',e=>{const g=e.target.closest('[data-go]');if(g){e.preventDefault();go(g.dataset.go)}
  if(e.target.closest('[data-close]'))home()});
$('#back').onclick=home;
$$('.panel').forEach(p=>p.addEventListener('click',e=>{if(e.target===p)home()}));
addEventListener('keydown',e=>{if(e.key!=='Escape')return;if($('#lb').classList.contains('open'))return lbClose();if(current)home()});

/* =========================================================
   EDITOR (TRABALHOS)
   ========================================================= */
const ed={cur:null,ci:0,
  thumb(id){return id==='idv'?`img/cases/${CASES[0].id}.webp`:`img/w/${GALLERY[id][0].s}-sm.webp`},
  count(id){return id==='idv'?CASES.length:GALLERY[id].length},
  init(){const L=$('#layers');L.innerHTML=TABS.map(t=>`<li><button role="tab" id="ly-${t.id}" aria-selected="false" data-tab="${t.id}"><span class="eye">◉</span><img src="${this.thumb(t.id)}" alt="" loading="lazy"><span>${t.name}</span><small>${this.count(t.id)}</small></button></li>`).join('');
    L.onclick=e=>{const b=e.target.closest('[data-tab]');if(b)this.select(b.dataset.tab)};
    $('#totalCount').textContent=TABS.reduce((a,t)=>a+this.count(t.id),0)+' itens'},
  select(id){this.cur=id;$$('#layers button').forEach(b=>b.setAttribute('aria-selected',b.dataset.tab===id));
    const t=TABS.find(x=>x.id===id);$('#ed-layer').textContent=t.name;$('#st-l').textContent=`Doc: ${this.count(id)} itens · Camada: ${t.name}`;
    const cv=$('#canvas');cv.scrollTop=0;
    if(id==='idv'){this.ci=0;this.renderCase()}
    else{const cls=id==='artistas'||id==='lanc'?'mas':'sq'+(id==='logos'?' logos':'');
      cv.innerHTML=`<div class="${cls}">${GALLERY[id].map((g,i)=>`<figure tabindex="0" data-i="${i}"><img src="img/w/${g.s}-sm.webp" alt="${g.t}, ${g.c}" loading="lazy" width="${g.w}" height="${g.h}"></figure>`).join('')}</div>`;
      $('#props').innerHTML=`<span class="seg">CAMADA</span><h3>${t.name}</h3><p>${INTRO[id]}</p><p style="margin-top:10px;color:#8e887d;font-size:13px">Clique numa peça para ampliar.</p>`}},
  renderCase(){const c=CASES[this.ci];
    $('#canvas').innerHTML=`<div class="case"><img src="img/cases/${c.id}.webp" alt="Identidade visual ${c.name}" width="1080" height="${c.h||1350}"><div class="case-nav"><button data-cn="-1" aria-label="Case anterior">◂</button><span>${String(this.ci+1).padStart(2,'0')} / ${String(CASES.length).padStart(2,'0')}</span><button data-cn="1" aria-label="Próximo case">▸</button></div></div>`;
    $('#props').innerHTML=`<span class="seg">${c.seg.toUpperCase()}</span><h3>${c.name}</h3><p>${c.text}</p><div class="deliv">${c.deliv.map(d=>`<span>${d}</span>`).join('')}</div><div class="sw">${c.colors.map(h=>`<span><i style="background:${h}"></i>${h}</span>`).join('')}</div>`},
  step(d){if(this.cur!=='idv')return;this.ci=(this.ci+d+CASES.length)%CASES.length;this.renderCase()}
};
const INTRO={logos:'Marcas criadas para pequenos negócios: o símbolo, o nome e a primeira aplicação.',capas:'Capas de single e álbum para Spotify e demais plataformas, com fotomanipulação e tipografia sob medida.',artistas:'Divulgação de lançamentos, agendas e shows para artistas e DJs.',lanc:'Capas de ebook, eventos e campanhas de lançamento para infoprodutores.'};
ed.init();
$('#canvas').addEventListener('click',e=>{const n=e.target.closest('[data-cn]');if(n)return ed.step(+n.dataset.cn);
  if(ed.cur==='idv'&&e.target.tagName==='IMG')return lbOpen(CASES.map(c=>({src:`img/cases/${c.id}.webp`,t:c.name,c:c.seg})),ed.ci);
  const f=e.target.closest('figure[data-i]');if(f)lbOpen(GALLERY[ed.cur].map(g=>({src:`img/w/${g.s}.webp`,t:g.t,c:g.c})),+f.dataset.i)});
$('#canvas').addEventListener('keydown',e=>{const f=e.target.closest('figure[data-i]');if(f&&(e.key==='Enter'||e.key===' ')){e.preventDefault();f.click()}});
addEventListener('keydown',e=>{if(current!=='trabalhos'||$('#lb').classList.contains('open'))return;if(e.key==='ArrowRight')ed.step(1);if(e.key==='ArrowLeft')ed.step(-1)});

/* ---------- serviços / sobre / contato ---------- */
const NC=['n-sail','n-cop','n-grn','n-sail','n-grn','n-cop','n-sail'];
$('#notes').innerHTML=SERVICES.map((s,i)=>`<div class="note ${NC[i%NC.length]}" style="--r:${(i%2?1:-1)*(1+i%3*.6)}deg"><h3>${s[0]}</h3><p>${s[1]}</p></div>`).join('');
$('#stats').innerHTML=STATS.map(([n,l])=>`<div><b>+${n}</b><span>${l}</span></div>`).join('');
const mk=(el,name,arr,multi)=>{$(el).innerHTML=arr.map((t,i)=>`<input type="${multi?'checkbox':'radio'}" name="${name}" id="${name}${i}" value="${t}"><label for="${name}${i}">${t}</label>`).join('')};
mk('#optTipo','tipo',TIPOS,true);mk('#optBudget','budget',BUDGETS);mk('#optPrazo','prazo',PRAZOS);
$('#direct').innerHTML=`Prefere direto? <b>${CONTACT.email}</b> · <b>${CONTACT.whatsLabel}</b> · <a href="https://instagram.com/${CONTACT.insta}" target="_blank" rel="noopener"><b>@${CONTACT.insta}</b></a>`;
let summaryText='';
$('#form').addEventListener('submit',e=>{e.preventDefault();const fd=new FormData(e.target),fe=$('#ferr');
  const nome=(fd.get('nome')||'').trim(),email=(fd.get('email')||'').trim();
  if(!nome){fe.textContent='Preencha seu nome.';return} if(!/^\S+@\S+\.\S+$/.test(email)){fe.textContent='Digite um e-mail válido, como voce@empresa.com.';return}
  fe.textContent='';
  summaryText=`Olá, Yan! Quero um orçamento.\n\nNome: ${nome}\nE-mail: ${email}\nTipo: ${fd.getAll('tipo').join(', ')||'-'}\nInvestimento: ${fd.get('budget')||'-'}\nPrazo: ${fd.get('prazo')||'-'}\n\n${fd.get('msg')||''}`;
  const sm=$('#summary');sm.textContent=summaryText;sm.hidden=false;sm.style.whiteSpace='pre-wrap';
  $('#waLink').href=`https://wa.me/${CONTACT.whats}?text=${encodeURIComponent(summaryText)}`;
  $('#mailLink').href=`mailto:${CONTACT.email}?subject=${encodeURIComponent('Orçamento: '+nome)}&body=${encodeURIComponent(summaryText)}`;
  $('#outs').classList.add('show');$('#outs').scrollIntoView({behavior:'smooth',block:'nearest'})});
$('#copyBtn').onclick=async()=>{try{await navigator.clipboard.writeText(summaryText);$('#copyBtn').textContent='Copiado'}catch(_){$('#copyBtn').textContent='Selecione o texto acima'}};

/* ---------- lightbox ---------- */
let lbList=[],lbI=0;const lb=$('#lb');
function lbShow(i){lbI=(i+lbList.length)%lbList.length;const it=lbList[lbI];$('#lbImg').src=it.src;$('#lbImg').alt=it.t;$('#lbCap').textContent=it.t+(it.c?' · '+it.c:'')}
function lbOpen(l,i){lbList=l;lbShow(i);lb.classList.add('open');$('#lbX').focus()}
function lbClose(){lb.classList.remove('open')}
$('#lbX').onclick=lbClose;$('#lbP').onclick=()=>lbShow(lbI-1);$('#lbN').onclick=()=>lbShow(lbI+1);
lb.onclick=e=>{if(e.target===lb)lbClose()};
addEventListener('keydown',e=>{if(!lb.classList.contains('open'))return;if(e.key==='ArrowRight')lbShow(lbI+1);if(e.key==='ArrowLeft')lbShow(lbI-1)});
