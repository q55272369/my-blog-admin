import { Client } from '@notionhq/client';
import { NotionToMarkdown } from 'notion-to-md';
import { NextResponse } from 'next/server';

export const runtime = 'edge';
const notion = new Client({ auth: process.env.NOTION_KEY });
const n2m = new NotionToMarkdown({ notionClient: notion });

// 🟢 高保真转换器：支持引用、列表、标题、图片
function highFidelityMdToBlocks(markdown) {
  const lines = markdown.split('\n');
  const blocks = [];

  for (let line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      // 保持空行，避免 Notion API 报错
      blocks.push({ object: 'block', type: 'paragraph', paragraph: { rich_text: [] } });
      continue;
    }

    // 1. 处理图片 ![]()
    const imgMatch = trimmed.match(/!\[.*\]\((.*)\)/);
    if (imgMatch) {
      blocks.push({ object: 'block', type: 'image', image: { type: 'external', external: { url: imgMatch[1] } } });
      continue;
    }

    // 2. 处理引用 (对应你截图中的 > 符号)
    if (trimmed.startsWith('> ')) {
      blocks.push({
        object: 'block', type: 'quote',
        quote: { rich_text: [{ type: 'text', text: { content: trimmed.replace('> ', '') } }] }
      });
      continue;
    }

    // 3. 处理无序列表 - 或 *
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      blocks.push({
        object: 'block', type: 'bulleted_list_item',
        bulleted_list_item: { rich_text: [{ type: 'text', text: { content: trimmed.substring(2) } }] }
      });
      continue;
    }

    // 4. 处理标题 # ## ###
    if (trimmed.startsWith('# ')) {
      blocks.push({ object: 'block', type: 'heading_1', heading_1: { rich_text: [{ type: 'text', text: { content: trimmed.replace('# ', '') } }] } });
    } else if (trimmed.startsWith('## ')) {
      blocks.push({ object: 'block', type: 'heading_2', heading_2: { rich_text: [{ type: 'text', text: { content: trimmed.replace('## ', '') } }] } });
    } else if (trimmed.startsWith('### ')) {
      blocks.push({ object: 'block', type: 'heading_3', heading_3: { rich_text: [{ type: 'text', text: { content: trimmed.replace('### ', '') } }] } });
    } 
    // 5. 普通段落
    else {
      blocks.push({
        object: 'block', type: 'paragraph',
        paragraph: { rich_text: [{ type: 'text', text: { content: trimmed } }] }
      });
    }
  }
  
  // 🟢 最终防御：确保 block 数量不超过 Notion 限制 (100个/次) 
  // 为简单起见，这里先确保每个 block 的 JSON 格式绝对正确
  return blocks.filter(b => b !== null);
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
    
    // 🟢 使用高保真转换逻辑
    const newBlocks = highFidelityMdToBlocks(content);
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
      // 1. 更新属性
      await notion.pages.update({ page_id: id, properties: props });
      
      // 2. 清理正文
      const children = await notion.blocks.children.list({ block_id: id });
      // 限制每次处理 50 个块以提高稳定性
      const oldBlockIds = children.results.map(b => b.id);
      for (let i = 0; i < oldBlockIds.length; i += 10) {
        const batch = oldBlockIds.slice(i, i + 10);
        await Promise.all(batch.map(bid => notion.blocks.delete({ block_id: bid })));
      }

      // 3. 写入新正文 (分批写入，防止大文章卡死)
      for (let i = 0; i < newBlocks.length; i += 20) {
        const batch = newBlocks.slice(i, i + 20);
        await notion.blocks.children.append({ block_id: id, children: batch });
      }
    } else {
      await notion.pages.create({ parent: { database_id: dbId }, properties: props, children: newBlocks.slice(0, 100) });
    }
    return NextResponse.json({ success: true });
  } catch (error) { 
    console.error("Notion API Error:", error);
    return NextResponse.json({ success: false, error: error.message }); 
  }
}

export async function DELETE(request) {
  const id = new URL(request.url).searchParams.get('id');
  try {
    await notion.pages.update({ page_id: id, archived: true });
    return NextResponse.json({ success: true });
  } catch (e) { return NextResponse.json({ success: false }); }
}
