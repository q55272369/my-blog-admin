'use client';
import React, { useState, useEffect, useRef } from 'react';

// --- 1. 图标库 ---
const Icons = {
  Search: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>,
  CoverMode: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>,
  TextMode: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>,
  GridMode: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>,
  FolderMode: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>,
  FolderIcon: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="#ffffff" style={{opacity:0.8}}><path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"></path></svg>,
  Edit: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4L18.5 2.5z"></path></svg>,
  Trash: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>,
  Tutorial: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>,
  ChevronDown: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
};

// --- 2. 辅助工具：提取文段中的纯直链 ---
const cleanUrl = (text) => {
  if (!text) return "";
  const match = text.match(/https?:\/\/[^\s)\]?]+/);
  return match ? match[0] : text;
};

// --- 3. 全局样式组件 ---
const GlobalStyle = () => (
  <style dangerouslySetInnerHTML={{__html: `
    body { background-color: #303030; color: #ffffff; margin: 0; font-family: system-ui, sans-serif; overflow-x: hidden; }
    .card-item { position: relative; background: #424242; border-radius: 12px; margin-bottom: 12px; border: 1px solid transparent; cursor: pointer; transition: 0.3s; overflow: hidden; display: flex !important; flex-direction: row !important; align-items: stretch; }
    .card-item:hover { border-color: greenyellow; transform: translateY(-2px); background: #4d4d4d; box-shadow: 0 0 10px rgba(173, 255, 47, 0.1); }
    .dr-btn { flex: 1; display: flex; align-items: center; justify-content: center; color: #fff; transition: 0.2s; }
    .modal-bg { position: fixed; inset: 0; background: rgba(0,0,0,0.85); display: flex; align-items: center; justify-content: center; z-index: 1000; backdrop-filter: blur(4px); }
    .modal-box { background: #202024; width: 90%; maxWidth: 900px; height: 90vh; border-radius: 24px; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 20px 50px rgba(0,0,0,0.5); }
    input, select, textarea { width: 100%; padding: 14px; background: #18181c; border: 1px solid #333; border-radius: 10px; color: #fff; box-sizing: border-box; font-size: 15px; outline: none; transition: 0.3s; }
    .glow-input:focus { border-color: greenyellow; box-shadow: 0 0 12px rgba(173, 255, 47, 0.3); background: #1f1f23; }
    .neo-btn { --bg: #000; --hover-bg: greenyellow; --hover-text: #000; color: #fff; cursor: pointer; border: 1px solid var(--bg); border-radius: 4px; padding: 0.8em 2em; background: var(--bg); transition: 0.2s; font-weight: bold; display: flex; align-items: center; justify-content: center; }
    .neo-btn:hover { color: var(--hover-text); transform: translate(-0.25rem, -0.25rem); background: var(--hover-bg); box-shadow: 0.25rem 0.25rem var(--bg); border-color: var(--hover-bg); }
    .nav-container { position: relative; background: #202024; border-radius: 50px; padding: 5px; display: flex; gap: 5px; border: 1px solid #333; }
    .nav-glider { position: absolute; top: 5px; bottom: 5px; background: greenyellow; border-radius: 40px; transition: 0.3s; z-index: 1; }
    .nav-item { position: relative; z-index: 2; width: 40px; height: 32px; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #888; }
    .nav-item.active { color: #000; }
    .block-card { background: #2a2a2e; border: 1px solid #333; border-radius: 10px; padding: 15px; margin-bottom: 10px; position: relative; transition: 0.2s; }
    .block-del { position: absolute; right: -40px; top: 0; bottom: 0; width: 40px; background: #ff4d4f; border-radius: 0 10px 10px 0; display: flex; align-items: center; justify-content: center; opacity: 0; transition: 0.2s; cursor: pointer; color: white; }
    .block-card:hover .block-del { opacity: 1; right: 0; }
    .acc-btn { width: 100%; background: #424242; padding: 15px 20px; border-radius: 10px; display: flex; justify-content: space-between; align-items: center; cursor: pointer; border: 1px solid #555; color: #fff; margin-bottom: 10px; transition: 0.2s; }
    .acc-btn:hover { border-color: greenyellow; color: greenyellow; }
    .acc-content { overflow: hidden; transition: max-height 0.3s ease; max-height: 0; }
    .acc-content.open { max-height: 800px; padding-bottom: 20px; }
    .loader-overlay { position: fixed; inset: 0; background: rgba(20, 20, 23, 0.95); z-index: 9999; display: flex; align-items: center; justify-content: center; flex-direction: column; }
    .dash { animation: dashArray 2s ease-in-out infinite, dashOffset 2s linear infinite; }
    @keyframes dashArray { 0% { stroke-dasharray: 0 1 359 0; } 50% { stroke-dasharray: 0 359 1 0; } 100% { stroke-dasharray: 359 1 0 0; } }
    @keyframes dashOffset { 0% { stroke-dashoffset: 365; } 100% { stroke-dashoffset: 5; } }
    .group { display: flex; align-items: center; position: relative; max-width: 240px; }
    .input-search { font-family: inherit; width: 100%; height: 45px; padding-left: 2.5rem; border-radius: 12px; background-color: #16171d; border: 1px solid #2b2c37; color: #bdbecb; outline: none; transition: 0.2s; }
    .input-search:focus { border-color: greenyellow; }
    .search-icon-pos { position: absolute; left: 1rem; fill: #bdbecb; width: 1rem; height: 1rem; pointer-events: none; z-index: 5; }
    .animated-button { position: relative; display: flex; align-items: center; gap: 4px; padding: 12px 36px; border: 2px solid; border-color: transparent; font-size: 14px; background-color: inherit; border-radius: 100px; font-weight: 600; color: greenyellow; box-shadow: 0 0 0 2px greenyellow; cursor: pointer; overflow: hidden; transition: all 0.6s cubic-bezier(0.23, 1, 0.32, 1); }
    .animated-button .text { position: relative; z-index: 1; transform: translateX(-12px); transition: 0.8s; }
    .animated-button .circle { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 20px; height: 20px; background-color: greenyellow; border-radius: 50%; opacity: 0; transition: 0.8s; }
    .animated-button:hover { color: #212121; }
    .animated-button:hover .circle { width: 220px; height: 220px; opacity: 1; }
    .animated-button:hover .text { transform: translateX(12px); }
  `}} />
);
// 全屏加载
const FullScreenLoader = () => (
  <div className="loader-overlay">
    <div style={{display:'flex'}}><svg viewBox="0 0 200 60" width="200" height="60"><path className="dash" fill="none" stroke="greenyellow" strokeWidth="3" d="M20,50 L20,10 L50,10 C65,10 65,30 50,30 L20,30" /><path className="dash" fill="none" stroke="greenyellow" strokeWidth="3" d="M80,50 L80,10 L110,10 C125,10 125,30 110,30 L80,30 M100,30 L120,50" /><path className="dash" fill="none" stroke="greenyellow" strokeWidth="3" d="M140,30 A20,20 0 1,0 180,30 A20,20 0 1,0 140,30" /></svg></div>
    <div style={{marginTop:20, fontFamily:'monospace', color:'#666', fontSize:12, letterSpacing:2}}>SYSTEM PROCESSING</div>
  </div>
);

