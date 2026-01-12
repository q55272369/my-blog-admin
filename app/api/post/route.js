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
  const id = new URL(request.url).searchParams.get('id');
  try {
    const page = await notion.pages.retrieve({ page_id: id });
    const mdblocks = await n2m.pageToMarkdown(id);
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
          date: p.date?.date?.start || '',
          content: mdString.parent
        }
    });
  } catch (error) { return NextResponse.json({ success: false }); }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { id, title, content, slug, excerpt, category, tags, cover, type, status, date } = body;
    const newBlocks = smartMdToBlocks(content);
    const now = new Date().toISOString();

    const props = {
      "title": { title: [{ text: { content: title } }] },
      "slug": { rich_text: [{ text: { content: slug } }] },
      "excerpt": { rich_text: [{ text: { content: excerpt || "" } }] },
      "category": category ? { select: { name: category } } : { select: null },
      "tags": { multi_select: (tags || "").split(',').filter(t => t.trim()).map(t => ({ name: t.trim() })) },
      "status": { status: { name: status } },
      "type": { select: { name: type } },
      "update_date": { date: { start: now } },
      "date": date ? { date: { start: date } } : null
    };
    if (cover) props["cover"] = { url: cover };

    if (id) {
      // 1. 更新属性
      await notion.pages.update({ page_id: id, properties: props });
      // 2. 只有当更新成功后，才执行内容重写
      const children = await notion.blocks.children.list({ block_id: id });
      // 性能与稳定性折中：分批并发删除
      const deletePromises = children.results.map(b => notion.blocks.delete({ block_id: b.id }));
      await Promise.all(deletePromises);
      // 3. 写入新内容
      await notion.blocks.children.append({ block_id: id, children: newBlocks });
    } else {
      await notion.pages.create({ parent: { database_id: process.env.NOTION_DATABASE_ID }, properties: props, children: newBlocks });
    }
    return NextResponse.json({ success: true });
  } catch (error) { return NextResponse.json({ success: false, error: error.message }); }
}

export async function DELETE(request) {
  const id = new URL(request.url).searchParams.get('id');
  try {
    await notion.pages.update({ page_id: id, archived: true });
    return NextResponse.json({ success: true });
  } catch (e) { return NextResponse.json({ success: false }); }
}
