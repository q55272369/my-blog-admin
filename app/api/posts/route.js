import { Client } from '@notionhq/client';
import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET() {
  const notion = new Client({ auth: process.env.NOTION_KEY });
  const dbId = process.env.NOTION_DATABASE_ID;

  try {
    const response = await notion.databases.query({
      database_id: dbId,
      sorts: [{ property: 'update_date', direction: 'descending' }],
    });

    const posts = response.results.map(page => {
      const p = page.properties;
      // 这里的逻辑要极其健壮
      const title = p.title?.title?.[0]?.plain_text || p.Name?.title?.[0]?.plain_text || "无标题";
      const type = p.type?.select?.name || "未分类";
      
      // 只有当有标题或者是有效条目时才返回
      if (title === "无标题" && !p.type?.select) return null;

      return {
        id: page.id,
        title,
        type,
        status: p.status?.status?.name || 'Draft',
        category: p.category?.select?.name || '',
        date: p.date?.date?.start || ''
      };
    }).filter(Boolean);

    return NextResponse.json({ success: true, posts });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message });
  }
}