// 带动画的按钮 (发布/返回)
const AnimatedBtn = ({ text, onClick }) => (
  <button className="animated-button" onClick={onClick}>
    <span className="text">{text}</span>
    <span className="circle"></span>
  </button>
);

// 滑块导航组件
const SlidingNav = ({ activeIdx, onSelect }) => {
  const icons = [Icons.FolderMode, Icons.CoverMode, Icons.TextMode, Icons.GridMode];
  return (
    <div className="nav-container">
      <div className="nav-glider" style={{ left: `${activeIdx * 45 + 5}px`, width: 40 }} />
      {icons.map((Icon, i) => (
        <div key={i} className={`nav-item ${activeIdx === i ? 'active' : ''}`} onClick={() => onSelect(i)}><Icon /></div>
      ))}
    </div>
  );
};

// 🟢 块编辑器：核心逻辑（使用稳定 ID 作为 Key，杜绝失焦）
const BlockBuilder = ({ blocks, setBlocks }) => {
  const addBlock = (type) => setBlocks([...blocks, { id: Math.random().toString(36).substr(2, 9), type, content: '', pwd: '123' }]);
  const updateBlock = (id, val, key='content') => {
    // 自动清洗输入内容中的 URL
    let finalVal = val;
    if (key === 'content' && val.includes('http')) {
        finalVal = val.split('\n').map(line => cleanUrl(line)).join('\n');
    }
    setBlocks(blocks.map(b => b.id === id ? { ...b, [key]: finalVal } : b)); 
  };

  return (
    <div style={{marginTop:30}}>
      <div style={{display:'flex', gap:15, marginBottom:25, justifyContent:'center'}}>
        <div className="neo-btn" onClick={()=>addBlock('h1')}>H1 标题</div>
        <div className="neo-btn" onClick={()=>addBlock('text')}>📝 内容块</div>
        <div className="neo-btn" onClick={()=>addBlock('lock')}>🔒 加密块</div>
      </div>
      <div style={{display:'flex', flexDirection:'column', gap:10}}>
        {blocks.map((b) => (
          <div key={b.id} className="block-card">
            <div style={{fontSize:10, color:'greenyellow', marginBottom:5, fontWeight:'bold'}}>{b.type.toUpperCase()} BLOCK</div>
            {b.type === 'h1' && <input className="glow-input" placeholder="输入大标题..." value={b.content} onChange={e=>updateBlock(b.id, e.target.value)} style={{fontSize:20, fontWeight:'bold'}} />}
            {b.type === 'text' && <textarea className="glow-input" placeholder="直接粘贴多行链接将自动转换预览..." value={b.content} onChange={e=>updateBlock(b.id, e.target.value)} style={{minHeight:80}} />}
            {b.type === 'lock' && (
               <div style={{background:'#202024', padding:10, borderRadius:8}}>
                 <div style={{display:'flex', gap:10, marginBottom:10}}><span>🔑</span><input className="glow-input" placeholder="密码" value={b.pwd} onChange={e=>updateBlock(b.id, e.target.value, 'pwd')} style={{width:100}} /></div>
                 <textarea className="glow-input" placeholder="输入加密内容..." value={b.content} onChange={e=>updateBlock(b.id, e.target.value)} style={{minHeight:80, border:'1px dashed #555'}} />
               </div>
            )}
            <div className="block-del" onClick={() => setBlocks(blocks.filter(x => x.id !== b.id))}><Icons.Trash /></div>
          </div>
        ))}
        {blocks.length === 0 && <div style={{textAlign:'center', color:'#666', padding:'40px', border:'2px dashed #444', borderRadius:12}}>👋 暂无内容，请点击上方按钮开始</div>}
      </div>
    </div>
  );
};

