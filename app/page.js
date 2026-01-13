'use client';
import React, { useState, useEffect, useRef } from 'react';

// 图标库集成
const Icons = {
  Search: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>,
  CoverMode: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>,
  TextMode: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>,
  GridMode: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>,
  FolderMode: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>,
  FolderIcon: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="#ffffff" style={{opacity:0.8}}><path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"></path></svg>,
  Edit: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4L18.5 2.5z"></path></svg>,
  Trash: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
};

// 🟢 预览渲染引擎组件
const NotionPreview = ({ blocks }) => {
  if (!blocks || !blocks.length) return <p style={{color:'#666'}}>暂无内容预览</p>;
  return (
    <div style={{color: '#e1e1e3', padding: '10px 0'}}>
      {blocks.map((block, idx) => {
        const { type } = block;
        const data = block[type];
        const text = data?.rich_text?.[0]?.plain_text || "";

        switch(type) {
          case 'heading_1': return <h1 key={idx} style={{fontSize:'2em', borderBottom:'1px solid #333', paddingBottom:'0.3em', margin:'1em 0 0.5em'}}>{text}</h1>;
          case 'paragraph': return <p key={idx} style={{margin:'0.8em 0', minHeight:'1em'}}>{text}</p>;
          case 'divider': return <hr key={idx} style={{border:'none', borderBottom:'1px solid #333', margin:'1.5em 0'}} />;
          case 'image': return <img key={idx} src={data.external?.url || data.file?.url} style={{width:'100%', borderRadius:'8px', margin:'1em 0'}} alt="" />;
          case 'callout': 
            const isLock = text.includes('LOCK:');
            return (
              <div key={idx} style={{background: '#2d2d30', padding: '16px', borderRadius: '8px', border: '1px solid #3e3e42', display: 'flex', gap: '12px', margin: '1em 0'}}>
                <div style={{fontSize:'1.2em'}}>{block.callout.icon?.emoji || '💡'}</div>
                <div style={{flex:1}}>
                  <div style={{fontWeight:'bold', color: isLock ? '#007aff' : 'inherit'}}>{text}</div>
                  {/* 如果有子块（分割线和内容），这里简单示意 */}
                  <div style={{opacity:0.6, fontSize:'0.9em', marginTop:'8px'}}>[ 此处包含加密保护内容 ]</div>
                </div>
              </div>
            );
          default: return null;
        }
      })}
    </div>
  );
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
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [showAllTags, setShowAllTags] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState(null);

  // 🟢 预览状态
  const [previewPost, setPreviewPost] = useState(null);

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
      body { background-color: #18181c; color: #e1e1e3; margin: 0; font-family: system-ui, sans-serif; overflow-x: hidden; }
      .card-container { position: relative; display: flex; align-items: stretch; background: #202024; margin-bottom: 12px; border-radius: 12px; overflow: hidden; cursor: pointer; transition: 0.3s; border: 1px solid #2d2d30; }
      .card-container:hover { border-color: #007aff; transform: translateY(-2px); }
      .drawer-zone { position: absolute; right: -160px; top: 0; bottom: 0; width: 160px; display: flex; transition: 0.3s cubic-bezier(0.4, 0, 0.2, 1); z-index: 10; }
      .card-container:hover .drawer-zone { right: 0; }
      .drawer-btn { flex: 1; display: flex; align-items: center; justify-content: center; color: #fff; transition: 0.2s; }
      .edit-btn { background: #007aff; }
      .edit-btn:hover { background: #008aff; }
      .del-btn { background: #ff4d4f; }
      .del-btn:hover { background: #ff7875; }
      
      /* 🟢 预览弹窗样式 */
      .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.85); display: flex; align-items: center; justify-content: center; z-index: 1000; animation: fadeIn 0.2s; backdrop-filter: blur(4px); }
      .modal-content { background: #202024; width: 90%; maxWidth: 700px; height: 85vh; border-radius: 16px; border: 1px solid #333; display: flex; flex-direction: column; overflow: hidden; }
      .modal-header { padding: 20px 25px; border-bottom: 1px solid #333; display: flex; justify-content: space-between; align-items: center; }
      .modal-body { flex: 1; overflow-y: auto; padding: 25px; }

      .card-text { background: #202024; border-bottom: 1px solid #2d2d30; padding: 16px 20px; cursor: pointer; transition: 0.2s; display: flex; align-items: center; position: relative; overflow: hidden; }
      .card-text:hover { background: #2a2a2e; }
      .card-text:hover .drawer-zone { right: 0; }

      .tag-chip { background: #2d2d32; padding: 4px 10px; border-radius: 4px; font-size: 11px; color: #888; margin: 0 5px 5px 0; cursor: pointer; }
      .btn-interactive:active { transform: scale(0.95); }
      .search-bar { width: 100%; padding: 14px; background: #202024; border: 1px solid #333; border-radius: 12px; color: #fff; margin-bottom: 20px; outline: none; }
      .icon-btn { background: #202024; border: 1px solid #333; color: #666; cursor: pointer; border-radius: 8px; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; transition: 0.2s; }
      .icon-btn.active { color: #fff; border-color: #007aff; background: #007aff; }
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

  // 🟢 开启预览逻辑
  const handlePreview = (post) => {
    setLoading(true);
    fetch(`/api/post?id=${post.id}`).then(res => res.json()).then(data => {
      if (data.success) { setPreviewPost(data.data); }
    }).finally(() => setLoading(false));
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
    <div style={{ minHeight: '100vh', background: '#18181c', padding: '40px 20px' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
          <div style={{ fontSize: '24px', fontWeight: '900', letterSpacing: '1px' }}>PRO<span style={{ color: '#007aff' }}>BLOG</span></div>
          <div style={{ display: 'flex', gap: '10px' }}>
            {view === 'list' && (
              <>
                <button onClick={() => setIsSearchOpen(!isSearchOpen)} className={`icon-btn btn-interactive ${isSearchOpen ? 'active' : ''}`}><Icons.Search /></button>
                <button onClick={() => { setForm({ title: '', slug: 'p-' + Date.now().toString(36), excerpt: '', content: '', category: '', tags: '', cover: '', status: 'Published', type: activeTab, date: new Date().toISOString().split('T')[0] }); setCurrentId(null); setView('edit'); }} style={{ padding: '0 25px', background: '#007aff', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }} className="btn-interactive">发布新内容</button>
              </>
            )}
            {view === 'edit' && <button onClick={() => setView('list')} style={{ padding: '8px 25px', background: '#2d2d30', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }} className="btn-interactive">返回</button>}
          </div>
        </header>

        {view === 'list' ? (
          <main>
            <div style={{ display: 'flex', background: '#202024', padding: '5px', borderRadius: '12px', marginBottom: '25px', width: 'fit-content' }}>
              {['Post', 'Widget'].map(t => (
                <button key={t} onClick={() => { setActiveTab(t); setSearchQuery(''); }} style={{ padding: '10px 30px', border: 'none', background: activeTab === t ? '#2d2d32' : 'none', color: activeTab === t ? '#fff' : '#888', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}>{t === 'Post' ? '已发布' : '组件'}</button>
              ))}
            </div>

            {isSearchOpen && <input className="search-bar" placeholder="搜索标题或Slug..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginBottom: '15px' }}>
                <button onClick={() => setViewMode('covered')} className={`icon-btn ${viewMode === 'covered' ? 'active' : ''}`}><Icons.CoverMode /></button>
                <button onClick={() => setViewMode('text')} className={`icon-btn ${viewMode === 'text' ? 'active' : ''}`}><Icons.TextMode /></button>
                <button onClick={() => setViewMode('gallery')} className={`icon-btn ${viewMode === 'gallery' ? 'active' : ''}`}><Icons.GridMode /></button>
            </div>

            {loading && !previewPost && <p style={{textAlign:'center', color:'#666'}}>📡 正在载入...</p>}

            <div style={viewMode === 'gallery' ? {display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))', gap:'15px'} : {}}>
              {filteredPosts.map(p => (
                <div key={p.id} onClick={() => handlePreview(p)} className={viewMode === 'covered' ? "card-container" : viewMode === 'text' ? "card-text" : "card-gallery"}>
                  {viewMode === 'covered' && (
                    <>
                      <div style={{width:'160px', flexShrink:0, background:'#18181c', display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden'}}>
                        {p.cover ? <img src={p.cover} style={{width:'100%', height:'100%', objectFit:'cover'}} /> : <div style={{fontSize:'28px', color:'#333'}}>{activeTab[0]}</div>}
                      </div>
                      <div style={{padding: '20px 30px', flex:1}}>
                        <div style={{fontWeight:'bold', fontSize:'20px', color:'#fff', marginBottom:'8px'}}>{p.title}</div>
                        <div style={{color:'#ffffff', fontSize:'12px', opacity: 0.8}}>{p.category} · {p.date}</div>
                      </div>
                    </>
                  )}
                  {viewMode === 'text' && (
                    <div style={{flex:1, display:'flex', alignItems:'center'}}>
                      <div style={{flex:1, fontSize:'14px', fontWeight:'500', color:'#fff'}}>{p.title}</div>
                      <div style={{fontSize:'12px', color:'#666', marginRight:'20px'}}>{p.category}</div>
                      <div style={{fontSize:'12px', color:'#444'}}>{p.date}</div>
                    </div>
                  )}
                  {viewMode === 'gallery' && (
                    <>
                      <div style={{height:'140px', background:'#18181c', display:'flex', alignItems:'center', justifyContent:'center'}}>
                        {p.cover ? <img src={p.cover} style={{width:'100%', height:'100%', objectFit:'cover'}} /> : <div style={{fontSize:'40px', color:'#333'}}>{activeTab[0]}</div>}
                      </div>
                      <div style={{padding:'15px'}}><div style={{fontSize:'14px', fontWeight:'bold', marginBottom:'6px', color:'#fff'}}>{p.title}</div><div style={{fontSize:'11px', color:'#888'}}>{p.category}</div></div>
                    </>
                  )}
                  
                  {/* 🟢 双按钮侧滑抽屉 */}
                  <div className="drawer-zone">
                    <div onClick={(e) => { e.stopPropagation(); handleEdit(p); }} className="drawer-btn edit-btn"><Icons.Edit /></div>
                    <div onClick={(e) => { e.stopPropagation(); if(confirm('删除吗？')){fetch('/api/post?id='+p.id,{method:'DELETE'}).then(()=>fetchPosts())} }} className="drawer-btn del-btn"><Icons.Trash /></div>
                  </div>
                </div>
              ))}
            </div>
          </main>
        ) : (
          <main style={{ background: '#202024', padding: '30px', borderRadius: '20px', border: '1px solid #333' }}>
            <div style={{marginBottom:'20px'}}><label style={{display:'block', fontSize:'11px', color:'#fff', marginBottom:'10px', fontWeight:'bold'}}>标题 *</label><input value={form.title} onChange={e => setForm({...form, title: e.target.value})} /></div>
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'20px', marginBottom:'20px'}}>
                <div><label style={{display:'block', fontSize:'11px', color:'#fff', marginBottom:'10px', fontWeight:'bold'}}>分类 *</label><input list="cats" value={form.category} onChange={e => setForm({...form, category: e.target.value})} /><datalist id="cats">{options.categories.map(o => <option key={o} value={o} />)}</datalist></div>
                <div><label style={{display:'block', fontSize:'11px', color:'#fff', marginBottom:'10px', fontWeight:'bold'}}>日期 *</label><input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} /></div>
            </div>
            <div style={{marginBottom:'20px'}}><label style={{display:'block', fontSize:'11px', color:'#fff', marginBottom:'10px', fontWeight:'bold'}}>标签</label><input value={form.tags} onChange={e => setForm({...form, tags: e.target.value})} /></div>
            <div style={{marginBottom:'20px'}}><label style={{display:'block', fontSize:'11px', color:'#fff', marginBottom:'10px', fontWeight:'bold'}}>封面 URL</label><input value={form.cover} onChange={e => setForm({...form, cover: e.target.value})} /></div>
            <div style={{marginBottom:'30px'}}><label style={{display:'block', fontSize:'11px', color:'#fff', marginBottom:'10px', fontWeight:'bold'}}>摘要</label><input value={form.excerpt} onChange={e => setForm({...form, excerpt: e.target.value})} /></div>

            {/* 外链工具 */}
            <div style={{background:'#18181c', padding:'20px', borderRadius:'15px', marginBottom:'30px', border:'1px solid #333'}}>
              <button onClick={() => window.open("https://x1file.top/home")} style={{width:'100%', padding:'12px', background:'#333', color:'#fff', border:'none', borderRadius:'8px', cursor:'pointer', fontWeight:'bold', marginBottom:'15px'}}>🎬 打开网盘获取素材</button>
              <textarea style={{height:'80px', background:'#222'}} placeholder="粘贴直链转换..." value={rawLinks} onChange={e=>setRawLinks(e.target.value)} />
              <button onClick={()=>{const lines=rawLinks.split('\n'); const final=[]; for(let i=0; i<lines.length; i++){const m=lines[i].match(/https?:\/\/[^\s]+/); if(m) final.push(`![](${m[0]})`);} setMdLinks(final.join('\n'))}} style={{width:'100%', padding:'12px', background:'#007aff', color:'#fff', border:'none', borderRadius:'8px', cursor:'pointer', marginTop:'10px', fontWeight:'bold'}}>立即转换</button>
              {mdLinks && <button onClick={()=>{navigator.clipboard.writeText(mdLinks); alert('已复制')}} style={{width:'100%', padding:'12px', background:'#555', color:'#fff', border:'none', borderRadius:'8px', cursor:'pointer', marginTop:'10px'}}>复制全部结果</button>}
            </div>

            <div style={{background:'#18181c', padding:'10px', borderRadius:'8px 8px 0 0', display:'flex', gap:'10px', border:'1px solid #333', borderBottom:'none'}}>
                <button style={{background:'#333', color:'#fff', border:'1px solid #444', padding:'6px 12px', borderRadius:'4px'}} onClick={()=>insertText('# ', '')}>H1</button>
                <button style={{background:'#333', color:'#fff', border:'1px solid #444', padding:'6px 12px', borderRadius:'4px'}} onClick={()=>insertText('**', '**')}>B</button>
                <button style={{background:'#007aff', color:'#fff', border:'none', padding:'6px 12px', borderRadius:'4px'}} onClick={()=>insertText(':::lock 123\n', '\n:::')}>🔒 插入加密块</button>
            </div>
            <textarea ref={textAreaRef} style={{height:'500px', borderRadius:'0 0 10px 10px', background:'#18181c'}} value={form.content} onChange={e => setForm({...form, content: e.target.value})} placeholder="在这里写正文..." />

            <button onClick={() => { setLoading(true); fetch('/api/post', { method: 'POST', body: JSON.stringify({ ...form, id: currentId }) }).then(() => { setView('list'); fetchPosts(); }) }} disabled={loading || !isFormValid} style={{width:'100%', padding:'20px', background: !isFormValid ? '#222' : '#fff', color: !isFormValid ? '#666' : '#000', border:'none', borderRadius:'12px', fontWeight:'bold', fontSize:'16px', marginTop:'40px', cursor: isFormValid ? 'pointer' : 'not-allowed'}}>
                {loading ? '正在同步至全球边缘节点...' : '确认发布'}
            </button>
          </main>
        )}

        {/* 🟢 预览浮层组件 */}
        {previewPost && (
          <div className="modal-overlay" onClick={() => setPreviewPost(null)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <div style={{fontWeight:'900', fontSize:'18px'}}>预览: {previewPost.title}</div>
                <button onClick={() => setPreviewPost(null)} style={{background:'none', border:'none', color:'#666', fontSize:'24px', cursor:'pointer'}}>×</button>
              </div>
              <div className="modal-body">
                {previewPost.cover && <img src={previewPost.cover} style={{width:'100%', borderRadius:'12px', marginBottom:'20px'}} />}
                <div style={{fontSize:'12px', color:'#007aff', marginBottom:'10px'}}>{previewPost.category} · {previewPost.date}</div>
                <div style={{fontSize:'13px', color:'#888', marginBottom:'30px', paddingBottom:'20px', borderBottom:'1px solid #333'}}>{previewPost.excerpt}</div>
                <NotionPreview blocks={previewPost.rawBlocks} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
