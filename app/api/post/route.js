import { Client } from '@notionhq/client';
import { NotionToMarkdown } from 'notion-to-md';
import { NextResponse } from 'next/server';

export const runtime = 'edge';
const notion = new Client({ auth: process.env.NOTION_KEY });
const n2m = new NotionToMarkdown({ notionClient: notion });

// 🟢 高级解析器：识别文本内部的 加粗、链接、颜色
function parseRichText(text) {
  const richText = [];
  // 匹配规则：加粗 **text**, 链接 [text](url), 颜色 {color:red}(text)
  // 为了稳定，这里采用分步处理逻辑
  let remainingText = text;

  // 这里使用一个极简的解析逻辑，满足基本需求
  // 1. 匹配加粗和链接
  const regex = /(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g;
  let match;
  let lastIndex = 0;

  while ((match = regex.exec(text)) !== null) {
    // 处理匹配项之前的普通文本
    if (match.index > lastIndex) {
      richText.push({ text: { content: text.substring(lastIndex, match.index) } });
    }

    const part = match[0];
    if (part.startsWith('**')) {
      // 加粗
      richText.push({ text: { content: part.slice(2, -2) }, annotations: { bold: true } });
    } else if (part.startsWith('[')) {
      // 链接
      const linkText = part.match(/\[([^\]]+)\]/)[1];
      const linkUrl = part.match(/\(([^)]+)\)/)[1];
      richText.push({ text: { content: linkText, link: { url: linkUrl } } });
    }
    lastIndex = regex.lastIndex;
  }

  // 处理剩余文本
  if (lastIndex < text.length) {
    richText.push({ text: { content: text.substring(lastIndex) } });
  }

  return richText.length > 0 ? richText : [{ text: { content: text } }];
}

function smartBlocks(markdown) {
  const lines = markdown.split('\n');
  const blocks = [];
  for (let line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      blocks.push({ object: 'block', type: 'paragraph', paragraph: { rich_text: [] } });
      continue;
    }

    // 图片识别
    const imgMatch = trimmed.match(/!\[.*\]\((.*)\)/);
    if (imgMatch) {
      blocks.push({ object: 'block', type: 'image', image: { type: 'external', external: { url: imgMatch[1] } } });
      continue;
    }

    // 标题识别 (H1, H2, H3)
    if (trimmed.startsWith('# ')) {
      blocks.push({ object: 'block', type: 'heading_1', heading_1: { rich_text: [{ text: { content: trimmed.replace('# ', '') } }] } });
    } else if (trimmed.startsWith('## ')) {
      blocks.push({ object: 'block', type: 'heading_2', heading_2: { rich_text: [{ text: { content: trimmed.replace('## ', '') } }] } });
    } else if (trimmed.startsWith('### ')) {
      blocks.push({ object: 'block', type: 'heading_3', heading_3: { rich_text: [{ text: { content: trimmed.replace('### ', '') } }] } });
    } 
    // 引用识别
    else if (trimmed.startsWith('> ')) {
      blocks.push({ object: 'block', type: 'quote', quote: { rich_text: parseRichText(trimmed.replace('> ', '')) } });
    }
    // 普通段落 (支持内部富文本)
    else {
      blocks.push({ object: 'block', type: 'paragraph', paragraph: { rich_text: parseRichText(trimmed) } });
    }
  }
  return blocks;
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
    const dbId = process.env.NOTION_DATABASE_ID;
    const newBlocks = smartBlocks(content);
    const now = new Date().toISOString();

    const props = {
      "title": { title: [{ text: { content: title || "无标题" } }] },
      "slug": { rich_text: [{ text: { content: slug || "" } }] },
      "excerpt": { rich_text: [{ text: { content: excerpt || "" } }] },
      "category": category ? { select: { name: category } } : { select: null },
      "tags": { multi_select: (tags || "").split(',').filter(t => t.trim()).map(t => ({ name: t.trim() })) },
      "status": { status: { name: status || "Published" } },
      "type": { select: { name: type || "Post" } },
      "update_date": { date: { start: now } }
    };
    if (date) props["date"] = { date: { start: date } };
    if (cover) props["cover"] = { url: cover };

    if (id) {
      await notion.pages.update({ page_id: id, properties: props });
      const children = await notion.blocks.children.list({ block_id: id });
      const oldBlockIds = children.results.map(b => b.id);
      for (let i = 0; i < oldBlockIds.length; i += 10) {
        const batch = oldBlockIds.slice(i, i + 10);
        await Promise.all(batch.map(bid => notion.blocks.delete({ block_id: bid })));
      }
      for (let i = 0; i < newBlocks.length; i += 20) {
        const batch = newBlocks.slice(i, i + 20);
        await notion.blocks.children.append({ block_id: id, children: batch });
      }
    } else {
      await notion.pages.create({ parent: { database_id: dbId }, properties: props, children: newBlocks.slice(0, 100) });
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
