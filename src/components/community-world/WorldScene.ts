import * as T from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { LANDMARKS, createRooms, type Room, type Furniture } from './data';
import { box, cylinder, leaf, plant, mergeStatic, materialCache, vertexMaterial } from './geometry';
import { findWalkPath } from './walkPath';
import { isWalkableGround, WALK_GRID_LIMIT } from './walkableGround';
import { WorldActivities, type ActivityKind, type ActivityStatus } from './WorldActivities';
import { createIslandEnvironment } from './islandEnvironment';

import type { PlayerFrame, SharedSeat } from './networkTypes';

type Network = { acquire: (resource:string)=>Promise<number>; release:()=>void };
type Callbacks = { select: (id: string) => void; move: (id: string, x: number, z: number) => void; ready: () => void; error: (message: string) => void; board: () => void; view: (first: boolean) => void; activity: (status:ActivityStatus) => void };
function textPlane(g: T.Group, title: string, sub: string, color: string, empty: boolean, atlas: T.CanvasTexture, mat: T.MeshBasicMaterial, index: number) {
  const c=document.createElement('canvas'); c.width=1024;c.height=280;
  const ctx=c.getContext('2d')!;
  ctx.fillStyle='#f8f6ee';ctx.fillRect(0,0,1024,280);
  ctx.fillStyle=color;ctx.fillRect(0,0,9,280);
  ctx.strokeStyle=color;ctx.lineWidth=3;ctx.strokeRect(14,5,1005,270);
  ctx.fillStyle=color; ctx.beginPath(); ctx.roundRect(43,62,114,114,23);ctx.fill();
  ctx.fillStyle='#fffdf6';ctx.textAlign='center';ctx.font='600 64px "Microsoft YaHei",sans-serif';ctx.fillText(empty?'+':title.slice(0,1),100,144);
  ctx.textAlign='left';ctx.fillStyle=empty?'#7a8372':'#263f31';ctx.font='600 60px "Microsoft YaHei",sans-serif';ctx.fillText(title,190,120,785);
  ctx.fillStyle='#839082';ctx.font='26px "Microsoft YaHei",sans-serif';ctx.fillText(sub,194,173,760);
  ctx.font='17px sans-serif';ctx.fillText(empty?'A LITTLE SPACE FOR YOUR BIG DREAMS':'SUGAR NEIGHBORHOOD  /  MAKE YOURSELF AT HOME',194,220);
  const column=index%10,row=Math.floor(index/10);
  (atlas.image as HTMLCanvasElement).getContext('2d')!.drawImage(c,column*256,row*80,256,80);atlas.needsUpdate=true;
  const geometry=new T.PlaneGeometry(6.3,1.57),uv=geometry.attributes.uv;
  for(let i=0;i<uv.count;i++)uv.setXY(i,(column*256+1+uv.getX(i)*254)/2560,1-(row*80+1+(1-uv.getY(i))*78)/800);
  const plane=new T.Mesh(geometry,mat);plane.position.set(0,1.39,-2.92);g.add(plane);
}
function artwork(g:T.Group,x:number,y:number,z:number,color:string) {
  box(g,.78,.82,.08,x,y,z,'#e8d8b9');box(g,.66,.69,.025,x,y,z+.05,'#f9f7f0');
  box(g,.42,.38,.035,x,y,z+.07,color);box(g,.13,.2,.04,x+.07,y+.03,z+.09,'#f4ebc9');
}
function avatar(shirt:string, seated=false) {
  const g=new T.Group(); const skin='#e8cdb0',hair='#584538';
  box(g,.52,.63,.34,0,.93,0,shirt);
  box(g,.46,.47,.43,0,1.51,0,skin);box(g,.5,.15,.47,0,1.79,-.015,hair);box(g,.5,.35,.14,0,1.59,-.18,hair);
  box(g,.065,.065,.02,-.12,1.54,.225,'#454337');box(g,.065,.065,.02,.12,1.54,.225,'#454337');
  for (const s of [-1,1]) {
    const leg=new T.Group();leg.name=s<0?'leftLeg':'rightLeg';leg.position.set(s*.15,.64,0);
    box(leg,.22,.49,.25,0,-.23,seated?.12:0,'#4d5c57');box(leg,.24,.13,.34,0,-.49,seated?.21:.045,'#f1eee1');g.add(leg);
    const arm=new T.Group();arm.name=s<0?'leftArm':'rightArm';arm.position.set(s*.37,1.2,0);
    box(arm,.2,.38,.25,0,-.13,0,shirt);box(arm,.18,.18,.2,0,-.4,.015,skin);if(seated)arm.rotation.x=-.9;g.add(arm);
  }
  return g;
}
function desk(g:T.Group,color:string) {
  const z=-1.25;
  box(g,2.6,.15,1.18,.3,1.04,z,'#decaab');
  for(const x of [-.85,1.45])for(const dz of [-.47,.47])box(g,.1,.9,.1,x,.52,z+dz,'#4c504a');
  box(g,.78,.51,.06,.2,1.58,z-.3,'#535d56');box(g,.68,.4,.015,.2,1.59,z-.262,'#cedfe3');
  box(g,.08,.21,.08,.2,1.25,z-.3,'#565c53');box(g,.43,.035,.25,.2,1.12,z-.29,'#6a7167');
  box(g,.54,.038,.19,.2,1.14,z+.19,'#ecece1');for(let i=0;i<5;i++)box(g,.015,.005,.14,.02+i*.09,1.162,z+.19,'#aeb4aa');
  box(g,.1,.045,.15,.72,1.14,z+.19,'#788177');plant(g,1.16,z-.25,.32,1.12);
  cylinder(g,.08,.15,-.68,1.19,z+.1,'#f5f0da');
  // The cream chair, black five-spoke base and pastel cushions are part of the reference's visual language.
  const chair=new T.Group();chair.position.set(.2,0,.02);
  box(chair,.8,.16,.7,0,.59,0,color);box(chair,.82,.7,.14,0,.95,.35,color);box(chair,.62,.48,.05,0,1,.44,'#d7dfce');
  cylinder(chair,.06,.4,0,.32,0,'#59605a');
  for(let i=0;i<5;i++){const a=i*Math.PI*2/5;const b=box(chair,.07,.055,.7,Math.sin(a)*.15,.14,Math.cos(a)*.15,'#626862');b.rotation.y=a;cylinder(chair,.08,.1,Math.sin(a)*.45,.1,Math.cos(a)*.45,'#525953');}
  g.add(chair);
  const a=avatar(color,true);a.scale.setScalar(1.12);a.position.set(.2,.14,-.05);a.rotation.y=Math.PI;g.add(a);
}
function furnitureMesh(f:Furniture,color:string) {
  const g=new T.Group();g.userData.furnitureId=f.id;
  if(f.kind==='plant')plant(g,0,0,1.25);
  if(f.kind==='sofa') {
    box(g,2.1,.35,.94,0,.45,0,color);box(g,2.1,.7,.24,0,.8,-.4,color);
    box(g,.22,.62,1,-.97,.58,0,color);box(g,.22,.62,1,.97,.58,0,color);
    box(g,.77,.16,.71,-.44,.7,.06,'#e6dfd5');box(g,.77,.16,.71,.44,.7,.06,'#e6dfd5');
    for(const x of [-.8,.8])for(const z of [-.3,.3])box(g,.11,.22,.11,x,.21,z,'#786f60');
  }
  if(f.kind==='shelf') {
    box(g,1.2,1.86,.14,0,1.1,-.16,'#b0bba3');for(const x of [-.55,.55])box(g,.12,1.9,.5,x,1.1,0,'#bac4ad');
    for(let i=0;i<4;i++){box(g,1.12,.1,.5,0,.23+i*.57,0,'#bdc7b1');if(i<3)for(let j=0;j<4;j++)box(g,.13,.28+(j%2)*.12,.3,-.36+j*.21,.44+i*.57,0,['#e4c591','#cfb5ab','#8daba4','#e5dec4'][j]);}
  }
  if(f.kind==='lamp') {cylinder(g,.29,.08,0,.22,0,'#77786a');cylinder(g,.035,1.8,0,1.1,0,'#897e63');cylinder(g,.42,.47,0,2.05,0,'#eddfb8',.26);}
  if(f.kind==='rug'){box(g,2.75,.025,1.95,0,.24,0,color);box(g,2.58,.028,1.78,0,.255,0,'#e7e7d8');box(g,2.35,.029,1.55,0,.273,0,color);}
  if(f.kind==='art') {for(const x of [-.32,.32]){const m=box(g,.06,1.25,.06,x,.82,0,'#b79d78');m.rotation.z=x*.3;}box(g,.9,1.04,.08,0,1.2,0,'#dec8a2');box(g,.78,.89,.02,0,1.2,.05,'#faf6e9');leaf(g,-.09,1.28,.13,.25,color);cylinder(g,.16,.22,.15,1.02,.13,'#c4ad8a');}
  mergeStatic(g);g.position.set(f.x,0,f.z);g.rotation.y=f.rotation;return g;
}
function disposeGroup(g:T.Object3D) {
  g.traverse(o=>{if(o instanceof T.Mesh){o.geometry.dispose();const mats=Array.isArray(o.material)?o.material:[o.material];mats.forEach(m=>{if(m instanceof T.MeshBasicMaterial && m.map && !m.userData.sharedAtlas){m.map.dispose();m.dispose();}});}});
}

