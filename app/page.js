'use client';
import React, { useState, useEffect } from 'react';

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [view, setView] = useState('list');
  const [posts, setPosts] = useState([]);
  const [options, setOptions] = useState({ categories: [], tags: [] });
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('Post');

  // 表单状态
  const [form, setForm] = useState({ 
    title: '', slug: '', excerpt: '', content: '', 
    category: '', tags: '', cover: '', status: 'Published', 
    type: 'Post', date: '' 
  });
  const [currentId, setCurrentId] = useState(null);

  // 快捷工具状态
  const [rawLinks, setRawLinks] = useState('');
  const [mdLinks, setMdLinks] = useState('');

  // 🟢 自动校验逻辑：检查 标题、分类、日期 是否都有值
  const isFormValid = form.title.trim() !== '' && form.category.trim() !== '' && form.date !== '';

  const LSKY_URL = "https://x1file.top/dashboard"; 
  const CLOUDREVE_URL = "https://x1file.top/home"; 

  useEffect(() => {
    setMounted(true);
    fetchPosts();
    const style = document.head.appendChild(document.createElement('style'));
    style.innerHTML = `
      body { background-color: #18181c; color: #e1e1e3; margin: 0; font-family: "Inter", system-ui, sans-serif; }
      .row-container { position: relative; display: flex; align-items: center; background: #202024; margin-bottom: 8px; border-radius: 8px; overflow: hidden; cursor: pointer; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); border: 1px solid #2d2d30; }
      .row-container:hover { border-color: #3e3e42; transform: translateY(-1px); background-color: #252529 !important; }
      .row-content { flex: 1; padding: 16px 20px; }
      .delete-drawer { position: absolute; right: 0; top: 0; height: 100%; width: 0; background: #ff4d4f; display: flex; align-items: center; justify-content: center; overflow: hidden; transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1); color: #fff; font-weight: bold; font-size: 14px; white-space: nowrap; }
      .row-container:hover .delete-drawer { width: 100px; }
      .tag-chip { background: #2d2d32; padding: 4px 10px; border-radius: 4px; font-size: 11px; color: #a1a1a6; margin-right: 5px; cursor: pointer; transition: 0.2s; }
      .tag-chip:hover { background: #3e3e42; color: #fff; }
      .btn-click:active:not(:disabled) { transform: scale(0.97); }
      input, select, textarea { transition: border 0.2s; outline: none; }
      input:focus, textarea:focus { border-color: #007aff !important; }
      .required-mark { color: #ff4d4f; margin-left: 4px; }
    `;
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

  const generateAutoSlug = () => 'p-' + Date.now().toString(36) + Math.random().toString(36).substr(2, 4);

  const convertBatchLinks = () => {
    if (!rawLinks.trim()) return;
    const converted = rawLinks.split('\n').filter(l => l.trim()).map(url => {
      const fn = url.trim().split('/').pop() || 'image';
      return `![${fn}](${url.trim()})`;
    }).join('\n');
    setMdLinks(converted);
  };

  const handleEdit = (post) => {
    setLoading(true);
    fetch(`/api/post?id=${post.id}`).then(res => res.json()).then(data => {
      if (data.success) { setForm(data.data); setCurrentId(post.id); setView('edit'); }
    }).finally(() => setLoading(false));
  };

  const handleSave = async () => {
    if (!isFormValid) return;
    setLoading(true);
    const res = await fetch('/api/post', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, id: currentId }),
    });
    if ((await res.json()).success) { setView('list'); fetchPosts(); }
    else { alert('保存失败'); setLoading(false); }
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
          {view === 'edit' && <button onClick={() => setView('list')} className="btn-click" style={css.btnBack}>返回</button>}
        </header>

        {view === 'list' ? (
          <main>
            <div style={css.listHeader}>
                <div style={css.tabs}>
                    {['Post', 'Widget'].map(t => (
                        <button key={t} onClick={() => setActiveTab(t)} style={activeTab === t ? css.tabActive : css.tab}>{t}</button>
                    ))}
                </div>
                <button onClick={() => { 
                    setForm({title:'', slug: generateAutoSlug(), excerpt:'', content:'', category:'', tags:'', cover:'', status:'Published', type: 'Post', date: new Date().toISOString().split('T')[0]}); 
                    setCurrentId(null); setView('edit'); 
                }} className="btn-click" style={css.btnNew}>新建文章</button>
            </div>

            <div style={css.listBody}>
              {loading && <div style={{padding:'40px', textAlign:'center', color:'#666'}}>载入云端数据中...</div>}
              {!loading && posts.filter(p => p.type === activeTab).map(p => (
                <div key={p.id} onClick={() => handleEdit(p)} className="row-container">
                  <div className="row-content">
                    <div style={css.rowMain}>
                        <div style={css.rowTitle}>{p.title}</div>
                        <div style={css.rowMeta}>{p.category} · {p.date || '无日期'}</div>
                    </div>
                  </div>
                  <div onClick={(e) => handleDelete(e, p.id)} className="delete-drawer">删除</div>
                </div>
              ))}
            </div>
          </main>
        ) : (
          <main style={css.formPanel}>
            <div style={{marginBottom:'20px'}}>
                <label style={css.label}>文章标题<span className="required-mark">*</span></label>
                <input style={css.input} value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="输入文章标题..." />
            </div>

            <div style={css.grid3}>
              <div>
                <label style={css.label}>分类<span className="required-mark">*</span></label>
                <input list="notion-cats" autoComplete="off" style={css.input} value={form.category} onChange={e => setForm({...form, category: e.target.value})} placeholder="选择或输入" />
                <datalist id="notion-cats">{options.categories.map(o => <option key={o} value={o} />)}</datalist>
              </div>
              <div>
                <label style={css.label}>发布日期<span className="required-mark">*</span></label>
                <input type="date" style={css.input} value={form.date} onChange={e => setForm({...form, date: e.target.value})} />
              </div>
              <div>
                <label style={css.label}>发布状态</label>
                <select style={css.input} value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
                  <option value="Published">立即公开</option>
                  <option value="Hidden">草稿隐藏</option>
                </select>
              </div>
            </div>

            <label style={css.label}>标签 (点击快捷添加)</label>
            <div style={{marginBottom:'20px'}}>
                <input style={{...css.input, marginBottom:'8px'}} value={form.tags} onChange={e => setForm({...form, tags: e.target.value})} placeholder="标签1,标签2..." />
                <div style={{display:'flex', gap:'5px', flexWrap:'wrap'}}>{options.tags.map(t => (<span key={t} className="tag-chip" onClick={() => { const current = form.tags.split(',').map(x => x.trim()).filter(Boolean); if(!current.includes(t)) setForm({...form, tags: [...current, t].join(',')}) }}>{t}</span>))}</div>
            </div>

            <div style={{marginBottom:'20px'}}><label style={css.label}>封面图 URL (COVER)</label><input style={css.input} value={form.cover} onChange={e => setForm({...form, cover: e.target.value})} placeholder="https://..." /></div>
            
            <label style={css.label}>文章摘要 (EXCERPT)</label>
            <input style={css.input} value={form.excerpt} onChange={e => setForm({...form, excerpt: e.target.value})} />

            <div style={css.toolBox}>
              <div style={{display:'flex', gap:'10px', marginBottom:'12px'}}><button onClick={() => window.open(LSKY_URL)} style={css.toolBtn}>🖼️ 打开图床</button><button onClick={() => window.open(CLOUDREVE_URL)} style={css.toolBtn}>🎬 打开网盘</button></div>
              <div style={{display:'flex', flexDirection:'column', gap:'8px'}}>
                <div style={{fontSize:'11px', color:'#9ea0a5', fontWeight:'bold'}}>批量转 MD</div>
                <div style={{display:'flex', gap:'10px'}}><textarea style={{...css.toolInput, height: Math.max(45, rawLinks.split('\n').length * 20) + 'px'}} placeholder="粘贴直链..." value={rawLinks} onChange={e => setRawLinks(e.target.value)} /><button onClick={convertBatchLinks} style={css.toolAction}>转换</button></div>
              </div>
              {mdLinks && <div style={{marginTop:'12px', padding:'12px', background:'#18181c', borderRadius:'8px', border:'1px solid #38444d'}}><pre style={{margin:0, fontSize:'11px', color:'#007aff', whiteSpace:'pre-wrap'}}>{mdLinks}</pre><button onClick={() => {navigator.clipboard.writeText(mdLinks); alert('已复制')}} style={{...css.miniBtn, marginTop:'10px', width:'100%'}}>点击复制全部</button></div>}
            </div>

            <label style={css.label}>正文内容 (MARKDOWN)</label>
            <textarea style={css.textarea} value={form.content} onChange={e => setForm({...form, content: e.target.value})} placeholder="在这里开始你的创作..." />
            
            <button 
              onClick={handleSave} 
              disabled={loading || !isFormValid} 
              className="btn-click" 
              style={(!isFormValid || loading) ? css.btnDisabled : css.btnSave}
            >
                {loading ? '⚡ 正在努力同步至云端...' : isFormValid ? '🚀 确认发布 / 覆盖更新' : '⚠️ 请填写必填项以激活发布'}
            </button>
          </main>
        )}
      </div>
    </div>
  );
}

