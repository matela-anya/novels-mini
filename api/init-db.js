import { sql } from '@vercel/postgres';

const dropAllTables = async () => {
 // Удаляем таблицы одним запросом для оптимизации
 await sql`
   DROP TABLE IF EXISTS chapter_comments CASCADE;
   DROP TABLE IF EXISTS chapter_likes CASCADE;
   DROP TABLE IF EXISTS novel_likes CASCADE;
   DROP TABLE IF EXISTS novel_tags CASCADE;
   DROP TABLE IF EXISTS chapters CASCADE;
   DROP TABLE IF EXISTS novels CASCADE;
   DROP TABLE IF EXISTS tags CASCADE;
   DROP TABLE IF EXISTS translators CASCADE;
   DROP TABLE IF EXISTS users CASCADE;
 `;
};

const createTables = async () => {
 await sql`BEGIN`;

 try {
   // 1. Users table
   await sql`
     CREATE TABLE users (
       id BIGINT PRIMARY KEY,
       name VARCHAR(255) NOT NULL,
       photo_url TEXT,
       created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
     )
   `;

   // 2. Translators table
   await sql`
     CREATE TABLE translators (
       id SERIAL PRIMARY KEY,
       name VARCHAR(255) NOT NULL,
       description TEXT,
       photo_url TEXT,
       user_id BIGINT UNIQUE REFERENCES users(id),
       created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
     )
   `;

   // 3. Tags table
   await sql`
     CREATE TABLE tags (
       id SERIAL PRIMARY KEY,
       name VARCHAR(100) UNIQUE NOT NULL
     )
   `;

   // 4. Novels table
   await sql`
     CREATE TABLE novels (
       id SERIAL PRIMARY KEY,
       title VARCHAR(255) NOT NULL,
       description TEXT,
       status VARCHAR(50),
       translator_id INTEGER REFERENCES translators(id),
       likes_count INTEGER DEFAULT 0,
       created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
     )
   `;

   // 5. Chapters table
   await sql`
     CREATE TABLE chapters (
       id SERIAL PRIMARY KEY,
       novel_id INTEGER REFERENCES novels(id),
       number INTEGER NOT NULL,
       title VARCHAR(255) NOT NULL,
       content TEXT,
       created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
       likes_count INTEGER DEFAULT 0
     )
   `;

   // 6. Junction tables
   await sql`
     CREATE TABLE novel_tags (
       novel_id INTEGER REFERENCES novels(id),
       tag_id INTEGER REFERENCES tags(id),
       PRIMARY KEY (novel_id, tag_id)
     )
   `;

   await sql`
     CREATE TABLE novel_likes (
       novel_id INTEGER REFERENCES novels(id),
       user_id BIGINT REFERENCES users(id),
       created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
       PRIMARY KEY (novel_id, user_id)
     )
   `;

   await sql`
     CREATE TABLE chapter_likes (
       chapter_id INTEGER REFERENCES chapters(id),
       user_id BIGINT REFERENCES users(id),
       created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
       PRIMARY KEY (chapter_id, user_id)
     )
   `;

   await sql`
     CREATE TABLE chapter_comments (
       id SERIAL PRIMARY KEY,
       chapter_id INTEGER REFERENCES chapters(id),
       user_id BIGINT REFERENCES users(id),
       content TEXT NOT NULL,
       created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
     )
   `;

   await sql`COMMIT`;
 } catch (error) {
   await sql`ROLLBACK`;
   throw error;
 }
};

const createIndexes = async () => {
 try {
   await sql`BEGIN`;

   await sql`CREATE INDEX idx_users_created_at ON users(created_at)`;
   await sql`CREATE INDEX idx_translators_user_id ON translators(user_id)`;
   await sql`CREATE INDEX idx_translators_created_at ON translators(created_at)`;
   await sql`CREATE INDEX idx_novels_translator_id ON novels(translator_id)`;
   await sql`CREATE INDEX idx_novels_created_at ON novels(created_at)`;
   await sql`CREATE INDEX idx_chapters_novel_id ON chapters(novel_id)`;
   await sql`CREATE INDEX idx_chapters_number ON chapters(number)`;
   await sql`CREATE INDEX idx_novel_tags_tag_id ON novel_tags(tag_id)`;
   await sql`CREATE INDEX idx_novel_likes_user_id ON novel_likes(user_id)`;

   await sql`COMMIT`;
 } catch (error) {
   await sql`ROLLBACK`;
   throw error;
 }
};

const insertTestData = async () => {
 try {
   await sql`BEGIN`;

   // 1. Create test user and translator
   await sql`
     INSERT INTO users (id, name, photo_url)
     VALUES (12345, 'Test User', 'https://example.com/photo.jpg')
   `;
   
   const { rows: [translator] } = await sql`
     INSERT INTO translators (name, description, user_id)
     VALUES (
       'Саня', 
       'Повседневность и университеты. А скоро будут и триллеры.',
       12345
     )
     RETURNING id
   `;

   // 2. Insert all tags at once
   await sql`
     INSERT INTO tags (name) 
     VALUES 
       ('драма'),('комедия'),('романтика'),('фэнтези'),
       ('боевик'),('хоррор'),('повседневность'),('триллер')
   `;

   // 3. Create test novel
   const { rows: [novel] } = await sql`
     INSERT INTO novels (title, description, status, translator_id)
     VALUES (
       'Университет: Начало',
       'История о студенте, который внезапно обнаруживает, что его университет скрывает древние тайны.',
       'в процессе',
       ${translator.id}
     )
     RETURNING id
   `;

   // 4. Link novel with tags
   const { rows: tags } = await sql`
     SELECT id FROM tags WHERE name IN ('повседневность', 'триллер')
   `;

   for (const tag of tags) {
     await sql`
       INSERT INTO novel_tags (novel_id, tag_id)
       VALUES (${novel.id}, ${tag.id})
     `;
   }

   // 5. Create test chapters
   const { rows: [chapter1] } = await sql`
     INSERT INTO chapters (novel_id, number, title, content)
     VALUES (
       ${novel.id},
       1,
       'Странное поступление',
       'Когда я впервые переступил порог университета, я и представить не мог, что моя жизнь изменится навсегда.'
     )
     RETURNING id
   `;

   await sql`
     INSERT INTO chapters (novel_id, number, title, content)
     VALUES (
       ${novel.id},
       2,
       'Первый день',
       'Аудитория 42-б выглядела совершенно обычно, если не считать странных символов на стенах.'
     )
   `;

   // 6. Create test comment
   await sql`
     INSERT INTO chapter_comments (chapter_id, user_id, content)
     VALUES (${chapter1.id}, 12345, 'Очень интересное начало! Жду продолжения')
   `;

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
