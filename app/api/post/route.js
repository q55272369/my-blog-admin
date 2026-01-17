import { Client } from '@notionhq/client';
import { NotionToMarkdown } from 'notion-to-md';
import { NextResponse } from 'next/server';

export const runtime = 'edge';
const notion = new Client({ auth: process.env.NOTION_KEY });
const n2m = new NotionToMarkdown({ notionClient: notion });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// 辅助：解析行内容为 Notion 积木 (Image/Video/Text)
function parseContentToNotionChildren(textBuffer) {
  const blocks = [];
  // 这里按行处理，避免一个 Text 块里包含太多换行导致 Notion 渲染丑陋
  // 但为了保持紧凑，我们可以把连续文本合并。
  // 简单起见，我们逐行判断。
  const lines = textBuffer; // textBuffer 已经是数组 array of lines
  
  for (let line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
       // 保留空行作为空段落，或者跳过（取决于是否想要紧凑）
       // 这里跳过空行，实现紧凑
       continue; 
    }

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
    if (trimmed.startsWith('## ')) {
      blocks.push({ object: 'block', type: 'heading_2', heading_2: { rich_text: [{ text: { content: trimmed.replace('## ', '') } }] } });
      continue;
    }

    // 3. 普通文本
    blocks.push({ object: 'block', type: 'paragraph', paragraph: { rich_text: [{ text: { content: line } }] } });
  }
  return blocks;
}

function mdToBlocks(markdown) {
  const lines = markdown.split(/\r?\n/);
  const blocks = [];
  
  // 状态机变量
  let state = 'NORMAL'; // 'NORMAL' | 'LOCK'
  let buffer = []; // 暂存普通文本行
  
  let lockPwd = '';
  let lockBuffer = []; // 暂存加密内容行

  // 提交普通文本缓冲区
  const flushNormalBuffer = () => {
    if (buffer.length > 0) {
      blocks.push(...parseContentToNotionChildren(buffer));
      buffer = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (state === 'NORMAL') {
      if (trimmed.startsWith(':::lock')) {
        flushNormalBuffer(); // 先把之前的普通文本存了
        state = 'LOCK';
        lockPwd = trimmed.replace(':::lock', '').replace(/[>*\s🔒]/g, '').trim() || '123';
        // 这一行本身不存入 lockBuffer，只是开关
      } else {
        // 普通行，先存入 buffer，因为可能下一行也是文本，属于同一个“块”逻辑（虽然在 Notion 里是分开的）
        buffer.push(line);
      }
    } else if (state === 'LOCK') {
      if (trimmed === ':::') {
        // 加密块结束
        state = 'NORMAL';
        blocks.push({ 
          object: 'block', type: 'callout', 
          callout: { 
            rich_text: [{ text: { content: `LOCK:${lockPwd}` }, annotations: { bold: true } }], 
            icon: { type: "emoji", emoji: "🔒" }, color: "gray_background", 
            children: [ 
                { object: 'block', type: 'divider', divider: {} }, 
                ...parseContentToNotionChildren(lockBuffer) 
            ] 
          } 
        });
        lockBuffer = [];
        lockPwd = '';
      } else {
        // 加密内容行（包括空行都要保留结构）
        // 但为了避免开头就是空行，可以 trim 一下 buffer? 不，保持原样最好
        lockBuffer.push(line);
      }
    }
  }
  // 循环结束，如果有残留的普通文本
  flushNormalBuffer();

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
        // 清洗引用符，但保留内部换行结构
        body = body.replace(/^>[ \t]*/gm, '').trim(); 
        b.parent = `:::lock ${pwd}\n${body}\n:::`;
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
