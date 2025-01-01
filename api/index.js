import { sql } from '@vercel/postgres';

export default async function handler(request) {
  try {
    const path = new URL(request.url, 'http://localhost').pathname;
    const { searchParams } = new URL(request.url, 'http://localhost');

    // GET запросы
    if (request.method === 'GET') {
      // Список новелл с оптимизированным запросом
      if (path === '/api/novels') {
        const page = parseInt(searchParams.get('page')) || 1;
        const limit = parseInt(searchParams.get('limit')) || 10;
        const offset = (page - 1) * limit;

        const { rows: novels } = await sql`
          SELECT 
            n.id,
            n.title,
            n.description,
            n.status,
            n.translator_id,
            t.name as translator_name,
            COUNT(c.id) as chapter_count,
            COALESCE(ARRAY_AGG(DISTINCT tags.name) FILTER (WHERE tags.id IS NOT NULL), ARRAY[]::text[]) as tags
          FROM novels n
          LEFT JOIN translators t ON t.id = n.translator_id
          LEFT JOIN chapters c ON c.novel_id = n.id
          LEFT JOIN novel_tags nt ON nt.novel_id = n.id
          LEFT JOIN tags ON tags.id = nt.tag_id
          GROUP BY 
            n.id, n.title, n.description, n.status, 
            n.translator_id, t.name
          ORDER BY n.id DESC
          LIMIT ${limit}
          OFFSET ${offset};
        `;

        if (!novels[0]) {
          return new Response(JSON.stringify({
            novels: [],
            pagination: {
              total: 0,
              page,
              limit,
              pages: 0
            }
          }), {
            headers: {
              'Content-Type': 'application/json',
              'Cache-Control': 'public, max-age=10, s-maxage=60'
            }
          });
        }

        const result = {
          novels: novels.map(({ tags, ...novel }) => ({
            ...novel,
            tags: tags || []
          })),
          pagination: {
            total: novels.length,
            page,
            limit,
            pages: Math.ceil(novels.length / limit)
          }
        };

        return new Response(JSON.stringify(result), {
          headers: { 
            'Content-Type': 'application/json',
            'Cache-Control': 'public, max-age=10, s-maxage=60'
          }
        });
      }

      // Получение отдельной новеллы
      const novelMatch = path.match(/^\/api\/novels\/(\d+)$/);
      if (novelMatch) {
        const novelId = novelMatch[1];
        const userId = searchParams.get('userId');

        const { rows: [novel] } = await sql`
          SELECT 
            n.*,
            t.name as translator_name,
            COALESCE(ARRAY_AGG(DISTINCT tags.name), ARRAY[]::text[]) as tags,
            (
              SELECT COALESCE(json_agg(
                json_build_object(
                  'id', c.id,
                  'title', c.title,
                  'number', c.number
                ) ORDER BY c.number
              ), '[]'::json)
              FROM chapters c
              WHERE c.novel_id = n.id
            ) as chapters,
            EXISTS(
              SELECT 1 FROM novel_likes nl 
              WHERE nl.novel_id = n.id AND nl.user_id = ${userId}
            ) as user_has_liked
          FROM novels n
          LEFT JOIN translators t ON t.id = n.translator_id
          LEFT JOIN novel_tags nt ON nt.novel_id = n.id
          LEFT JOIN tags ON tags.id = nt.tag_id
          WHERE n.id = ${novelId}
          GROUP BY n.id, t.name;
        `;

        if (!novel) {
          return new Response('Not Found', { status: 404 });
        }

        return new Response(JSON.stringify(novel), {
          headers: { 
            'Content-Type': 'application/json',
            'Cache-Control': 'public, max-age=10, s-maxage=60'
          }
        });
      }

      // Получение главы
      const chapterMatch = path.match(/^\/api\/novels\/(\d+)\/chapters\/(\d+)$/);
      if (chapterMatch) {
        const [, novelId, chapterId] = chapterMatch;
        const userId = searchParams.get('userId');

        const { rows: [chapter] } = await sql`
          SELECT 
            c.*,
            n.title as novel_title,
            t.name as translator_name,
            LAG(c.id) OVER w as prev_chapter,
            LEAD(c.id) OVER w as next_chapter,
            EXISTS(
              SELECT 1 FROM chapter_likes cl 
              WHERE cl.chapter_id = c.id AND cl.user_id = ${userId}
            ) as user_has_liked
          FROM chapters c
          JOIN novels n ON n.id = c.novel_id
          LEFT JOIN translators t ON t.id = n.translator_id
          WHERE c.novel_id = ${novelId} AND c.id = ${chapterId}
          WINDOW w AS (ORDER BY c.number);
        `;

        if (!chapter) {
          return new Response('Not Found', { status: 404 });
        }

        return new Response(JSON.stringify(chapter), {
          headers: { 
            'Content-Type': 'application/json',
            'Cache-Control': 'private, max-age=0'
          }
        });
      }

      // Профиль переводчика
      const translatorMatch = path.match(/^\/api\/translators\/(\d+)$/);
      if (translatorMatch) {
        const [, translatorId] = translatorMatch;

        const { rows: [translator] } = await sql`
          SELECT 
            t.*, 
            COUNT(DISTINCT n.id) as novels_count, 
            COALESCE(SUM(n.likes_count), 0) as total_likes
          FROM translators t
          LEFT JOIN novels n ON n.translator_id = t.id
          WHERE t.id = ${translatorId}
          GROUP BY t.id;
        `;

        if (!translator) {
          return new Response('Not Found', { status: 404 });
        }

        return new Response(JSON.stringify(translator), {
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'public, max-age=30, s-maxage=300'
          }
        });
      }
    }

    // POST запросы
    if (request.method === 'POST') {
      if (path === '/api/translators') {
        const { userId, name, description, photoUrl } = await request.json();

        const { rows: [translator] } = await sql`
          INSERT INTO translators (user_id, name, description, photo_url)
          VALUES (${userId}, ${name}, ${description}, ${photoUrl})
          RETURNING *;
        `;

        return new Response(JSON.stringify(translator), {
          headers: {
            'Content-Type': 'application/json'
          },
          status: 201
        });
      }
    }

    // PUT запросы
    if (request.method === 'PUT') {
      const translatorUpdateMatch = path.match(/^\/api\/translators\/(\d+)$/);
      if (translatorUpdateMatch) {
        const [, translatorId] = translatorUpdateMatch;
        const { name, description } = await request.json();

        const { rows: [translator] } = await sql`
          UPDATE translators
          SET name = ${name}, description = ${description}
          WHERE id = ${translatorId}
          RETURNING *;
        `;

        if (!translator) {
          return new Response('Not Found', { status: 404 });
        }

        return new Response(JSON.stringify(translator), {
          headers: {
            'Content-Type': 'application/json'
          }
        });
      }
    }

    // DELETE запросы
    if (request.method === 'DELETE') {
      const commentDeleteMatch = path.match(/^\/api\/comments\/(\d+)$/);
      if (commentDeleteMatch) {
        const [, commentId] = commentDeleteMatch;

        const { rows: [comment] } = await sql`
          DELETE FROM chapter_comments
          WHERE id = ${commentId}
          RETURNING id;
        `;

        if (!comment) {
          return new Response('Not Found', { status: 404 });
        }

        return new Response(null, { status: 204 });
      }
    }

    // Если не найден подходящий маршрут
    return new Response('Not Found', { status: 404 });

  } catch (error) {
    console.error('API Error:', error);
    return new Response(JSON.stringify({
      error: 'Internal Server Error',
      details: error.message,
      stack: error.stack
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
