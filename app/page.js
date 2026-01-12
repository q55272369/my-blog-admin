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

  const textAreaRef = useRef(null);

  const isFormValid = form.title.trim() !== '' && form.category.trim() !== '' && form.date !== '';

  const LSKY_URL = "https://x1file.top/dashboard"; 
  const CLOUDREVE_URL = "https://x1file.top/home"; 

  useEffect(() => {
    setMounted(true);
    fetchPosts();
    const style = document.head.appendChild(document.createElement('style'));
    style.innerHTML = `
      body { background-color: #121212; color: #e1e1e3; margin: 0; font-family: "Inter", system-ui, sans-serif; }
      .list-card { background: #18181c; border: 1px solid #2d2d30; border-radius: 12px; margin-bottom: 12px; cursor: pointer; transition: 0.3s; position: relative; overflow: hidden; display: flex; align-items: stretch; min-height: 100px; }
      .list-card:hover { border-color: #007aff; background: #202024; transform: translateY(-2px); }
      .card-cover { width: 150px; flex-shrink: 0; background: #252529; overflow: hidden; display: flex; align-items: center; justify-content: center; position: relative; }
      .card-cover img { width: 100%; height: 100%; object-fit: cover; }
      .card-cover-placeholder { width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; background: linear-gradient(135deg, #2d2d30 0%, #18181c 100%); color: #444; font-weight: bold; text-transform: uppercase; font-size: 12px; letter-spacing: 1px; }
      .card-info { flex: 1; padding: 15px 20px; display: flex; flex-direction: column; justify-content: center; }
      .delete-btn { position: absolute; right: -80px; top: 0; bottom: 0; width: 80px; background: #ff4d4f; color: #fff; display: flex; align-items: center; justify-content: center; transition: 0.3s; font-weight: bold; z-index: 10; }
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
    const newText = el.value.substring(0, start) + before + el.value.substring(start, end) + after + el.value.substring(end);
    setForm({ ...form, content: newText });
    setTimeout(() => { el.focus(); el.setSelectionRange(start + before.length, end + before.length); }, 10);
  };

  const convertLinks = () => {
    if(!rawLinks.trim()) return;
    setMdLinks(rawLinks.split('\n').filter(l => l.trim()).map(url => `![image](${url.trim()})`).join('\n\n'));
  };

  const handleEdit = (post) => {
    setLoading(true);
    fetch(`/api/post?id=${post.id}`).then(res => res.json()).then(data => {
      if (data.success) { setForm(data.data); setCurrentId(post.id); setView('edit'); }
    }).finally(() => setLoading(false));
  };

  if (!mounted) return null;

  return (
    <div style={{ minHeight: '100vh', background: '#121212', color: '#e1e1e3', padding: '40px 20px' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
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
              <button onClick={() => { setForm({ title: '', slug: 'p-' + Date.now().toString(36), excerpt: '', content: '', category: '', tags: '', cover: '', status: 'Published', type: activeTab, date: new Date().toISOString().split('T')[0] }); setCurrentId(null); setView('edit'); }} style={{ padding: '10px 25px', background: '#007aff', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>发布新文章</button>
            </div>
            
            {loading && <p style={{textAlign:'center', color:'#666'}}>📡 正在载入数据...</p>}

            {posts.filter(p => p.type === activeTab).map(p => (
              <div key={p.id} onClick={() => handleEdit(p)} className="list-card">
                {/* 🟢 缩略图区域 */}
                <div className="card-cover">
                    {p.cover ? (
                        <img src={p.cover} alt="cover" />
                    ) : (
                        <div className="card-cover-placeholder">
                            <div style={{color:'#333', fontSize:'24px', marginBottom:'4px'}}>NO</div>
                            <div>{p.category}</div>
                        </div>
                    )}
                </div>

                {/* 文字信息区域 */}
                <div className="card-info">
                    <div style={{ fontWeight: 'bold', fontSize: '18px', marginBottom: '8px' }}>{p.title}</div>
                    <div style={{ color: '#666', fontSize: '12px' }}>{p.category} · {p.date || '无日期'}</div>
                </div>

                <div onClick={(e) => { e.stopPropagation(); if (confirm('归档吗？')) { fetch('/api/post?id=' + p.id, { method: 'DELETE' }).then(() => fetchPosts()) } }} className="delete-btn">删除</div>
              </div>
            ))}
          </main>
        ) : (
          <main>
            <div style={{marginBottom:'20px'}}><label style={css.label}>标题 <span className="required-star">*</span></label><input value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="在此输入标题..." /></div>
            
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'20px', marginBottom:'20px'}}>
                <div><label style={css.label}>分类 <span className="required-star">*</span></label><input list="cats" value={form.category} onChange={e => setForm({...form, category: e.target.value})} placeholder="选择或输入..." /><datalist id="cats">{options.categories.map(o => <option key={o} value={o} />)}</datalist></div>
                <div><label style={css.label}>发布日期 <span className="required-star">*</span></label><input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} /></div>
            </div>

            <div style={{marginBottom:'20px'}}><label style={css.label}>标签</label><input value={form.tags} onChange={e => setForm({...form, tags: e.target.value})} /><div style={{marginTop:'8px', display:'flex', flexWrap:'wrap'}}>{options.tags.map(t => <span key={t} className="tag-chip" onClick={()=>{const cur=form.tags.split(',').filter(Boolean); if(!cur.includes(t)) setForm({...form, tags:[...cur,t].join(',')})}}>{t}</span>)}</div></div>
            <div style={{marginBottom:'20px'}}><label style={css.label}>封面图 URL</label><input value={form.cover} onChange={e => setForm({...form, cover: e.target.value})} placeholder="https://..." /></div>
            <div style={{marginBottom:'30px'}}><label style={css.label}>摘要</label><input value={form.excerpt} onChange={e => setForm({...form, excerpt: e.target.value})} /></div>

            {/* 素材转换工具 */}
            <div style={{background:'#18181c', padding:'20px', borderRadius:'12px', border:'1px solid #333', marginBottom:'30px'}}>
              <div style={{display:'flex', gap:'10px', marginBottom:'15px'}}><button onClick={() => window.open(LSKY_URL)} className="toolbar-btn" style={{flex:1}}>🖼️ 打开图床</button><button onClick={() => window.open(CLOUDREVE_URL)} className="toolbar-btn" style={{flex:1}}>🎬 打开网盘</button></div>
              <textarea style={{height:'60px', fontSize:'12px', background:'#121212', border:'1px solid #444'}} placeholder="在此粘贴一个或多个直链..." value={rawLinks} onChange={e=>setRawLinks(e.target.value)} />
              <button onClick={convertLinks} style={{width:'100%', padding:'10px', background:'#333', color:'#fff', border:'none', borderRadius:'6px', cursor:'pointer', marginTop:'10px', fontWeight:'bold'}}>转换 Markdown</button>
              {mdLinks && <div style={{marginTop:'15px'}}><pre style={{background:'#000', padding:'10px', color:'#007aff', fontSize:'11px', whiteSpace:'pre-wrap'}}>{mdLinks}</pre><button onClick={()=>{navigator.clipboard.writeText(mdLinks); alert('已复制')}} style={{width:'100%', padding:'8px', background:'#007aff', color:'#fff', border:'none', borderRadius:'6px', cursor:'pointer', marginTop:'5px'}}>点击复制全部</button></div>}
            </div>

            {/* 编辑工具栏 */}
            <div style={{background:'#202024', padding:'10px', border:'1px solid #333', borderBottom:'none', borderRadius:'12px 12px 0 0', display:'flex', gap:'10px'}}>
                <button className="toolbar-btn" onClick={()=>insertText('# ', '')}>H1</button>
                <button className="toolbar-btn" onClick={()=>insertText('**', '**')}>B</button>
                <button className="toolbar-btn" onClick={()=>insertText('[', '](url)')}>Link</button>
            </div>
            <textarea ref={textAreaRef} style={{height:'500px', borderRadius:'0 0 12px 12px', fontSize:'16px', lineHeight:'1.6'}} value={form.content} onChange={e => setForm({...form, content: e.target.value})} placeholder="开始创作..." />

            <button onClick={() => {
              setLoading(true);
              fetch('/api/post', { method: 'POST', body: JSON.stringify({ ...form, id: currentId }) }).then(() => { setView('list'); fetchPosts(); })
            }} disabled={loading || !isFormValid} style={{width:'100%', padding:'20px', background: !isFormValid ? '#333' : '#fff', color:'#000', border:'none', borderRadius:'12px', fontWeight:'bold', fontSize:'16px', marginTop:'40px', cursor: isFormValid ? 'pointer' : 'not-allowed', opacity: isFormValid ? 1 : 0.5}}>
                {loading ? '🚀 正在同步至 Notion...' : '💾 确认保存并发布'}
            </button>
          </main>
        )}
      </div>
    </div>
  );
}

const css = {
  label: { display: 'block', fontSize: '10px', color: '#666', marginBottom: '10px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1.5px' },
};
