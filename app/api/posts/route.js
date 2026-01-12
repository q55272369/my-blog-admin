import { Client } from '@notionhq/client';
import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET() {
  const notion = new Client({ auth: process.env.NOTION_KEY });
  const dbId = process.env.NOTION_DATABASE_ID;

  try {
    // 1. 获取文章列表
    const response = await notion.databases.query({
      database_id: dbId,
      sorts: [{ property: 'update_date', direction: 'descending' }],
    });

    // 2. 获取数据库结构 (提取已有的分类和标签选项)
    const dbMetadata = await notion.databases.retrieve({ database_id: dbId });
    const categories = dbMetadata.properties.category?.select?.options?.map(o => o.name) || [];
    const allTags = dbMetadata.properties.tags?.multi_select?.options?.map(o => o.name) || [];

    const posts = response.results.map(page => {
      const p = page.properties;
      const title = p.title?.title?.[0]?.plain_text || "无标题";
      return {
        id: page.id,
        title,
        type: p.type?.select?.name || "Post",
        slug: p.slug?.rich_text?.[0]?.plain_text || "",
        status: p.status?.status?.name || 'Published',
        category: p.category?.select?.name || '未分类',
        date: p.date?.date?.start || ''
      };
    });

    return NextResponse.json({ success: true, posts, options: { categories, tags: allTags } });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message });
  }
}
