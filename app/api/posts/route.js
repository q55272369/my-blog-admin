import { Client } from '@notionhq/client';
import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET() {
  const notion = new Client({ auth: process.env.NOTION_KEY });
  const dbId = process.env.NOTION_DATABASE_ID;

  try {
    const response = await notion.databases.query({
      database_id: dbId,
      // 🟢 关键：增加过滤器，只允许 Post 和 Widget 通过
      filter: {
        or: [
          { property: "type", select: { equals: "Post" } },
          { property: "type", select: { equals: "Widget" } }
        ]
      },
      sorts: [{ property: 'update_date', direction: 'descending' }],
    });

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
        category: p.category?.select?.name || '未分类',
        date: p.date?.date?.start || ''
      };
    });

    return NextResponse.json({ success: true, posts, options: { categories, tags: allTags } });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message });
  }
}
