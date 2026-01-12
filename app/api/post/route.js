import { Client } from '@notionhq/client';
import { NotionToMarkdown } from 'notion-to-md';
import { NextResponse } from 'next/server';

export const runtime = 'edge';
const notion = new Client({ auth: process.env.NOTION_KEY });
const n2m = new NotionToMarkdown({ notionClient: notion });

// 🟢 增强版解析：支持 :::lock 语法转换为 Notion Callout
function mdToBlocks(markdown) {
  const lines = markdown.split('\n');
  const blocks = [];
  let isLocking = false;
  let lockPassword = '';
  let lockContent = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // 检测加密块开始 :::lock 123
    if (trimmed.startsWith(':::lock')) {
      isLocking = true;
      lockPassword = trimmed.replace(':::lock', '').trim() || '123';
      lockContent = [];
      continue;
    }

    // 检测加密块结束 :::
    if (isLocking && trimmed === ':::') {
      blocks.push({
        object: 'block',
        type: 'callout',
        callout: {
          // 构建加密块内容：标题 + 分割线 + 内容
          rich_text: [
            { text: { content: `LOCK:${lockPassword}\n` }, annotations: { bold: true } },
            { text: { content: "────────────────────────────────\n" }, annotations: { color: "gray" } },
            { text: { content: lockContent.join('\n') } }
          ],
          icon: { type: "emoji", emoji: "🔒" },
          color: "gray_background"
        }
      });
      isLocking = false;
      continue;
    }

    if (isLocking) {
      lockContent.push(line);
      continue;
    }

    // --- 以下是普通块处理 ---
    if (!trimmed) {
      blocks.push({ object: 'block', type: 'paragraph', paragraph: { rich_text: [] } });
      continue;
    }

    const imgMatch = trimmed.match(/!\[.*\]\((.*)\)/);
    if (imgMatch) {
      blocks.push({ object: 'block', type: 'image', image: { type: 'external', external: { url: imgMatch[1] } } });
    } else if (trimmed.startsWith('# ')) {
      blocks.push({ object: 'block', type: 'heading_1', heading_1: { rich_text: [{ type: 'text', text: { content: trimmed.replace('# ', '') } }] } });
    } else {
      // 简单解析加粗和链接
      const richText = [];
      const parts = trimmed.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g).filter(Boolean);
      for (const p of parts) {
        if (p.startsWith('**')) richText.push({ text: { content: p.slice(2, -2) }, annotations: { bold: true } });
        else if (p.startsWith('[')) {
          const m = p.match(/\[([^\]]+)\]\(([^)]+)\)/);
          if (m) richText.push({ text: { content: m[1], link: { url: m[2] } } });
        } else richText.push({ text: { content: p } });
      }
      blocks.push({ object: 'block', type: 'paragraph', paragraph: { rich_text: richText } });
    }
  }
  return blocks;
}

// 🟢 GET 适配：将 Notion 的 Callout 转回 :::lock 语法
export async function GET(request) {
  const id = new URL(request.url).searchParams.get('id');
  try {
    const page = await notion.pages.retrieve({ page_id: id });
    const mdblocks = await n2m.pageToMarkdown(id);
    
    // 拦截并转换加密块
    mdblocks.forEach(b => {
        if (b.type === 'callout' && b.parent.includes('LOCK:')) {
            const match = b.parent.match(/LOCK:([^\n]+)/);
            const pwd = match ? match[1] : '123';
            const content = b.parent.split('───')[1] || ''; // 粗略提取分割线后的内容
            b.parent = `:::lock ${pwd}\n${content.trim()}\n:::`;
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
      "update_date": { date: { start: new Date().toISOString() } }
    };
    if (cover) props["cover"] = { url: cover };
    if (id) {
      await notion.pages.update({ page_id: id, properties: props });
      const children = await notion.blocks.children.list({ block_id: id });
      await Promise.all(children.results.map(b => notion.blocks.delete({ block_id: b.id })));
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
