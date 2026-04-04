import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const RSS_URL = "https://blog.paul-goldschmidt.de/rss";
const BLOG_JSON_PATH = resolve(__dirname, "../src/data/blog.json");
const MAX_POSTS = 4;
const FETCH_TIMEOUT_MS = 10_000;
const EXCERPT_FALLBACK_LENGTH = 120;

const isDryRun = process.argv.includes("--dry-run");

function stripHtml(html) {
  return html
    .replace(/<[^>]+>/g, "")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getTagContent(xml, tagName) {
  const escaped = tagName.replace(":", "\\:");
  const re = new RegExp(`<${escaped}[^>]*>\\s*(?:<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>|([\\s\\S]*?))\\s*</${escaped}>`, "i");
  const match = xml.match(re);
  if (!match) return "";
  return (match[1] ?? match[2] ?? "").trim();
}

function parseRssItems(xml) {
  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let m;
  while ((m = itemRegex.exec(xml)) !== null) {
    const block = m[1];
    items.push({
      title: getTagContent(block, "title"),
      link: getTagContent(block, "link"),
      pubDate: getTagContent(block, "pubDate"),
      description: getTagContent(block, "description"),
      contentEncoded: getTagContent(block, "content:encoded"),
    });
  }
  return items;
}

function formatDate(rfc2822) {
  const date = new Date(rfc2822);
  if (isNaN(date.getTime())) return "";
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const year = date.getUTCFullYear();
  return `${month}.${year}`;
}

function truncate(text) {
  if (text.length <= EXCERPT_FALLBACK_LENGTH) return text;
  return text.slice(0, EXCERPT_FALLBACK_LENGTH) + "...";
}

function buildExcerpt(description, contentEncoded) {
  const descText = description ? stripHtml(description) : "";
  if (descText) return truncate(descText);

  const contentText = contentEncoded ? stripHtml(contentEncoded) : "";
  if (contentText) return truncate(contentText);

  return "";
}

function transformItem(raw) {
  return {
    year: formatDate(raw.pubDate),
    title: stripHtml(raw.title),
    excerpt: buildExcerpt(raw.description, raw.contentEncoded),
    url: raw.link,
  };
}

async function main() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let response;
  try {
    response = await fetch(RSS_URL, { signal: controller.signal });
  } catch (err) {
    console.error(`Failed to fetch RSS feed: ${err.message}`);
    process.exit(1);
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    console.error(`RSS feed returned HTTP ${response.status}`);
    process.exit(1);
  }

  const xml = await response.text();

  const rawItems = parseRssItems(xml);
  if (rawItems.length === 0) {
    console.error("No items found in RSS feed — aborting to avoid wiping blog.json");
    process.exit(1);
  }

  const posts = rawItems.slice(0, MAX_POSTS).map(transformItem);
  const newJson = JSON.stringify(posts, null, 2) + "\n";

  if (isDryRun) {
    console.log(newJson);
    console.log("(dry run — no file written)");
    process.exit(0);
  }

  let oldJson = "";
  try {
    oldJson = readFileSync(BLOG_JSON_PATH, "utf-8");
  } catch {
    // File doesn't exist yet
  }

  if (newJson === oldJson) {
    console.log("blog.json is already up to date — no changes needed");
    process.exit(0);
  }

  writeFileSync(BLOG_JSON_PATH, newJson, "utf-8");
  console.log(`Updated blog.json with ${posts.length} posts`);
}

main();
