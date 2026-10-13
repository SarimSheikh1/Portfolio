import express from "express";
import cors from "cors";
import helmet from "helmet";
import session from "express-session";
import connectPg from "connect-pg-simple";
import rateLimit from "express-rate-limit";
import multer from "multer";
import argon2 from "argon2";
import { randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import path from "node:path";
import { readFile } from "node:fs/promises";
import nodemailer from "nodemailer";
import { z } from "zod";
import { config } from "./config.js";
import { pool, projects, save, job, databaseConfigured } from "./db.js";
import {
  previewGithub,
  importGithub,
  providerCandidates,
  githubJSON,
} from "./importer.js";
import { checkURL, webURL } from "./safe-url.js";
import { storeImage } from "./media.js";
import type { Project } from "../../shared/types.js";
import { curateProjects, ownerContact } from "../../shared/curation.js";
declare module "express-session" {
  interface SessionData {
    owner?: string;
    viewer?: string;
    ownerEntry?: boolean;
    csrf?: string;
  }
}
export const app = express();
if (config.NODE_ENV === "production") app.set("trust proxy", 1);
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", config.PUBLIC_ORIGIN],
        frameSrc: ["https:"],
        workerSrc: ["'self'", "blob:"],
      },
    },
  }),
);
app.use(cors({ origin: config.PUBLIC_ORIGIN, credentials: true }));
app.use(express.json({ limit: "100kb" }));
const PgSession = connectPg(session);
app.use(
  session({
    store: databaseConfigured
      ? new PgSession({ pool, createTableIfMissing: false })
      : undefined,
    secret: config.SESSION_SECRET || randomBytes(48).toString("hex"),
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: config.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 8 * 60 * 60 * 1000,
    },
  }),
);
const requireOwner: express.RequestHandler = (req, res, next) => {
  if (!req.session.owner) {
    res.status(401).json({ error: "Owner authentication required" });
    return;
  }
  next();
};
const csrf: express.RequestHandler = (req, res, next) => {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    next();
    return;
  }
  const a = Buffer.from(String(req.headers["x-csrf-token"] || ""));
  const b = Buffer.from(req.session.csrf || "");
  if (!b.length || a.length !== b.length || !timingSafeEqual(a, b)) {
    res
      .status(403)
      .json({ error: "Session security token missing or expired" });
    return;
  }
  next();
};
app.get("/api/v1/health", async (_req, res) => {
  let database = false;
  if (databaseConfigured)
    try {
      await pool.query("SELECT 1");
      database = true;
    } catch {}
  res.json({ apiVersion: 1, database });
});
const requireViewer: express.RequestHandler = (req, res, next) => {
  res.setHeader("Cache-Control", "private, no-store");
  if (!req.session.viewer && !req.session.owner) {
    res.status(401).json({error: "Login or create an account to explore projects"});
    return;
  }
  next();
};
app.get("/api/v1/catalog", requireViewer, async (_req, res) => {
  res.json(JSON.parse(await readFile("server/data/world-projects.json", "utf8")));
});
app.get("/api/v1/public", requireViewer, async (_req, res) => {
  if (!databaseConfigured) {
    let snapshot: Project[] = [];
    try {
      snapshot = JSON.parse(
        await readFile("evidence/published-projects.json", "utf8"),
      ).projects;
    } catch {}
    res.json({
      apiVersion: 1,
      projects: curateProjects(snapshot),
      settings: ownerContact,
      sourceStatus:
        "Read-only public GitHub snapshot. Configure PostgreSQL for owner management and contact storage.",
    });
    return;
  }
  const rows = await projects();
  const settings = await pool.query("SELECT data FROM settings WHERE id=1");
  res.json({
    apiVersion: 1,
    projects: curateProjects(rows),
    settings: { ...ownerContact, ...settings.rows[0]?.data },
    sourceStatus: rows.length
      ? "verified"
      : "No published projects yet. Public repositories are available on GitHub.",
  });
});
app.get("/api/v1/session", async (req, res) => {
  if (databaseConfigured) {
    try { await pool.query('SELECT 1'); }
    catch { res.status(503).json({error:'The database is offline. Please start PostgreSQL.'}); return; }
  }
  req.session.csrf ||= randomBytes(32).toString("hex");
  res.setHeader("Cache-Control", "private, no-store");
  res.json({ authenticated: !!req.session.owner, viewerAuthenticated: !!(req.session.viewer || req.session.owner), csrf: req.session.csrf });
});
app.post('/api/v1/access-entry', rateLimit({windowMs: 15*60*1000, limit: 30, standardHeaders:'draft-8',legacyHeaders:false}), async (req,res) => {
  res.setHeader('Cache-Control','private, no-store');
  const expected=process.env.OWNER_ENTRY_PATH;
  const requested=typeof req.body?.path==='string'?req.body.path:'';
  const a=Buffer.from(requested);const b=Buffer.from(expected||'');
  if(!b.length||a.length!==b.length||!timingSafeEqual(a,b)){res.status(404).json({error:'Not found'});return;}
  res.json({allowed:true});
});
const accountLimiter = rateLimit({windowMs: 15 * 60 * 1000, limit: 15, standardHeaders: "draft-8", legacyHeaders: false});
for (const action of ["register", "signin"] as const) {
  app.post(`/api/v1/accounts/${action}`, accountLimiter, csrf, async (req, res) => {
    const data = z.object({email: (action === "register" ? z.email().max(254) : z.string().min(1).max(254)).transform(v => v.trim().toLowerCase()), password: z.string().min(action === "register" ? 12 : 1).max(256), ownerOnly:z.boolean().optional()}).parse(req.body);
    if (!databaseConfigured) {
      res.status(503).json({error: "Account access requires a connected database. Please contact the owner."});
      return;
    }
    let viewerId: string;
    if (action === "register") {
      viewerId = randomUUID();
      try {
        await pool.query("INSERT INTO viewers(id,email,password_hash) VALUES($1,$2,$3)", [viewerId, data.email, await argon2.hash(data.password, {type: argon2.argon2id})]);
      } catch (error: any) {
        if (error.code === "23505") { res.status(409).json({error: "Account could not be created. Try logging in instead."}); return; }
        throw error;
      }
    } else {
      const owners = await pool.query("SELECT id,password_hash FROM owners WHERE lower(username)=$1", [data.email]);
      const owner = owners.rows[0];
      if (owner && await argon2.verify(owner.password_hash, data.password)) {
        await new Promise<void>((resolve,reject)=>req.session.regenerate(e=>e?reject(e):resolve()));
        req.session.owner=owner.id;
        req.session.csrf=randomBytes(32).toString('hex');
        await new Promise<void>((resolve,reject)=>req.session.save(e=>e?reject(e):resolve()));
        res.json({viewerAuthenticated:true,csrf:req.session.csrf,redirect:process.env.OWNER_ENTRY_PATH});
        return;
      }
      if(data.ownerOnly){res.status(401).json({error:"Invalid username or password"});return;}
      const result = await pool.query("SELECT id,password_hash FROM viewers WHERE email=$1", [data.email]);
      const viewer = result.rows[0];
      const valid = viewer && await argon2.verify(viewer.password_hash, data.password);
      if (!valid) { res.status(401).json({error: "Invalid email or password"}); return; }
      viewerId = viewer.id;
    }
    await new Promise<void>((resolve,reject) => req.session.regenerate(e => e ? reject(e) : resolve()));
    req.session.viewer = viewerId;
    req.session.csrf = randomBytes(32).toString("hex");
    await new Promise<void>((resolve,reject) => req.session.save(e => e ? reject(e) : resolve()));
    res.json({viewerAuthenticated: true, csrf: req.session.csrf});
  });
}
app.post(
  "/api/v1/login",
  (req,res,next)=>{const expected=process.env.OWNER_ENTRY_PATH||'';const a=Buffer.from(String(req.headers['x-owner-entry']||''));const b=Buffer.from(expected);if(!req.session.owner&&(!b.length||a.length!==b.length||!timingSafeEqual(a,b))){res.status(404).json({error:'Not found'});return;}next();},
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 8,
    standardHeaders: "draft-8",
    legacyHeaders: false,
  }),
  csrf,
  async (req, res) => {
    const data = z
      .object({
        username: z.string().min(1).max(100),
        password: z.string().min(1).max(256),
      })
      .parse(req.body);
    if (!databaseConfigured) {
      res.status(503).json({
        error: "Configure PostgreSQL and create the first owner first.",
      });
      return;
    }
    const result = await pool.query(
      "SELECT id,password_hash FROM owners WHERE username=$1",
      [data.username],
    );
    const owner = result.rows[0];
    if (!owner || !(await argon2.verify(owner.password_hash, data.password))) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }
    await new Promise<void>((resolve, reject) =>
      req.session.regenerate((e) => (e ? reject(e) : resolve())),
    );
    req.session.owner = owner.id;
    req.session.csrf = randomBytes(32).toString("hex");
    res.json({ authenticated: true, csrf: req.session.csrf });
  },
);
app.post("/api/v1/logout", csrf, (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("connect.sid");
    res.json({ ok: true });
  });
});
app.post(
  "/api/v1/contact",
  rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: 6,
    standardHeaders: "draft-8",
    legacyHeaders: false,
  }),
  async (req, res) => {
    const data = z
      .object({
        name: z.string().trim().min(2).max(100),
        email: z.email().max(254),
        message: z.string().trim().min(10).max(5000),
        website: z.string().max(200).default(""),
      })
      .parse(req.body);
    if (data.website) {
      res.status(400).json({ error: "Submission rejected" });
      return;
    }
    if (!databaseConfigured) {
      res.status(503).json({
        error:
          "Contact storage is not configured yet. Please use the GitHub profile link.",
      });
      return;
    }
    const id = randomUUID();
    await pool.query(
      "INSERT INTO inquiries(id,name,email,message) VALUES($1,$2,$3,$4)",
      [id, data.name, data.email, data.message],
    );
    let mailStatus = "not-configured";
    if (process.env.SMTP_HOST && process.env.MAIL_FROM && process.env.MAIL_TO) {
      try {
        await nodemailer
          .createTransport({
            host: process.env.SMTP_HOST,
            port: Number(process.env.SMTP_PORT || 587),
            secure: process.env.SMTP_PORT === "465",
            auth: process.env.SMTP_USER
              ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
              : undefined,
          })
          .sendMail({
            from: process.env.MAIL_FROM,
            to: process.env.MAIL_TO,
            replyTo: data.email,
            subject: "Portfolio inquiry",
            text: `${data.name}\n${data.email}\n\n${data.message}`,
          });
        mailStatus = "delivered";
      } catch {
        mailStatus = "failed";
      }
    }
    await pool.query("UPDATE inquiries SET mail_status=$1 WHERE id=$2", [
      mailStatus,
      id,
    ]);
    res.status(201).json({ stored: true, mailStatus });
  },
);
app.post('/api/v1/activity',rateLimit({windowMs:60*1000,limit:60,standardHeaders:'draft-8',legacyHeaders:false}),csrf,async(req,res)=>{
  if(!databaseConfigured){res.status(503).json({error:'Activity storage unavailable'});return;}
  if(req.session.owner){res.json({stored:false});return;}
  const data=z.object({visitor:z.uuid(),kind:z.enum(['visit','section','project','link','heartbeat']),target:z.string().min(1).max(200),name:z.string().trim().min(1).max(80).optional(),details:z.object({browser:z.string().max(500),language:z.string().max(80),timezone:z.string().max(100),screen:z.string().max(40),viewport:z.string().max(40),device:z.string().max(40),referrer:z.string().max(300),page:z.string().max(200)}).optional()}).parse(req.body);
  const account=req.session.viewer||null;
  await pool.query('INSERT INTO visitor_presence(id,account_id,current_target,name,details) VALUES($1,$2,$3,$4,$5::jsonb) ON CONFLICT(id) DO UPDATE SET account_id=COALESCE(EXCLUDED.account_id,visitor_presence.account_id),last_seen=now(),current_target=EXCLUDED.current_target,name=COALESCE(EXCLUDED.name,visitor_presence.name),details=visitor_presence.details||EXCLUDED.details',[data.visitor,account,data.target,data.name||null,JSON.stringify({...data.details,ip:req.ip||'Unknown'})]);
  if(data.kind!=='heartbeat')await pool.query('INSERT INTO visitor_events(id,visitor_id,account_id,kind,target) VALUES($1,$2,$3,$4,$5)',[randomUUID(),data.visitor,account,data.kind,data.target]);
  res.json({stored:true});
});
app.use("/api/v1/admin", requireOwner, csrf);
app.get('/api/v1/admin/activity',async(_req,res)=>{
  res.setHeader('Cache-Control','private, no-store');
  const summary=await pool.query("SELECT count(*)::int AS total, count(*) FILTER(WHERE last_seen>now()-interval '90 seconds')::int AS active FROM visitor_presence");
  const visitors=await pool.query("SELECT p.*,v.email,(p.last_seen>now()-interval '90 seconds') AS active FROM visitor_presence p LEFT JOIN viewers v ON v.id=p.account_id ORDER BY p.last_seen DESC,p.id LIMIT 100");
  const events=await pool.query('SELECT e.*,v.email,p.name FROM visitor_events e LEFT JOIN viewers v ON v.id=e.account_id LEFT JOIN visitor_presence p ON p.id=e.visitor_id ORDER BY e.created_at DESC,e.id LIMIT 200');
  res.json({summary:summary.rows[0],visitors:visitors.rows,events:events.rows,serverTime:new Date().toISOString()});
});

