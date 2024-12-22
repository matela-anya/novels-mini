import { sql } from '@vercel/postgres';

export default async function handler(request) {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { 
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    console.log('Starting database initialization...');

    // Удаляем таблицы
    await sql`DROP TABLE IF EXISTS chapter_comments CASCADE;`;
    await sql`DROP TABLE IF EXISTS chapter_likes CASCADE;`;
    await sql`DROP TABLE IF EXISTS novel_likes CASCADE;`;
    await sql`DROP TABLE IF EXISTS novel_tags CASCADE;`;
    await sql`DROP TABLE IF EXISTS chapters CASCADE;`;
    await sql`DROP TABLE IF EXISTS novels CASCADE;`;
    await sql`DROP TABLE IF EXISTS tags CASCADE;`;
    await sql`DROP TABLE IF EXISTS translators CASCADE;`;
    await sql`DROP TABLE IF EXISTS users CASCADE;`;
    console.log('Dropped existing tables');

    // Создаем таблицы с индексами
    await sql`
      CREATE TABLE users (
        id BIGINT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        photo_url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX idx_users_created_at ON users(created_at);
    `;

    await sql`
      CREATE TABLE translators (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        photo_url TEXT,
        user_id BIGINT UNIQUE REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX idx_translators_user_id ON translators(user_id);
      CREATE INDEX idx_translators_created_at ON translators(created_at);
    `;

    await sql`
      CREATE TABLE novels (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        status VARCHAR(50),
        translator_id INTEGER REFERENCES translators(id),
        likes_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX idx_novels_translator_id ON novels(translator_id);
      CREATE INDEX idx_novels_created_at ON novels(created_at);
      CREATE INDEX idx_novels_status ON novels(status);
    `;

    await sql`
      CREATE TABLE chapters (
        id SERIAL PRIMARY KEY,
        novel_id INTEGER REFERENCES novels(id),
        number INTEGER NOT NULL,
        title VARCHAR(255) NOT NULL,
        content TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        likes_count INTEGER DEFAULT 0
      );
      CREATE INDEX idx_chapters_novel_id ON chapters(novel_id);
      CREATE INDEX idx_chapters_number ON chapters(number);
      CREATE INDEX idx_chapters_created_at ON chapters(created_at);
    `;

    await sql`
      CREATE TABLE tags (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL
      );
    `;

    await sql`
      CREATE TABLE novel_tags (
        novel_id INTEGER REFERENCES novels(id),
        tag_id INTEGER REFERENCES tags(id),
        PRIMARY KEY (novel_id, tag_id)
      );
      CREATE INDEX idx_novel_tags_tag_id ON novel_tags(tag_id);
    `;

    await sql`
      CREATE TABLE novel_likes (
        novel_id INTEGER REFERENCES novels(id),
        user_id BIGINT REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (novel_id, user_id)
      );
      CREATE INDEX idx_novel_likes_user_id ON novel_likes(user_id);
      CREATE INDEX idx_novel_likes_created_at ON novel_likes(created_at);
    `;

    await sql`
      CREATE TABLE chapter_likes (
        chapter_id INTEGER REFERENCES chapters(id),
        user_id BIGINT REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (chapter_id, user_id)
      );
      CREATE INDEX idx_chapter_likes_user_id ON chapter_likes(user_id);
      CREATE INDEX idx_chapter_likes_created_at ON chapter_likes(created_at);
    `;

    await sql`
      CREATE TABLE chapter_comments (
        id SERIAL PRIMARY KEY,
        chapter_id INTEGER REFERENCES chapters(id),
        user_id BIGINT REFERENCES users(id),
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX idx_chapter_comments_chapter_id ON chapter_comments(chapter_id);
      CREATE INDEX idx_chapter_comments_user_id ON chapter_comments(user_id);
      CREATE INDEX idx_chapter_comments_created_at ON chapter_comments(created_at);
    `;

    // Добавляем базовые теги
    await sql`
      INSERT INTO tags (name) VALUES 
        ('драма'),
        ('комедия'),
        ('романтика'),
        ('фэнтези'),
        ('боевик'),
        ('хоррор'),
        ('повседневность'),
        ('триллер')
      RETURNING id, name;
    `;

    // Добавляем тестового пользователя
    await sql`
      INSERT INTO users (id, name, photo_url)
      VALUES (12345, 'Test User', 'https://example.com/photo.jpg');
    `;

    // Добавляем тестового переводчика
    const { rows: [translator] } = await sql`
      INSERT INTO translators (name, description, user_id)
      VALUES (
        'Саня', 
        'Повседневность и университеты. А скоро будут и триллеры.',
        12345
      )
      RETURNING id;
    `;

    // Добавляем тестовую новеллу
    const { rows: [novel] } = await sql`
      INSERT INTO novels (title, description, status, translator_id)
      VALUES (
        'Университет: Начало',
        'История о студенте, который внезапно обнаруживает, что его университет скрывает древние тайны.',
        'в процессе',
        ${translator.id}
      )
      RETURNING id;
    `;

    // Связываем новеллу с тегами
    await sql`
      WITH tag_ids AS (
        SELECT id FROM tags WHERE name IN ('повседневность', 'триллер')
      )
      INSERT INTO novel_tags (novel_id, tag_id)
      SELECT ${novel.id}, id FROM tag_ids;
    `;

    // Добавляем тестовые главы
    const { rows: [chapter1] } = await sql`
      INSERT INTO chapters (novel_id, number, title, content)
      VALUES (
        ${novel.id},
        1,
        'Странное поступление',
        'Когда я впервые переступил порог университета, я и представить не мог, что моя жизнь изменится навсегда. Все началось с необычного собеседования...'
      )
      RETURNING id;
    `;

    await sql`
      INSERT INTO chapters (novel_id, number, title, content)
      VALUES (
        ${novel.id},
        2,
        'Первый день',
        'Аудитория 42-б выглядела совершенно обычно, если не считать странных символов на стенах и того факта, что она, кажется, существовала в нескольких местах одновременно...'
      );
    `;

    // Добавляем тестовый комментарий
    await sql`
      INSERT INTO chapter_comments (chapter_id, user_id, content)
      VALUES (
        ${chapter1.id},
        12345,
        'Очень интересное начало! Жду продолжения'
      );
    `;

    return new Response(JSON.stringify({
      success: true,
      message: 'Database initialized successfully'
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error initializing database:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
