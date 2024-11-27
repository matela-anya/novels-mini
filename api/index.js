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
    const { searchParams } = url;
    
    // GET запросы
    if (request.method === 'GET') {
      // Оптимизированный список новелл
      if (path === '/api/novels') {
        const { rows } = await sql`
          WITH novel_stats AS (
            SELECT 
              novel_id,
              COUNT(*) as total_chapters
            FROM chapters
            GROUP BY novel_id
          ),
          novel_tag_list AS (
            SELECT 
              novel_id,
              json_agg(t.name) as tags
            FROM novel_tags nt
            JOIN tags t ON t.id = nt.tag_id
            GROUP BY novel_id
          )
          SELECT 
            n.id,
            n.title,
            n.description,
            n.status,
            n.translator_id,
            t.name as translator_name,
            n.likes_count,
            COALESCE(ns.total_chapters, 0) as total_chapters,
            COALESCE(ntl.tags, '[]'::json) as tags
          FROM novels n
          LEFT JOIN translators t ON t.id = n.translator_id
          LEFT JOIN novel_stats ns ON ns.novel_id = n.id
          LEFT JOIN novel_tag_list ntl ON ntl.novel_id = n.id
          ORDER BY n.created_at DESC
        `;
        return respondJSON(rows);
      }

      // Оптимизированная отдельная новелла
      const novelMatch = path.match(/^\/api\/novels\/(\d+)$/);
      if (novelMatch) {
        const novelId = novelMatch[1];
        const userId = searchParams.get('userId');

        const { rows } = await sql`
          WITH novel_chapters AS (
            SELECT 
              id,
              title,
              number,
              novel_id
            FROM chapters
            WHERE novel_id = ${novelId}
            ORDER BY number
          ),
          novel_tag_list AS (
            SELECT 
              json_agg(t.name) as tags
            FROM novel_tags nt
            JOIN tags t ON t.id = nt.tag_id
            WHERE novel_id = ${novelId}
          )
          SELECT 
            n.*,
            t.name as translator_name,
            COALESCE((SELECT tags FROM novel_tag_list), '[]'::json) as tags,
            COALESCE(
              (SELECT json_agg(json_build_object(
                'id', c.id,
                'title', c.title,
                'number', c.number
              ))
              FROM novel_chapters c),
              '[]'::json
            ) as chapters
          FROM novels n
          LEFT JOIN translators t ON t.id = n.translator_id
          WHERE n.id = ${novelId}
          GROUP BY n.id, t.id, t.name
        `;

        if (rows.length === 0) {
          return new Response('Not Found', { status: 404 });
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

        return respondJSON({
          ...rows[0],
          user_has_liked: userHasLiked
        });
      }

      // Глава новеллы
      const chapterMatch = path.match(/^\/api\/novels\/(\d+)\/chapters\/(\d+)$/);
      if (chapterMatch) {
        const [, novelId, chapterId] = chapterMatch;
        const userId = searchParams.get('userId');

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
            t.name as translator_name
          FROM chapter_info ci
          JOIN novels n ON n.id = ${novelId}
          LEFT JOIN translators t ON t.id = n.translator_id
          WHERE ci.id = ${chapterId}
        `;

        if (rows.length === 0) {
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

        return respondJSON({
          ...rows[0],
          user_has_liked: userHasLiked
        });
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
          ORDER BY c.created_at DESC
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
      // Создание переводчика
      if (path === '/api/translators') {
        const { userId, name, description, photoUrl } = await request.json();

        // Проверяем существование пользователя
        const { rows: userRows } = await sql`
          SELECT id FROM users WHERE id = ${userId}
          LIMIT 1
        `;

        // Если пользователь не существует, создаем его
        if (userRows.length === 0) {
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

        return respondJSON(translator);
      }

      // Лайк новеллы
      const novelLikeMatch = path.match(/^\/api\/novels\/(\d+)\/like$/);
      if (novelLikeMatch) {
        const [, novelId] = novelLikeMatch;
        const { userId } = await request.json();

        // Проверяем существующий лайк
        const { rows: likes } = await sql`
          SELECT * FROM novel_likes 
          WHERE novel_id = ${novelId} 
          AND user_id = ${userId}
          LIMIT 1
        `;

        if (likes.length > 0) {
          await sql`
            DELETE FROM novel_likes
            WHERE novel_id = ${novelId} 
            AND user_id = ${userId}
          `;
          
          await sql`
            UPDATE novels
            SET likes_count = likes_count - 1
            WHERE id = ${novelId}
          `;
        } else {
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

        const { rows: [novel] } = await sql`
          SELECT likes_count FROM novels WHERE id = ${novelId}
        `;

        return respondJSON({ 
          likes_count: novel.likes_count,
          is_liked: !likes.length
        });
      }

      // Добавление комментария
      const commentCreateMatch = path.match(/^\/api\/novels\/(\d+)\/chapters\/(\d+)\/comments$/);
      if (commentCreateMatch) {
        const [, novelId, chapterId] = commentCreateMatch;
        const { userId, content } = await request.json();

        // Проверяем существование пользователя
        const { rows: userRows } = await sql`
          SELECT id FROM users WHERE id = ${userId}
          LIMIT 1
        `;

        // Если пользователь не существует, создаем его
        if (userRows.length === 0) {
          await sql`
            INSERT INTO users (id, name)
            VALUES (${userId}, ${`User ${userId}`})
          `;
        }

        // Добавляем комментарий
        const { rows: [comment] } = await sql`
          INSERT INTO chapter_comments (chapter_id, user_id, content)
          VALUES (${chapterId}, ${userId}, ${content})
          RETURNING *
        `;

        // Получаем информацию о пользователе
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
            description = ${description}
          WHERE id = ${translatorId}
          RETURNING *
        `;

        if (!translator) {
          return new Response('Not Found', { status: 404 });
        }

        return respondJSON(translator);
      }
    }

    // DELETE запросы
    if (request.method === 'DELETE') {
      const data = await request.json();

      // Удаление комментария
      const commentDeleteMatch = path.match(/^\/api\/comments\/(\d+)$/);
      if (commentDeleteMatch) {
        const [, commentId] = commentDeleteMatch;

        // Проверяем права на удаление
        const { rows: [comment] } = await sql`
          SELECT * FROM chapter_comments
          WHERE id = ${commentId} 
          AND user_id = ${data.userId}
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