app.get("/api/v1/admin/projects", async (_req, res) =>
  res.json(await projects(true)),
);
app.get("/api/v1/admin/status", async (_req, res) =>
  res.json({
    github: process.env.GITHUB_TOKEN ? "token configured" : "public API",
    vercel: !!process.env.VERCEL_TOKEN,
    netlify: !!process.env.NETLIFY_TOKEN,
    storage: !!process.env.S3_BUCKET,
    mail: !!process.env.SMTP_HOST,
  }),
);
app.get("/api/v1/admin/jobs", async (_req, res) =>
  res.json(
    (await pool.query("SELECT * FROM jobs ORDER BY created_at DESC LIMIT 100"))
      .rows,
  ),
);
app.get("/api/v1/admin/inquiries", async (_req, res) =>
  res.json(
    (
      await pool.query(
        "SELECT * FROM inquiries ORDER BY created_at DESC LIMIT 200",
      )
    ).rows,
  ),
);
app.patch("/api/v1/admin/inquiries/:id", async (req, res) => {
  const id = z.uuid().parse(req.params.id);
  const { resolved } = z.object({ resolved: z.boolean() }).parse(req.body);
  await pool.query("UPDATE inquiries SET resolved=$1 WHERE id=$2", [
    resolved,
    id,
  ]);
  res.json({ ok: true });
});
app.get("/api/v1/admin/export", async (_req, res) =>
  res.json({ apiVersion: 1, projects: await projects(true) }),
);
let importing = false;
app.post("/api/v1/admin/import/github", async (req, res) => {
  if (importing) {
    res.status(409).json({ error: "An import is already running" });
    return;
  }
  importing = true;
  try {
    res.json(req.body.preview ? await previewGithub() : await importGithub());
  } finally {
    importing = false;
  }
});
app.post("/api/v1/admin/import/:provider", async (req, res) => {
  const provider = z.enum(["vercel", "netlify"]).parse(req.params.provider);
  res.json(await providerCandidates(provider));
});
const edit = z.object({
  name: z.string().min(1).max(150),
  slug: z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .max(150),
  description: z.string().max(2000),
  overview: z.string().max(6000),
  category: z.string().max(100),
  technologies: z.array(z.string().max(80)).max(30),
  featured: z.number().int().min(0).max(100),
  published: z.boolean(),
  excluded: z.boolean(),
  features: z.array(z.string().max(300)).max(30),
  deployments: z.array(z.string().url()).max(12).optional(),
  repository: z.string().url().nullable().optional(),
});
app.put("/api/v1/admin/projects/:id", async (req, res) => {
  const data = edit.parse(req.body);
  const old = (await projects(true)).find((p) => p.id === req.params.id);
  if (!old) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  if (data.published && !old.verified) {
    res.status(400).json({
      error: "Verify a public repository or deployment before publication",
    });
    return;
  }
  if (
    data.deployments &&
    JSON.stringify(data.deployments) !== JSON.stringify(old.deployments)
  )
    for (let i = 0; i < data.deployments.length; i++) {
      const check = await checkURL(data.deployments[i]);
      if (check.status !== "reachable") {
        res.status(422).json({
          error:
            "A deployment could not pass its public availability check. Keep its previous verified link or retry later.",
        });
        return;
      }
      data.deployments[i] = check.url;
    }
  if (data.repository && data.repository !== old.repository) {
    const u = webURL(data.repository);
    const parts = u.pathname.split("/").filter(Boolean);
    if (u.hostname !== "github.com" || parts.length !== 2)
      throw Error("Public repository URL required");
    const repo = await githubJSON(
      "/repos/" + parts.map(encodeURIComponent).join("/"),
    );
    if (repo.private !== false) throw Error("Public repository required");
    data.repository = repo.html_url;
  }
  if (
    data.published &&
    !(data.repository === undefined ? old.repository : data.repository) &&
    !(data.deployments || old.deployments).length
  ) {
    res.status(422).json({
      error: "Published records require a verified public source link.",
    });
    return;
  }
  const next = {
    ...old,
    ...data,
    overrides: [
      ...new Set([
        ...old.overrides,
        ...Object.keys(data).filter(
          (k) => !["published", "excluded"].includes(k),
        ),
      ]),
    ],
  };
  await save(next);
  res.json(next);
});
app.post("/api/v1/admin/manual", async (req, res) => {
  const data = z
    .object({
      name: z.string().min(1).max(150),
      url: z.string().url(),
      repository: z.string().url().optional(),
      existingId: z.string().optional(),
      provider: z.enum(["vercel", "netlify"]).optional(),
      providerId: z.string().max(150).optional(),
    })
    .parse(req.body);
  const checked = await checkURL(data.url);
  if (checked.status !== "reachable") {
    res.status(422).json({
      error: `Deployment check: ${checked.status}. Public access must be verified.`,
    });
    return;
  }
  const all = await projects(true);
  let old = all.find(
    (p) =>
      (data.provider &&
        data.providerId &&
        p.providerIdentities?.[data.provider] === data.providerId) ||
      p.id === data.existingId ||
      p.deployments.includes(checked.url) ||
      (data.repository && p.repository === data.repository),
  );
  let repository: string | null = null;
  if (data.repository) {
    const u = webURL(data.repository);
    if (u.hostname !== "github.com")
      throw Error("Repository must be a public GitHub URL");
    const c = await checkURL(u.href);
    if (c.status !== "reachable")
      throw Error("Repository could not be verified");
    const parts = u.pathname.split("/").filter(Boolean);
    if (parts.length !== 2) throw Error("Repository URL required");
    const repo = await githubJSON(
      "/repos/" + parts.map(encodeURIComponent).join("/"),
    );
    if (repo.private !== false) throw Error("Public repository required");
    repository = repo.html_url;
  }
  const p: Project = old
    ? {
        ...old,
        deployments: [...new Set([...old.deployments, checked.url])],
        checkedAt: checked.checkedAt,
        status: "reachable",
        verified: true,
      }
    : {
        id: `manual:${randomUUID()}`,
        slug:
          data.name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "") +
          "-" +
          randomBytes(3).toString("hex"),
        name: data.name,
        description: "Owner-added public project. Overview pending review.",
        overview: "",
        category: "Creative websites",
        technologies: [],
        platform: "Web",
        repository,
        deployments: [checked.url],
        featured: 0,
        published: false,
        excluded: false,
        fork: false,
        archived: false,
        verified: true,
        status: "reachable",
        updatedAt: new Date().toISOString(),
        checkedAt: checked.checkedAt,
        desktop: null,
        mobile: null,
        features: [],
        readme: "",
        provenance: { deployments: "Owner URL / public availability check" },
        overrides: [],
      };
  if (data.provider && data.providerId)
    p.providerIdentities = {
      ...p.providerIdentities,
      [data.provider]: data.providerId,
    };
  await save(p);
  await job("manual", "review-required", { project: p.id });
  res.status(201).json(p);
});
app.post("/api/v1/admin/projects/:id/check", async (req, res) => {
  const p = (await projects(true)).find((p) => p.id === req.params.id);
  if (!p) {
    res.sendStatus(404);
    return;
  }
  if (p.deployments.length) {
    const check = await checkURL(p.deployments[0]);
    p.status = check.status;
    p.checkedAt = check.checkedAt;
    await save(p);
  }
  res.json(p);
});
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 12_000_000, files: 1 },
});
app.post(
  "/api/v1/admin/projects/:id/preview/:mode",
  upload.single("image"),
  async (req, res) => {
    const mode = z.enum(["desktop", "mobile"]).parse(req.params.mode);
    const p = (await projects(true)).find((p) => p.id === req.params.id);
    if (!p || !req.file) {
      res.status(400).json({ error: "Project and image required" });
      return;
    }
    p[mode] = await storeImage(
      req.file.buffer,
      `${p.name} genuine ${mode} interface preview`,
      "owner-upload",
    );
    await save(p);
    await job("upload", "complete", { project: p.id, mode });
    res.json(p);
  },
);
app.get("/api/v1/admin/settings", async (_req, res) =>
  res.json(
    (await pool.query("SELECT data FROM settings WHERE id=1")).rows[0]?.data ||
      {},
  ),
);
app.put("/api/v1/admin/settings", async (req, res) => {
  const data = z
    .object({
      github: z.literal("https://github.com/SarimSheikh1"),
      instagram: z.string().url().or(z.literal("")).optional(),
      linkedin: z.string().url().or(z.literal("")).optional(),
      creator: z.string().url().or(z.literal("")).optional(),
      email: z.email().or(z.literal("")).optional(),
      phone: z.string().max(40).optional(),
    })
    .parse(req.body);
  for (const key of ["instagram", "linkedin", "creator"] as const)
    if (data[key]) webURL(data[key]!);
  await pool.query("UPDATE settings SET data=$1 WHERE id=1", [data]);
  res.json(data);
});
app.use(
  "/media",
  express.static(path.resolve("uploads"), { immutable: true, maxAge: "1y" }),
);
if (config.NODE_ENV === "production") {
  app.use(express.static(path.resolve("client/dist")));
  app.get("/{*path}", (_req, res) =>
    res.sendFile(path.resolve("client/dist/index.html")),
  );
}
app.use(
  (
    error: any,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    const validation = error instanceof z.ZodError;
    res.status(validation ? 400 : error.code === "23505" ? 409 : 500).json({
      error: validation
        ? "Invalid input. Check the fields."
        : error.code === "23505"
          ? "This slug already exists."
          : error.message?.includes("rate limit")
            ? error.message
            : "The request could not be completed. Check database and provider configuration.",
    });
  },
);
app.listen(
  config.PORT,
  config.NODE_ENV === "production" ? "0.0.0.0" : "127.0.0.1",
  () => console.log(`API listening on http://127.0.0.1:${config.PORT}`),
);
