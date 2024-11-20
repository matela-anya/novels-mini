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

export default async function handler(request) {
  try {
    const url = new URL(request.url);
    const path = url.pathname;

    // GET запросы
    if (request.method === 'GET') {
      // Список новелл
      if (path === '/api/novels') {
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
        return respondJSON(rows);
      }

      // Отдельная новелла
      const novelMatch = path.match(/^\/api\/novels\/(\d+)$/);
      if (novelMatch) {
        const [, novelId] = novelMatch[1];
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
          WHERE n.id = ${novelId}
          GROUP BY n.id;
        `;
        if (rows.length === 0) {
          return new Response('Not Found', { status: 404 });
        }
        return respondJSON(rows[0]);
      }

      // Глава новеллы
      const chapterMatch = path.match(/^\/api\/novels\/(\d+)\/chapters\/(\d+)$/);
      if (chapterMatch) {
        const [, novelId, chapterId] = chapterMatch;
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
        if (rows.length === 0) {
          return new Response('Not Found', { status: 404 });
        }
        return respondJSON(rows[0]);
      }

      // Профиль переводчика
      const translatorMatch = path.match(/^\/api\/translators\/(\d+)$/);
      if (translatorMatch) {
        const [, translatorId] = translatorMatch;
        const { rows } = await sql`
          WITH translator_stats AS (
            SELECT 
              translator_id,
              COUNT(DISTINCT n.id) as novels_count,
              COUNT(DISTINCT c.id) as pages_count,
              SUM(n.likes_count) as likes_count
            FROM novels n
            LEFT JOIN chapters c ON c.novel_id = n.id
            WHERE translator_id = ${translatorId}
            GROUP BY translator_id
          )
          SELECT 
            t.*,
            COALESCE(ts.novels_count, 0) as novels_count,
            COALESCE(ts.pages_count, 0) as pages_count,
            COALESCE(ts.likes_count, 0) as likes_count
          FROM translators t
          LEFT JOIN translator_stats ts ON ts.translator_id = t.id
          WHERE t.id = ${translatorId};
        `;
        if (rows.length === 0) {
          return new Response('Not Found', { status: 404 });
        }
        return respondJSON(rows[0]);
      }
    }

    // PUT запросы
    if (request.method === 'PUT') {
      // Обновление профиля переводчика
      const translatorMatch = path.match(/^\/api\/translators\/(\d+)$/);
      if (translatorMatch) {
        const [, translatorId] = translatorMatch;
        const data = await request.json();
        
        const { rows } = await sql`
          UPDATE translators 
          SET 
            name = ${data.name},
            description = ${data.description}
          WHERE id = ${translatorId}
          RETURNING *;
        `;
        if (rows.length === 0) {
          return new Response('Not Found', { status: 404 });
        }
        return respondJSON(rows[0]);
      }
    }

    return new Response('Not Found', { status: 404 });
  } catch (error) {
    return handleError(error);
  }
}
