# MangaBuddy.me Runner

This runner supports **MangaBuddy.me** (https://mangabuddy.me). It is a separate implementation from MangaBuddy.com as the content and structure differ.

## Features

- Catalog: Browse popular/latest manga
- Search: Search by keyword
- Details: Title, cover, summary, authors, status
- Chapters: List with dates and numbers
- Pages: Full chapter reading

## Configuration

### Setup
1. In your Daisuke client, add a new source/runner
2. Select **MangaBuddy.me** from the list
3. Configure:
   - **Base URL**: `https://mangabuddy.me` (default)
   - **Cookie** (optional): For Cloudflare bypass
   - **User-Agent** (optional): Custom UA string

## Testing

Same as MangaBuddy.com runner, but with `mangabuddyme` base URL.

## Differences from MangaBuddy.com

- Different domain (.me vs .com)
- May have different HTML structure and selectors
- Separate store keys to avoid configuration conflicts
