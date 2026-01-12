import { Client } from '@notionhq/client';
import { NotionToMarkdown } from 'notion-to-md';
import { markdownToBlocks } from 'notion-markdown-to-blocks';
import { NextResponse } from 'next/server';

export const runtime = 'edge';

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const n2m = new NotionToMarkdown({ notionClient: notion });

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
            excerpt: getProp('excerpt'),
            content: mdString.parent
        }
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { id, title, content, slug, excerpt } = body;
    const databaseId = process.env.NOTION_DATABASE_ID;

    // 🟢 这里使用了新的转换库
    const newBlocks = markdownToBlocks(content);

    const now = new Date().toISOString();
    const commonProperties = {
        "title": { title: [{ text: { content: title } }] },
        "slug": { rich_text: [{ text: { content: slug } }] },
        "excerpt": { rich_text: [{ text: { content: excerpt || "" } }] },
        "update_date": { date: { start: now } }
    };

    if (id) {
        await notion.pages.update({
            page_id: id,
            properties: commonProperties
        });
        const children = await notion.blocks.children.list({ block_id: id });
        for (const block of children.results) {
            await notion.blocks.delete({ block_id: block.id });
        }
        await notion.blocks.children.append({ block_id: id, children: newBlocks });
        return NextResponse.json({ success: true, mode: 'update' });
    } else {
        await notion.pages.create({
            parent: { database_id: databaseId },
            properties: {
                ...commonProperties,
                "type": { select: { name: 'Post' } },
                "status": { select: { name: 'Published' } },
                "date": { date: { start: now } }
            },
            children: newBlocks,
        });
        return NextResponse.json({ success: true, mode: 'create' });
    }
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
