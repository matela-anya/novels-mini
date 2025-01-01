import { sql } from '@vercel/postgres';

// Функция для удаления таблиц
const dropTables = async () => {
  await sql`DROP TABLE IF EXISTS chapter_comments CASCADE;
           DROP TABLE IF EXISTS chapter_likes CASCADE;
           DROP TABLE IF EXISTS novel_likes CASCADE;
           DROP TABLE IF EXISTS novel_tags CASCADE;
           DROP TABLE IF EXISTS chapters CASCADE;
           DROP TABLE IF EXISTS novels CASCADE;
           DROP TABLE IF EXISTS tags CASCADE;
           DROP TABLE IF EXISTS translators CASCADE;
           DROP TABLE IF EXISTS users CASCADE;`;
};

// Функция для создания таблиц
const createSchema = async () => {
  // Создаем таблицы в транзакции
  await sql`BEGIN`;
  try {
    await sql`CREATE TABLE users (
      id BIGINT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      photo_url TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`;

    await sql`CREATE TABLE translators (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      photo_url TEXT,
      user_id BIGINT UNIQUE REFERENCES users(id),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`;

    await sql`CREATE TABLE novels (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      status VARCHAR(50),
      translator_id INTEGER REFERENCES translators(id),
      likes_count INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`;

    await sql`CREATE TABLE tags (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) UNIQUE NOT NULL
    )`;

    await sql`CREATE TABLE chapters (
      id SERIAL PRIMARY KEY,
      novel_id INTEGER REFERENCES novels(id),
      number INTEGER NOT NULL,
      title VARCHAR(255) NOT NULL,
      content TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      likes_count INTEGER DEFAULT 0
    )`;

    await sql`CREATE TABLE novel_tags (
      novel_id INTEGER REFERENCES novels(id),
      tag_id INTEGER REFERENCES tags(id),
      PRIMARY KEY (novel_id, tag_id)
    )`;

    await sql`CREATE TABLE novel_likes (
      novel_id INTEGER REFERENCES novels(id),
      user_id BIGINT REFERENCES users(id),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (novel_id, user_id)
    )`;

    await sql`CREATE TABLE chapter_likes (
      chapter_id INTEGER REFERENCES chapters(id),
      user_id BIGINT REFERENCES users(id),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (chapter_id, user_id)
    )`;

    await sql`CREATE TABLE chapter_comments (
      id SERIAL PRIMARY KEY,
      chapter_id INTEGER REFERENCES chapters(id),
      user_id BIGINT REFERENCES users(id),
      content TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`;

    // Создаем только самые необходимые индексы
    await sql`CREATE INDEX idx_chapters_novel_id ON chapters(novel_id)`;
    await sql`CREATE INDEX idx_novels_translator_id ON novels(translator_id)`;

    await sql`COMMIT`;
  } catch (error) {
    await sql`ROLLBACK`;
    throw error;
  }
};

// Функция для вставки тестовых данных
const seedData = async () => {
  await sql`BEGIN`;
  try {
    // Создаем пользователя и переводчика
    await sql`INSERT INTO users (id, name) VALUES (12345, 'Test User')`;
    
    const { rows: [translator] } = await sql`
      INSERT INTO translators (name, description, user_id)
      VALUES ('Саня', 'Повседневность и университеты.', 12345)
      RETURNING id`;

    // Создаем новеллу
    const { rows: [novel] } = await sql`
      INSERT INTO novels (title, description, status, translator_id)
      VALUES (
        'Университет: Начало',
        'История о студенте, который внезапно обнаруживает древние тайны.',
        'в процессе',
        ${translator.id}
      )
      RETURNING id`;

    // Создаем и привязываем теги
    await sql`INSERT INTO tags (name) VALUES ('повседневность'), ('триллер')`;
    
    // Привязываем теги к новелле
    await sql`INSERT INTO novel_tags (novel_id, tag_id)
             SELECT ${novel.id}, id FROM tags`;

    // Добавляем главы
    const { rows: [chapter] } = await sql`
      INSERT INTO chapters (novel_id, number, title, content)
      VALUES 
        (${novel.id}, 1, 'Начало', 'Первая глава...')
      RETURNING id`;

    // Добавляем комментарий
    await sql`
      INSERT INTO chapter_comments (chapter_id, user_id, content)
      VALUES (${chapter.id}, 12345, 'Отличное начало!')`;

    await sql`COMMIT`;
  } catch (error) {
    await sql`ROLLBACK`;
    throw error;
  }
};

export default async function handler(request) {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({
      success: false,
      error: 'Method not allowed'
    }), { 
      status: 405,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }

  try {
    // Выполняем операции последовательно
    console.log('Dropping tables...');
    await dropTables();
    
    console.log('Creating schema...');
    await createSchema();
    
    console.log('Seeding data...');
    await seedData();

    return new Response(JSON.stringify({
      success: true,
      message: 'Database initialized successfully'
    }), {
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (error) {
    console.error('Database initialization failed:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Internal Server Error',
      stack: error.stack
    }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}
