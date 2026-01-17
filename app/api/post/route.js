import { Client } from '@notionhq/client';
import { NotionToMarkdown } from 'notion-to-md';
import { NextResponse } from 'next/server';

export const runtime = 'edge';
const notion = new Client({ auth: process.env.NOTION_KEY });
const n2m = new NotionToMarkdown({ notionClient: notion });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// 辅助：将大块内部的文本行转换为 Notion 子积木
function parseLinesToChildren(text) {
  const lines = text.split(/\r?\n/);
  const blocks = [];
  
  for (let line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue; // 块内部的空行忽略，保持紧凑，或者改为 push paragraph "" 保留空行

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
    blocks.push({ object: 'block', type: 'paragraph', paragraph: { rich_text: [{ text: { content: trimmed } }] } });
  }
  return blocks;
}

function mdToBlocks(markdown) {
  // 🟢 1. 初步切分：按双换行切分 (保持块独立性的关键)
  const rawChunks = markdown.split(/\n{2,}/);
  const blocks = [];
  
  // 🟢 2. 智能缝合 (修复加密块被双换行切断的问题)
  let mergedChunks = [];
  let buffer = "";
  let isLocking = false;

  for (let chunk of rawChunks) {
    const t = chunk.trim();
    if (!t) continue;

    if (!isLocking && t.startsWith(':::lock')) {
      if (t.endsWith(':::')) {
        // 完整的加密块
        mergedChunks.push(t);
      } else {
        // 破碎的加密块头，开始缝合
        isLocking = true;
        buffer = t;
      }
    } else if (isLocking) {
      // 正在缝合中...补回被切掉的双换行
      buffer += "\n\n" + t;
      if (t.endsWith(':::')) {
        // 缝合结束
        isLocking = false;
        mergedChunks.push(buffer);
        buffer = "";
      }
    } else {
      // 普通块
      mergedChunks.push(t);
    }
  }
  // 兜底：如果循环结束还在缝合(异常)，把剩下的存进去
  if (buffer) mergedChunks.push(buffer);

  // 🟢 3. 生成 Notion 积木
  for (let content of mergedChunks) {
    // A. 加密块处理
    if (content.startsWith(':::lock')) {
        const firstLineEnd = content.indexOf('\n');
        // 提取密码 (第一行)
        const header = content.substring(0, firstLineEnd > -1 ? firstLineEnd : content.length);
        const pwd = header.replace(':::lock', '').replace(/[>*\s🔒]/g, '').trim() || '123';
        
        // 提取内容 (中间部分)
        let body = "";
        if (firstLineEnd > -1) {
            body = content.substring(firstLineEnd + 1).replace(/\n:::$/, '').trim();
        }

        blocks.push({ 
            object: 'block', type: 'callout', 
            callout: { 
                rich_text: [{ text: { content: `LOCK:${pwd}` }, annotations: { bold: true } }], 
                icon: { type: "emoji", emoji: "🔒" }, color: "gray_background", 
                // 递归处理内部内容
                children: [ { object: 'block', type: 'divider', divider: {} }, ...parseLinesToChildren(body) ] 
            } 
        });
        continue;
    }

    // B. 普通内容处理
    // 直接调用解析器，把这个大块里的每一行转为子积木
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
      if (b.type === 'callout' && b.parent.includes('LOCK:')) {
        const pwd = b.parent.match(/LOCK:([a-zA-Z0-9]+)/)?.[1] || '123';
        const parts = b.parent.split('---');
        let body = parts.length > 1 ? parts.slice(1).join('---') : parts[0].replace(/LOCK:.*\n?/, '');
        body = body.replace(/^>[ \t]*/gm, '').trim(); 
        // 🟢 恢复加密块格式：头 + 双换行 + 内容 + 双换行 + 尾
        b.parent = `:::lock ${pwd}\n\n${body}\n\n:::`; 
      }
    });

    const mdStringObj = n2m.toMarkdownString(mdblocks);
    
    // 🟢 关键：读取时不要压缩双换行，保留 \n\n 结构，这样前端才能识别出独立的块
    let cleanContent = mdStringObj.parent;

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
