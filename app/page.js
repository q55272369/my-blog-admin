'use client';
import React, { useState, useEffect, useRef } from 'react';

// 100% 还原 4.9 线稿图标
const Icons = {
  Search: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>,
  CoverMode: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>,
  TextMode: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>,
  GridMode: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>,
  FolderMode: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>,
  FolderIcon: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="#ffffff" style={{opacity:0.8}}><path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"></path></svg>,
  Edit: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4L18.5 2.5z"></path></svg>,
  Trash: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
};

// 预览渲染器
const NotionContent = ({ blocks }) => {
  return (
    <div style={{color:'#e1e1e3', fontSize:'15px', lineHeight:'1.7'}}>
      {blocks.map((b, i) => {
        const data = b[b.type];
        const text = data?.rich_text?.[0]?.plain_text || "";
        switch(b.type) {
          case 'heading_1': return <h1 key={i} style={{fontSize:'1.8em', borderBottom:'1px solid #333', paddingBottom:'0.3em', margin:'1.2em 0 0.5em'}}>{text}</h1>;
          case 'paragraph': return <p key={i} style={{margin:'0.6em 0', minHeight:'1em'}}>{text}</p>;
          case 'divider': return <hr key={i} style={{border:'none', borderTop:'1px solid #444', margin:'1.5em 0'}} />;
          case 'image': return <img key={i} src={data.external?.url || data.file?.url} style={{width:'100%', borderRadius:'10px', margin:'1em 0'}} />;
          case 'callout': return (
            <div key={i} style={{background:'#2d2d30', padding:'16px 20px', borderRadius:'10px', border:'1px solid #3e3e42', display:'flex', gap:'12px', margin:'1em 0'}}>
                <div style={{fontSize:'1.3em'}}>{b.callout.icon?.emoji || '🔒'}</div>
                <div style={{flex:1}}><div style={{fontWeight:'bold', color:'#007aff', marginBottom:'4px'}}>{text}</div><div style={{fontSize:'12px', opacity:0.5}}>[ 内部加密内容 ]</div></div>
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
  const [previewData, setPreviewData] = useState(null);

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
      body { background-color: #303030; color: #ffffff; margin: 0; font-family: system-ui, sans-serif; overflow-x: hidden; }
      /* 🟢 锁死 4.9 布局比例 */
      .card-item { position: relative; background: #424242; border-radius: 12px; margin-bottom: 12px; border: 1px solid transparent; cursor: pointer; transition: 0.3s; overflow: hidden; display: flex !important; flex-direction: row !important; align-items: stretch; }
      .card-item:hover { border-color: #007aff; transform: translateY(-2px); background: #4d4d4d; }
      
      /* 🟢 修复抽屉：必须在卡片内 */
      .drawer-zone { position: absolute; right: -120px; top: 0; bottom: 0; width: 120px; display: flex; transition: 0.3s cubic-bezier(0.4, 0, 0.2, 1); z-index: 10; }
      .card-item:hover .drawer-zone { right: 0; }
      .dr-btn { flex: 1; display: flex; align-items: center; justify-content: center; color: #fff; transition: 0.2s; }
      .dr-edit { background: #007aff; } .dr-del { background: #ff4d4f; }

      /* 🟢 锁死预览窗比例（红绿框逻辑） */
      .modal-bg { position: fixed; inset: 0; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; z-index: 1000; backdrop-filter: blur(4px); }
      .modal-box { background: #202024; width: 90%; maxWidth: 750px; height: 80vh; border-radius: 20px; border: 1px solid #333; display: flex; flex-direction: column; overflow: hidden; }
      .modal-body { flex: 1; overflow-y: auto; padding: 40px 80px !important; }

      .tag-chip { background: #333; padding: 4px 10px; border-radius: 4px; font-size: 11px; color: #bbb; margin: 0 5px 5px 0; cursor: pointer; position: relative; }
      .tag-del { position: absolute; top: -5px; right: -5px; background: #ff4d4f; color: white; border-radius: 50%; width: 14px; height: 14px; display: none; align-items: center; justify-content: center; font-size: 10px; }
      .tag-chip:hover .tag-del { display: flex; }
      .btn-interactive:active { transform: scale(0.95); }
      .btn-interactive:hover { filter: brightness(1.2); }
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

  const handlePreview = (post) => {
    setLoading(true);
    fetch(`/api/post?id=${post.id}`).then(r => r.json()).then(d => { if(d.success) setPreviewData(d.data); }).finally(() => setLoading(false));
  };

  const handleEdit = (post) => {
    setLoading(true);
    fetch(`/api/post?id=${post.id}`).then(r => r.json()).then(d => {
      if (d.success) { setForm(d.data); setCurrentId(post.id); setView('edit'); }
    }).finally(() => setLoading(false));
  };

  if (!mounted) return null;

  const filteredPosts = posts.filter(p => (p.type === activeTab) && (p.title.toLowerCase().includes(searchQuery.toLowerCase()) || (p.slug || '').toLowerCase().includes(searchQuery.toLowerCase())) && (selectedFolder ? p.category === selectedFolder : true));
  const displayTags = showAllTags ? options.tags : options.tags.slice(0, 12);

  return (
    <div style={{ minHeight: '100vh', background: '#303030' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '30px 20px' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
          <div style={{ fontSize: '24px', fontWeight: '900', letterSpacing: '1px' }}>PRO<span style={{ color: '#007aff' }}>BLOG</span></div>
          <div style={{ display: 'flex', gap: '10px' }}>
            {view === 'list' && (
              <>
                <button onClick={() => setIsSearchOpen(!isSearchOpen)} style={{background:'#202024', border:'1px solid #555', color:'#666', width:'40px', borderRadius:'8px', cursor:'pointer'}} className="btn-interactive"><Icons.Search /></button>
                <button onClick={() => { setForm({ title: '', slug: 'p-' + Date.now().toString(36), excerpt: '', content: '', category: '', tags: '', cover: '', status: 'Published', type: activeTab, date: new Date().toISOString().split('T')[0] }); setCurrentId(null); setView('edit'); }} style={{ padding: '0 25px', background: '#007aff', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }} className="btn-interactive">发布新内容</button>
              </>
            )}
            {view === 'edit' && <button onClick={() => setView('list')} style={{ padding: '8px 25px', background: '#424242', color: '#fff', border: '1px solid #555', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>返回</button>}
          </div>
        </header>

        {view === 'list' ? (
          <main>
            <div style={{ display: 'flex', background: '#424242', padding: '5px', borderRadius: '12px', marginBottom: '25px', width: 'fit-content' }}>
              {['Post', 'Widget'].map(t => (
                <button key={t} onClick={() => { setActiveTab(t); setSearchQuery(''); setSelectedFolder(null); }} style={{ padding: '10px 30px', border: 'none', background: activeTab === t ? '#555' : 'none', color: activeTab === t ? '#fff' : '#888', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold' }}>{t === 'Post' ? '已发布' : '组件'}</button>
              ))}
            </div>

            {isSearchOpen && <input style={{ width:'100%', padding:'14px', background:'#424242', border:'1px solid #007aff', borderRadius:'12px', color:'#fff', marginBottom:'20px' }} placeholder="搜索条目..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginBottom: '15px' }}>
                <button onClick={() => {setViewMode('folder'); setSelectedFolder(null);}} style={{background: viewMode==='folder'?'#007aff':'#202024', border:'1px solid #333', color:'#fff', borderRadius:'8px', width:'34px', height:'34px', cursor:'pointer'}}><Icons.FolderMode /></button>
                <button onClick={() => setViewMode('covered')} style={{background: viewMode==='covered'?'#007aff':'#202024', border:'1px solid #333', color:'#fff', borderRadius:'8px', width:'34px', height:'34px', cursor:'pointer'}}><Icons.CoverMode /></button>
                <button onClick={() => setViewMode('text')} style={{background: viewMode==='text'?'#007aff':'#202024', border:'1px solid #333', color:'#fff', borderRadius:'8px', width:'34px', height:'34px', cursor:'pointer'}}><Icons.TextMode /></button>
                <button onClick={() => setViewMode('gallery')} style={{background: viewMode==='gallery'?'#007aff':'#202024', border:'1px solid #333', color:'#fff', borderRadius:'8px', width:'34px', height:'34px', cursor:'pointer'}}><Icons.GridMode /></button>
            </div>

            <div style={viewMode === 'gallery' || viewMode === 'folder' ? {display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))', gap:'15px'} : {}}>
              {viewMode === 'folder' && options.categories.map(cat => (
                <div key={cat} onClick={() => {setSelectedFolder(cat); setViewMode('covered');}} style={{padding:'15px', background:'#424242', borderRadius:'10px', display:'flex', alignItems:'center', gap:'12px', border:'1px solid #555'}} className="btn-interactive"><Icons.FolderIcon /><div style={{fontWeight:'bold', fontSize:'14px'}}>{cat}</div></div>
              ))}

              {viewMode !== 'folder' && filteredPosts.map(p => (
                <div key={p.id} onClick={() => handlePreview(p)} className="card-item" style={viewMode === 'text' ? {display:'flex', alignItems:'center', padding:'16px 20px', borderRadius:'0', borderBottom:'1px solid #333'} : viewMode === 'gallery' ? {display:'flex', flexDirection:'column', height:'auto'} : {}}>
                  {viewMode === 'covered' && (
                    <>
                      <div style={{width:'160px', flexShrink:0, background:'#303030', overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center'}}>
                        {p.cover ? <img src={p.cover} style={{width:'100%', height:'100%', objectFit:'cover'}} /> : <div style={{fontSize:'28px', color:'#444'}}>{activeTab[0]}</div>}
                      </div>
                      <div style={{padding: '20px 35px', flex:1, display:'flex', flexDirection:'column', justifyContent:'flex-start'}}>
                        <div style={
