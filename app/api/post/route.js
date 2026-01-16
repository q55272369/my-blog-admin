import { Client } from '@notionhq/client';
import { NotionToMarkdown } from 'notion-to-md';
import { NextResponse } from 'next/server';

export const runtime = 'edge';
const notion = new Client({ auth: process.env.NOTION_KEY });
const n2m = new NotionToMarkdown({ notionClient: notion });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function mdToBlocks(markdown) {
  // 🟢 核心修复：先按双换行切割成“大块”，保持块的数量与用户意图一致
  const rawBlocks = markdown.split(/\n{2,}/); 
  const blocks = [];
  let isLocking = false; 
  let lockPassword = ''; 
  let lockContent = [];

  for (let rawBlock of rawBlocks) {
    const trimmedBlock = rawBlock.trim();
    if (!trimmedBlock) continue;

    // --- 加密块逻辑 ---
    if (trimmedBlock.startsWith(':::lock')) { 
      // 提取密码，剩下的部分作为内容开始
      const firstLineEnd = trimmedBlock.indexOf('\n');
      const header = trimmedBlock.substring(0, firstLineEnd > -1 ? firstLineEnd : trimmedBlock.length);
      
      isLocking = true; 
      lockPassword = header.replace(':::lock', '').replace(/[>*\s🔒]/g, '').trim() || '123'; 
      
      // 如果这一块里不仅仅有头，还有内容，先存起来
      if (firstLineEnd > -1) {
        lockContent.push(trimmedBlock.substring(firstLineEnd + 1));
      }
      continue; 
    }

    if (isLocking && trimmedBlock === ':::') {
      blocks.push({ 
        object: 'block', type: 'callout', 
        callout: { 
          rich_text: [{ text: { content: `LOCK:${lockPassword}` }, annotations: { bold: true } }], 
          icon: { type: "emoji", emoji: "🔒" }, color: "gray_background", 
          children: [ { object: 'block', type: 'divider', divider: {} }, ...mdToBlocks(lockContent.join('\n\n')) ] 
        } 
      });
      isLocking = false; 
      lockContent = [];
      continue;
    }

    if (isLocking) { 
      lockContent.push(trimmedBlock); 
      continue; 
    }

    // --- 媒体识别 (支持 ![]() 和 []) ---
    const mediaMatch = trimmedBlock.match(/(?:!|)?\[.*?\]\((.*?)\)/);
    if (mediaMatch) { 
      let url = mediaMatch[1].trim();
      const safeUrl = url.includes('%') ? url : encodeURI(url);
      const isVideo = url.match(/\.(mp4|mov|webm|ogg|mkv)(\?|$)/i);
      
      if (isVideo) {
        blocks.push({ object: 'block', type: 'video', video: { type: 'external', external: { url: safeUrl } } });
      } else {
        blocks.push({ object: 'block', type: 'image', image: { type: 'external', external: { url: safeUrl } } });
      }
      continue; 
    }

    // --- 文本处理 ---
    if (trimmedBlock.startsWith('# ')) { 
      blocks.push({ object: 'block', type: 'heading_1', heading_1: { rich_text: [{ text: { content: trimmedBlock.replace('# ', '') } }] } }); 
    } else { 
      // 🟢 普通文本：直接作为一个段落块，保留内部换行
      blocks.push({ object: 'block', type: 'paragraph', paragraph: { rich_text: [{ text: { content: trimmedBlock } }] } }); 
    }
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
    try { const blocksRes = await notion.blocks.children.list({ block_id: id }); rawBlocks = blocksRes.results; } catch (e) { console.error(e); }

    mdblocks.forEach(b => {
      if (b.type === 'callout' && b.parent.includes('LOCK:')) {
        const pwd = b.parent.match(/LOCK:([a-zA-Z0-9]+)/)?.[1] || '123';
        const parts = b.parent.split('---');
        let body = parts.length > 1 ? parts.slice(1).join('---') : parts[0].replace(/LOCK:.*\n?/, '');
        body = body.replace(/^>[ \t]*/gm, '').trim(); 
        b.parent = `:::lock ${pwd}\n\n${body}\n\n:::`; // 🟢 增加换行，确保分隔清晰
      }
    });

    const mdStringObj = n2m.toMarkdownString(mdblocks);
    // 🟢 保持原始结构，不随意压缩
    let cleanContent = mdStringObj.parent.trim();

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
        type: p.type?.select?.name || 'Post',
        content: cleanContent, 
        rawBlocks: rawBlocks
      }
    });
  } catch (e) { return NextResponse.json({ success: false, error: e.message }); }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { id, title, content, slug, excerpt, category, tags, cover, status, date, type } = body;
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
      "type": { select: { name: type || "Post" } }
    };
    if (cover) props["cover"] = { url: cover };
    
    if (id) {
      await notion.pages.update({ page_id: id, properties: props });
      const children = await notion.blocks.children.list({ block_id: id });
      await Promise.all(children.results.map(b => notion.blocks.delete({ block_id: b.id })));
      await sleep(1000); 
      const chunkSize = 10; 
      for (let i = 0; i < newBlocks.length; i += chunkSize) {
        await notion.blocks.children.append({ block_id: id, children: newBlocks.slice(i, i + chunkSize) });
        if (i + chunkSize < newBlocks.length) await sleep(300);
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
