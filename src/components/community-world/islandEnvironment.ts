import * as T from 'three';
import { box, cylinder, leaf, mergeStatic, material } from './geometry';
import { DISTRICTS, WORLD } from './data';

export type Obstacle={x:number;z:number;w:number;d:number};
function rounded(w:number,d:number,r:number,color:string,y:number,opacity=1){
  const s=new T.Shape(),x=-w/2,z=-d/2;
  s.moveTo(x+r,z);s.lineTo(x+w-r,z);s.quadraticCurveTo(x+w,z,x+w,z+r);s.lineTo(x+w,z+d-r);s.quadraticCurveTo(x+w,z+d,x+w-r,z+d);s.lineTo(x+r,z+d);s.quadraticCurveTo(x,z+d,x,z+d-r);s.lineTo(x,z+r);s.quadraticCurveTo(x,z,x+r,z);
  const m=new T.Mesh(new T.ShapeGeometry(s),new T.MeshBasicMaterial({color,transparent:opacity<1,opacity,depthWrite:opacity===1,side:T.DoubleSide}));m.rotation.x=-Math.PI/2;m.position.y=y;m.receiveShadow=true;return m;
}
function tree(g:T.Group,x:number,z:number,color='#a6b986',size=1){cylinder(g,.15*size,1.9*size,x,.95*size,z,'#ae9871');leaf(g,x,2.9*size,z,1.3*size,color);leaf(g,x+.6*size,2.5*size,z-.4*size,.9*size,'#bac998');}
function bench(g:T.Group,x:number,z:number,angle=0){const b=new T.Group();box(b,2.4,.17,.8,0,.72,0,'#ccb58d');box(b,2.4,.7,.13,0,1.05,-.37,'#d8c5a1');for(const dx of [-.8,.8])box(b,.12,.7,.6,dx,.34,0,'#788776');b.position.set(x,0,z);b.rotation.y=angle;g.add(b);}
function lamp(g:T.Group,x:number,z:number){box(g,.12,3.6,.12,x,1.8,z,'#778a76');box(g,.55,.6,.55,x,3.78,z,'#f4dfac');box(g,.7,.13,.7,x,4.15,z,'#6e856f');}
function sign(g:T.Group,text:string,x:number,z:number,w=17){const c=document.createElement('canvas');c.width=1024;c.height=150;const ctx=c.getContext('2d')!;ctx.fillStyle='#f4efdc';ctx.fillRect(0,0,1024,150);ctx.fillStyle='#657e67';ctx.textAlign='center';ctx.font='600 58px "Microsoft YaHei",sans-serif';ctx.fillText(text,512,96,970);const texture=new T.CanvasTexture(c);texture.colorSpace=T.SRGBColorSpace;const m=new T.Mesh(new T.PlaneGeometry(w,w*150/1024),new T.MeshBasicMaterial({map:texture,toneMapped:false}));m.rotation.x=-Math.PI/2;m.position.set(x,.075,z);g.add(m);}
function court(g:T.Group,x:number,z:number,w:number,d:number,type:'football'|'basketball'|'badminton'){
  const c=document.createElement('canvas');c.width=1000;c.height=1000;const ctx=c.getContext('2d')!;
  ctx.fillStyle=type==='football'?'#94b28a':type==='basketball'?'#bfa38c':'#80a69e';ctx.fillRect(0,0,1000,1000);
  if(type==='football')for(let i=0;i<10;i+=2){ctx.fillStyle='#a5bf97';ctx.fillRect(i*100,0,100,1000);}
  ctx.strokeStyle='#faf5de';ctx.lineWidth=6;ctx.strokeRect(42,42,916,916);ctx.beginPath();ctx.moveTo(500,42);ctx.lineTo(500,958);ctx.stroke();
  ctx.beginPath();ctx.ellipse(500,500,type==='football'?110:85,type==='football'?90:155,0,0,Math.PI*2);ctx.stroke();
  if(type==='football'){for(const left of [true,false]){ctx.strokeRect(left?42:758,250,200,500);ctx.strokeRect(left?42:868,370,90,260);}}
  if(type==='basketball'){for(const left of [true,false]){ctx.fillStyle='#8da7a1';ctx.fillRect(left?44:755,320,200,360);ctx.strokeRect(left?42:755,320,203,360);ctx.beginPath();ctx.ellipse(left?150:850,500,220,355,0,left?-Math.PI/2:Math.PI/2,left?Math.PI/2:Math.PI*1.5);ctx.stroke();}}
  if(type==='badminton'){ctx.clearRect(0,0,1000,1000);ctx.fillStyle='#8aac9e';ctx.fillRect(0,0,1000,1000);ctx.strokeRect(42,42,916,916);ctx.strokeRect(100,42,800,916);for(const xx of [260,500,740]){ctx.beginPath();ctx.moveTo(xx,42);ctx.lineTo(xx,958);ctx.stroke();}ctx.beginPath();ctx.moveTo(42,500);ctx.lineTo(260,500);ctx.moveTo(740,500);ctx.lineTo(958,500);ctx.stroke();}
  const texture=new T.CanvasTexture(c);texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=4;const m=new T.Mesh(new T.PlaneGeometry(w,d),new T.MeshBasicMaterial({map:texture,toneMapped:false}));m.rotation.x=-Math.PI/2;m.position.set(x,.09,z);g.add(m);
}
export function createIslandEnvironment(){
  const g=new T.Group(),labels=new T.Group(),obstacles:Obstacle[]=[];
  // Broad shallow-water steps form a soft, all-around shoreline without imported textures.
  const sea=rounded(4000,4000,10,'#168b99',-1.15);g.add(sea);
  // One shoreline texture replaces 18 overlapping full-island transparent surfaces.
  const shoreCanvas=document.createElement('canvas');shoreCanvas.width=512;shoreCanvas.height=512;
  const ctx=shoreCanvas.getContext('2d')!,pixels=ctx.createImageData(512,512);
  for(let y=0;y<512;y++)for(let x=0;x<512;x++){
    const qx=Math.abs((x/511-.5)*216)-76,qz=Math.abs((y/511-.5)*216)-76;
    const distance=Math.hypot(Math.max(qx,0),Math.max(qz,0))+Math.min(Math.max(qx,qz),0)-7,index=(y*512+x)*4;
    pixels.data[index]=168;pixels.data[index+1]=216;pixels.data[index+2]=207;pixels.data[index+3]=Math.round(122*Math.pow(1-T.MathUtils.clamp(distance/16,0,1),1.4));
  }
  ctx.putImageData(pixels,0,0);const shoreTexture=new T.CanvasTexture(shoreCanvas);shoreTexture.colorSpace=T.SRGBColorSpace;
  const shore=new T.Mesh(new T.PlaneGeometry(216,216),new T.MeshBasicMaterial({map:shoreTexture,transparent:true,depthWrite:false}));shore.rotation.x=-Math.PI/2;shore.position.y=-.8;g.add(shore);
  g.add(rounded(166,166,7,'#eee1c3',-.34));g.add(rounded(157,157,4,'#f2eddc',-.16));
  box(g,145,.12,145,0,-.08,0,'#c9d0be');
  // 40 m blocks, separated by 6 m streets. A promenade encircles the entire island.
  for(const p of [-69,-23,23,69]){
    box(g,4.8,.02,144,p,.0,0,'#c3cabd');box(g,144,.02,4.8,0,.0,p,'#c3cabd');
    for(const offset of [-3.05,3.05]){box(g,.13,.09,145,p+offset,.035,0,'#f8f4e5');box(g,145,.09,.13,0,.035,p+offset,'#f8f4e5');}
    for(let k=-63;k<=63;k+=9){box(g,.09,.01,2.3,p,.016,k,'#e5e7d6');box(g,2.3,.01,.09,k,.016,p,'#e5e7d6');}
  }
  for(const x of [-23,23])for(const z of [-23,23])for(let i=-2;i<=2;i++){
    box(g,.45,.015,2.1,x+i*.7,.025,z-4,'#f5f2df');box(g,.45,.015,2.1,x+i*.7,.025,z+4,'#f5f2df');
    box(g,2.1,.015,.45,x-4,.025,z+i*.7,'#f5f2df');box(g,2.1,.015,.45,x+4,.025,z+i*.7,'#f5f2df');
  }
  for(const d of DISTRICTS){box(g,WORLD.blockSize,.07,WORLD.blockSize,d.x,.015,d.z,'#eeece2');sign(labels,`${d.name}  ·  5 × 5`,d.x,d.z+19,18);}
  for(const x of [-76,76])for(let z=-68;z<=68;z+=17){tree(g,x,z,z%2?'#b7c698':'#c5b899',.85);lamp(g,x-2*Math.sign(x),z+6);}
  for(const z of [-76,76])for(let x=-60;x<=60;x+=20){tree(g,x,z,'#aabf97',.85);bench(g,x+5,z,z<0?0:Math.PI);}
  for(const x of [-20,20])for(const z of [-66,-30,30,66])lamp(g,x,z);
  // Central plaza occupies exactly the same block footprint as 25 homes.
  box(g,40,.08,40,0,.025,0,'#e8e2d0');
  for(let p=-18;p<=18;p+=3){box(g,.025,.008,39,p,.07,0,'#d8d3c1');box(g,39,.008,.025,0,.07,p,'#d8d3c1');}
  box(g,39,.012,5,0,.08,9,'#f5f0df');box(g,5,.012,39,0,.08,0,'#f5f0df');
  cylinder(g,4,.4,0,.23,4,'#ded5bd');cylinder(g,3.5,.03,0,.45,4,'#88bbb7');cylinder(g,.7,1.1,0,.85,4,'#ded9c5');cylinder(g,1.55,.18,0,1.47,4,'#e9e2ce');cylinder(g,1.3,.025,0,1.57,4,'#99ccc7');
  obstacles.push({x:0,z:4,w:8,d:8});
  for(const x of [-15,15])for(const z of [-14,14]){box(g,4,.3,4,x,.16,z,'#d3d8bf');tree(g,x,z,'#b5c995',1.25);bench(g,x*.65,z,z<0?0:Math.PI);}
  sign(labels,'同路人广场',0,16,18);
  // A world-space bulletin board is separately pickable and opens the actual post UI.
  const board=new T.Group();board.userData.landmark='board';
  for(const x of [-4.4,4.4])box(board,.24,4.6,.24,x,2.3,-10,'#667e69');
  box(board,9.7,3.5,.32,0,3,-10,'#788e73');box(board,10.2,.22,1.0,0,4.85,-10,'#566f60');
  const bc=document.createElement('canvas');bc.width=1536;bc.height=560;const bctx=bc.getContext('2d')!;bctx.fillStyle='#f8f1d7';bctx.fillRect(0,0,1536,560);bctx.fillStyle='#3f5d47';bctx.font='bold 82px "Microsoft YaHei"';bctx.fillText('世界公告栏',65,112);bctx.font='34px "Microsoft YaHei"';bctx.fillText('在这里分享好消息，也可以放心求助。',65,172);
  ['Offer 分享','面经交流','求职求助'].forEach((t,i)=>{bctx.fillStyle=['#d9e6c7','#d8e5e3','#eadfce'][i];bctx.fillRect(65+i*483,222,441,266);bctx.fillStyle='#536e58';bctx.font='bold 45px "Microsoft YaHei"';bctx.fillText(t,94+i*483,293);bctx.font='29px "Microsoft YaHei"';bctx.fillText(['今天有好消息吗？','这一轮都问了什么？','总有人愿意帮你。'][i],94+i*483,355);bctx.fillText('点击查看 / 发布帖子',94+i*483,432);});
  const bt=new T.CanvasTexture(bc);bt.colorSpace=T.SRGBColorSpace;const bm=new T.Mesh(new T.PlaneGeometry(9.3,3.38),new T.MeshBasicMaterial({map:bt,toneMapped:false,side:T.DoubleSide}));bm.position.set(0,3,-9.82);board.add(bm);obstacles.push({x:0,z:-10,w:10,d:.8});
  // Football block, including two goals and visible net grids.
  box(g,40,.07,40,0,.015,-46,'#c5d3b3');court(labels,0,-46,37,28,'football');
  for(const side of [-1,1]){const x=side*17.1;for(const z of [-49,-43])box(g,.15,2.3,.15,x,1.15,z,'#f9f6e6');box(g,.15,.15,6.15,x,2.3,-46,'#f9f6e6');for(let k=0;k<=12;k++)box(g,.035,2.25,.035,x+side*1.2,1.12,-49+k*.5,'#dfe3d1');for(let k=0;k<=5;k++)box(g,.04,.035,6,x+side*1.2,k*.45,-46,'#e9e9da');for(const z of [-49,-43])box(g,1.2,.06,.06,x+side*.6,2.3,z,'#e9e9da');}
  sign(labels,'足球场',0,-28,13);
  // Park: pond, loop path, gazebo, trees and benches.
  box(g,40,.07,40,-46,.015,0,'#c5d3b3');cylinder(g,11,.025,-47,.063,0,'#eee6cd');cylinder(g,8.6,.03,-47,.08,0,'#b8cbaa');cylinder(g,5.8,.03,-47,.1,0,'#94bcbc');
  box(g,40,.03,2.3,-46,.09,0,'#efe8cf');box(g,2.3,.03,13,-46,.09,13.5,'#efe8cf');
  obstacles.push({x:-47,z:0,w:10,d:10});
  for(const [x,z] of [[-60,-13],[-57,13],[-33,-13],[-32,12],[-62,4],[-48,-16]])tree(g,x,z,'#a7bf91',1.3);
  for(const [x,z] of [[-57,8],[-35,5],[-48,14]])bench(g,x,z,Math.PI/2);
  for(const x of [-38,-32])for(const z of [-8,-2])box(g,.16,3.8,.16,x,1.9,z,'#b5a17e');
  const roof=new T.Mesh(new T.ConeGeometry(5.8,1.6,4),material('#95aa8c'));roof.position.set(-35,4.3,-5);roof.rotation.y=Math.PI/4;roof.castShadow=true;g.add(roof);sign(labels,'海风公园',-46,18,15);
  // Exactly one basketball court and one badminton court.
  box(g,40,.07,40,46,.015,0,'#d7d9c5');court(labels,46,-10,32,16,'basketball');court(labels,46,11,22,11,'badminton');
  for(const side of [-1,1]){const x=46+side*14;box(g,.15,3.6,.15,x,1.8,-10,'#768d85');box(g,.08,1.25,2.1,x-side*.4,3.5,-10,'#f4f2df');box(g,.1,.65,.75,x-side*.46,3.5,-10,'#b6c9bd');const hoop=new T.Mesh(new T.TorusGeometry(.48,.055,6,24),material('#bd8e65'));hoop.rotation.x=Math.PI/2;hoop.position.set(x-side*1.05,3,-10);g.add(hoop);}
  for(const z of [5.8,16.2])box(g,.1,1.8,.1,46,.9,z,'#758b7e');for(let k=0;k<21;k++)box(g,.035,.8,.025,46,1.45,5.8+k*.52,'#f4f2dc');for(const y of [1.05,1.25,1.45,1.65,1.85])box(g,.035,.025,10.5,46,y,11,'#ecebdc');
  sign(labels,'篮球 / 羽毛球',46,19,19);
  // Playground: small ferris wheel, two swings and a slide.
  box(g,40,.07,40,0,.015,46,'#d1d9ba');cylinder(g,8,.04,-7,.08,44,'#e8ddc1');
  tree(g,-15,59,'#b4c49b');tree(g,15,59,'#bbcda1');sign(labels,'微光游乐场',0,65,17);
  // Two small sea piers complete the reclaimed-island silhouette.
  for(const side of [-1,1]){box(g,3,.23,12,0,-.14,side*87,'#d1bb94');for(let i=0;i<20;i++)box(g,3,.025,.04,0,-.008,side*(81.5+i*.55),'#a59271');box(g,8,.23,2.5,0,-.14,side*93,'#d1bb94');}
  mergeStatic(g);g.add(labels);return {group:g,board,obstacles};
}
