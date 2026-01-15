import { Client } from '@notionhq/client';
import { NotionToMarkdown } from 'notion-to-md';
import { NextResponse } from 'next/server';

export const runtime = 'edge';
const notion = new Client({ auth: process.env.NOTION_KEY });
const n2m = new NotionToMarkdown({ notionClient: notion });

// 🔄 辅助函数：将 Markdown 文本转换为 Notion 积木
function mdToBlocks(markdown) {
  const lines = markdown.split('\n');
  const blocks = [];
  let isLocking = false; 
  let lockPassword = ''; 
  let lockContent = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // 1. 处理加密块开始 :::lock
    if (trimmed.startsWith(':::lock')) { 
      isLocking = true; 
      // 提取密码，移除多余符号
      lockPassword = trimmed.replace(':::lock', '').replace(/[>*\s🔒]/g, '').trim() || '123'; 
      lockContent = []; 
      continue; 
    }

    // 2. 处理加密块结束 :::
    if (isLocking && trimmed === ':::') {
      blocks.push({ 
        object: 'block', 
        type: 'callout', 
        callout: { 
          rich_text: [{ text: { content: `LOCK:${lockPassword}` }, annotations: { bold: true } }], 
          icon: { type: "emoji", emoji: "🔒" }, 
          color: "gray_background", 
          children: [ 
            { object: 'block', type: 'divider', divider: {} }, // 插入分割线，用于区分头部和内容
            ...mdToBlocks(lockContent.join('\n')) // 递归处理加密块内部的内容（支持内部图片、标题等）
          ] 
        } 
      });
      isLocking = false; 
      continue;
    }

    // 3. 收集加密块内容
    if (isLocking) { 
      lockContent.push(line); 
      continue; 
    }

    // 4. 处理普通积木
    // 🟡 关键优化：忽略纯粹的空行，防止在 Notion 中生成大量空白块 (Empty Paragraphs)
    // 只有当这一行完全为空，且不是文件的最后一行时，才作为空段落处理，或者干脆忽略
    if (line.length === 0) { 
       // 如果你想保留适度的空行，可以取消注释下面这行，但为了防止空行膨胀，建议忽略
       // blocks.push({ object: 'block', type: 'paragraph', paragraph: { rich_text: [] } }); 
       continue; 
    }

    // 图片处理
    const imgMatch = trimmed.match(/!\[.*\]\((.*)\)/);
    if (imgMatch) { 
      blocks.push({ object: 'block', type: 'image', image: { type: 'external', external: { url: imgMatch[1].trim() } } }); 
      continue; 
    }

    // 标题处理
    if (trimmed.startsWith('# ')) { 
      blocks.push({ object: 'block', type: 'heading_1', heading_1: { rich_text: [{ text: { content: trimmed.replace('# ', '') } }] } }); 
    } else if (trimmed.startsWith('## ')) {
      blocks.push({ object: 'block', type: 'heading_2', heading_2: { rich_text: [{ text: { content: trimmed.replace('## ', '') } }] } });
    } else if (trimmed.startsWith('**') && trimmed.endsWith('**')) {
      // 简易粗体处理
      blocks.push({ object: 'block', type: 'paragraph', paragraph: { rich_text: [{ text: { content: trimmed.replace(/\*\*/g, '') }, annotations: { bold: true } }] } });
    } else { 
      // 普通文本
      blocks.push({ object: 'block', type: 'paragraph', paragraph: { rich_text: [{ text: { content: line } }] } }); // 使用 line 而不是 trimmed 以保留行首缩进（如果需要）
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

    // 🟢 关键修复：深度清洗加密块内容
    mdblocks.forEach(b => {
      if (b.type === 'callout' && b.parent.includes('LOCK:')) {
        const pwd = b.parent.match(/LOCK:([a-zA-Z0-9]+)/)?.[1] || '123';
        
        // 分割头部和内容
        // NotionToMd 会把 callout 变成带 "> " 的引用块格式，我们需要剥离它
        const parts = b.parent.split('---');
        let body = '';
        
        if (parts.length > 1) {
            // 取分割线之后的所有内容
            body = parts.slice(1).join('---');
        } else {
            // 兼容旧格式（如果没有分割线）
            body = parts[0].replace(/LOCK:.*\n?/, '');
        }

        // 🟡 正则清洗：
        // 1. /^> ?/gm : 删除每一行开头的 "> " (Markdown 引用符号)
        // 2. .trim() : 删除首尾多余空行
        body = body.replace(/^> ?/gm, '').trim();

        b.parent = `:::lock ${pwd}\n${body}\n:::`;
      }
    });

    const mdStringObj = n2m.toMarkdownString(mdblocks);
    
    // 🟡 全局清洗：防止空行恶性膨胀
    // 将连续的3个或更多换行符替换为2个 (保持 Markdown 段落间距，但去除多余空洞)
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
        content: cleanContent, // 使用清洗后的内容
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
    
    // 使用优化后的 mdToBlocks 函数
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
      // 清空原有 Block 并重新写入
      const children = await notion.blocks.children.list({ block_id: id });
      // 批量删除可能会较慢，但比递归删除稳定
      for (const b of children.results) {
          await notion.blocks.delete({ block_id: b.id });
      }
      
      // 分批写入 (Notion API 限制每次 100 个，这里保守设为 20)
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
