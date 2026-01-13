import { Client } from '@notionhq/client';
import { NextResponse } from 'next/server';

export const runtime = 'edge';
const notion = new Client({ auth: process.env.NOTION_KEY });

export async function DELETE(request) {
  const { searchParams } = new URL(request.url);
  const tagName = searchParams.get('name');
  const dbId = process.env.NOTION_DATABASE_ID;

  try {
    // 1. 获取当前数据库的最新属性
    const db = await notion.databases.retrieve({ database_id: dbId });
    const currentTags = db.properties.tags.multi_select.options;

    // 2. 过滤掉要删除的那个标签
    const updatedTags = currentTags.filter(t => t.name !== tagName);

    // 3. 更新数据库架构
    await notion.databases.update({
      database_id: dbId,
      properties: {
        tags: {
          multi_select: { options: updatedTags }
        }
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message });
  }
}
