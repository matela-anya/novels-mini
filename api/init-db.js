import { sql } from '@vercel/postgres';

const dropAllTables = async () => {
  await sql`DROP TABLE IF EXISTS chapter_comments CASCADE`;
  await sql`DROP TABLE IF EXISTS chapter_likes CASCADE`;
  await sql`DROP TABLE IF EXISTS novel_likes CASCADE`;
  await sql`DROP TABLE IF EXISTS novel_tags CASCADE`;
  await sql`DROP TABLE IF EXISTS chapters CASCADE`;
  await sql`DROP TABLE IF EXISTS novels CASCADE`;
  await sql`DROP TABLE IF EXISTS tags CASCADE`;
  await sql`DROP TABLE IF EXISTS translators CASCADE`;
  await sql`DROP TABLE IF EXISTS users CASCADE`;
};

const createTables = async () => {
  try {
    // Создаем таблицы последовательно
    
    // 1. Users
    await sql`
      CREATE TABLE users (
        id BIGINT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        photo_url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`;

    // 2. Translators
    await sql`
      CREATE TABLE translators (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        photo_url TEXT,
        user_id BIGINT UNIQUE REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`;

    // 3. Tags
    await sql`
      CREATE TABLE tags (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL
      )`;

    // 4. Novels
    await sql`
      CREATE TABLE novels (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        status VARCHAR(50),
        translator_id INTEGER REFERENCES translators(id),
        likes_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`;

    // 5. Chapters
    await sql`
      CREATE TABLE chapters (
        id SERIAL PRIMARY KEY,
        novel_id INTEGER REFERENCES novels(id),
        number INTEGER NOT NULL,
        title VARCHAR(255) NOT NULL,
        content TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        likes_count INTEGER DEFAULT 0
      )`;

    // 6. Novel Tags
    await sql`
      CREATE TABLE novel_tags (
        novel_id INTEGER REFERENCES novels(id),
        tag_id INTEGER REFERENCES tags(id),
        PRIMARY KEY (novel_id, tag_id)
      )`;

    // 7. Novel Likes
    await sql`
      CREATE TABLE novel_likes (
        novel_id INTEGER REFERENCES novels(id),
        user_id BIGINT REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (novel_id, user_id)
      )`;

    // 8. Chapter Likes
    await sql`
      CREATE TABLE chapter_likes (
        chapter_id INTEGER REFERENCES chapters(id),
        user_id BIGINT REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (chapter_id, user_id)
      )`;

    // 9. Chapter Comments
    await sql`
      CREATE TABLE chapter_comments (
        id SERIAL PRIMARY KEY,
        chapter_id INTEGER REFERENCES chapters(id),
        user_id BIGINT REFERENCES users(id),
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`;

  } catch (error) {
    console.error('Error creating tables:', error);
    throw error;
  }
};

const createIndexes = async () => {
  try {
    // Создаем только самые необходимые индексы
    await sql`CREATE INDEX idx_chapters_novel_id ON chapters(novel_id)`;
    await sql`CREATE INDEX idx_chapters_number ON chapters(number)`;
    await sql`CREATE INDEX idx_novels_translator_id ON novels(translator_id)`;
    await sql`CREATE INDEX idx_novel_tags_tag_id ON novel_tags(tag_id)`;
  } catch (error) {
    console.error('Error creating indexes:', error);
    throw error;
  }
};

const insertTestData = async () => {
  try {
    // 1. Создаем тестового пользователя
    await sql`
      INSERT INTO users (id, name, photo_url) 
      VALUES (12345, 'Test User', 'https://example.com/photo.jpg')`;

    // 2. Создаем переводчика
    const { rows: [translator] } = await sql`
      INSERT INTO translators (name, description, user_id)
      VALUES (
        'Саня', 
        'Повседневность и университеты. А скоро будут и триллеры.',
        12345
      )
      RETURNING id`;

    // 3. Создаем теги
    await sql`
      INSERT INTO tags (name) 
      VALUES 
        ('повседневность'),
        ('триллер')
      RETURNING id`;

    // 4. Получаем ID тегов
    const { rows: tags } = await sql`
      SELECT id, name FROM tags`;

    // 5. Создаем новеллу
    const { rows: [novel] } = await sql`
      INSERT INTO novels (title, description, status, translator_id)
      VALUES (
        'Университет: Начало',
        'История о студенте, который внезапно обнаруживает, что его университет скрывает древние тайны.',
        'в процессе',
        ${translator.id}
      )
      RETURNING id`;

    // 6. Связываем теги с новеллой
    for (const tag of tags) {
      await sql`
        INSERT INTO novel_tags (novel_id, tag_id)
        VALUES (${novel.id}, ${tag.id})`;
    }

    // 7. Создаем первую главу
    const { rows: [chapter1] } = await sql`
      INSERT INTO chapters (novel_id, number, title, content)
      VALUES (
        ${novel.id},
        1,
        'Странное поступление',
        'Когда я впервые переступил порог университета, я и представить не мог, что моя жизнь изменится навсегда.'
      )
      RETURNING id`;

    // 8. Создаем вторую главу
    await sql`
      INSERT INTO chapters (novel_id, number, title, content)
      VALUES (
        ${novel.id},
        2,
        'Первый день',
        'Аудитория 42-б выглядела совершенно обычно, если не считать странных символов на стенах.'
      )`;

    // 9. Добавляем комментарий
    await sql`
      INSERT INTO chapter_comments (chapter_id, user_id, content)
      VALUES (
        ${chapter1.id},
        12345,
        'Очень интересное начало! Жду продолжения'
      )`;

  } catch (error) {
    console.error('Error inserting test data:', error);
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
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
  }

  try {
    console.log('Dropping existing tables...');
    await dropAllTables();
    
    console.log('Creating tables...');
    await createTables();
    
    console.log('Creating indexes...');
    await createIndexes();
    
    console.log('Inserting test data...');
    await insertTestData();

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
