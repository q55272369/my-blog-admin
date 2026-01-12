import { Client } from '@notionhq/client';
import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET() {
  // 🟢 统一使用你指定的 NOTION_KEY
  const apiKey = process.env.NOTION_KEY;
  const dbId = process.env.NOTION_DATABASE_ID;

  if (!apiKey || !dbId) {
    return NextResponse.json({ success: false, error: '缺少环境变量 NOTION_KEY 或 DATABASE_ID' }, { status: 500 });
  }

  const notion = new Client({ auth: apiKey });

  try {
    const response = await notion.databases.query({
      database_id: dbId,
      sorts: [{ property: 'update_date', direction: 'descending' }],
    });

    const posts = response.results.map(page => {
      const getProp = (name) => {
        if (!page.properties[name]) return '';
        const p = page.properties[name];
        if (p.type === 'title') return p.title[0]?.plain_text || '';
        if (p.type === 'select') return p.select?.name || '';
        return '';
      };
      return { id: page.id, title: getProp('title') || '无标题' };
    });

    return NextResponse.json({ success: true, posts });
  } catch (error) {
    // 🔴 如果报错，这里会返回 Notion 官方给出的最直接理由
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
