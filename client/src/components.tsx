import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, Maximize2, X, Monitor, Smartphone } from "lucide-react";
import type { Project } from "../../shared/types";
import { mediaURL } from "./api";
export function Modal({
  title,
  close,
  children,
}: {
  title: string;
  close: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement;
    const dialog = ref.current!;
    dialog.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      dialog.close();
      document.body.style.overflow = "";
      prev?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
      aria-label={title}
    >
      <div className="modal-head">
        <span>{title}</span>
        <button onClick={close} aria-label="Close dialog">
          <X aria-hidden="true" size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function BrowserPreview({
  project,
  small = false,
}: {
  project: Project;
  small?: boolean;
}) {
  const [mode, setMode] = useState<"desktop" | "mobile">("desktop");
  const [zoom, setZoom] = useState(false);
  const [live, setLive] = useState(false);
  const preview = project[mode];
  let host = "Repository project";
  try {
    host = new URL(project.deployments[0] || project.repository || "").host;
  } catch {}
  return (
    <div className={`browser-preview ${mode} ${small ? "small" : ""}`}>
      <div className="browser-chrome">
        <span className="traffic">
          <i />
          <i />
          <i />
        </span>
        <span className="browser-host">{host}</span>
        {!small && project.deployments[0] && (
          <a
            href={project.deployments[0]}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Open ${project.name} live site`}
          >
            <ArrowUpRight aria-hidden="true" size={16} />
          </a>
        )}
      </div>
      {!small && (
        <div className="preview-tabs" role="group" aria-label="Preview device">
          {(["desktop", "mobile"] as const).map((m) => (
            <button
              key={m}
              aria-pressed={mode === m}
              onClick={() => {
                setMode(m);
                setLive(false);
              }}
            >
              {m === "desktop" ? (
                <Monitor aria-hidden="true" size={16} />
              ) : (
                <Smartphone aria-hidden="true" size={16} />
              )}{" "}
              {m}
            </button>
          ))}
          <span>Captured preview</span>
        </div>
      )}
      {preview ? (
        <button
          className="screenshot"
          onClick={() => setZoom(true)}
          aria-label={`Enlarge ${project.name} ${mode} preview`}
        >
          <img
            src={mediaURL(small ? preview.thumbnail : preview.url)}
            width={preview.width}
            height={preview.height}
            alt={preview.alt}
            loading="lazy"
          />
          <span className="zoom-hint">
            <Maximize2 aria-hidden="true" size={16} /> Enlarge
          </span>
        </button>
      ) : (
        <div className="no-preview">
          <Monitor aria-hidden="true" size={30} />
          <strong>Preview not available</strong>
          <span>
            {small
              ? "Genuine interface capture pending."
              : "Upload or capture a genuine " + mode + " screenshot in admin."}
          </span>
        </div>
      )}
      {!small && (
        <div className="preview-caption">
          {preview
            ? `${preview.source === "capture" ? "Live homepage captured" : preview.source === "repository-capture" ? "Repository HTML captured · scripts disabled" : "Owner uploaded"} ${new Date(preview.capturedAt).toLocaleDateString()}`
            : "No screenshot supplied"}
          {project.deployments[0] && (
            <button onClick={() => setLive(!live)}>
              {live ? "Close live frame" : "Request live preview"}
            </button>
          )}
        </div>
      )}
      {small && preview && (
        <div className="preview-source-note">
          {preview.source === "repository-capture"
            ? "Repository interface · scripts disabled"
            : "Genuine homepage screenshot"}
        </div>
      )}
      {live && (
        <div className="live-frame">
          <p>
            Embedding is best effort. If blocked or blank, use Open Live Site.
          </p>
          <iframe
            title={`${project.name} requested live preview`}
            src={project.deployments[0]}
            sandbox="allow-scripts allow-forms allow-popups allow-same-origin"
            referrerPolicy="no-referrer"
            loading="lazy"
          />
        </div>
      )}
      {zoom && preview && (
        <Modal
          title={`${project.name} · ${mode} captured preview`}
          close={() => setZoom(false)}
        >
          <div className="lightbox">
            <img
              src={mediaURL(preview.url)}
              width={preview.width}
              height={preview.height}
              alt={preview.alt}
            />
          </div>
        </Modal>
      )}
    </div>
  );
}
export function ProjectCard({
  project,
  index,
  list = false,
}: {
  project: Project;
  index: number;
  list?: boolean;
}) {
  return (
    <article className={`project-card ${list ? "list-card" : ""}`}>
      <BrowserPreview project={project} small />
      <div className="project-info">
        <div className="eyebrow">
          <span>
            {String(index + 1).padStart(2, "0")} / {project.category}
          </span>
          <span>{project.platform}</span>
        </div>
        <Link
          to={`/projects/${project.slug}`}
          className="project-title"
          data-project={project.slug}
          onClick={() => {
            sessionStorage.setItem("return-project", project.slug);
            if (location.pathname === "/")
              sessionStorage.setItem(
                "explorer-url",
                location.pathname + location.search + "#work",
              );
          }}
        >
          {project.name}
          <ArrowUpRight aria-hidden="true" size={25} />
        </Link>
        <p>{project.description}</p>
        <div className="chips">
          {project.technologies.slice(0, 4).map((t) => (
            <span key={t}>{t}</span>
          ))}
          {project.fork && <span>Fork</span>}
          {project.archived && <span>Archived</span>}
        </div>
        {project.deployments[0] && (
          <a
            className="live-project-link"
            href={project.deployments[0]}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Open ${project.name} live project`}
          >
            Open Live Project <ArrowUpRight aria-hidden="true" size={18} />
          </a>
        )}
        {!project.deployments[0] && project.repository && (
          <>
            <p className="demo-status">Live demo unavailable</p>
            <a
              className="live-project-link"
              href={project.repository}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`View ${project.name} source on GitHub`}
            >
              View on GitHub <ArrowUpRight aria-hidden="true" size={18} />
            </a>
          </>
        )}
        <Link
          className="text-link"
          to={`/projects/${project.slug}`}
          onClick={() => {
            sessionStorage.setItem("return-project", project.slug);
            if (location.pathname === "/")
              sessionStorage.setItem(
                "explorer-url",
                location.pathname + location.search + "#work",
              );
          }}
        >
          Explore project <span>↗</span>
        </Link>
      </div>
    </article>
  );
}
