import { Client } from '@notionhq/client';
import { NotionToMarkdown } from 'notion-to-md';
import { NextResponse } from 'next/server';

export const runtime = 'edge';
const notion = new Client({ auth: process.env.NOTION_KEY });
const n2m = new NotionToMarkdown({ notionClient: notion });

// 💤 辅助函数：延时器 (给 Notion 服务器喘息时间)
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// 🔄 辅助函数：将 Markdown 文本转换为 Notion 积木
function mdToBlocks(markdown) {
  const lines = markdown.split(/\r?\n/);
  const blocks = [];
  let isLocking = false; 
  let lockPassword = ''; 
  let lockContent = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // --- 加密块开始 ---
    if (trimmed.startsWith(':::lock')) { 
      isLocking = true; 
      lockPassword = trimmed.replace(':::lock', '').replace(/[>*\s🔒]/g, '').trim() || '123'; 
      lockContent = []; 
      continue; 
    }

    // --- 加密块结束 ---
    if (isLocking && trimmed === ':::') {
      blocks.push({ 
        object: 'block', 
        type: 'callout', 
        callout: { 
          rich_text: [{ text: { content: `LOCK:${lockPassword}` }, annotations: { bold: true } }], 
          icon: { type: "emoji", emoji: "🔒" }, 
          color: "gray_background", 
          children: [ 
            { object: 'block', type: 'divider', divider: {} },
            ...mdToBlocks(lockContent.join('\n')) 
          ] 
        } 
      });
      isLocking = false; 
      continue;
    }

    if (isLocking) { 
      if (trimmed) lockContent.push(line); 
      continue; 
    }

    if (!trimmed) continue;

    // 🟢 媒体处理：自动编码 URL 防止特殊字符导致 Notion 抓取失败
    const imgMatch = trimmed.match(/!\[.*\]\((.*)\)/);
    if (imgMatch) { 
      const url = imgMatch[1].trim();
      // 简单的 URL 编码处理（处理中文或空格），但保留 http 结构
      const safeUrl = encodeURI(url);
      blocks.push({ object: 'block', type: 'image', image: { type: 'external', external: { url: safeUrl } } }); 
      continue; 
    }

    // 标题
    if (trimmed.startsWith('# ')) { 
      blocks.push({ object: 'block', type: 'heading_1', heading_1: { rich_text: [{ text: { content: trimmed.replace('# ', '') } }] } }); 
    } else if (trimmed.startsWith('## ')) {
      blocks.push({ object: 'block', type: 'heading_2', heading_2: { rich_text: [{ text: { content: trimmed.replace('## ', '') } }] } });
    } else if (trimmed.startsWith('**') && trimmed.endsWith('**')) {
      blocks.push({ object: 'block', type: 'paragraph', paragraph: { rich_text: [{ text: { content: trimmed.replace(/\*\*/g, '') }, annotations: { bold: true } }] } });
    } else { 
      blocks.push({ object: 'block', type: 'paragraph', paragraph: { rich_text: [{ text: { content: line } }] } }); 
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
    try {
      const blocksRes = await notion.blocks.children.list({ block_id: id });
      rawBlocks = blocksRes.results;
    } catch (e) { console.error("Blocks error", e); }

    mdblocks.forEach(b => {
      if (b.type === 'callout' && b.parent.includes('LOCK:')) {
        const pwd = b.parent.match(/LOCK:([a-zA-Z0-9]+)/)?.[1] || '123';
        const parts = b.parent.split('---');
        let body = parts.length > 1 ? parts.slice(1).join('---') : parts[0].replace(/LOCK:.*\n?/, '');
        body = body.replace(/^>[ \t]*/gm, '');
        body = body.replace(/\n\s*\n/g, '\n').trim();
        b.parent = `:::lock ${pwd}\n${body}\n:::`;
      }
    });

    const mdStringObj = n2m.toMarkdownString(mdblocks);
    let cleanContent = mdStringObj.parent.replace(/\n\s*\n/g, '\n').trim();

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
      // 1. 更新属性
      await notion.pages.update({ page_id: id, properties: props });
      
      // 2. 获取旧块并删除
      const children = await notion.blocks.children.list({ block_id: id });
      // 🟢 优化：并发删除以提高速度，但在删除完所有后再继续
      await Promise.all(children.results.map(b => notion.blocks.delete({ block_id: b.id })));
      
      // 🟢 关键优化：删除后强制暂停 1 秒，确保 Notion 数据库索引更新完毕
      await sleep(1000); 

      // 3. 分批写入新块 (优化：更小的批次 + 间隔时间)
      // Notion 官方建议不超过 100，但为了媒体稳定，我们将批次设为 10
      const chunkSize = 10; 
      for (let i = 0; i < newBlocks.length; i += chunkSize) {
        await notion.blocks.children.append({ 
          block_id: id, 
          children: newBlocks.slice(i, i + chunkSize) 
        });
        // 🟢 关键优化：每写入一批，暂停 300ms，给 Notion 抓取媒体的时间
        if (i + chunkSize < newBlocks.length) {
          await sleep(300);
        }
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
