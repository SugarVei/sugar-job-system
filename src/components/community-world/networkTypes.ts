export type SharedSeat = { user_id: string; session_id: string; resource: string; seat: number; expires_at: string };
export type PlayerFrame = { id: string; userId: string; name: string; x: number; y: number; z: number; yaw: number; wave: boolean; mode: string | null; vehicle?: number[]; props?: number[][]; seq: number };
export function validPlayerFrame(value: unknown): value is PlayerFrame {
  if (!value || typeof value !== 'object') return false;
  const p = value as PlayerFrame;
  return typeof p.id === 'string' && p.id.length <= 64 && typeof p.userId === 'string' && typeof p.name === 'string' && p.name.length <= 24
    && [p.x,p.y,p.z,p.yaw,p.seq].every(Number.isFinite) && Math.abs(p.x)<=220 && Math.abs(p.z)<=220 && p.y>=-5 && p.y<=45
    && typeof p.wave==='boolean' && Number.isSafeInteger(p.seq) && p.seq>=0
    && (p.mode===null||['wheel','swing','slide','football','badminton','basketball','taxi','yacht','plane'].includes(p.mode))
    && (!p.vehicle || (Array.isArray(p.vehicle) && p.vehicle.length===4 && p.vehicle.every(Number.isFinite) && Math.abs(p.vehicle[0])<=220 && Math.abs(p.vehicle[2])<=220 && p.vehicle[1]>=-5 && p.vehicle[1]<=40))
    && (!p.props || (Array.isArray(p.props) && p.props.length<=3 && p.props.every(v=>Array.isArray(v)&&v.length===3&&v.every(n=>Number.isFinite(n)&&Math.abs(n)<=220))));
}
