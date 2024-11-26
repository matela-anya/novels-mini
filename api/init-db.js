import { sql } from '@vercel/postgres';

export const config = {
  runtime: 'edge',
};

export default async function handler(request) {
  try {
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    // Создаем таблицы
    await sql`
      CREATE TABLE IF NOT EXISTS translators (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT
      );

      CREATE TABLE IF NOT EXISTS novels (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        status VARCHAR(50),
        translator_id INTEGER REFERENCES translators(id),
        likes_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS chapters (
        id SERIAL PRIMARY KEY,
        novel_id INTEGER REFERENCES novels(id),
        number INTEGER NOT NULL,
        title VARCHAR(255) NOT NULL,
        content TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS tags (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL
      );

      CREATE TABLE IF NOT EXISTS novel_tags (
        novel_id INTEGER REFERENCES novels(id),
        tag_id INTEGER REFERENCES tags(id),
        PRIMARY KEY (novel_id, tag_id)
      );

      CREATE TABLE IF NOT EXISTS novel_likes (
        novel_id INTEGER REFERENCES novels(id),
        user_id BIGINT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (novel_id, user_id)
      );

      CREATE TABLE IF NOT EXISTS chapter_comments (
        id SERIAL PRIMARY KEY,
        chapter_id INTEGER REFERENCES chapters(id),
        user_id BIGINT NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // Добавляем тестовые данные
    const { rows: [translator] } = await sql`
      INSERT INTO translators (name, description)
      VALUES ('Test Translator', 'This is a test translator profile')
      RETURNING id;
    `;

    const { rows: [novel] } = await sql`
      INSERT INTO novels (title, description, status, translator_id)
      VALUES (
        'Test Novel',
        'This is a test novel description',
        'в процессе',
        ${translator.id}
      )
      RETURNING id;
    `;

    await sql`
      INSERT INTO chapters (novel_id, number, title, content)
      VALUES 
        (${novel.id}, 1, 'Chapter 1', 'This is the content of chapter 1'),
        (${novel.id}, 2, 'Chapter 2', 'This is the content of chapter 2');
    `;

    return new Response(
      JSON.stringify({ message: 'Database initialized successfully' }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error initializing database:', error);
    return new Response(
      JSON.stringify({ error: error.message }), 
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
