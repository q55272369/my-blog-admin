import { Client } from '@notionhq/client';
import { NextResponse } from 'next/server';

export const runtime = 'edge';
const notion = new Client({ auth: process.env.NOTION_KEY });

export async function GET() {
  const dbId = process.env.NOTION_DATABASE_ID;
  
  try {
    // 1. 获取所有 Post (Post 类型，且 Published)
    // 2. 获取特定的 Page (about, download) -> 无视状态
    // 由于 Notion API OR 逻辑限制，我们这里直接宽泛抓取，在代码里过滤，或者分两次抓取。
    // 为了性能和简单，我们抓取所有 "Post" OR "Page"，然后在代码里精细过滤。
    
    const response = await notion.databases.query({
      database_id: dbId,
      sorts: [{ property: 'date', direction: 'descending' }],
      filter: {
        or: [
          { property: 'type', select: { equals: 'Post' } },
          { property: 'type', select: { equals: 'Page' } },
          { property: 'type', select: { equals: 'Widget' } }
        ]
      }
    });

    const categories = new Set();
    const tags = new Set();
    
    const posts = response.results.map(page => {
      const p = page.properties;
      const type = p.type?.select?.name || 'Post';
      const status = p.status?.status?.name || 'Draft';
      const slug = p.slug?.rich_text?.[0]?.plain_text || '';
      
      // 收集选项
      if (p.category?.select?.name) categories.add(p.category.select.name);
      p.tags?.multi_select?.forEach(t => tags.add(t.name));

      // 🟢 核心过滤逻辑：
      // 1. 如果是 Page，必须是 about 或 download，且无视 status (只要存在就返回)
      if (type === 'Page') {
          if (['about', 'download'].includes(slug)) {
              // Pass (Keep it)
          } else {
              return null; // Skip other pages
          }
      } 
      // 2. 如果是 Post/Widget，必须是 Published (或者你希望在后台看到Draft? 通常后台管理需要看到Draft)
      // 修改：为了让后台能管理所有状态，这里我们全部返回，交给前端 filter 来决定显示什么
      // 但为了满足你的“Page只抓about/download”的需求，上面已经处理了。
      
      return {
        id: page.id,
        title: p.title?.title?.[0]?.plain_text || '无标题',
        slug: slug,
        category: p.category?.select?.name || '未分类',
        date: p.date?.date?.start || '',
        status: status,
        type: type,
        cover: p.cover?.url || null,
        tags: p.tags?.multi_select?.map(t => t.name).join(',') || ''
      };
    }).filter(Boolean); // 过滤掉 null

    return NextResponse.json({
      success: true,
      posts: posts,
      options: {
        categories: Array.from(categories),
        tags: Array.from(tags)
      }
    });
    
  } catch (e) {
    return NextResponse.json({ success: false, error: e.message });
  }
}
