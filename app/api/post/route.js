import { Client } from '@notionhq/client';
import { NotionToMarkdown } from 'notion-to-md';
import { NextResponse } from 'next/server';

export const runtime = 'edge';

// 🟢 同样统一使用 NOTION_KEY
const notion = new Client({ auth: process.env.NOTION_KEY });
const n2m = new NotionToMarkdown({ notionClient: notion });

// 内置极简 MD 转 Blocks 函数
function simpleMdToBlocks(markdown) {
  const lines = markdown.split('\n');
  const blocks = [];
  for (let line of lines) {
    line = line.trim();
    if (!line) continue;
    if (line.startsWith('# ')) {
      blocks.push({ object: 'block', type: 'heading_1', heading_1: { rich_text: [{ type: 'text', text: { content: line.replace('# ', '') } }] } });
    } else {
      blocks.push({ object: 'block', type: 'paragraph', paragraph: { rich_text: [{ type: 'text', text: { content: line } }] } });
    }
  }
  return blocks;
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
    const props = {
        "title": { title: [{ text: { content: title } }] },
        "slug": { rich_text: [{ text: { content: slug } }] },
        "excerpt": { rich_text: [{ text: { content: excerpt || "" } }] },
        "update_date": { date: { start: now } }
    };
    if (id) {
        await notion.pages.update({ page_id: id, properties: props });
        const children = await notion.blocks.children.list({ block_id: id });
        for (const block of children.results) { await notion.blocks.delete({ block_id: block.id }); }
        await notion.blocks.children.append({ block_id: id, children: newBlocks });
        return NextResponse.json({ success: true });
    } else {
        await notion.pages.create({
            parent: { database_id: dbId },
            properties: { ...props, "type": { select: { name: 'Post' } }, "status": { select: { name: 'Published' } }, "date": { date: { start: now } } },
            children: newBlocks,
        });
        return NextResponse.json({ success: true });
    }
  } catch (error) { return NextResponse.json({ success: false, error: error.message }, { status: 500 }); }
}
