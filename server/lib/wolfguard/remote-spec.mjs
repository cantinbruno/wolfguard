// Desktop input is a finite protocol. It never accepts commands, paths or scripts.
export const FILE_TRANSFER_CAPABILITY='remote-files-v1';
export const REMOTE_LIVE=['requested','preparing','active'];
const named=new Set(['Enter','Escape','Tab','Backspace','Delete','Insert','Home','End','PageUp','PageDown','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Control','Alt','Shift','Meta','CapsLock','ContextMenu',...Array.from({length:12},(_,index)=>'F'+(index+1))]);
export function desktopInput(raw){
  if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new Error('Action de contrôle invalide.');
  if(raw.type==='release')return {type:'release'};
  if(raw.type==='text'){
    if(typeof raw.text!=='string'||!raw.text||raw.text.length>500||/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(raw.text))throw new Error('Texte invalide.');
    return {type:'text',text:raw.text.replace(/\r\n?/g,'\n')};
  }
  if(raw.type==='key'){
    if(typeof raw.down!=='boolean'||typeof raw.key!=='string'||!(named.has(raw.key)||/^(?:Key[A-Z]|Digit[0-9]|Space|Minus|Equal|BracketLeft|BracketRight|Backslash|Semicolon|Quote|Comma|Period|Slash|Backquote)$/.test(raw.key)))throw new Error('Touche invalide.');
    return {type:'key',key:raw.key,down:raw.down};
  }
  if(['move','button','wheel'].includes(raw.type)){
    if(!Number.isFinite(raw.x)||!Number.isFinite(raw.y)||raw.x<0||raw.x>1||raw.y<0||raw.y>1)throw new Error('Position invalide.');
    const event={type:raw.type,x:raw.x,y:raw.y};
    if(raw.type==='button'){
      if(![0,1,2].includes(raw.button)||typeof raw.down!=='boolean')throw new Error('Bouton invalide.');
      return {...event,button:raw.button,down:raw.down};
    }
    if(raw.type==='wheel'){
      if(!Number.isInteger(raw.delta)||Math.abs(raw.delta)>5||!raw.delta)throw new Error('Défilement invalide.');
      return {...event,delta:raw.delta};
    }
    return event;
  }
  throw new Error('Action de contrôle inconnue.');
}
export function desktopFrame(raw){
  if(!raw||!Number.isInteger(raw.width)||!Number.isInteger(raw.height)||raw.width<1||raw.height<1||raw.width>8192||raw.height>8192||typeof raw.jpeg!=='string'||raw.jpeg.length>640000||!/^\/9j\/[a-zA-Z0-9+/]*={0,2}$/.test(raw.jpeg))throw new Error('Image de bureau invalide.');
  return {width:raw.width,height:raw.height,jpeg:raw.jpeg};
}
