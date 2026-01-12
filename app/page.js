'use client';
import React, { useState, useEffect } from 'react';

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [view, setView] = useState('list');
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('Post'); // 🟢 默认显示 Post 分类

  // 表单状态
  const [form, setForm] = useState({ title: '', slug: '', excerpt: '', content: '', category: '', tags: '', cover: '', status: 'Published', type: 'Post' });
  const [currentId, setCurrentId] = useState(null);

  // 🟢 链接转换器小工具状态
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

  // 🟢 转换直链为 Markdown
  const convertLink = () => {
    if (!rawLink) return;
    const fileName = rawLink.split('/').pop() || 'image';
    const result = `![${fileName}](${rawLink})`;
    setMdLink(result);
  };

  // 🟢 删除文章
  const handleDelete = async (id) => {
    if (!confirm('确定要彻底删除（归档）此内容吗？此操作不可撤销。')) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/post?id=${id}`, { method: 'DELETE' });
      const result = await res.json();
      if (result.success) {
        alert('已成功归档');
        fetchPosts();
      }
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
        alert('🎉 保存成功！');
        setView('list');
        fetchPosts();
      }
    } finally { setLoading(false); }
  };

  if (!mounted) return null;

  // 过滤当前 Tab 的内容
  const filteredPosts = posts.filter(p => p.type === activeTab);

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '30px 20px', fontFamily: 'system-ui, sans-serif' }}>
      
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 'bold' }}>Notion CMS 管理后台</h1>
        {view === 'edit' && <button onClick={() => setView('list')} style={btnStyle}>🔙 返回列表</button>}
      </header>

      {view === 'list' ? (
        <div>
          <button onClick={() => { setForm({title:'', slug:'', excerpt:'', content:'', category:'', tags:'', cover:'', status:'Published', type:'Post'}); setCurrentId(null); setView('edit'); }} style={mainBtnStyle}>➕ 新建内容</button>
          
          {/* 🟢 类型选项卡 */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
            {['Post', 'Page', 'Widget'].map(t => (
              <button 
                key={t}
                onClick={() => setActiveTab(t)}
                style={{ 
                  padding: '8px 20px', border: 'none', background: activeTab === t ? '#000' : 'none', 
                  color: activeTab === t ? '#fff' : '#666', borderRadius: '20px', cursor: 'pointer', fontWeight: 'bold' 
                }}
              >
                {t} ({posts.filter(p => p.type === t).length})
              </button>
            ))}
          </div>

          <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: '12px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ background: '#f8fafc' }}>
                <tr>
                  <th style={tdStyle}>标题</th>
                  <th style={tdStyle}>分类</th>
                  <th style={{...tdStyle, textAlign:'right'}}>操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredPosts.map(p => (
                  <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={tdStyle}><strong>{p.title}</strong></td>
                    <td style={tdStyle}>{p.category}</td>
                    <td style={{ ...tdStyle, textAlign: 'right', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                      <button onClick={() => handleEdit(p)} style={editBtnStyle}>编辑</button>
                      <button onClick={() => handleDelete(p.id)} style={{...editBtnStyle, color: 'red'}}>删除</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div style={{ background: '#fff', padding: '25px', borderRadius: '12px', border: '1px solid #eee' }}>
          {/* 编辑区 - 属性配置 */}
          <div style={{ display: 'flex', gap: '15px', marginBottom: '15px' }}>
            <div style={{ flex: 2 }}><label style={labelStyle}>文章标题</label><input style={inputStyle} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
            <div style={{ flex: 1 }}><label style={labelStyle}>类型</label>
              <select style={inputStyle} value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                <option value="Post">Post (文章)</option>
                <option value="Page">Page (页面)</option>
                <option value="Widget">Widget (挂件)</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '15px', marginBottom: '15px' }}>
            <div style={{ flex: 1 }}><label style={labelStyle}>Slug (别名)</label><input style={inputStyle} value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} /></div>
            <div style={{ flex: 1 }}><label style={labelStyle}>分类</label><input style={inputStyle} value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} /></div>
            <div style={{ flex: 1 }}><label style={labelStyle}>状态</label>
                <select style={inputStyle} value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
                    <option value="Published">Published (发布)</option>
                    <option value="Hidden">Hidden (隐藏)</option>
                </select>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '15px', marginBottom: '15px' }}>
            <div style={{ flex: 2 }}><label style={labelStyle}>封面图 URL</label><input style={inputStyle} value={form.cover} onChange={e => setForm({ ...form, cover: e.target.value })} /></div>
            <div style={{ flex: 1 }}><label style={labelStyle}>标签 (英文逗号隔开)</label><input style={inputStyle} value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} /></div>
          </div>

          <label style={labelStyle}>摘要 (Excerpt)</label>
          <input style={{ ...inputStyle, marginBottom: '20px' }} value={form.excerpt} onChange={e => setForm({ ...form, excerpt: e.target.value })} />

          {/* 🟢 工具箱：素材助手 + 链接转换器 */}
          <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '10px', marginBottom: '20px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                <button onClick={() => window.open(LSKY_URL)} style={toolBtn}>🖼️ 兰空图床</button>
                <button onClick={() => window.open(CLOUDREVE_URL)} style={toolBtn}>🎬 Cloudreve 网盘</button>
            </div>
            {/* 链接转换组件 */}
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <span style={{fontSize:'12px', fontWeight:'bold', color:'#666'}}>🔗 MD转换：</span>
                <input style={{flex:1, padding:'6px', borderRadius:'4px', border:'1px solid #ddd', fontSize:'12px'}} placeholder="粘贴直链 URL 到这里..." value={rawLink} onChange={e => setRawLink(e.target.value)} />
                <button onClick={convertLink} style={{padding:'6px 12px', fontSize:'12px', cursor:'pointer', background:'#000', color:'#fff', border:'none', borderRadius:'4px'}}>转换</button>
            </div>
            {mdLink && (
                <div style={{ marginTop: '10px', display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <code style={{ flex:1, background: '#eee', padding: '5px', fontSize: '11px', borderRadius: '3px' }}>{mdLink}</code>
                    <button onClick={() => { navigator.clipboard.writeText(mdLink); alert('已复制'); }} style={{fontSize:'11px', cursor:'pointer'}}>复制</button>
                </div>
            )}
          </div>

          <label style={labelStyle}>正文内容 (Markdown)</label>
          <textarea style={{ ...inputStyle, height: '400px', fontFamily: 'monospace', marginTop: '10px' }} value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} placeholder="直接在此写作，或从转换器复制图片语法到这里..." />

          <div style={{display:'flex', gap:'15px', marginTop:'20px'}}>
              <button onClick={handleSave} disabled={loading} style={saveBtnStyle}>{loading ? '处理中...' : '🚀 确认发布 / 覆盖更新'}</button>
              {currentId && <button onClick={() => handleDelete(currentId)} style={{...saveBtnStyle, background:'red', width:'150px'}}>删除</button>}
          </div>
        </div>
      )}
    </div>
  );
}

// 样式
const labelStyle = { display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#666', marginBottom: '5px' };
const inputStyle = { width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ddd', boxSizing: 'border-box', fontSize: '14px' };
const btnStyle = { padding: '8px 16px', borderRadius: '6px', border: '1px solid #ddd', cursor: 'pointer', background: '#fff' };
const mainBtnStyle = { padding: '12px 24px', background: '#000', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', marginBottom: '20px', fontWeight: 'bold' };
const editBtnStyle = { padding: '5px 12px', borderRadius: '5px', border: '1px solid #eee', cursor: 'pointer', background: '#f9f9f9', fontSize: '12px' };
const toolBtn = { padding: '8px 15px', background: '#fff', border: '1px solid #ddd', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' };
const saveBtnStyle = { flex:1, padding: '18px', background: '#000', color: '#fff', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px' };
const tdStyle = { padding: '15px', fontSize: '14px' };
