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

        // Проверяем лайк пользователя, если userId предоставлен
        const { searchParams } = url;
        const userId = searchParams.get('userId');
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

        return respondJSON({
          ...rows[0],
          user_has_liked: userHasLiked
        });
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

      // Комментарии к главе
      const commentsMatch = path.match(/^\/api\/novels\/(\d+)\/chapters\/(\d+)\/comments$/);
      if (commentsMatch) {
        const [, novelId, chapterId] = commentsMatch;
        
        const { rows: comments } = await sql`
          SELECT 
            c.*,
            u.name as user_name,
            u.photo_url as user_photo
          FROM chapter_comments c
          JOIN users u ON u.id = c.user_id
          WHERE c.chapter_id = ${chapterId}
          ORDER BY c.created_at DESC;
        `;

        return respondJSON(comments);
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
            COALESCE(ts.likes_count, 0) as likes_count,
            COALESCE(
              (
                SELECT json_agg(
                  json_build_object(
                    'id', n.id,
                    'title', n.title,
                    'status', n.status,
                    'chapters_count', (SELECT COUNT(*) FROM chapters WHERE novel_id = n.id),
                    'tags', COALESCE(
                      (
                        SELECT json_agg(t.name)
                        FROM novel_tags nt
                        JOIN tags t ON t.id = nt.tag_id
                        WHERE nt.novel_id = n.id
                      ),
                      '[]'::json
                    )
                  )
                  ORDER BY n.created_at DESC
                )
                FROM novels n
                WHERE n.translator_id = t.id
              ),
              '[]'::json
            ) as novels
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
    // POST запросы
    if (request.method === 'POST') {
      // Создание новеллы
      if (path === '/api/novels') {
        const data = await request.json();
        
        // Создаем новеллу
        const { rows: [novel] } = await sql`
          INSERT INTO novels (
            title,
            description,
            status,
            translator_id
          ) VALUES (
            ${data.title},
            ${data.description},
            ${data.status},
            ${data.translator_id}
          )
          RETURNING *;
        `;

        // Добавляем теги
        if (data.tags?.length > 0) {
          for (const tagName of data.tags) {
            // Получаем или создаем тег
            const { rows: [tag] } = await sql`
              INSERT INTO tags (name)
              VALUES (${tagName})
              ON CONFLICT (name) DO UPDATE
              SET name = EXCLUDED.name
              RETURNING id;
            `;

            // Связываем тег с новеллой
            await sql`
              INSERT INTO novel_tags (novel_id, tag_id)
              VALUES (${novel.id}, ${tag.id})
              ON CONFLICT DO NOTHING;
            `;
          }
        }

        return respondJSON(novel);
      }

      // Создание главы
      const chapterCreateMatch = path.match(/^\/api\/novels\/(\d+)\/chapters$/);
      if (chapterCreateMatch) {
        const [, novelId] = chapterCreateMatch;
        const data = await request.json();
        
        const { rows: [chapter] } = await sql`
          INSERT INTO chapters (
            novel_id,
            number,
            title,
            content
          ) VALUES (
            ${novelId},
            ${data.number},
            ${data.title},
            ${data.content}
          )
          RETURNING *;
        `;

        return respondJSON(chapter);
      }

      // Добавление комментария
      const commentCreateMatch = path.match(/^\/api\/novels\/(\d+)\/chapters\/(\d+)\/comments$/);
      if (commentCreateMatch) {
        const [, novelId, chapterId] = commentCreateMatch;
        const data = await request.json();

        const { rows: [comment] } = await sql`
          INSERT INTO chapter_comments (
            chapter_id,
            user_id,
            content,
            created_at
          ) VALUES (
            ${chapterId},
            ${data.userId},
            ${data.content},
            CURRENT_TIMESTAMP
          )
          RETURNING *;
        `;

        // Получаем информацию о пользователе для ответа
        const { rows: [commentWithUser] } = await sql`
          SELECT 
            c.*,
            u.name as user_name,
            u.photo_url as user_photo
          FROM chapter_comments c
          JOIN users u ON u.id = c.user_id
          WHERE c.id = ${comment.id}
        `;

        return respondJSON(commentWithUser);
      }

      // Поставить/убрать лайк
      const likeMatch = path.match(/^\/api\/novels\/(\d+)\/like$/);
      if (likeMatch) {
        const [, novelId] = likeMatch;
        const data = await request.json();
        const userId = data.userId;

        // Проверяем существующий лайк
        const { rows: likes } = await sql`
          SELECT * FROM novel_likes
          WHERE novel_id = ${novelId} AND user_id = ${userId}
        `;

        if (likes.length > 0) {
          // Убираем лайк
          await sql`
            DELETE FROM novel_likes
            WHERE novel_id = ${novelId} AND user_id = ${userId}
          `;
          
          await sql`
            UPDATE novels
            SET likes_count = likes_count - 1
            WHERE id = ${novelId}
          `;
        } else {
          // Добавляем лайк
          await sql`
            INSERT INTO novel_likes (novel_id, user_id)
            VALUES (${novelId}, ${userId})
          `;
          
          await sql`
            UPDATE novels
            SET likes_count = likes_count + 1
            WHERE id = ${novelId}
          `;
        }

        // Возвращаем обновленное количество лайков
        const { rows: [novel] } = await sql`
          SELECT likes_count FROM novels WHERE id = ${novelId}
        `;

        return respondJSON({ 
          likes_count: novel.likes_count,
          is_liked: !likes.length
        });
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

     // Редактирование главы
     const chapterEditMatch = path.match(/^\/api\/novels\/(\d+)\/chapters\/(\d+)$/);
     if (chapterEditMatch) {
       const [, novelId, chapterId] = chapterEditMatch;
       const data = await request.json();
       
       const { rows: [chapter] } = await sql`
         UPDATE chapters
         SET
           title = ${data.title},
           content = ${data.content}
         WHERE id = ${chapterId} AND novel_id = ${novelId}
         RETURNING *;
       `;

       if (!chapter) {
         return new Response('Not Found', { status: 404 });
       }

       return respondJSON(chapter);
     }
   }

   // DELETE запросы
   if (request.method === 'DELETE') {
     // Удаление комментария
     const commentDeleteMatch = path.match(/^\/api\/comments\/(\d+)$/);
     if (commentDeleteMatch) {
       const [, commentId] = commentDeleteMatch;
       const data = await request.json();

       // Проверяем права на удаление
       const { rows: [comment] } = await sql`
         SELECT * FROM chapter_comments
         WHERE id = ${commentId} AND user_id = ${data.userId}
       `;

       if (!comment) {
         return new Response('Forbidden', { status: 403 });
       }

       await sql`
         DELETE FROM chapter_comments
         WHERE id = ${commentId}
       `;

       return new Response(null, { status: 204 });
     }
   }

   return new Response('Not Found', { status: 404 });
 } catch (error) {
   return handleError(error);
 }
}
