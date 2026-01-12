import { Client } from '@notionhq/client';
import { NextResponse } from 'next/server';

// ⚠️ 这一行非常重要，千万别漏了
export const runtime = 'edge';

// ⚠️ 这里的 'export' 和 'GET' 是必须的，报错就是因为缺了这个
export async function GET() {
  const notion = new Client({ auth: process.env.NOTION_API_KEY });
  const databaseId = process.env.NOTION_DATABASE_ID;

  try {
    const response = await notion.databases.query({
      database_id: databaseId,
      sorts: [{ property: 'created_time', direction: 'descending' }],
    });

    const posts = response.results.map(page => {
        // 安全获取属性
        const getProp = (name) => {
            if (!page.properties[name]) return '';
            const prop = page.properties[name];
            if (prop.type === 'title') return prop.title[0]?.plain_text || '无标题';
            if (prop.type === 'rich_text') return prop.rich_text[0]?.plain_text || '';
            if (prop.type === 'select') return prop.select?.name || 'Draft';
            return '';
        };

        return {
            id: page.id,
            title: getProp('Title') || getProp('Name') || getProp('title'),
            slug: getProp('Slug') || getProp('slug'),
            status: getProp('Status') || getProp('status'),
        };
    });

    return NextResponse.json({ success: true, posts });
  } catch (error) {
    console.error('Notion API Error:', error); // 这一行能帮我们在终端看到具体错误
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}