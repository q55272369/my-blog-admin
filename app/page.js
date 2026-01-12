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

  const editorRef = useRef(null); // 🟢 指向富文本区域

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
      .list-card:hover { border-color: #007aff; background: #202024; transform: translateY(-2px); }
      .delete-btn { position: absolute; right: -80px; top: 0; bottom: 0; width: 80px; background: #ff4d4f; color: #fff; display: flex; align-items: center; justify-content: center; transition: 0.3s; font-weight: bold; font-size: 14px; }
      .list-card:hover .delete-btn { right: 0; }
      .rich-editor { width: 100%; min-height: 400px; background: #18181c; border: 1px solid #333; border-radius: 0 0 12px 12px; color: #fff; padding: 20px; outline: none; font-size: 16px; line-height: 1.6; }
      .rich-editor:focus { border-color: #007aff; }
      .toolbar { background: #202024; padding: 10px; border: 1px solid #333; border-bottom: none; border-radius: 12px 12px 0 0; display: flex; gap: 8px; flex-wrap: wrap; }
      .t-btn { background: #2d2d32; color: #fff; border: 1px solid #444; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 13px; font-weight: bold; }
      .t-btn:hover { background: #3d3d42; }
      .required-star { color: #ff4d4f; margin-left: 4px; }
      .input-field { width: 100%; padding: 12px; background: #18181c; border: 1px solid #333; border-radius: 8px; color: #fff; box-sizing: border-box; font-size: 15px; margin-bottom: 20px; }
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

  // 🟢 富文本命令执行
  const exec = (cmd, val = null) => {
    document.execCommand(cmd, false, val);
    if (editorRef.current) setForm({ ...form, content: editorRef.current.innerHTML });
  };

  const handleEdit = (post) => {
    setLoading(true);
    fetch(`/api/post?id=${post.id}`).then(res => res.json()).then(data => {
      if (data.success) {
        setForm(data.data);
        setCurrentId(post.id);
        setView('edit');
        setTimeout(() => { if(editorRef.current) editorRef.current.innerHTML = data.data.content; }, 100);
      }
    }).finally(() => setLoading(false));
  };

  const handleSave = async () => {
    if (!isFormValid) return;
    const finalForm = { ...form, content: editorRef.current.innerHTML };
    setLoading(true);
    const res = await fetch('/api/post', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...finalForm, id: currentId }),
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
              <button onClick={() => { setForm({ title: '', slug: 'p-' + Date.now().toString(36), excerpt: '', content: '', category: '', tags: '', cover: '', status: 'Published', type: 'Post', date: new Date().toISOString().split('T')[0] }); setCurrentId(null); setView('edit'); }} style={{ padding: '10px 25px', background: '#007aff', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>发布新内容</button>
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
            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#666' }}>标题<span className="required-star">*</span></label>
              <input className="input-field" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="输入文章标题..." />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
              <div><label style={{ fontSize: '11px', fontWeight: 'bold', color: '#666' }}>分类<span className="required-star">*</span></label>
                <input list="cats" className="input-field" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} /><datalist id="cats">{options.categories.map(o => <option key={o} value={o} />)}</datalist>
              </div>
              <div><label style={{ fontSize: '11px', fontWeight: 'bold', color: '#666' }}>日期<span className="required-star">*</span></label><input type="date" className="input-field" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></div>
              <div><label style={{ fontSize: '11px', fontWeight: 'bold', color: '#666' }}>状态</label><select className="input-field" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}><option value="Published">公开</option><option value="Hidden">隐藏</option></select></div>
            </div>

            <div style={{ marginBottom: '20px' }}><label style={{ fontSize: '11px', fontWeight: 'bold', color: '#666' }}>标签</label><input className="input-field" value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} placeholder="逗号隔开..." /></div>
            <div style={{ marginBottom: '20px' }}><label style={{ fontSize: '11px', fontWeight: 'bold', color: '#666' }}>封面图 URL</label><input className="input-field" value={form.cover} onChange={e => setForm({ ...form, cover: e.target.value })} /></div>
            <div style={{ marginBottom: '30px' }}><label style={{ fontSize: '11px', fontWeight: 'bold', color: '#666' }}>摘要</label><input className="input-field" value={form.excerpt} onChange={e => setForm({ ...form, excerpt: e.target.value })} /></div>

            {/* 素材助手 */}
            <div style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
              <button onClick={() => window.open(LSKY_URL)} style={{ flex:1, padding: '12px', background: '#2d2d32', color: '#fff', border: '1px solid #444', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>🖼️ 打开图床</button>
              <button onClick={() => window.open(CLOUDREVE_URL)} style={{ flex:1, padding: '12px', background: '#2d2d32', color: '#fff', border: '1px solid #444', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>🎬 打开网盘</button>
            </div>

            {/* 批量链接转换器 */}
            <div style={{ background: '#18181c', padding: '15px', borderRadius: '12px', border: '1px solid #333', marginBottom: '30px' }}>
               <textarea style={{ width:'100%', background:'transparent', border:'none', color:'#888', fontSize:'12px', resize:'none', outline:'none' }} placeholder="在这里粘贴图片直链，点转换即刻插入编辑器..." value={rawLinks} onChange={e=>setRawLinks(e.target.value)} />
               <button onClick={() => {
                 const md = rawLinks.split('\n').filter(l=>l.trim()).map(u=>`<img src="${u.trim()}" />`).join('');
                 if(editorRef.current) editorRef.current.innerHTML += md;
                 setRawLinks('');
               }} style={{ width:'100%', padding:'8px', background:'#333', color:'#fff', border:'none', borderRadius:'6px', cursor:'pointer', marginTop:'10px', fontSize:'12px' }}>✨ 转换并直接插入正文</button>
            </div>

            {/* 🟢 富文本编辑器 */}
            <div className="toolbar">
              <button className="t-btn" onClick={() => exec('formatBlock', 'h1')}>H1</button>
              <button className="t-btn" onClick={() => exec('bold')}>B</button>
              <button className="t-btn" onClick={() => { const url = prompt('输入链接:'); if(url) exec('createLink', url); }}>Link</button>
              <button className="t-btn" style={{color:'red'}} onClick={() => exec('foreColor', 'red')}>Red</button>
              <button className="t-btn" style={{color:'blue'}} onClick={() => exec('foreColor', 'blue')}>Blue</button>
              <button className="t-btn" style={{color:'green'}} onClick={() => exec('foreColor', 'green')}>Green</button>
              <button className="t-btn" style={{color:'#fff'}} onClick={() => exec('foreColor', '#fff')}>White</button>
            </div>
            <div 
              ref={editorRef}
              className="rich-editor"
              contentEditable 
              onBlur={() => setForm({ ...form, content: editorRef.current.innerHTML })}
              dangerouslySetInnerHTML={{ __html: '' }}
            />

            <button 
              onClick={handleSave} 
              disabled={loading || !isFormValid} 
              style={{ width: '100%', padding: '20px', background: !isFormValid ? '#333' : '#fff', color: '#000', border: 'none', borderRadius: '12px', cursor: isFormValid ? 'pointer' : 'not-allowed', fontWeight: 'bold', fontSize: '16px', marginTop: '40px', opacity: isFormValid ? 1 : 0.5 }}
            >
              {loading ? '⚡ 同步至云端...' : '🚀 确认发布更新'}
            </button>
          </main>
        )}
      </div>
    </div>
  );
}
