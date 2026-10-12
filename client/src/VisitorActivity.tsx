import {useEffect} from 'react';
import {api} from './api';
export default function VisitorActivity(){
 useEffect(()=>{
  let visitor:string;try{visitor=sessionStorage.getItem('world-visitor')||crypto.randomUUID();sessionStorage.setItem('world-visitor',visitor)}catch{visitor=crypto.randomUUID()}
  let stopped=false;let current='Home';let lastEvent='';let queue=api('/session').catch(()=>null);
  function send(kind:string,target:string){if(stopped)return;if(kind!=='heartbeat'&&lastEvent===kind+target)return;if(kind!=='heartbeat')lastEvent=kind+target;current=target;queue=queue.then(async()=>{if(stopped)return null;const options={method:'POST',body:JSON.stringify({visitor,kind,target})};try{return await api('/activity',options)}catch(e){if((e as {status?:number}).status!==403)throw e;await api('/session');return api('/activity',options)}}).catch(()=>null)}
  send('visit','Home');
  const observer=new IntersectionObserver(entries=>{const visible=entries.filter(e=>e.isIntersecting).sort((a,b)=>b.intersectionRatio-a.intersectionRatio)[0];if(visible&&current!==visible.target.id)send('section',visible.target.id)},{threshold:.35});
  document.querySelectorAll('main section[id]').forEach(section=>observer.observe(section));
  function click(event:MouseEvent){const target=event.target as HTMLElement;const card=target.closest('.project');const action=target.closest('a,button');if(!action)return;if(card){const name=card.getAttribute('data-project')||'Project';send('project',name+' / '+(action.textContent?.trim()||action.getAttribute('aria-label')||'Preview'));return;}if(action instanceof HTMLAnchorElement){const href=action.getAttribute('href')||'';if(href.startsWith('#')&&href.length>1)send('section',href.slice(1));else if(href.startsWith('https://wa.me/'))send('link','WhatsApp contact')}}
  document.addEventListener('click',click);
  const timer=window.setInterval(()=>{if(document.visibilityState==='visible')send('heartbeat',current)},30000);
  return()=>{stopped=true;observer.disconnect();document.removeEventListener('click',click);clearInterval(timer)};
 },[]);
 return null;
}
