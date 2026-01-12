import { Client } from '@notionhq/client';
import { NotionToMarkdown } from 'notion-to-md';
import { NextResponse } from 'next/server';

export const runtime = 'edge';

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const n2m = new NotionToMarkdown({ notionClient: notion });

// 🛠️ 内置的极简转换函数 (MD 文本 -> Notion Blocks)
function simpleMdToBlocks(markdown) {
  const lines = markdown.split('\n');
  const blocks = [];

  for (let line of lines) {
    line = line.trim();
    if (!line) continue;

    // 1. 处理标题 H1, H2, H3
    if (line.startsWith('# ')) {
      blocks.push({ object: 'block', type: 'heading_1', heading_1: { rich_text: [{ type: 'text', text: { content: line.replace('# ', '') } }] } });
    } else if (line.startsWith('## ')) {
      blocks.push({ object: 'block', type: 'heading_2', heading_2: { rich_text: [{ type: 'text', text: { content: line.replace('## ', '') } }] } });
    } else if (line.startsWith('### ')) {
      blocks.push({ object: 'block', type: 'heading_3', heading_3: { rich_text: [{ type: 'text', text: { content: line.replace('### ', '') } }] } });
    } 
    // 2. 处理无序列表
    else if (line.startsWith('- ') || line.startsWith('* ')) {
      blocks.push({ object: 'block', type: 'bulleted_list_item', bulleted_list_item: { rich_text: [{ type: 'text', text: { content: line.substring(2) } }] } });
    }
    // 3. 处理普通段落
    else {
      blocks.push({ object: 'block', type: 'paragraph', paragraph: { rich_text: [{ type: 'text', text: { content: line } }] } });
    }
  }
  return blocks;
}

// GET: 获取详情
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const pageId = searchParams.get('id');
  if (!pageId) return NextResponse.json({ error: 'No ID' }, { status: 400 });

  try {
    const page = await notion.pages.retrieve({ page_id: pageId });
    const mdblocks = await n2m.pageToMarkdown(pageId);
    const mdString = n2m.toMarkdownString(mdblocks);

    const getProp = (name) => {
        if (!page.properties[name]) return '';
        const prop = page.properties[name];
        if (prop.type === 'title') return prop.title[0]?.plain_text || '';
        if (prop.type === 'rich_text') return prop.rich_text[0]?.plain_text || '';
        return '';
    };

    return NextResponse.json({
        success: true,
        data: {
            title: getProp('title'),
            slug: getProp('slug'),
            excerpt: getProp('excerpt'),
            content: mdString.parent
        }
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: 新建或更新
export async function POST(request) {
  try {
    const body = await request.json();
    const { id, title, content, slug, excerpt } = body;
    const databaseId = process.env.NOTION_DATABASE_ID;

    // 🟢 调用内置转换逻辑
    const newBlocks = simpleMdToBlocks(content);

    const now = new Date().toISOString();
    const commonProperties = {
        "title": { title: [{ text: { content: title } }] },
        "slug": { rich_text: [{ text: { content: slug } }] },
        "excerpt": { rich_text: [{ text: { content: excerpt || "" } }] },
        "update_date": { date: { start: now } }
    };

    if (id) {
        await notion.pages.update({ page_id: id, properties: commonProperties });
        const children = await notion.blocks.children.list({ block_id: id });
        for (const block of children.results) {
            await notion.blocks.delete({ block_id: block.id });
        }
        await notion.blocks.children.append({ block_id: id, children: newBlocks });
        return NextResponse.json({ success: true, mode: 'update' });
    } else {
        await notion.pages.create({
            parent: { database_id: databaseId },
            properties: {
                ...commonProperties,
                "type": { select: { name: 'Post' } },
                "status": { select: { name: 'Published' } },
                "date": { date: { start: now } }
            },
            children: newBlocks,
        });
        return NextResponse.json({ success: true, mode: 'create' });
    }
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
