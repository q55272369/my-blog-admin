import { Client } from '@notionhq/client';
import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET() {
  const apiKey = process.env.NOTION_KEY;
  const dbId = process.env.NOTION_DATABASE_ID;

  if (!apiKey || !dbId) return NextResponse.json({ success: false, error: '缺少配置' }, { status: 500 });

  const notion = new Client({ auth: apiKey });

  try {
    const response = await notion.databases.query({
      database_id: dbId,
      // 🟢 删除了之前的 filter，现在会抓取所有 type (Page, Post, Widget 等)
      sorts: [{ property: 'update_date', direction: 'descending' }],
    });

    const posts = response.results.map(page => {
      const props = page.properties;
      
      // 获取标题的辅助逻辑
      let title = '无标题';
      if (props.title && props.title.title && props.title.title[0]) {
        title = props.title.title[0].plain_text;
      }

      // 获取类型的辅助逻辑 (Page/Post/Widget)
      let typeName = '未知';
      if (props.type && props.type.select) {
        typeName = props.type.select.name;
      }

      // 过滤掉完全没标题的空行（Notion 数据库经常会自动产生空行）
      if (title === '无标题' && !typeName) return null;

      return {
        id: page.id,
        title: title,
        type: typeName
      };
    }).filter(p => p !== null);

    return NextResponse.json({ success: true, posts });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
