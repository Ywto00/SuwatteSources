import * as Cheerio from "cheerio";
import { resolveUrl } from "./url";

export const imageFromElement = (element: Cheerio.Cheerio<any>, baseUrl?: string): string => {
  if (!element || !element.length) return "";
  const dataUrl = String(element.attr("data-url") ?? "").trim();
  const dataSrc = String(element.attr("data-src") ?? "").trim();
  const dataOriginal = String(element.attr("data-original") ?? "").trim();
  const src = String(element.attr("src") ?? "").trim();

  let raw = dataUrl || dataSrc || dataOriginal || src;
  if (!raw) {
    const srcset = String(element.attr("srcset") ?? "").trim();
    if (srcset) raw = srcset.split(/[\s,]+/)[0];
  }

  if (!raw) return "";
  return baseUrl ? resolveUrl(baseUrl, raw) : raw;
};
