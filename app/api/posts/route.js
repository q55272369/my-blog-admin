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

    const dbMetadata = await notion.databases.retrieve({ database_id: dbId });
    // 🟢 恢复：抓取 Notion 里的分类和标签备选项
    const categories = dbMetadata.properties.category?.select?.options?.map(o => o.name) || [];
    const allTags = dbMetadata.properties.tags?.multi_select?.options?.map(o => o.name) || [];

    const posts = response.results.map(page => {
      const p = page.properties;
      return {
        id: page.id,
        title: p.title?.title?.[0]?.plain_text || "无标题",
        type: p.type?.select?.name || "Post",
        slug: p.slug?.rich_text?.[0]?.plain_text || "",
        category: p.category?.select?.name || '未分类',
        date: p.date?.date?.start || ''
      };
    });

    return NextResponse.json({ success: true, posts, options: { categories, tags: allTags } });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message });
  }
}
