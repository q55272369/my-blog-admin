'use client';
import React, { useState, useEffect, useRef } from 'react';

// 图标库 (保持不变)
const Icons = {
  Search: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>,
  CoverMode: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>,
  TextMode: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>,
  GridMode: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>,
  FolderMode: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>,
  FolderIcon: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="#ffffff" style={{opacity:0.8}}><path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"></path></svg>,
  Edit: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4L18.5 2.5z"></path></svg>,
  Trash: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>,
  Loader: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="spinning"><circle cx="12" cy="12" r="10" strokeOpacity="0.2"></circle><path d="M12 2a10 10 0 0 1 10 10" stroke="#007aff"></path></svg>
};

// 🔴 修复 1 & 3：NotionView 组件（优化图片比例，增强视频支持）
const NotionView = ({ blocks }) => (
  <div style={{color:'#e1e1e3', fontSize:'15px', lineHeight:'1.8'}}>
    {blocks?.map((b, i) => {
      const type = b.type;
      const data = b[type];
      // 处理文本内容，防止空指针
      const text = data?.rich_text?.[0]?.plain_text || "";
      
      if(type==='heading_1') return <h1 key={i} style={{fontSize:'1.8em', borderBottom:'1px solid #333', paddingBottom:'8px', margin:'24px 0 12px'}}>{text}</h1>;
      if(type==='paragraph') return <p key={i} style={{margin:'10px 0', minHeight:'1em'}}>{text}</p>;
      if(type==='divider') return <hr key={i} style={{border:'none', borderTop:'1px solid #444', margin:'24px 0'}} />;
      
      // 🖼️ 图片修复：限制最大高度，居中显示，不再强制撑满宽度
      if(type==='image') {
        const url = data?.file?.url || data?.external?.url;
        return (
          <div key={i} style={{display:'flex', justifyContent:'center', margin:'20px 0'}}>
             <img src={url} style={{maxWidth:'100%', maxHeight:'650px', borderRadius:'8px', objectFit:'contain', boxShadow:'0 8px 20px rgba(0,0,0,0.3)'}} alt="" />
          </div>
        );
      }

      // 🎬 视频修复：支持 controls，设置 preload，限制最大高度
      if(type==='video') {
        const url = data?.file?.url || data?.external?.url;
        return (
          <div key={i} style={{display:'flex', justifyContent:'center', margin:'20px 0'}}>
            <video 
              src={url} 
              controls 
              preload="metadata" 
              style={{maxWidth:'100%', maxHeight:'500px', borderRadius:'8px', background:'#000'}} 
            />
          </div>
        );
      }
      
      // 嵌入内容 (YouTube等) 兜底支持
      if(type==='embed') {
         const url = data?.url;
         return <div key={i} style={{padding:'10px', background:'#333', borderRadius:'8px', textAlign:'center', margin:'10px 0'}}><a href={url} target="_blank" style={{color:'#007aff'}}>🔗 打开嵌入内容</a></div>
      }

      if(type==='callout') return <div key={i} style={{background:'#2d2d30', padding:'20px', borderRadius:'12px', border:'1px solid #3e3e42', display:'flex', gap:'15px', margin:'20px 0'}}><div style={{fontSize:'1.4em'}}>{b.callout.icon?.emoji || '🔒'}</div><div style={{flex:1}}><div style={{fontWeight:'bold', color:'#007aff', marginBottom:'4px'}}>{text}</div><div style={{fontSize:'12px', opacity:0.5}}>[ 加密内容已受保护 ]</div></div></div>;
      
      return null;
    })}
  </div>
);

