import {useEffect} from 'react';
import {api} from './api';
export default function VisitorActivity(){
 useEffect(()=>{
  let visitor:string;let name='';try{visitor=localStorage.getItem('world-visitor')||sessionStorage.getItem('world-visitor')||crypto.randomUUID();localStorage.setItem('world-visitor',visitor);sessionStorage.setItem('world-visitor',visitor);name=localStorage.getItem('world-visitor-name')||''}catch{visitor=crypto.randomUUID()}
  let stopped=false;let current='Home';let lastEvent='';let queue=api('/session').catch(()=>null);
  const details={browser:navigator.userAgent.slice(0,500),language:navigator.language,timezone:Intl.DateTimeFormat().resolvedOptions().timeZone,screen:`${screen.width} × ${screen.height}`,viewport:`${innerWidth} × ${innerHeight}`,device:matchMedia('(pointer:coarse)').matches?'Touch device':'Desktop',referrer:(()=>{try{return document.referrer?new URL(document.referrer).origin:'Direct visit'}catch{return 'Unknown'}})(),page:location.pathname.slice(0,200)};
  function send(kind:string,target:string){if(stopped)return;if(kind!=='heartbeat'&&lastEvent===kind+target)return;if(kind!=='heartbeat')lastEvent=kind+target;current=target;queue=queue.then(async()=>{if(stopped)return null;const options={method:'POST',body:JSON.stringify({visitor,kind,target,name:name||undefined,details:{...details,viewport:`${innerWidth} × ${innerHeight}`}})};try{return await api('/activity',options)}catch(e){if((e as {status?:number}).status!==403)throw e;await api('/session');return api('/activity',options)}}).catch(()=>null)}
  function renamed(event:Event){name=String((event as CustomEvent).detail||'').trim().slice(0,80);send('heartbeat',current)}
  window.addEventListener('world-visitor-name',renamed);
  send('visit','Home');
  const observer=new IntersectionObserver(entries=>{const visible=entries.filter(e=>e.isIntersecting).sort((a,b)=>b.intersectionRatio-a.intersectionRatio)[0];if(visible&&current!==visible.target.id)send('section',visible.target.id)},{threshold:.35});
  document.querySelectorAll('main section[id]').forEach(section=>observer.observe(section));
  function click(event:MouseEvent){const target=event.target as HTMLElement;const card=target.closest('.project');const action=target.closest('a,button');if(!action)return;if(card){const name=card.getAttribute('data-project')||'Project';send('project',name+' / '+(action.textContent?.trim()||action.getAttribute('aria-label')||'Preview'));return;}if(action instanceof HTMLAnchorElement){const href=action.getAttribute('href')||'';if(href.startsWith('#')&&href.length>1)send('section',href.slice(1));else if(href.startsWith('https://wa.me/'))send('link','WhatsApp contact')}}
  document.addEventListener('click',click);
  const timer=window.setInterval(()=>{if(document.visibilityState==='visible')send('heartbeat',current)},30000);
  return()=>{stopped=true;observer.disconnect();document.removeEventListener('click',click);window.removeEventListener('world-visitor-name',renamed);clearInterval(timer)};
 },[]);
 return null;
}
