import { Client } from '@notionhq/client';
import { NotionToMarkdown } from 'notion-to-md';
import { NextResponse } from 'next/server';

export const runtime = 'edge';
const notion = new Client({ auth: process.env.NOTION_KEY });
const n2m = new NotionToMarkdown({ notionClient: notion });

// 🔄 辅助函数：将 Markdown 文本转换为 Notion 积木
function mdToBlocks(markdown) {
  // 1. 使用正则分割换行，兼容 Windows (\r\n) 和 Unix (\n)
  const lines = markdown.split(/\r?\n/);
  const blocks = [];
  let isLocking = false; 
  let lockPassword = ''; 
  let lockContent = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // --- 加密块逻辑开始 ---
    if (trimmed.startsWith(':::lock')) { 
      isLocking = true; 
      lockPassword = trimmed.replace(':::lock', '').replace(/[>*\s🔒]/g, '').trim() || '123'; 
      lockContent = []; 
      continue; 
    }

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
            // 递归处理加密内容，这样加密内容里也可以支持图片等语法
            ...mdToBlocks(lockContent.join('\n')) 
          ] 
        } 
      });
      isLocking = false; 
      continue;
    }

    // 🟡 关键修正1：在加密块内部，保留原始行（包括空行），以维持内部格式
    if (isLocking) { 
      lockContent.push(line); 
      continue; 
    }
    // --- 加密块逻辑结束 ---

    // 🟡 关键修正2：在普通内容区，彻底忽略空行！
    // 只要这一行 trim 后为空，就直接跳过，不生成 Paragraph 块。
    // 这解决了 "GET \n\n -> POST 空块 -> GET \n\n\n\n" 的恶性膨胀循环。
    if (!trimmed) continue;

    // --- 积木转换逻辑 ---
    
    // 图片处理
    const imgMatch = trimmed.match(/!\[.*\]\((.*)\)/);
    if (imgMatch) { 
      blocks.push({ object: 'block', type: 'image', image: { type: 'external', external: { url: imgMatch[1].trim() } } }); 
      continue; 
    }

    // 标题 H1
    if (trimmed.startsWith('# ')) { 
      blocks.push({ object: 'block', type: 'heading_1', heading_1: { rich_text: [{ text: { content: trimmed.replace('# ', '') } }] } }); 
    } 
    // 标题 H2
    else if (trimmed.startsWith('## ')) {
      blocks.push({ object: 'block', type: 'heading_2', heading_2: { rich_text: [{ text: { content: trimmed.replace('## ', '') } }] } });
    } 
    // 简易粗体
    else if (trimmed.startsWith('**') && trimmed.endsWith('**')) {
      blocks.push({ object: 'block', type: 'paragraph', paragraph: { rich_text: [{ text: { content: trimmed.replace(/\*\*/g, '') }, annotations: { bold: true } }] } });
    } 
    // 普通文本
    else { 
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
    
    // 获取原始 blocks 用于前端预览
    let rawBlocks = [];
    try {
      const blocksRes = await notion.blocks.children.list({ block_id: id });
      rawBlocks = blocksRes.results;
    } catch (e) { console.error("Blocks error", e); }

    // 清洗加密块格式
    mdblocks.forEach(b => {
      if (b.type === 'callout' && b.parent.includes('LOCK:')) {
        const pwd = b.parent.match(/LOCK:([a-zA-Z0-9]+)/)?.[1] || '123';
        const parts = b.parent.split('---');
        let body = parts.length > 1 ? parts.slice(1).join('---') : parts[0].replace(/LOCK:.*\n?/, '');
        
        // 清洗 Callout 自动产生的引用符号
        body = body.replace(/^> ?/gm, '').trim();
        b.parent = `:::lock ${pwd}\n${body}\n:::`;
      }
    });

    const mdStringObj = n2m.toMarkdownString(mdblocks);
    
    // 🟡 关键修正3：读取时压缩换行符
    // 将连续的3个及以上换行符压缩为2个。
    // 这保证了编辑器里看起来段落分明，但不会有过大的空白。
    let cleanContent = mdStringObj.parent.replace(/\n{3,}/g, '\n\n').trim();

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
    
    // 使用新的去空行逻辑处理内容
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
      // 删除旧块
      for (const b of children.results) {
          await notion.blocks.delete({ block_id: b.id });
      }
      // 分批插入新块
      for (let i = 0; i < newBlocks.length; i += 20) {
        await notion.blocks.children.append({ block_id: id, children: newBlocks.slice(i, i + 20) });
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
