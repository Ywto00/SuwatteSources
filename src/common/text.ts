import * as Cheerio from "cheerio";
import * as he from "he";

export const normalizeText = (input: Cheerio.Cheerio<any> | string | undefined): string => {
  if (!input) return "";
  let raw = "";
  if (typeof input === "string") {
    raw = input;
  } else {
    const cloned = input.clone();
    cloned.find("br").replaceWith(" ");
    raw = cloned.text();
  }
  const decoded = he.decode(String(raw));
  return decoded.replace(/\s+/g, " ").trim();
};
