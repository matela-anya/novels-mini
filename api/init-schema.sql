-- Таблица для новелл
CREATE TABLE IF NOT EXISTS novels (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    tags TEXT[] NOT NULL,
    total_chapters INTEGER NOT NULL,
    author TEXT NOT NULL,
    year_started INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица для глав
CREATE TABLE IF NOT EXISTS chapters (
    id SERIAL PRIMARY KEY,
    novel_id INTEGER NOT NULL REFERENCES novels(id) ON DELETE CASCADE,
    chapter_number INTEGER NOT NULL,
    title TEXT NOT NULL,
    text TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Индексы
CREATE INDEX idx_novels_created_at ON novels (created_at);
CREATE INDEX idx_chapters_novel_id ON chapters (novel_id);
