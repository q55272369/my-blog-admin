import { Client } from '@notionhq/client';
import { NextResponse } from 'next/server';

export const runtime = 'edge';
const notion = new Client({ auth: process.env.NOTION_KEY });

// 🟢 HTML 标签转 Notion 富文本积木
function htmlToRichText(html) {
  const richText = [];
  // 简单的正则拆分标签 (支持 <b>, <span style="color:...">, <a>)
  const parts = html.split(/(<[^>]+>[^<]*<\/[^>]+>|<[^>]+>)/g).filter(Boolean);

  for (const part of parts) {
    if (part.startsWith('<b') || part.startsWith('<strong')) {
      const text = part.replace(/<[^>]+>/g, '');
      richText.push({ text: { content: text }, annotations: { bold: true } });
    } else if (part.startsWith('<span')) {
      const text = part.replace(/<[^>]+>/g, '');
      const colorMatch = part.match(/color:\s*([^;"]+)/);
      const color = colorMatch ? colorMatch[1] : 'default';
      richText.push({ text: { content: text }, annotations: { color: color } });
    } else if (part.startsWith('<a')) {
      const text = part.replace(/<[^>]+>/g, '');
      const hrefMatch = part.match(/href="([^"]+)"/);
      richText.push({ text: { content: text, link: hrefMatch ? { url: hrefMatch[1] } : null } });
    } else if (!part.startsWith('<')) {
      richText.push({ text: { content: part } });
    }
  }
  return richText.length > 0 ? richText : [{ text: { content: html.replace(/<[^>]+>/g, '') } }];
}

function processContent(html) {
  // 将 HTML 按行拆分（<div> 或 <p> 标签）
  const lines = html.split(/<div>|<\/div>|<p>|<\/p>|<br\/?>/).filter(l => l.trim() !== '');
  return lines.map(line => {
    const text = line.trim();
    if (text.startsWith('<h1>')) {
      return { object: 'block', type: 'heading_1', heading_1: { rich_text: htmlToRichText(text.replace(/<\/?h1>/g, '')) } };
    }
    // 图片处理
    const imgMatch = text.match(/src="([^"]+)"/);
    if (text.includes('<img')) {
      return { object: 'block', type: 'image', image: { type: 'external', external: { url: imgMatch[1] } } };
    }
    return { object: 'block', type: 'paragraph', paragraph: { rich_text: htmlToRichText(text) } };
  });
}

export async function GET(request) {
  const id = new URL(request.url).searchParams.get('id');
  try {
    const page = await notion.pages.retrieve({ page_id: id });
    const p = page.properties;
    // 注意：获取现有内容在 Edge 环境下较复杂，简化为返回属性，正文建议重新编辑或在 Notion 查看
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
          content: '' // 富文本模式建议主要用于创作新内容
        }
    });
  } catch (error) { return NextResponse.json({ success: false }); }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { id, title, content, slug, excerpt, category, tags, cover, status, date } = body;
    const dbId = process.env.NOTION_DATABASE_ID;
    
    const blocks = processContent(content);
    const now = new Date().toISOString();

    const props = {
      "title": { title: [{ text: { content: title || "无标题" } }] },
      "slug": { rich_text: [{ text: { content: slug || "" } }] },
      "excerpt": { rich_text: [{ text: { content: excerpt || "" } }] },
      "category": category ? { select: { name: category } } : { select: null },
      "tags": { multi_select: (tags || "").split(',').filter(t => t.trim()).map(t => ({ name: t.trim() })) },
      "status": { status: { name: status || "Published" } },
      "update_date": { date: { start: now } },
      "type": { select: { name: "Post" } }
    };
    if (date) props["date"] = { date: { start: date } };
    if (cover) props["cover"] = { url: cover };

    if (id) {
      await notion.pages.update({ page_id: id, properties: props });
      const children = await notion.blocks.children.list({ block_id: id });
      await Promise.all(children.results.map(b => notion.blocks.delete({ block_id: b.id })));
      for (let i = 0; i < blocks.length; i += 10) {
        await notion.blocks.children.append({ block_id: id, children: blocks.slice(i, i + 10) });
      }
    } else {
      await notion.pages.create({ parent: { database_id: dbId }, properties: props, children: blocks.slice(0, 50) });
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