export default function Home() {
  const [mounted, setMounted] = useState(false), [view, setView] = useState('list'), [viewMode, setViewMode] = useState('covered'), [posts, setPosts] = useState([]), [options, setOptions] = useState({ categories: [], tags: [] }), [loading, setLoading] = useState(false), [activeTab, setActiveTab] = useState('Post'), [searchQuery, setSearchQuery] = useState(''), [isSearchOpen, setIsSearchOpen] = useState(false), [showAllTags, setShowAllTags] = useState(false), [selectedFolder, setSelectedFolder] = useState(null), [previewData, setPreviewData] = useState(null);
  const [form, setForm] = useState({ title: '', slug: '', excerpt: '', content: '', category: '', tags: '', cover: '', status: 'Published', type: 'Post', date: '' }), [currentId, setCurrentId] = useState(null), [rawLinks, setRawLinks] = useState(''), [mdLinks, setMdLinks] = useState(''), textAreaRef = useRef(null);

  const isFormValid = form.title.trim() !== '' && form.category.trim() !== '' && form.date !== '';

  useEffect(() => {
    setMounted(true); fetchPosts();
    const style = document.head.appendChild(document.createElement('style'));
    style.innerHTML = `
      body { background-color: #303030; color: #ffffff; margin: 0; font-family: system-ui, sans-serif; overflow-x: hidden; }
      .card-item { position: relative; background: #424242; border-radius: 12px; margin-bottom: 12px; border: 1px solid transparent; cursor: pointer; transition: 0.3s; overflow: hidden; display: flex !important; flex-direction: row !important; align-items: stretch; }
      .card-item:hover { border-color: #007aff; transform: translateY(-2px); background: #4d4d4d; }
      .drawer { position: absolute; right: -120px; top: 0; bottom: 0; width: 120px; display: flex; transition: 0.3s cubic-bezier(0.4, 0, 0.2, 1); z-index: 10; }
      .card-item:hover .drawer { right: 0; }
      .dr-btn { flex: 1; display: flex; align-items: center; justify-content: center; color: #fff; transition: 0.2s; }
      .modal-bg { position: fixed; inset: 0; background: rgba(0,0,0,0.85); display: flex; align-items: center; justify-content: center; z-index: 1000; backdrop-filter: blur(4px); }
      .modal-box { background: #202024; width: 90%; maxWidth: 900px; height: 90vh; border-radius: 24px; border: 1px solid #333; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 20px 50px rgba(0,0,0,0.5); }
      .modal-body { flex: 1; overflow-y: auto; padding: 40px; scroll-behavior: smooth; }
      .btn-ia:active { transform: scale(0.95); }
      .btn-ia:hover { filter: brightness(1.2); }
      .tag-chip { background: #333; padding: 4px 10px; border-radius: 4px; font-size: 11px; color: #bbb; margin: 0 5px 5px 0; cursor: pointer; position: relative; }
      .tag-del { position: absolute; top: -5px; right: -5px; background: #ff4d4f; color: white; border-radius: 50%; width: 14px; height: 14px; display: none; align-items: center; justify-content: center; font-size: 10px; }
      .tag-chip:hover .tag-del { display: flex; }
      .required-star { color: #ff4d4f !important; margin-left: 4px; font-weight: bold; }
      .spinning { animation: rotate 1s linear infinite; }
      @keyframes rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      .load-toast { position: fixed; top: 20px; right: 20px; background: #202024; border: 1px solid #333; padding: 10px 20px; border-radius: 30px; display: flex; align-items: center; gap: 10px; z-index: 2000; box-shadow: 0 5px 15px rgba(0,0,0,0.3); font-weight: bold; font-size: 13px; }
      input, select, textarea { width: 100%; padding: 14px; background: #18181c; border: 1px solid #333; border-radius: 10px; color: #fff; box-sizing: border-box; font-size: 15px; outline: none; transition: 0.2s; }
      input:focus, select:focus, textarea:focus { border-color: #007aff; background: #1f1f23; }
      /* 自定义滚动条 */
      ::-webkit-scrollbar { width: 8px; }
      ::-webkit-scrollbar-track { background: #202024; }
      ::-webkit-scrollbar-thumb { background: #444; border-radius: 4px; }
      ::-webkit-scrollbar-thumb:hover { background: #555; }
    `;
    document.head.appendChild(style);
  }, []);

  async function fetchPosts() { 
    setLoading(true); 
    try { 
      const r = await fetch('/api/posts'); 
      const d = await r.json(); 
      if (d.success) { 
        setPosts(d.posts || []); 
        setOptions(d.options || { categories: [], tags: [] }); 
      } 
    } finally { setLoading(false); } 
  }
  
  if (!mounted) return null;

  const handlePreview = (p) => { setLoading(true); fetch('/api/post?id='+p.id).then(r=>r.json()).then(d=>{ if(d.success) setPreviewData(d.data); }).finally(()=>setLoading(false)); };
  const handleEdit = (p) => { setLoading(true); fetch('/api/post?id='+p.id).then(r=>r.json()).then(d=>{ if (d.success) { setForm(d.data); setCurrentId(p.id); setView('edit'); } }).finally(()=>setLoading(false)); };

  // 🔴 修复 2：外链转换逻辑（立即回显到输入框）
  const convertLinks = () => {
    if(!rawLinks.trim()) return;
    const lines = rawLinks.split('\n').filter(l => l.trim());
    const final = lines.map(l => {
      const m = l.match(/https?:\/\/[^\s]+/);
      return m ? `![](${m[0]})` : '';
    }).filter(Boolean);
    
    if(final.length > 0) {
      const result = final.join('\n');
      setMdLinks(result); 
      setRawLinks(result); // 关键修复：直接更新输入框内容
    } else {
      alert("未识别到有效链接");
    }
  };

  const insertText = (before, after = '') => {
    const el = textAreaRef.current; if (!el) return;
    const start = el.selectionStart, end = el.selectionEnd, val = el.value;
    const newText = val.substring(0, start) + before + val.substring(start, end) + after + val.substring(end);
    setForm({ ...form, content: newText });
    setTimeout(() => { el.focus(); el.setSelectionRange(start + before.length, end + before.length); }, 10);
  };

  const deleteTagOption = async (e, tagName) => {
    e.stopPropagation(); if(!confirm(`移除标签 "${tagName}"？`)) return;
    setLoading(true);
    await fetch(`/api/tags?name=${encodeURIComponent(tagName)}`, { method: 'DELETE' });
    fetchPosts();
  };

  const filtered = posts.filter(p => p.type === activeTab && (p.title.toLowerCase().includes(searchQuery.toLowerCase()) || (p.slug||'').toLowerCase().includes(searchQuery.toLowerCase())) && (selectedFolder ? p.category === selectedFolder : true));
  const displayTags = (options.tags && options.tags.length > 0) ? (showAllTags ? options.tags : options.tags.slice(0, 12)) : [];

  return (
    <div style={{ minHeight: '100vh', background: '#303030', padding: '40px 20px' }}>
      {loading && <div className="load-toast"><Icons.Loader /> 处理中...</div>}
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
          <div style={{ fontSize: '24px', fontWeight: '900', letterSpacing: '1px' }}>PRO<span style={{ color: '#007aff' }}>BLOG</span></div>
          <div style={{ display: 'flex', gap: '10px' }}>
            {view === 'list' ? (
              <><button onClick={() => setIsSearchOpen(!isSearchOpen)} style={s.iconBtn} className="btn-ia"><Icons.Search /></button>
              <button onClick={() => { setForm({ title: '', slug: 'p-'+Date.now().toString(36), excerpt:'', content:'', category:'', tags:'', cover:'', status:'Published', type: activeTab, date: new Date().toISOString().split('T')[0] }); setCurrentId(null); setView('edit'); }} style={s.btnBlue} className="btn-ia">发布新内容</button></>
            ) : <button onClick={() => setView('list')} style={s.btnGray} className="btn-ia">返回</button>}
          </div>
        </header>

        {view === 'list' ? (
          <main>
            <div style={s.tabBox}>{['Post', 'Widget'].map(t => <button key={t} onClick={() => { setActiveTab(t); setSelectedFolder(null); }} style={activeTab === t ? s.tabOn : s.tabOff}>{t === 'Post' ? '已发布' : '组件'}</button>)}</div>
            {isSearchOpen && <input style={s.search} placeholder="搜索标题或Slug..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />}
            <div style={s.toolbar}>
                <button onClick={() => {setViewMode('folder'); setSelectedFolder(null);}} style={viewMode==='folder'?s.iconOn:s.iconBtn} className="btn-ia"><Icons.FolderMode /></button>
                <button onClick={() => setViewMode('covered')} style={viewMode==='covered'?s.iconOn:s.iconBtn} className="btn-ia"><Icons.CoverMode /></button>
                <button onClick={() => setViewMode('text')} style={viewMode==='text'?s.iconOn:s.iconBtn} className="btn-ia"><Icons.TextMode /></button>
                <button onClick={() => setViewMode('gallery')} style={viewMode==='gallery'?s.iconOn:s.iconBtn} className="btn-ia"><Icons.GridMode /></button>
            </div>

            <div style={viewMode === 'gallery' || viewMode === 'folder' ? {display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))', gap:'15px'} : {}}>
              {viewMode === 'folder' && options.categories.map(cat => <div key={cat} onClick={()=>{setSelectedFolder(cat); setViewMode('covered');}} style={s.folderCard} className="btn-ia"><Icons.FolderIcon />{cat}</div>)}
              {viewMode !== 'folder' && filtered.map(p => (
                <div key={p.id} onClick={() => handlePreview(p)} className="card-item" style={viewMode === 'text' ? s.cardText : viewMode === 'gallery' ? s.cardGallery : {}}>
                  {viewMode === 'covered' && <>
                    <div style={s.coverWrap}>{p.cover ? <img src={p.cover} style={s.coverImg} /> : <div style={{fontSize:'28px', color:'#444'}}>{activeTab[0]}</div>}</div>
                    <div style={s.infoWrap}><div style={s.title}>{p.title}</div><div style={s.meta}>{p.category} · {p.date}</div></div>
                  </>}
                  {viewMode === 'text' && <div style={{flex:1, display:'flex', alignItems:'center'}}><div style={{flex:1, fontSize:'14px'}}>{p.title}</div><div style={s.meta}>{p.category} · {p.date}</div></div>}
                  {viewMode === 'gallery' && <>
                    <div style={s.galCover}>{p.cover ? <img src={p.cover} style={s.coverImg} /> : <div style={{fontSize:'40px', color:'#444'}}>{activeTab[0]}</div>}</div>
                    <div style={{padding:'15px'}}><div style={{fontSize:'14px', fontWeight:'bold', color:'#fff'}}>{p.title}</div><div style={s.meta}>{p.category} · {p.date}</div></div>
                  </>}
                  <div className="drawer">
                    <div onClick={(e) => { e.stopPropagation(); handleEdit(p); }} style={{background:'#007aff'}} className="dr-btn"><Icons.Edit /></div>
                    <div onClick={(e) => { e.stopPropagation(); if(confirm('彻底删除？')){setLoading(true); fetch('/api/post?id='+p.id,{method:'DELETE'}).then(()=>fetchPosts())}}} style={{background:'#ff4d4f'}} className="dr-btn"><Icons.Trash /></div>
                  </div>
                </div>
              ))}
            </div>
          </main>
        ) : (
          <main style={s.panel}><div style={{marginBottom:'20px'}}><label style={s.lab}>标题 *</label><input value={form.title} onChange={e=>setForm({...form, title:e.target.value})} style={s.inp}/></div>
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'20px', marginBottom:'20px'}}>
              <div><label style={s.lab}>分类 *</label><input list="cats" value={form.category} onChange={e=>setForm({...form, category:e.target.value})} style={s.inp}/><datalist id="cats">{options.categories.map(o=><option key={o} value={o}/>)}</datalist></div>
              <div><label style={s.lab}>发布日期 *</label><input type="date" value={form.date} onChange={e=>setForm({...form, date:e.target.value})} style={s.inp}/></div>
            </div>
            <div style={{marginBottom:'20px'}}><label style={s.lab}>标签</label><input value={form.tags} onChange={e=>setForm({...form, tags:e.target.value})} style={s.inp}/><div style={{marginTop:'10px', display:'flex', flexWrap:'wrap'}}>{displayTags.map(t => <span key={t} className="tag-chip" onClick={()=>{const cur=form.tags.split(',').filter(Boolean); if(!cur.includes(t)) setForm({...form, tags:[...cur,t].join(',')})}}>{t}<div className="tag-del" onClick={(e)=>{e.stopPropagation(); deleteTagOption(e, t)}}>×</div></span>)}{options.tags.length > 12 && <span onClick={()=>setShowAllTags(!showAllTags)} style={{fontSize:'12px', color:'#007aff', cursor:'pointer', fontWeight:'bold', marginLeft:'5px'}}>{showAllTags ? '收起' : `...`}</span>}</div></div>
            <div style={{marginBottom:'20px'}}><label style={s.lab}>封面图 URL</label><input value={form.cover} onChange={e=>setForm({...form, cover:e.target.value})} style={s.inp}/></div>
            <div style={{marginBottom:'30px'}}><label style={s.lab}>摘要</label><input value={form.excerpt} onChange={e=>setForm({...form, excerpt:e.target.value})} style={s.inp}/></div>
            <div style={s.tBox}><button onClick={()=>window.open("https://x1file.top/home")} style={s.btnGrayF} className="btn-ia">🎬 打开网盘获取素材</button><textarea style={{height:'120px', background:'#18181c'}} placeholder="在这里粘贴需要清洗的链接（每行一个）..." value={rawLinks} onChange={e=>setRawLinks(e.target.value)} /><button onClick={convertLinks} style={s.btnBlueF} className="btn-ia">立即转换 (覆盖显示)</button>{mdLinks && <button onClick={()=>{navigator.clipboard.writeText(mdLinks); alert('已复制')}} style={s.btnGrayF} className="btn-ia">复制全部结果</button>}</div>
            <div style={s.eTool}><button style={s.toolItem} onClick={()=>setForm({...form, content:form.content+'# '})}>H1</button><button style={s.toolItem} onClick={()=>setForm({...form, content:form.content+'**加粗**'})}>B</button><button style={s.eBtnBlue} onClick={()=>setForm({...form, content:form.content+':::lock 123\n\n:::'})}>🔒 插入加密块</button></div>
            <textarea ref={textAreaRef} style={{height:'500px', borderRadius:'0 0 10px 10px', background:'#18181c', color:'#fff', padding:'15px'}} value={form.content} onChange={e=>setForm({...form, content:e.target.value})} placeholder="在这里写正文..." />
            <button onClick={()=>{setLoading(true); fetch('/api/post',{method:'POST', body:JSON.stringify({...form, id:currentId})}).then(()=>{setView('list'); fetchPosts();})}} disabled={!isFormValid} style={isFormValid?s.btnP:s.btnD} className="btn-ia">确认发布</button>
          </main>
        )}
        
        {previewData && (
          <div className="modal-bg" onClick={()=>setPreviewData(null)}>
            <div className="modal-box" onClick={e=>e.stopPropagation()}>
              <div style={{padding:'20px 25px', borderBottom:'1px solid #333', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                <strong>预览: {previewData.title}</strong>
                <button onClick={()=>setPreviewData(null)} style={{background:'none', border:'none', color:'#666', fontSize:'24px', cursor:'pointer'}}>×</button>
              </div>
              <div className="modal-body"><NotionView blocks={previewData.rawBlocks} /></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const s = {
  iconBtn: { background:'#202024', border:'1px solid #333', color:'#666', borderRadius:'8px', width:'34px', height:'34px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' },
  iconOn: { background:'#007aff', border:'1px solid #007aff', color:'#fff', borderRadius:'8px', width:'34px', height:'34px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' },
  btnBlue: { padding:'0 25px', background:'#007aff', color:'#fff', border:'none', borderRadius:'8px', fontWeight:'bold', cursor:'pointer' },
  btnGray: { padding:'8px 25px', background:'#424242', color:'#fff', border:'1px solid #555', borderRadius:'8px', cursor:'pointer' },
  tabBox: { display:'flex', background:'#424242', padding:'5px', borderRadius:'12px', marginBottom:'25px', width:'fit-content' },
  tabOn: { padding:'10px 30px', border:'none', background:'#555', color:'#fff', borderRadius:'10px', fontWeight:'bold', fontSize:'13px', cursor:'pointer' },
  tabOff: { padding:'10px 30px', border:'none', background:'none', color:'#888', borderRadius:'10px', fontWeight:'bold', fontSize:'13px', cursor:'pointer' },
  search: { width:'100%', padding:'14px', background:'#424242', border:'1px solid #007aff', borderRadius:'12px', color:'#fff', marginBottom:'20px' },
  toolbar: { display:'flex', justifyContent:'flex-end', gap:'8px', marginBottom:'15px' },
  folderCard: { padding:'15px', background:'#424242', borderRadius:'10px', display:'flex', alignItems:'center', gap:'12px', border:'1px solid #555', cursor:'pointer' },
  cardText: { display:'flex', alignItems:'center', padding:'16px 20px', borderRadius:'12px', background:'#424242', marginBottom:'8px', position:'relative', overflow:'hidden' },
  cardGallery: { display:'flex', flexDirection:'column', height:'auto', background:'#424242', borderRadius:'12px', marginBottom:'12px', position:'relative', overflow:'hidden' },
  coverWrap: { width:'160px', flexShrink:0, background:'#303030', display:'flex', alignItems:'center', justifyContent:'center' },
  coverImg: { width:'100%', height:'100%', objectFit:'cover' },
  infoWrap: { padding:'20px 35px', flex:1, display:'flex', flexDirection:'column', justifyContent:'flex-start' },
  title: { fontWeight:'bold', fontSize:'20px', color:'#fff', marginBottom:'8px' },
  meta: { color:'#fff', fontSize:'12px', opacity:0.8 },
  galCover: { height:'140px', background:'#303030', display:'flex', alignItems:'center', justifyContent:'center' },
  panel: { background:'#424242', padding:'30px', borderRadius:'20px', border:'1px solid #555' },
  lab: { display:'block', fontSize:'11px', color:'#fff', marginBottom:'10px', fontWeight:'bold', textTransform:'uppercase' },
  inp: { background:'#18181c', border:'1px solid #333', color:'#fff' },
  tBox: { background:'#303030', padding:'20px', borderRadius:'15px', marginBottom:'30px', border:'1px solid #555' },
  btnBlueF: { width:'100%', padding:'12px', background:'#007aff', color:'#fff', border:'none', borderRadius:'8px', cursor:'pointer', fontWeight:'bold', marginTop:'10px' },
  btnGrayF: { width:'100%', padding:'12px', background:'#424242', color:'#fff', border:'1px solid #555', borderRadius:'8px', cursor:'pointer', fontWeight:'bold' },
  eTool: { background:'#303030', padding:'10px', borderRadius:'8px 8px 0 0', display:'flex', gap:'10px', border:'1px solid #555', borderBottom:'none' },
  toolItem: { background:'#424242', color:'#fff', padding:'6px 12px', border:'1px solid #555', borderRadius:'4px', cursor:'pointer' },
  eBtnBlue: { background:'#007aff', color:'#fff', padding:'6px 12px', border:'none', borderRadius:'4px', cursor:'pointer' },
  btnP: { width:'100%', padding:'20px', background:'#fff', color:'#000', border:'none', borderRadius:'12px', fontWeight:'bold', fontSize:'16px', marginTop:'40px', cursor:'pointer' },
  btnD: { width:'100%', padding:'20px', background:'#222', color:'#666', border:'none', borderRadius:'12px', fontWeight:'bold', fontSize:'16px', marginTop:'40px', cursor:'not-allowed' }
};
