'use client';
import React, { useState, useEffect } from 'react';

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [view, setView] = useState('list');
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ title: '', slug: '', excerpt: '', content: '', category: '', tags: '', cover: '', status: 'Published', type: 'Post' });
  const [currentId, setCurrentId] = useState(null);

  const LSKY_URL = "https://x1file.top/dashboard"; // 自动帮你填好了
  const CLOUDREVE_URL = "https://x1file.top/home"; 

  useEffect(() => { setMounted(true); fetchPosts(); }, []);

  async function fetchPosts() {
    setLoading(true);
    try {
      const res = await fetch('/api/posts');
      const data = await res.json();
      if (data.success) setPosts(data.posts || []);
    } finally { setLoading(false); }
  }

  if (!mounted) return null;

  // 🟢 防御性分组逻辑
  const groupedPosts = (posts || []).reduce((acc, post) => {
    const type = post.type || "Other";
    if (!acc[type]) acc[type] = [];
    acc[type].push(post);
    return acc;
  }, {});

  const handleSave = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, id: currentId }),
      });
      const result = await res.json();
      if (result.success) { alert('🎉 保存成功！'); setView('list'); fetchPosts(); }
      else { alert('失败: ' + result.error); }
    } finally { setLoading(false); }
  };

  const handleEdit = async (post) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/post?id=${post.id}`);
      const data = await res.json();
      if (data.success) {
        setForm(data.data);
        setCurrentId(post.id);
        setView('edit');
      }
    } finally { setLoading(false); }
  };

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '40px 20px', fontFamily: 'system-ui, sans-serif' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px' }}>
        <h2 style={{margin:0}}>NotionNext Pro 后台</h2>
        {view === 'edit' && <button onClick={() => setView('list')} style={btnStyle}>🔙 返回列表</button>}
      </header>

      {view === 'list' ? (
        <main>
          <button onClick={() => { setForm({title:'', slug:'', excerpt:'', content:'', category:'', tags:'', cover:'', status:'Published', type:'Post'}); setCurrentId(null); setView('edit'); }} style={mainBtnStyle}>➕ 新建文章 / 页面</button>
          
          {loading && posts.length === 0 ? <p>正在连接 Notion...</p> : (
            Object.keys(groupedPosts).map(type => (
              <div key={type} style={{ marginBottom: '40px' }}>
                <h3 style={{ borderLeft: '4px solid #000', paddingLeft: '15px', textTransform: 'uppercase', fontSize: '14px', color: '#666' }}>{type}</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px', marginTop: '15px' }}>
                  {groupedPosts[type].map(p => (
                    <div key={p.id} style={{ padding: '20px', border: '1px solid #eee', borderRadius: '12px', background: '#fff', boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
                      <div style={{ fontWeight: 'bold', fontSize: '16px', marginBottom: '10px' }}>{p.title}</div>
                      <div style={{ fontSize: '12px', color: '#888', marginBottom: '15px' }}>{p.category} · {p.status}</div>
                      <button onClick={() => handleEdit(p)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ddd', background: '#fff', cursor: 'pointer' }}>✏️ 编辑</button>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </main>
      ) : (
        <main style={{ background: '#fcfcfc', padding: '30px', borderRadius: '16px', border: '1px solid #eee' }}>
          <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
            <div style={{ flex: 2 }}><label style={labelStyle}>标题</label><input style={inputStyle} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
            <div style={{ flex: 1 }}><label style={labelStyle}>内容类型</label>
              <select style={inputStyle} value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                <option value="Post">Post (文章)</option>
                <option value="Page">Page (页面)</option>
                <option value="Widget">Widget (挂件)</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
            <div style={{ flex: 1 }}><label style={labelStyle}>Slug (别名)</label><input style={inputStyle} value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} /></div>
            <div style={{ flex: 1 }}><label style={labelStyle}>分类 (Category)</label><input style={inputStyle} value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} /></div>
          </div>

          <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
            <div style={{ flex: 2 }}><label style={labelStyle}>封面图 URL</label><input style={inputStyle} value={form.cover} onChange={e => setForm({ ...form, cover: e.target.value })} /></div>
            <div style={{ flex: 1 }}><label style={labelStyle}>标签 (用逗号隔开)</label><input style={inputStyle} value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} /></div>
          </div>

          <label style={labelStyle}>文章摘要 (Excerpt)</label>
          <input style={{ ...inputStyle, marginBottom: '20px' }} value={form.excerpt} onChange={e => setForm({ ...form, excerpt: e.target.value })} />

          <div style={{ background: '#f0fdf4', padding: '15px', borderRadius: '8px', marginBottom: '15px', display: 'flex', gap: '15px', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#166534' }}>素材助手:</span>
            <button onClick={() => window.open(LSKY_URL)} style={toolBtn}>🖼️ 兰空图床</button>
            <button onClick={() => window.open(CLOUDREVE_URL)} style={toolBtn}>🎬 Cloudreve</button>
          </div>

          <label style={labelStyle}>正文内容 (Markdown)</label>
          <textarea style={{ ...inputStyle, height: '500px', fontFamily: 'monospace', marginTop: '10px' }} value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} />

          <button onClick={handleSave} disabled={loading} style={saveBtnStyle}>{loading ? '正在同步到 Notion...' : '🚀 确认发布 / 更新'}</button>
        </main>
      )}
    </div>
  );
}

const labelStyle = { display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#666', marginBottom: '5px' };
const inputStyle = { width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ddd', boxSizing: 'border-box' };
const btnStyle = { padding: '8px 16px', borderRadius: '8px', border: '1px solid #ddd', cursor: 'pointer', background: '#fff' };
const mainBtnStyle = { padding: '12px 24px', background: '#000', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', marginBottom: '30px', fontWeight: 'bold' };
const toolBtn = { padding: '6px 12px', background: '#fff', border: '1px solid #16a34a', color: '#166534', cursor: 'pointer', borderRadius: '5px', fontSize: '12px' };
const saveBtnStyle = { width: '100%', marginTop: '30px', padding: '20px', background: '#000', color: '#fff', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px' };
