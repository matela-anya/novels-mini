import { sql } from '@vercel/postgres';

// Helper function for bulk inserts
const bulkInsert = async (query, data) => {
  for (const chunk of data) {
    await sql`${sql.raw(query)} VALUES ${sql.raw(chunk)};`;
  }
};
 
// Drop existing tables
const dropTables = async () => {
  const tables = [
    'chapter_comments',
    'chapter_likes',
    'novel_likes',
    'novel_tags',
    'chapters',
    'novels',
    'tags',
    'translators',
    'users'
  ];
  for (const table of tables) {
    await sql`DROP TABLE IF EXISTS ${sql(table)} CASCADE;`;
  }
};

// Create schema
const createSchema = async () => {
  await sql`BEGIN`;
  try {
    await sql`CREATE TABLE users (
      id BIGINT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      photo_url TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );`;

    await sql`CREATE TABLE translators (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      photo_url TEXT,
      user_id BIGINT UNIQUE REFERENCES users(id),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );`;

    await sql`CREATE TABLE novels (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      status VARCHAR(50),
      translator_id INTEGER REFERENCES translators(id),
      likes_count INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );`;

    await sql`CREATE TABLE tags (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) UNIQUE NOT NULL
    );`;

    await sql`CREATE TABLE chapters (
      id SERIAL PRIMARY KEY,
      novel_id INTEGER REFERENCES novels(id),
      number INTEGER NOT NULL,
      title VARCHAR(255) NOT NULL,
      content TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      likes_count INTEGER DEFAULT 0
    );`;

    await sql`CREATE TABLE novel_tags (
      novel_id INTEGER REFERENCES novels(id),
      tag_id INTEGER REFERENCES tags(id),
      PRIMARY KEY (novel_id, tag_id)
    );`;

    await sql`CREATE TABLE novel_likes (
      novel_id INTEGER REFERENCES novels(id),
      user_id BIGINT REFERENCES users(id),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (novel_id, user_id)
    );`;

    await sql`CREATE TABLE chapter_likes (
      chapter_id INTEGER REFERENCES chapters(id),
      user_id BIGINT REFERENCES users(id),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (chapter_id, user_id)
    );`;

    await sql`CREATE TABLE chapter_comments (
      id SERIAL PRIMARY KEY,
      chapter_id INTEGER REFERENCES chapters(id),
      user_id BIGINT REFERENCES users(id),
      content TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );`;

    await sql`CREATE INDEX idx_chapters_novel_id ON chapters(novel_id);`;
    await sql`CREATE INDEX idx_novels_translator_id ON novels(translator_id);`;
    await sql`CREATE INDEX idx_tags_novel_id ON novel_tags(novel_id);`;
    await sql`CREATE INDEX idx_tags_tag_id ON novel_tags(tag_id);`;
    await sql`CREATE INDEX idx_users_id ON users(id);`;
    await sql`CREATE INDEX idx_translators_user_id ON translators(user_id);`;
    await sql`CREATE INDEX idx_novels_created_at ON novels(created_at DESC);`;
    await sql`CREATE INDEX idx_chapters_created_at ON chapters(created_at DESC);`;

    await sql`COMMIT`;
  } catch (error) {
    await sql`ROLLBACK`;
    throw error;
  }
};

// Seed initial data
const seedData = async () => {
  await sql`BEGIN`;
  try {
    // Users
    await sql`INSERT INTO users (id, name, photo_url) VALUES 
      (12345, 'Test User', NULL),
      (12346, 'Sample User', 'https://example.com/photo.png');`;

    // Translators
    await sql`INSERT INTO translators (name, description, user_id) VALUES 
      ('Test Translator', 'Focused on modern fiction.', 12345);`;

    // Novels
    const { rows: [novel] } = await sql`INSERT INTO novels (title, description, status, translator_id) VALUES 
      ('Mystery of the Old House', 'A gripping thriller.', 'ongoing', 1)
      RETURNING id;`;

    // Tags
    await sql`INSERT INTO tags (name) VALUES ('thriller'), ('mystery');`;

    // Novel Tags
    await sql`INSERT INTO novel_tags (novel_id, tag_id) SELECT ${novel.id}, id FROM tags;`;

    // Chapters
    await sql`INSERT INTO chapters (novel_id, number, title, content) VALUES 
      (${novel.id}, 1, 'The Beginning', 'It all started on a stormy night...');`;

    // Comments
    await sql`INSERT INTO chapter_comments (chapter_id, user_id, content) VALUES 
      (1, 12345, 'Amazing start!');`;

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
