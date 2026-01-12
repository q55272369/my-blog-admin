'use client';
import React, { useState, useEffect } from 'react';

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [view, setView] = useState('list');
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('Post');

  // 表单状态增加了 date
  const [form, setForm] = useState({ title: '', slug: '', excerpt: '', content: '', category: '', tags: '', cover: '', status: 'Published', type: 'Post', date: '' });
  const [currentId, setCurrentId] = useState(null);
  const [rawLink, setRawLink] = useState('');
  const [mdLink, setMdLink] = useState('');

  const LSKY_URL = "https://x1file.top/dashboard"; 
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

  const handleDelete = async (id) => {
    if (!confirm('确定归档吗？')) return;
    setLoading(true);
    try {
      await fetch(`/api/post?id=${id}`, { method: 'DELETE' });
      fetchPosts();
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

  const handleSave = async () => {
    if (!form.title || !form.slug) return alert('标题和 Slug 必填！');
    setLoading(true);
    try {
      const res = await fetch('/api/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, id: currentId }),
      });
      if ((await res.json()).success) {
        alert('🎉 处理完成！并发删除已极大缩短了等待时间。');
        setView('list');
        fetchPosts();
      }
    } finally { setLoading(false); }
  };

  if (!mounted) return null;

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '30px 20px', fontFamily: 'system-ui, sans-serif' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 'bold' }}>Notion CMS {view === 'edit' ? ' (编辑器)' : ''}</h1>
        {view === 'edit' && <button onClick={() => setView('list')} style={btnStyle}>🔙 返回列表</button>}
      </header>

      {view === 'list' ? (
        <div>
          <button onClick={() => { setForm({title:'', slug:'', excerpt:'', content:'', category:'', tags:'', cover:'', status:'Published', type:'Post', date: new Date().toISOString().split('T')[0]}); setCurrentId(null); setView('edit'); }} style={mainBtnStyle}>➕ 新建文章/页面</button>
          
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
            {['Post', 'Page', 'Widget'].map(t => (
              <button key={t} onClick={() => setActiveTab(t)} style={{ padding: '8px 20px', border: 'none', background: activeTab === t ? '#000' : '#eee', color: activeTab === t ? '#fff' : '#666', borderRadius: '20px', cursor: 'pointer' }}>{t}</button>
            ))}
          </div>

          <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: '12px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                {posts.filter(p => p.type === activeTab).map(p => (
                  <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={tdStyle}><strong>{p.title}</strong><div style={{fontSize:'11px', color:'#999'}}>{p.date || '无日期'} | {p.category || '未分类'}</div></td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>
                      <button onClick={() => handleEdit(p)} style={editBtnStyle}>编辑</button>
                      <button onClick={() => handleDelete(p.id)} style={{...editBtnStyle, color:'red'}}>删除</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div style={{ background: '#fff', padding: '25px', borderRadius: '12px', border: '1px solid #eee' }}>
          
          <div style={{ display: 'flex', gap: '15px', marginBottom: '15px' }}>
            <div style={{ flex: 3 }}><label style={labelStyle}>文章标题</label><input style={inputStyle} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
            <div style={{ flex: 1 }}><label style={labelStyle}>发布日期</label><input type="date" style={inputStyle} value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></div>
          </div>

          <div style={{ display: 'flex', gap: '15px', marginBottom: '15px' }}>
            <div style={{ flex: 1 }}><label style={labelStyle}>Slug (别名)</label><input style={inputStyle} value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} /></div>
            <div style={{ flex: 1 }}><label style={labelStyle}>分类 (Select)</label><input style={inputStyle} placeholder="分类名" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} /></div>
            <div style={{ flex: 1 }}><label style={labelStyle}>标签 (Multi-Select)</label><input style={inputStyle} placeholder="标签A,标签B" value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} /></div>
          </div>

          <div style={{ display: 'flex', gap: '15px', marginBottom: '15px' }}>
            <div style={{ flex: 2 }}><label style={labelStyle}>封面图 URL</label><input style={inputStyle} value={form.cover} onChange={e => setForm({ ...form, cover: e.target.value })} /></div>
            <div style={{ flex: 1 }}><label style={labelStyle}>类型</label>
                <select style={inputStyle} value={form.type} onChange={e => setForm({...form, type: e.target.value})}>
                    <option value="Post">Post</option><option value="Page">Page</option><option value="Widget">Widget</option>
                </select>
            </div>
            <div style={{ flex: 1 }}><label style={labelStyle}>状态</label>
                <select style={inputStyle} value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
                    <option value="Published">Published</option><option value="Hidden">Hidden</option>
                </select>
            </div>
          </div>

          <label style={labelStyle}>摘要 (Excerpt)</label>
          <input style={{ ...inputStyle, marginBottom: '20px' }} value={form.excerpt} onChange={e => setForm({ ...form, excerpt: e.target.value })} />

          {/* 🔗 MD 转换器小工具 */}
          <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '10px', marginBottom: '20px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                <button onClick={() => window.open(LSKY_URL)} style={toolBtn}>🖼️ 图床</button>
                <button onClick={() => window.open(CLOUDREVE_URL)} style={toolBtn}>🎬 网盘</button>
                <input style={{flex:1, padding:'8px', borderRadius:'4px', border:'1px solid #ddd', fontSize:'12px'}} placeholder="粘贴直链转换 ![]()" value={rawLink} onChange={e => setRawLink(e.target.value)} />
                <button onClick={() => { const fn = rawLink.split('/').pop(); setMdLink(`![${fn}](${rawLink})`); }} style={{padding:'8px 15px', background:'#000', color:'#fff', borderRadius:'4px', border:'none', cursor:'pointer'}}>转换</button>
            </div>
            {mdLink && <div style={{display:'flex', gap:'10px'}}><code style={{background:'#eee', padding:'5px', flex:1, fontSize:'11px'}}>{mdLink}</code><button onClick={() => { navigator.clipboard.writeText(mdLink); alert('已复制'); }} style={{fontSize:'12px'}}>复制</button></div>}
          </div>

          <label style={labelStyle}>正文 (Markdown)</label>
          <textarea style={{ ...inputStyle, height: '400px', fontFamily: 'monospace', marginTop: '10px' }} value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} />

          <div style={{display:'flex', gap:'15px', marginTop:'20px'}}>
              <button onClick={handleSave} disabled={loading} style={saveBtnStyle}>{loading ? '🚀 同步中 (多线程删除已开启)...' : '💾 确认保存并发布'}</button>
          </div>
        </div>
      )}
    </div>
  );
}

const labelStyle = { display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#888', marginBottom: '4px', textTransform:'uppercase' };
const inputStyle = { width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd', boxSizing: 'border-box', fontSize: '14px' };
const btnStyle = { padding: '8px 16px', borderRadius: '6px', border: '1px solid #ddd', cursor: 'pointer', background: '#fff' };
const mainBtnStyle = { padding: '12px 24px', background: '#000', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', marginBottom: '20px', fontWeight: 'bold' };
const editBtnStyle = { padding: '5px 10px', borderRadius: '4px', border: '1px solid #eee', cursor: 'pointer', background: '#f9f9f9', fontSize: '12px', marginLeft:'5px' };
const toolBtn = { padding: '8px 12px', background: '#fff', border: '1px solid #ddd', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' };
const saveBtnStyle = { flex:1, padding: '18px', background: '#000', color: '#fff', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px' };
const tdStyle = { padding: '12px 15px', fontSize: '14px', textAlign: 'left' };
