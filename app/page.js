'use client';
import React, { useState, useEffect } from 'react';

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [view, setView] = useState('list');
  const [posts, setPosts] = useState([]);
  const [options, setOptions] = useState({ categories: [], tags: [] }); // 存储已有选项
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('Post');

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
      if (data.success) {
        setPosts(data.posts || []);
        setOptions(data.options); // 存入已有分类和标签
      }
    } finally { setLoading(false); }
  }

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
    if (!form.title || !form.slug) return alert('标题和 Slug 必填');
    setLoading(true);
    try {
      const res = await fetch('/api/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, id: currentId }),
      });
      if ((await res.json()).success) {
        alert('🎉 同步完成');
        setView('list');
        fetchPosts();
      }
    } finally { setLoading(false); }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation(); // 🟢 防止触发行的点击编辑事件
    if (!confirm('确定归档吗？')) return;
    setLoading(true);
    await fetch(`/api/post?id=${id}`, { method: 'DELETE' });
    fetchPosts();
  };

  if (!mounted) return null;

  return (
    <div style={theme.container}>
      <header style={theme.header}>
        <h1 style={{fontSize:'20px', letterSpacing:'1px'}}>NOTION<span style={{color:'#f50057'}}>PRO</span> CMS</h1>
        {view === 'edit' && <button onClick={() => setView('list')} style={theme.btnSecondary}>🔙 返回</button>}
      </header>

      {view === 'list' ? (
        <main>
          <button onClick={() => { setForm({title:'', slug:'', excerpt:'', content:'', category:'', tags:'', cover:'', status:'Published', type:'Post', date: new Date().toISOString().split('T')[0]}); setCurrentId(null); setView('edit'); }} style={theme.btnPrimary}>➕ 新建创作</button>
          
          <div style={theme.tabContainer}>
            {['Post', 'Page', 'Widget'].map(t => (
              <button key={t} onClick={() => setActiveTab(t)} style={activeTab === t ? theme.tabActive : theme.tab}>{t}</button>
            ))}
          </div>

          <div style={theme.listCard}>
            {posts.filter(p => p.type === activeTab).map(p => (
              <div key={p.id} onClick={() => handleEdit(p)} style={theme.listRow}>
                <div style={{flex: 1}}>
                  <div style={theme.rowTitle}>{p.title}</div>
                  <div style={theme.rowSlug}>/{p.slug || 'no-slug'} · {p.category}</div>
                </div>
                <div onClick={(e) => handleDelete(e, p.id)} style={theme.deleteZone}>🗑️</div>
              </div>
            ))}
          </div>
        </main>
      ) : (
        <main style={theme.formCard}>
          <div style={theme.grid2}>
            <div><label style={theme.label}>文章标题</label><input style={theme.input} value={form.title} onChange={e => setForm({...form, title: e.target.value})} /></div>
            <div><label style={theme.label}>发布日期</label><input type="date" style={theme.input} value={form.date} onChange={e => setForm({...form, date: e.target.value})} /></div>
          </div>

          <div style={theme.grid3}>
            <div>
              <label style={theme.label}>分类 (选择或输入)</label>
              <input list="categories" style={theme.input} value={form.category} onChange={e => setForm({...form, category: e.target.value})} />
              <datalist id="categories">
                {options.categories.map(c => <option key={c} value={c} />)}
              </datalist>
            </div>
            <div>
              <label style={theme.label}>标签 (逗号隔开)</label>
              <input style={theme.input} placeholder="选择已有或输入..." value={form.tags} onChange={e => setForm({...form, tags: e.target.value})} />
              <div style={{marginTop:'5px', display:'flex', gap:'5px', flexWrap:'wrap'}}>
                {options.tags.map(t => (
                  <span key={t} onClick={() => { if(!form.tags.includes(t)) setForm({...form, tags: form.tags ? `${form.tags},${t}` : t}) }} style={theme.tagHint}>{t}</span>
                ))}
              </div>
            </div>
            <div>
              <label style={theme.label}>类型</label>
              <select style={theme.input} value={form.type} onChange={e => setForm({...form, type: e.target.value})}>
                <option value="Post">Post</option><option value="Page">Page</option><option value="Widget">Widget</option>
              </select>
            </div>
          </div>

          <div style={theme.grid2}>
            <div><label style={theme.label}>Slug (别名)</label><input style={theme.input} value={form.slug} onChange={e => setForm({...form, slug: e.target.value})} /></div>
            <div><label style={theme.label}>状态</label>
              <select style={theme.input} value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
                <option value="Published">Published</option><option value="Hidden">Hidden</option>
              </select>
            </div>
          </div>

          <div><label style={theme.label}>封面 URL</label><input style={theme.input} value={form.cover} onChange={e => setForm({...form, cover: e.target.value})} /></div>
          <div><label style={theme.label}>摘要 (Excerpt)</label><input style={theme.input} value={form.excerpt} onChange={e => setForm({...form, excerpt: e.target.value})} /></div>

          <div style={theme.toolBox}>
            <button onClick={() => window.open(LSKY_URL)} style={theme.toolBtn}>🖼️ 图床</button>
            <button onClick={() => window.open(CLOUDREVE_URL)} style={theme.toolBtn}>🎬 网盘</button>
            <input style={theme.toolInput} placeholder="粘贴链接转换 Markdown" value={rawLink} onChange={e => setRawLink(e.target.value)} />
            <button onClick={() => { const fn = rawLink.split('/').pop(); setMdLink(`![${fn}](${rawLink})`); }} style={theme.toolAction}>转换</button>
            {mdLink && <span style={{fontSize:'12px', color:'#fff'}} onClick={() => {navigator.clipboard.writeText(mdLink); alert('已复制')}}>点击复制: <code>{mdLink}</code></span>}
          </div>

          <textarea style={theme.textarea} value={form.content} onChange={e => setForm({...form, content: e.target.value})} placeholder="在这里书写 Markdown..." />

          <button onClick={handleSave} disabled={loading} style={theme.btnSave}>{loading ? '⚡ 正在安全同步至 Notion...' : '💾 确认发布 / 覆盖更新'}</button>
        </main>
      )}
    </div>
  );
}

