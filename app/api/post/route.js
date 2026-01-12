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
      // 🟢 防御性清理：移除所有可能的干扰符
      lockPassword = trimmed.replace(':::lock', '').replace(/[>*\s🔒]/g, '').trim() || '123';
      lockContent = [];
      continue;
    }

    if (isLocking && trimmed === ':::') {
      blocks.push({
        object: 'block',
        type: 'callout',
        callout: {
          rich_text: [{ text: { content: `LOCK:${lockPassword}` }, annotations: { bold: true } }],
          icon: { type: "emoji", emoji: "🔒" },
          color: "gray_background",
          // 🚀 核心优化：让 Callout 内部支持原生积木
          children: [
            { object: 'block', type: 'divider', divider: {} },
            ...lockContent.map(contentLine => {
              const imgMatch = contentLine.trim().match(/!\[.*\]\((.*)\)/);
              if (imgMatch) {
                // 🟢 重点：如果在加密块内发现图片，生成原生 Image 积木
                return { object: 'block', type: 'image', image: { type: 'external', external: { url: imgMatch[1].trim() } } };
              }
              return { object: 'block', type: 'paragraph', paragraph: { rich_text: [{ text: { content: contentLine || " " } }] } };
            })
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
      continue;
    }

    const imgMatch = trimmed.match(/!\[.*\]\((.*)\)/);
    if (imgMatch) {
      blocks.push({ object: 'block', type: 'image', image: { type: 'external', external: { url: imgMatch[1].trim() } } });
      continue;
    }

    if (trimmed.startsWith('# ')) {
      blocks.push({ object: 'block', type: 'heading_1', heading_1: { rich_text: [{ text: { content: trimmed.replace('# ', '') } }] } });
    } else {
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

export async function GET(request) {
  const id = new URL(request.url).searchParams.get('id');
  try {
    const page = await notion.pages.retrieve({ page_id: id });
    const mdblocks = await n2m.pageToMarkdown(id);
    
    mdblocks.forEach(b => {
      if (b.type === 'callout' && b.parent.includes('LOCK:')) {
        // 🟢 深度清理逻辑：只保留核心密码和纯净内容
        const lines = b.parent.split('\n');
        const pwdMatch = lines[0].match(/LOCK:([a-zA-Z0-9]+)/);
        const pwd = pwdMatch ? pwdMatch[1] : '123';
        
        // 过滤掉带 >、横线、图标的内容行
        const cleanBody = lines.slice(1)
          .map(l => l.replace(/^>\s*/, '').replace(/^[🔒\s*-]+/, '').trim())
          .filter(l => l !== '' && !l.includes('───'))
          .join('\n');

        b.parent = `:::lock ${pwd}\n${cleanBody}\n:::`;
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