// 🟢 NotionView 预览组件
const NotionView = ({ blocks }) => (
  <div style={{color:'#e1e1e3', fontSize:15, lineHeight:'1.8'}}>
    {blocks?.map((b, i) => {
      const type = b.type; const data = b[type]; const text = data?.rich_text?.[0]?.plain_text || "";
      if(type==='heading_1') return <h1 key={i} style={{fontSize:'1.8em', borderBottom:'1px solid #333', paddingBottom:8, margin:'24px 0 12px'}}>{text}</h1>;
      if(type==='paragraph') return <p key={i} style={{margin:'10px 0', minHeight:'1em'}}>{text}</p>;
      if(type==='divider') return <hr key={i} style={{border:'none', borderTop:'1px solid #444', margin:'24px 0'}} />;
      if(type==='image' || type==='video') { 
        const url = data?.file?.url || data?.external?.url; if (!url) return null;
        return <div key={i} style={{display:'flex', justifyContent:'center', margin:'20px 0'}}><div style={{width:'100%', height:'500px', background:'#000', borderRadius:8, display:'flex', justifyContent:'center', alignItems:'center', overflow:'hidden'}}>{type==='video' ? <video src={url} controls style={{maxWidth:'100%', maxHeight:'100%'}} /> : <img src={url} style={{maxWidth:'100%', maxHeight:'100%', objectFit:'contain'}} />}</div></div>;
      }
      if(type==='callout') return <div key={i} style={{background:'#2d2d30', padding:20, borderRadius:12, border:'1px solid #3e3e42', display:'flex', gap:15, margin:'20px 0'}}><div style={{fontSize:'1.4em'}}>{b.callout.icon?.emoji || '🔒'}</div><div style={{flex:1}}><div style={{fontWeight:'bold', color:'greenyellow', marginBottom:4}}>{text}</div><div style={{fontSize:12, opacity:0.5}}>[ 加密内容已受保护 ]</div></div></div>;
      return null;
    })}
  </div>
);
export default function Home() {
  const [mounted, setMounted] = useState(false), [view, setView] = useState('list'), [viewMode, setViewMode] = useState('covered'), [posts, setPosts] = useState([]), [options, setOptions] = useState({ categories: [], tags: [] }), [loading, setLoading] = useState(false), [activeTab, setActiveTab] = useState('Post'), [searchQuery, setSearchQuery] = useState(''), [selectedFolder, setSelectedFolder] = useState(null), [previewData, setPreviewData] = useState(null);
  const [form, setForm] = useState({ title: '', category: '', tags: '', cover: '', date: '', content: '' }), [currentId, setCurrentId] = useState(null), [navIdx, setNavIdx] = useState(0), [expandedStep, setExpandedStep] = useState(1), [editorBlocks, setEditorBlocks] = useState([]);

  useEffect(() => { setMounted(true); fetchPosts(); }, []);
  async function fetchPosts() { setLoading(true); try { const r = await fetch('/api/posts'); const d = await r.json(); if (d.success) { setPosts(d.posts); setOptions(d.options); } } finally { setLoading(false); } }

  // 🟢 智能转换：保存时将 Blocks 转回 Markdown 并自动处理链接
  useEffect(() => {
    if (view !== 'edit') return;
    const content = editorBlocks.map(b => {
      let c = b.content || '';
      // 如果某行是 http 开头且不带 Markdown 格式，自动套上语法
      c = c.split('\n').map(l => {
          const t = l.trim();
          if (t.startsWith('http') && !t.includes('![')) return `![](${t})`;
          return l;
      }).join('\n');
      if (b.type==='h1') return `# ${c}`;
      if (b.type==='lock') return `:::lock ${b.pwd}\n${c}\n:::`;
      return c;
    }).join('\n');
    setForm(f => ({ ...f, content }));
  }, [editorBlocks, view]);

  // 🟢 智能解析：加载时将 Markdown 剥离还原为纯链接
  const parseContentToBlocks = (md) => {
    if(!md) return []; const lines = md.split(/\r?\n/), res = []; let curText = [], isL = false, lP = '', lB = [];
    const strip = (s) => { const m = s.match(/^!\[.*\]\((.*)\)$/); return m ? m[1] : s; };
    const flush = () => { if(curText.length > 0) { res.push({ id: Math.random().toString(36).substr(2, 9), type: 'text', content: curText.map(strip).join('\n') }); curText = []; } };
    for(let l of lines) {
      const t = l.trim();
      if(t.startsWith(':::lock')) { flush(); isL = true; lP = t.replace(':::lock','').trim(); lB = []; continue; }
      if(isL && t === ':::') { res.push({ id: Math.random().toString(36).substr(2, 9), type: 'lock', pwd: lP, content: lB.map(strip).join('\n') }); isL = false; continue; }
      if(isL) { lB.push(l); continue; }
      if(t.startsWith('# ')) { flush(); res.push({ id: Math.random().toString(36).substr(2, 9), type: 'h1', content: t.replace('# ','') }); continue; }
      curText.push(l);
    }
    flush(); return res;
  };

  const handlePreview = (p) => { setLoading(true); fetch('/api/post?id='+p.id).then(r=>r.json()).then(d=>{ if(d.success) setPreviewData(d.data); }).finally(()=>setLoading(false)); };
  const handleEdit = (p) => { setLoading(true); fetch('/api/post?id='+p.id).then(r=>r.json()).then(d=>{ if (d.success) { setForm(d.data); setEditorBlocks(parseContentToBlocks(d.data.content)); setCurrentId(p.id); setView('edit'); setExpandedStep(1); } }).finally(()=>setLoading(false)); };
return (
    <div style={{ minHeight: '100vh', background: '#303030', padding: '40px 20px' }}>
      <GlobalStyle />
      {loading && <FullScreenLoader />}
      
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        {/* --- 顶部 Header：左侧搜索，右侧教程+发布 --- */}
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 }}>
           <div className="group">
             {view==='list' && (
               <>
                 <svg className="search-icon-pos" viewBox="0 0 24 24"><path d="M21.53 20.47l-3.66-3.66C19.195 15.24 20 13.214 20 11c0-4.97-4.03-9-9-9s-9 4.03-9 9 4.03 9 9 9c2.215 0 4.24-.804 5.808-2.13l3.66 3.66c.147.146.34.22.53.22s.385-.073.53-.22c.295-.293.295-.767.002-1.06zM3.5 11c0-4.135 3.365-7.5 7.5-7.5s7.5 3.365 7.5 7.5-3.365 7.5-7.5 7.5-7.5-3.365-7.5-7.5z"></path></svg>
                 <input placeholder="Search content..." type="search" className="input-search" value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} />
               </>
             )}
           </div>
           <div style={{ display: 'flex', gap: 15, alignItems: 'center' }}>
             <button onClick={() => window.open('https://pan.cloudreve.org/s/xxx')} style={{background:'#a855f7', border:'none', padding:'10px 20px', borderRadius:8, color:'#fff', fontWeight:'bold', fontSize:14, cursor:'pointer'}} className="btn-ia"><Icons.Tutorial /> 教程</button>
             {view === 'list' ? <AnimatedBtn text="发布新内容" onClick={() => { setForm({ title:'', category:'', tags:'', cover:'', date:new Date().toISOString().split('T')[0], content:'' }); setEditorBlocks([]); setCurrentId(null); setView('edit'); }} /> : <AnimatedBtn text="返回列表" onClick={() => setView('list')} />}
           </div>
        </header>

        {view === 'list' ? (
          <main>
            {/* --- 工具栏：左侧类型切换，右侧视图滑块 --- */}
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
               <div style={{background:'#424242', padding:5, borderRadius:12, display:'flex'}}>{['Post', 'Widget'].map(t => <button key={t} onClick={() => { setActiveTab(t); setNavIdx(0); setViewMode('folder'); }} style={activeTab === t ? {padding:'8px 20px', border:'none', background:'#555', color:'#fff', borderRadius:10, fontWeight:'bold', cursor:'pointer'} : {padding:'8px 20px', border:'none', background:'none', color:'#888', borderRadius:10, cursor:'pointer'}}>{t==='Post'?'已发布':'组件'}</button>)}</div>
               <SlidingNav activeIdx={navIdx} onSelect={(i) => { setNavIdx(i); setViewMode(['folder','covered','text','gallery'][i]); setSelectedFolder(null); }} />
            </div>

            <div style={viewMode === 'gallery' || viewMode === 'folder' ? {display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))', gap:15} : {}}>
              {viewMode === 'folder' && options.categories.map(cat => <div key={cat} onClick={()=>{setSelectedFolder(cat); setNavIdx(1); setViewMode('covered');}} style={{padding:15, background:'#424242', borderRadius:10, display:'flex', alignItems:'center', gap:12, border:'1px solid #555', cursor:'pointer'}} className="btn-ia"><Icons.FolderIcon />{cat}</div>)}
              {viewMode !== 'folder' && posts.filter(p => p.type === activeTab && p.title.toLowerCase().includes(searchQuery.toLowerCase()) && (selectedFolder ? p.category === selectedFolder : true)).map(p => (
                <div key={p.id} onClick={() => handlePreview(p)} className="card-item" style={viewMode==='text'?{display:'flex', alignItems:'center', padding:'16px 20px', borderRadius:12, background:'#424242', marginBottom:8}:{display:'flex', flexDirection:viewMode==='covered'?'row':'column', background:'#424242', borderRadius:12, marginBottom:12}}>
                   {viewMode !== 'text' && <div style={{width:viewMode==='covered'?'160px':'100%', height:viewMode==='covered'?'auto':'140px', background:'#303030', display:'flex', alignItems:'center', justifyContent:'center'}}>{p.cover ? <img src={p.cover} style={{width:'100%', height:'100%', objectFit:'cover'}} /> : <div style={{fontSize:28, color:'#444'}}>{activeTab[0]}</div>}</div>}
                   <div style={{padding:viewMode==='covered'?'20px 35px':'15px', flex:1}}><div style={{fontWeight:'bold', fontSize:viewMode==='text'?14:20, color:'#fff', marginBottom:viewMode==='text'?0:8}}>{p.title}</div>{viewMode!=='text' && <div style={{color:'#fff', fontSize:12, opacity:0.8}}>{p.category} · {p.date}</div>}</div>
                   <div className="drawer"><div onClick={(e) => { e.stopPropagation(); handleEdit(p); }} style={{background:'greenyellow', color:'#000'}} className="dr-btn"><Icons.Edit /></div><div onClick={(e) => { e.stopPropagation(); if(confirm('彻底删除？')){setLoading(true); fetch('/api/post?id='+p.id,{method:'DELETE'}).then(()=>fetchPosts())}}} style={{background:'#ff4d4f'}} className="dr-btn"><Icons.Trash /></div></div>
                </div>
              ))}
            </div>
          </main>
        ) : (
          <main style={{background:'#424242', padding:30, borderRadius:20, border:'1px solid #555'}}>
            <StepAccordion step={1} title="基础信息 (必填)" isOpen={expandedStep === 1} onToggle={()=>setExpandedStep(expandedStep===1?0:1)}>
               <div style={{marginBottom:15}}><label style={{display:'block', fontSize:11, color:'#bbb', marginBottom:5}}>文章标题 <span style={{color:'#ff4d4f'}}>*</span></label><input className="glow-input" value={form.title} onChange={e=>setForm({...form, title:e.target.value})} placeholder="输入标题..." /></div>
            </StepAccordion>
            <StepAccordion step={2} title="分类与时间 (必填)" isOpen={expandedStep === 2} onToggle={()=>setExpandedStep(expandedStep===2?0:2)}>
               <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:20}}>
                 <div><label style={{display:'block', fontSize:11, color:'#bbb', marginBottom:5}}>分类 <span style={{color:'#ff4d4f'}}>*</span></label><input className="glow-input" list="cats" value={form.category} onChange={e=>setForm({...form, category:e.target.value})} /><datalist id="cats">{options.categories.map(o=><option key={o} value={o}/>)}</datalist></div>
                 <div><label style={{display:'block', fontSize:11, color:'#bbb', marginBottom:5}}>发布日期 <span style={{color:'#ff4d4f'}}>*</span></label><input className="glow-input" type="date" value={form.date} onChange={e=>setForm({...form, date:e.target.value})} /></div>
               </div>
            </StepAccordion>
            <StepAccordion step={3} title="元数据与封面" isOpen={expandedStep === 3} onToggle={()=>setExpandedStep(expandedStep===3?0:3)}>
               <div style={{marginBottom:15}}><label style={{display:'block', fontSize:11, color:'#bbb', marginBottom:5}}>标签</label><input className="glow-input" value={form.tags} onChange={e=>setForm({...form, tags:e.target.value})} placeholder="Tag1, Tag2..." /></div>
               <div style={{marginBottom:15}}><label style={{display:'block', fontSize:11, color:'#bbb', marginBottom:5}}>封面图 URL (支持自动清洗)</label><input className="glow-input" value={form.cover} onChange={e=>setForm({...form, cover:cleanUrl(e.target.value)})} placeholder="粘贴链接或长文段..." /></div>
            </StepAccordion>
            <StepAccordion step={4} title="素材获取" isOpen={expandedStep === 4} onToggle={()=>setExpandedStep(expandedStep===4?0:4)}>
               <div style={{padding:20, background:'#333', borderRadius:12, textAlign:'center'}}><div className="neo-btn" style={{width:'100%', height:60}} onClick={()=>window.open("https://x1file.top/home")}>🎬 前往网盘获取素材直链</div></div>
            </StepAccordion>
            <BlockBuilder blocks={editorBlocks} setBlocks={setEditorBlocks} />
            <button onClick={()=>{setLoading(true); fetch('/api/post',{method:'POST', body:JSON.stringify({...form, id:currentId, type:activeTab})}).then(()=>{setView('list'); fetchPosts();})}} disabled={!form.title||!form.category} style={{width:'100%', padding:20, background:(form.title&&form.category)?'#fff':'#222', color:(form.title&&form.category)?'#000':'#666', border:'none', borderRadius:12, fontWeight:'bold', fontSize:16, marginTop:40, cursor:'pointer'}}>
               {currentId ? '保存修改' : '确认发布'}
            </button>
          </main>
        )}
        
        {previewData && (
          <div className="modal-bg" onClick={()=>setPreviewData(null)}>
            <div className="modal-box" onClick={e=>e.stopPropagation()}>
              <div style={{padding:'20px 25px', borderBottom:'1px solid #333', display:'flex', justifyContent:'space-between', alignItems:'center'}}><strong>预览: {previewData.title}</strong><button onClick={()=>setPreviewData(null)} style={{background:'none', border:'none', color:'#666', fontSize:24, cursor:'pointer'}}>×</button></div>
              <div className="modal-body"><NotionView blocks={previewData.rawBlocks} /></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
