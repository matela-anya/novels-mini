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

        // Оптимизированный запрос с материализованным CTE
        const { rows: novels } = await sql`
          WITH MATERIALIZED counts AS (
            SELECT 
              n.id as novel_id,
              COUNT(c.id)::int as chapter_count
            FROM novels n
            LEFT JOIN chapters c ON c.novel_id = n.id
            GROUP BY n.id
          ),
          novel_with_tags AS (
            SELECT 
              n.id,
              n.title,
              n.description,
              n.status,
              n.translator_id,
              t.name as translator_name,
              counts.chapter_count as total_chapters,
              COALESCE(
                STRING_AGG(tags.name, ','),
                ''
              ) as tags_string
            FROM novels n
            LEFT JOIN translators t ON t.id = n.translator_id
            LEFT JOIN counts ON counts.novel_id = n.id
            LEFT JOIN novel_tags nt ON nt.novel_id = n.id
            LEFT JOIN tags ON tags.id = nt.tag_id
            GROUP BY 
              n.id, n.title, n.description, n.status,
              n.translator_id, t.name, counts.chapter_count
          ),
          total_count AS (
            SELECT COUNT(*)::int as count FROM novels
          )
          SELECT 
            nwt.*,
            CASE 
              WHEN nwt.tags_string = '' THEN '[]'::json
              ELSE ARRAY_TO_JSON(STRING_TO_ARRAY(nwt.tags_string, ','))
            END as tags,
            tc.count as total_count
          FROM novel_with_tags nwt, total_count tc
          ORDER BY nwt.id DESC
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
              'Cache-Control': 'public, max-age=10, s-maxage=60'
            }
          });
        }

        const result = {
          novels: novels.map(({ total_count, tags_string, ...novel }) => ({
            ...novel,
            tags: novel.tags || []
          })),
          pagination: {
            total: novels[0].total_count,
            page,
            limit,
            pages: Math.ceil(novels[0].total_count / limit)
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
            (
              SELECT COALESCE(json_agg(DISTINCT tags.name), '[]'::json)
              FROM novel_tags nt
              JOIN tags ON tags.id = nt.tag_id
              WHERE nt.novel_id = n.id
            ) as tags,
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
          WHERE n.id = ${novelId}
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
          WINDOW w AS (ORDER BY c.number)
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

      // Получение комментариев к главе
      const commentsMatch = path.match(/^\/api\/novels\/(\d+)\/chapters\/(\d+)\/comments$/);
      if (commentsMatch) {
        const [, , chapterId] = commentsMatch;
        const page = parseInt(searchParams.get('page')) || 1;
        const limit = parseInt(searchParams.get('limit')) || 20;
        const offset = (page - 1) * limit;
        
        const { rows } = await sql`
          WITH comment_data AS (
            SELECT 
              c.*,
              u.name as user_name,
              u.photo_url as user_photo,
              COUNT(*) OVER() as total_count
            FROM chapter_comments c
            JOIN users u ON u.id = c.user_id
            WHERE c.chapter_id = ${chapterId}
            ORDER BY c.created_at DESC
            LIMIT ${limit}
            OFFSET ${offset}
          )
          SELECT * FROM comment_data
        `;

        const comments = rows.map(({ total_count, ...comment }) => comment);
        const total = rows[0]?.total_count || 0;

        return new Response(JSON.stringify({
          comments,
          pagination: {
            total,
            page,
            limit,
            pages: Math.ceil(total / limit)
          }
        }), {
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
          WITH translator_stats AS (
            SELECT 
              t.*,
              COUNT(DISTINCT n.id) as novels_count,
              COUNT(DISTINCT c.id) as pages_count,
              COALESCE(SUM(n.likes_count), 0) as likes_count
            FROM translators t
            LEFT JOIN novels n ON n.translator_id = t.id
            LEFT JOIN chapters c ON c.novel_id = n.id
            WHERE t.id = ${translatorId}
            GROUP BY t.id
          ),
          translator_novels AS (
            SELECT json_agg(novel_data) as novels
            FROM (
              SELECT 
                n.id,
                n.title,
                n.status,
                (SELECT COUNT(*) FROM chapters WHERE novel_id = n.id) as chapters_count,
                (
                  SELECT COALESCE(json_agg(tags.name), '[]'::json)
                  FROM novel_tags nt
                  JOIN tags ON tags.id = nt.tag_id
                  WHERE nt.novel_id = n.id
                ) as tags
              FROM novels n
              WHERE n.translator_id = ${translatorId}
              ORDER BY n.created_at DESC
            ) novel_data
          )
          SELECT 
            ts.*,
            COALESCE(tn.novels, '[]'::json) as novels
          FROM translator_stats ts
          LEFT JOIN translator_novels tn ON true
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

    // POST, PUT, DELETE запросы остаются без изменений
    // ... [предыдущий код для POST, PUT, DELETE]

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

// POST запросы
if (request.method === 'POST') {
  // Создание переводчика
  if (path === '/api/translators') {
    const { userId, name, description, photoUrl } = await request.json();

    const { rows: [translator] } = await sql.begin(async (sql) => {
      // Создаем пользователя если не существует и сразу создаем переводчика
      const result = await sql`
        WITH user_data AS (
          INSERT INTO users (id, name)
          VALUES (${userId}, ${name})
          ON CONFLICT (id) DO NOTHING
          RETURNING id
        )
        INSERT INTO translators (name, description, photo_url, user_id)
        SELECT ${name}, ${description}, ${photoUrl}, ${userId}
        WHERE EXISTS (SELECT 1 FROM user_data)
           OR EXISTS (SELECT 1 FROM users WHERE id = ${userId})
        RETURNING *
      `;
      
      return result;
    });

    return new Response(JSON.stringify(translator), {
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store'
      }
    });
  }

  // Создание новеллы
  if (path === '/api/novels') {
    const { title, description, status, translatorId, tags } = await request.json();

    const { rows: [novel] } = await sql.begin(async (sql) => {
      // Создаем новеллу и связываем с тегами в одной транзакции
      const { rows: [newNovel] } = await sql`
        INSERT INTO novels (title, description, status, translator_id)
        VALUES (${title}, ${description}, ${status}, ${translatorId})
        RETURNING *
      `;

      if (tags && tags.length > 0) {
        // Получаем или создаем теги одним запросом
        await sql`
          WITH input_tags AS (
            SELECT UNNEST(${sql.array(tags)}::text[]) as name
          ),
          inserted_tags AS (
            INSERT INTO tags (name)
            SELECT name FROM input_tags
            ON CONFLICT (name) DO NOTHING
            RETURNING id, name
          ),
          all_tags AS (
            SELECT id, name FROM inserted_tags
            UNION ALL
            SELECT id, name FROM tags
            WHERE name = ANY(${sql.array(tags)})
          )
          INSERT INTO novel_tags (novel_id, tag_id)
          SELECT ${newNovel.id}, id FROM all_tags
        `;
      }

      return sql`
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
          ) as tags
        FROM novels n
        WHERE n.id = ${newNovel.id}
      `;
    });

    return new Response(JSON.stringify(novel), {
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store'
      }
    });
  }

  // Лайк новеллы
  const novelLikeMatch = path.match(/^\/api\/novels\/(\d+)\/like$/);
  if (novelLikeMatch) {
    const [, novelId] = novelLikeMatch;
    const { userId } = await request.json();

    const result = await sql.begin(async (sql) => {
      // Используем CTE для атомарного обновления
      const { rows: [updateResult] } = await sql`
        WITH like_action AS (
          INSERT INTO novel_likes (novel_id, user_id)
          VALUES (${novelId}, ${userId})
          ON CONFLICT (novel_id, user_id) DO DELETE
          RETURNING novel_id, 
            CASE WHEN xmax::text::int > 0 THEN -1 ELSE 1 END as action
        )
        UPDATE novels n
        SET likes_count = likes_count + (
          SELECT action FROM like_action
        )
        WHERE id = ${novelId}
        RETURNING likes_count,
          EXISTS (
            SELECT 1 FROM novel_likes 
            WHERE novel_id = n.id AND user_id = ${userId}
          ) as is_liked
      `;

      return updateResult;
    });

    return new Response(JSON.stringify(result), {
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store'
      }
    });
  }

  // Лайк главы
  const chapterLikeMatch = path.match(/^\/api\/novels\/(\d+)\/chapters\/(\d+)\/like$/);
  if (chapterLikeMatch) {
    const [, , chapterId] = chapterLikeMatch;
    const { userId } = await request.json();

    const result = await sql.begin(async (sql) => {
      const { rows: [updateResult] } = await sql`
        WITH like_action AS (
          INSERT INTO chapter_likes (chapter_id, user_id)
          VALUES (${chapterId}, ${userId})
          ON CONFLICT (chapter_id, user_id) DO DELETE
          RETURNING chapter_id,
            CASE WHEN xmax::text::int > 0 THEN -1 ELSE 1 END as action
        )
        UPDATE chapters c
        SET likes_count = likes_count + (
          SELECT action FROM like_action
        )
        WHERE id = ${chapterId}
        RETURNING likes_count,
          EXISTS (
            SELECT 1 FROM chapter_likes 
            WHERE chapter_id = c.id AND user_id = ${userId}
          ) as is_liked
      `;

      return updateResult;
    });

    return new Response(JSON.stringify(result), {
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store'
      }
    });
  }

  // Добавление комментария
  const commentCreateMatch = path.match(/^\/api\/novels\/(\d+)\/chapters\/(\d+)\/comments$/);
  if (commentCreateMatch) {
    const [, , chapterId] = commentCreateMatch;
    const { userId, content } = await request.json();

    const { rows: [comment] } = await sql.begin(async (sql) => {
      // Создаем пользователя если не существует и сразу добавляем комментарий
      return sql`
        WITH user_data AS (
          INSERT INTO users (id, name)
          VALUES (${userId}, ${`User ${userId}`})
          ON CONFLICT (id) DO NOTHING
        ),
        new_comment AS (
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
    });

    return new Response(JSON.stringify(comment), {
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store'
      }
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
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store'
      }
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

    const { rows: [comment] } = await sql`
      DELETE FROM chapter_comments
      WHERE id = ${commentId} AND user_id = ${userId}
      RETURNING id
    `;

    if (!comment) {
      return new Response('Forbidden', { status: 403 });
    }

    return new Response(null, { 
      status: 204,
      headers: {
        'Cache-Control': 'no-store'
      }
    });
  }
}

// Если не найден подходящий маршрут
return new Response('Not Found', { status: 404 });
