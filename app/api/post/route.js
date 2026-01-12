import { Client } from '@notionhq/client';
import { NotionToMarkdown } from 'notion-to-md';
import { NextResponse } from 'next/server';

export const runtime = 'edge';

const notion = new Client({ auth: process.env.NOTION_KEY });
const n2m = new NotionToMarkdown({ notionClient: notion });

function smartMdToBlocks(markdown) {
  const lines = markdown.split('\n');
  return lines.map(line => {
    const trimmed = line.trim();
    if (!trimmed) return { object: 'block', type: 'paragraph', paragraph: { rich_text: [] } };
    const imgMatch = trimmed.match(/!\[.*\]\((.*)\)/);
    if (imgMatch) return { object: 'block', type: 'image', image: { type: 'external', external: { url: imgMatch[1] } } };
    if (trimmed.startsWith('# ')) return { object: 'block', type: 'heading_1', heading_1: { rich_text: [{ type: 'text', text: { content: trimmed.replace('# ', '') } }] } };
    return { object: 'block', type: 'paragraph', paragraph: { rich_text: [{ type: 'text', text: { content: trimmed } }] } };
  });
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
          cover: p.cover?.url || '',
          type: p.type?.select?.name || 'Post',
          status: p.status?.status?.name || 'Published',
          date: p.date?.date?.start || '', // 🟢 读取日期
          content: mdString.parent
        }
    });
  } catch (error) { return NextResponse.json({ success: false }); }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { id, title, content, slug, excerpt, category, tags, cover, type, status, date } = body;
    const dbId = process.env.NOTION_DATABASE_ID;
    const newBlocks = smartMdToBlocks(content);
    const now = new Date().toISOString();

    const props = {
      "title": { title: [{ text: { content: title } }] },
      "slug": { rich_text: [{ text: { content: slug } }] },
      "excerpt": { rich_text: [{ text: { content: excerpt || "" } }] },
      "status": { status: { name: status } },
      "type": { select: { name: type } },
      "update_date": { date: { start: now } }
    };

    // 🟢 处理日期 (如果没选则留空或填当前)
    if (date) { props["date"] = { date: { start: date } }; }
    
    // 🟢 处理分类 (Select)
    if (category) { props["category"] = { select: { name: category } }; }
    else { props["category"] = null; }

    // 🟢 处理标签 (Multi-select)
    props["tags"] = { 
      multi_select: (tags || "").split(',').filter(t => t.trim()).map(t => ({ name: t.trim() })) 
    };

    if (cover) { props["cover"] = { url: cover }; }

    if (id) {
      await notion.pages.update({ page_id: id, properties: props });
      const children = await notion.blocks.children.list({ block_id: id });
      
      // 🚀 性能优化：并发删除旧块 (速度大幅提升)
      await Promise.all(children.results.map(block => 
        notion.blocks.delete({ block_id: block.id })
      ));
      
      await notion.blocks.children.append({ block_id: id, children: newBlocks });
    } else {
      await notion.pages.create({
        parent: { database_id: dbId },
        properties: props,
        children: newBlocks,
      });
    }
    return NextResponse.json({ success: true });
  } catch (error) { return NextResponse.json({ success: false, error: error.message }); }
}

export async function DELETE(request) {
  const id = new URL(request.url).searchParams.get('id');
  try {
    await notion.pages.update({ page_id: id, archived: true });
    return NextResponse.json({ success: true });
  } catch (error) { return NextResponse.json({ success: false }); }
}
