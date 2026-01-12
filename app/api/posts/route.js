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
      // 1. 提取标题 (兼容 title 或 Name)
      const title = p.title?.title?.[0]?.plain_text || p.Name?.title?.[0]?.plain_text || "无标题";
      
      // 2. 提取类型 (Page, Post, Widget)
      const type = p.type?.select?.name || "Other"; 

      // 3. 提取其他展示属性
      return {
        id: page.id,
        title,
        type,
        status: p.status?.status?.name || 'No Status',
        category: p.category?.select?.name || '未分类',
        updateDate: p.update_date?.date?.start || '无时间'
      };
    });

    return NextResponse.json({ success: true, posts });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message });
  }
}
