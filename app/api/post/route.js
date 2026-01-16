import { Client } from '@notionhq/client';
import { NotionToMarkdown } from 'notion-to-md';
import { NextResponse } from 'next/server';

export const runtime = 'edge';
const notion = new Client({ auth: process.env.NOTION_KEY });
const n2m = new NotionToMarkdown({ notionClient: notion });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// 🔄 递归解析函数：确保多行内容被正确转换为多个 Notion 积木
function parseLinesToNotionBlocks(textLines) {
  const blocks = [];
  for (let line of textLines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // 1. 媒体识别 (支持 ![]() 和 [])
    const mediaMatch = trimmed.match(/(?:!|)?\[.*?\]\((.*?)\)/);
    if (mediaMatch) {
      let url = mediaMatch[1].trim();
      // 防止二次编码
      const safeUrl = url.includes('%') ? url : encodeURI(url);
      const isVideo = url.match(/\.(mp4|mov|webm|ogg|mkv)(\?|$)/i);
      
      if (isVideo) {
        blocks.push({ object: 'block', type: 'video', video: { type: 'external', external: { url: safeUrl } } });
      } else {
        blocks.push({ object: 'block', type: 'image', image: { type: 'external', external: { url: safeUrl } } });
      }
      continue;
    }

    // 2. 标题与文本
    if (trimmed.startsWith('# ')) {
      blocks.push({ object: 'block', type: 'heading_1', heading_1: { rich_text: [{ text: { content: trimmed.replace('# ', '') } }] } });
    } else if (trimmed.startsWith('## ')) {
      blocks.push({ object: 'block', type: 'heading_2', heading_2: { rich_text: [{ text: { content: trimmed.replace('## ', '') } }] } });
    } else {
      blocks.push({ object: 'block', type: 'paragraph', paragraph: { rich_text: [{ text: { content: trimmed } }] } });
    }
  }
  return blocks;
}

function mdToBlocks(markdown) {
  // 1. 先按双换行符分割成“逻辑大块” (对应编辑器里的一个块)
  const rawChunks = markdown.split(/\n{2,}/); 
  const blocks = [];
  
  let isLocking = false; 
  let lockPassword = ''; 
  let lockBufferLines = [];

  for (let chunk of rawChunks) {
    const chunkLines = chunk.split(/\r?\n/);
    
    // 如果处于加密模式，所有内容（包括空行）都暂时存入 buffer
    if (isLocking) {
        // 检查这一块里是否有 ::: 结束符
        const endIdx = chunkLines.findIndex(l => l.trim() === ':::');
        
        if (endIdx !== -1) {
            // 找到了结束符
            lockBufferLines.push(...chunkLines.slice(0, endIdx));
            // 生成 Callout 块
            blocks.push({ 
                object: 'block', type: 'callout', 
                callout: { 
                  rich_text: [{ text: { content: `LOCK:${lockPassword}` }, annotations: { bold: true } }], 
                  icon: { type: "emoji", emoji: "🔒" }, color: "gray_background", 
                  children: [ 
                      { object: 'block', type: 'divider', divider: {} }, 
                      ...parseLinesToNotionBlocks(lockBufferLines) // 递归解析内部内容
                  ] 
                } 
            });
            isLocking = false;
            lockPassword = '';
            lockBufferLines = [];
            
            // 处理结束符后面的内容（如果有）
            const remaining = chunkLines.slice(endIdx + 1);
            if (remaining.length > 0) blocks.push(...parseLinesToNotionBlocks(remaining));
        } else {
            // 没找到结束符，整个块都是加密内容
            lockBufferLines.push(...chunkLines);
        }
        continue;
    }

    // 普通模式检查
    for (let i = 0; i < chunkLines.length; i++) {
        const line = chunkLines[i];
        const trimmed = line.trim();

        if (trimmed.startsWith(':::lock')) {
            isLocking = true;
            lockPassword = trimmed.replace(':::lock', '').replace(/[>*\s🔒]/g, '').trim() || '123';
            // 将这一行之后的内容加入 buffer
            // 注意：因为我们是按行遍历，lock 开启后的行会在下一次循环或外层处理
            continue;
        }
        
        if (trimmed === ':::') {
            // 异常情况：单独的结束符，忽略
            continue;
        }

        // 如果不是加密块的一部分，直接解析
        // 注意：这里我们把整个 chunk 剩下的部分一起解析，避免打断
        // 但为了简单，我们收集普通行，直到遇到 lock
        if (!isLocking) {
             blocks.push(...parseLinesToNotionBlocks([line]));
        }
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
    // 🟢 保持原始结构，前端负责合并
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
