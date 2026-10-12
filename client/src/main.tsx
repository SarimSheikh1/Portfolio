import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  BrowserRouter,
  Link,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import {
  ArrowDown,
  ArrowUpRight,
  ArrowRight,
  Search,
  Command,
  Orbit,
  LayoutGrid,
  List,
  Plus,
  Minus,
  RotateCcw,
  Github,
  Volume2,
  VolumeX,
} from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { Project, PublicResponse } from "../../shared/types";
import { api, loadPublic } from "./api";
import { BrowserPreview, Modal, ProjectCard } from "./components";
import { ownerContact } from "../../shared/curation";
import Admin from "./Admin";
import "./style.css";
gsap.registerPlugin(ScrollTrigger);

const stages = [
  [
    "IDEA",
    "An idea is the starting point. I explore a need, a possibility, or something I want to bring to life.",
  ],
  [
    "AI COLLABORATION",
    "I use AI to brainstorm approaches, refine prompts, and turn a rough idea into a practical direction.",
  ],
  [
    "DEVELOPMENT",
    "With AI as my development partner, I generate and adapt code, connect tools, and build the interface.",
  ],
  [
    "TESTING",
    "I check the real behavior, try different screens and inputs, and compare the result with the original idea.",
  ],
  [
    "IMPROVEMENT",
    "I investigate issues with AI, revise the experience, and keep learning from each iteration.",
  ],
  [
    "LAUNCH",
    "I deploy when the project is ready, share the working result, and return to improve it.",
  ],
];
function App() {
  const location = useLocation();
  const [data, setData] = useState<PublicResponse | null>(null);
  const [error, setError] = useState("");
  const [motion, setMotion] = useState(
    () =>
      localStorage.getItem("motion") !== "off" &&
      !matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  const [command, setCommand] = useState(false);
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  useEffect(() => {
    loadPublic()
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCommand((x) => !x);
      }
    };
    document.addEventListener("keydown", fn);
    return () => document.removeEventListener("keydown", fn);
  }, []);
  useEffect(() => {
    document.documentElement.dataset.motion = motion ? "on" : "off";
    localStorage.setItem("motion", motion ? "on" : "off");
  }, [motion]);
  useEffect(() => {
    if (location.pathname === "/") {
      const slug = sessionStorage.getItem("return-project");
      const target = slug
        ? document.querySelector<HTMLAnchorElement>(
            `[data-project="${CSS.escape(slug)}"]`,
          )
        : null;
      if (target) {
        sessionStorage.removeItem("return-project");
        target.focus({ preventScroll: true });
        target.scrollIntoView({ block: "center", behavior: "instant" });
        return;
      }
    }
    if (!location.hash) window.scrollTo(0, 0);
    const h = document.querySelector("main h1") as HTMLElement;
    h?.focus({ preventScroll: true });
  }, [location.pathname, data]);
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="site-header">
        <Link className="brand" to="/" aria-label="Sarim home">
          SARIM<span>/ DIGITAL STUDIO</span>
        </Link>
        <nav aria-label="Primary navigation">
          <a href="/#work">Work</a>
          <a href="/#about">About</a>
          <a href="/#process">Process</a>
          <Link className="contact-nav" to="/contact">
            Let's talk <ArrowUpRight aria-hidden="true" size={15} />
          </Link>
        </nav>
        <button
          className="command-button"
          onClick={() => setCommand(true)}
          aria-label="Open command palette"
        >
          <Command aria-hidden="true" size={17} />
          <span>K</span>
        </button>
      </header>
      <Routes>
        <Route
          path="/"
          element={<Home data={data} error={error} motion={motion} />}
        />
        <Route
          path="/projects/:slug"
          element={<Detail data={data} error={error} />}
        />
        <Route path="/admin" element={<Admin />} />
        <Route
          path="/contact"
          element={<ContactPage settings={data?.settings} motion={motion} />}
        />
        <Route
          path="*"
          element={
            <main id="main" className="route-message">
              <h1 tabIndex={-1}>Lost in space?</h1>
              <Link to="/">Return to the universe ↗</Link>
            </main>
          }
        />
      </Routes>
      <footer>
        <div className="brand">
          SARIM<span>/ DIGITAL STUDIO</span>
        </div>
        <p>Ideas, made real with AI. From Pakistan.</p>
        <div className="footer-controls">
          <button onClick={() => setMotion(!motion)} aria-pressed={!motion}>
            Motion {motion ? "on" : "off"}
          </button>
          <Audio />
          <Link to="/admin">Owner access ↗</Link>
        </div>
        <small>© {new Date().getFullYear()} Sarim Sheikh</small>
      </footer>
      {command && (
        <Modal title="Explore the studio" close={() => setCommand(false)}>
          <div className="command-palette">
            <label>
              <Search aria-hidden="true" size={18} />
              <input
                autoFocus
                placeholder="Find a project or destination…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
            {[
              "Work",
              "About",
              "Process",
              "Contact",
              "Gallery",
              "List",
              "Galaxy",
              "Toggle motion",
            ]
              .filter((x) => x.toLowerCase().includes(query.toLowerCase()))
              .map((x) => (
                <button
                  key={x}
                  onClick={() => {
                    setCommand(false);
                    if (x === "Toggle motion") setMotion(!motion);
                    else if (["Gallery", "List", "Galaxy"].includes(x)) {
                      navigate(`/?view=${x.toLowerCase()}#work`);
                      setTimeout(
                        () => document.getElementById("work")?.scrollIntoView(),
                        100,
                      );
                    } else {
                      navigate(
                        x === "Contact" ? "/contact" : "/#" + x.toLowerCase(),
                      );
                      setTimeout(
                        () =>
                          document
                            .getElementById(x.toLowerCase())
                            ?.scrollIntoView(),
                        100,
                      );
                    }
                  }}
                >
                  {x}
                  <ArrowUpRight aria-hidden="true" size={17} />
                </button>
              ))}
            {data?.projects
              .filter((p) =>
                `${p.name} ${p.technologies.join(" ")}`
                  .toLowerCase()
                  .includes(query.toLowerCase()),
              )
              .map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    navigate(`/projects/${p.slug}`);
                    setCommand(false);
                  }}
                >
                  {p.name}
                  <span>Project ↗</span>
                </button>
              ))}
            <p className="muted">
              Escape to close · Tab to navigate · Enter to select
            </p>
          </div>
        </Modal>
      )}
    </>
  );
}
function Audio() {
  const [enabled, setEnabled] = useState(false);
  const ref = useRef<AudioContext | null>(null);
  const toggle = () => {
    if (enabled) {
      void ref.current?.close();
      ref.current = null;
      setEnabled(false);
    } else {
      const ctx = new AudioContext();
      const gain = ctx.createGain();
      gain.gain.value = 0.012;
      gain.connect(ctx.destination);
      [110, 164.81, 220].forEach((f) => {
        const osc = ctx.createOscillator();
        osc.frequency.value = f;
        osc.type = "sine";
        osc.connect(gain);
        osc.start();
      });
      ref.current = ctx;
      setEnabled(true);
    }
  };
  useEffect(() => {
    const pause = () => {
      if (document.hidden) void ref.current?.suspend();
      else if (ref.current) void ref.current.resume();
    };
    document.addEventListener("visibilitychange", pause);
    return () => {
      document.removeEventListener("visibilitychange", pause);
      void ref.current?.close();
    };
  }, []);
  return (
    <button onClick={toggle} aria-pressed={enabled}>
      {enabled ? (
        <Volume2 aria-hidden="true" size={15} />
      ) : (
        <VolumeX aria-hidden="true" size={15} />
      )}{" "}
      Audio {enabled ? "on" : "off"}
    </button>
  );
}
function Home({
  data,
  error,
  motion,
}: {
  data: PublicResponse | null;
  error: string;
  motion: boolean;
}) {
  const ref = useRef<HTMLElement>(null);
  const [stage, setStage] = useState(0);
  const [story, setStory] = useState(false);
  const [params, setParams] = useSearchParams();
  const query = params.get("q") || "";
  const category = params.get("category") || "";
  const tech = params.get("tech") || "";
  const platform = params.get("platform") || "";
  const view = params.get("view") === "list" ? "list" : "gallery";
  const rows = data?.projects || [];
  const showcase = rows.filter(
    (p) =>
      p.deployments.length &&
      p.status === "reachable" &&
      p.desktop?.source === "capture",
  );
  const filtered = rows.filter(
    (p) =>
      (!query ||
        `${p.name} ${p.description}`
          .toLowerCase()
          .includes(query.toLowerCase())) &&
      (!category || p.category === category) &&
      (!tech || p.technologies.includes(tech)) &&
      (!platform || p.platform === platform) &&
      (!params.has("featured") || p.featured > 0),
  );
  const update = (key: string, value: string) =>
    setParams(
      (old) => {
        const n = new URLSearchParams(old);
        value ? n.set(key, value) : n.delete(key);
        return n;
      },
      { preventScrollReset: true },
    );
  useEffect(() => {
    if (!motion) return;
    const ctx = gsap.context(() => {
      gsap.from(".hero-line", {
        x: -90,
        opacity: 0,
        stagger: 0.12,
        duration: 0.9,
        ease: "power3.out",
      });
      gsap.utils.toArray<HTMLElement>(".reveal").forEach((el) =>
        gsap.from(el, {
          x: -55,
          opacity: 0,
          duration: 0.7,
          scrollTrigger: { trigger: el, start: "top 93%", once: true },
        }),
      );
      gsap.utils
        .toArray<HTMLElement>(".project-card")
        .forEach((card, index) => {
          const travel = matchMedia("(max-width: 767px)").matches ? 35 : 110;
          gsap
            .timeline({
              scrollTrigger: {
                trigger: card,
                start: "top bottom",
                end: "bottom top",
                scrub: 0.65,
              },
            })
            .fromTo(
              card,
              { x: index % 2 ? travel : -travel, opacity: 0.12 },
              { x: 0, opacity: 1, duration: 0.25, ease: "none" },
            )
            .to(card, { x: 0, opacity: 1, duration: 0.5 })
            .to(card, {
              x: index % 2 ? -travel : travel,
              opacity: 0.12,
              duration: 0.25,
              ease: "none",
            });
        });
    }, ref);
    return () => ctx.revert();
  }, [motion, story, data, view, query, category, tech, platform]);
  useEffect(() => {
    if (location.hash) {
      setTimeout(
        () => document.querySelector(location.hash)?.scrollIntoView(),
        100,
      );
    }
  }, []);
  return (
    <main id="main" ref={ref} className={story ? "story-mode" : ""}>
      <section className="hero">
        <div className="hero-top">
          <span className="eyebrow">
            <span className="status-dot" /> AI-POWERED DIGITAL CREATOR
          </span>
          <span className="eyebrow">BASED IN PAKISTAN / OPEN TO IDEAS</span>
        </div>
        <div className="hero-content">
          <div className="hero-copy">
            <p className="eyebrow hero-line">INDEPENDENT DIGITAL CREATOR</p>
            <h1 tabIndex={-1}>
              <span className="hero-line">Small ideas.</span>
              <span className="hero-line idea-word">
                Real impact<span className="orange-dot">.</span>
              </span>
              <span className="hero-line bottom-line">
                Built with curiosity & AI.
              </span>
            </h1>
            <div className="hero-bottom">
              <p>
                Hi, I'm Sarim Sheikh — an AI-Powered Digital Creator who
                transforms ideas into websites, applications, and interactive
                digital experiences.
              </p>
              <a href="#work" className="primary">
                Explore my work <ArrowDown aria-hidden="true" size={18} />
              </a>
            </div>
          </div>
          <div className="studio-showcase hero-line">
            <div className="showcase-label">
              <span className="status-dot" /> LIVE WORK / REAL EXPERIENCES
            </div>
            {showcase[0]?.desktop && (
              <a
                className="showcase-main"
                href={showcase[0].deployments[0]}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Open ${showcase[0].name} live project`}
              >
                <img
                  src={showcase[0].desktop.thumbnail}
                  alt={showcase[0].desktop.alt}
                />
                <span>
                  {showcase[0].name.replaceAll("-", " ")}{" "}
                  <ArrowUpRight size={20} />
                </span>
              </a>
            )}
            {showcase[1]?.desktop && (
              <a
                className="showcase-mini"
                href={showcase[1].deployments[0]}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Open ${showcase[1].name} live project`}
              >
                <img
                  src={showcase[1].desktop.thumbnail}
                  alt={showcase[1].desktop.alt}
                />
                <span>
                  Designed to be explored <ArrowUpRight size={16} />
                </span>
              </a>
            )}
            <div className="showcase-stamp">
              IDEA
              <br />
              TO LIVE<span>↗</span>
            </div>
            <p className="showcase-note">
              A little curiosity. A lot of making.
            </p>
          </div>
        </div>
        <div className="hero-baseline">
          <span>
            SCROLL TO DISCOVER <ArrowDown aria-hidden="true" size={13} />
          </span>
          <span>EXPERIMENT. BUILD. REPEAT.</span>
          <button onClick={() => setStory(!story)} aria-pressed={story}>
            Story mode {story ? "on" : "off"} ↗
          </button>
        </div>
      </section>
      <div className="marquee" aria-hidden="true">
        <span>IDEAS INTO REALITY</span>
        <i>✳</i>
        <span>HUMAN CURIOSITY</span>
        <i>✳</i>
        <span>AI POSSIBILITIES</span>
        <i>✳</i>
      </div>
      <section id="work" className="work-section section">
        <div className="section-heading reveal">
          <div>
            <p className="eyebrow">01 / SELECTED PROJECTS</p>
            <h2>
              Made to explore.
              <br />
              <em>Worth discovering.</em>
            </h2>
          </div>
          <div className="section-aside">
            <p>
              Websites, games, and useful tools. Open a live project or explore
              its source, and see the work for yourself.
            </p>
            <span className="eyebrow">
              {rows.length.toString().padStart(2, "0")} PUBLISHED /{" "}
              {showcase.length} LIVE PROJECTS
            </span>
          </div>
        </div>
        <div className="explorer-controls">
          <label className="search">
            <Search aria-hidden="true" size={18} />
            <input
              placeholder="Find a project…"
              value={query}
              onChange={(e) => update("q", e.target.value)}
              aria-label="Search projects"
            />
          </label>
          <div className="view-controls" aria-label="Project view">
            {[
              ["gallery", LayoutGrid],
              ["list", List],
            ].map(([v, Icon]) => (
              <button
                key={v as string}
                aria-pressed={view === v}
                onClick={() => update("view", v as string)}
              >
                <Icon aria-hidden="true" size={16} />
                <span>{v as string}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="filter-row">
          <label>
            Category
            <select
              value={category}
              onChange={(e) => update("category", e.target.value)}
            >
              <option value="">All categories</option>
              {[...new Set(rows.map((p) => p.category))].map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </label>
          <label>
            Technology
            <select
              value={tech}
              onChange={(e) => update("tech", e.target.value)}
            >
              <option value="">All technologies</option>
              {[...new Set(rows.flatMap((p) => p.technologies))]
                .sort()
                .map((x) => (
                  <option key={x}>{x}</option>
                ))}
            </select>
          </label>
          <label>
            Platform
            <select
              value={platform}
              onChange={(e) => update("platform", e.target.value)}
            >
              <option value="">All platforms</option>
              {[...new Set(rows.map((p) => p.platform))].map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </label>
          <button
            aria-pressed={params.has("featured")}
            onClick={() =>
              update("featured", params.has("featured") ? "" : "1")
            }
          >
            Featured only ✳
          </button>
          {(query ||
            category ||
            tech ||
            platform ||
            params.has("featured")) && (
            <button
              onClick={() => setParams(view === "gallery" ? {} : { view })}
            >
              Clear filters
            </button>
          )}
        </div>
        {error ? (
          <div className="empty-state">
            <h3>Connection interrupted.</h3>
            <p>{error}</p>
            <button onClick={() => location.reload()}>Try again</button>
          </div>
        ) : !data ? (
          <div className="empty-state" role="status">
            <h3>Locating the projects…</h3>
          </div>
        ) : !filtered.length ? (
          <div className="empty-state">
            <div className="empty-orbit">✳</div>
            <h3>
              {rows.length
                ? "No projects in this orbit."
                : "The next idea is taking shape."}
            </h3>
            <p>
              {rows.length
                ? "Try a different search or clear the filters."
                : data.sourceStatus}
            </p>
            <a
              href="https://github.com/SarimSheikh1?tab=repositories"
              target="_blank"
              rel="noopener noreferrer"
              className="text-link"
            >
              Explore public repositories{" "}
              <ArrowUpRight aria-hidden="true" size={17} />
            </a>
          </div>
        ) : (
          <>
            <p className="eyebrow results-count">
              {filtered.length} PROJECTS IN VIEW
            </p>
            {
              <div
                className={`project-grid ${view === "list" ? "list-view" : ""}`}
              >
                {filtered.map((p, i) => (
                  <ProjectCard
                    key={p.id}
                    project={p}
                    index={i}
                    list={view === "list"}
                  />
                ))}
              </div>
            }
          </>
        )}
      </section>
      <section id="about" className="about-section section">
        <div className="about-title reveal">
          <p className="eyebrow">03 / THE HUMAN BEHIND THE IDEAS</p>
          <h2>
            Curiosity is
            <br />
            my <em>source code.</em>
          </h2>
          <div className="about-symbol" aria-hidden="true">
            ✳
          </div>
        </div>
        <div className="about-copy reveal">
          <p className="eyebrow">SARIM SHEIKH / PAKISTAN</p>
          <h3>I turn ideas into reality using AI.</h3>
          <p>
            I believe you don't need to master every programming language to
            start creating. I use AI as my development partner to explore ideas,
            generate code, solve problems, and build digital projects. Every
            project is an opportunity to experiment, learn, and create something
            new.
          </p>
          <a
            href="https://github.com/SarimSheikh1"
            target="_blank"
            rel="noopener noreferrer"
            className="text-link"
          >
            Follow the experiments <Github aria-hidden="true" size={18} />
          </a>
          <div className="honest-note">
            HUMAN DIRECTION. AI COLLABORATION. REAL CREATION.
          </div>
        </div>
      </section>
      <section id="process" className="process-section section">
        <div className="section-heading reveal">
          <div>
            <p className="eyebrow">04 / THE IDEA MACHINE</p>
            <h2>
              From a spark
              <br />
              to something <em>real.</em>
            </h2>
          </div>
          <p className="section-aside">
            Six stages. A lot of curiosity.
            <br />
            AI as a development partner.
          </p>
        </div>
        <div
          className="process-track"
          role="group"
          aria-label="Creation process"
        >
          {stages.map(([title], i) => (
            <button
              key={title}
              aria-pressed={i === stage}
              onClick={() => setStage(i)}
            >
              <span className="stage-number">0{i + 1}</span>
              <strong>{title}</strong>
              <svg viewBox="0 0 100 20" aria-hidden="true">
                <path d="M0 10 H88 M80 3 L89 10 L80 17" />
              </svg>
            </button>
          ))}
        </div>
        <div className="stage-detail" aria-live="polite">
          <span className="stage-big">0{stage + 1}</span>
          <div>
            <p className="eyebrow">CURRENT STAGE / {stages[stage][0]}</p>
            <p>{stages[stage][1]}</p>
          </div>
          <button
            aria-label="Next process stage"
            onClick={() => setStage((stage + 1) % 6)}
          >
            <ArrowRight aria-hidden="true" size={25} />
          </button>
        </div>
      </section>
      <section className="dna-section section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">05 / DIGITAL DNA</p>
            <h2>
              The tools behind
              <br />
              the <em>possibilities.</em>
            </h2>
          </div>
          <p className="section-aside">
            TECHNOLOGIES BEHIND MY PROJECTS
            <br />
            <span className="muted">
              Repository evidence, never proficiency scores.
            </span>
          </p>
        </div>
        <div className="dna-tools">
          {[...new Set(rows.flatMap((p) => p.technologies))].length ? (
            [...new Set(rows.flatMap((p) => p.technologies))].map((t, i) => (
              <a
                key={t}
                href={`/?tech=${encodeURIComponent(t)}#work`}
                className={`tool tool-${i % 3}`}
              >
                <span>+</span>
                {t}
                <small>
                  {rows.filter((p) => p.technologies.includes(t)).length}{" "}
                  projects ↗
                </small>
              </a>
            ))
          ) : (
            <p className="muted">
              Project relationships appear after verified metadata is published.
              AI assistance is part of my process; tool usage is recorded per
              project.
            </p>
          )}
        </div>
      </section>
      <Contact settings={data?.settings} />
    </main>
  );
}
function ContactPage({
  settings,
  motion,
}: {
  settings?: PublicResponse["settings"];
  motion: boolean;
}) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!motion) return;
    const context = gsap.context(() => {
      gsap.from(".contact-page-heading>*", {
        x: -65,
        opacity: 0,
        stagger: 0.1,
        duration: 0.8,
        ease: "power3.out",
      });
      gsap.from(".contact-form", {
        x: 65,
        opacity: 0,
        duration: 0.9,
        delay: 0.15,
        ease: "power3.out",
      });
    }, ref);
    return () => context.revert();
  }, [motion]);
  return (
    <main id="main" className="contact-page" ref={ref}>
      <div className="contact-page-heading section">
        <Link className="text-link" to="/">
          ← Back to the studio
        </Link>
        <p className="eyebrow">SARIM SHEIKH / START A CONVERSATION</p>
        <h1 tabIndex={-1}>
          Your next idea.
          <br />
          <em>Our next conversation.</em>
        </h1>
        <p>
          Websites, applications, experiments—tell me what you have in mind.
        </p>
      </div>
      <Contact settings={settings} />
    </main>
  );
}
function Contact({ settings }: { settings?: PublicResponse["settings"] }) {
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <section id="contact" className="contact-section section">
      <div className="contact-copy reveal">
        <p className="eyebrow">LET’S START SOMETHING</p>
        <h2>
          Got an idea?
          <br />
          Let's give it
          <br />
          <em>something real.</em>
          <span className="orange-dot">↗</span>
        </h2>
        <p>
          A question, a possibility, a wild idea.
          <br />
          It all starts with a conversation.
        </p>
        <div className="contact-direct">
          <a href={`mailto:${settings?.email || ownerContact.email}`}>
            <span>EMAIL / WRITE TO ME</span>
            <strong>{settings?.email || ownerContact.email}</strong>
            <ArrowUpRight aria-hidden="true" size={22} />
          </a>
          <a
            href={`tel:${(settings?.phone || ownerContact.phone)!.replace(/[^+\d]/g, "")}`}
          >
            <span>PHONE / LET'S TALK</span>
            <strong>{settings?.phone || ownerContact.phone}</strong>
            <ArrowUpRight aria-hidden="true" size={22} />
          </a>
          <a
            href="https://wa.me/923228668488"
            target="_blank"
            rel="noopener noreferrer"
          >
            <span>WHATSAPP / OPEN A CHAT</span>
            <strong>Say hello on WhatsApp</strong>
            <ArrowUpRight aria-hidden="true" size={22} />
          </a>
        </div>
        <div className="socials">
          <a
            href="https://github.com/SarimSheikh1"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub ↗
          </a>
          {settings?.instagram && (
            <a
              href={settings.instagram}
              target="_blank"
              rel="noopener noreferrer"
            >
              Instagram ↗
            </a>
          )}
          {settings?.linkedin && (
            <a
              href={settings.linkedin}
              target="_blank"
              rel="noopener noreferrer"
            >
              LinkedIn ↗
            </a>
          )}
          {settings?.creator && (
            <a
              href={settings.creator}
              target="_blank"
              rel="noopener noreferrer"
            >
              Creator profile ↗
            </a>
          )}
          {settings?.email && <a href={`mailto:${settings.email}`}>Email ↗</a>}
        </div>
      </div>
      <form
        className="contact-form"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setStatus("");
          const f = e.currentTarget;
          const d = new FormData(f);
          try {
            const result = await api("/contact", {
              method: "POST",
              body: JSON.stringify(Object.fromEntries(d)),
            });
            setStatus(
              result.mailStatus === "delivered"
                ? "Your inquiry was saved and the email notification was delivered."
                : result.mailStatus === "failed"
                  ? "Your inquiry was saved. The email notification failed; Sarim can still read it in admin."
                  : "Your inquiry was saved for Sarim. Email notifications are not configured.",
            );
            f.reset();
          } catch (e) {
            setStatus((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <span className="eyebrow">SEND A NOTE / START A CONVERSATION</span>
        <label>
          Your name
          <input
            name="name"
            required
            minLength={2}
            maxLength={100}
            placeholder="How should I call you?"
            autoComplete="name"
          />
        </label>
        <label>
          Email address
          <input
            name="email"
            type="email"
            required
            maxLength={254}
            placeholder="Where can I reach you?"
            autoComplete="email"
          />
        </label>
        <label>
          The idea
          <textarea
            name="message"
            required
            minLength={10}
            maxLength={5000}
            rows={4}
            placeholder="Tell me what's on your mind…"
          />
        </label>
        <label className="honeypot" aria-hidden="true">
          Website
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
        <button className="primary" disabled={busy}>
          {busy ? "Saving inquiry…" : "Send an idea"}
          <ArrowUpRight aria-hidden="true" size={18} />
        </button>
        <p role="status" className="form-status">
          {status}
        </p>
        <small>Your message is stored only when the server confirms it.</small>
      </form>
    </section>
  );
}
function Detail({
  data,
  error,
}: {
  data: PublicResponse | null;
  error: string;
}) {
  const { slug } = useParams();
  const p = data?.projects.find((p) => p.slug === slug);
  if (!p)
    return (
      <main id="main" className="route-message">
        <h1 tabIndex={-1}>
          {error
            ? "Connection interrupted"
            : data
              ? "Project not found"
              : "Locating project…"}
        </h1>
        <Link to={sessionStorage.getItem("explorer-url") || "/#work"}>
          Return to explorer ↗
        </Link>
      </main>
    );
  return (
    <main id="main" className="detail section">
      <Link
        className="text-link"
        to={sessionStorage.getItem("explorer-url") || "/#work"}
      >
        ← Return to explorer
      </Link>
      <div className="detail-heading">
        <p className="eyebrow">
          {p.category} / {p.platform}
        </p>
        <h1 tabIndex={-1}>
          {p.name}
          <span className="orange-dot">.</span>
        </h1>
        <p>{p.description}</p>
        <div className="chips">
          {p.technologies.map((t) => (
            <span key={t}>{t}</span>
          ))}
        </div>
        <div className="detail-links">
          {p.deployments.map((url, i) => (
            <a
              className="primary"
              key={url}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
            >
              {i ? "Alternate deployment" : "Open Live Site"}
              <ArrowUpRight aria-hidden="true" size={18} />
            </a>
          ))}
          {p.repository && (
            <a
              className="outline-button"
              href={p.repository}
              target="_blank"
              rel="noopener noreferrer"
            >
              View repository <Github aria-hidden="true" size={18} />
            </a>
          )}
        </div>
      </div>
      <BrowserPreview project={p} />
      <div className="detail-body">
        <div>
          <p className="eyebrow">THE IDEA / WHAT WAS BUILT</p>
          <h2>Behind the interface.</h2>
          <p>
            {p.overview ||
              "An owner-written overview has not been supplied. The repository provides the available project evidence."}
          </p>
          <h3>AI-assisted workflow</h3>
          <p>
            Sarim uses AI as a development partner to explore ideas, generate
            and adapt code, debug, test, and improve digital projects. A
            project-specific process account has not been supplied.
          </p>
          <h3>Features and evidence</h3>
          {p.features.length ? (
            <ul>
              {p.features.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          ) : (
            <p>
              No features have been independently behavior-tested in this
              portfolio. Repository documentation is available below.
            </p>
          )}
          {p.readme && (
            <details>
              <summary>Repository README · documented, not tested</summary>
              <pre className="readme">{p.readme}</pre>
            </details>
          )}
        </div>
        <aside>
          <p className="eyebrow">PROJECT RECORD</p>
          <dl>
            <dt>Verification</dt>
            <dd>{p.verified ? "Public source verified" : "Pending review"}</dd>
            <dt>Availability</dt>
            <dd>{p.status}</dd>
            <dt>Source updated</dt>
            <dd>{new Date(p.updatedAt).toLocaleDateString()}</dd>
            <dt>Last checked</dt>
            <dd>
              {p.checkedAt
                ? new Date(p.checkedAt).toLocaleDateString()
                : "Not checked"}
            </dd>
            <dt>Technology evidence</dt>
            <dd>{p.provenance.technologies || "Owner-confirmed metadata"}</dd>
            {p.fork && (
              <>
                <dt>Repository type</dt>
                <dd>Fork</dd>
              </>
            )}
            {p.archived && (
              <>
                <dt>Archived</dt>
                <dd>Yes</dd>
              </>
            )}
          </dl>
        </aside>
      </div>
      <h3 className="eyebrow">MORE LIVE WORK</h3>
      <div className="project-grid">
        {data?.projects
          .filter((x) => x.id !== p.id)
          .slice(0, 2)
          .map((x, i) => (
            <ProjectCard project={x} index={i} key={x.id} />
          ))}
      </div>
    </main>
  );
}
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
import "./studio.css";
