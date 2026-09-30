// Collision inset keeps the player's body inside the rendered T-shaped piers.
// Both piers connect to the beach at z=78 and end at z=94.25.
export const WALK_GRID_LIMIT=95;
export function isWalkableGround(x:number,z:number){
  if(!Number.isFinite(x)||!Number.isFinite(z))return false;
  if(Math.abs(x)<=78&&Math.abs(z)<=78)return true;
  const distance=Math.abs(z);
  const bridge=Math.abs(x)<=1.15&&distance>=78&&distance<=93.9;
  const bridgeHead=Math.abs(x)<=3.65&&distance>=92.1&&distance<=93.9;
  return bridge||bridgeHead;
}
