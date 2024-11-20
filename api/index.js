import { sql } from '@vercel/postgres';

export const config = {
  runtime: 'edge',
};

export default async function handler(request) {
  try {
    if (request.method === 'GET') {
      // Get all novels
      if (request.url.endsWith('/api/novels')) {
        const { rows } = await sql`
          SELECT 
            n.id,
            n.title,
            n.translator,
            n.status,
            COUNT(c.id) as total_chapters,
            array_agg(DISTINCT t.name) as tags
          FROM novels n
          LEFT JOIN chapters c ON c.novel_id = n.id
          LEFT JOIN novel_tags nt ON nt.novel_id = n.id
          LEFT JOIN tags t ON t.id = nt.tag_id
          GROUP BY n.id
          ORDER BY n.created_at DESC;
        `;

        return new Response(JSON.stringify(rows), {
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Get single novel
      const novelMatch = request.url.match(/\/api\/novels\/(\d+)/);
      if (novelMatch) {
        const novelId = novelMatch[1];
        const { rows } = await sql`
          SELECT 
            n.*,
            array_agg(DISTINCT t.name) as tags,
            json_agg(
              DISTINCT jsonb_build_object(
                'id', c.id,
                'title', c.title,
                'number', c.number
              )
            ) as chapters
          FROM novels n
          LEFT JOIN chapters c ON c.novel_id = n.id
          LEFT JOIN novel_tags nt ON nt.novel_id = n.id
          LEFT JOIN tags t ON t.id = nt.tag_id
          WHERE n.id = ${novelId}
          GROUP BY n.id;
        `;

        return new Response(JSON.stringify(rows[0]), {
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    return new Response('Not Found', { status: 404 });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
