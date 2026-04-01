# MangaBuddy.com Runner

This runner supports **MangaBuddy.com** (https://mangabuddy.com). It implements full manga reading capabilities: catalog, search, details, chapters, and page reading.

## Features

- Catalog: Browse popular/latest manga
- Search: Search by keyword
- Details: Title, cover, summary, authors, status
- Chapters: List with dates and numbers
- Pages: Full chapter reading with image loading

## Configuration

### Setup
1. In your Daisuke client, add a new source/runner
2. Select **MangaBuddy.com** from the list
3. Configure:
   - **Base URL**: `https://mangabuddy.com` (default)
   - **Cookie** (optional): Required if site has Cloudflare protection
   - **User-Agent** (optional): Custom user agent string

### Preferences
- Cookie and User-Agent can be configured at any time in the runner preferences

## Testing

### Build
```bash
npm run build
# or
daisuke build
```

### Manual Test Script
Create a quick test file:

```typescript
import { Target } from "./src/runners/mangabuddy";
import { ObjectStore } from "@suwatte/daisuke";

async function test() {
  // Setup store
  await ObjectStore.set("mangabuddy_baseUrl", "https://mangabuddy.com");

  // Test catalog
  const catalog = await Target.getDirectory({});
  console.log("Catalog items:", catalog.results.slice(0, 5));

  // Test details (use first item)
  const detail = await Target.getContent(catalog.results[0].id);
  console.log("Detail:", detail.title, detail.summary?.substring(0, 100));

  // Test chapters
  const chapters = await Target.getChapters(catalog.results[0].id);
  console.log("Chapters:", chapters.length, chapters[0]);

  // Test pages
  const chapterData = await Target.getChapterData(catalog.results[0].id, chapters[0].chapterId);
  console.log("Pages:", chapterData.pages.length);
}
test().catch(console.error);
```

## Troubleshooting

- **Blocked by anti-bot**: Set a valid cookie (cf_clearance) in preferences
- **No results**: Check Base URL is correct and accessible
- **No pages**: Site structure may have changed; check browser DevTools for image selectors

## Notes

Based on the MadTheme template from Tachiyomi. Supports both HTML and API-based chapter fetching for completeness.
