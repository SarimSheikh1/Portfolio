import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { createInterface } from "node:readline/promises";
import argon2 from "argon2";
import { pool } from "./db.js";
import { importGithub } from "./importer.js";
const command = process.argv[2];
try {
  if (command === "migrate") {
    await pool.query(
      await readFile("server/migrations/001_initial.sql", "utf8"),
    );
    console.log("Migrations applied.");
  } else if (command === "owner-configured") {
    const username = process.env.OWNER_LOGIN;
    const passwordHash = process.env.OWNER_PASSWORD_HASH;
    if (!username || !passwordHash?.startsWith("$argon2id$")) throw Error("Private owner configuration missing");
    await pool.query("INSERT INTO owners(id,username,password_hash) VALUES($1,$2,$3) ON CONFLICT(singleton) DO UPDATE SET username=EXCLUDED.username,password_hash=EXCLUDED.password_hash", [randomUUID(),username,passwordHash]);
    console.log("Private owner login configured.");
  } else if (command === "owner") {
    if ((await pool.query("SELECT count(*) FROM owners")).rows[0].count !== "0")
      throw Error("An owner already exists. Public signup is disabled.");
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    const username = await rl.question("Owner username: ");
    console.log(
      "Enter a strong password (minimum 14 characters); input is hidden.",
    );
    rl.close();
    const password = await new Promise<string>((resolve, reject) => {
      if (!process.stdin.isTTY) {
        reject(
          Error("Use an interactive terminal to enter the password securely"),
        );
        return;
      }
      let value = "";
      process.stdin.setRawMode(true);
      process.stdin.resume();
      const handler = (chunk: Buffer) => {
        for (const ch of chunk.toString()) {
          if (ch === "\u0003") {
            process.stdin.setRawMode(false);
            process.stdin.off("data", handler);
            reject(Error("Cancelled"));
            return;
          }
          if (ch === "\r" || ch === "\n") {
            process.stdin.setRawMode(false);
            process.stdin.off("data", handler);
            process.stdin.pause();
            resolve(value);
            return;
          }
          if (ch === "\u007f" || ch === "\b") value = value.slice(0, -1);
          else value += ch;
        }
      };
      process.stdin.on("data", handler);
    });
    if (!username.trim() || password.length < 14)
      throw Error("Username and a password of at least 14 characters required");
    await pool.query(
      "INSERT INTO owners(id,username,password_hash) VALUES($1,$2,$3)",
      [
        randomUUID(),
        username.trim(),
        await argon2.hash(password, { type: argon2.argon2id }),
      ],
    );
    console.log("\nOwner created.");
  } else if (command === "import") {
    const rows = await importGithub();
    console.log(
      `${rows.length} public repositories imported. Review and publish from /admin.`,
    );
  } else throw Error("Use migrate, owner, or import");
} catch (e) {
  console.error(e instanceof Error ? e.message : "Command failed");
  process.exitCode = 1;
} finally {
  await pool.end();
}
