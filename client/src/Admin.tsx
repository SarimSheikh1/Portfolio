import { useEffect, useState } from "react";
import type { Project, Settings } from "../../shared/types";
import { api } from "./api";
import VisitorDashboard from "./VisitorDashboard";
import { BrowserPreview } from "./components";
export default function Admin() {
  const [auth, setAuth] = useState<boolean | null>(null);
  const [rows, setRows] = useState<Project[]>([]);
  const [selected, setSelected] = useState<Project | null>(null);
  const [tab, setTab] = useState("projects");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [imports, setImports] = useState<Project[] | null>(null);
  const [connections, setConnections] = useState<any>({});
  const [inquiries, setInquiries] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [settings, setSettings] = useState<Settings>({
    github: "https://github.com/SarimSheikh1",
  });
  const [candidates, setCandidates] = useState<any[]>([]);
  const refresh = async () => {
    const [p, c, i, j, s] = await Promise.all([
      api<Project[]>("/admin/projects"),
      api("/admin/status"),
      api("/admin/inquiries"),
      api("/admin/jobs"),
      api("/admin/settings"),
    ]);
    setRows(p);
    setConnections(c);
    setInquiries(i);
    setJobs(j);
    setSettings(s);
  };
  useEffect(() => {
    api('/health').then(health=>{
      if (!health.database) throw Error('The database is offline. Start PostgreSQL and configure the owner account to enable admin login.');
      return api('/session');
    })
      .then((s) => {
        setAuth(s.authenticated);
        if (s.authenticated) void refresh();
      })
      .catch((e) => setStatus(e.message));
  }, []);
  const run = async (task: () => Promise<void>) => {
    setBusy(true);
    setStatus("");
    try {
      await task();
    } catch (e) {
      setStatus((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  if (auth === null)
    return (
      <main id="main" className="route-message">
        <h1 tabIndex={-1}>Owner access</h1>
        <p role="status">{status || "Checking session…"}</p>
        {status && (
          <p>
            Owner management requires a running PostgreSQL database. After starting it, run db:migrate and owner:configure, then reload this page.
          </p>
        )}
      </main>
    );
  if (!auth)
    return (
      <main id="main" className="admin-login section">
        <p className="eyebrow">OWNER CONTROL / SECURE SESSION</p>
        <h1 tabIndex={-1}>
          Your universe.
          <br />
          <em>Your controls.</em>
        </h1>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const d = new FormData(e.currentTarget);
            void run(async () => {
              await api("/login", {
                method: "POST",
                headers: {"X-Owner-Entry": window.location.pathname},
                body: JSON.stringify(Object.fromEntries(d)),
              });
              setAuth(true);
              await refresh();
            });
          }}
        >
          <label>
            Username
            <input name="username" autoComplete="username" required />
          </label>
          <label>
            Password
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </label>
          <button className="primary" disabled={busy}>
            {busy ? "Signing in…" : "Sign in ↗"}
          </button>
          <p role="status">{status}</p>
          <small>
            Admin access is restricted to the owner. Configure the owner with{" "}
            <code>npm run owner:configure</code>.
          </small>
        </form>
      </main>
    );
  return (
    <main id="main" className="admin section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">OWNER CONTROL / THE IDEA UNIVERSE</p>
          <h1 tabIndex={-1}>Mission control.</h1>
        </div>
        <button
          onClick={() =>
            void run(async () => {
              await api("/logout", { method: "POST" });
              setAuth(false);
            })
          }
        >
          Sign out ↗
        </button>
      </div>
      <nav className="admin-tabs" aria-label="Admin sections">
        {["projects", "visitors", "imports", "settings", "inquiries", "history"].map(
          (t) => (
            <button key={t} aria-pressed={tab === t} onClick={() => setTab(t)}>
              {t}
            </button>
          ),
        )}
      </nav>
      <p className="admin-status" role="status">
        {busy ? "Working…" : status}
      </p>
      <VisitorDashboard expanded={tab === "visitors"}/>
      {tab === "projects" && (
        <div className="admin-project-layout">
          <div className="admin-project-list">
            <h2>Project records ({rows.length})</h2>
            <label className="check">
              <input
                type="checkbox"
                onChange={(e) => {
                  document
                    .querySelectorAll<HTMLElement>(
                      '[data-fork="true"], [data-archived="true"]',
                    )
                    .forEach((el) => (el.hidden = e.target.checked));
                }}
              />{" "}
              Hide forks and archived
            </label>
            {rows.map((p) => (
              <button
                className="record-button"
                data-fork={p.fork}
                data-archived={p.archived}
                key={p.id}
                onClick={() => setSelected(structuredClone(p))}
              >
                <strong>{p.name}</strong>
                <span>
                  {p.excluded
                    ? "Excluded"
                    : p.published
                      ? "Published"
                      : "Review pending"}
                  {p.fork ? " · Fork" : ""}
                  {p.archived ? " · Archived" : ""}
                </span>
              </button>
            ))}
            {!rows.length && <p>No records yet. Import public work first.</p>}
            <button
              onClick={() =>
                void run(async () => {
                  const data = await api("/admin/export");
                  const url = URL.createObjectURL(
                    new Blob([JSON.stringify(data, null, 2)], {
                      type: "application/json",
                    }),
                  );
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = "sarim-projects.json";
                  a.click();
                  URL.revokeObjectURL(url);
                })
              }
            >
              Export metadata ↓
            </button>
          </div>
          {selected ? (
            <form
              className="project-editor"
              onSubmit={(e) => {
                e.preventDefault();
                void run(async () => {
                  const p = await api<Project>(
                    `/admin/projects/${encodeURIComponent(selected.id)}`,
                    { method: "PUT", body: JSON.stringify(selected) },
                  );
                  setSelected(p);
                  await refresh();
                  setStatus(
                    "Project saved. Owner edits are protected from later imports.",
                  );
                });
              }}
            >
              <h2>Edit / {selected.name}</h2>
              <p className="muted">
                Publication is an explicit review decision. Confirm public
                eligibility and genuine ownership before publishing. Feature
                claims must state their evidence.
              </p>
              {["name", "slug", "description", "overview", "category"].map(
                (k) => (
                  <label key={k}>
                    {k}
                    {["description", "overview"].includes(k) ? (
                      <textarea
                        rows={k === "overview" ? 5 : 3}
                        value={(selected as any)[k]}
                        onChange={(e) =>
                          setSelected({ ...selected, [k]: e.target.value })
                        }
                      />
                    ) : (
                      <input
                        required
                        value={(selected as any)[k]}
                        onChange={(e) =>
                          setSelected({ ...selected, [k]: e.target.value })
                        }
                      />
                    )}
                  </label>
                ),
              )}
              <label>
                Public deployment links (one per line; checked on save)
                <textarea
                  value={selected.deployments.join("\n")}
                  onChange={(e) =>
                    setSelected({
                      ...selected,
                      deployments: e.target.value.split("\n").filter(Boolean),
                    })
                  }
                />
              </label>
              <label>
                Public repository
                <input
                  type="url"
                  value={selected.repository || ""}
                  onChange={(e) =>
                    setSelected({
                      ...selected,
                      repository: e.target.value || null,
                    })
                  }
                />
              </label>
              <label>
                Technologies (comma-separated, evidence-based)
                <input
                  value={selected.technologies.join(", ")}
                  onChange={(e) =>
                    setSelected({
                      ...selected,
                      technologies: e.target.value
                        .split(",")
                        .map((x) => x.trim()),
                    })
                  }
                />
              </label>
              <label>
                Features (one per line; label documented vs tested)
                <textarea
                  value={selected.features.join("\n")}
                  onChange={(e) =>
                    setSelected({
                      ...selected,
                      features: e.target.value.split("\n").filter(Boolean),
                    })
                  }
                />
              </label>
              <label>
                Featured order (0 = ordinary)
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={selected.featured}
                  onChange={(e) =>
                    setSelected({
                      ...selected,
                      featured: Number(e.target.value),
                    })
                  }
                />
              </label>
              <label className="check">
                <input
                  type="checkbox"
                  checked={selected.published}
                  onChange={(e) =>
                    setSelected({ ...selected, published: e.target.checked })
                  }
                />{" "}
                Publish verified public record
              </label>
              <label className="check">
                <input
                  type="checkbox"
                  checked={selected.excluded}
                  onChange={(e) =>
                    setSelected({ ...selected, excluded: e.target.checked })
                  }
                />{" "}
                Exclude from public collection
              </label>
              <button className="primary" disabled={busy}>
                Save owner edits ↗
              </button>
              <h3>Genuine previews</h3>
              <BrowserPreview project={selected} />
              {(["desktop", "mobile"] as const).map((mode) => (
                <label key={mode}>
                  Upload {mode} PNG / JPEG / WebP (12MB max)
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const f = new FormData();
                      f.set("image", file);
                      void run(async () => {
                        setSelected(
                          await api(
                            `/admin/projects/${encodeURIComponent(selected.id)}/preview/${mode}`,
                            { method: "POST", body: f },
                          ),
                        );
                        await refresh();
                        setStatus("Genuine preview uploaded.");
                      });
                    }}
                  />
                </label>
              ))}
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  void run(async () => {
                    setSelected(
                      await api(
                        `/admin/projects/${encodeURIComponent(selected.id)}/check`,
                        { method: "POST" },
                      ),
                    );
                    await refresh();
                    setStatus("Availability refreshed.");
                  })
                }
              >
                Refresh URL availability
              </button>
              <p className="muted">
                Capture refresh: run the isolated worker with{" "}
                <code>npm run capture</code>. Failed captures retain previous
                images.
              </p>
              <h3>Source links</h3>
              {selected.repository && (
                <a
                  href={selected.repository}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Repository ↗
                </a>
              )}
              {selected.deployments.map((url) => (
                <p key={url}>
                  <a href={url} target="_blank" rel="noopener noreferrer">
                    {url} ↗
                  </a>
                </p>
              ))}
              <details>
                <summary>Evidence and provenance</summary>
                <pre>{JSON.stringify(selected.provenance, null, 2)}</pre>
              </details>
            </form>
          ) : (
            <div className="empty-state">
              <h3>Select a record to review.</h3>
              <p>
                Owner overrides survive imports. Previews never use generated
                project images.
              </p>
            </div>
          )}
        </div>
      )}
      {tab === "imports" && (
        <div className="admin-imports">
          <section>
            <h2>Public GitHub</h2>
            <p>
              All public repository pages are imported. Forks and archived
              records are marked; nothing is published automatically.
            </p>
            <button
              disabled={busy}
              className="primary"
              onClick={() =>
                void run(async () => {
                  setImports(
                    await api("/admin/import/github", {
                      method: "POST",
                      body: JSON.stringify({ preview: true }),
                    }),
                  );
                })
              }
            >
              Preview GitHub import ↗
            </button>
            {imports && (
              <>
                <p>
                  {imports.length} verified public records found. Preview has
                  not changed storage.
                </p>
                <ul>
                  {imports.map((p) => (
                    <li key={p.id}>
                      {p.name} · {p.status}
                      {p.fork ? " · Fork" : ""}
                    </li>
                  ))}
                </ul>
                <button
                  disabled={busy}
                  onClick={() =>
                    void run(async () => {
                      await api("/admin/import/github", {
                        method: "POST",
                        body: JSON.stringify({ preview: false }),
                      });
                      await refresh();
                      setImports(null);
                      setStatus(
                        "Imported into review queue. Existing publication choices and owner overrides preserved.",
                      );
                    })
                  }
                >
                  Commit / refresh metadata
                </button>
              </>
            )}
          </section>
          <section>
            <h2>Manual public URL</h2>
            <p>
              Add a public deployment, or attach an alternate URL to an existing
              record. Current public availability is checked server-side.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const f = e.currentTarget;
                const d = Object.fromEntries(new FormData(f));
                void run(async () => {
                  await api("/admin/manual", {
                    method: "POST",
                    body: JSON.stringify({
                      ...d,
                      repository: d.repository || undefined,
                      existingId: d.existingId || undefined,
                    }),
                  });
                  await refresh();
                  f.reset();
                  setStatus("URL checked and saved for review.");
                });
              }}
            >
              <label>
                Name
                <input name="name" required />
              </label>
              <label>
                Public production URL
                <input name="url" type="url" required />
              </label>
              <label>
                Public GitHub repository (optional)
                <input name="repository" type="url" />
              </label>
              <label>
                Attach to existing project
                <select name="existingId">
                  <option value="">New record</option>
                  {rows.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
              <button disabled={busy}>Check and save for review ↗</button>
            </form>
          </section>
          <section>
            <h2>Provider connections</h2>
            <p>
              Set tokens in the server environment. Management dashboards are
              never shown as public demos. Candidates require owner review and a
              separate public URL check.
            </p>
            {["vercel", "netlify"].map((provider) => (
              <div key={provider}>
                <p>
                  {provider}:{" "}
                  {connections[provider] ? "Connected" : "Disconnected"}
                </p>
                <button
                  disabled={busy || !connections[provider]}
                  onClick={() =>
                    void run(async () => {
                      setCandidates(
                        await api(`/admin/import/${provider}`, {
                          method: "POST",
                        }),
                      );
                    })
                  }
                >
                  Inspect production candidates
                </button>
              </div>
            ))}
            {candidates.map((c) => (
              <div className="candidate" key={c.id}>
                <strong>{c.name}</strong>
                <p>{c.url}</p>
                <button
                  disabled={busy}
                  onClick={() =>
                    void run(async () => {
                      await api("/admin/manual", {
                        method: "POST",
                        body: JSON.stringify({
                          name: c.name,
                          url: c.url,
                          provider: c.provider,
                          providerId: c.id,
                        }),
                      });
                      await refresh();
                      setStatus(
                        "Candidate passed a public URL check and was saved for owner review.",
                      );
                    })
                  }
                >
                  Check and queue for review
                </button>
              </div>
            ))}
          </section>
        </div>
      )}
      {tab === "settings" && (
        <form
          className="settings-form"
          onSubmit={(e) => {
            e.preventDefault();
            void run(async () => {
              await api("/admin/settings", {
                method: "PUT",
                body: JSON.stringify(settings),
              });
              setStatus(
                "Public settings saved. Reload the public page to see changes.",
              );
            });
          }}
        >
          <h2>Public links</h2>
          <p>
            Only add owner-confirmed links and an owner-confirmed contact
            address. Empty values remain absent publicly.
          </p>
          {["instagram", "linkedin", "creator", "email", "phone"].map((k) => (
            <label key={k}>
              {k}
              <input
                type={k === "email" ? "email" : k === "phone" ? "tel" : "url"}
                value={(settings as any)[k] || ""}
                onChange={(e) =>
                  setSettings({ ...settings, [k]: e.target.value })
                }
              />
            </label>
          ))}
          <button className="primary" disabled={busy}>
            Save settings ↗
          </button>
          <p>
            Storage:{" "}
            {connections.storage
              ? "Object storage configured"
              : "Development disk / hosted storage requires S3"}
          </p>
          <p>
            Email:{" "}
            {connections.mail
              ? "Provider configured"
              : "Not configured; inquiries are still stored"}
          </p>
        </form>
      )}
      {tab === "inquiries" && (
        <div className="inquiries">
          <h2>Saved inquiries</h2>
          {!inquiries.length && <p>No inquiries stored yet.</p>}
          {inquiries.map((i) => (
            <article key={i.id}>
              <h3>{i.name}</h3>
              <p>
                {i.email} · {new Date(i.created_at).toLocaleString()}
              </p>
              <p className="inquiry-message">{i.message}</p>
              <p className="muted">Email notification: {i.mail_status}</p>
              <button
                disabled={busy}
                onClick={() =>
                  void run(async () => {
                    await api(`/admin/inquiries/${i.id}`, {
                      method: "PATCH",
                      body: JSON.stringify({ resolved: !i.resolved }),
                    });
                    await refresh();
                  })
                }
              >
                {i.resolved ? "Reopen" : "Mark resolved"}
              </button>
            </article>
          ))}
        </div>
      )}
      {tab === "history" && (
        <div>
          <h2>Import / preview history</h2>
          {!jobs.length && <p>No jobs recorded.</p>}
          {jobs.map((j) => (
            <article className="history" key={j.id}>
              <strong>
                {j.kind} / {j.status}
              </strong>
              <time>{new Date(j.created_at).toLocaleString()}</time>
              <pre>{JSON.stringify(j.details, null, 2)}</pre>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
