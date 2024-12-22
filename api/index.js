import { sql } from '@vercel/postgres';

export default async function handler(request) {
  try {
    const path = new URL(request.url, 'http://localhost').pathname;
    const { searchParams } = new URL(request.url, 'http://localhost');

    // Базовый запрос для проверки подключения
    const { rows: [healthCheck] } = await sql`SELECT 1 as connected;`;
    if (!healthCheck?.connected) {
      throw new Error('Database connection failed');
    }
    
    // GET запросы
    if (request.method === 'GET') {
      // Оптимизированный список новелл - только необходимые данные
      if (path === '/api/novels') {
        const page = parseInt(searchParams.get('page')) || 1;
        const limit = parseInt(searchParams.get('limit')) || 10;
        const offset = (page - 1) * limit;

        // Используем единый запрос вместо нескольких
        const { rows: novels } = await sql`
          WITH novel_data AS (
            SELECT 
              n.id,
              n.title,
              n.description,
              n.status,
              n.translator_id,
              t.name as translator_name,
              COUNT(c.id)::int as total_chapters,
              COALESCE(
                (
                  SELECT json_agg(tags.name)
                  FROM novel_tags nt
                  JOIN tags ON tags.id = nt.tag_id
                  WHERE nt.novel_id = n.id
                ),
                '[]'::json
              ) as tags
            FROM novels n
            LEFT JOIN translators t ON t.id = n.translator_id
            LEFT JOIN chapters c ON c.novel_id = n.id
            GROUP BY n.id, n.title, n.description, n.status, n.translator_id, t.name
          )
          SELECT *,
            (SELECT COUNT(*)::int FROM novels) as total_count
          FROM novel_data
          ORDER BY id DESC
          LIMIT ${limit} 
          OFFSET ${offset}
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
              'Cache-Control': 'public, s-maxage=10'
            }
          });
        }

        return new Response(JSON.stringify({
          novels: novels.map(({ total_count, ...novel }) => novel),
          pagination: {
            total: novels[0].total_count,
            page,
            limit,
            pages: Math.ceil(novels[0].total_count / limit)
          }
        }), {
          headers: { 
            'Content-Type': 'application/json',
            'Cache-Control': 'public, s-maxage=10'
          }
        });
      }

      // Получение отдельной новеллы
      const novelMatch = path.match(/^\/api\/novels\/(\d+)$/);
      if (novelMatch) {
        const novelId = novelMatch[1];
        const userId = searchParams.get('userId');

        const { rows: [novel] } = await sql`
          WITH novel_data AS (
            SELECT 
              n.*,
              t.name as translator_name,
              COALESCE(
                (
                  SELECT json_agg(tags.name)
                  FROM novel_tags nt
                  JOIN tags ON tags.id = nt.tag_id
                  WHERE nt.novel_id = n.id
                ),
                '[]'::json
              ) as tags,
              COALESCE(
                (
                  SELECT json_agg(json_build_object(
                    'id', c.id,
                    'title', c.title,
                    'number', c.number
                  ) ORDER BY c.number)
                  FROM chapters c
                  WHERE c.novel_id = n.id
                ),
                '[]'::json
              ) as chapters
            FROM novels n
            LEFT JOIN translators t ON t.id = n.translator_id
            WHERE n.id = ${novelId}
          )
          SELECT 
            n.*,
            CASE WHEN nl.novel_id IS NOT NULL THEN true ELSE false END as user_has_liked
          FROM novel_data n
          LEFT JOIN novel_likes nl ON nl.novel_id = ${novelId} AND nl.user_id = ${userId}
        `;

        if (!novel) {
          return new Response('Not Found', { status: 404 });
        }

        return new Response(JSON.stringify(novel), {
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Получение главы
      const chapterMatch = path.match(/^\/api\/novels\/(\d+)\/chapters\/(\d+)$/);
      if (chapterMatch) {
        const [, novelId, chapterId] = chapterMatch;
        const userId = searchParams.get('userId');

        const { rows: [chapter] } = await sql`
          WITH chapter_data AS (
            SELECT 
              c.*,
              n.title as novel_title,
              t.name as translator_name,
              LAG(c.id) OVER (ORDER BY c.number) as prev_chapter,
              LEAD(c.id) OVER (ORDER BY c.number) as next_chapter
            FROM chapters c 
            JOIN novels n ON n.id = c.novel_id
            LEFT JOIN translators t ON t.id = n.translator_id
            WHERE c.novel_id = ${novelId}
          )
          SELECT 
            cd.*,
            CASE WHEN cl.chapter_id IS NOT NULL THEN true ELSE false END as user_has_liked
          FROM chapter_data cd
          LEFT JOIN chapter_likes cl ON cl.chapter_id = ${chapterId} AND cl.user_id = ${userId}
          WHERE cd.id = ${chapterId}
        `;

        if (!chapter) {
          return new Response('Not Found', { status: 404 });
        }

        return new Response(JSON.stringify(chapter), {
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Получение комментариев к главе
      const commentsMatch = path.match(/^\/api\/novels\/(\d+)\/chapters\/(\d+)\/comments$/);
      if (commentsMatch) {
        const [, novelId, chapterId] = commentsMatch;
        const page = parseInt(searchParams.get('page')) || 1;
        const limit = parseInt(searchParams.get('limit')) || 20;
        const offset = (page - 1) * limit;
        
        const { rows: comments } = await sql`
          SELECT 
            c.*,
            u.name as user_name,
            u.photo_url as user_photo
          FROM chapter_comments c
          JOIN users u ON u.id = c.user_id
          WHERE c.chapter_id = ${chapterId}
          ORDER BY c.created_at DESC
          LIMIT ${limit}
          OFFSET ${offset}
        `;

        const { rows: [{ total }] } = await sql`
          SELECT COUNT(*)::int as total 
          FROM chapter_comments 
          WHERE chapter_id = ${chapterId}
        `;

        return new Response(JSON.stringify({
          comments,
          pagination: {
            total,
            page,
            limit,
            pages: Math.ceil(total / limit)
          }
        }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Профиль переводчика
      const translatorMatch = path.match(/^\/api\/translators\/(\d+)$/);
      if (translatorMatch) {
        const [, translatorId] = translatorMatch;
        
        const { rows: [translator] } = await sql`
          WITH translator_data AS (
            SELECT 
              t.*,
              COUNT(DISTINCT n.id)::int as novels_count,
              COUNT(DISTINCT c.id)::int as pages_count,
              COALESCE(SUM(n.likes_count), 0)::int as likes_count,
              COALESCE(
                (
                  SELECT json_agg(
                    json_build_object(
                      'id', n.id,
                      'title', n.title,
                      'status', n.status,
                      'chapters_count', (
                        SELECT COUNT(*)::int 
                        FROM chapters 
                        WHERE novel_id = n.id
                      ),
                      'tags', (
                        SELECT json_agg(tags.name)
                        FROM novel_tags nt
                        JOIN tags ON tags.id = nt.tag_id
                        WHERE nt.novel_id = n.id
                      )
                    ) ORDER BY n.created_at DESC
                  ),
                  '[]'::json
                )
              ) as novels
            FROM translators t
            LEFT JOIN novels n ON n.translator_id = t.id
            LEFT JOIN chapters c ON c.novel_id = n.id
            WHERE t.id = ${translatorId}
            GROUP BY t.id
          )
          SELECT * FROM translator_data
        `;

        if (!translator) {
          return new Response('Not Found', { status: 404 });
        }

        return new Response(JSON.stringify(translator), {
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // POST запросы
    if (request.method === 'POST') {
      // Создание переводчика
      if (path === '/api/translators') {
        const { userId, name, description, photoUrl } = await request.json();

        // Проверяем существование пользователя
        const { rows: [user] } = await sql`
          SELECT id FROM users WHERE id = ${userId}
        `;

        // Если пользователь не существует, создаем его
        if (!user) {
          await sql`
            INSERT INTO users (id, name)
            VALUES (${userId}, ${name})
          `;
        }

        // Создаем профиль переводчика
        const { rows: [translator] } = await sql`
          INSERT INTO translators (name, description, photo_url, user_id)
          VALUES (${name}, ${description}, ${photoUrl}, ${userId})
          RETURNING *
        `;

        return new Response(JSON.stringify(translator), {
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Лайк новеллы
      const novelLikeMatch = path.match(/^\/api\/novels\/(\d+)\/like$/);
      if (novelLikeMatch) {
        const [, novelId] = novelLikeMatch;
        const { userId } = await request.json();

        // Используем транзакцию для атомарного обновления
        const result = await sql.begin(async (sql) => {
          // Проверяем существующий лайк
          const { rows: [existing] } = await sql`
            SELECT id FROM novel_likes 
            WHERE novel_id = ${novelId} AND user_id = ${userId}
          `;

          if (existing) {
            await sql`
              DELETE FROM novel_likes
              WHERE novel_id = ${novelId} AND user_id = ${userId}
            `;
            
            const { rows: [novel] } = await sql`
              UPDATE novels
              SET likes_count = likes_count - 1
              WHERE id = ${novelId}
              RETURNING likes_count
            `;
            
            return { 
              likes_count: novel.likes_count,
              is_liked: false 
            };
          } else {
            await sql`
              INSERT INTO novel_likes (novel_id, user_id)
              VALUES (${novelId}, ${userId})
            `;
            
            const { rows: [novel] } = await sql`
              UPDATE novels
              SET likes_count = likes_count + 1
              WHERE id = ${novelId}
              RETURNING likes_count
            `;
            
            return { 
              likes_count: novel.likes_count,
              is_liked: true 
            };
          }
        });

        return new Response(JSON.stringify(result), {
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Добавление комментария
      const commentCreateMatch = path.match(/^\/api\/novels\/(\d+)\/chapters\/(\d+)\/comments$/);
      if (commentCreateMatch) {
        const [, novelId, chapterId] = commentCreateMatch;
        const { userId, content } = await request.json();

        // Проверяем существование пользователя
        const { rows: [user] } = await sql`
          SELECT id FROM users WHERE id = ${userId}
        `;

        // Если пользователь не существует, создаем его
        if (!user) {
          await sql`
            INSERT INTO users (id, name)
            VALUES (${userId}, ${`User ${userId}`})
          `;
        }

        // Добавляем комментарий
        const { rows: [comment] } = await sql`
          WITH new_comment AS (
            INSERT INTO chapter_comments (chapter_id, user_id, content)
            VALUES (${chapterId}, ${userId}, ${content})
            RETURNING *
          )
          SELECT 
            nc.*,
            u.name as user_name,
            u.photo_url as user_photo
          FROM new_comment nc
          JOIN users u ON u.id = nc.user_id
        `;

        return new Response(JSON.stringify(comment), {
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // PUT запросы
    if (request.method === 'PUT') {
      // Обновление профиля переводчика
      const translatorUpdateMatch = path.match(/^\/api\/translators\/(\d+)$/);
      if (translatorUpdateMatch) {
        const [, translatorId] = translatorUpdateMatch;
        const { name, description } = await request.json();

        const { rows: [translator] } = await sql`
          UPDATE translators
          SET 
            name = ${name},
            description = ${description},
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ${translatorId}
          RETURNING *
        `;

        if (!translator) {
          return new Response('Not Found', { status: 404 });
        }

        return new Response(JSON.stringify(translator), {
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // DELETE запросы
    if (request.method === 'DELETE') {
      // Удаление комментария
      const commentDeleteMatch = path.match(/^\/api\/comments\/(\d+)$/);
      if (commentDeleteMatch) {
        const [, commentId] = commentDeleteMatch;
        const { userId } = await request.json();

        // Проверяем права на удаление и удаляем
        const { rows: [comment] } = await sql`
          DELETE FROM chapter_comments
          WHERE id = ${commentId} AND user_id = ${userId}
          RETURNING id
        `;

        if (!comment) {
          return new Response('Forbidden', { status: 403 });
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
      details: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
