import { Client } from '@notionhq/client';
import { NotionToMarkdown } from 'notion-to-md';
import { NextResponse } from 'next/server';

export const runtime = 'edge';
const notion = new Client({ auth: process.env.NOTION_KEY });
const n2m = new NotionToMarkdown({ notionClient: notion });
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function mdToBlocks(markdown) {
  const lines = markdown.split(/\r?\n/);
  const blocks = [];
  let isLocking = false; let lockPassword = ''; let lockContent = [];

  for (let line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith(':::lock')) { isLocking = true; lockPassword = trimmed.replace(':::lock', '').replace(/[>*\s🔒]/g, '').trim() || '123'; lockContent = []; continue; }
    if (isLocking && trimmed === ':::') {
      blocks.push({ 
        object: 'block', type: 'callout', 
        callout: { 
          rich_text: [{ text: { content: `LOCK:${lockPassword}` }, annotations: { bold: true } }], 
          icon: { type: "emoji", emoji: "🔒" }, color: "gray_background", 
          children: [ { object: 'block', type: 'divider', divider: {} }, ...mdToBlocks(lockContent.join('\n')) ] 
        } 
      });
      isLocking = false; continue;
    }
    if (isLocking) { if (trimmed) lockContent.push(line); continue; }
    if (!trimmed) continue;

    const imgMatch = trimmed.match(/!\[.*\]\((.*)\)/);
    if (imgMatch) { 
      const url = encodeURI(imgMatch[1].trim());
      // 🟢 关键：识别视频后缀，自动切换积木类型
      const isVideo = url.match(/\.(mp4|mov|webm|ogg|m4v)(\?|$)/i);
      const type = isVideo ? 'video' : 'image';
      blocks.push({ object: 'block', type: type, [type]: { type: 'external', external: { url: url } } }); 
      continue; 
    }
    if (trimmed.startsWith('# ')) { blocks.push({ object: 'block', type: 'heading_1', heading_1: { rich_text: [{ text: { content: trimmed.replace('# ', '') } }] } }); } 
    else { blocks.push({ object: 'block', type: 'paragraph', paragraph: { rich_text: [{ text: { content: line } }] } }); }
  }
  return blocks;
}

export async function GET(request) {
  const id = new URL(request.url).searchParams.get('id');
  if(!id) return NextResponse.json({ success: false });
  try {
    const page = await notion.pages.retrieve({ page_id: id });
    const mdblocks = await n2m.pageToMarkdown(id);
    let rawBlocks = [];
    try { const res = await notion.blocks.children.list({ block_id: id }); rawBlocks = res.results; } catch (e) {}
    mdblocks.forEach(b => {
      if (b.type === 'callout' && b.parent.includes('LOCK:')) {
        const pwd = b.parent.match(/LOCK:([a-zA-Z0-9]+)/)?.[1] || '123';
        const parts = b.parent.split('---');
        let body = parts.length > 1 ? parts.slice(1).join('---') : parts[0].replace(/LOCK:.*\n?/, '');
        body = body.replace(/^>[ \t]*/gm, '').replace(/\n\s*\n/g, '\n').trim();
        b.parent = `:::lock ${pwd}\n${body}\n:::`;
      }
    });
    const mdStringObj = n2m.toMarkdownString(mdblocks);
    const p = page.properties;
    return NextResponse.json({
      success: true,
      data: {
        title: p.title?.title?.[0]?.plain_text || '',
        category: p.category?.select?.name || '',
        tags: p.tags?.multi_select?.map(t => t.name).join(',') || '',
        cover: p.cover?.url || '',
        date: p.date?.date?.start || '',
        content: mdStringObj.parent.replace(/\n\s*\n/g, '\n').trim(), 
        rawBlocks: rawBlocks
      }
    });
  } catch (e) { return NextResponse.json({ success: false }); }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { id, title, content, category, tags, cover, date, type } = body;
    const dbId = process.env.NOTION_DATABASE_ID;
    const newBlocks = mdToBlocks(content);
    const props = {
      "title": { title: [{ text: { content: title } }] },
      "slug": { rich_text: [{ text: { content: `p-${Date.now()}` } }] }, // 自动生成 Slug
      "category": category ? { select: { name: category } } : { select: null },
      "tags": { multi_select: (tags || "").split(',').filter(t => t.trim()).map(t => ({ name: t.trim() })) },
      "status": { status: { name: "Published" } },
      "date": date ? { date: { start: date } } : null,
      "type": { select: { name: type || "Post" } }
    };
    if (cover) props["cover"] = { url: cover };
    if (id) {
      await notion.pages.update({ page_id: id, properties: props });
      const children = await notion.blocks.children.list({ block_id: id });
      await Promise.all(children.results.map(b => notion.blocks.delete({ block_id: b.id })));
      await sleep(800); 
      for (let i = 0; i < newBlocks.length; i += 10) {
        await notion.blocks.children.append({ block_id: id, children: newBlocks.slice(i, i + 10) });
        await sleep(300);
      }
    } else {
      await notion.pages.create({ parent: { database_id: dbId }, properties: props, children: newBlocks.slice(0, 50) });
    }
    return NextResponse.json({ success: true });
  } catch (error) { return NextResponse.json({ success: false, error: error.message }); }
}

export async function DELETE(request) {
  const id = new URL(request.url).searchParams.get('id');
  await notion.pages.update({ page_id: id, archived: true });
  return NextResponse.json({ success: true });
}
