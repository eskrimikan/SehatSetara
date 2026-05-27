function getRuntimeBaseUrl() {
  if (typeof window === "undefined") return "";

  const storedBaseUrl = window.localStorage.getItem("sehatsetara_api_base_url") || "";
  if (storedBaseUrl) return storedBaseUrl;

  if (import.meta.env.DEV) {
    return "http://localhost:8080";
  }

  return "/api";
}

const rawBaseUrl = import.meta.env.VITE_API_BASE_URL || getRuntimeBaseUrl();

function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.replace(/\/$/, "");
}

export function apiUrl(path: string) {
  if (!rawBaseUrl) return path;
  const baseUrl = normalizeBaseUrl(rawBaseUrl);
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return `${baseUrl}${suffix}`;
}

export function apiFetch(path: string, init?: RequestInit) {
  return fetch(apiUrl(path), init);
}

export function rewriteApiMediaUrls(html: string) {
  if (!rawBaseUrl) return html;
  const baseUrl = normalizeBaseUrl(rawBaseUrl);
  return html.replace(/(src|href)=(['"])\/(media\/[^'"\s>]+)\2/g, `$1=$2${baseUrl}/$3$2`);
}
