'use client';
import React, { useState, useEffect } from 'react';

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [view, setView] = useState('list');
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // 编辑表单状态
  const [currentId, setCurrentId] = useState(null);
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [content, setContent] = useState('');

  // 🔴 兰空图床和 Cloudreve 地址
  const LSKY_URL = "https://img.你的域名.com/dashboard"; 
  const CLOUDREVE_URL = "https://pan.你的域名.com/home"; 

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
      if (data.success) setPosts(data.posts || []);
      else setError(data.error);
    } catch (e) { setError('连接 API 失败'); }
    finally { setLoading(false); }
  }

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
    } catch (e) { alert('读取文章详情失败'); }
    finally { setLoading(false); }
  };

  const handleSubmit = async () => {
    if (!title || !slug) return alert('标题和 Slug 是必填项');
    setLoading(true);
    try {
      const res = await fetch('/api/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: currentId, title, slug, excerpt, content }),
      });
      const data = await res.json();
      if (data.success) {
        alert('🎉 操作成功！');
        setView('list');
        fetchPosts();
      } else { alert('失败：' + data.error); }
    } catch (e) { alert('请求发生错误'); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ maxWidth: '900px', margin: '40px auto', padding: '20px', fontFamily: 'system-ui, -apple-system, sans-serif', color: '#333' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '800' }}>Notion CMS 后台</h1>
        {view === 'edit' && <button onClick={() => setView('list')} style={secondaryBtn}>🔙 返回列表</button>}
      </div>

      {error && <div style={{ color: '#c53030', padding: '15px', background: '#fff5f5', borderRadius: '8px', marginBottom: '20px', border: '1px solid #feb2b2' }}>⚠️ {error}</div>}

      {view === 'list' ? (
        <div>
          <button onClick={() => { setCurrentId(null); setTitle(''); setSlug(''); setExcerpt(''); setContent(''); setView('edit'); }} style={primaryBtn}>➕ 新建文章</button>
          
          {loading && <p>正在载入数据库内容...</p>}
          
          <div style={{ border: '1px solid #eee', borderRadius: '10px', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ background: '#f8fafc' }}>
                <tr>
                  <th style={thStyle}>文章标题</th>
                  <th style={{...thStyle, textAlign:'right'}}>操作</th>
                </tr>
              </thead>
              <tbody>
                {posts.map(p => (
                  <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={tdStyle}>{p.title || '无标题'}</td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>
                      <button onClick={() => handleEdit(p)} style={editBtn}>编辑</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* 工具栏 */}
          <div style={{ background: '#f0fdf4', padding: '15px', borderRadius: '8px', display: 'flex', gap: '10px', alignItems: 'center' }}>
            <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#166534' }}>素材管理：</span>
            <button onClick={() => window.open(LSKY_URL)} style={toolBtn}>🖼️ 打开图床</button>
            <button onClick={() => window.open(CLOUDREVE_URL)} style={toolBtn}>🎬 打开网盘</button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <label style={labelStyle}>文章标题</label>
            <input placeholder="输入标题..." value={title} onChange={e => setTitle(e.target.value)} style={inputStyle} />
          </div>

          <div style={{ display: 'flex', gap: '20px' }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <label style={labelStyle}>Slug (网址名)</label>
                <input placeholder="例如: my-first-post" value={slug} onChange={e => setSlug(e.target.value)} style={inputStyle} />
            </div>
            <div style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <label style={labelStyle}>摘要 (Excerpt)</label>
                <input placeholder="简短的描述..." value={excerpt} onChange={e => setExcerpt(e.target.value)} style={inputStyle} />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <label style={labelStyle}>正文内容 (支持 Markdown)</label>
            <textarea 
              placeholder="在这里直接写 Markdown 代码..." 
              value={content} 
              onChange={e => setContent(e.target.value)} 
              style={{ ...inputStyle, height: '450px', fontFamily: 'monospace', lineHeight: '1.6', resize: 'vertical' }} 
            />
          </div>

          <button onClick={handleSubmit} disabled={loading} style={submitBtn}>
            {loading ? '正在同步到 Notion...' : (currentId ? '💾 保存修改' : '🚀 立即发布')}
          </button>
        </div>
      )}
    </div>
  );
}

// 样式
const primaryBtn = { marginBottom: '20px', padding: '12px 24px', background: '#000', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' };
const secondaryBtn = { padding: '8px 16px', borderRadius: '8px', border: '1px solid #ddd', cursor: 'pointer', background: '#fff', fontSize: '13px' };
const editBtn = { padding: '6px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', cursor: 'pointer', background: '#fff', fontSize: '13px' };
const toolBtn = { padding: '8px 16px', borderRadius: '6px', border: '1px solid #16a34a', color: '#166534', background: '#fff', cursor: 'pointer', fontWeight: 'bold' };
const inputStyle = { width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', boxSizing: 'border-box', fontSize: '16px' };
const labelStyle = { fontSize: '14px', fontWeight: 'bold', color: '#64748b' };
const thStyle = { padding: '12px 15px', textAlign: 'left', fontSize: '12px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' };
const tdStyle = { padding: '15px', fontSize: '15px' };
const submitBtn = { width: '100%', padding: '18px', background: '#000', color: '#fff', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' };
