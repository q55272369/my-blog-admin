import { Client } from '@notionhq/client';
import { NotionToMarkdown } from 'notion-to-md';
import { NextResponse } from 'next/server';

export const runtime = 'edge';
const notion = new Client({ auth: process.env.NOTION_KEY });
const n2m = new NotionToMarkdown({ notionClient: notion });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// 🔄 递归解析行：把一个大文本块拆解为多个 Notion 积木
function parseLinesToBlocks(text) {
  const lines = text.split(/\r?\n/);
  const blocks = [];
  
  for (let line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // 1. 媒体识别 (支持 ![]() 和 [])
    const mediaMatch = trimmed.match(/(?:!|)?\[.*?\]\((.*?)\)/);
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

    // 2. 标题
    if (trimmed.startsWith('# ')) {
      blocks.push({ object: 'block', type: 'heading_1', heading_1: { rich_text: [{ text: { content: trimmed.replace('# ', '') } }] } });
    } else if (trimmed.startsWith('## ')) {
      blocks.push({ object: 'block', type: 'heading_2', heading_2: { rich_text: [{ text: { content: trimmed.replace('## ', '') } }] } });
    } 
    // 3. 普通文本
    else {
      blocks.push({ object: 'block', type: 'paragraph', paragraph: { rich_text: [{ text: { content: trimmed } }] } });
    }
  }
  return blocks;
}

function mdToBlocks(markdown) {
  // 1. 先按双换行切分大块 (保留用户编辑时的块结构)
  const rawChunks = markdown.split(/\n{2,}/);
  const blocks = [];
  
  let isLocking = false; 
  let lockPassword = ''; 
  let lockBuffer = [];

  for (let chunk of rawChunks) {
    const t = chunk.trim();
    if (!t) continue;

    // --- 加密块逻辑 ---
    // 检查开头
    if (!isLocking && t.startsWith(':::lock')) {
       // 提取密码
       const firstLineEnd = t.indexOf('\n');
       const header = t.substring(0, firstLineEnd > -1 ? firstLineEnd : t.length);
       lockPassword = header.replace(':::lock', '').replace(/[>*\s🔒]/g, '').trim() || '123';
       
       isLocking = true;
       
       // 如果这一块不仅仅是头，还有内容
       let content = t;
       if (firstLineEnd > -1) content = t.substring(firstLineEnd + 1);
       else content = ""; // 只有头

       // 检查是否在本块结束
       if (content.endsWith(':::')) {
           content = content.replace(/\n:::$/, '');
           blocks.push({
               object: 'block', type: 'callout',
               callout: {
                   rich_text: [{ text: { content: `LOCK:${lockPassword}` }, annotations: { bold: true } }],
                   icon: { type: "emoji", emoji: "🔒" }, color: "gray_background",
                   children: [ { object: 'block', type: 'divider', divider: {} }, ...parseLinesToBlocks(content) ]
               }
           });
           isLocking = false;
           lockBuffer = [];
       } else {
           if(content) lockBuffer.push(content);
       }
       continue;
    }

    // 检查中间或结尾
    if (isLocking) {
        if (t.endsWith(':::')) {
            lockBuffer.push(t.replace(/\n:::$/, ''));
            blocks.push({
               object: 'block', type: 'callout',
               callout: {
                   rich_text: [{ text: { content: `LOCK:${lockPassword}` }, annotations: { bold: true } }],
                   icon: { type: "emoji", emoji: "🔒" }, color: "gray_background",
                   children: [ { object: 'block', type: 'divider', divider: {} }, ...parseLinesToBlocks(lockBuffer.join('\n')) ]
               }
           });
           isLocking = false;
           lockBuffer = [];
        } else {
            lockBuffer.push(t);
        }
        continue;
    }

    // --- 普通块逻辑 ---
    // 🟢 关键修复：调用 parseLinesToBlocks 逐行处理，防止丢数据
    blocks.push(...parseLinesToBlocks(t));
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
    try { const blocksRes = await notion.blocks.children.list({ block_id: id }); rawBlocks = blocksRes.results; } catch (e) {}

    mdblocks.forEach(b => {
      if (b.type === 'callout' && b.parent.includes('LOCK:')) {
        const pwd = b.parent.match(/LOCK:([a-zA-Z0-9]+)/)?.[1] || '123';
        const parts = b.parent.split('---');
        let body = parts.length > 1 ? parts.slice(1).join('---') : parts[0].replace(/LOCK:.*\n?/, '');
        body = body.replace(/^>[ \t]*/gm, '').trim(); 
        b.parent = `:::lock ${pwd}\n\n${body}\n\n:::`;
      }
    });

    const mdStringObj = n2m.toMarkdownString(mdblocks);
    const cleanContent = mdStringObj.parent.trim();

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
      for (let i = 0; i < newBlocks.length; i += 10) {
        await notion.blocks.children.append({ block_id: id, children: newBlocks.slice(i, i + 10) });
        if (i + 10 < newBlocks.length) await sleep(300);
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
