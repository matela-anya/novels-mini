import { sql } from '@vercel/postgres';

export const config = {
  runtime: 'edge',
};

// Вспомогательные функции
const handleError = (error) => {
  console.error('API Error:', error);
  return new Response(
    JSON.stringify({ 
      error: 'Internal Server Error', 
      details: error.message 
    }), 
    {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    }
  );
};

const respondJSON = (data) => {
  return new Response(
    JSON.stringify(data),
    { headers: { 'Content-Type': 'application/json' } }
  );
};

// Обработчики запросов
const getNovelsList = async () => {
  const { rows } = await sql`
    SELECT 
      n.id,
      n.title,
      n.translator,
      n.status,
      COUNT(c.id) as total_chapters,
      COALESCE(
        (
          SELECT json_agg(t.name)
          FROM novel_tags nt
          JOIN tags t ON t.id = nt.tag_id
          WHERE nt.novel_id = n.id
        ),
        '[]'::json
      ) as tags
    FROM novels n
    LEFT JOIN chapters c ON c.novel_id = n.id
    GROUP BY n.id
    ORDER BY n.created_at DESC;
  `;
  return rows;
};

const getNovel = async (id) => {
  const { rows } = await sql`
    SELECT 
      n.*,
      COALESCE(
        (
          SELECT json_agg(t.name)
          FROM novel_tags nt
          JOIN tags t ON t.id = nt.tag_id
          WHERE nt.novel_id = n.id
        ),
        '[]'::json
      ) as tags,
      COALESCE(
        (
          SELECT json_agg(
            json_build_object(
              'id', c.id,
              'title', c.title,
              'number', c.number
            ) ORDER BY c.number
          )
          FROM chapters c
          WHERE c.novel_id = n.id
        ),
        '[]'::json
      ) as chapters
    FROM novels n
    WHERE n.id = ${id}
    GROUP BY n.id;
  `;
  return rows[0];
};

const getChapter = async (novelId, chapterId) => {
  const { rows } = await sql`
    WITH chapter_info AS (
      SELECT 
        c.*,
        LAG(id) OVER (ORDER BY number) as prev_chapter,
        LEAD(id) OVER (ORDER BY number) as next_chapter
      FROM chapters c 
      WHERE novel_id = ${novelId}
    )
    SELECT 
      ci.*,
      n.title as novel_title,
      n.translator
    FROM chapter_info ci
    JOIN novels n ON n.id = ${novelId}
    WHERE ci.id = ${chapterId};
  `;
  return rows[0];
};

export default async function handler(request) {
  try {
    const url = new URL(request.url);
    const path = url.pathname;

    // GET запросы
    if (request.method === 'GET') {
      // Список новелл
      if (path === '/api/novels') {
        const novels = await getNovelsList();
        return respondJSON(novels);
      }

      // Отдельная новелла
      const novelMatch = path.match(/^\/api\/novels\/(\d+)$/);
      if (novelMatch) {
        const novel = await getNovel(novelMatch[1]);
        if (!novel) return new Response('Not Found', { status: 404 });
        return respondJSON(novel);
      }

      // Глава новеллы
      const chapterMatch = path.match(/^\/api\/novels\/(\d+)\/chapters\/(\d+)$/);
      if (chapterMatch) {
        const [, novelId, chapterId] = chapterMatch;
        const chapter = await getChapter(novelId, chapterId);
        if (!chapter) return new Response('Not Found', { status: 404 });
        return respondJSON(chapter);
      }
    }

    // POST запросы (будут добавлены позже)
    if (request.method === 'POST') {
      // TODO: Добавление новелл/глав
    }

    return new Response('Not Found', { status: 404 });
  } catch (error) {
    return handleError(error);
  }
}
