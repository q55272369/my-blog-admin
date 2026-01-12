'use client';
import React, { useState, useEffect, useRef } from 'react';

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [view, setView] = useState('list');
  const [posts, setPosts] = useState([]);
  const [options, setOptions] = useState({ categories: [], tags: [] });
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('Post');

  const [form, setForm] = useState({ title: '', slug: '', excerpt: '', content: '', category: '', tags: '', cover: '', status: 'Published', type: 'Post', date: '' });
  const [currentId, setCurrentId] = useState(null);
  const [rawLinks, setRawLinks] = useState('');
  const [mdLinks, setMdLinks] = useState('');

  const textAreaRef = useRef(null); // 🟢 引用文本框，用于处理插入

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
      .delete-drawer { position: absolute; right: 0; top: 0; height: 100%; width: 0; background: #ff4d4f; display: flex; align-items: center; justify-content: center; overflow: hidden; transition: width 0.3s; color: #fff; font-weight: bold; font-size: 14px; }
      .row-container:hover .delete-drawer { width: 100px; }
      .tag-chip { background: #2d2d32; padding: 4px 10px; border-radius: 4px; font-size: 11px; color: #a1a1a6; margin-right: 5px; cursor: pointer; transition: 0.2s; }
      .btn-click:active:not(:disabled) { transform: scale(0.97); }
      .toolbar-btn { background: #2d2d32; color: #e1e1e3; border: 1px solid #3d3d42; padding: 5px 12px; border-radius: 4px; cursor: pointer; font-size: 13px; font-weight: bold; transition: 0.2s; }
      .toolbar-btn:hover { background: #3d3d42; border-color: #007aff; color: #fff; }
      input, select, textarea { transition: border 0.2s; outline: none; }
      input:focus, textarea:focus { border-color: #007aff !important; }
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

  // 🟢 核心功能：操作光标位置并插入 Markdown 语法
  const insertText = (before, after = '') => {
    const el = textAreaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selectedText = el.value.substring(start, end);
    const newText = el.value.substring(0, start) + before + selectedText + after + el.value.substring(end);
    setForm({ ...form, content: newText });
    
    // 重新聚焦
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + before.length, end + before.length);
    }, 10);
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
            <button onClick={() => { setForm({title:'', slug: 'p-'+Date.now().toString(36), excerpt:'', content:'', category:'', tags:'', cover:'', status:'Published', type: 'Post', date: new Date().toISOString().split('T')[0]}); setCurrentId(null); setView('edit'); }} style={css.btnNew}>➕ 新建文章</button>
            <div style={css.tabs}>
                {['Post', 'Widget'].map(t => (
                    <button key={t} onClick={() => setActiveTab(t)} style={activeTab === t ? css.tabActive : css.tab}>{t}</button>
                ))}
            </div>
            <div style={css.listBody}>
              {loading && <div style={{padding:'40px', textAlign:'center', color:'#666'}}>载入中...</div>}
              {!loading && posts.filter(p => p.type === activeTab).map(p => (
                <div key={p.id} onClick={() => handleEdit(p)} className="row-container">
                  <div className="row-content"><div style={css.rowTitle}>{p.title}</div><div style={css.rowMeta}>{p.category} · {p.date}</div></div>
                  <div onClick={(e) => {e.stopPropagation(); if(confirm('删除吗？')){fetch('/api/post?id='+p.id,{method:'DELETE'}).then(()=>fetchPosts())}}} className="delete-drawer">删除</div>
                </div>
              ))}
            </div>
          </main>
        ) : (
          <main style={css.formPanel}>
            <div style={{marginBottom:'20px'}}><label style={css.label}>文章标题</label><input style={css.input} value={form.title} onChange={e => setForm({...form, title: e.target.value})} /></div>
            
            <div style={css.grid3}>
              <div><label style={css.label}>分类</label><input list="cats" autoComplete="off" style={css.input} value={form.category} onChange={e => setForm({...form, category: e.target.value})} /><datalist id="cats">{options.categories.map(o => <option key={o} value={o} />)}</datalist></div>
              <div><label style={css.label}>发布日期</label><input type="date" style={css.input} value={form.date} onChange={e => setForm({...form, date: e.target.value})} /></div>
              <div><label style={css.label}>状态</label><select style={css.input} value={form.status} onChange={e => setForm({...form, status: e.target.value})}><option value="Published">公开</option><option value="Hidden">隐藏</option></select></div>
            </div>

            <div style={css.grid2}>
                <div><label style={css.label}>封面图 URL</label><input style={css.input} value={form.cover} onChange={e => setForm({...form, cover: e.target.value})} /></div>
                <div><label style={css.label}>标签 (逗号隔开)</label><input style={css.input} value={form.tags} onChange={e => setForm({...form, tags: e.target.value})} /></div>
            </div>

            <label style={css.label}>摘要</label><input style={css.input} value={form.excerpt} onChange={e => setForm({...form, excerpt: e.target.value})} />

            {/* 🟢 增强：魔法工具栏 */}
            <div style={css.toolbarContainer}>
                <button title="大标题" className="toolbar-btn" onClick={() => insertText('# ', '')}>H1</button>
                <button title="中标题" className="toolbar-btn" onClick={() => insertText('## ', '')}>H2</button>
                <button title="加粗" className="toolbar-btn" onClick={() => insertText('**', '**')}>B</button>
                <button title="链接" className="toolbar-btn" onClick={() => insertText('[', '](url)')}>Link</button>
                <button title="图床" className="toolbar-btn" style={{marginLeft:'auto'}} onClick={() => window.open(LSKY_URL)}>🖼️ 图床</button>
                <button title="网盘" className="toolbar-btn" onClick={() => window.open(CLOUDREVE_URL)}>🎬 网盘</button>
            </div>

            <div style={css.toolBox}>
                <textarea style={{...css.toolInput, height:'45px'}} placeholder="粘贴直链转换 MD..." value={rawLinks} onChange={e => setRawLinks(e.target.value)} />
                <button onClick={() => { const lines = rawLinks.split('\n').filter(l => l.trim()); setMdLinks(lines.map(u => `![image](${u.trim()})`).join('\n')); }} style={css.toolAction}>转换</button>
                {mdLinks && <button onClick={() => {navigator.clipboard.writeText(mdLinks); alert('已复制')}} style={css.miniBtn}>复制全部</button>}
            </div>

            <textarea 
              ref={textAreaRef}
              style={css.textarea} 
              value={form.content} 
              onChange={e => setForm({...form, content: e.target.value})} 
              placeholder="在这里开始创作... 提示：选中文字后点上方 B 按钮可加粗" 
            />
            
            <button onClick={handleSave} disabled={loading || !isFormValid} className="btn-click" style={(!isFormValid || loading) ? css.btnDisabled : css.btnSave}>
                {loading ? '⚡ 同步中...' : '🚀 确认发布 / 更新'}
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
  tabs: { background: '#252529', padding: '4px', borderRadius: '12px', display: 'flex', marginBottom: '20px' },
  tab: { flex:1, padding: '8px', border: 'none', background: 'none', color: '#9ea0a5', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' },
  tabActive: { flex:1, padding: '8px', border: 'none', background: '#3e3e42', color: '#fff', borderRadius: '10px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' },
  btnNew: { padding: '10px 24px', background: '#007aff', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', marginBottom:'15px' },
  btnBack: { padding: '8px 20px', background: '#2d2d30', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize:'13px', fontWeight:'bold' },
  rowTitle: { fontSize: '16px', fontWeight: '600', color: '#f1f1f3', marginBottom: '4px' },
  rowMeta: { fontSize: '12px', color: '#666' },
  formPanel: { background: '#202024', padding: '30px', borderRadius: '20px', border: '1px solid #2d2d30' },
  label: { display: 'block', fontSize: '10px', color: '#666', marginBottom: '10px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing:'1.5px' },
  input: { width: '100%', padding: '14px', background: '#18181c', border: '1px solid #333', borderRadius: '10px', color: '#fff', marginBottom: '20px', boxSizing: 'border-box', fontSize:'15px' },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' },
  grid3: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' },
  toolbarContainer: { background: '#2d2d32', padding: '10px', borderRadius: '8px 8px 0 0', display: 'flex', gap: '10px', border: '1px solid #333', borderBottom: 'none' },
  textarea: { width: '100%', height: '500px', background: '#18181c', border: '1px solid #333', borderRadius: '0 0 10px 10px', color: '#fff', padding: '15px', fontFamily: 'monospace', lineHeight: '1.6', boxSizing: 'border-box', fontSize:'16px' },
  toolBox: { background: '#2d2d32', padding: '15px', borderRadius: '12px', marginBottom: '20px', display: 'flex', gap: '10px', alignItems: 'center' },
  toolInput: { flex: 1, padding: '10px', background: '#18181c', border: '1px solid #3e3e42', color: '#fff', borderRadius: '8px', fontSize: '12px', resize: 'none' },
  toolAction: { padding: '0 20px', background: '#3e3e42', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight:'bold', fontSize:'12px' },
  miniBtn: { padding: '8px', background: '#007aff', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', fontWeight:'bold' },
  btnSave: { width: '100%', padding: '20px', background: '#fff', color: '#000', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px', marginTop: '30px' },
  btnDisabled: { width: '100%', padding: '20px', background: '#333', color: '#666', border: 'none', borderRadius: '12px', cursor: 'not-allowed', fontWeight: 'bold', fontSize: '16px', marginTop: '30px', opacity: 0.6 }
};
