'use client';
import React, { useState, useEffect, useRef } from 'react';

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [view, setView] = useState('list');
  const [posts, setPosts] = useState([]);
  const [options, setOptions] = useState({ categories: [], tags: [] });
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('Post');

  const [form, setForm] = useState({ title: '', slug: '', excerpt: '', content: '', category: '', tags: '', cover: '', status: 'Published', date: '' });
  const [currentId, setCurrentId] = useState(null);
  const [rawLinks, setRawLinks] = useState('');
  const [mdLinks, setMdLinks] = useState('');

  const textAreaRef = useRef(null);

  // 🔴 必填校验逻辑
  const isFormValid = form.title.trim() !== '' && form.category.trim() !== '' && form.date !== '';

  const LSKY_URL = "https://x1file.top/dashboard"; 
  const CLOUDREVE_URL = "https://x1file.top/home"; 

  useEffect(() => {
    setMounted(true);
    fetchPosts();
    const style = document.head.appendChild(document.createElement('style'));
    style.innerHTML = `
      body { background-color: #121212; color: #e1e1e3; margin: 0; font-family: system-ui; }
      .list-card { background: #18181c; border: 1px solid #2d2d30; border-radius: 12px; padding: 20px; margin-bottom: 12px; cursor: pointer; transition: 0.3s; position: relative; overflow: hidden; }
      .list-card:hover { border-color: #007aff; transform: translateY(-2px); background: #202024; }
      .delete-btn { position: absolute; right: -80px; top: 0; bottom: 0; width: 80px; background: #ff4d4f; color: #fff; display: flex; align-items: center; justify-content: center; transition: 0.3s; font-weight: bold; }
      .list-card:hover .delete-btn { right: 0; }
      .tag-chip { background: #2d2d32; padding: 4px 10px; border-radius: 4px; font-size: 11px; color: #888; margin: 0 5px 5px 0; cursor: pointer; }
      .tag-chip:hover { color: #fff; background: #3e3e42; }
      .toolbar-btn { background: #2d2d32; color: #fff; border: 1px solid #444; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 13px; font-weight: bold; }
      .required-star { color: #ff4d4f; margin-left: 4px; font-weight: bold; }
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

  const insertText = (before, after = '') => {
    const el = textAreaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const val = el.value;
    const newText = val.substring(0, start) + before + val.substring(start, end) + after + val.substring(end);
    setForm({ ...form, content: newText });
    setTimeout(() => { el.focus(); el.setSelectionRange(start + before.length, end + before.length); }, 10);
  };

  const convertLinks = () => {
    if(!rawLinks.trim()) return;
    const converted = rawLinks.split('\n').filter(l => l.trim()).map(url => {
        const fn = url.trim().split('/').pop() || 'image';
        return `![${fn}](${url.trim()})`;
    }).join('\n\n'); // 🟢 垂直换行，不挤在一坨
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

  if (!mounted) return null;

  return (
    <div style={{ minHeight: '100vh', background: '#121212', color: '#e1e1e3', padding: '40px 20px' }}>
      <div style={{ maxWidth: '850px', margin: '0 auto' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
          <div style={{ fontSize: '22px', fontWeight: '900' }}>NOTION<span style={{ color: '#007aff' }}>CMS</span></div>
          {view === 'edit' && <button onClick={() => setView('list')} style={{ padding: '8px 20px', background: '#2d2d30', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>返回</button>}
        </header>

        {view === 'list' ? (
          <main>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '25px' }}>
              <div style={{ display: 'flex', background: '#18181c', padding: '4px', borderRadius: '10px' }}>
                {['Post', 'Widget'].map(t => (
                  <button key={t} onClick={() => setActiveTab(t)} style={{ padding: '8px 24px', border: 'none', background: activeTab === t ? '#333' : 'none', color: '#fff', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>{t}</button>
                ))}
              </div>
              <button onClick={() => { setForm({ title: '', slug: 'p-' + Date.now().toString(36), excerpt: '', content: '', category: '', tags: '', cover: '', status: 'Published', date: new Date().toISOString().split('T')[0] }); setCurrentId(null); setView('edit'); }} style={{ padding: '10px 25px', background: '#007aff', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>发布新文章</button>
            </div>
            {posts.filter(p => p.type === activeTab).map(p => (
              <div key={p.id} onClick={() => handleEdit(p)} className="list-card">
                <div style={{ fontWeight: 'bold', fontSize: '18px', marginBottom: '6px' }}>{p.title}</div>
                <div style={{ color: '#666', fontSize: '12px' }}>{p.category} · {p.date}</div>
                <div onClick={(e) => { e.stopPropagation(); if (confirm('归档吗？')) { fetch('/api/post?id=' + p.id, { method: 'DELETE' }).then(() => fetchPosts()) } }} className="delete-btn">删除</div>
              </div>
            ))}
          </main>
        ) : (
          <main>
            {/* 垂直化的表单 */}
            <div style={{marginBottom:'20px'}}><label style={{fontSize:'11px', color:'#666', fontWeight:'bold'}}>标题 <span className="required-star">*</span></label><input value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="输入标题..." /></div>
            
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'20px', marginBottom:'20px'}}>
                <div><label style={{fontSize:'11px', color:'#666', fontWeight:'bold'}}>分类 <span className="required-star">*</span></label><input list="cats" value={form.category} onChange={e => setForm({...form, category: e.target.value})} placeholder="选择或输入..." /><datalist id="cats">{options.categories.map(o => <option key={o} value={o} />)}</datalist></div>
                <div><label style={{fontSize:'11px', color:'#666', fontWeight:'bold'}}>发布日期 <span className="required-star">*</span></label><input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} /></div>
            </div>

            <div style={{marginBottom:'20px'}}><label style={{fontSize:'11px', color:'#666', fontWeight:'bold'}}>标签 (已有：点下方添加)</label><input value={form.tags} onChange={e => setForm({...form, tags: e.target.value})} placeholder="逗号隔开..." /><div style={{marginTop:'8px', display:'flex', flexWrap:'wrap'}}>{options.tags.map(t => <span key={t} className="tag-chip" onClick={()=>{const cur=form.tags.split(',').filter(Boolean); if(!cur.includes(t)) setForm({...form, tags:[...cur,t].join(',')})}}>{t}</span>)}</div></div>
            <div style={{marginBottom:'20px'}}><label style={{fontSize:'11px', color:'#666', fontWeight:'bold'}}>封面图 (COVER URL)</label><input value={form.cover} onChange={e => setForm({...form, cover: e.target.value})} placeholder="https://..." /></div>
            <div style={{marginBottom:'30px'}}><label style={{fontSize:'11px', color:'#666', fontWeight:'bold'}}>摘要 (EXCERPT)</label><input value={form.excerpt} onChange={e => setForm({...form, excerpt: e.target.value})} /></div>

            {/* 素材与转换工具 */}
            <div style={{background:'#18181c', padding:'20px', borderRadius:'12px', border:'1px solid #333', marginBottom:'30px'}}>
              <div style={{display:'flex', gap:'10px', marginBottom:'15px'}}><button onClick={() => window.open(LSKY_URL)} className="toolbar-btn" style={{flex:1}}>🖼️ 打开图床</button><button onClick={() => window.open(CLOUDREVE_URL)} className="toolbar-btn" style={{flex:1}}>🎬 打开网盘</button></div>
              <textarea style={{height:'60px', fontSize:'12px', background:'#121212', border:'1px solid #444'}} placeholder="在此粘贴一个或多个直链..." value={rawLinks} onChange={e=>setRawLinks(e.target.value)} />
              <button onClick={convertLinks} style={{width:'100%', padding:'10px', background:'#333', color:'#fff', border:'none', borderRadius:'6px', cursor:'pointer', marginTop:'10px', fontWeight:'bold'}}>转换 Markdown</button>
              {mdLinks && <div style={{marginTop:'15px'}}><pre style={{background:'#000', padding:'10px', color:'#007aff', fontSize:'11px', whiteSpace:'pre-wrap'}}>{mdLinks}</pre><button onClick={()=>{navigator.clipboard.writeText(mdLinks); alert('已复制')}} style={{width:'100%', padding:'8px', background:'#007aff', color:'#fff', border:'none', borderRadius:'6px', cursor:'pointer', marginTop:'5px'}}>点击复制全部</button></div>}
            </div>

            {/* 编辑器工具栏 */}
            <div style={{background:'#202024', padding:'10px', border:'1px solid #333', borderBottom:'none', borderRadius:'12px 12px 0 0', display:'flex', gap:'10px'}}>
                <button className="toolbar-btn" onClick={()=>insertText('# ', '')}>H1</button>
                <button className="toolbar-btn" onClick={()=>insertText('**', '**')}>B</button>
                <button className="toolbar-btn" onClick={()=>insertText('[', '](url)')}>Link</button>
            </div>
            <textarea ref={textAreaRef} style={{height:'500px', borderRadius:'0 0 12px 12px', fontSize:'16px', lineHeight:'1.6'}} value={form.content} onChange={e => setForm({...form, content: e.target.value})} placeholder="在这里开始创作..." />

            {/* 发布按钮 */}
            <button onClick={handleSave} disabled={loading || !isFormValid} style={{width:'100%', padding:'20px', background: !isFormValid ? '#333' : '#fff', color:'#000', border:'none', borderRadius:'12px', fontWeight:'bold', fontSize:'16px', marginTop:'40px', cursor: isFormValid ? 'pointer' : 'not-allowed', opacity: isFormValid ? 1 : 0.5}}>
                {loading ? '⚡ 正在努力同步至 Notion...' : '🚀 确认发布 / 覆盖更新'}
            </button>
          </main>
        )}
      </div>
    </div>
  );
}
