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

  useEffect(() => {
    setMounted(true);
    fetchPosts();
    // 🟢 注入 Cloudreve 风格高级动画样式
    const style = document.createElement('style');
    style.innerHTML = `
      body { background-color: #18181c; color: #e1e1e3; margin: 0; font-family: "Inter", system-ui, sans-serif; }
      .row-container { position: relative; display: flex; align-items: center; background: #202024; margin-bottom: 8px; border-radius: 8px; overflow: hidden; cursor: pointer; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); border: 1px solid #2d2d30; }
      .row-container:hover { border-color: #3e3e42; transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.3); }
      .row-content { flex: 1; padding: 16px 20px; transition: padding-right 0.3s; }
      .delete-drawer { position: absolute; right: 0; top: 0; height: 100%; width: 0; background: #ff4d4f; display: flex; align-items: center; justifyContent: center; overflow: hidden; transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1); color: #fff; font-weight: bold; font-size: 13px; }
      .row-container:hover .delete-drawer { width: 100px; }
      .tag-chip { background: #2d2d32; padding: 4px 10px; border-radius: 4px; font-size: 11px; color: #a1a1a6; margin-right: 5px; cursor: pointer; transition: 0.2s; }
      .tag-chip:hover { background: #3e3e42; color: #fff; }
      .btn-click:active { transform: scale(0.97); }
      input, select, textarea { transition: border 0.2s; }
      input:focus, textarea:focus { border-color: #007aff !important; }
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

  // 🟢 智能 Slug 生成逻辑 (p-当前时间戳)
  const generateAutoSlug = () => {
    return 'p-' + Date.now().toString(36) + Math.random().toString(36).substr(2, 4);
  };

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
      }).finally(() => setLoading(false));
  };

  const handleSave = async () => {
    if (!form.title) return alert('标题不能为空');
    setLoading(true);
    const res = await fetch('/api/post', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, id: currentId }),
    });
    if ((await res.json()).success) {
      setView('list');
      fetchPosts();
    } else { alert('保存失败'); setLoading(false); }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!confirm('确定彻底删除吗？')) return;
    setLoading(true);
    await fetch(`/api/post?id=${id}`, { method: 'DELETE' });
    fetchPosts();
  };

  if (!mounted) return null;

  return (
    <div style={css.page}>
      <div style={css.container}>
        <header style={css.header}>
          <div style={css.logo}>CMS<span style={{color:'#007aff'}}>CONSOLE</span></div>
          {view === 'edit' && <button onClick={() => setView('list')} className="btn-click" style={css.btnBack}>取消并返回</button>}
        </header>

        {view === 'list' ? (
          <main>
            <div style={css.listHeader}>
                <div style={css.tabs}>
                    {['Post', 'Page', 'Widget'].map(t => (
                        <button key={t} onClick={() => setActiveTab(t)} style={activeTab === t ? css.tabActive : css.tab}>{t}</button>
                    ))}
                </div>
                <button onClick={() => { 
                    setForm({title:'', slug: generateAutoSlug(), excerpt:'', content:'', category:'', tags:'', cover:'', status:'Published', type:'Post', date: new Date().toISOString().split('T')[0]}); 
                    setCurrentId(null); 
                    setView('edit'); 
                }} className="btn-click" style={css.btnNew}>新建{activeTab}</button>
            </div>

            <div style={css.listBody}>
              {loading && <div style={{padding:'40px', textAlign:'center', color:'#666'}}>正在载入云端数据...</div>}
              {!loading && posts.filter(p => p.type === activeTab).map(p => (
                <div key={p.id} onClick={() => handleEdit(p)} className="row-container">
                  <div className="row-content">
                    <div style={css.rowMain}>
                        <div style={css.rowTitle}>{p.title}</div>
                        <div style={css.rowMeta}>{p.category} · {p.date || '无日期'}</div>
                    </div>
                  </div>
                  {/* 🟢 高级红色侧滑删除区 */}
                  <div onClick={(e) => handleDelete(e, p.id)} className="delete-drawer">
                    删除内容
                  </div>
                </div>
              ))}
            </div>
          </main>
        ) : (
          <main style={css.formPanel}>
            <div style={css.fieldGroup}>
                <div style={{flex:3}}>
                    <label style={css.label}>标题</label>
                    <input style={css.input} value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="输入标题..." />
                </div>
                <div style={{flex:1}}>
                    <label style={css.label}>Slug (系统已自动生成且锁定)</label>
                    <input style={{...css.input, background:'#18181c', color:'#666'}} value={form.slug} disabled />
                </div>
            </div>

            <div style={css.grid3}>
              <div>
                <label style={css.label}>分类 (下拉选择或手动输入)</label>
                <input list="cats" style={css.input} value={form.category} onChange={e => setForm({...form, category: e.target.value})} />
                <datalist id="cats">{options.categories.map(o => <option key={o} value={o} />)}</datalist>
              </div>
              <div>
                <label style={css.label}>日期</label>
                <input type="date" style={css.input} value={form.date} onChange={e => setForm({...form, date: e.target.value})} />
              </div>
              <div>
                <label style={css.label}>内容类型</label>
                <select style={css.input} value={form.type} onChange={e => setForm({...form, type: e.target.value})}>
                  <option value="Post">Post</option><option value="Page">Page</option><option value="Widget">Widget</option>
                </select>
              </div>
            </div>

            <label style={css.label}>标签 (点击快捷添加，或用逗号隔开输入)</label>
            <div style={{marginBottom:'15px'}}>
                <input style={{...css.input, marginBottom:'8px'}} value={form.tags} onChange={e => setForm({...form, tags: e.target.value})} />
                <div style={{display:'flex', gap:'5px', flexWrap:'wrap'}}>
                    {options.tags.map(t => (
                        <span key={t} className="tag-chip" onClick={() => {
                            if(!form.tags.includes(t)) setForm({...form, tags: form.tags ? `${form.tags},${t}` : t})
                        }}>{t}</span>
                    ))}
                </div>
            </div>

            <div style={css.grid2}>
                <div><label style={css.label}>封面图链接</label><input style={css.input} value={form.cover} onChange={e => setForm({...form, cover: e.target.value})} /></div>
                <div><label style={css.label}>状态</label>
                  <select style={css.input} value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
                    <option value="Published">公开</option><option value="Hidden">隐藏</option>
                  </select>
                </div>
            </div>

            <label style={css.label}>摘要 (Excerpt)</label>
            <input style={css.input} value={form.excerpt} onChange={e => setForm({...form, excerpt: e.target.value})} />

            <label style={css.label}>正文 (Markdown)</label>
            <textarea style={css.textarea} value={form.content} onChange={e => setForm({...form, content: e.target.value})} placeholder="在这里书写..." />

            <button onClick={handleSave} disabled={loading} className="btn-click" style={css.btnSave}>
                {loading ? '正在同步至 Notion 数据库...' : '💾 保存并立即同步'}
            </button>
          </main>
        )}
      </div>
    </div>
  );
}

// 🎨 Cloudreve 风格高级灰主题
const css = {
  page: { minHeight: '100vh' },
  container: { maxWidth: '900px', margin: '0 auto', padding: '40px 20px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' },
  logo: { fontSize: '20px', fontWeight: '900', color: '#fff' },
  listHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  tabs: { background: '#252529', padding: '4px', borderRadius: '8px', display: 'flex' },
  tab: { padding: '6px 20px', border: 'none', background: 'none', color: '#9ea0a5', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' },
  tabActive: { padding: '6px 20px', border: 'none', background: '#3e3e42', color: '#fff', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' },
  btnNew: { padding: '10px 20px', background: '#007aff', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' },
  btnBack: { padding: '8px 16px', background: '#2d2d30', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' },
  listBody: { display: 'flex', flexDirection: 'column' },
  rowTitle: { fontSize: '15px', fontWeight: '600', color: '#f1f1f3', marginBottom: '4px' },
  rowMeta: { fontSize: '12px', color: '#9ea0a5' },
  formPanel: { background: '#202024', padding: '30px', borderRadius: '12px', border: '1px solid #2d2d30' },
  label: { display: 'block', fontSize: '11px', color: '#9ea0a5', marginBottom: '8px', fontWeight: 'bold', textTransform: 'uppercase' },
  input: { width: '100%', padding: '12px', background: '#252529', border: '1px solid #333', borderRadius: '6px', color: '#fff', marginBottom: '20px', boxSizing: 'border-box', outline: 'none' },
  grid2: { display: 'flex', gap: '20px' },
  grid3: { display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: '20px' },
  fieldGroup: { display: 'flex', gap: '20px' },
  textarea: { width: '100%', height: '400px', background: '#252529', border: '1px solid #333', borderRadius: '6px', color: '#fff', padding: '15px', fontFamily: 'monospace', lineHeight: '1.6', boxSizing: 'border-box', outline: 'none' },
  btnSave: { width: '100%', padding: '16px', background: '#fff', color: '#000', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '15px', marginTop: '20px' }
};
