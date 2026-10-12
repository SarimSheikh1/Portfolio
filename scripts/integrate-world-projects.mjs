import fs from 'node:fs';
const path='client/src/world.tsx';let text=fs.readFileSync(path,'utf8');
if(!text.includes("import PublicProjects")){
text=text.replace("import './world.css';","import './world.css';\nimport PublicProjects from './PublicProjects';");
const start=text.indexOf('const projects=');const end=text.indexOf('function App()');if(start<0||end<start)throw Error('Project source markers missing');text=text.slice(0,start)+text.slice(end);
text=text.replace("const [modal,setModal]=useState<{project:typeof projects[number];kind:string}|null>(null);",'').replace('const modalRef=useRef<HTMLDialogElement>(null);','');
const effectStart=text.indexOf('useEffect(()=>{if(modal)');const effectEnd=text.indexOf('\nfunction ask',effectStart);if(effectStart<0||effectEnd<0)throw Error('Modal effect marker missing');text=text.slice(0,effectStart)+text.slice(effectEnd);
const sectionStart=text.indexOf('<section id="work"');const sectionEnd=text.indexOf('<section id="services"',sectionStart);if(sectionStart<0||sectionEnd<0)throw Error('Work section marker missing');text=text.slice(0,sectionStart)+'<PublicProjects/>\n'+text.slice(sectionEnd);
const modalStart=text.indexOf('{modal&&<dialog');const rootEnd=text.indexOf('</>}\nconst demo=',modalStart);if(modalStart<0||rootEnd<0)throw Error('Old modal marker missing');text=text.slice(0,modalStart)+'</>}\ncreateRoot(document.getElementById(\'root\')!).render(<React.StrictMode><App/></React.StrictMode>);\n';
text=text.replace("import React, {useEffect, useRef, useState}","import React, {useEffect, useState}");
}
text=text.replace('Explore Selected Work and choose Live demo to test an interactive concept right here. Owner project links will be added when supplied.','Explore My Public Projects and choose Live demo to use a public app here. You can also open the full app in a new tab or view its GitHub source.');
text=text.replace('Yes. Click Live demo in Selected Work to open an interactive concept inside this website. Real owner project links will be added when supplied.','Yes. Browse My Public Projects and click Live demo. Available apps open inside the portfolio when their host permits it, with an Open app link for the full experience.');
text=text.replace('These local concepts give visitors a small, honest taste of an interface.','Public live apps let visitors explore the real experience, with a new-tab option when the host restricts embedding.');
fs.writeFileSync(path,text);
console.log('Real public project gallery integrated.');
