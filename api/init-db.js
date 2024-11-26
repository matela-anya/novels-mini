import { sql } from '@vercel/postgres';

export const config = {
  runtime: 'edge',
};

export default async function handler(request) {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { 
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    console.log('Starting database initialization...');

    // Удаляем таблицы по одной
    await sql`DROP TABLE IF EXISTS chapter_comments;`;
    await sql`DROP TABLE IF EXISTS chapter_likes;`; // Добавили
    await sql`DROP TABLE IF EXISTS novel_likes;`;
    await sql`DROP TABLE IF EXISTS novel_tags;`;
    await sql`DROP TABLE IF EXISTS chapters;`;
    await sql`DROP TABLE IF EXISTS novels;`;
    await sql`DROP TABLE IF EXISTS tags;`;
    await sql`DROP TABLE IF EXISTS translators;`;
    console.log('Dropped existing tables');

    // Создаем таблицы по одной
    await sql`
      CREATE TABLE translators (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT
      );
    `;
    console.log('Created translators table');

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
    `;
    console.log('Created novels table');

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
    `;
    console.log('Created chapters table');

    await sql`
      CREATE TABLE tags (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL
      );
    `;
    console.log('Created tags table');

    await sql`
      CREATE TABLE novel_tags (
        novel_id INTEGER REFERENCES novels(id),
        tag_id INTEGER REFERENCES tags(id),
        PRIMARY KEY (novel_id, tag_id)
      );
    `;
    console.log('Created novel_tags table');

    await sql`
      CREATE TABLE novel_likes (
        novel_id INTEGER REFERENCES novels(id),
        user_id BIGINT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (novel_id, user_id)
      );
    `;
    console.log('Created novel_likes table');

    await sql`
      CREATE TABLE chapter_likes (
        chapter_id INTEGER REFERENCES chapters(id),
        user_id BIGINT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (chapter_id, user_id)
      );
    `;
    console.log('Created chapter_likes table');

    await sql`
      CREATE TABLE chapter_comments (
        id SERIAL PRIMARY KEY,
        chapter_id INTEGER REFERENCES chapters(id),
        user_id BIGINT NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    console.log('Created chapter_comments table');

    // Добавляем тестовые данные
    const translator = await sql`
      INSERT INTO translators (name, description)
      VALUES ('Test Translator', 'This is a test translator profile')
      RETURNING id;
    `;
    console.log('Added test translator');

    const novel = await sql`
      INSERT INTO novels (title, description, status, translator_id)
      VALUES (
        'Test Novel',
        'This is a test novel description',
        'в процессе',
        ${translator.rows[0].id}
      )
      RETURNING id;
    `;
    console.log('Added test novel');

    await sql`
      INSERT INTO chapters (novel_id, number, title, content)
      VALUES 
        (${novel.rows[0].id}, 1, 'Chapter 1', 'This is the content of chapter 1');
    `;

    await sql`
      INSERT INTO chapters (novel_id, number, title, content)
      VALUES 
        (${novel.rows[0].id}, 2, 'Chapter 2', 'This is the content of chapter 2');
    `;
    console.log('Added test chapters');

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
