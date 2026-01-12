'use client';
import React, { useState, useEffect } from 'react';

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [view, setView] = useState('list');
  const [posts, setPosts] = useState([]);
  const [options, setOptions] = useState({ categories: [], tags: [] });
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('Post');

  const [form, setForm] = useState({ title: '', slug: '', excerpt: '', content: '', category: '', tags: '', cover: '', status: 'Published', type: 'Post', date: '' });
  const [currentId, setCurrentId] = useState(null);
  const [rawLink, setRawLink] = useState('');
  const [mdLink, setMdLink] = useState('');

  const LSKY_URL = "https://x1file.top/dashboard"; 
  const CLOUDREVE_URL = "https://x1file.top/home"; 

  useEffect(() => {
    setMounted(true);
    fetchPosts();
    // 🟢 注入全局动态样式（用于处理悬浮和点击动画）
    const style = document.createElement('style');
    style.innerHTML = `
      body { background-color: #15202b; margin: 0; padding: 0; }
      .interactive-row { transition: all 0.2s ease; cursor: pointer; border-bottom: 1px solid #38444d; }
      .interactive-row:hover { background-color: rgba(255,255,255,0.03) !important; }
      .btn-active:active { transform: scale(0.96); }
      .btn-hover { transition: all 0.2s ease; }
      .btn-hover:hover { filter: brightness(90%); }
      .delete-btn { opacity: 0.3; transition: all 0.2s; }
      .interactive-row:hover .delete-btn { opacity: 1; }
      ::-webkit-scrollbar { width: 8px; }
      ::-webkit-scrollbar-track { background: #15202b; }
      ::-webkit-scrollbar-thumb { background: #38444d; border-radius: 10px; }
    `;
    document.head.appendChild(style);
  }, []);

  async function fetchPosts() {
    setLoading(true);
    try {
      const res = await fetch('/api/posts');
      const data = await res.json();
      if (data.success) {
        setPosts(data.posts || []);
        setOptions(data.options || { categories: [], tags: [] });
      }
    } finally { setLoading(false); }
  }

  if (!mounted) return null;

  const handleEdit = (post) => {
    setLoading(true);
    fetch(`/api/post?id=${post.id}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setForm(data.data);
          setCurrentId(post.id);
          setView('edit');
        }
      })
      .finally(() => setLoading(false));
  };

  const handleSave = async () => {
    if (!form.title || !form.slug) return alert('标题和 Slug 必填');
    setLoading(true);
    const res = await fetch('/api/post', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, id: currentId }),
    });
    if ((await res.json()).success) {
      alert('🎉 同步完成');
      setView('list');
      fetchPosts();
    } else { setLoading(false); }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!confirm('确定要删除（归档）吗？')) return;
    setLoading(true);
    await fetch(`/api/post?id=${id}`, { method: 'DELETE' });
    fetchPosts();
  };

  return (
    <div style={styles.fullPage}>
      <div style={styles.container}>
        <header style={styles.header}>
          <div style={styles.logo}>
            <span style={{color:'#1d9bf0'}}>Notion</span><span style={{fontWeight:'300'}}>Pro</span>
          </div>
          {view === 'edit' && <button onClick={() => setView('list')} className="btn-active btn-hover" style={styles.btnSecondary}>返回</button>}
        </header>

        {view === 'list' ? (
          <main>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginBottom:'24px'}}>
                <div style={styles.tabContainer}>
                    {['Post', 'Page', 'Widget'].map(t => (
                        <button key={t} onClick={() => setActiveTab(t)} style={activeTab === t ? styles.tabActive : styles.tab}>{t}</button>
                    ))}
                </div>
                <button onClick={() => { setForm({title:'', slug:'', excerpt:'', content:'', category:'', tags:'', cover:'', status:'Published', type:'Post', date: new Date().toISOString().split('T')[0]}); setCurrentId(null); setView('edit'); }} className="btn-active btn-hover" style={styles.btnPrimary}>发布新内容</button>
            </div>

            <div style={styles.listCard}>
              {loading && <div style={{padding:'40px', textAlign:'center', color:'#8899a6'}}>正在同步 Notion 数据...</div>}
              {!loading && posts.filter(p => p.type === activeTab).map(p => (
                <div key={p.id} onClick={() => handleEdit(p)} className="interactive-row" style={styles.listRow}>
                  <div style={{flex: 1}}>
                    <div style={styles.rowTitle}>{p.title}</div>
                    <div style={styles.rowSlug}>{p.slug || 'no-slug'} · {p.category} · {p.date}</div>
                  </div>
                  <div onClick={(e) => handleDelete(e, p.id)} className="delete-btn btn-active" style={styles.deleteIcon}>🗑️</div>
                </div>
              ))}
            </div>
          </main>
        ) : (
          <main style={styles.formCard}>
            <div style={styles.grid2}>
              <div><label style={styles.label}>标题</label><input style={styles.input} value={form.title} onChange={e => setForm({...form, title: e.target.value})} /></div>
              <div><label style={styles.label}>发布日期</label><input type="date" style={styles.input} value={form.date} onChange={e => setForm({...form, date: e.target.value})} /></div>
            </div>

            <div style={styles.grid3}>
              <div><label style={styles.label}>分类</label>
                <input list="categories" style={styles.input} value={form.category} onChange={e => setForm({...form, category: e.target.value})} />
                <datalist id="categories">{options.categories.map(c => <option key={c} value={c} />)}</datalist>
              </div>
              <div><label style={styles.label}>标签</label><input style={styles.input} placeholder="逗号隔开" value={form.tags} onChange={e => setForm({...form, tags: e.target.value})} /></div>
              <div><label style={styles.label}>类型</label>
                <select style={styles.input} value={form.type} onChange={e => setForm({...form, type: e.target.value})}>
                  <option value="Post">Post</option><option value="Page">Page</option><option value="Widget">Widget</option>
                </select>
              </div>
            </div>

            <div style={styles.grid2}>
              <div><label style={styles.label}>Slug (别名)</label><input style={styles.input} value={form.slug} onChange={e => setForm({...form, slug: e.target.value})} /></div>
              <div><label style={styles.label}>状态</label>
                <select style={styles.input} value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
                  <option value="Published">已发布 (Visible)</option>
                  <option value="Hidden">已隐藏 (Hidden)</option>
                </select>
              </div>
            </div>

            <label style={styles.label}>封面图 URL / 文章摘要</label>
            <div style={{display:'flex', gap:'10px', marginBottom:'20px'}}>
                <input style={{...styles.input, marginBottom:0, flex:1}} placeholder="Cover URL" value={form.cover} onChange={e => setForm({...form, cover: e.target.value})} />
                <input style={{...styles.input, marginBottom:0, flex:1}} placeholder="Excerpt" value={form.excerpt} onChange={e => setForm({...form, excerpt: e.target.value})} />
            </div>

            <div style={styles.toolBox}>
              <div style={{display:'flex', gap:'8px'}}>
                <button onClick={() => window.open(LSKY_URL)} style={styles.toolBtn}>图床</button>
                <button onClick={() => window.open(CLOUDREVE_URL)} style={styles.toolBtn}>网盘</button>
              </div>
              <input style={styles.toolInput} placeholder="输入链接转 MD" value={rawLink} onChange={e => setRawLink(e.target.value)} />
              <button onClick={() => { const fn = rawLink.split('/').pop(); setMdLink(`![${fn}](${rawLink})`); }} style={styles.toolAction}>转换</button>
              {mdLink && <span style={styles.mdCode} onClick={() => {navigator.clipboard.writeText(mdLink); alert('已复制')}}>{mdLink}</span>}
            </div>

            <textarea style={styles.textarea} value={form.content} onChange={e => setForm({...form, content: e.target.value})} placeholder="Markdown 内容..." />

            <button onClick={handleSave} disabled={loading} className="btn-active btn-hover" style={styles.btnSave}>
                {loading ? '正在同步至全球边缘节点...' : '确认发布更新'}
            </button>
          </main>
        )}
      </div>
    </div>
  );
}

// 🎨 X / Twitter 风格主题变量
const styles = {
  fullPage: { width: '100%', minHeight: '100vh', background: '#15202b', color: '#fff' },
  container: { maxWidth: '800px', margin: '0 auto', padding: '0 20px 60px 20px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 0', position:'sticky', top:0, background:'#15202b', zIndex:10 },
  logo: { fontSize: '22px', fontWeight: '800', cursor: 'default' },
  tabContainer: { display: 'flex', background: '#253341', borderRadius: '30px', padding: '4px' },
  tab: { padding: '8px 24px', background: 'transparent', border: 'none', color: '#8899a6', cursor: 'pointer', borderRadius: '30px', fontWeight: 'bold' },
  tabActive: { padding: '8px 24px', background: '#1d9bf0', border: 'none', color: '#fff', borderRadius: '30px', fontWeight: 'bold' },
  btnPrimary: { padding: '10px 24px', background: '#1d9bf0', color: '#fff', border: 'none', borderRadius: '30px', cursor: 'pointer', fontWeight: 'bold' },
  btnSecondary: { padding: '6px 16px', background: 'transparent', color: '#fff', border: '1px solid #536471', borderRadius: '30px', cursor: 'pointer' },
  listCard: { border: '1px solid #38444d', borderRadius: '16px', overflow: 'hidden' },
  listRow: { display: 'flex', padding: '16px 20px', alignItems: 'center' },
  rowTitle: { fontSize: '16px', fontWeight: '700', color: '#fff', marginBottom:'4px' },
  rowSlug: { fontSize: '13px', color: '#8899a6' },
  deleteIcon: { cursor: 'pointer', padding: '10px', borderRadius: '50%' },
  formCard: { background: '#15202b' },
  label: { display: 'block', fontSize: '13px', color: '#8899a6', marginBottom: '8px', fontWeight: '700' },
  input: { width: '100%', padding: '14px', background: '#15202b', border: '1px solid #38444d', borderRadius: '4px', color: '#fff', marginBottom: '20px', boxSizing: 'border-box', fontSize: '15px' },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' },
  grid3: { display: 'grid', gridTemplateColumns: '1fr 1.5fr 1fr', gap: '16px' },
  textarea: { width: '100%', height: '500px', background: 'transparent', border: '1px solid #38444d', borderRadius: '4px', color: '#fff', padding: '16px', fontSize: '16px', lineHeight: '1.6', boxSizing: 'border-box', outline: 'none' },
  toolBox: { background: '#1e2732', padding: '12px', borderRadius: '12px', marginBottom: '20px', display: 'flex', gap: '12px', alignItems: 'center' },
  toolBtn: { padding: '6px 12px', background: '#253341', border: 'none', color: '#1d9bf0', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' },
  toolInput: { flex: 1, padding: '8px', background: '#15202b', border: '1px solid #38444d', color: '#fff', borderRadius: '4px' },
  toolAction: { padding: '8px 16px', background: '#1d9bf0', color: '#fff', border: 'none', borderRadius: '20px', cursor: 'pointer', fontWeight:'bold' },
  mdCode: { fontSize: '11px', color: '#1d9bf0', background: 'rgba(29,155,240,0.1)', padding: '4px 8px', borderRadius: '4px', cursor:'copy' },
  btnSave: { width: '100%', padding: '16px', background: '#eff3f4', color: '#0f1419', border: 'none', borderRadius: '30px', cursor: 'pointer', fontWeight: '900', fontSize: '16px', marginTop: '24px' }
};
