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

        // Используем более простой запрос без лишних JOIN'ов
        const { rows: novels } = await sql`
          SELECT 
            n.id,
            n.title,
            n.status,
            n.translator_id,
            t.name as translator_name,
            (
              SELECT COUNT(*)::int 
              FROM chapters 
              WHERE novel_id = n.id
            ) as total_chapters
          FROM novels n
          LEFT JOIN translators t ON t.id = n.translator_id
          ORDER BY n.created_at DESC
          LIMIT ${limit} 
          OFFSET ${offset}
        `;

        // Загружаем общее количество для пагинации
        const { rows: [count] } = await sql`
          SELECT COUNT(*)::int as total FROM novels
        `;

        // Для каждой новеллы загружаем теги отдельным запросом
        const novelsWithTags = await Promise.all(
          novels.map(async (novel) => {
            const { rows: tags } = await sql`
              SELECT name
              FROM tags
              JOIN novel_tags ON tags.id = novel_tags.tag_id
              WHERE novel_tags.novel_id = ${novel.id}
            `;
            return {
              ...novel,
              tags: tags.map(t => t.name)
            };
          })
        );

        // Возвращаем результат с пагинацией
        return new Response(JSON.stringify({
          novels: novelsWithTags,
          pagination: {
            total: count.total,
            page,
            limit,
            pages: Math.ceil(count.total / limit)
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
          SELECT 
            n.*,
            t.name as translator_name,
            (
              SELECT json_agg(tags.name)
              FROM novel_tags nt
              JOIN tags ON tags.id = nt.tag_id
              WHERE nt.novel_id = n.id
            ) as tags,
            (
              SELECT json_agg(json_build_object(
                'id', c.id,
                'title', c.title,
                'number', c.number
              ))
              FROM chapters c
              WHERE c.novel_id = n.id
              ORDER BY c.number
            ) as chapters
          FROM novels n
          LEFT JOIN translators t ON t.id = n.translator_id
          WHERE n.id = ${novelId}
        `;

        if (!novel) {
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

        let userHasLiked = false;
        if (userId) {
          const { rows: [likeStatus] } = await sql`
            SELECT EXISTS (
              SELECT 1 FROM novel_likes
              WHERE novel_id = ${novelId} AND user_id = ${userId}
            ) as liked
          `;
          userHasLiked = likeStatus.liked;
        }

        return new Response(JSON.stringify({
          ...novel,
          user_has_liked: userHasLiked
        }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Получение главы
      const chapterMatch = path.match(/^\/api\/novels\/(\d+)\/chapters\/(\d+)$/);
      if (chapterMatch) {
        const [, novelId, chapterId] = chapterMatch;
        const userId = searchParams.get('userId');

        const { rows: [chapter] } = await sql`
          WITH chapter_navigation AS (
            SELECT 
              c.*,
              LAG(id) OVER w as prev_chapter,
              LEAD(id) OVER w as next_chapter
            FROM chapters c 
            WHERE novel_id = ${novelId}
            WINDOW w AS (ORDER BY number)
          )
          SELECT 
            cn.*,
            n.title as novel_title,
            t.name as translator_name
          FROM chapter_navigation cn
          JOIN novels n ON n.id = ${novelId}
          LEFT JOIN translators t ON t.id = n.translator_id
          WHERE cn.id = ${chapterId}
        `;

        if (!chapter) {
          return new Response('Not Found', { status: 404 });
        }

        let userHasLiked = false;
        if (userId) {
          const { rows: [likeStatus] } = await sql`
            SELECT EXISTS (
              SELECT 1 FROM chapter_likes
              WHERE chapter_id = ${chapterId} AND user_id = ${userId}
            ) as liked
          `;
          userHasLiked = likeStatus.liked;
        }

        return new Response(JSON.stringify({
          ...chapter,
          user_has_liked: userHasLiked
        }), {
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

        // Получаем общее количество комментариев
        const { rows: [count] } = await sql`
          SELECT COUNT(*)::int as total 
          FROM chapter_comments 
          WHERE chapter_id = ${chapterId}
        `;

        return new Response(JSON.stringify({
          comments,
          pagination: {
            total: count.total,
            page,
            limit,
            pages: Math.ceil(count.total / limit)
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
          SELECT 
            t.*,
            (
              SELECT COUNT(*)::int 
              FROM novels n 
              WHERE n.translator_id = t.id
            ) as novels_count,
            (
              SELECT COUNT(*)::int 
              FROM chapters c
              JOIN novels n ON n.id = c.novel_id
              WHERE n.translator_id = t.id
            ) as pages_count,
            (
              SELECT COALESCE(SUM(likes_count), 0)::int
              FROM novels
              WHERE translator_id = t.id
            ) as likes_count,
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
                    SELECT json_agg(t.name)
                    FROM novel_tags nt
                    JOIN tags t ON t.id = nt.tag_id
                    WHERE nt.novel_id = n.id
                  )
                )
                ORDER BY n.created_at DESC
              )
              FROM novels n
              WHERE n.translator_id = t.id
            ) as novels
          FROM translators t
          WHERE t.id = ${translatorId}
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
        const { rows: [result] } = await sql.begin(async (sql) => {
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
            
            return await sql`
              UPDATE novels
              SET likes_count = likes_count - 1
              WHERE id = ${novelId}
              RETURNING likes_count
            `;
          } else {
            await sql`
              INSERT INTO novel_likes (novel_id, user_id)
              VALUES (${novelId}, ${userId})
            `;
            
            return await sql`
              UPDATE novels
              SET likes_count = likes_count + 1
              WHERE id = ${novelId}
              RETURNING likes_count
            `;
          }
        });

        return new Response(JSON.stringify({
          likes_count: result.likes_count,
          is_liked: !existing
        }), {
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
      const commentDeleteMatch = path.match(/^\/api\/comments\/(\d+)$/);
      if (commentDeleteMatch) {
        const [, commentId] = commentDeleteMatch;
        const { userId } = await request.json();

        // Проверяем права на удаление
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
