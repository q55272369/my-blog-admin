import { Client } from '@notionhq/client';
import { NotionToMarkdown } from 'notion-to-md';
import { NextResponse } from 'next/server';

export const runtime = 'edge';
const notion = new Client({ auth: process.env.NOTION_KEY });
const n2m = new NotionToMarkdown({ notionClient: notion });

// 🟢 增强版富文本解析：支持 [文字]{颜色} 语法
function parseRichText(text) {
  const richText = [];
  // 匹配加粗 **text**, 链接 [text](url), 颜色 [text]{color}
  const regex = /(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\)|\[[^\]]+\]\{[a-z]+\})/g;
  let match;
  let lastIndex = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      richText.push({ text: { content: text.substring(lastIndex, match.index) } });
    }

    const part = match[0];
    if (part.startsWith('**')) {
      richText.push({ text: { content: part.slice(2, -2) }, annotations: { bold: true } });
    } else if (part.includes(']{')) {
      // 处理颜色样式 [文字]{red}
      const content = part.match(/\[([^\]]+)\]/)[1];
      const color = part.match(/\{([^}]+)\}/)[1];
      richText.push({ text: { content: content }, annotations: { color: color } });
    } else if (part.startsWith('[')) {
      const linkText = part.match(/\[([^\]]+)\]/)[1];
      const linkUrl = part.match(/\(([^)]+)\)/)[1];
      richText.push({ text: { content: linkText, link: { url: linkUrl } } });
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    richText.push({ text: { content: text.substring(lastIndex) } });
  }
  return richText.length > 0 ? richText : [{ text: { content: text } }];
}

function smartBlocks(markdown) {
  const lines = markdown.split('\n');
  return lines.map(line => {
    const trimmed = line.trim();
    if (!trimmed) return { object: 'block', type: 'paragraph', paragraph: { rich_text: [] } };
    const imgMatch = trimmed.match(/!\[.*\]\((.*)\)/);
    if (imgMatch) return { object: 'block', type: 'image', image: { type: 'external', external: { url: imgMatch[1] } } };
    if (trimmed.startsWith('# ')) return { object: 'block', type: 'heading_1', heading_1: { rich_text: [{ type: 'text', text: { content: trimmed.replace('# ', '') } }] } };
    return { object: 'block', type: 'paragraph', paragraph: { rich_text: parseRichText(trimmed) } };
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
    const dbId = process.env.NOTION_DATABASE_ID;
    const newBlocks = smartBlocks(content);
    const props = {
      "title": { title: [{ text: { content: title || "无标题" } }] },
      "slug": { rich_text: [{ text: { content: slug || "" } }] },
      "excerpt": { rich_text: [{ text: { content: excerpt || "" } }] },
      "category": category ? { select: { name: category } } : { select: null },
      "tags": { multi_select: (tags || "").split(',').filter(t => t.trim()).map(t => ({ name: t.trim() })) },
      "status": { status: { name: status || "Published" } },
      "type": { select: { name: type || "Post" } },
      "update_date": { date: { start: new Date().toISOString() } },
      "date": date ? { date: { start: date } } : null
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
  try {
    await notion.pages.update({ page_id: id, archived: true });
    return NextResponse.json({ success: true });
  } catch (e) { return NextResponse.json({ success: false }); }
}
