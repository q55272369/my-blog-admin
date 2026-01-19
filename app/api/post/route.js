import { Client } from '@notionhq/client';
import { NotionToMarkdown } from 'notion-to-md';
import { NextResponse } from 'next/server';

export const runtime = 'edge';
const notion = new Client({ auth: process.env.NOTION_KEY });
const n2m = new NotionToMarkdown({ notionClient: notion });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// 辅助：解析行内容
function parseLinesToChildren(text) {
  const lines = text.split(/\r?\n/);
  const blocks = [];
  
  for (let line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // 1. 媒体识别
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
      continue;
    } 

    // 🟢 3. 注释块 (新功能)：如果整行被反引号包裹，转为红色代码样式
    if (trimmed.startsWith('`') && trimmed.endsWith('`') && trimmed.length > 1) {
       const content = trimmed.slice(1, -1);
       blocks.push({ 
           object: 'block', type: 'paragraph', 
           paragraph: { rich_text: [{ text: { content: content }, annotations: { code: true, color: 'red' } }] } 
       });
       continue;
    }

    // 4. 普通文本
    blocks.push({ object: 'block', type: 'paragraph', paragraph: { rich_text: [{ text: { content: trimmed } }] } });
  }
  return blocks;
}

function mdToBlocks(markdown) {
  const rawChunks = markdown.split(/\n{2,}/);
  const blocks = [];
  
  let mergedChunks = [];
  let buffer = "";
  let isLocking = false;

  for (let chunk of rawChunks) {
    const t = chunk.trim();
    if (!t) continue;

    if (!isLocking && t.startsWith(':::lock')) {
      if (t.endsWith(':::')) {
        mergedChunks.push(t);
      } else {
        isLocking = true;
        buffer = t;
      }
    } else if (isLocking) {
      buffer += "\n\n" + t;
      if (t.endsWith(':::')) {
        isLocking = false;
        mergedChunks.push(buffer);
        buffer = "";
      }
    } else {
      mergedChunks.push(t);
    }
  }
  if (buffer) mergedChunks.push(buffer);

  for (let content of mergedChunks) {
    // A. 加密块处理
    if (content.startsWith(':::lock')) {
        const firstLineEnd = content.indexOf('\n');
        const header = content.substring(0, firstLineEnd > -1 ? firstLineEnd : content.length);
        
        // 🟢 修复：不再强制 '123'，允许空密码
        let pwd = header.replace(':::lock', '').replace(/[>*\s🔒]/g, '').trim(); 
        
        const body = content.replace(/^:::lock.*?\n/, '').replace(/\n:::$/, '').trim();
        
        blocks.push({ 
            object: 'block', type: 'callout', 
            callout: { 
                rich_text: [{ text: { content: `LOCK:${pwd}` }, annotations: { bold: true } }], 
                icon: { type: "emoji", emoji: "🔒" }, color: "gray_background", 
                children: [ { object: 'block', type: 'divider', divider: {} }, ...parseLinesToChildren(body) ] 
            } 
        });
        continue;
    }
    // B. 普通处理
    blocks.push(...parseLinesToChildren(content));
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
      // 🟢 修复：处理注释块 (NotionToMD 会把 code style 转为 `text`)
      // 这里的逻辑主要依赖前端 parseContentToBlocks 去识别反引号
      
      if (b.type === 'callout' && b.parent.includes('LOCK:')) {
        const pwdMatch = b.parent.match(/LOCK:(.*?)(\n|$)/);
        const pwd = pwdMatch ? pwdMatch[1].trim() : ''; // 🟢 允许空密码
        
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
