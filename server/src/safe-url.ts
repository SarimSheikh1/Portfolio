import dns from "node:dns/promises";
import https from "node:https";
import http from "node:http";
import ipaddr from "ipaddr.js";
export function publicIP(value: string) {
  try {
    let ip = ipaddr.parse(value);
    if (ip.kind() === "ipv6" && (ip as ipaddr.IPv6).isIPv4MappedAddress())
      ip = (ip as ipaddr.IPv6).toIPv4Address();
    return ip.range() === "unicast";
  } catch {
    return false;
  }
}
export function webURL(value: string) {
  const u = new URL(value);
  if (
    !["http:", "https:"].includes(u.protocol) ||
    u.username ||
    u.password ||
    (u.port && !["80", "443"].includes(u.port))
  )
    throw Error("Only public HTTP(S) on standard ports is permitted");
  const h = u.hostname.replace(/^\[|\]$/g, "");
  if (
    (!h.includes(".") && !ipaddr.isValid(h)) ||
    /\.(localhost|local|internal|home|test|invalid)$/i.test(h) ||
    h === "localhost"
  )
    throw Error("Internal hostname rejected");
  u.hash = "";
  return u;
}
export async function resolvePublic(value: string) {
  const url = webURL(value);
  const host = url.hostname.replace(/^\[|\]$/g, "");
  let timer: ReturnType<typeof setTimeout> | undefined;
  const addresses = await Promise.race([
    dns.lookup(host, { all: true }),
    new Promise<never>((_resolve, reject) => {
      timer = setTimeout(() => reject(Error("DNS lookup timed out")), 10000);
    }),
  ]).finally(() => clearTimeout(timer));
  if (!addresses.length || addresses.some((a) => !publicIP(a.address)))
    throw Error("Private or reserved destination rejected");
  return { url, address: addresses[0] };
}
// Pin the validated address at connection time; every redirect is independently checked.
export async function safeFetch(
  value: string,
  limit = 2_000_000,
  redirects = 0,
): Promise<{
  status: number;
  body: Buffer;
  url: string;
  headers: http.IncomingHttpHeaders;
}> {
  if (redirects > 5) throw Error("Too many redirects");
  const { url, address } = await resolvePublic(value);
  return new Promise((resolve, reject) => {
    const transport = url.protocol === "https:" ? https : http;
    const req = transport.get(
      url,
      {
        autoSelectFamily: false,
        family: address.family,
        lookup: ((_host: unknown, _options: unknown, cb: any) =>
          cb(null, address.address, address.family)) as any,
        headers: {
          "User-Agent": "SarimPortfolio/1.0",
          Accept: "text/html,application/json",
        },
        timeout: 10000,
      } as http.RequestOptions & { autoSelectFamily: boolean },
      (res) => {
        if (
          [301, 302, 303, 307, 308].includes(res.statusCode || 0) &&
          res.headers.location
        ) {
          res.destroy();
          safeFetch(
            new URL(res.headers.location, url).href,
            limit,
            redirects + 1,
          ).then(resolve, reject);
          return;
        }
        const parts: Buffer[] = [];
        let bytes = 0;
        res.on("data", (b: Buffer) => {
          bytes += b.length;
          if (bytes > limit) {
            req.destroy(Error("Response too large"));
            return;
          }
          parts.push(b);
        });
        res.on("end", () =>
          resolve({
            status: res.statusCode || 0,
            body: Buffer.concat(parts),
            url: url.href,
            headers: res.headers,
          }),
        );
        res.on("error", reject);
      },
    );
    req.on("timeout", () => req.destroy(Error("Destination timed out")));
    req.on("error", reject);
  });
}
export async function checkURL(value: string) {
  try {
    const r = await safeFetch(value, 750_000);
    return {
      url: r.url,
      status: r.status >= 200 && r.status < 400 ? "reachable" : "unavailable",
      checkedAt: new Date().toISOString(),
    };
  } catch (e) {
    return {
      url: value,
      status: "unknown",
      checkedAt: new Date().toISOString(),
    };
  }
}
