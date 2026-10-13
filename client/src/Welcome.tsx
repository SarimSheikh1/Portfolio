import {useEffect, useRef, useState} from 'react';
import {ArrowRight, Sparkles} from 'lucide-react';

export default function Welcome() {
  const prompted = useRef(false);
  const [name, setName] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [closed, setClosed] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (!leaving) return;
    const timer = window.setTimeout(() => setClosed(true), 650);
    return () => window.clearTimeout(timer);
  }, [leaving]);

  useEffect(() => {
    // Defer until the page paints; cleanup also prevents StrictMode's double prompt.
    const timer = window.setTimeout(() => {
      if (prompted.current) return;
      prompted.current = true;
      const answer = window.prompt('Whats Your BeautiFul Name');
      if (answer?.trim()) setName(answer.trim().slice(0, 80));
    }, 250);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (closed) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setLeaving(true);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKey);
    };
  }, [closed]);

  if (closed) return null;
  return <div className={`welcome-overlay${name !== null ? ' welcome-celebrate' : ''}${leaving ? ' welcome-leaving' : ''}`} role="dialog" aria-modal="true" aria-labelledby="welcome-title" aria-describedby="welcome-name">
    <div className="welcome-aurora" aria-hidden="true"><i/><i/><i/></div>
    <div className="welcome-grid" aria-hidden="true"/>
    {name !== null && <div className="welcome-burst" aria-hidden="true">{Array.from({length:24}, (_, i) => <i key={i} style={{'--ray':i} as React.CSSProperties}/>)}</div>}
    <div className="welcome-orbit" aria-hidden="true"/>
    <div className="welcome-orbit welcome-orbit-second" aria-hidden="true"/>
    <div className="welcome-particles" aria-hidden="true">{Array.from({length: 18}, (_, i) => <i key={i} style={{'--particle': i} as React.CSSProperties}/>)}</div>
    <div className="welcome-card" key={name === null ? 'asking' : 'greeting'}>
      <span className="welcome-emblem"><Sparkles size={34}/></span>
      {name === null ? <form className="welcome-form" onSubmit={event => {event.preventDefault();setName(draft.trim().slice(0, 80) || 'Guest');}}>
        <h2 id="welcome-title">Whats Your<br/><span>BeautiFul Name</span></h2>
        <p id="welcome-name" className="welcome-caption">Let’s make your welcome personal.</p>
        <input autoFocus aria-label="Your beautiful name" placeholder="Enter your name" autoComplete="given-name" maxLength={80} value={draft} onChange={event => setDraft(event.target.value)}/>
        <button className="button" type="submit">Continue <ArrowRight size={18}/></button>
      </form> : <>
      <p id="welcome-name" className="welcome-name">Hello, {name}!</p>
      <h2 id="welcome-title">Welcome to<br/><span>World Agentic</span></h2>
      <p className="welcome-caption">Your next great idea starts here.</p>
      <button autoFocus className="button" disabled={leaving} onClick={() => setLeaving(true)}>Let’s explore <ArrowRight size={18}/></button>
      </>}
    </div>
  </div>;
}