// 🎨 暗黑优雅主题配置
const theme = {
  container: { maxWidth: '1000px', margin: '0 auto', padding: '40px 20px', background: '#121212', minHeight: '100vh', color: '#e0e0e0' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' },
  tabContainer: { display: 'flex', gap: '5px', background: '#1e1e1e', padding: '5px', borderRadius: '10px', marginBottom: '20px' },
  tab: { flex: 1, padding: '10px', background: 'transparent', border: 'none', color: '#888', cursor: 'pointer', borderRadius: '8px' },
  tabActive: { flex: 1, padding: '10px', background: '#333', border: 'none', color: '#fff', cursor: 'pointer', borderRadius: '8px', fontWeight: 'bold' },
  btnPrimary: { padding: '12px 24px', background: '#f50057', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', marginBottom: '25px' },
  btnSecondary: { padding: '8px 16px', background: '#333', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' },
  listCard: { background: '#1e1e1e', borderRadius: '15px', overflow: 'hidden', border: '1px solid #2d2d2d' },
  listRow: { display: 'flex', padding: '20px', borderBottom: '1px solid #2d2d2d', cursor: 'pointer', transition: '0.2s' },
  rowTitle: { fontSize: '15px', fontWeight: '600', marginBottom: '5px', color: '#fff' },
  rowSlug: { fontSize: '12px', color: '#666' },
  deleteZone: { display: 'flex', alignItems: 'center', padding: '0 20px', color: '#444', transition: '0.2s' },
  formCard: { background: '#1e1e1e', padding: '30px', borderRadius: '15px', border: '1px solid #2d2d2d' },
  label: { display: 'block', fontSize: '12px', color: '#888', marginBottom: '8px', textTransform: 'uppercase' },
  input: { width: '100%', padding: '12px', background: '#121212', border: '1px solid #333', borderRadius: '8px', color: '#fff', marginBottom: '20px', boxSizing: 'border-box' },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' },
  grid3: { display: 'grid', gridTemplateColumns: '1.5fr 2fr 1fr', gap: '20px' },
  textarea: { width: '100%', height: '450px', background: '#121212', border: '1px solid #333', borderRadius: '8px', color: '#fff', padding: '15px', fontFamily: 'monospace', lineHeight: '1.6', boxSizing: 'border-box' },
  toolBox: { background: '#252525', padding: '15px', borderRadius: '10px', marginBottom: '20px', display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' },
  toolBtn: { padding: '8px 12px', background: '#333', border: 'none', color: '#fff', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' },
  toolInput: { flex: 1, padding: '8px', background: '#121212', border: '1px solid #333', color: '#fff', borderRadius: '5px', fontSize: '12px' },
  toolAction: { padding: '8px 15px', background: '#f50057', border: 'none', color: '#fff', borderRadius: '5px', cursor: 'pointer' },
  tagHint: { fontSize: '10px', background: '#333', padding: '3px 8px', borderRadius: '4px', cursor: 'pointer' },
  btnSave: { width: '100%', padding: '20px', background: '#fff', color: '#000', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px', marginTop: '30px' }
};

// 🟢 鼠标悬停逻辑需要通过 CSS 注入，这里在代码末尾添加简单的全局样式
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.innerHTML = `
    div[onClick]:hover { background: #252525 !important; }
    .deleteZone:hover { color: #f50057 !important; }
  `;
  document.head.appendChild(style);
}
