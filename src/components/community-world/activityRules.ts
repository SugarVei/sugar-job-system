export const FLIGHT_ALTITUDE=38;
export const EXPLORATION_LIMIT=210;
export const TAXI_CAPACITY=4;
export type Point2={x:number;z:number};
export function reserveSeat(passengers:string[],id:string):string[]|null {
  if(passengers.includes(id))return passengers;
  return passengers.length<TAXI_CAPACITY?[...passengers,id]:null;
}
export function seaPositionAllowed(p:Point2,boats:Point2[]=[]) {
  return Math.abs(p.x)<=EXPLORATION_LIMIT&&Math.abs(p.z)<=EXPLORATION_LIMIT
    &&(Math.abs(p.x)>=89||Math.abs(p.z)>=98)
    &&boats.every(b=>Math.hypot(b.x-p.x,b.z-p.z)>=8);
}
export function seaMovementAllowed(from:Point2,to:Point2,boats:Point2[]=[]) {
  const steps=Math.max(1,Math.ceil(Math.hypot(to.x-from.x,to.z-from.z)/.5));
  for(let i=1;i<=steps;i++)if(!seaPositionAllowed({x:from.x+(to.x-from.x)*i/steps,z:from.z+(to.z-from.z)*i/steps},boats))return false;
  return true;
}
export function flightPositionAllowed(p:Point2){return Math.abs(p.x)<=EXPLORATION_LIMIT&&Math.abs(p.z)<=EXPLORATION_LIMIT;}
export function taxiRoute(distance:number,extent:number){
  const side=extent*2,total=side*4,d=((distance%total)+total)%total;
  if(d<side)return{x:-extent+d,z:-extent,yaw:Math.PI/2};
  if(d<side*2)return{x:extent,z:-extent+d-side,yaw:0};
  if(d<side*3)return{x:extent-(d-side*2),z:extent,yaw:-Math.PI/2};
  return{x:-extent,z:extent-(d-side*3),yaw:Math.PI};
}
