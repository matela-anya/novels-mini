import { sql } from '@vercel/postgres';
import { novels } from '@/db/schema';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const result = await sql`
      SELECT id, title, cover_url, status 
      FROM ${novels}
      ORDER BY created_at DESC
    `;
    
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Database Error:', error);
    return NextResponse.error();
  }
}
