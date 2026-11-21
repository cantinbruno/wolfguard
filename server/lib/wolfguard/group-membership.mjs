// Accounts belong to groups; groups can themselves belong to resource groups.
// Parent rights flow to every direct or indirect member of a child group.
export function directGroupIds(state,userId){
  return Array.isArray(state.memberships?.[userId])?state.memberships[userId]:typeof state.members?.[userId]==='string'&&state.members[userId]!=='default'?[state.members[userId]]:[];
}
export function groupClosure(state,ids){
  const known=new Set(state.groups.map(group=>group.id)),result=new Set(ids.filter(id=>known.has(id))),pending=[...result],parents=new Map();
  for(const group of state.groups)for(const child of group.includedGroupIds||[]){if(!parents.has(child))parents.set(child,[]);parents.get(child).push(group.id);}
  while(pending.length)for(const parent of parents.get(pending.pop())||[])if(!result.has(parent)){result.add(parent);pending.push(parent);}
  return [...result];
}
export const effectiveGroupIds=(state,userId)=>groupClosure(state,directGroupIds(state,userId));
export function validateGroupNesting(state){
  const groups=new Map(state.groups.map(group=>[group.id,group])),visiting=new Set(),done=new Map();
  function visit(id){
    if(visiting.has(id))throw new Error('Un groupe ne peut pas devenir membre de lui-même, même indirectement.');
    if(done.has(id))return done.get(id);
    const group=groups.get(id);if(!group)throw new Error('Un groupe inclus est introuvable.');
    const children=group.includedGroupIds||[];
    if(!Array.isArray(children)||children.length>256||new Set(children).size!==children.length)throw new Error('Liste de groupes inclus invalide.');
    visiting.add(id);const depth=1+Math.max(0,...children.map(visit));visiting.delete(id);
    if(depth>32)throw new Error('Maximum 32 niveaux de groupes imbriqués.');
    done.set(id,depth);return depth;
  }
  for(const id of groups.keys())visit(id);
}
