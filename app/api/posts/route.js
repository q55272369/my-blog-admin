import { Client } from '@notionhq/client';
import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET() {
  const apiKey = process.env.NOTION_API_KEY;
  const dbId = process.env.NOTION_DATABASE_ID;

  // 1. 检查环境变量是否成功读取
  if (!apiKey || !dbId) {
    return NextResponse.json({ success: false, error: 'Cloudflare 环境变量读取失败，请检查 Secret 设置' }, { status: 500 });
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
            if (p.type === 'rich_text') return p.rich_text[0]?.plain_text || '';
            if (p.type === 'select') return p.select?.name || '';
            return '';
        };

        return {
            id: page.id,
            title: getProp('title') || '无标题',
            slug: getProp('slug'),
            status: getProp('status'),
        };
    });

    return NextResponse.json({ success: true, posts });
  } catch (error) {
    // 🟢 关键：把 Notion 返回的真实错误吐给前端
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
