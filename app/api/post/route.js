import { Client } from '@notionhq/client';
import { NotionToMarkdown } from 'notion-to-md';
import { NextResponse } from 'next/server';

export const runtime = 'edge';
const notion = new Client({ auth: process.env.NOTION_KEY });
const n2m = new NotionToMarkdown({ notionClient: notion });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function mdToBlocks(markdown) {
  // 🟢 关键：按“双换行”切分大块。单换行将被视为同一块内的折行。
  const rawChunks = markdown.split(/\n{2,}/);
  const blocks = [];
  
  // 缝合算法：防止 :::lock 被双换行意外切断（虽然前端会尽量避免，但后端兜底更安全）
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
      buffer += "\n\n" + t; // 缝合时补回双换行
      if (t.endsWith(':::')) {
        isLocking = false;
        mergedChunks.push(buffer);
        buffer = "";
      }
    } else {
      mergedChunks.push(t);
    }
  }
  if (buffer) mergedChunks.push(buffer); // 残余处理

  // 生成 Notion 积木
  for (let content of mergedChunks) {
    // 1. 加密块
    if (content.startsWith(':::lock')) {
        const firstLineEnd = content.indexOf('\n');
        const header = content.substring(0, firstLineEnd > -1 ? firstLineEnd : content.length);
        const pwd = header.replace(':::lock', '').replace(/[>*\s🔒]/g, '').trim() || '123';
        
        // 提取正文（移除头尾）
        const body = content.replace(/^:::lock.*?\n/, '').replace(/\n:::$/, '').trim();
        
        blocks.push({ 
            object: 'block', type: 'callout', 
            callout: { 
                rich_text: [{ text: { content: `LOCK:${pwd}` }, annotations: { bold: true } }], 
                icon: { type: "emoji", emoji: "🔒" }, color: "gray_background", 
                // 递归处理内部（内部也遵循双换行分块）
                children: [ { object: 'block', type: 'divider', divider: {} }, ...mdToBlocks(body) ] 
            } 
        });
        continue;
    }

    // 2. 媒体识别 (支持 ![]() 和 [])
    const mediaMatch = content.match(/(?:!|)?\[.*?\]\((.*?)\)/);
    if (mediaMatch) {
        const url = mediaMatch[1].trim();
        // 简单编码，保留 % 字符
        const safeUrl = url.includes('%') ? url : encodeURI(url);
        const isVideo = url.match(/\.(mp4|mov|webm|ogg|mkv)(\?|$)/i);
        
        if (isVideo) {
            blocks.push({ object: 'block', type: 'video', video: { type: 'external', external: { url: safeUrl } } });
        } else {
            blocks.push({ object: 'block', type: 'image', image: { type: 'external', external: { url: safeUrl } } });
        }
        continue;
    }

    // 3. 标题
    if (content.startsWith('# ')) {
        blocks.push({ object: 'block', type: 'heading_1', heading_1: { rich_text: [{ text: { content: content.replace('# ', '') } }] } });
        continue;
    }

    // 4. 普通文本：直接作为一段（包含内部换行）
    blocks.push({ object: 'block', type: 'paragraph', paragraph: { rich_text: [{ text: { content: content } }] } });
  }
  return blocks;
}

export async function GET(request) {
  const id = new URL(request.url).searchParams.get('id');
  if(!id) return NextResponse.json({ success: false });
  try {
    const page = await notion.pages.retrieve({ page_id: id });
    const mdblocks = await n2m.pageToMarkdown(id);
    
    // 获取原始 blocks 用于预览
    let rawBlocks = [];
    try { const blocksRes = await notion.blocks.children.list({ block_id: id }); rawBlocks = blocksRes.results; } catch (e) {}

    // 处理加密块标记
    mdblocks.forEach(b => {
      if (b.type === 'callout' && b.parent.includes('LOCK:')) {
        const pwd = b.parent.match(/LOCK:([a-zA-Z0-9]+)/)?.[1] || '123';
        const parts = b.parent.split('---');
        let body = parts.length > 1 ? parts.slice(1).join('---') : parts[0].replace(/LOCK:.*\n?/, '');
        // 清洗引用符
        body = body.replace(/^>[ \t]*/gm, '').trim(); 
        b.parent = `:::lock ${pwd}\n\n${body}\n\n:::`; // 🟢 恢复双换行结构
      }
    });

    const mdStringObj = n2m.toMarkdownString(mdblocks);
    // 🟢 保持原始结构，不随意压缩
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
    
    // 使用新的分块逻辑
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
      // 批量写入
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
