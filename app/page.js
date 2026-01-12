'use client';
import React, { useState, useEffect } from 'react';

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [view, setView] = useState('list');
  const [posts, setPosts] = useState([]); // 初始值为空数组
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // 表单状态
  const [form, setForm] = useState({
    title: '', slug: '', excerpt: '', content: '',
    category: '', tags: '', cover: '', status: 'Published', type: 'Post'
  });
  const [currentId, setCurrentId] = useState(null);

  const LSKY_URL = "https://x1file.top/dashboard"; 
  const CLOUDREVE_URL = "https://x1file.top/home"; 

  // 1. 确保只在浏览器端运行
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
      if (data.success) {
        // 🟢 关键防御：确保 posts 永远是数组
        setPosts(Array.isArray(data.posts) ? data.posts : []);
      } else {
        setError(data.error || '获取数据失败');
      }
    } catch (e) {
      setError('无法连接到 API');
    } finally {
      setLoading(false);
    }
  }

  // 如果还没挂载，渲染一个空白占位，防止 Next.js 崩溃
  if (!mounted) return null;

  const handleEdit = async (post) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/post?id=${post.id}`);
      const data = await res.json();
      if (data.success) {
        setForm({
          title: data.data.title || '',
          slug: data.data.slug || '',
          excerpt: data.data.excerpt || '',
          content: data.data.content || '',
          category: data.data.category || '',
          tags: data.data.tags || '',
          cover: data.data.cover || '',
          type: data.data.type || 'Post',
          status: data.data.status || 'Published'
        });
        setCurrentId(post.id);
        setView('edit');
      }
    } catch (e) {
      alert('读取失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!form.title || !form.slug) return alert('标题和 Slug 必填！');
    setLoading(true);
    try {
      const res = await fetch('/api/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, id: currentId }),
      });
      const result = await res.json();
      if (result.success) {
        alert('🎉 保存成功！');
        setView('list');
        fetchPosts();
      } else {
        alert('保存失败: ' + result.error);
      }
    } catch (e) {
      alert('网络错误');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '30px 20px', fontFamily: 'system-ui, sans-serif' }}>
      
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 'bold' }}>Notion CMS 管理后台</h1>
        {view === 'edit' && <button onClick={() => setView('list')} style={btnStyle}>🔙 返回列表</button>}
      </header>

      {error && <div style={{ color: 'red', padding: '10px', background: '#fff5f5', marginBottom: '20px' }}>⚠️ 错误: {error}</div>}

      {view === 'list' ? (
        <div>
          <button onClick={() => { setForm({title:'', slug:'', excerpt:'', content:'', category:'', tags:'', cover:'', status:'Published', type:'Post'}); setCurrentId(null); setView('edit'); }} style={mainBtnStyle}>➕ 新建文章 / 页面</button>
          
          {loading && <p>正在从 Notion 获取最新数据...</p>}
          
          <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: '12px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ background: '#f8fafc' }}>
                <tr>
                  <th style={tdStyle}>标题</th>
                  <th style={tdStyle}>类型</th>
                  <th style={tdStyle}>分类</th>
                  <th style={{...tdStyle, textAlign:'right'}}>操作</th>
                </tr>
              </thead>
              <tbody>
                {posts.map(p => (
                  <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={tdStyle}><strong>{p.title}</strong></td>
                    <td style={tdStyle}><span style={badgeStyle}>{p.type}</span></td>
                    <td style={tdStyle}>{p.category}</td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>
                      <button onClick={() => handleEdit(p)} style={editBtnStyle}>编辑</button>
                    </td>
                  </tr>
                ))}
                {!loading && posts.length === 0 && (
                  <tr><td colSpan="4" style={{padding:'40px', textAlign:'center', color:'#999'}}>数据库是空的，快去写一篇吧！</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div style={{ background: '#fff', padding: '25px', borderRadius: '12px', border: '1px solid #eee' }}>
          <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
            <div style={{ flex: 2 }}>
              <label style={labelStyle}>文章标题</label>
              <input style={inputStyle} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="输入标题..." />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>内容类型 (Type)</label>
              <select style={inputStyle} value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                <option value="Post">Post (文章)</option>
                <option value="Page">Page (页面)</option>
                <option value="Widget">Widget (挂件)</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Slug (网址别名)</label>
              <input style={inputStyle} value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} placeholder="例如: my-new-post" />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>分类 (Category)</label>
              <input style={inputStyle} value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} placeholder="填写分类..." />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
            <div style={{ flex: 2 }}>
              <label style={labelStyle}>封面图 URL (Cover)</label>
              <input style={inputStyle} value={form.cover} onChange={e => setForm({ ...form, cover: e.target.value })} placeholder="https://..." />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>标签 (Tags)</label>
              <input style={inputStyle} value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} placeholder="标签,用逗号隔开" />
            </div>
          </div>

          <label style={labelStyle}>摘要 (Excerpt)</label>
          <input style={{ ...inputStyle, marginBottom: '20px' }} value={form.excerpt} onChange={e => setForm({ ...form, excerpt: e.target.value })} />

          <div style={{ background: '#f0fdf4', padding: '12px', borderRadius: '8px', marginBottom: '15px', display: 'flex', gap: '10px', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#166534' }}>素材助手:</span>
            <button onClick={() => window.open(LSKY_URL)} style={toolBtn}>🖼️ 兰空图床</button>
            <button onClick={() => window.open(CLOUDREVE_URL)} style={toolBtn}>🎬 Cloudreve</button>
          </div>

          <label style={labelStyle}>正文内容 (Markdown)</label>
          <textarea style={{ ...inputStyle, height: '450px', fontFamily: 'monospace', marginTop: '10px' }} value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} placeholder="在此输入 Markdown 正文... 图片请使用 ![]() 语法" />

          <button onClick={handleSave} disabled={loading} style={saveBtnStyle}>
            {loading ? '⏳ 正在拼命同步到 Notion...' : '🚀 确认发布 / 覆盖更新'}
          </button>
        </div>
      )}
    </div>
  );
}

// 极其稳健的 CSS 样式
const labelStyle = { display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#666', marginBottom: '5px' };
const inputStyle = { width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ddd', boxSizing: 'border-box', fontSize: '14px' };
const btnStyle = { padding: '8px 16px', borderRadius: '6px', border: '1px solid #ddd', cursor: 'pointer', background: '#fff' };
const mainBtnStyle = { padding: '12px 24px', background: '#000', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', marginBottom: '20px', fontWeight: 'bold' };
const editBtnStyle = { padding: '5px 12px', borderRadius: '5px', border: '1px solid #eee', cursor: 'pointer', background: '#f9f9f9', fontSize: '12px' };
const toolBtn = { padding: '6px 12px', background: '#fff', border: '1px solid #16a34a', color: '#166534', cursor: 'pointer', borderRadius: '5px', fontSize: '12px', fontWeight: 'bold' };
const saveBtnStyle = { width: '100%', marginTop: '30px', padding: '20px', background: '#000', color: '#fff', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px' };
const tdStyle = { padding: '15px', fontSize: '14px', textAlign: 'left' };
const badgeStyle = { padding: '2px 6px', background: '#eee', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' };
