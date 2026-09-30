import * as T from 'three';
import { box, cylinder, material, mergeStatic } from './geometry';
import { FLIGHT_ALTITUDE, reserveSeat, seaMovementAllowed, flightPositionAllowed, taxiRoute } from './activityRules';

export type ActivityKind='wheel'|'swing'|'slide'|'football'|'badminton'|'basketball'|'taxi'|'yacht'|'plane';
export const ACTIVITIES:{id:ActivityKind;name:string;description:string}[]=[
  {id:'wheel',name:'摩天轮',description:'乘坐观景 · 可切换第一人称'},
  {id:'swing',name:'秋千',description:'按空格加力 · 随秋千摆动'},
  {id:'slide',name:'滑滑梯',description:'登上平台 · 沿滑道滑下'},
  {id:'football',name:'足球',description:'带球移动 · 空格射门'},
  {id:'badminton',name:'羽毛球',description:'与练习机对打 · 看准时机挥拍'},
  {id:'basketball',name:'篮球',description:'绿色区间投篮 · 挑战命中率'},
  {id:'taxi',name:'出租车',description:'5 辆环岛巡游 · 每辆限 4 位乘客'},
  {id:'yacht',name:'游艇',description:'海上驾驶 · 避让船只与岸线'},
  {id:'plane',name:'观光飞机',description:'固定 38 米高度 · 限定空域'},
];
export type ActivityStatus={mode:ActivityKind|null;name:string;hint:string;nearby:string;action:string;score:number;attempts:number;speed:number;meter:number;seats:number;message:string};
export const EMPTY_ACTIVITY:ActivityStatus={mode:null,name:'自由探索',hint:'靠近设施或出租车，按 F 互动',nearby:'',action:'',score:0,attempts:0,speed:0,meter:0,seats:0,message:''};
type Taxi={mesh:T.Group;distance:number;extent:number;passengers:string[]};
const entrances:Record<ActivityKind,T.Vector3>={wheel:new T.Vector3(-7,.2,49),swing:new T.Vector3(10,.2,43),slide:new T.Vector3(13,.2,53),football:new T.Vector3(-11,.2,-46),badminton:new T.Vector3(54,.2,11),basketball:new T.Vector3(52,.2,-10),taxi:new T.Vector3(19,.2,23),yacht:new T.Vector3(0,.2,93),plane:new T.Vector3(73,.2,-65)};
function marker(g:T.Group,text:string,x:number,y:number,z:number,color='#456c58'){
  const c=document.createElement('canvas');c.width=512;c.height=128;const ctx=c.getContext('2d')!;ctx.fillStyle='#faf6e7';ctx.fillRect(0,0,512,128);ctx.fillStyle=color;ctx.textAlign='center';ctx.font='bold 44px "Microsoft YaHei"';ctx.fillText(text,256,80,485);
  const texture=new T.CanvasTexture(c);texture.colorSpace=T.SRGBColorSpace;const sprite=new T.Sprite(new T.SpriteMaterial({map:texture,depthTest:true}));sprite.position.set(x,y,z);sprite.scale.set(7,1.75,1);g.add(sprite);
}
function taxiMesh(){const g=new T.Group();box(g,2.2,.8,4.1,0,.85,0,'#e2be64');box(g,1.9,.82,2.25,0,1.6,-.15,'#edce7d');box(g,1.7,.54,.06,0,1.68,1,'#a4cbd0');box(g,1.7,.54,.06,0,1.68,-1.29,'#a4cbd0');for(const x of [-.97,.97])box(g,.035,.53,1.94,x,1.68,-.15,'#a4cbd0');box(g,.9,.3,.45,0,2.16,0,'#fdf5da');for(const x of [-1.06,1.06])for(const z of [-1.25,1.25]){const w=cylinder(g,.4,.22,x,.47,z,'#495550');w.rotation.z=Math.PI/2;}for(const x of [-.72,.72])box(g,.45,.2,.05,x,.96,2.07,'#fff1b2');mergeStatic(g);return g;}
function boatMesh(small=false){const g=new T.Group();box(g,small?2.1:3.5,.65,small?4:7,0,0,0,'#f4eddb');box(g,small?1.8:3,.18,small?3.7:6.6,0,.42,0,'#cfb991');if(small){box(g,.1,5,.1,0,2.6,0,'#c2b397');const sail=new T.Mesh(new T.ConeGeometry(1.4,3.4,3),material('#eadfbe'));sail.scale.z=.05;sail.position.set(.55,3,0);g.add(sail);}else{box(g,2.1,1,2.8,0,.98,-.6,'#f4f1e6');box(g,1.85,.6,.08,0,1.26,.85,'#92bdc2');box(g,2.25,.14,2.9,0,1.6,-.6,'#dfcba5');for(const x of [-1.4,1.4])box(g,.06,.6,5.6,x,.75,0,'#e8ecdf');}mergeStatic(g);return g;}
function planeMesh(){const g=new T.Group();box(g,1.5,1.2,7,0,0,0,'#efe9d9');box(g,10,.18,1.8,0,0,.4,'#d5b774');box(g,4.8,.13,1,0,.1,-2.7,'#d5b774');box(g,.18,1.7,1.4,0,.8,-2.8,'#a4bbb6');box(g,1.15,.55,1.55,0,.75,1,'#a2c4c8');const prop=box(g,3,.15,.12,0,0,3.62,'#687a73');prop.name='propeller';mergeStatic(g);return g;}