export class WorldScene {
  private scene=new T.Scene();
  private atlas=new T.CanvasTexture(Object.assign(document.createElement('canvas'),{width:2560,height:800}));
  private labelMaterial=new T.MeshBasicMaterial({map:this.atlas,side:T.DoubleSide,toneMapped:false});
  private roomIndices=new Map(createRooms().map((r,i)=>[r.id,i]));
  private network:Network|null=null;
  private entryPending=false;
  private entryEpoch=0;
  private heldLease=false;
  private sharedSeats:SharedSeat[]=[];
  private peers=new Map<string,{mesh:T.Group;target:T.Vector3;frame:PlayerFrame;seen:number}>();
  private frameSamples:number[]=[];
  private renderSamples:number[]=[];
  private sampleTime=0;
  private qualityRatio=1;
  private lastActivity='';
  setNetwork(network:Network|null){if(this.activities.active||this.entryPending)this.exitActivity();this.network=network;this.activities.setMultiplayer(!!network);}
  setClockOffset(offset:number){this.activities.setClockOffset(offset);}
  setSharedSeats(seats:SharedSeat[],userId:string,sessionId:string){this.sharedSeats=seats;this.activities.setSeats(seats,userId,sessionId);}
  loseLease(message:string){this.exitActivity();this.activities.messageToUser(message);this.emitActivity();}
  localFrame(){return {x:this.player.position.x,y:this.player.position.y,z:this.player.position.z,yaw:this.player.rotation.y,wave:performance.now()<this.waveUntil,...this.activities.sharedFrame()};}
  retainPeers(ids:string[]){for(const [id,p] of this.peers)if(!ids.includes(id)){this.scene.remove(p.mesh);disposeGroup(p.mesh);p.mesh.traverse(o=>{if(o instanceof T.Sprite){o.material.map?.dispose();o.material.dispose();}});this.peers.delete(id);}}
  receivePeer(frame:PlayerFrame){
    let peer=this.peers.get(frame.id);if(peer&&frame.seq<=peer.frame.seq)return;
    if(!peer){if(this.peers.size>=64)return;const mesh=avatar('#75a9cc');mesh.scale.setScalar(1.25);mergeStatic(mesh);mesh.traverse(o=>{if(o instanceof T.Mesh)o.castShadow=false;});
      const canvas=document.createElement('canvas');canvas.width=256;canvas.height=64;const ctx=canvas.getContext('2d')!;ctx.fillStyle='#faf6e7';ctx.fillRect(0,0,256,64);ctx.fillStyle='#35614a';ctx.font='26px sans-serif';ctx.textAlign='center';ctx.fillText(frame.name,128,42,240);const texture=new T.CanvasTexture(canvas);const label=new T.Sprite(new T.SpriteMaterial({map:texture}));label.scale.set(2.4,.6,1);label.position.y=2.4;mesh.add(label);
      mesh.position.set(frame.x,frame.y,frame.z);this.scene.add(mesh);peer={mesh,target:new T.Vector3(),frame,seen:performance.now()};this.peers.set(frame.id,peer);}
    peer.target.set(frame.x,frame.y,frame.z);peer.frame=frame;peer.seen=performance.now();
    if(this.sharedSeats.some(s=>s.session_id===frame.id&&s.user_id===frame.userId&&s.resource===frame.mode))this.activities.receiveShared(frame);
    this.dirty=5;
  }
  private async enterActivity(kind:ActivityKind,taxi?:number){
    if(this.entryPending||this.activities.active)return;
    const epoch=this.entryEpoch;this.entryPending=true;
    try{let seat=1;if(this.network){seat=await this.network.acquire(kind==='taxi'?`taxi-${taxi??0}`:kind);this.heldLease=true;}
      if(this.disposed||epoch!==this.entryEpoch){this.network?.release();this.heldLease=false;return;}
      this.activities.assignSeat(seat);
      if(!this.activities.enter(kind,this.player,taxi)){this.network?.release();this.heldLease=false;}
      this.afterActivity();
    }catch(error){this.activities.messageToUser(error instanceof Error?error.message:'进入失败，请重试。');this.emitActivity();}
    finally{this.entryPending=false;}
  }

