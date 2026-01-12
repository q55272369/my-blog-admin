import { Client } from '@notionhq/client';
import { NotionToMarkdown } from 'notion-to-md';
import { NextResponse } from 'next/server';

export const runtime = 'edge';

const notion = new Client({ auth: process.env.NOTION_KEY });
const n2m = new NotionToMarkdown({ notionClient: notion });

function simpleMdToBlocks(markdown) {
  const lines = markdown.split('\n');
  return lines.map(line => ({
    object: 'block',
    type: 'paragraph',
    paragraph: { rich_text: [{ type: 'text', text: { content: line || " " } }] }
  }));
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const pageId = searchParams.get('id');
  try {
    const page = await notion.pages.retrieve({ page_id: pageId });
    const mdblocks = await n2m.pageToMarkdown(pageId);
    const mdString = n2m.toMarkdownString(mdblocks);
    const getProp = (name) => {
        const p = page.properties[name];
        if (!p) return '';
        if (p.type === 'title') return p.title[0]?.plain_text || '';
        if (p.type === 'rich_text') return p.rich_text[0]?.plain_text || '';
        return '';
    };
    return NextResponse.json({
        success: true,
        data: { title: getProp('title'), slug: getProp('slug'), excerpt: getProp('excerpt'), content: mdString.parent }
    });
  } catch (error) { return NextResponse.json({ success: false, error: error.message }, { status: 500 }); }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { id, title, content, slug, excerpt } = body;
    const dbId = process.env.NOTION_DATABASE_ID;
    const newBlocks = simpleMdToBlocks(content);
    const now = new Date().toISOString();
    
    // 基础属性
    const props = {
        "title": { title: [{ text: { content: title } }] },
        "slug": { rich_text: [{ text: { content: slug } }] },
        "excerpt": { rich_text: [{ text: { content: excerpt || "" } }] },
        "update_date": { date: { start: now } }
    };

    if (id) {
        // 更新模式
        await notion.pages.update({ page_id: id, properties: props });
        const children = await notion.blocks.children.list({ block_id: id });
        for (const block of children.results) { await notion.blocks.delete({ block_id: block.id }); }
        await notion.blocks.children.append({ block_id: id, children: newBlocks });
        return NextResponse.json({ success: true });
    } else {
        // 新建模式
        await notion.pages.create({
            parent: { database_id: dbId },
            properties: { 
                ...props, 
                // 默认新建的都设为 Post 类型，你也可以在 Notion 手动改
                "type": { select: { name: 'Post' } }, 
                // 🟢 这里的 status 必须匹配 Notion 的 Status 属性格式
                "status": { status: { name: 'Published' } }, 
                "date": { date: { start: now } } 
            },
            children: newBlocks,
        });
        return NextResponse.json({ success: true });
    }
  } catch (error) { 
    // 打印具体错误到控制台
    console.error("Notion Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 }); 
  }
}
