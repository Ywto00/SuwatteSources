export const resolveUrl = (baseUrl: string, value?: string): string => {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;

  const originMatch = String(baseUrl).match(/^https?:\/\/[^/]+/i);
  const origin = originMatch ? originMatch[0] : "";
  const normalizedBase = String(baseUrl).replace(/\/+$/, "");

  if (raw.startsWith("//")) {
    const proto = origin.startsWith("https://") ? "https:" : "http:";
    return `${proto}${raw}`;
  }
  if (raw.startsWith("/")) {
    return origin ? `${origin}${raw}` : raw;
  }
  if (raw.startsWith("./")) {
    return `${normalizedBase}/${raw.slice(2)}`;
  }

  return `${normalizedBase}/${raw}`;
};

export const extractQueryNumber = (urlLike: string, key: string): string => {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = String(urlLike).match(new RegExp(`[?&]${escaped}=(\\d+)`, "i"));
  return match ? match[1] : "";
};

export const normalizeViewerUrl = (baseUrl: string, value?: string): string => {
  const absolute = resolveUrl(baseUrl, value);
  if (!absolute || absolute === "#") return "";
  try {
    const parsed = new URL(absolute);
    if (/^m\.webtoons\.com$/i.test(parsed.hostname)) {
      parsed.hostname = "www.webtoons.com";
    }
    return parsed.toString();
  } catch {
    return absolute;
  }
};
