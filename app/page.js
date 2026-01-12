'use client';
import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import 'react-markdown-editor-lite/lib/index.css';

// 🟢 核心修复：ssr: false 强制只在浏览器运行，彻底解决 Application error
const MdEditor = dynamic(() => import('react-markdown-editor-lite'), { 
  ssr: false,
  loading: () => <div style={{padding:'20px', background:'#f5f5f5'}}>编辑器启动中...</div>
});

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [view, setView] = useState('list');
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [currentId, setCurrentId] = useState(null);
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [content, setContent] = useState('');

  // 🟢 核心修复：挂载状态控制
  useEffect(() => {
    setMounted(true);
    fetchPosts();
  }, []);

  async function fetchPosts() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/posts');
      const data = await res.json();
      if (data.success) setPosts(data.posts);
      else setError(data.error);
    } catch (e) { setError('无法连接后台 API'); }
    finally { setLoading(false); }
  }

  // 🟢 核心修复：如果还没挂载到浏览器，直接返回空，绝不渲染编辑器
  if (!mounted) return null;

  const handleEdit = async (post) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/post?id=${post.id}`);
      const data = await res.json();
      if (data.success) {
        setCurrentId(post.id);
        setTitle(data.data.title || '');
        setSlug(data.data.slug || '');
        setExcerpt(data.data.excerpt || '');
        setContent(data.data.content || '');
        setView('edit');
      }
    } catch (e) { alert('读取失败'); }
    finally { setLoading(false); }
  };

  const handleSubmit = async () => {
    if (!title || !slug) return alert('标题和 Slug 必填');
    setLoading(true);
    try {
      const res = await fetch('/api/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: currentId, title, slug, excerpt, content }),
      });
      const data = await res.json();
      if (data.success) { alert('🎉 操作成功'); setView('list'); fetchPosts(); }
      else alert('❌ 失败：' + data.error);
    } catch (e) { alert('提交发生错误'); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ maxWidth: '900px', margin: '30px auto', padding: '20px', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', borderBottom: '1px solid #eee', paddingBottom: '20px' }}>
        <h2 style={{margin:0}}>Notion CMS</h2>
        {view === 'edit' && <button onClick={() => setView('list')} style={{padding:'8px 15px', cursor:'pointer'}}>🔙 返回列表</button>}
      </div>

      {error && <div style={{ color: '#c53030', padding: '15px', background: '#fff5f5', borderRadius: '6px', marginBottom: '20px', border: '1px solid #feb2b2' }}>⚠️ {error}</div>}

      {view === 'list' ? (
        <div>
          <button onClick={() => { setCurrentId(null); setTitle(''); setSlug(''); setExcerpt(''); setContent(''); setView('edit'); }} style={{ marginBottom: '20px', padding: '10px 24px', background: '#000', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>➕ 新建文章</button>
          
          {loading && <p>🔄 正在同步...</p>}
          
          <div style={{ border: '1px solid #eee', borderRadius: '8px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{background: '#f9f9f9'}}>
                <tr>
                  <th style={{padding:'12px', textAlign:'left'}}>标题</th>
                  <th style={{padding:'12px', textAlign:'right'}}>操作</th>
                </tr>
              </thead>
              <tbody>
                {posts.map(p => (
                  <tr key={p.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '12px' }}>{p.title}</td>
                    <td style={{ padding: '12px', textAlign: 'right' }}><button onClick={() => handleEdit(p)} style={{padding:'4px 8px', cursor:'pointer'}}>编辑</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <input placeholder="文章标题" value={title} onChange={e => setTitle(e.target.value)} style={{ padding: '12px', borderRadius: '6px', border: '1px solid #ddd' }} />
          <div style={{display:'flex', gap:'10px'}}>
            <input placeholder="Slug (别名)" value={slug} onChange={e => setSlug(e.target.value)} style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }} />
            <input placeholder="摘要" value={excerpt} onChange={e => setExcerpt(e.target.value)} style={{ flex: 2, padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }} />
          </div>
          <div style={{ height: '500px', border: '1px solid #ddd', borderRadius: '6px', overflow: 'hidden' }}>
            <MdEditor 
                value={content} 
                style={{ height: '100%' }} 
                renderHTML={t => t} 
                onChange={({ text }) => setContent(text)} 
                placeholder="开始使用 Markdown 创作..."
            />
          </div>
          <button onClick={handleSubmit} disabled={loading} style={{ padding: '16px', background: '#000', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px' }}>
            {loading ? '⏳ 处理中...' : '🚀 立即保存并发布'}
          </button>
        </div>
      )}
    </div>
  );
}
