# Webtoons.com Runner

This runner supports **Webtoons.com** (https://www.webtoons.com). It uses the mobile API for robust chapter fetching and supports multiple languages.

## Features

- Catalog: Browse trending, popular, originals, canvas
- Search: Search by keyword with filters
- Details: Title, cover, summary, creators, status
- Chapters: Via mobile API with proper dates
- Pages: Image list with quality cleaning
- Multi-language: Support for various locales (en, es, fr, de, etc.)

## Configuration

### Setup
1. Add new source/runner in Daisuke
2. Select **Webtoons.com**
3. Configure:
   - **Base URL**: `https://www.webtoons.com` (default)
   - **Cookie** (optional): `NEO_SES=...; ageGatePass=true; locale=en`
   - **User-Agent** (optional): Custom UA

### Notes
- Age gate cookie (`ageGatePass=true`) may be needed for mature content
- Locale cookie (`locale=en`) affects language of content

## Testing

```typescript
import { Target } from "./src/runners/webtoons";
import { ObjectStore } from "@suwatte/daisuke";

async function test() {
  await ObjectStore.set("webtoons_baseUrl", "https://www.webtoons.com");

  // Catalog (ranking pages)
  const catalog = await Target.getDirectory({});
  console.log("Catalog:", catalog.results.slice(0, 5));

  // Details
  const detail = await Target.getContent(catalog.results[0].id);
  console.log("Detail:", detail.title, detail.status);

  // Chapters (via mobile API)
  const chapters = await Target.getChapters(catalog.results[0].id);
  console.log("Chapters:", chapters.length, chapters[0]);

  // Pages
  const chapterData = await Target.getChapterData(catalog.results[0].id, chapters[0].chapterId);
  console.log("Pages:", chapterData.pages.length);
}
test().catch(console.error);
```

## Architecture

Based on Tachiyomi's all/webtoons extension:
- Uses mobile API (`m.webtoons.com/api/v1`) for chapters
- Handles both webtoon and canvas types
- Proper episode number parsing and season handling (simplified here)

## Troubleshooting

- **No chapters**: Ensure title_no is present in URL or HTML
- **Blocked**: Set proper cookies including `ageGatePass`
- **Missing images**: Check viewer page structure for image containers
