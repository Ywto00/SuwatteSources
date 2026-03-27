import { Chapter } from "@suwatte/daisuke";
import { graphqlRequest } from "./request";
import {
  MangaType,
  ChapterType,
  MangaNodeList,
  ChapterNodeList,
  SortOrder,
} from "../types";
import { RESULT_COUNT, FilterItems, chapterToChapter, getHost } from "../utils";

/**
 * Get all mangas in library
 */
export const getMangasInLibrary = async (
  orderBy = "IN_LIBRARY_AT",
  orderByType = SortOrder.DESC,
  page = 1,
  filters: FilterItems = {}
): Promise<MangaType[]> => {
  const query = `
    query GetMangas($condition: MangaConditionInput, $filter: MangaFilterInput, $orderBy: MangaOrderBy, $orderByType: SortOrder, $offset: Int, $limit: Int) {
      mangas(condition: $condition, filter: $filter, orderBy: $orderBy, orderByType: $orderByType, offset: $offset, first: $limit) {
        nodes {
          id
          title
          thumbnailUrl
          unreadCount
          downloadCount
          bookmarkCount
          status
          inLibrary
          inLibraryAt
          genre
          author
          artist
          description
          chapters {
            totalCount
          }
        }
        totalCount
      }
    }
  `;

  // Build filter object for GraphQL
  const filterObj: any = {};

  // Handle manga status filter
  if (filters.status && filters.status.length > 0) {
    filterObj.status = {
      in: filters.status,
    };
  }

  const variables = {
    condition: {
      inLibrary: true,
    },
    filter: Object.keys(filterObj).length > 0 ? filterObj : undefined,
    orderBy,
    orderByType,
    offset: (page - 1) * RESULT_COUNT,
    limit: RESULT_COUNT,
  };

  const data = await graphqlRequest<{ mangas: MangaNodeList }>(
    query,
    variables
  );

  return data.mangas.nodes;
};

/**
 * Get manga by ID
 */
export const getManga = async (id: number): Promise<MangaType> => {
  const query = `
    query GetManga($id: Int!) {
      manga(id: $id) {
        id
        title
        thumbnailUrl
        url
        artist
        author
        description
        genre
        status
        inLibrary
        inLibraryAt
        unreadCount
        downloadCount
        bookmarkCount
        chapters {
          nodes {
            id
            chapterNumber
            name
            isRead
            isBookmarked
            isDownloaded
            pageCount
            lastPageRead
            uploadDate
          }
          totalCount
        }
        categories {
          nodes {
            id
            name
          }
        }
        source {
          id
          name
          displayName
        }
        trackRecords {
          nodes {
            remoteId
            remoteUrl
            tracker {
              id
              name
            }
          }
        }
      }
    }
  `;

  const data = await graphqlRequest<{ manga: MangaType }>(query, { id });
  return data.manga;
};

/**
 * Get chapters for a manga
 */
export const getChaptersForManga = async (
  mangaId: number
): Promise<ChapterType[]> => {
  const query = `
    query GetChapters($mangaId: Int!) {
      chapters(condition: { mangaId: $mangaId }, orderBy: SOURCE_ORDER, orderByType: DESC) {
        nodes {
          id
          chapterNumber
          name
          mangaId
          isRead
          isBookmarked
          isDownloaded
          pageCount
          lastPageRead
          lastReadAt
          uploadDate
          scanlator
          url
          sourceOrder
        }
        totalCount
      }
    }
  `;

  const data = await graphqlRequest<{ chapters: ChapterNodeList }>(query, {
    mangaId,
  });
  return data.chapters.nodes;
};

/**
 * Get chapters for manga as Chapter objects
 */
export const getChaptersForMangaAsChapters = async (
  mangaId: number
): Promise<Chapter[]> => {
  const chapters = await getChaptersForManga(mangaId);

  const items: Chapter[] = chapters.map((chapter, idx) =>
    chapterToChapter(chapter, idx)
  );

  return items;
};

/**
 * Get chapter pages
 */
export const getChapterPages = async (
  mangaId: number,
  chapterId: number
): Promise<string[]> => {
  const query = `
    query GetChapter($id: Int!) {
      chapter(id: $id) {
        id
        sourceOrder
        pageCount
      }
    }
  `;

  const data = await graphqlRequest<{ chapter: ChapterType }>(query, {
    id: chapterId,
  });
  const pageCount = data.chapter.pageCount;
  const sourceOrder = data.chapter.sourceOrder;

  const host = await getHost();
  const pages: string[] = [];
  for (let i = 0; i < pageCount; i++) {
    const pageUrl = `${host}/api/v1/manga/${mangaId}/chapter/${sourceOrder}/page/${i}`;
    pages.push(pageUrl);
  }

  return pages;
};

/**
 * Search mangas
 */
export const searchMangas = async (
  query: string,
  page = 1,
  filters: FilterItems = {}
): Promise<MangaType[]> => {
  const gqlQuery = `
    query SearchMangas($condition: MangaConditionInput, $filter: MangaFilterInput, $offset: Int, $limit: Int) {
      mangas(condition: $condition, filter: $filter, offset: $offset, first: $limit) {
        nodes {
          id
          title
          thumbnailUrl
          unreadCount
          downloadCount
          status
          inLibrary
          genre
          chapters {
            totalCount
          }
        }
        totalCount
      }
    }
  `;

  // Build filter object for GraphQL
  const filterObj: any = {
    title: {
      like: `%${query}%`,
    },
  };

  // Handle manga status filter
  if (filters.status && filters.status.length > 0) {
    filterObj.status = {
      in: filters.status,
    };
  }

  const variables = {
    condition: {
      inLibrary: true,
    },
    filter: filterObj,
    offset: (page - 1) * RESULT_COUNT,
    limit: RESULT_COUNT,
  };

  const data = await graphqlRequest<{ mangas: MangaNodeList }>(
    gqlQuery,
    variables
  );

  return data.mangas.nodes;
};
