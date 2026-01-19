import { Client } from '@notionhq/client';
import { NextResponse } from 'next/server';

export const runtime = 'edge';
const notion = new Client({ auth: process.env.NOTION_KEY });
const dbId = process.env.NOTION_DATABASE_ID;

export async function GET() {
  try {
    const db = await notion.databases.retrieve({ database_id: dbId });
    // 获取数据库标题
    const title = db.title?.[0]?.plain_text || 'PROBLOG';
    return NextResponse.json({ success: true, title });
  } catch (e) {
    return NextResponse.json({ success: false, error: e.message });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { title } = body;
    
    if (!title) return NextResponse.json({ success: false, error: "Title is required" });

    // 更新数据库标题
    await notion.databases.update({
      database_id: dbId,
      title: [
        {
          text: { content: title }
        }
      ]
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ success: false, error: e.message });
  }
}
