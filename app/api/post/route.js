import { Client } from '@notionhq/client';
import { NotionToMarkdown } from 'notion-to-md';
import { NextResponse } from 'next/server';

export const runtime = 'edge';
const notion = new Client({ auth: process.env.NOTION_KEY });
const n2m = new NotionToMarkdown({ notionClient: notion });

function mdToBlocks(markdown) {
  const lines = markdown.split('\n');
  const blocks = [];
  let isLocking = false;
  let lockPassword = '';
  let lockContent = [];

  for (let line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith(':::lock')) {
      isLocking = true;
      lockPassword = trimmed.replace(':::lock', '').trim() || '123';
      lockContent = [];
      continue;
    }

    if (isLocking && trimmed === ':::') {
      // 🟢 关键修改：构建带子块的 Callout
      blocks.push({
        object: 'block',
        type: 'callout',
        callout: {
          rich_text: [{ text: { content: `LOCK:${lockPassword}` }, annotations: { bold: true } }],
          icon: { type: "emoji", emoji: "🔒" },
          color: "gray_background",
          // 🚀 在子块里放入原生分割线和正文
          children: [
            { object: 'block', type: 'divider', divider: {} }, // 👈 原生分割线
            ...lockContent.map(contentLine => ({
              object: 'block',
              type: 'paragraph',
              paragraph: { rich_text: [{ text: { content: contentLine || " " } }] }
            }))
          ]
        }
      });
      isLocking = false;
      continue;
    }

    if (isLocking) {
      lockContent.push(line);
      continue;
    }

    if (!trimmed) {
      blocks.push({ object: 'block', type: 'paragraph', paragraph: { rich_text: [] } });
    } else {
      const imgMatch = trimmed.match(/!\[.*\]\((.*)\)/);
      if (imgMatch) {
        blocks.push({ object: 'block', type: 'image', image: { type: 'external', external: { url: imgMatch[1] } } });
      } else if (trimmed.startsWith('# ')) {
        blocks.push({ object: 'block', type: 'heading_1', heading_1: { rich_text: [{ text: { content: trimmed.replace('# ', '') } }] } });
      } else {
        // 简单处理加粗和链接
        blocks.push({ object: 'block', type: 'paragraph', paragraph: { rich_text: [{ text: { content: trimmed } }] } });
      }
    }
  }
  return blocks;
}

export async function GET(request) {
  const id = new URL(request.url).searchParams.get('id');
  try {
    const page = await notion.pages.retrieve({ page_id: id });
    const mdblocks = await n2m.pageToMarkdown(id);
    
    // 反向解析
    mdblocks.forEach(b => {
      if (b.type === 'callout' && b.parent.includes('LOCK:')) {
        const pwd = b.parent.match(/LOCK:([^\n]+)/)?.[1] || '123';
        // 过滤掉 md 转换过程中产生的额外横线字符
        const body = b.parent.split('---').pop() || ''; 
        b.parent = `:::lock ${pwd}\n${body.trim()}\n:::`;
      }
    });

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
    const { id, title, content, slug, excerpt, category, tags, cover, status, date } = body;
    const dbId = process.env.NOTION_DATABASE_ID;
    const newBlocks = mdToBlocks(content);
    
    const props = {
      "title": { title: [{ text: { content: title } }] },
      "slug": { rich_text: [{ text: { content: slug } }] },
      "excerpt": { rich_text: [{ text: { content: excerpt || "" } }] },
      "category": category ? { select: { name: category } } : { select: null },
      "tags": { multi_select: (tags || "").split(',').filter(t => t.trim()).map(t => ({ name: t.trim() })) },
      "status": { status: { name: status } },
      "date": date ? { date: { start: date } } : null,
      "update_date": { date: { start: new Date().toISOString() } },
      "type": { select: { name: "Post" } }
    };
    if (cover) props["cover"] = { url: cover };

    if (id) {
      await notion.pages.update({ page_id: id, properties: props });
      const children = await notion.blocks.children.list({ block_id: id });
      await Promise.all(children.results.map(b => notion.blocks.delete({ block_id: b.id })));
      // 这里的 20 是为了防止一次性写入太多 block 触发速率限制
      for (let i = 0; i < newBlocks.length; i += 20) {
        await notion.blocks.children.append({ block_id: id, children: newBlocks.slice(i, i + 20) });
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
