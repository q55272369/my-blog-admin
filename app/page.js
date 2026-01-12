'use client';
import React, { useState, useEffect, useRef } from 'react';

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [view, setView] = useState('list');
  const [posts, setPosts] = useState([]);
  const [options, setOptions] = useState({ categories: [], tags: [] });
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('Post');
  const [searchQuery, setSearchQuery] = useState('');

  // 表单状态
  const [form, setForm] = useState({ 
    title: '', slug: '', excerpt: '', content: '', category: '', tags: '', cover: '', status: 'Published', type: 'Post', date: '' 
  });
  const [currentId, setCurrentId] = useState(null);
  const [rawLinks, setRawLinks] = useState('');
  const [mdLinks, setMdLinks] = useState('');

  const textAreaRef = useRef(null);
  const isFormValid = form.title.trim() !== '' && form.category.trim() !== '' && form.date !== '';

  const LSKY_URL = "https://x1file.top/dashboard"; 
  const CLOUDREVE_URL = "https://x1file.top/home"; 

  useEffect(() => {
    setMounted(true);
    fetchPosts();
    const style = document.head.appendChild(document.createElement('style'));
    style.innerHTML = `
      body { background-color: #121212; color: #e1e1e3; margin: 0; font-family: system-ui, -apple-system, sans-serif; }
      .list-card { background: #18181c; border: 1px solid #2d2d30; border-radius: 12px; margin-bottom: 12px; cursor: pointer; transition: 0.3s; position: relative; overflow: hidden; display: flex; align-items: stretch; min-height: 100px; }
      .list-card:hover { border-color: #007aff; background: #202024; transform: translateY(-2px); }
      .card-cover { width: 140px; flex-shrink: 0; background: #252529; overflow: hidden; display: flex; align-items: center; justify-content: center; }
      .card-cover img { width: 100%; height: 100%; object-fit: cover; }
      .card-info { flex: 1; padding: 15px 20px; display: flex; flex-direction: column; justify-content: center; }
      .delete-btn { position: absolute; right: -80px; top: 0; bottom: 0; width: 80px; background: #ff4d4f; color: #fff; display: flex; align-items: center; justify-content: center; transition: 0.3s; font-weight: bold; z-index: 10; }
      .list-card:hover .delete-btn { right: 0; }
      .search-bar { width: 100%; padding: 12px 15px; background: #18181c; border: 1px solid #333; border-radius: 10px; color: #fff; margin-bottom: 20px; box-sizing: border-box; }
      .tag-chip { background: #2d2d32; padding: 4px 10px; border-radius: 4px; font-size: 11px; color: #888; margin: 0 5px 5px 0; cursor: pointer; }
      .tag-chip:hover { color: #fff; background: #3e3e42; }
      .toolbar-btn { background: #2d2d32; color: #fff; border: 1px solid #444; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: bold; transition: 0.2s; }
      .toolbar-btn:hover { border-color: #007aff; }
      .required-star { color: #ff4d4f !important; margin-left: 4px; font-weight: bold; display: inline; }
      input, select, textarea { width: 100%; padding: 14px; background: #18181c; border: 1px solid #333; border-radius: 10px; color: #fff; box-sizing: border-box; font-size: 15px; outline: none; }
      input:focus, textarea:focus { border-color: #007aff; }
    `;
  }, []);

  async function fetchPosts() {
    setLoading(true);
    try {
      const res = await fetch('/api/posts');
      const data = await res.json();
      if (data.success) { setPosts(data.posts || []); setOptions(data.options); }
    } finally { setLoading(false); }
  }

  const cleanAndConvertLinks = () => {
    if(!rawLinks.trim()) return;
    const lines = rawLinks.split('\n');
    const finalOutput = [];
    for(let i=0; i<lines.length; i++){
        const m = lines[i].match(/https?:\/\/[^\s]+/);
        if(m) finalOutput.push(`![](${m[0]})`);
    }
    if (finalOutput.length > 0) setMdLinks(finalOutput.join('\n\n'));
  };

  const insertText = (before, after = '') => {
    const el = textAreaRef.current;
    if (!el) return;
    const start = el.selectionStart, end = el.selectionEnd, val = el.value;
    const newText = val.substring(0, start) + before + val.substring(start, end) + after + val.substring(end);
    setForm({ ...form, content: newText });
    setTimeout(() => { el.focus(); el.setSelectionRange(start + before.length, end + before.length); }, 10);
  };

  const handleEdit = (post) => {
    setLoading(true);
    fetch(`/api/post?id=${post.id}`).then(res => res.json()).then(data => {
      if (data.success) { setForm(data.data); setCurrentId(post.id); setView('edit'); }
    }).finally(() => setLoading(false));
  };

  if (!mounted) return null;

  const filteredPosts = posts.filter(p => (p.type === activeTab) && (p.title.toLowerCase().includes(searchQuery.toLowerCase()) || (p.slug || '').toLowerCase().includes(searchQuery.toLowerCase())));

  return (
    <div style={{ minHeight: '100vh', background: '#121212', color: '#e1e1e3', padding: '40px 20px' }}>
      <div style={{ maxWidth: '850px', margin: '0 auto' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
          {/* 🟢 优化 1：更改标题为 PROBLOG */}
          <div style={{ fontSize: '22px', fontWeight: '900', letterSpacing: '1px' }}>PRO<span style={{ color: '#007aff' }}>BLOG</span></div>
          {view === 'edit' && <button onClick={() => setView('list')} style={{ padding: '8px 20px', background: '#2d2d30', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight:'bold' }}>返回</button>}
        </header>

        {view === 'list' ? (
          <main>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div style={{ display: 'flex', background: '#18181c', padding: '4px', borderRadius: '10px' }}>
                {/* 🟢 优化 2：汉化标签页选项 */}
                {['Post', 'Widget'].map(t => (
                  <button key={t} onClick={() => { setActiveTab(t); setSearchQuery(''); }} style={{ padding: '8px 24px', border: 'none', background: activeTab === t ? '#333' : 'none', color: '#fff', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
                    {t === 'Post' ? '已发布' : '组件'}
                  </button>
                ))}
              </div>
              <button onClick={() => { setForm({ title: '', slug: 'p-' + Date.now().toString(36), excerpt: '', content: '', category: '', tags: '', cover: '', status: 'Published', type: activeTab, date: new Date().toISOString().split('T')[0] }); setCurrentId(null); setView('edit'); }} style={{ padding: '10px 25px', background: '#007aff', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>发布新内容</button>
            </div>
            
            {/* 🟢 优化 3：精简搜索框占位符 */}
            <input className="search-bar" placeholder="搜索..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            
            {loading && <p style={{textAlign:'center', color:'#666'}}>📡 载入中...</p>}
            {!loading && filteredPosts.map(p => (
              <div key={p.id} onClick={() => handleEdit(p)} className="list-card">
                <div className="card-cover">
                  {p.cover ? <img src={p.cover} alt="cover" /> : <div style={{color:'#333', fontSize:'24px', fontWeight:'900'}}>{activeTab === 'Post' ? 'P' : 'W'}</div>}
                </div>
                <div className="card-info">
                  <div style={{ fontWeight: 'bold', fontSize: '18px', marginBottom: '6px' }}>{p.title}</div>
                  <div style={{ color: '#666', fontSize: '12px' }}>{p.category} · {p.date}</div>
                </div>
                <div onClick={(e) => { e.stopPropagation(); if (confirm('确认删除吗？')) { fetch('/api/post?id=' + p.id, { method: 'DELETE' }).then(() => fetchPosts()) } }} className="delete-btn">删除</div>
              </div>
            ))}
          </main>
        ) : (
          <main>
            <div style={{marginBottom:'20px'}}><label style={css.label}>标题 <span className="required-star">*</span></label><input value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="输入标题..." /></div>
            
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'20px', marginBottom:'20px'}}>
                <div><label style={css.label}>分类 <span className="required-star">*</span></label><input list="cats" autoComplete="off" value={form.category} onChange={e => setForm({...form, category: e.target.value})} /><datalist id="cats">{options.categories.map(o => <option key={o} value={o} />)}</datalist></div>
                <div><label style={css.label}>发布日期 <span className="required-star">*</span></label><input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} /></div>
            </div>

            <div style={{marginBottom:'20px'}}><label style={css.label}>标签 (点选已有)</label><input value={form.tags} onChange={e => setForm({...form, tags: e.target.value})} /><div style={{marginTop:'8px', display:'flex', flexWrap:'wrap'}}>{options.tags.map(t => <span key={t} className="tag-chip" onClick={()=>{const cur=form.tags.split(',').filter(Boolean); if(!cur.includes(t)) setForm({...form, tags:[...cur,t].join(',')})}}>{t}</span>)}</div></div>
            <div style={{marginBottom:'20px'}}><label style={css.label}>封面图 URL</label><input value={form.cover} onChange={e => setForm({...form, cover: e.target.value})} /></div>
            <div style={{marginBottom:'30px'}}><label style={css.label}>摘要 (EXCERPT)</label><input value={form.excerpt} onChange={e => setForm({...form, excerpt: e.target.value})} /></div>

            <div style={{background:'#18181c', padding:'20px', borderRadius:'12px', border:'1px solid #333', marginBottom:'30px'}}>
              <div style={{display:'flex', gap:'10px', marginBottom:'15px'}}><button onClick={() => window.open(LSKY_URL)} className="toolbar-btn" style={{flex:1}}>🖼️ 打开图床</button><button onClick={() => window.open(CLOUDREVE_URL)} className="toolbar-btn" style={{flex:1}}>🎬 打开网盘</button></div>
              <div style={{fontSize:'11px', color:'#666', fontWeight:'bold', marginBottom:'8px'}}>外链转换</div>
              <textarea style={{height:'80px', fontSize:'12px', background:'#121212', border:'1px solid #444'}} placeholder="在此粘贴原始内容..." value={rawLinks} onChange={e=>setRawLinks(e.target.value)} />
              <button onClick={cleanAndConvertLinks} style={{width:'100%', padding:'10px', background:'#007aff', color:'#fff', border:'none', borderRadius:'6px', cursor:'pointer', marginTop:'10px', fontWeight:'bold'}}>立即转换</button>
              {mdLinks && (
                <div style={{marginTop:'20px', paddingTop:'15px', borderTop:'1px solid #222'}}>
                  <pre style={{background:'#000', padding:'15px', color:'#888', fontSize:'11px', whiteSpace:'pre-wrap', maxHeight:'200px', overflowY:'auto', border:'1px solid #222', borderRadius:'8px'}}>{mdLinks}</pre>
                  <button onClick={()=>{navigator.clipboard.writeText(mdLinks); alert('已全部复制')}} style={{width:'100%', padding:'12px', background:'#333', color:'#fff', border:'none', borderRadius:'8px', cursor:'pointer', marginTop:'10px', fontWeight:'bold', fontSize:'13px'}}>复制全部内容</button>
                </div>
              )}
            </div>

            <div style={{background:'#202024', padding:'10px', border:'1px solid #333', borderBottom:'none', borderRadius:'12px 12px 0 0', display:'flex', gap:'10px'}}>
                <button className="toolbar-btn" onClick={()=>insertText('# ', '')}>H1</button>
                <button className="toolbar-btn" onClick={()=>insertText('**', '**')}>B</button>
                <button className="toolbar-btn" onClick={()=>insertText('[', '](url)')}>Link</button>
                <button className="toolbar-btn" style={{background:'#333', color:'#007aff', borderColor:'#007aff'}} onClick={()=>insertText(':::lock 123\n', '\n:::')}>🔒 插入加密块</button>
            </div>
            <textarea ref={textAreaRef} style={{height:'500px', borderRadius:'0 0 12px 12px', fontSize:'16px', lineHeight:'1.6'}} value={form.content} onChange={e => setForm({...form, content: e.target.value})} placeholder="在这里开始创作..." />

            {/* 🟢 优化 4：精简发布按钮文案 */}
            <button onClick={() => { setLoading(true); fetch('/api/post', { method: 'POST', body: JSON.stringify({ ...form, id: currentId }) }).then(() => { setView('list'); fetchPosts(); }) }} disabled={loading || !isFormValid} style={{width:'100%', padding:'20px', background: !isFormValid ? '#333' : '#fff', color:'#000', border:'none', borderRadius:'12px', fontWeight:'bold', fontSize:'16px', marginTop:'40px', cursor: isFormValid ? 'pointer' : 'not-allowed', opacity: isFormValid ? 1 : 0.5}}>
                {loading ? '⚡ 正在努力同步至云端...' : '🚀 确认发布'}
            </button>
          </main>
        )}
      </div>
    </div>
  );
}

const css = {
  label: { display: 'block', fontSize: '10px', color: '#666', marginBottom: '10px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1.5px' }
};
