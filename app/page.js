'use client';
import React, { useState, useEffect, useRef } from 'react';

// 🟢 纯净 SVG 图标组件
const Icons = {
  Search: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>,
  CoverMode: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>,
  TextMode: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>,
  GridMode: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
};

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [view, setView] = useState('list');
  const [viewMode, setViewMode] = useState('covered');
  const [posts, setPosts] = useState([]);
  const [options, setOptions] = useState({ categories: [], tags: [] });
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('Post');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false); // 🟢 搜索栏展开状态
  const [showAllTags, setShowAllTags] = useState(false);

  const [form, setForm] = useState({ title: '', slug: '', excerpt: '', content: '', category: '', tags: '', cover: '', status: 'Published', type: 'Post', date: '' });
  const [currentId, setCurrentId] = useState(null);
  const [rawLinks, setRawLinks] = useState('');
  const [mdLinks, setMdLinks] = useState('');

  const textAreaRef = useRef(null);
  const isFormValid = form.title.trim() !== '' && form.category.trim() !== '' && form.date !== '';

  useEffect(() => {
    setMounted(true); fetchPosts();
    const style = document.head.appendChild(document.createElement('style'));
    style.innerHTML = `
      body { background-color: #303030; color: #ffffff; margin: 0; font-family: "Inter", system-ui, sans-serif; }
      .card-covered { background: #424242; border-radius: 12px; margin-bottom: 12px; cursor: pointer; transition: 0.2s; position: relative; overflow: hidden; display: flex; align-items: stretch; min-height: 100px; border: 1px solid transparent; }
      .card-covered:hover { background: #4d4d4d; border-color: #555; transform: translateY(-2px); }
      
      .card-text { background: #424242; border-bottom: 1px solid #333; padding: 14px 20px; cursor: pointer; transition: 0.1s; display: flex; align-items: center; }
      .card-text:hover { background: #4d4d4d; }
      
      .card-gallery { background: #424242; border-radius: 12px; overflow: hidden; cursor: pointer; transition: 0.2s; display: flex; flex-direction: column; border: 1px solid transparent; }
      .card-gallery:hover { border-color: #007aff; transform: translateY(-4px); }

      .delete-btn { position: absolute; right: -80px; top: 0; bottom: 0; width: 80px; background: #ff4d4f; color: #fff; display: flex; align-items: center; justify-content: center; transition: 0.3s; font-weight: bold; z-index: 10; }
      .card-covered:hover .delete-btn, .card-text:hover .delete-btn { right: 0; }
      
      .tag-chip { background: #333; padding: 4px 10px; border-radius: 4px; font-size: 11px; color: #bbb; margin: 0 5px 5px 0; cursor: pointer; position: relative; display: inline-flex; align-items: center; }
      .tag-chip:hover { color: #fff; background: #555; }
      .tag-del { position: absolute; top: -5px; right: -5px; background: #ff4d4f; color: white; border-radius: 50%; width: 14px; height: 14px; display: none; align-items: center; justify-content: center; font-size: 10px; border: 1px solid #303030; }
      .tag-chip:hover .tag-del { display: flex; }
      
      input, select, textarea { width: 100%; padding: 14px; background: #424242; border: 1px solid #555; border-radius: 10px; color: #fff; box-sizing: border-box; font-size: 14px; outline: none; }
      input:focus, textarea:focus { border-color: #007aff; }

      .icon-btn { background: #424242; border: 1px solid #555; color: #bbb; cursor: pointer; border-radius: 8px; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; transition: 0.2s; }
      .icon-btn:hover { color: #fff; border-color: #007aff; background: #4d4d4d; }
      .icon-btn.active { color: #fff; border-color: #007aff; background: #007aff; }
      .btn-click:active { transform: scale(0.95); }
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

  const deleteTagOption = async (e, tagName) => {
    e.stopPropagation(); if(!confirm(`移除标签 "${tagName}"？`)) return;
    setLoading(true);
    await fetch(`/api/tags?name=${encodeURIComponent(tagName)}`, { method: 'DELETE' });
    fetchPosts();
  };

  const insertText = (before, after = '') => {
    const el = textAreaRef.current; if (!el) return;
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
  const displayTags = showAllTags ? options.tags : options.tags.slice(0, 12);

  return (
    <div style={{ minHeight: '100vh', background: '#303030' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '30px 20px' }}>
        
        {/* 🟢 第一层：页头 Logo 与 全局操作 */}
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
          <div style={{ fontSize: '24px', fontWeight: '900', letterSpacing: '1px' }}>PRO<span style={{ color: '#007aff' }}>BLOG</span></div>
          <div style={{ display: 'flex', gap: '10px' }}>
            {view === 'list' && (
              <>
                <button onClick={() => setIsSearchOpen(!isSearchOpen)} className={`icon-btn btn-click ${isSearchOpen ? 'active' : ''}`}><Icons.Search /></button>
                <button onClick={() => { setForm({ title: '', slug: 'p-' + Date.now().toString(36), excerpt: '', content: '', category: '', tags: '', cover: '', status: 'Published', type: activeTab, date: new Date().toISOString().split('T')[0] }); setCurrentId(null); setView('edit'); }} style={{ padding: '0 25px', background: '#007aff', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }} className="btn-click">发布新内容</button>
              </>
            )}
            {view === 'edit' && <button onClick={() => setView('list')} style={{ padding: '8px 25px', background: '#424242', color: '#fff', border: '1px solid #555', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }} className="btn-click">返回</button>}
          </div>
        </header>

        {view === 'list' ? (
          <main>
            {/* 🟢 第二层：类型切换 */}
            <div style={{ display: 'flex', background: '#424242', padding: '5px', borderRadius: '12px', marginBottom: '25px', width: 'fit-content' }}>
              {['Post', 'Widget'].map(t => (
                <button key={t} onClick={() => { setActiveTab(t); setSearchQuery(''); }} style={{ padding: '10px 30px', border: 'none', background: activeTab === t ? '#555' : 'none', color: activeTab === t ? '#fff' : '#888', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}>{t === 'Post' ? '已发布' : '组件'}</button>
              ))}
            </div>

            {/* 🟢 搜索栏展开区 */}
            {isSearchOpen && (
              <div style={{ marginBottom: '20px', animation: 'fadeIn 0.3s' }}>
                <input style={{ background: '#424242', border: '1px solid #007aff' }} placeholder="搜索标题或Slug..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
              </div>
            )}

            {/* 🟢 第三层：视图工具栏 (紧靠内容区) */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginBottom: '12px', paddingRight: '4px' }}>
                <button onClick={() => setViewMode('covered')} className={`icon-btn btn-click ${viewMode === 'covered' ? 'active' : ''}`} style={{width:'34px', height:'34px'}}><Icons.CoverMode /></button>
                <button onClick={() => setViewMode('text')} className={`icon-btn btn-click ${viewMode === 'text' ? 'active' : ''}`} style={{width:'34px', height:'34px'}}><Icons.TextMode /></button>
                <button onClick={() => setViewMode('gallery')} className={`icon-btn btn-click ${viewMode === 'gallery' ? 'active' : ''}`} style={{width:'34px', height:'34px'}}><Icons.GridMode /></button>
            </div>

            {/* 🔵 内容展示区 */}
            <div style={viewMode === 'gallery' ? {display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))', gap:'15px'} : {}}>
              {loading && <div style={{textAlign:'center', padding:'40px', color:'#666'}}>载入中...</div>}
              {!loading && filteredPosts.map(p => (
                viewMode === 'covered' ? (
                  <div key={p.id} onClick={() => handleEdit(p)} className="card-covered">
                    <div style={{width:'140px', flexShrink:0, background:'#303030', overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center'}}>
                      {p.cover ? <img src={p.cover} style={{width:'100%', height:'100%', objectFit:'cover'}} alt="" /> : <div style={{fontSize:'24px', fontWeight:'900', color:'#444'}}>{activeTab.charAt(0)}</div>}
                    </div>
                    <div className="card-info">
                      <div style={{fontWeight:'bold', fontSize:'17px', color:'#fff', marginBottom:'6px'}}>{p.title}</div>
                      <div style={{color:'#888', fontSize:'12px'}}>{p.category} · {p.date}</div>
                    </div>
                    <div onClick={(e) => { e.stopPropagation(); if(confirm('彻底删除？')){fetch('/api/post?id='+p.id,{method:'DELETE'}).then(()=>fetchPosts())} }} className="delete-btn">删除</div>
                  </div>
                ) : viewMode === 'text' ? (
                  <div key={p.id} onClick={() => handleEdit(p)} className="card-text">
                    <div style={{flex:1, fontSize:'14px', fontWeight:'500'}}>{p.title}</div>
                    <div style={{fontSize:'12px', color:'#666', marginRight:'20px'}}>{p.category}</div>
                    <div style={{fontSize:'12px', color:'#555'}}>{p.date}</div>
                    <div onClick={(e) => { e.stopPropagation(); if(confirm('彻底删除？')){fetch('/api/post?id='+p.id,{method:'DELETE'}).then(()=>fetchPosts())} }} className="delete-btn" style={{height:'100%', width:'60px', right:'-60px'}}>×</div>
                  </div>
                ) : (
                  <div key={p.id} onClick={() => handleEdit(p)} className="card-gallery">
                    <div style={{height:'140px', background:'#303030', display:'flex', alignItems:'center', justifyContent:'center'}}>
                      {p.cover ? <img src={p.cover} style={{width:'100%', height:'100%', objectFit:'cover'}} alt="" /> : <div style={{fontSize:'40px', fontWeight:'900', color:'#424242'}}>{activeTab.charAt(0)}</div>}
                    </div>
                    <div style={{padding:'15px'}}>
                      <div style={{fontSize:'14px', fontWeight:'bold', marginBottom:'6px', color:'#fff', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{p.title}</div>
                      <div style={{fontSize:'11px', color:'#888'}}>{p.category}</div>
                    </div>
                  </div>
                )
              ))}
            </div>
          </main>
        ) : (
          <main style={{ background: '#424242', padding: '30px', borderRadius: '20px', border: '1px solid #555' }}>
            {/* 编辑表单逻辑完全继承自 v4.1 - v4.5 */}
            <div style={{marginBottom:'20px'}}><label style={css.label}>标题 <span className="required-star">*</span></label><input value={form.title} onChange={e => setForm({...form, title: e.target.value})} /></div>
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'20px', marginBottom:'20px'}}>
                <div><label style={css.label}>分类 <span className="required-star">*</span></label><input list="cats" value={form.category} onChange={e => setForm({...form, category: e.target.value})} /><datalist id="cats">{options.categories.map(o => <option key={o} value={o} />)}</datalist></div>
                <div><label style={css.label}>发布日期 <span className="required-star">*</span></label><input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} /></div>
            </div>
            <div style={{marginBottom:'20px'}}><label style={css.label}>标签</label><input value={form.tags} onChange={e => setForm({...form, tags: e.target.value})} /><div style={{marginTop:'10px', display:'flex', flexWrap:'wrap'}}>{displayTags.map(t => <span key={t} className="tag-chip" onClick={()=>{const cur=form.tags.split(',').filter(Boolean); if(!cur.includes(t)) setForm({...form, tags:[...cur,t].join(',')})}}>{t}<div className="tag-del" onClick={(e)=>deleteTagOption(e,t)}>×</div></span>)}{options.tags.length > 12 && <span onClick={()=>setShowAllTags(!showAllTags)} style={{fontSize:'12px', color:'#007aff', cursor:'pointer', fontWeight:'bold', marginLeft:'5px'}}>{showAllTags ? '收起' : `...`}</span>}</div></div>
            <div style={{marginBottom:'20px'}}><label style={css.label}>封面图 (Cover)</label><input value={form.cover} onChange={e => setForm({...form, cover: e.target.value})} /></div>
            <div style={{marginBottom:'30px'}}><label style={css.label}>摘要 (Excerpt)</label><input value={form.excerpt} onChange={e => setForm({...form, excerpt: e.target.value})} /></div>

            {/* 素材与转换 */}
            <div style={{background:'#303030', padding:'20px', borderRadius:'15px', marginBottom:'30px', border:'1px solid #555'}}>
              <div style={{display:'flex', gap:'10px', marginBottom:'15px'}}><button onClick={() => window.open("https://x1file.top/dashboard")} style={css.toolBtn}>🖼️ 打开图床</button><button onClick={() => window.open("https://x1file.top/home")} style={css.toolBtn}>🎬 打开网盘</button></div>
              <textarea style={{height:'60px', background:'#222'}} placeholder="粘贴直链..." value={rawLinks} onChange={e=>setRawLinks(e.target.value)} />
              <button onClick={()=>{const lines=rawLinks.split('\n'); const final=[]; for(let i=0; i<lines.length; i++){const m=lines[i].match(/https?:\/\/[^\s]+/); if(m) final.push(`![](${m[0]})`);} setMdLinks(final.join('\n'))}} style={{width:'100%', padding:'12px', background:'#007aff', color:'#fff', border:'none', borderRadius:'8px', cursor:'pointer', marginTop:'10px', fontWeight:'bold'}}>立即转换</button>
              {mdLinks && <button onClick={()=>{navigator.clipboard.writeText(mdLinks); alert('已复制')}} style={{width:'100%', padding:'10px', background:'#555', color:'#fff', border:'none', borderRadius:'8px', cursor:'pointer', marginTop:'10px'}}>复制全部结果</button>}
            </div>

            <div style={{background:'#303030', padding:'10px', borderRadius:'8px 8px 0 0', display:'flex', gap:'10px', border:'1px solid #555', borderBottom:'none'}}>
                <button style={css.toolBtn} onClick={()=>insertText('# ', '')}>H1</button>
                <button style={css.toolBtn} onClick={()=>insertText('**', '**')}>B</button>
                <button style={css.toolBtn} onClick={()=>insertText('[', '](url)')}>Link</button>
                <button style={{...css.toolBtn, background:'#007aff', borderColor:'#007aff'}} onClick={()=>insertText(':::lock 123\n', '\n:::')}>🔒 加密块</button>
            </div>
            <textarea ref={textAreaRef} style={{height:'500px', borderRadius:'0 0 10px 10px'}} value={form.content} onChange={e => setForm({...form, content: e.target.value})} />

            <button onClick={() => { setLoading(true); fetch('/api/post', { method: 'POST', body: JSON.stringify({ ...form, id: currentId }) }).then(() => { setView('list'); fetchPosts(); }) }} disabled={loading || !isFormValid} style={{width:'100%', padding:'20px', background: !isFormValid ? '#222' : '#fff', color: !isFormValid ? '#666' : '#000', border:'none', borderRadius:'12px', fontWeight:'bold', fontSize:'16px', marginTop:'40px', cursor: isFormValid ? 'pointer' : 'not-allowed'}}>
                {loading ? '正在同步至全球边缘节点...' : '确认发布'}
            </button>
          </main>
        )}
      </div>
    </div>
  );
}

const css = {
  label: { display: 'block', fontSize: '10px', color: '#888', marginBottom: '10px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1.5px' },
  toolBtn: { background: '#424242', color: '#fff', border: '1px solid #555', padding: '6px 15px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', flex: 1 },
};