  private activities=new WorldActivities();
  private activityStamp=0;
  private cameraMode:'pan'|'rotate'='pan';
  private renderer:T.WebGLRenderer;
  private camera=new T.OrthographicCamera(-20,20,14,-14,.1,800);
  private controls:OrbitControls;
  private firstCamera=new T.PerspectiveCamera(68,1,.1,600);
  private firstPerson=false;
  private firstYaw=0;
  private firstPitch=0;
  private looking=false;
  private lastPointer={x:0,y:0};
  private board=new T.Group();
  private obstacles:{x:number;z:number;w:number;d:number}[]=[];
  private walkPath:T.Vector3[]=[];
  private activeCamera(){return this.firstPerson?this.firstCamera:this.camera;}

  private groups=new Map<string,T.Group>();
  private staticBatch=new T.Group();
  private rooms:Room[]=[];
  private player=avatar('#afc1a0');
  private selection=new T.Group();
  private raycaster=new T.Raycaster();
  private ground=new T.Plane(new T.Vector3(0,1,0),-.2);
  private keys=new Set<string>();
  private frame=0;
  private lastTime=0;
  private dirty=40;
  private disposed=false;
  private observer:ResizeObserver;
  private editRoom:string|null=null;
  private down={x:0,y:0};
  private dragging:{object:T.Object3D;room:Room;id:string;pointer:number;offset:T.Vector3}|null=null;
  private waveUntil=0;
  private jumpStart=0;
  private follow=false;
  private targetTween:{to:T.Vector3;zoom:number}|null=null;
  private touchVector={x:0,z:0};
  private night=false;
  private sun=new T.DirectionalLight('#fff4df',2.5);
  private ambient=new T.HemisphereLight('#fffcf0','#b2b2a4',2.4);
  constructor(private host:HTMLElement,private callbacks:Callbacks) {
    this.atlas.colorSpace=T.SRGBColorSpace;this.atlas.generateMipmaps=false;this.atlas.minFilter=T.LinearFilter;this.labelMaterial.userData.sharedAtlas=true;
    this.scene.background=new T.Color('#168b99');
    this.renderer=new T.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
    this.qualityRatio=Math.min(devicePixelRatio,1);this.renderer.setPixelRatio(this.qualityRatio);
    this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=T.PCFShadowMap;this.renderer.shadowMap.autoUpdate=false;
    this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.1;
    const canvas=this.renderer.domElement;canvas.tabIndex=0;canvas.setAttribute('aria-label','求职小镇三维地图：拖动浏览、滚轮缩放，点击房间查看，WASD 移动人物');
    host.appendChild(canvas);
    this.camera.position.set(130,160,180);this.camera.zoom=.15;this.controls=new OrbitControls(this.camera,canvas);
    this.controls.target.set(0,0,0);this.controls.enableDamping=true;this.controls.dampingFactor=.14;
    this.controls.minZoom=.045;this.controls.maxZoom=2.4;this.controls.minPolarAngle=.3;this.controls.maxPolarAngle=1.18;
    this.controls.mouseButtons={LEFT:T.MOUSE.PAN,MIDDLE:T.MOUSE.DOLLY,RIGHT:T.MOUSE.ROTATE};
    this.controls.touches={ONE:T.TOUCH.PAN,TWO:T.TOUCH.DOLLY_ROTATE};this.controls.screenSpacePanning=false;this.controls.zoomToCursor=true;
    this.controls.addEventListener('change',this.onCameraChange);this.controls.addEventListener('start',this.onControlStart);
    this.scene.add(this.ambient);this.sun.position.set(-100,180,95);this.sun.castShadow=true;this.sun.shadow.mapSize.set(1024,1024);
    Object.assign(this.sun.shadow.camera,{left:-120,right:120,top:120,bottom:-120,near:.5,far:400});this.sun.shadow.normalBias=.035;this.sun.shadow.bias=-.0003;this.sun.shadow.radius=3;this.scene.add(this.sun);
    this.createEnvironment();this.scene.add(this.activities.root);
    this.player.position.set(0,.2,-2);this.player.scale.setScalar(1.25);this.scene.add(this.player);this.scene.add(this.staticBatch);
    const ring=new T.Mesh(new T.RingGeometry(.56,.72,32),new T.MeshBasicMaterial({color:'#cedd9b',side:T.DoubleSide}));ring.rotation.x=-Math.PI/2;ring.position.y=.03;this.player.add(ring);
    this.player.traverse(o=>{if(o instanceof T.Mesh)o.castShadow=false;});
    const outline=new T.Mesh(new T.BoxGeometry(6.95,.045,6.35),new T.MeshBasicMaterial({color:'#779876'}));outline.position.y=.06;this.selection.add(outline);this.selection.visible=false;this.scene.add(this.selection);
    canvas.addEventListener('pointerdown',this.onDown);canvas.addEventListener('pointermove',this.onMove);canvas.addEventListener('pointerup',this.onUp);canvas.addEventListener('pointercancel',this.onCancel);
    canvas.addEventListener('keydown',this.onKeyDown);canvas.addEventListener('keyup',this.onKeyUp);canvas.addEventListener('blur',this.onBlur);canvas.addEventListener('webglcontextlost',this.onContextLost);
    this.observer=new ResizeObserver(this.resize);this.observer.observe(host);this.resize();this.overview();this.frame=requestAnimationFrame(this.animate);
  }
  private createEnvironment() {
    const environment=createIslandEnvironment();this.scene.add(environment.group);environment.group.updateMatrixWorld(true);environment.group.traverse(o=>{o.matrixAutoUpdate=false;});this.board=environment.board;this.scene.add(this.board);this.obstacles=environment.obstacles;
  }
  setCameraMode(mode:'pan'|'rotate'){this.cameraMode=mode;this.controls.mouseButtons.LEFT=mode==='pan'?T.MOUSE.PAN:T.MOUSE.ROTATE;this.controls.touches.ONE=mode==='pan'?T.TOUCH.PAN:T.TOUCH.ROTATE;}
  goToActivity(kind:ActivityKind){if(this.editRoom)return;this.exitActivity();this.activities.goTo(kind,this.player);this.walkPath=[];this.followPlayer();this.emitActivity();}
  interact(){if(this.editRoom)return;this.walkPath=[];this.jumpStart=0;if(this.activities.active){this.exitActivity();return;}const nearby=this.activities.nearest(this.player.position);if(nearby)void this.enterActivity(nearby.kind,nearby.taxi);else{this.activities.messageToUser('附近没有可互动的项目，请先前往。');this.emitActivity();}}
  activityAction(){this.activities.action(this.player);this.emitActivity();this.renderer.domElement.focus({preventScroll:true});}
  exitActivity(){this.entryEpoch++;if(this.heldLease){this.network?.release();this.heldLease=false;}this.activities.exit(this.player);this.afterActivity();}
  private emitActivity(){const status=this.activities.status(this.player),stamp=JSON.stringify(status);if(stamp!==this.lastActivity){this.lastActivity=stamp;this.callbacks.activity(status);}}
  private afterActivity(){this.keys.clear();this.touchVector={x:0,z:0};this.player.rotation.x=0;if(this.activities.active){this.follow=true;if(!this.firstPerson)this.targetTween={to:this.player.position.clone(),zoom:.7};this.firstYaw=["taxi","yacht","plane"].includes(this.activities.currentMode||"")?this.activities.vehicleHeading:this.player.rotation.y;}else this.followPlayer();this.emitActivity();this.renderer.domElement.focus({preventScroll:true});}
  setFirstPerson(value:boolean) {
    if(value&&this.editRoom)return;
    this.firstPerson=value;this.controls.enabled=!value;this.player.visible=!value;this.targetTween=null;this.walkPath=[];this.keys.clear();
    if(value){this.firstYaw=this.player.rotation.y;this.firstPitch=0;this.scene.background=new T.Color('#d6e6dd');}
    else this.scene.background=new T.Color(this.night?'#295e69':'#168b99');
    this.callbacks.view(value);this.dirty=30;this.renderer.domElement.focus({preventScroll:true});
  }
  visit(id:string) {
    const target=LANDMARKS.find(l=>l.id===id);if(!target)return;this.exitActivity();this.emitActivity();
    this.player.position.set(target.x,.2,target.z+(id==='plaza'?-3:17));this.walkPath=[];
    if(this.firstPerson){this.firstYaw=Math.PI;this.firstPitch=0;}
    else this.targetTween={to:new T.Vector3(target.x,0,target.z),zoom:.62};
    this.dirty=40;
  }
  private planWalk(target:T.Vector3) {
    if(this.blocked(target.x,target.z))return;
    const path=findWalkPath({x:Math.round(this.player.position.x),z:Math.round(this.player.position.z)},{x:Math.round(target.x),z:Math.round(target.z)},(x,z)=>this.blocked(x,z),WALK_GRID_LIMIT);
    this.walkPath=path.map(p=>new T.Vector3(p.x,.2,p.z));this.follow=true;this.dirty=10;
  }
  private buildRoom(room:Room) {
    const root=new T.Group();root.userData.roomId=room.id;
    const base=new T.Group();
    box(base,6.8,.16,6.2,0,.08,0,'#f1eee4');box(base,6.56,.035,5.96,0,.18,0,room.occupied?room.color:'#c9cfbe');
    box(base,6.4,.04,5.8,0,.2,0,room.floor);
    box(base,6.8,2.15,.16,0,1.245,-3.02,'#d4d4c8');box(base,6.8,.09,.21,0,2.36,-3.02,'#f7f4e9');
    box(base,.16,2.15,6.2,-3.32,1.245,0,'#dbdbce');box(base,.21,.09,6.2,-3.32,2.36,0,'#f4f2e6');
    box(base,.16,2.15,6.2,3.32,1.245,0,'#dbdbce');box(base,.21,.09,6.2,3.32,2.36,0,'#f4f2e6');
    box(base,.04,2,.04,-3.2,1.23,2.94,room.color);
    if(room.occupied){desk(base,room.color);artwork(base,2.35,1.77,-2.9,room.color);}
    else {box(base,1.4,.025,1.4,0,.24,.1,'#dce1d2');box(base,.6,.027,.1,0,.256,.1,'#9ca98e');box(base,.1,.029,.6,0,.258,.1,'#9ca98e');plant(base,-2.5,-2,.6);}
    mergeStatic(base);root.add(base);
    textPlane(root,room.occupied?room.name:'这间，留给你',room.occupied?`${room.owner}  ·  ${room.tags.join(' / ')}`:`${room.id}  /  点击领取你的小天地`,room.color,!room.occupied,this.atlas,this.labelMaterial,this.roomIndices.get(room.id)||0);
    for(const f of room.furniture)root.add(furnitureMesh(f,room.color));
    root.position.set(room.x,0,room.z);this.scene.add(root);this.groups.set(room.id,root);
  }
  setRooms(rooms:Room[]) {
    const old=new Map(this.rooms.map(r=>[r.id,r]));
    let batchChanged=false;
    for(const room of rooms){if(old.get(room.id)===room)continue;if(room.id!==this.editRoom)batchChanged=true;const g=this.groups.get(room.id);if(g){this.scene.remove(g);disposeGroup(g);}this.buildRoom(room);}
    this.rooms=rooms;if(batchChanged)this.rebatch();this.renderer.shadowMap.needsUpdate=true;this.dirty=30;this.callbacks.ready();
  }
  private rebatch() {
    // One draw per material across the district, with the editable room kept separate for dragging.
    this.staticBatch.traverse(o=>{if(o instanceof T.Mesh)o.geometry.dispose();});this.staticBatch.clear();
    const districts=new Map<string,Map<T.Material,T.BufferGeometry[]>>();
    this.groups.forEach((root,id)=>{
      this.scene.remove(root);root.updateMatrixWorld(true);
      if(id===this.editRoom){this.scene.add(root);return;}
      const byMaterial=districts.get(id[0])||new Map<T.Material,T.BufferGeometry[]>();districts.set(id[0],byMaterial);
      root.traverse(o=>{if(o instanceof T.Mesh&&!Array.isArray(o.material)){
        const geometry=(o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone()).applyMatrix4(o.matrixWorld);const list=byMaterial.get(o.material)||[];list.push(geometry);byMaterial.set(o.material,list);
      }});
    });
    districts.forEach(byMaterial=>byMaterial.forEach((geometries,mat)=>{const merged=mergeGeometries(geometries,false);geometries.forEach(g=>g.dispose());if(merged){const mesh=new T.Mesh(merged,mat);mesh.castShadow=!(mat instanceof T.MeshBasicMaterial);mesh.receiveShadow=true;mesh.updateMatrix();mesh.matrixAutoUpdate=false;this.staticBatch.add(mesh);}}));
  }
  select(id:string|null) {const r=this.rooms.find(x=>x.id===id);this.selection.visible=!!r;if(r)this.selection.position.set(r.x,0,r.z);this.dirty=3;}
  edit(id:string|null) {if(id)this.exitActivity();this.editRoom=id;this.host.classList.toggle('world-editing',!!id);this.rebatch();this.renderer.shadowMap.needsUpdate=true;this.dirty=10;}
  focus(id:string) {if(this.firstPerson)this.setFirstPerson(false);const r=this.rooms.find(x=>x.id===id);if(!r)return;this.follow=false;const angle=Math.atan2(this.camera.position.x-this.controls.target.x,this.camera.position.z-this.controls.target.z);const shift=this.host.clientWidth<600?0:3;const to=new T.Vector3(r.x+Math.cos(angle)*shift,0,r.z-Math.sin(angle)*shift);if(this.host.clientWidth<600){to.x+=Math.sin(angle)*7.2;to.z+=Math.cos(angle)*7.2;}this.targetTween={to,zoom:this.host.clientWidth<600?1.02:1.6};this.select(id);this.dirty=60;}
  overview() {if(this.firstPerson)this.setFirstPerson(false);this.follow=false;this.targetTween={to:new T.Vector3(),zoom:Math.min(.155,this.host.clientWidth/this.host.clientHeight*.09)};this.dirty=60;}
  home() {this.overview();}
  zoom(direction:number) {this.targetTween=null;this.camera.zoom=T.MathUtils.clamp(this.camera.zoom*(direction>0?1.2:1/1.2),.045,2.4);this.camera.updateProjectionMatrix();this.dirty=20;}
  rotate() {const offset=this.camera.position.clone().sub(this.controls.target);offset.applyAxisAngle(new T.Vector3(0,1,0),Math.PI/2);this.camera.position.copy(this.controls.target).add(offset);this.controls.update();this.dirty=30;}
  followPlayer() {if(this.firstPerson){this.renderer.domElement.focus();return;}this.follow=true;this.targetTween={to:this.player.position.clone().setY(0),zoom:1.4};this.dirty=60;this.renderer.domElement.focus({preventScroll:true});}
  wave() {this.waveUntil=performance.now()+2200;this.dirty=180;}
  jump() {if(this.activities.active)return;if(!this.jumpStart)this.jumpStart=performance.now();this.dirty=90;}
  setTouch(x:number,z:number) {this.walkPath=[];this.touchVector={x,z};}
  setNight(night:boolean) {this.night=night;this.ambient.intensity=night?.85:2.4;this.sun.intensity=night?1.25:2.5;this.sun.color.set(night?'#bacbff':'#fff4df');this.scene.background=new T.Color(this.firstPerson?'#d6e6dd':night?'#295e69':'#168b99');this.renderer.toneMappingExposure=night?.8:1.1;this.dirty=5;}
  private onCameraChange=()=>{this.dirty=12;};
  private onControlStart=()=>{this.targetTween=null;this.follow=false;};
  private resize=()=>{
    const w=this.host.clientWidth,h=this.host.clientHeight;if(!w||!h)return;
    const half=h<500?11.5:13;this.camera.left=-half*w/h;this.camera.right=half*w/h;this.camera.top=half;this.camera.bottom=-half;this.camera.updateProjectionMatrix();this.firstCamera.aspect=w/h;this.firstCamera.updateProjectionMatrix();this.renderer.setSize(w,h);this.dirty=20;
  };
  private ray(e:PointerEvent) {const r=this.renderer.domElement.getBoundingClientRect();this.raycaster.setFromCamera(new T.Vector2((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1),this.activeCamera());}
  private onDown=(e:PointerEvent)=>{
    this.down={x:e.clientX,y:e.clientY};this.lastPointer={...this.down};this.looking=true;if(e.button!==0)return;
    if(this.firstPerson)this.renderer.domElement.setPointerCapture(e.pointerId);
    this.ray(e);
    if(this.editRoom){const room=this.rooms.find(r=>r.id===this.editRoom)!;const g=this.groups.get(room.id)!;
      const hits=this.raycaster.intersectObject(g,true);for(const hit of hits.slice(0,1)){let o:T.Object3D|null=hit.object;while(o&&o!==g){if(o.userData.furnitureId){const p=new T.Vector3();this.raycaster.ray.intersectPlane(this.ground,p);this.dragging={object:o,room,id:o.userData.furnitureId,pointer:e.pointerId,offset:p.sub(new T.Vector3(room.x+o.position.x,.2,room.z+o.position.z))};this.controls.enabled=false;this.renderer.domElement.setPointerCapture(e.pointerId);return;}o=o.parent;}}
    }
  };
  private onMove=(e:PointerEvent)=>{
    if(this.firstPerson&&this.looking){this.firstYaw-=(e.clientX-this.lastPointer.x)*.006;this.firstPitch=T.MathUtils.clamp(this.firstPitch-(e.clientY-this.lastPointer.y)*.006,-1.1,1.1);this.lastPointer={x:e.clientX,y:e.clientY};this.dirty=5;return;}
    if(!this.dragging)return;this.ray(e);const point=new T.Vector3();if(!this.raycaster.ray.intersectPlane(this.ground,point))return;
    const {object,room,offset}=this.dragging;point.sub(offset);
    object.position.x=Math.round(T.MathUtils.clamp(point.x-room.x,-2.4,2.4)*4)/4;object.position.z=Math.round(T.MathUtils.clamp(point.z-room.z,-2.1,2.35)*4)/4;
    this.dirty=3;this.renderer.shadowMap.needsUpdate=true;
  };
  private onUp=(e:PointerEvent)=>{
    this.looking=false;
    if(this.dragging){const {id,object}=this.dragging;this.callbacks.move(id,object.position.x,object.position.z);this.dragging=null;this.controls.enabled=!this.firstPerson;return;}
    if(e.button!==0||Math.hypot(e.clientX-this.down.x,e.clientY-this.down.y)>6)return;
    this.ray(e);
    const boardHit=this.raycaster.intersectObject(this.board,true)[0];
    const hit=this.raycaster.intersectObjects(Array.from(this.groups.values()),true)[0];
    if(boardHit&&(!hit||boardHit.distance<hit.distance)){this.callbacks.board();return;}
    const activityHit=this.activities.hit(this.raycaster);
    if(activityHit&&(!hit||activityHit.distance<hit.distance)&&!this.editRoom){this.walkPath=[];if(!this.activities.active)void this.enterActivity(activityHit.kind,activityHit.taxi);else this.emitActivity();return;}
    if(this.activities.active)return;
    if(hit){let o:T.Object3D|null=hit.object;while(o){if(o.userData.roomId){this.callbacks.select(o.userData.roomId);return;}o=o.parent;}}
    const target=new T.Vector3();if(this.raycaster.ray.intersectPlane(this.ground,target))this.planWalk(target);
  };
  private onCancel=()=>{this.looking=false;if(this.dragging){const {id,object}=this.dragging;this.callbacks.move(id,object.position.x,object.position.z);}this.dragging=null;this.controls.enabled=!this.firstPerson;this.touchVector={x:0,z:0};};
  private onKeyDown=(e:KeyboardEvent)=>{if(e.code==='KeyF'){e.preventDefault();if(!e.repeat)this.interact();return;}if(e.code==='Space'&&this.activities.active){e.preventDefault();if(!e.repeat)this.activityAction();return;}if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code)){e.preventDefault();this.walkPath=[];this.keys.add(e.code);if(e.code==='Space')this.jump();this.follow=true;}};
  private onKeyUp=(e:KeyboardEvent)=>{this.keys.delete(e.code);};
  private onBlur=()=>{this.keys.clear();this.touchVector={x:0,z:0};this.looking=false;};
  private onContextLost=(e:Event)=>{e.preventDefault();this.callbacks.error('三维画面已暂停，请刷新页面恢复。已保存的房间会保留。');};
  private blocked(x:number,z:number) {
    if(!isWalkableGround(x,z))return true;
    if(this.obstacles.some(o=>Math.abs(x-o.x)<o.w/2+.3&&Math.abs(z-o.z)<o.d/2+.3))return true;
    return this.rooms.some(r=>{
      const dx=x-r.x,dz=z-r.z;
      if(Math.abs(dz+3.02)<.32&&Math.abs(dx)<3.65)return true;
      if(Math.abs(dx-3.32)<.32&&Math.abs(dz)<3.35)return true;
      if(Math.abs(dx+3.32)<.32&&Math.abs(dz)<3.35)return true;
      if(r.occupied&&dx> -1.22&&dx<1.9&&dz> -2.12&&dz<-.3)return true;
      return false;
    });
  }
  private animate=(time:number)=>{
    if(this.disposed)return;this.frame=requestAnimationFrame(this.animate);const elapsed=time-this.lastTime;if(elapsed<1000/65)return;const dt=Math.min(elapsed/1000,.06);this.lastTime=time;if(elapsed<250){this.frameSamples.push(elapsed);if(this.frameSamples.length>120)this.frameSamples.shift();}
    if(document.hidden)return;
    if(!this.firstPerson)this.controls.update();
    let dx=(this.keys.has('KeyD')||this.keys.has('ArrowRight')?1:0)-(this.keys.has('KeyA')||this.keys.has('ArrowLeft')?1:0)+this.touchVector.x;
    let dz=(this.keys.has('KeyS')||this.keys.has('ArrowDown')?1:0)-(this.keys.has('KeyW')||this.keys.has('ArrowUp')?1:0)+this.touchVector.z;
    const oldVehicleHeading=this.activities.vehicleHeading;
    const wasPlaying=this.activities.active;this.activities.update(dt,this.player,{x:dx,z:dz});
    if(wasPlaying&&!this.activities.active&&this.heldLease){this.network?.release();this.heldLease=false;}
    for(const peer of this.peers.values()){peer.mesh.visible=time-peer.seen<15000;peer.mesh.position.lerp(peer.target,1-Math.exp(-dt*14));const delta=Math.atan2(Math.sin(peer.frame.yaw-peer.mesh.rotation.y),Math.cos(peer.frame.yaw-peer.mesh.rotation.y));peer.mesh.rotation.y+=delta*(1-Math.exp(-dt*14));peer.mesh.rotation.z=peer.frame.wave?Math.sin(time*.008)*.08:0;}
    if(this.firstPerson&&['taxi','yacht','plane'].includes(this.activities.currentMode||''))this.firstYaw+=this.activities.vehicleHeading-oldVehicleHeading;
    this.dirty=2;
    if(time-this.activityStamp>120){this.emitActivity();this.activityStamp=time;}
    const playing=this.activities.active;
    this.player.visible=!this.firstPerson&&!['taxi','plane'].includes(this.activities.currentMode||'');
    let moving=!!(dx||dz)&&!playing;
    if(moving){const l=Math.max(1,Math.hypot(dx,dz));dx/=l;dz/=l;const angle=this.firstPerson?this.firstYaw+Math.PI:Math.atan2(this.camera.position.x-this.controls.target.x,this.camera.position.z-this.controls.target.z);
      const vx=(dx*Math.cos(angle)+dz*Math.sin(angle))*dt*4.2,vz=(-dx*Math.sin(angle)+dz*Math.cos(angle))*dt*4.2;
      if(!this.blocked(this.player.position.x+vx,this.player.position.z))this.player.position.x+=vx;
      if(!this.blocked(this.player.position.x,this.player.position.z+vz))this.player.position.z+=vz;
      this.player.rotation.y=Math.atan2(vx,vz);this.follow=true;this.dirty=8;
    }
    if(!playing&&!moving&&this.walkPath.length){const target=this.walkPath[0],diff=target.clone().sub(this.player.position).setY(0),distance=diff.length(),speed=dt*7;if(distance<speed+.06){this.player.position.x=target.x;this.player.position.z=target.z;this.walkPath.shift();}else{diff.normalize();const x=this.player.position.x+diff.x*speed,z=this.player.position.z+diff.z*speed;if(!this.blocked(x,z)){this.player.position.x=x;this.player.position.z=z;this.player.rotation.y=Math.atan2(diff.x,diff.z);}else this.walkPath=[];}moving=true;this.dirty=8;}
    for(const name of ['leftLeg','rightLeg'])this.player.getObjectByName(name)!.rotation.x=this.activities.seated?-Math.PI/2:moving?Math.sin(time*.012+(name==='leftLeg'?0:Math.PI))*.5:0;
    this.player.getObjectByName('rightArm')!.rotation.z=time<this.waveUntil?-2.2+Math.sin(time*.016)*.3:0;
    if(time<this.waveUntil)this.dirty=3;
    if(this.jumpStart){const t=(time-this.jumpStart)/700;this.player.position.y=.2+Math.sin(Math.min(t,1)*Math.PI)*1.2;if(t>=1){this.jumpStart=0;this.player.position.y=.2;}this.dirty=3;}
    if(this.targetTween){const before=this.controls.target.clone();this.controls.target.lerp(this.targetTween.to,.12);this.camera.position.add(this.controls.target.clone().sub(before));this.camera.zoom=T.MathUtils.lerp(this.camera.zoom,this.targetTween.zoom,.12);this.camera.updateProjectionMatrix();this.dirty=5;if(this.controls.target.distanceTo(this.targetTween.to)<.03&&Math.abs(this.camera.zoom-this.targetTween.zoom)<.01)this.targetTween=null;}
    else if(!this.firstPerson&&this.follow&&(moving||playing)){const to=this.player.position.clone(),delta=to.sub(this.controls.target).multiplyScalar(.08);this.controls.target.add(delta);this.camera.position.add(delta);}
    if(this.firstPerson){this.firstCamera.position.set(this.player.position.x,this.player.position.y+2.05,this.player.position.z);this.firstCamera.lookAt(this.firstCamera.position.clone().add(new T.Vector3(Math.sin(this.firstYaw)*Math.cos(this.firstPitch),Math.sin(this.firstPitch),Math.cos(this.firstYaw)*Math.cos(this.firstPitch))));}
    if(this.dirty>0){const start=performance.now();this.renderer.render(this.scene,this.activeCamera());this.renderSamples.push(performance.now()-start);if(this.renderSamples.length>120)this.renderSamples.shift();this.dirty--;}
    if(time-this.sampleTime>5000&&this.frameSamples.length>60){this.sampleTime=time;const avg=this.frameSamples.reduce((a,b)=>a+b,0)/this.frameSamples.length;if(avg>28&&this.qualityRatio>.7){this.qualityRatio=Math.max(.7,this.qualityRatio-.15);this.renderer.setPixelRatio(this.qualityRatio);this.resize();}}

  };
  diagnostics() {return { peers:this.peers.size,peerPositions:Array.from(this.peers.values()).map(p=>({id:p.frame.id,x:p.mesh.position.x,y:p.mesh.position.y,z:p.mesh.position.z})),fps:this.frameSamples.length?Math.round(1000/(this.frameSamples.reduce((a,b)=>a+b,0)/this.frameSamples.length)):0,renderMs:this.renderSamples.length?this.renderSamples.reduce((a,b)=>a+b,0)/this.renderSamples.length:0,pixelRatio:this.qualityRatio,rooms:this.rooms.length,drawCalls:this.renderer.info.render.calls,triangles:this.renderer.info.render.triangles,geometries:this.renderer.info.memory.geometries,textures:this.renderer.info.memory.textures,player:{x:this.player.position.x,y:this.player.position.y,z:this.player.position.z},cameraTarget:this.controls.target.toArray(),cameraMode:this.cameraMode,activities:this.activities.diagnostics(),firstPerson:this.firstPerson,yaw:this.firstYaw,pitch:this.firstPitch,pathLength:this.walkPath.length,landmarks:LANDMARKS.map(l=>l.id),night:this.night,zoom:this.camera.zoom,editing:this.editRoom };}
  dispose() {
    this.exitActivity();this.disposed=true;cancelAnimationFrame(this.frame);this.observer.disconnect();this.controls.dispose();
    const c=this.renderer.domElement;c.removeEventListener('pointerdown',this.onDown);c.removeEventListener('pointermove',this.onMove);c.removeEventListener('pointerup',this.onUp);c.removeEventListener('pointercancel',this.onCancel);c.removeEventListener('keydown',this.onKeyDown);c.removeEventListener('keyup',this.onKeyUp);c.removeEventListener('blur',this.onBlur);c.removeEventListener('webglcontextlost',this.onContextLost);
    this.groups.forEach(g=>{this.scene.remove(g);disposeGroup(g);});disposeGroup(this.scene);this.scene.traverse(o=>{if(o instanceof T.Sprite){o.material.map?.dispose();o.material.dispose();}if(o instanceof T.Mesh){const mats=Array.isArray(o.material)?o.material:[o.material];mats.forEach(m=>{if(m!==vertexMaterial&&!Array.from(materialCache.values()).includes(m as T.MeshStandardMaterial))m.dispose();});}});this.atlas.dispose();this.labelMaterial.dispose();this.renderer.dispose();c.remove();
  }
}
