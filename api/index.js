import { sql } from '@vercel/postgres';
import Joi from 'joi';

// Utility to validate and respond with errors
function validate(schema, data) {
  const { error } = schema.validate(data);
  if (error) {
    throw new Response(JSON.stringify({ error: error.details }), { status: 400 });
  }
}

// Utility for building JSON responses
function jsonResponse(data, status = 200, cacheControl = 'public, max-age=10, s-maxage=60') {
  return new Response(JSON.stringify(data), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': cacheControl,
    },
    status,
  });
}

// Handler for novels
async function handleNovels(request, path, searchParams) {
  if (request.method === 'GET' && path === '/api/novels') {
    const page = parseInt(searchParams.get('page'), 10) || 1;
    const limit = parseInt(searchParams.get('limit'), 10) || 10;
    const offset = (page - 1) * limit;

    const { rows: novels } = await sql`
      SELECT 
        n.id, n.title, n.description, n.status, n.translator_id, t.name AS translator_name,
        COUNT(c.id) AS chapter_count,
        COALESCE(ARRAY_AGG(DISTINCT tags.name) FILTER (WHERE tags.id IS NOT NULL), ARRAY[]::text[]) AS tags
      FROM novels n
      LEFT JOIN translators t ON t.id = n.translator_id
      LEFT JOIN chapters c ON c.novel_id = n.id
      LEFT JOIN novel_tags nt ON nt.novel_id = n.id
      LEFT JOIN tags ON tags.id = nt.tag_id
      GROUP BY n.id, t.name
      ORDER BY n.id DESC
      LIMIT ${limit} OFFSET ${offset};
    `;

    return jsonResponse({
      novels: novels.map(({ tags, ...novel }) => ({ ...novel, tags: tags || [] })),
      pagination: {
        total: novels.length,
        page,
        limit,
        pages: Math.ceil(novels.length / limit),
      },
    });
  }

  const novelMatch = path.match(/^\/api\/novels\/(\d+)$/);
  if (novelMatch) {
    const novelId = novelMatch[1];

    const { rows: [novel] } = await sql`
      SELECT 
        n.*, t.name AS translator_name,
        COALESCE(ARRAY_AGG(DISTINCT tags.name), ARRAY[]::text[]) AS tags,
        (
          SELECT COALESCE(json_agg(json_build_object('id', c.id, 'title', c.title, 'number', c.number)), '[]'::json)
          FROM chapters c WHERE c.novel_id = n.id
        ) AS chapters
      FROM novels n
      LEFT JOIN translators t ON t.id = n.translator_id
      LEFT JOIN novel_tags nt ON nt.novel_id = n.id
      LEFT JOIN tags ON tags.id = nt.tag_id
      WHERE n.id = ${novelId}
      GROUP BY n.id, t.name;
    `;

    if (!novel) {
      throw new Response('Not Found', { status: 404 });
    }

    return jsonResponse(novel);
  }

  throw new Response('Not Found', { status: 404 });
}

// Handler for translators
async function handleTranslators(request, path) {
  const translatorSchema = Joi.object({
    userId: Joi.string().required(),
    name: Joi.string().required(),
    description: Joi.string().allow(null, ''),
    photoUrl: Joi.string().uri().allow(null, ''),
  });

  if (request.method === 'POST' && path === '/api/translators') {
    const requestData = await request.json();
    validate(translatorSchema, requestData);

    const { userId, name, description, photoUrl } = requestData;

    const { rows: [translator] } = await sql`
      INSERT INTO translators (user_id, name, description, photo_url)
      VALUES (${userId}, ${name}, ${description}, ${photoUrl})
      RETURNING *;
    `;

    return jsonResponse(translator, 201);
  }

  const translatorMatch = path.match(/^\/api\/translators\/(\d+)$/);
  if (translatorMatch) {
    const translatorId = translatorMatch[1];

    const { rows: [translator] } = await sql`
      SELECT 
        t.*, COUNT(DISTINCT n.id) AS novels_count,
        COALESCE(SUM(n.likes_count), 0) AS total_likes
      FROM translators t
      LEFT JOIN novels n ON n.translator_id = t.id
      WHERE t.id = ${translatorId}
      GROUP BY t.id;
    `;

    if (!translator) {
      throw new Response('Not Found', { status: 404 });
    }

    return jsonResponse(translator);
  }

  throw new Response('Not Found', { status: 404 });
}

// Main handler
export default async function handler(request) {
  try {
    const url = new URL(request.url, 'http://localhost');
    const path = url.pathname;
    const searchParams = url.searchParams;

    if (path.startsWith('/api/novels')) {
      return await handleNovels(request, path, searchParams);
    }

    if (path.startsWith('/api/translators')) {
      return await handleTranslators(request, path);
    }

    throw new Response('Not Found', { status: 404 });
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }

    console.error('API Error:', error);
    return jsonResponse({ error: 'Internal Server Error', details: error.message }, 500);
  }
}