const css = {
  page: { minHeight: '100vh' },
  container: { maxWidth: '900px', margin: '0 auto', padding: '40px 20px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' },
  logo: { fontSize: '20px', fontWeight: '900', color: '#fff', letterSpacing:'1px' },
  listHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  tabs: { background: '#252529', padding: '4px', borderRadius: '12px', display: 'flex' },
  tab: { padding: '8px 25px', border: 'none', background: 'none', color: '#9ea0a5', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' },
  tabActive: { padding: '8px 25px', border: 'none', background: '#3e3e42', color: '#fff', borderRadius: '10px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' },
  btnNew: { padding: '10px 24px', background: '#007aff', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' },
  btnBack: { padding: '8px 20px', background: '#2d2d30', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize:'13px', fontWeight:'bold' },
  listBody: { display: 'flex', flexDirection: 'column' },
  rowTitle: { fontSize: '16px', fontWeight: '600', color: '#f1f1f3', marginBottom: '4px' },
  rowMeta: { fontSize: '12px', color: '#666' },
  formPanel: { background: '#202024', padding: '30px', borderRadius: '20px', border: '1px solid #2d2d30' },
  label: { display: 'block', fontSize: '10px', color: '#666', marginBottom: '10px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing:'1.5px' },
  input: { width: '100%', padding: '14px', background: '#18181c', border: '1px solid #333', borderRadius: '10px', color: '#fff', marginBottom: '20px', boxSizing: 'border-box', outline: 'none', fontSize:'15px' },
  grid3: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' },
  textarea: { width: '100%', height: '500px', background: '#18181c', border: '1px solid #333', borderRadius: '10px', color: '#fff', padding: '15px', fontFamily: 'monospace', lineHeight: '1.6', boxSizing: 'border-box', fontSize:'16px' },
  toolBox: { background: '#2d2d32', padding: '20px', borderRadius: '16px', marginBottom: '30px', border: '1px solid #38383d' },
  toolBtn: { padding: '10px 15px', background: '#3e3e42', border: 'none', color: '#fff', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' },
  toolInput: { flex: 1, padding: '12px', background: '#18181c', border: '1px solid #3e3e42', color: '#fff', borderRadius: '8px', fontSize: '13px', resize: 'none' },
  toolAction: { padding: '0 20px', background: '#007aff', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight:'bold' },
  miniBtn: { padding: '8px', background: '#333', color: '#007aff', border: '1px solid #007aff', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', fontWeight:'bold' },
  btnSave: { width: '100%', padding: '20px', background: '#fff', color: '#000', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px', marginTop: '30px', transition: 'all 0.3s' },
  btnDisabled: { width: '100%', padding: '20px', background: '#333', color: '#666', border: 'none', borderRadius: '12px', cursor: 'not-allowed', fontWeight: 'bold', fontSize: '16px', marginTop: '30px', opacity: 0.6 }
};
