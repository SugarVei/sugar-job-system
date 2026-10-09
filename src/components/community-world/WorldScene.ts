import * as T from 'three';
import { createRoomShell, createStyledFurniture, createTownShell, createTownFurniture } from './styledRoom';
import { clampFurniture, placementError, furnitureBlocks } from './roomLayout';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { LANDMARKS, createRooms, type Room, type Furniture } from './data';
import { box, cylinder, leaf, mergeStatic, materialCache, vertexMaterial } from './geometry';
import { findWalkPath } from './walkPath';
import { isWalkableGround, WALK_GRID_LIMIT } from './walkableGround';
import { WorldActivities, type ActivityKind, type ActivityStatus } from './WorldActivities';
import { createIslandEnvironment } from './islandEnvironment';
import { CAMERA_PRESETS, DEFAULT_AZIMUTH, MIN_ELEVATION, MAX_ELEVATION, clampElevation, elevationForZoom, shortestAngleDelta, type CameraViewState } from './cameraView';
import { worldPixelRatio, type WorldRenderQuality } from './renderQuality';
import { RenderCadence } from './renderCadence';

import type { PlayerFrame, SharedSeat } from './networkTypes';

type Network = { acquire: (resource:string)=>Promise<number>; release:()=>void };
type Callbacks = { select: (id: string) => void; move: (id: string, x: number, z: number) => void; ready: () => void; error: (message: string) => void; board: () => void; view: (first: boolean) => void; activity: (status:ActivityStatus) => void; cameraView: (state:CameraViewState) => void };
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
  const column=index%10,row=Math.floor(index/10),atlasCanvas=atlas.image as HTMLCanvasElement,cellWidth=atlasCanvas.width/10,cellHeight=atlasCanvas.height/10,padding=cellWidth>=512?2:1;
  atlasCanvas.getContext('2d')!.drawImage(c,column*cellWidth,row*cellHeight,cellWidth,cellHeight);atlas.needsUpdate=true;
  const geometry=new T.PlaneGeometry(6.3,.65),uv=geometry.attributes.uv;
  for(let i=0;i<uv.count;i++)uv.setXY(i,(column*cellWidth+padding+uv.getX(i)*(cellWidth-padding*2))/atlasCanvas.width,1-(row*cellHeight+padding+(1-uv.getY(i))*(cellHeight-padding*2))/atlasCanvas.height);
  const plane=new T.Mesh(geometry,mat);plane.position.set(0,3.08,-2.92);g.add(plane);
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
function furnitureMesh(f:Furniture,color:string,detailed=false) {
  const g=new T.Group();g.userData.furnitureId=f.id;
  if(f.kind!=='art')return detailed?createStyledFurniture(f):createTownFurniture(f);
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
  private renderQuality:WorldRenderQuality='adaptive';
  private highDetail=false;
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
      mesh.position.set(frame.x,frame.y,frame.z);this.scene.add(mesh);mesh.visible=this.environmentRoot.visible;peer={mesh,target:new T.Vector3(),frame,seen:performance.now()};this.peers.set(frame.id,peer);}
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

  private activities:WorldActivities;
  private activityStamp=0;
  private cameraMode:'pan'|'rotate'='pan';
  private autoTilt=true;
  private angleTween:{elevation:number;azimuth?:number}|null=null;
  private applyingCamera=false;
  private controllingCamera=false;
  private previousPolar=0;
  private previousZoom=.15;
  private cameraViewStamp=0;
  private activePointers=new Set<number>();
  private gestureMoved=false;
  private composer:EffectComposer;
  private ao:GTAOPass;
  private bloom:UnrealBloomPass;
  private environment:T.Texture;
  private focusedRoom:string|null=null;
  private lightingStamp='';
  private roomLights=[new T.PointLight('#ffbf71',0,6,2),new T.PointLight('#ffbf71',0,6,2),new T.PointLight('#ffbf71',0,6,2)];
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
  private environmentRoot=new T.Group();
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
  private renderedFrames=0;
  private cadence=new RenderCadence();
  private dirty=40;
  private disposed=false;
  private observer:ResizeObserver;
  private editRoom:string|null=null;
  private down={x:0,y:0};
  private dragging:{object:T.Object3D;room:Room;id:string;pointer:number;offset:T.Vector3;original:T.Vector3}|null=null;
  private waveUntil=0;
  private jumpStart=0;
  private follow=false;
  private targetTween:{to:T.Vector3;zoom:number}|null=null;
  private touchVector={x:0,z:0};
  private night=false;
  private sun=new T.DirectionalLight('#fff4df',2.5);
  private ambient=new T.HemisphereLight('#fffcf0','#b2b2a4',2.4);
  constructor(private host:HTMLElement,private callbacks:Callbacks,quality:WorldRenderQuality='adaptive',enhancedDetails=quality!=='adaptive') {
    this.renderQuality=quality;this.highDetail=enhancedDetails;this.activities=new WorldActivities(this.highDetail);
    this.atlas.colorSpace=T.SRGBColorSpace;this.atlas.generateMipmaps=false;this.atlas.minFilter=T.LinearFilter;this.labelMaterial.userData.sharedAtlas=true;
    this.scene.background=new T.Color('#168b99');
    // The enhanced view uses a high-resolution drawing buffer. Avoid adding
    // a second multisample buffer on top of 4K, especially on integrated GPUs.
    this.renderer=new T.WebGLRenderer({antialias:!this.highDetail,alpha:false,powerPreference:'high-performance'});
    if(this.highDetail){
      const atlasCanvas=this.atlas.image as HTMLCanvasElement;
      const cellWidth=this.renderer.capabilities.maxTextureSize>=5120?512:256;
      atlasCanvas.width=cellWidth*10;atlasCanvas.height=cellWidth/3.2*10;
      this.atlas.generateMipmaps=true;this.atlas.minFilter=T.LinearMipmapLinearFilter;this.atlas.anisotropy=Math.min(8,this.renderer.capabilities.getMaxAnisotropy());
      this.ambient.intensity=1.9;
    }
    this.qualityRatio=Math.min(devicePixelRatio,1);this.renderer.setPixelRatio(this.qualityRatio);
    this.renderer.info.autoReset=false;this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=T.PCFShadowMap;this.renderer.shadowMap.autoUpdate=false;
    this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=this.highDetail?1.03:1.1;
    const canvas=this.renderer.domElement;canvas.tabIndex=0;canvas.setAttribute('aria-label','求职小镇三维地图：拖动平移，右键左右旋转、上下调整高度，滚轮缩放，点击房间查看，WASD 移动人物');
    host.appendChild(canvas);
    this.camera.position.set(130,160,180);this.camera.zoom=.15;this.controls=new OrbitControls(this.camera,canvas);
    this.controls.target.set(0,0,0);this.controls.enableDamping=true;this.controls.dampingFactor=.14;
    this.controls.minZoom=.045;this.controls.maxZoom=2.4;this.controls.minPolarAngle=T.MathUtils.degToRad(90-MAX_ELEVATION);this.controls.maxPolarAngle=T.MathUtils.degToRad(90-MIN_ELEVATION);this.controls.rotateSpeed=.65;
    this.controls.mouseButtons={LEFT:T.MOUSE.PAN,MIDDLE:T.MOUSE.DOLLY,RIGHT:T.MOUSE.ROTATE};
    this.controls.touches={ONE:T.TOUCH.PAN,TWO:T.TOUCH.DOLLY_PAN};this.controls.screenSpacePanning=false;this.controls.zoomToCursor=true;
    this.previousPolar=this.controls.getPolarAngle();
    this.controls.addEventListener('change',this.onCameraChange);this.controls.addEventListener('start',this.onControlStart);this.controls.addEventListener('end',this.onControlEnd);
    this.composer=new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene,this.camera));
    this.ao=new GTAOPass(this.scene,this.camera);this.ao.blendIntensity=.65;
    this.bloom=new UnrealBloomPass(new T.Vector2(1,1),.12,.45,1.1);
    this.composer.addPass(this.ao);this.composer.addPass(this.bloom);this.composer.addPass(new SMAAPass());this.composer.addPass(new OutputPass());
    const generator=new T.PMREMGenerator(this.renderer), environment=new RoomEnvironment();
    this.environment=generator.fromScene(environment,.04).texture;environment.dispose();generator.dispose();
    this.scene.environment=this.environment;this.scene.environmentIntensity=.35;
    this.roomLights.forEach(light=>this.scene.add(light));
    this.scene.add(this.ambient);this.sun.position.set(-100,180,95);this.sun.castShadow=true;this.sun.shadow.mapSize.set(1024,1024);
    Object.assign(this.sun.shadow.camera,{left:-120,right:120,top:120,bottom:-120,near:.5,far:400});this.sun.shadow.normalBias=.035;this.sun.shadow.bias=-.0003;this.sun.shadow.radius=3;this.scene.add(this.sun);
    this.createEnvironment();this.scene.add(this.activities.root);
    if(this.highDetail){
      const anisotropy=Math.min(8,this.renderer.capabilities.getMaxAnisotropy());
      this.scene.traverse(object=>{if(object instanceof T.Mesh||object instanceof T.Sprite){const materials=Array.isArray(object.material)?object.material:[object.material];for(const material of materials){if('map' in material&&material.map instanceof T.Texture)material.map.anisotropy=anisotropy;}}});
      this.sun.shadow.normalBias=.06;this.sun.shadow.radius=2;
    }
    this.player.position.set(0,.2,-2);this.player.scale.setScalar(1.25);this.scene.add(this.player);this.scene.add(this.staticBatch);
    const ring=new T.Mesh(new T.RingGeometry(.56,.72,32),new T.MeshBasicMaterial({color:'#cedd9b',side:T.DoubleSide}));ring.rotation.x=-Math.PI/2;ring.position.y=.03;this.player.add(ring);
    this.player.traverse(o=>{if(o instanceof T.Mesh)o.castShadow=false;});
    const outline=new T.Mesh(new T.BoxGeometry(6.95,.045,6.35),new T.MeshBasicMaterial({color:'#779876'}));outline.position.y=.06;this.selection.add(outline);this.selection.visible=false;this.scene.add(this.selection);
    canvas.addEventListener('pointerdown',this.onDown,true);canvas.addEventListener('pointermove',this.onMove);canvas.addEventListener('pointerup',this.onUp);canvas.addEventListener('pointercancel',this.onCancel);
    canvas.addEventListener('keydown',this.onKeyDown);canvas.addEventListener('keyup',this.onKeyUp);canvas.addEventListener('blur',this.onBlur);window.addEventListener('blur',this.onBlur);canvas.addEventListener('webglcontextlost',this.onContextLost);
    this.observer=new ResizeObserver(this.resize);this.observer.observe(host);this.setRenderQuality(quality);this.overview();this.frame=requestAnimationFrame(this.animate);
  }
  private createEnvironment() {
    const environment=createIslandEnvironment();this.environmentRoot=environment.group;this.scene.add(environment.group);environment.group.updateMatrixWorld(true);environment.group.traverse(o=>{o.matrixAutoUpdate=false;});this.board=environment.board;this.scene.add(this.board);this.obstacles=environment.obstacles;
  }
  setCameraMode(mode:'pan'|'rotate'){this.cameraMode=mode;this.controls.mouseButtons.LEFT=mode==='pan'?T.MOUSE.PAN:T.MOUSE.ROTATE;this.controls.touches.ONE=mode==='pan'?T.TOUCH.PAN:T.TOUCH.ROTATE;}
  setRenderQuality(quality:WorldRenderQuality){
    this.renderQuality=quality;this.sampleTime=performance.now();
    if(quality==='adaptive')this.qualityRatio=Math.min(devicePixelRatio,1);
    const shadowSize=Math.min(quality==='ultra'?4096:quality==='high'?2048:1024,this.renderer.capabilities.maxTextureSize);
    if(this.sun.shadow.mapSize.x!==shadowSize){this.sun.shadow.map?.dispose();this.sun.shadow.map=null;this.sun.shadow.mapSize.set(shadowSize,shadowSize);this.renderer.shadowMap.needsUpdate=true;}
    this.resize();
  }
  private overviewZoom(){return Math.max(this.controls.minZoom,Math.min(.155,this.host.clientWidth/this.host.clientHeight*.09));}
  private elevation(){return 90-T.MathUtils.radToDeg(this.controls.getPolarAngle());}
  private emitCameraView(){this.callbacks.cameraView({elevation:Math.round(this.angleTween?.elevation??this.elevation()),autoTilt:this.autoTilt});}
  private stopCameraMotion(){
    // Flush OrbitControls inertia before starting a preset or reset animation.
    this.applyingCamera=true;this.controls.enableDamping=false;this.controls.update();this.controls.enableDamping=true;this.applyingCamera=false;
    this.targetTween=null;this.angleTween=null;this.follow=false;
  }
  setElevation(elevation:number){
    if(this.firstPerson||!Number.isFinite(elevation))return;
    this.stopCameraMotion();this.autoTilt=false;this.angleTween={elevation:clampElevation(elevation)};this.emitCameraView();this.dirty=30;
  }
  setCameraPreset(preset:keyof typeof CAMERA_PRESETS){this.setElevation(CAMERA_PRESETS[preset]);}
  setAutoTilt(enabled:boolean){
    if(this.firstPerson)return;
    this.autoTilt=enabled;this.angleTween=enabled?{elevation:elevationForZoom(this.camera.zoom,this.overviewZoom())}:null;this.emitCameraView();this.dirty=30;
  }
  private updateCameraAngle(dt:number){
    const zoomChanged=Math.abs(this.camera.zoom-this.previousZoom)>1e-7;
    if(zoomChanged&&this.autoTilt)this.angleTween={...this.angleTween,elevation:elevationForZoom(this.camera.zoom,this.overviewZoom())};
    this.previousZoom=this.camera.zoom;
    if(!this.angleTween)return;
    const target=this.angleTween,offset=this.camera.position.clone().sub(this.controls.target),spherical=new T.Spherical().setFromVector3(offset);
    const phi=T.MathUtils.degToRad(90-target.elevation),thetaDelta=target.azimuth===undefined?0:shortestAngleDelta(spherical.theta,target.azimuth);
    const alpha=1-Math.exp(-dt*12),settled=Math.abs(phi-spherical.phi)<.0002&&Math.abs(thetaDelta)<.0002;
    spherical.phi=settled?phi:T.MathUtils.lerp(spherical.phi,phi,alpha);spherical.theta+=thetaDelta*(settled?1:alpha);
    this.camera.position.copy(this.controls.target).add(offset.setFromSpherical(spherical));
    this.applyingCamera=true;this.controls.update();this.applyingCamera=false;this.dirty=5;
    if(settled)this.angleTween=null;
  }
  goToActivity(kind:ActivityKind){if(this.editRoom)return;this.exitActivity();this.activities.goTo(kind,this.player);this.walkPath=[];this.followPlayer();this.emitActivity();}
  interact(){if(this.editRoom)return;this.walkPath=[];this.jumpStart=0;if(this.activities.active){this.exitActivity();return;}const nearby=this.activities.nearest(this.player.position);if(nearby)void this.enterActivity(nearby.kind,nearby.taxi);else{this.activities.messageToUser('附近没有可互动的项目，请先前往。');this.emitActivity();}}
  activityAction(){this.activities.action(this.player);this.emitActivity();this.renderer.domElement.focus({preventScroll:true});}
  exitActivity(){this.entryEpoch++;if(this.heldLease){this.network?.release();this.heldLease=false;}this.activities.exit(this.player);this.afterActivity();}
  private emitActivity(){const status=this.activities.status(this.player),stamp=JSON.stringify(status);if(stamp!==this.lastActivity){this.lastActivity=stamp;this.callbacks.activity(status);}}
  private afterActivity(){this.keys.clear();this.touchVector={x:0,z:0};this.player.rotation.x=0;if(this.activities.active){this.follow=true;if(!this.firstPerson)this.targetTween={to:this.player.position.clone(),zoom:.7};this.firstYaw=["taxi","yacht","plane"].includes(this.activities.currentMode||"")?this.activities.vehicleHeading:this.player.rotation.y;}else this.followPlayer();this.emitActivity();this.renderer.domElement.focus({preventScroll:true});}
  setFirstPerson(value:boolean) {
    if(value&&this.editRoom)return;
    this.stopCameraMotion();this.firstPerson=value;this.controls.enabled=!value;this.player.visible=!value;this.walkPath=[];this.keys.clear();
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
    root.add(room.id===this.focusedRoom?createRoomShell(room):createTownShell(room));
    textPlane(root,room.occupied?room.name:'这间，留给你',room.occupied?`${room.owner}  ·  ${room.tags.join(' / ')}`:`${room.id}  /  点击领取你的小天地`,room.color,!room.occupied,this.atlas,this.labelMaterial,this.roomIndices.get(room.id)||0);
    for(const f of room.furniture)root.add(furnitureMesh(f,room.color,room.id===this.focusedRoom));
    root.position.set(room.x,0,room.z);this.scene.add(root);this.groups.set(room.id,root);
  }
  setRooms(rooms:Room[]) {
    const old=new Map(this.rooms.map(r=>[r.id,r]));
    let batchChanged=false;
    for(const room of rooms){if(old.get(room.id)===room)continue;if(room.id!==this.editRoom)batchChanged=true;const g=this.groups.get(room.id);if(g){this.scene.remove(g);disposeGroup(g);}this.buildRoom(room);}
    this.rooms=rooms;this.lightingStamp='';if(batchChanged)this.rebatch();this.renderer.shadowMap.needsUpdate=true;this.dirty=30;this.callbacks.ready();
  }
  private rebatch() {
    // Batch each five-room row independently so close views skip distant rows.
    // The editable room stays separate for dragging and ray picking.
    this.staticBatch.traverse(o=>{if(o instanceof T.Mesh)o.geometry.dispose();});this.staticBatch.clear();
    const districts=new Map<string,Map<T.Material,T.BufferGeometry[]>>();
    this.groups.forEach((root,id)=>{
      this.scene.remove(root);root.updateMatrixWorld(true);
      if(id===this.editRoom||id===this.focusedRoom){this.scene.add(root);return;}
      const row=id.slice(0,3),byMaterial=districts.get(row)||new Map<T.Material,T.BufferGeometry[]>();districts.set(row,byMaterial);
      root.traverse(o=>{if(o instanceof T.Mesh&&!Array.isArray(o.material)){
        const geometry=(o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone()).applyMatrix4(o.matrixWorld);const list=byMaterial.get(o.material)||[];list.push(geometry);byMaterial.set(o.material,list);
      }});
    });
    districts.forEach(byMaterial=>byMaterial.forEach((geometries,mat)=>{const merged=mergeGeometries(geometries,false);geometries.forEach(g=>g.dispose());if(merged){const mesh=new T.Mesh(merged,mat);mesh.castShadow=!(mat instanceof T.MeshBasicMaterial);mesh.receiveShadow=true;mesh.updateMatrix();mesh.matrixAutoUpdate=false;this.staticBatch.add(mesh);}}));
  }
  select(id:string|null) {
    const previous=this.focusedRoom;this.focusedRoom=id;
    if(previous!==id){
      for(const roomId of [previous,id]){const r=this.rooms.find(x=>x.id===roomId),g=roomId?this.groups.get(roomId):null;if(r&&g){this.scene.remove(g);disposeGroup(g);this.buildRoom(r);}}
      this.rebatch();this.lightingStamp='';this.renderer.shadowMap.needsUpdate=true;
    }
    const r=this.rooms.find(x=>x.id===id);this.selection.visible=!!r;if(r)this.selection.position.set(r.x,0,r.z);this.dirty=8;
  }
  edit(id:string|null) {if(id){this.exitActivity();this.focus(id);}this.editRoom=id;this.host.classList.toggle('world-editing',!!id);this.rebatch();this.renderer.shadowMap.needsUpdate=true;this.dirty=10;}
  focus(id:string) {if(this.firstPerson)this.setFirstPerson(false);const r=this.rooms.find(x=>x.id===id);if(!r)return;this.follow=false;this.autoTilt=false;this.angleTween={elevation:38};const angle=Math.atan2(this.camera.position.x-this.controls.target.x,this.camera.position.z-this.controls.target.z);const shift=this.host.clientWidth<600?0:1.9;const to=new T.Vector3(r.x+Math.cos(angle)*shift,0,r.z-Math.sin(angle)*shift);if(this.host.clientWidth<600){to.x+=Math.sin(angle)*6.2;to.z+=Math.cos(angle)*6.2;}this.targetTween={to,zoom:this.host.clientWidth<600?.8:2.3};this.select(id);this.dirty=60;}
  overview() {this.select(null);if(this.firstPerson)this.setFirstPerson(false);this.stopCameraMotion();this.autoTilt=true;this.targetTween={to:new T.Vector3(),zoom:this.overviewZoom()};this.angleTween={elevation:CAMERA_PRESETS.oblique,azimuth:DEFAULT_AZIMUTH};this.dirty=60;}
  home() {this.overview();}
  zoom(direction:number) {if(this.firstPerson)return;const zoom=this.targetTween?.zoom??this.camera.zoom;this.targetTween={to:this.controls.target.clone(),zoom:T.MathUtils.clamp(zoom*(direction>0?1.2:1/1.2),this.controls.minZoom,this.controls.maxZoom)};this.follow=false;this.dirty=30;}
  rotate(direction=1) {if(this.firstPerson)return;const azimuth=this.angleTween?.azimuth??this.controls.getAzimuthalAngle();this.stopCameraMotion();this.angleTween={elevation:this.elevation(),azimuth:azimuth+direction*Math.PI/4};this.dirty=30;}
  followPlayer() {this.select(null);if(this.firstPerson){this.renderer.domElement.focus();return;}this.follow=true;this.targetTween={to:this.player.position.clone().setY(0),zoom:1.4};this.dirty=60;this.renderer.domElement.focus({preventScroll:true});}
  wave() {this.waveUntil=performance.now()+2200;this.dirty=180;}
  jump() {if(this.activities.active)return;if(!this.jumpStart)this.jumpStart=performance.now();this.dirty=90;}
  setTouch(x:number,z:number) {this.walkPath=[];this.touchVector={x,z};}
  setNight(night:boolean) {this.night=night;this.ambient.intensity=night?.85:this.highDetail?1.9:2.4;this.sun.intensity=night?1.25:2.5;this.sun.color.set(night?'#bacbff':'#fff4df');this.scene.background=new T.Color(this.firstPerson?'#d6e6dd':night?'#295e69':'#168b99');this.renderer.toneMappingExposure=night?.8:this.highDetail?1.03:1.1;this.dirty=5;}
  private onCameraChange=()=>{
    const polar=this.controls.getPolarAngle();
    // OrbitControls changes its focus-plane behavior below 20 degrees. Use
    // center zoom there to keep a manually chosen low angle stable.
    this.controls.zoomToCursor=polar<=T.MathUtils.degToRad(70);
    if(this.controllingCamera&&!this.applyingCamera&&Math.abs(this.camera.zoom-this.previousZoom)<1e-7&&Math.abs(polar-this.previousPolar)>.0001){this.autoTilt=false;this.angleTween=null;}
    this.previousPolar=polar;this.dirty=12;
  };
  private onControlStart=()=>{this.targetTween=null;this.angleTween=null;this.follow=false;this.controllingCamera=true;};
  private onControlEnd=()=>{this.controllingCamera=false;};
  private resize=()=>{
    const w=this.host.clientWidth,h=this.host.clientHeight;if(!w||!h)return;
    if(this.renderQuality!=='adaptive')this.qualityRatio=worldPixelRatio(this.renderQuality,w,h,devicePixelRatio,this.renderer.capabilities.maxTextureSize);
    this.renderer.setPixelRatio(this.qualityRatio);
    const half=h<500?11.5:13;this.camera.left=-half*w/h;this.camera.right=half*w/h;this.camera.top=half;this.camera.bottom=-half;this.camera.updateProjectionMatrix();this.firstCamera.aspect=w/h;this.firstCamera.updateProjectionMatrix();this.renderer.setSize(w,h);this.composer.setPixelRatio(this.qualityRatio);this.composer.setSize(w,h);this.ao.setSize(Math.max(1,Math.round(w*this.qualityRatio/2)),Math.max(1,Math.round(h*this.qualityRatio/2)));this.dirty=20;
  };
  private ray(e:PointerEvent) {const r=this.renderer.domElement.getBoundingClientRect();this.raycaster.setFromCamera(new T.Vector2((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1),this.activeCamera());}
  private onDown=(e:PointerEvent)=>{
    if(!this.activePointers.size){this.gestureMoved=false;this.down={x:e.clientX,y:e.clientY};}
    this.activePointers.add(e.pointerId);if(this.activePointers.size>1)this.gestureMoved=true;
    this.lastPointer={x:e.clientX,y:e.clientY};this.looking=true;if(e.button!==0)return;
    if(this.firstPerson)this.renderer.domElement.setPointerCapture(e.pointerId);
    this.ray(e);
    if(this.editRoom&&this.cameraMode==='pan'&&!e.ctrlKey&&!e.metaKey&&!e.shiftKey&&this.activePointers.size===1){const room=this.rooms.find(r=>r.id===this.editRoom)!;const g=this.groups.get(room.id)!;
      const hits=this.raycaster.intersectObject(g,true);for(const hit of hits.slice(0,1)){let o:T.Object3D|null=hit.object;while(o&&o!==g){if(o.userData.furnitureId){const p=new T.Vector3();this.raycaster.ray.intersectPlane(this.ground,p);this.dragging={object:o,room,id:o.userData.furnitureId,pointer:e.pointerId,original:o.position.clone(),offset:p.sub(new T.Vector3(room.x+o.position.x,.2,room.z+o.position.z))};this.stopCameraMotion();this.controls.enabled=false;e.stopImmediatePropagation();this.renderer.domElement.setPointerCapture(e.pointerId);return;}o=o.parent;}}
    }
  };
  private onMove=(e:PointerEvent)=>{
    if(this.activePointers.has(e.pointerId)&&Math.hypot(e.clientX-this.down.x,e.clientY-this.down.y)>6)this.gestureMoved=true;
    if(this.firstPerson&&this.looking){this.firstYaw-=(e.clientX-this.lastPointer.x)*.006;this.firstPitch=T.MathUtils.clamp(this.firstPitch-(e.clientY-this.lastPointer.y)*.006,-1.1,1.1);this.lastPointer={x:e.clientX,y:e.clientY};this.dirty=5;return;}
    if(!this.dragging)return;this.ray(e);const point=new T.Vector3();if(!this.raycaster.ray.intersectPlane(this.ground,point))return;
    const {object,room,offset}=this.dragging;point.sub(offset);
    const item=room.furniture.find(f=>f.id===this.dragging!.id)!;const next=clampFurniture({...item,x:Math.round((point.x-room.x)*4)/4,z:Math.round((point.z-room.z)*4)/4});object.position.x=next.x;object.position.z=next.z;
    this.dirty=3;this.renderer.shadowMap.needsUpdate=true;
  };
  private onUp=(e:PointerEvent)=>{
    this.activePointers.delete(e.pointerId);
    this.looking=false;
    if(this.dragging){const {id,object,room,original}=this.dragging;const item=room.furniture.find(f=>f.id===id)!;if(placementError({...item,x:object.position.x,z:object.position.z},room.furniture)){object.position.copy(original);}else{this.callbacks.move(id,object.position.x,object.position.z);}this.dragging=null;this.renderer.shadowMap.needsUpdate=true;this.controls.enabled=!this.firstPerson;return;}
    if(e.button!==0||this.gestureMoved||Math.hypot(e.clientX-this.down.x,e.clientY-this.down.y)>6)return;
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
  private onCancel=(e:PointerEvent)=>{this.activePointers.delete(e.pointerId);this.gestureMoved=true;this.controllingCamera=false;this.looking=false;this.cancelDrag();this.touchVector={x:0,z:0};};
  private cancelDrag(){if(this.dragging){this.dragging.object.position.copy(this.dragging.original);this.dragging=null;this.renderer.shadowMap.needsUpdate=true;this.dirty=5;}this.controls.enabled=!this.firstPerson;}
  private onKeyDown=(e:KeyboardEvent)=>{if(e.code==='KeyF'){e.preventDefault();if(!e.repeat)this.interact();return;}if(e.code==='Space'&&this.activities.active){e.preventDefault();if(!e.repeat)this.activityAction();return;}if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code)){e.preventDefault();this.walkPath=[];this.keys.add(e.code);if(e.code==='Space')this.jump();this.follow=true;}};
  private onKeyUp=(e:KeyboardEvent)=>{this.keys.delete(e.code);};
  private onBlur=()=>{this.cancelDrag();this.keys.clear();this.touchVector={x:0,z:0};this.looking=false;this.activePointers.clear();this.controllingCamera=false;};
  private onContextLost=(e:Event)=>{e.preventDefault();this.callbacks.error('三维画面已暂停，请刷新页面恢复。已保存的房间会保留。');};
  private blocked(x:number,z:number) {
    if(!isWalkableGround(x,z))return true;
    if(this.obstacles.some(o=>Math.abs(x-o.x)<o.w/2+.3&&Math.abs(z-o.z)<o.d/2+.3))return true;
    return this.rooms.some(r=>{
      const dx=x-r.x,dz=z-r.z;
      if(Math.abs(dz+3.02)<.32&&Math.abs(dx)<3.65)return true;
      if(Math.abs(dx-3.32)<.32&&Math.abs(dz)<3.35)return true;
      if(Math.abs(dx+3.32)<.32&&Math.abs(dz)<3.35)return true;
      return furnitureBlocks(r.furniture,dx,dz);
    });
  }
  private animate=(time:number)=>{
    if(this.disposed)return;this.frame=requestAnimationFrame(this.animate);const elapsed=this.cadence.accept(time);if(elapsed===null)return;const dt=Math.min(elapsed/1000,.06);if(elapsed>0&&elapsed<250){this.frameSamples.push(elapsed);if(this.frameSamples.length>120)this.frameSamples.shift();}
    if(document.hidden)return;
    if(!this.firstPerson)this.controls.update();
    let dx=(this.keys.has('KeyD')||this.keys.has('ArrowRight')?1:0)-(this.keys.has('KeyA')||this.keys.has('ArrowLeft')?1:0)+this.touchVector.x;
    let dz=(this.keys.has('KeyS')||this.keys.has('ArrowDown')?1:0)-(this.keys.has('KeyW')||this.keys.has('ArrowUp')?1:0)+this.touchVector.z;
    const oldVehicleHeading=this.activities.vehicleHeading;
    const wasPlaying=this.activities.active;if(!this.inRoomView()||wasPlaying)this.activities.update(dt,this.player,{x:dx,z:dz});
    if(wasPlaying&&!this.activities.active&&this.heldLease){this.network?.release();this.heldLease=false;}
    for(const peer of this.peers.values()){peer.mesh.visible=!this.inRoomView()&&time-peer.seen<15000;peer.mesh.position.lerp(peer.target,1-Math.exp(-dt*14));const delta=Math.atan2(Math.sin(peer.frame.yaw-peer.mesh.rotation.y),Math.cos(peer.frame.yaw-peer.mesh.rotation.y));peer.mesh.rotation.y+=delta*(1-Math.exp(-dt*14));peer.mesh.rotation.z=peer.frame.wave?Math.sin(time*.008)*.08:0;}
    if(this.firstPerson&&['taxi','yacht','plane'].includes(this.activities.currentMode||''))this.firstYaw+=this.activities.vehicleHeading-oldVehicleHeading;
    if(!this.inRoomView())this.dirty=Math.max(this.dirty,2);
    if(time-this.activityStamp>120){this.emitActivity();this.activityStamp=time;}
    const playing=this.activities.active;
    this.player.visible=!this.inRoomView()&&!this.firstPerson&&!['taxi','plane'].includes(this.activities.currentMode||'');
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
    if(this.targetTween){const before=this.controls.target.clone(),target=this.targetTween,alpha=1-Math.exp(-dt*12);this.controls.target.lerp(target.to,alpha);this.camera.zoom=T.MathUtils.lerp(this.camera.zoom,target.zoom,alpha);if(this.controls.target.distanceTo(target.to)<.005&&Math.abs(this.camera.zoom-target.zoom)<.0001){this.controls.target.copy(target.to);this.camera.zoom=target.zoom;this.targetTween=null;}this.camera.position.add(this.controls.target.clone().sub(before));this.camera.updateProjectionMatrix();this.dirty=5;}
    else if(!this.firstPerson&&this.follow&&(moving||playing)){const to=this.player.position.clone(),delta=to.sub(this.controls.target).multiplyScalar(.08);this.controls.target.add(delta);this.camera.position.add(delta);}
    if(!this.firstPerson)this.updateCameraAngle(dt);
    if(time-this.cameraViewStamp>100){this.cameraViewStamp=time;this.emitCameraView();}
    if(this.firstPerson){this.firstCamera.position.set(this.player.position.x,this.player.position.y+2.05,this.player.position.z);this.firstCamera.lookAt(this.firstCamera.position.clone().add(new T.Vector3(Math.sin(this.firstYaw)*Math.cos(this.firstPitch),Math.sin(this.firstPitch),Math.cos(this.firstYaw)*Math.cos(this.firstPitch))));}
    if(this.dirty>0){const start=performance.now();this.renderer.info.reset();this.renderedFrames++;this.syncRoomLighting();if(this.useRoomEffects())this.composer.render();else this.renderer.render(this.scene,this.activeCamera());this.renderSamples.push(performance.now()-start);if(this.renderSamples.length>120)this.renderSamples.shift();this.dirty--;}
    if(this.renderQuality==='adaptive'&&time-this.sampleTime>5000&&this.frameSamples.length>60){this.sampleTime=time;const avg=this.frameSamples.reduce((a,b)=>a+b,0)/this.frameSamples.length;if(avg>28&&this.qualityRatio>.7){this.qualityRatio=Math.max(.7,this.qualityRatio-.15);this.renderer.setPixelRatio(this.qualityRatio);this.resize();}}

  };
  private inRoomView(){return !this.firstPerson&&!!this.focusedRoom&&this.camera.zoom>.65;}
  private useRoomEffects(){return this.inRoomView()&&this.renderQuality!=='adaptive'&&this.host.clientWidth>=700;}
  private syncRoomLighting(){
    const room=this.rooms.find(r=>r.id===this.focusedRoom),close=!!room&&!this.firstPerson&&this.camera.zoom>.65;
    const stamp=`${close?room!.id:'wide'}/${this.night}/${this.renderQuality}`;
    if(stamp===this.lightingStamp)return;this.lightingStamp=stamp;
    const half=close?8:120;
    Object.assign(this.sun.shadow.camera,{left:-half,right:half,top:half,bottom:-half,far:close?70:400});this.sun.shadow.camera.updateProjectionMatrix();
    this.environmentRoot.visible=!close;this.board.visible=!close;this.activities.root.visible=!close;this.staticBatch.visible=!close;
    this.player.visible=!close;this.peers.forEach(peer=>peer.mesh.visible=!close);this.selection.visible=!close&&!!room;
    this.scene.background=new T.Color(close?'#101820':this.night?'#295e69':'#168b99');
    this.sun.target.position.set(close?room!.x:0,0,close?room!.z:0);this.scene.add(this.sun.target);
    this.sun.position.set(close?room!.x-12:-100,close?24:180,close?room!.z-18:95);
    this.ambient.intensity=close?(this.night?.50:1.05):(this.night?.85:this.highDetail?1.9:2.4);
    this.sun.intensity=close?(this.night?.45:3.5):(this.night?1.25:2.5);
    this.renderer.toneMappingExposure=close?.95:this.highDetail?1.03:1.1;
    const lamps=room?.furniture.filter(f=>['lamp','nightstand','desk'].includes(f.kind)).slice(0,3)||[];
    this.roomLights.forEach((light,i)=>{const f=lamps[i];light.intensity=close&&f?(this.night?3.2:1.3):0;if(f)light.position.set(room!.x+f.x,1.35,room!.z+f.z);});
    this.renderer.shadowMap.needsUpdate=true;this.dirty=Math.max(this.dirty,3);
  }
  diagnostics() {const room=this.rooms.find(r=>r.id===this.focusedRoom);return { focusedRoom:room?{id:room.id,style:room.style,furniture:room.furniture.map(f=>{const screen=new T.Vector3(room.x+f.x,.65,room.z+f.z).project(this.activeCamera()),rect=this.renderer.domElement.getBoundingClientRect();return {...f,screen:{x:rect.left+(screen.x+1)*rect.width/2,y:rect.top+(1-screen.y)*rect.height/2}};})}:null, roomStyleRelease:'room-design-v2',roomEffects:this.useRoomEffects(), renderedFrames:this.renderedFrames, peers:this.peers.size,peerPositions:Array.from(this.peers.values()).map(p=>({id:p.frame.id,x:p.mesh.position.x,y:p.mesh.position.y,z:p.mesh.position.z})),fps:this.frameSamples.length?Math.round(1000/(this.frameSamples.reduce((a,b)=>a+b,0)/this.frameSamples.length)):0,renderMs:this.renderSamples.length?this.renderSamples.reduce((a,b)=>a+b,0)/this.renderSamples.length:0,pixelRatio:this.qualityRatio,renderQuality:this.renderQuality,renderSize:[this.renderer.domElement.width,this.renderer.domElement.height],labelAtlas:[this.atlas.image.width,this.atlas.image.height],shadowSize:this.sun.shadow.mapSize.x,rooms:this.rooms.length,drawCalls:this.renderer.info.render.calls,triangles:this.renderer.info.render.triangles,geometries:this.renderer.info.memory.geometries,textures:this.renderer.info.memory.textures,player:{x:this.player.position.x,y:this.player.position.y,z:this.player.position.z},cameraTarget:this.controls.target.toArray(),cameraPosition:this.camera.position.toArray(),elevation:this.elevation(),azimuth:this.controls.getAzimuthalAngle(),autoTilt:this.autoTilt,cameraAnimating:!!(this.targetTween||this.angleTween),cameraMode:this.cameraMode,activities:this.activities.diagnostics(),firstPerson:this.firstPerson,yaw:this.firstYaw,pitch:this.firstPitch,pathLength:this.walkPath.length,landmarks:LANDMARKS.map(l=>l.id),night:this.night,zoom:this.camera.zoom,editing:this.editRoom };}
  dispose() {
    this.exitActivity();this.disposed=true;cancelAnimationFrame(this.frame);this.observer.disconnect();this.controls.dispose();
    const c=this.renderer.domElement;c.removeEventListener('pointerdown',this.onDown,true);c.removeEventListener('pointermove',this.onMove);c.removeEventListener('pointerup',this.onUp);c.removeEventListener('pointercancel',this.onCancel);c.removeEventListener('keydown',this.onKeyDown);c.removeEventListener('keyup',this.onKeyUp);c.removeEventListener('blur',this.onBlur);window.removeEventListener('blur',this.onBlur);c.removeEventListener('webglcontextlost',this.onContextLost);
    this.groups.forEach(g=>{this.scene.remove(g);disposeGroup(g);});disposeGroup(this.scene);this.scene.traverse(o=>{if(o instanceof T.Sprite){o.material.map?.dispose();o.material.dispose();}if(o instanceof T.Mesh){const mats=Array.isArray(o.material)?o.material:[o.material];mats.forEach(m=>{if(m!==vertexMaterial&&!Array.from(materialCache.values()).includes(m as T.MeshLambertMaterial))m.dispose();});}});this.composer.passes.forEach(pass=>pass.dispose());this.composer.dispose();this.environment.dispose();this.atlas.dispose();this.labelMaterial.dispose();this.renderer.dispose();c.remove();
  }
}
