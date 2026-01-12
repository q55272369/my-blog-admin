import { Client } from '@notionhq/client';
import { NotionToMarkdown } from 'notion-to-md';
import { markdownToBlocks } from '@tryfabric/martian';
import { NextResponse } from 'next/server';

export const runtime = 'edge';

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const n2m = new NotionToMarkdown({ notionClient: notion });

// 获取详情
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const pageId = searchParams.get('id');

  if (!pageId) return NextResponse.json({ error: 'No ID' }, { status: 400 });

  try {
    const page = await notion.pages.retrieve({ page_id: pageId });
    const mdblocks = await n2m.pageToMarkdown(pageId);
    const mdString = n2m.toMarkdownString(mdblocks);

    const getProp = (name) => {
        if (!page.properties[name]) return '';
        const prop = page.properties[name];
        if (prop.type === 'title') return prop.title[0]?.plain_text || '';
        if (prop.type === 'rich_text') return prop.rich_text[0]?.plain_text || '';
        return '';
    };

    return NextResponse.json({
        success: true,
        data: {
            title: getProp('title'),
            slug: getProp('slug'),
            // 🟢 修正：这里读取 'excerpt'
            excerpt: getProp('excerpt'),
            content: mdString.parent
        }
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// 新建或更新
export async function POST(request) {
  try {
    const body = await request.json();
    // 🟢 修正：接收 excerpt
    const { id, title, content, slug, excerpt } = body;
    const databaseId = process.env.NOTION_DATABASE_ID;

    const newBlocks = markdownToBlocks(content);

    // 获取当前时间 (ISO格式)
    const now = new Date().toISOString();

    const commonProperties = {
        // 🟢 修正：全部使用小写属性名
        "title": { title: [{ text: { content: title } }] },
        "slug": { rich_text: [{ text: { content: slug } }] },
        // 🟢 修正：写入 'excerpt'
        "excerpt": { rich_text: [{ text: { content: excerpt || "" } }] },
        // 🟢 自动更新 update_date 为当前时间
        "update_date": { date: { start: now } }
    };

    if (id) {
        // 更新
        await notion.pages.update({
            page_id: id,
            properties: commonProperties
        });
        
        // 重写正文
        const children = await notion.blocks.children.list({ block_id: id });
        for (const block of children.results) {
            await notion.blocks.delete({ block_id: block.id });
        }
        await notion.blocks.children.append({ block_id: id, children: newBlocks });

        return NextResponse.json({ success: true, mode: 'update' });
    } else {
        // 新建
        await notion.pages.create({
            parent: { database_id: databaseId },
            properties: {
                ...commonProperties,
                // 🟢 修正：type 和 status 也是小写
                "type": { select: { name: 'Post' } }, // 这里的值 Post 首字母大写没问题，关键是键要对
                "status": { select: { name: 'Published' } },
                "date": { date: { start: now } } // 新建时也填一下 date
            },
            children: newBlocks,
        });
        return NextResponse.json({ success: true, mode: 'create' });
    }
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}