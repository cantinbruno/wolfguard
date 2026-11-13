import {canAgent,can} from './permissions.mjs';
export const administrator=(user,now=Date.now())=>user?.role==='admin'||!!(user?.permissions?.admin&&can(user,'agents.read',now));
export async function accessibleAgent(env,user,id,now,action='agents.read'){
  if(!canAgent(user,id,now,action))return false;
  const agent=await env.DB.prepare('SELECT restricted FROM scan_agents WHERE id=?').bind(id).first();
  return !agent?.restricted||administrator(user,now);
}
