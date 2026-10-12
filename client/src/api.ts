import type { PublicResponse } from "../../shared/types";
import { curateProjects, ownerContact } from "../../shared/curation";
export const base = import.meta.env.VITE_API_URL || "";
let csrf = "";
export async function api<T = any>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const r = await fetch(`${base}/api/v1${path}`, {
    ...options,
    credentials: "include",
    headers: {
      ...(options.body instanceof FormData
        ? {}
        : { "Content-Type": "application/json" }),
      ...(csrf ? { "X-CSRF-Token": csrf } : {}),
      ...options.headers,
    },
  });
  if (!r.headers.get("content-type")?.includes("application/json"))
    throw Error("The server is not connected yet. Please try again later.");
  const data = await r.json();
  if (!r.ok) {const error=Object.assign(Error(data.error || `Request failed (${r.status})`),{status:r.status});throw error;}
  if (data.csrf) csrf = data.csrf;
  return data;
}
export async function loadPublic(): Promise<PublicResponse> {
  try {
    const result = await api<PublicResponse>("/public");
    return {
      ...result,
      projects: curateProjects(result.projects),
      settings: { ...ownerContact, ...result.settings },
    };
  } catch (e) {
    throw e;
  }
}
export function mediaURL(url: string) {
  return url.startsWith("/previews/")
    ? url
    : url.startsWith("/")
      ? base + url
      : url;
}
