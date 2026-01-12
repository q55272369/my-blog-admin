import { Client } from '@notionhq/client';
import { NotionToMarkdown } from 'notion-to-md';
import { NextResponse } from 'next/server';

export const runtime = 'edge';

const notion = new Client({ auth: process.env.NOTION_KEY });
const n2m = new NotionToMarkdown({ notionClient: notion });

// 🟢 高级转换函数：识别图片、标题和段落
function advancedMdToBlocks(markdown) {
  const lines = markdown.split('\n');
  const blocks = [];

  for (let line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // 1. 处理 Markdown 图片 ![] (url)
    const imgMatch = trimmed.match(/!\[.*\]\((.*)\)/);
    if (imgMatch) {
      blocks.push({
        object: 'block', type: 'image',
        image: { type: 'external', external: { url: imgMatch[1] } }
      });
      continue;
    }

    // 2. 处理标题 # ## ###
    if (trimmed.startsWith('# ')) {
      blocks.push({ object: 'block', type: 'heading_1', heading_1: { rich_text: [{ type: 'text', text: { content: trimmed.replace('# ', '') } }] } });
    } else if (trimmed.startsWith('## ')) {
      blocks.push({ object: 'block', type: 'heading_2', heading_2: { rich_text: [{ type: 'text', text: { content: trimmed.replace('## ', '') } }] } });
    } 
    // 3. 处理普通文本 (含粗体识别的极简处理)
    else {
      blocks.push({
        object: 'block', type: 'paragraph',
        paragraph: { rich_text: [{ type: 'text', text: { content: trimmed } }] }
      });
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
    const p = page.properties;
    
    return NextResponse.json({
        success: true,
        data: {
          title: p.title?.title?.[0]?.plain_text || '',
          slug: p.slug?.rich_text?.[0]?.plain_text || '',
          excerpt: p.excerpt?.rich_text?.[0]?.plain_text || '',
          category: p.category?.select?.name || '',
          tags: p.tags?.multi_select?.map(t => t.name).join(',') || '',
          cover: p.cover?.url || p.cover?.external?.url || '',
          type: p.type?.select?.name || 'Post',
          status: p.status?.status?.name || 'Published',
          content: mdString.parent
        }
    });
  } catch (error) { return NextResponse.json({ success: false }); }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { id, title, content, slug, excerpt, category, tags, cover, type, status } = body;
    const dbId = process.env.NOTION_DATABASE_ID;
    const newBlocks = advancedMdToBlocks(content);
    const now = new Date().toISOString();

    const props = {
      "title": { title: [{ text: { content: title } }] },
      "slug": { rich_text: [{ text: { content: slug } }] },
      "excerpt": { rich_text: [{ text: { content: excerpt || "" } }] },
      "category": { select: { name: category || "未分类" } },
      "tags": { multi_select: (tags || "").split(',').filter(Boolean).map(t => ({ name: t.trim() })) },
      "status": { status: { name: status } },
      "type": { select: { name: type } },
      "update_date": { date: { start: now } }
    };

    // 封面图处理 (如果输入了 URL)
    if (cover) {
      props["cover"] = { url: cover }; 
    }

    if (id) {
      await notion.pages.update({ page_id: id, properties: props });
      const children = await notion.blocks.children.list({ block_id: id });
      for (const block of children.results) { await notion.blocks.delete({ block_id: block.id }); }
      await notion.blocks.children.append({ block_id: id, children: newBlocks });
    } else {
      await notion.pages.create({
        parent: { database_id: dbId },
        properties: { ...props, "date": { date: { start: now } } },
        children: newBlocks,
      });
    }
    return NextResponse.json({ success: true });
  } catch (error) { 
    console.error(error);
    return NextResponse.json({ success: false, error: error.message }); 
  }
}