export class WorldActivities {
  readonly root=new T.Group();
  private targets=new Map<ActivityKind,T.Object3D[]>();
  private wheel=new T.Group();private cabins:T.Group[]=[];private swing=new T.Group();
  private wheelAngle=Math.PI;private swingAngle=0;private swingPower=.5;
  private taxis:Taxi[]=[];private yacht=boatMesh();private boats:T.Group[]=[];private planes:T.Group[]=[];
  private ball=new T.Mesh(new T.IcosahedronGeometry(.38,1),material('#f4eedc'));
  private shuttle=new T.Mesh(new T.ConeGeometry(.23,.55,6),material('#fff3d6'));
  private basketball=new T.Mesh(new T.SphereGeometry(.35,12,8),material('#c99562'));
  private racket=new T.Group();private aiRacket=new T.Group();
  private ballVelocity=new T.Vector3();private elapsed=0;private time=0;private shot=0;private shotHit=false;
  private mode:ActivityKind|null=null;private taxiIndex=0;private speed=0;private heading=0;
  private score=0;private attempts=0;private rally=0;private rallyLive=false;private message='';private messageUntil=0;
  constructor(){
    const wheelBase=new T.Group();wheelBase.position.set(-7,0,44);
    for(const x of [-4,4]){const leg=box(wheelBase,.3,7,.35,x/2,3.5,0,'#c7b18e');leg.rotation.z=x<0?-.5:.5;}
    const rim=new T.Mesh(new T.TorusGeometry(5,.13,6,48),material('#d6b891'));this.wheel.add(rim);
    for(let i=0;i<8;i++){const a=i*Math.PI/4;const spoke=box(this.wheel,.1,5,.1,Math.sin(a)*2.5,Math.cos(a)*2.5,0,'#ded0ae');spoke.rotation.z=-a;const cabin=new T.Group();box(cabin,1.6,.5,1.4,0,-.5,0,['#b9cba7','#c4b8cc','#d9bba1'][i%3]);box(cabin,1.75,.12,1.5,0,1.4,0,'#eee4c9');box(cabin,1.45,.1,1.1,0,-.15,0,'#ded1b9');for(const dx of [-.7,.7])box(cabin,.06,1.7,.06,dx,.5,0,'#9d9e8d');mergeStatic(cabin);this.cabins.push(cabin);wheelBase.add(cabin);}
    this.wheel.position.y=7;wheelBase.add(this.wheel);this.register('wheel',wheelBase);marker(wheelBase,'摩天轮 · F',0,14,0);
    const frame=new T.Group();frame.position.set(10,0,39);for(const x of [-3.5,3.5])for(const z of [-1,1]){const pole=box(frame,.15,3.7,.15,x,1.8,z,'#a99a78');pole.rotation.x=z*.28;}box(frame,7.3,.18,.18,0,3.6,0,'#b5a17e');
    this.swing.position.set(-1.7,3.6,0);for(const dx of [-.48,.48])box(this.swing,.035,2.7,.035,dx,-1.35,0,'#788e7f');box(this.swing,1.3,.16,.8,0,-2.7,0,'#d3b49d');frame.add(this.swing);for(const dx of [-.48,.48])box(frame,.035,2.7,.035,1.7+dx,2.25,0,'#788e7f');box(frame,1.3,.16,.8,1.7,.9,0,'#d3b49d');this.register('swing',frame);marker(frame,'秋千 · F',0,5.5,0);
    const slide=new T.Group();slide.position.set(10,0,53);box(slide,2.5,.2,2.3,0,2.4,0,'#d1bb9e');for(const x of [-1,1])for(const z of [-.8,.8])box(slide,.12,2.4,.12,x,1.2,z,'#a2b19a');const ramp=box(slide,1.5,.12,5.5,0,1.35,3.5,'#acc5b5');ramp.rotation.x=.43;for(const x of [-.8,.8]){const rail=box(slide,.1,.42,5.5,x,1.6,3.5,'#d6c5a1');rail.rotation.x=.43;}for(let i=0;i<6;i++)box(slide,1.6,.13,.38,2.5-i*.3,.25+i*.43,0,'#d4c4a1');this.register('slide',slide);marker(slide,'滑滑梯 · F',0,5,0);
    this.ball.position.set(-8,.5,-46);this.register('football',this.ball);
    this.shuttle.position.set(46,2,11);this.register('badminton',this.shuttle);
    for(const r of [this.racket,this.aiRacket]){const rim=new T.Mesh(new T.TorusGeometry(.42,.035,5,16),material('#d9b57d'));r.add(rim);box(r,.055,.65,.06,0,-.7,0,'#7b8f76');this.root.add(r);}this.racket.position.set(54,1.6,11);this.aiRacket.position.set(38,1.6,11);
    this.basketball.position.set(52,.6,-10);this.register('basketball',this.basketball);
    for(let i=0;i<5;i++){const mesh=taxiMesh();mesh.userData.taxi=i;this.register('taxi',mesh);this.taxis.push({mesh,extent:i<3?69:23,distance:i<3?i*184:(i-3)*92,passengers:[]});}
    this.yacht.position.set(8,-.35,102);this.register('yacht',this.yacht);
    for(let i=0;i<3;i++){const boat=boatMesh(true);this.boats.push(boat);this.root.add(boat);}
    for(let i=0;i<2;i++){const plane=planeMesh();this.planes.push(plane);this.register('plane',plane);}
    const dock=new T.Group();cylinder(dock,.8,.05,0,.07,93,'#d1bd8b');marker(dock,'游艇码头 · F',0,4,93);this.register('yacht',dock);
    const terminal=new T.Group();cylinder(terminal,2.7,.09,73,.06,-65,'#c7d4bb');box(terminal,2,2,.15,73,1.1,-67,'#adbea2');marker(terminal,'观光登机点 · F',73,4.2,-65);this.register('plane',terminal);
    // Static shadows are cached by the scene; moving props must not leave frozen shadows behind.
    this.root.traverse(o=>{if(o instanceof T.Mesh)o.castShadow=false;});
  }
  private register(kind:ActivityKind,object:T.Object3D){object.userData.activity=kind;this.root.add(object);this.targets.set(kind,[...(this.targets.get(kind)||[]),object]);}
  get active(){return this.mode!==null;}
  get seated(){return !!this.mode&&['wheel','swing','taxi','yacht','plane','slide'].includes(this.mode);}
  get vehicleHeading(){return this.mode==='taxi'?this.taxis[this.taxiIndex].mesh.rotation.y:this.heading;}
  get currentMode(){return this.mode;}
  hit(ray:T.Raycaster){const h=ray.intersectObjects([...this.targets.values()].flat(),true)[0];if(!h)return null;let o:T.Object3D|null=h.object;while(o){if(o.userData.activity)return{kind:o.userData.activity as ActivityKind,taxi:o.userData.taxi as number|undefined,distance:h.distance};o=o.parent;}return null;}
  private notify(text:string){this.message=text;this.messageUntil=this.time+4;}
  nearest(player:T.Vector3){let kind:ActivityKind|null=null,min=8,taxi:number|undefined;for(const item of ACTIVITIES){if(item.id==='taxi')continue;const d=entrances[item.id].distanceTo(player);if(d<min){min=d;kind=item.id;}}this.taxis.forEach((t,i)=>{const d=t.mesh.position.distanceTo(player);if(d<min){min=d;kind='taxi';taxi=i;}});return kind?{kind,taxi}:null;}
  goTo(kind:ActivityKind,player:T.Object3D){this.exit(player);if(kind==='taxi'){const t=this.taxis[0].mesh;player.position.copy(t.position);if(Math.abs(t.position.x)>65)player.position.x-=Math.sign(t.position.x)*4;else player.position.z-=Math.sign(t.position.z)*4;}else player.position.copy(entrances[kind]);this.notify('已到达，按 F 或点击“开始体验”。');}
  enter(kind:ActivityKind,player:T.Object3D,taxi?:number){
    if(this.active){this.notify('请先退出当前项目。');return false;}
    if(kind==='taxi'){
      const index=taxi??this.taxis.reduce((best,t,i)=>t.mesh.position.distanceTo(player.position)<this.taxis[best].mesh.position.distanceTo(player.position)?i:best,0);
      const t=this.taxis[index];if(t.mesh.position.distanceTo(player.position)>8){this.notify('出租车距离太远，请在路边等车靠近。');return false;}
      const seats=reserveSeat(t.passengers,'local-player');if(!seats){this.notify('这辆车已经满员，最多 4 位乘客。');return false;}t.passengers=seats;this.taxiIndex=index;
    }else if(player.position.distanceTo(entrances[kind])>10){this.notify('先靠近设施，或从“玩乐出行”选择前往。');return false;}
    this.mode=kind;this.elapsed=0;this.score=0;this.attempts=0;this.shot=0;this.rallyLive=false;this.heading=0;this.speed=0;
    if(kind==='wheel')this.wheelAngle=Math.PI;
    if(kind==='football'){player.position.set(-11,.2,-46);this.ball.position.set(-8,.5,-46);this.ballVelocity.set(0,0,0);player.rotation.y=Math.PI/2;}
    if(kind==='badminton')player.position.copy(entrances.badminton);
    if(kind==='basketball')player.position.copy(entrances.basketball);
    if(kind==='plane'){this.planes[0].position.set(73,FLIGHT_ALTITUDE,-65);this.heading=Math.PI;this.speed=12;}
    if(kind==='yacht'){this.yacht.position.set(8,-.35,102);this.heading=Math.PI/2;}
    this.notify(`${ACTIVITIES.find(a=>a.id===kind)!.name}体验已开始`);return true;
  }
  interact(player:T.Object3D){if(this.active){this.exit(player);return;}const n=this.nearest(player.position);if(n)this.enter(n.kind,player,n.taxi);else this.notify('附近没有可互动的项目，打开“玩乐出行”前往。');}
  exit(player:T.Object3D){
    if(!this.mode)return;const old=this.mode;
    if(old==='taxi'){const t=this.taxis[this.taxiIndex];t.passengers=t.passengers.filter(p=>p!=='local-player');const p=t.mesh.position;player.position.set(p.x,.2,p.z);if(Math.abs(p.x)>=t.extent-.1)player.position.x+=Math.sign(p.x)*4;else player.position.z+=Math.sign(p.z)*4;}
    else player.position.copy(entrances[old]);
    if(old==='yacht'){this.yacht.position.set(8,-.35,102);this.yacht.rotation.y=0;}
    this.mode=null;this.speed=0;this.shot=0;this.ballVelocity.set(0,0,0);this.rallyLive=false;player.rotation.set(0,0,0);this.notify(old==='plane'?'已返回登机点':old==='yacht'?'已返回码头并下船':'已安全退出');
  }
  action(player:T.Object3D){
    if(this.mode==='swing'){this.swingPower=Math.min(1.05,this.swingPower+.16);this.notify('加力！');}
    if(this.mode==='football'){if(player.position.distanceTo(this.ball.position)>3.2){this.notify('靠近足球后再射门');return;}this.ballVelocity.set(Math.sin(player.rotation.y)*19,0,Math.cos(player.rotation.y)*19);this.attempts++;this.notify('射门！');}
    if(this.mode==='badminton'){
      if(!this.rallyLive){this.rally=0;this.rallyLive=true;this.notify('准备接球，羽毛球接近你时挥拍');}
      else if(this.rally>=1.65&&this.rally<=2.45){this.rally=-1;this.score++;this.notify('好球！连续回球 +1');}
      else{this.notify('挥拍过早，看准羽毛球落点');}
    }
    if(this.mode==='basketball'&&!this.shot){this.shot=.001;this.attempts++;this.shotHit=this.meter()>.68&&this.meter()<.9;this.notify(this.shotHit?'出手节奏不错！':'出手！下次看准绿色区间');}
  }
  private meter(){return(this.time*.62)%1;}
  update(dt:number,player:T.Object3D,input:{x:number;z:number}){
    this.time+=dt;this.elapsed+=dt;
    this.wheelAngle+=dt*.17;this.wheel.rotation.z=-this.wheelAngle;
    this.cabins.forEach((c,i)=>{const a=this.wheelAngle+i*Math.PI/4;c.position.set(Math.sin(a)*5,7+Math.cos(a)*5,0);});
    this.swingPower=Math.max(.35,this.swingPower-dt*.015);this.swingAngle=Math.sin(this.time*1.6)*this.swingPower;this.swing.rotation.x=this.swingAngle;
    this.taxis.forEach(t=>{t.distance+=dt*6;const p=taxiRoute(t.distance,t.extent);t.mesh.position.set(p.x,0,p.z);t.mesh.rotation.y=p.yaw;});
    this.boats.forEach((b,i)=>{const a=this.time*.05+i*2,center=[[-125,0],[125,-70],[0,150]][i],p=new T.Vector3(center[0]+Math.sin(a)*18,-.4,center[1]+Math.cos(a)*18);if(p.distanceTo(this.yacht.position)>9){b.position.copy(p);b.rotation.y=a+Math.PI/2;}});
    this.planes.forEach((p,i)=>{if(i===0&&this.mode==='plane')return;const a=this.time*.06+i*Math.PI;p.position.set(Math.sin(a)*140,FLIGHT_ALTITUDE,Math.cos(a)*140);p.rotation.y=a+Math.PI/2;});
    if(this.mode==='wheel'){const a=this.wheelAngle;player.position.set(-7+Math.sin(a)*5,7+Math.cos(a)*5-.95,44);player.rotation.y=0;}
    if(this.mode==='swing'){player.position.set(8.3,3.6-3.5*Math.cos(this.swingAngle),39-3.5*Math.sin(this.swingAngle));player.rotation.x=this.swingAngle;}
    if(this.mode==='slide'){const t=this.elapsed;player.rotation.y=0;if(t<2){player.position.set(13-t*1.5,.2+t*1.1,53);}else{const u=Math.min(1,(t-2)/2.3);player.position.set(10,2.4-u*2.2,53+u*6);}if(t>4.5){this.exit(player);this.notify('滑到底啦，再来一次？');}}
    if(this.mode==='taxi'){const t=this.taxis[this.taxiIndex],seat=Math.max(0,t.passengers.indexOf('local-player')),offsets=[[-.52,.55],[.52,.55],[-.52,-.65],[.52,-.65]],p=new T.Vector3(offsets[seat][0],.85,offsets[seat][1]).applyAxisAngle(new T.Vector3(0,1,0),t.mesh.rotation.y).add(t.mesh.position);player.position.copy(p);player.rotation.y=t.mesh.rotation.y;}
    if(this.mode==='yacht'||this.mode==='plane'){
      const flying=this.mode==='plane',max=flying?25:14,min=flying?6:-4;
      this.speed=T.MathUtils.clamp(this.speed-input.z*dt*(flying?8:6),min,max);
      if(!input.z&&!flying)this.speed*=Math.exp(-dt*.4);
      this.heading-=input.x*dt*(flying?.7:1.1)*(this.speed<0?-1:1);
      const mesh=flying?this.planes[0]:this.yacht,from=mesh.position,to=from.clone().add(new T.Vector3(Math.sin(this.heading),0,Math.cos(this.heading)).multiplyScalar(this.speed*dt));
      const allowed=flying?flightPositionAllowed(to):seaMovementAllowed(from,to,this.boats.map(b=>b.position));
      if(allowed)mesh.position.copy(to);else{this.speed=flying?6:0;if(flying)this.heading=Math.atan2(-from.x,-from.z);this.notify(flying?'已到空域边界，自动转向岛屿':'前方为岸线、船只或海域边界，已停船');}
      mesh.position.y=flying?FLIGHT_ALTITUDE:-.35;mesh.rotation.y=this.heading;
      player.position.copy(mesh.position).add(new T.Vector3(0,flying?.9:.55,flying?1.1:1.5).applyAxisAngle(new T.Vector3(0,1,0),this.heading));player.rotation.y=this.heading;
    }
    if(this.mode==='football'){
      const vx=input.x*dt*6,vz=input.z*dt*6;player.position.x=T.MathUtils.clamp(player.position.x+vx,-16,16);player.position.z=T.MathUtils.clamp(player.position.z+vz,-58,-34);if(vx||vz)player.rotation.y=Math.atan2(vx,vz);
      if(this.ballVelocity.length()<1&&player.position.distanceTo(this.ball.position)<1.7&&(vx||vz)){this.ball.position.x=player.position.x+Math.sin(player.rotation.y)*1.2;this.ball.position.z=player.position.z+Math.cos(player.rotation.y)*1.2;}
      this.ball.position.addScaledVector(this.ballVelocity,dt);this.ballVelocity.multiplyScalar(Math.exp(-dt*.6));this.ball.rotation.z-=this.ballVelocity.x*dt;
      if(Math.abs(this.ball.position.x)>17){if(Math.abs(this.ball.position.z+46)<3){this.score++;this.notify('进球！');this.ball.position.set(-8,.5,-46);player.position.set(-11,.2,-46);this.ballVelocity.set(0,0,0);}else{this.ball.position.x=T.MathUtils.clamp(this.ball.position.x,-17,17);this.ballVelocity.x*=-.7;}}
      if(this.ball.position.z<-59||this.ball.position.z>-33){this.ball.position.z=T.MathUtils.clamp(this.ball.position.z,-59,-33);this.ballVelocity.z*=-.7;}
    }
    if(this.mode==='badminton'){
      if(this.rallyLive){this.rally+=dt;const u=this.rally<0?-this.rally:Math.min(1,this.rally/2.2);this.shuttle.position.set(38+16*u,1.5+Math.sin(u*Math.PI)*4,11);if(this.rally>2.45){this.rallyLive=false;this.attempts++;this.notify('这次没接住，点击发球再来');}}
      this.racket.rotation.z=Math.sin(this.time*7)*.12;this.aiRacket.rotation.z=Math.sin(this.time*4)*.4;
    }
    if(this.mode==='basketball'&&this.shot){this.shot+=dt;const u=Math.min(1,this.shot/1.5);this.basketball.position.set(52+7.9*u,1.6+1.4*u+Math.sin(u*Math.PI)*4,-10+(this.shotHit?0:2.5)*u);if(u>=1){if(this.shotHit){this.score++;this.notify('空心入网！');}else this.notify('差一点，再试一次');this.shot=0;this.basketball.position.set(52,.6,-10);}}
  }
  status(player:T.Object3D):ActivityStatus{
    const n=this.nearest(player.position),a=ACTIVITIES.find(a=>a.id===(this.mode||n?.kind));
    const actions:Partial<Record<ActivityKind,string>>={swing:'加力摆荡',football:'射门',badminton:this.rallyLive?'挥拍':'发球',basketball:'投篮'};
    const hints:Partial<Record<ActivityKind,string>>={wheel:'正在乘坐 · 切换第一人称欣赏风景',swing:'空格加力 · 第一人称随秋千摆动',slide:'自动爬上平台，然后滑下',football:'方向键带球 · 靠近球按空格射门',badminton:'羽毛球靠近右侧时按空格回球',basketball:'进度进入绿色区间时按空格投篮',taxi:'自动沿街巡游 · F 下车 · 4 个乘客座位',yacht:'W/S 加速/减速 · A/D 转向 · F 返回码头',plane:'W/S 调整速度 · A/D 转向 · 高度固定 38 m'};
    return{mode:this.mode,name:this.mode?a!.name:'自由探索',hint:this.mode?hints[this.mode]!:EMPTY_ACTIVITY.hint,nearby:!this.mode&&a?a.name:'',action:this.mode?actions[this.mode]||'':'',score:this.score,attempts:this.attempts,speed:Math.round(this.speed*3.6),meter:this.mode==='basketball'?this.meter():this.mode==='badminton'?T.MathUtils.clamp(this.rally/2.2,0,1):0,seats:this.mode==='taxi'?this.taxis[this.taxiIndex].passengers.length:0,message:this.time<this.messageUntil?this.message:''};
  }
  diagnostics(){return{mode:this.mode,taxis:this.taxis.map(t=>({x:t.mesh.position.x,z:t.mesh.position.z,passengers:t.passengers.length,capacity:4})),yacht:this.yacht.position.toArray(),boats:this.boats.map(b=>b.position.toArray()),planes:this.planes.map(p=>p.position.toArray()),wheelAngle:this.wheelAngle,swingAngle:this.swingAngle,score:this.score,attempts:this.attempts,speed:this.speed};}
}
