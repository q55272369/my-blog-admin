'use client';
import React, { useState, useEffect, useRef } from 'react';

const Icons = {
  Search: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>,
  CoverMode: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>,
  TextMode: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>,
  GridMode: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>,
  FolderMode: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>,
  Edit: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4L18.5 2.5z"></path></svg>,
  Trash: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
};

const NotionViewer = ({ blocks }) => (
  <div style={{color:'#e1e1e3', fontSize:'15px', lineHeight:'1.7'}}>
    {blocks?.map((b, i) => {
      const d = b[b.type], t = d?.rich_text?.[0]?.plain_text || "";
      if(b.type==='heading_1') return <h1 key={i} style={{fontSize:'1.8em', borderBottom:'1px solid #333', paddingBottom:'8px', margin:'20px 0'}}>{t}</h1>;
      if(b.type==='paragraph') return <p key={i} style={{margin:'10px 0', minHeight:'1em'}}>{t}</p>;
      if(b.type==='divider') return <hr key={i} style={{border:'none', borderTop:'1px solid #333', margin:'20px 0'}} />;
      if(b.type==='image') return <img key={i} src={d.external?.url || d.file?.url} style={{width:'100%', borderRadius:'8px', margin:'15px 0'}} />;
      if(b.type==='callout') return <div key={i} style={{background:'#2d2d30', padding:'15px', borderRadius:'10px', border:'1px solid #3e3e42', display:'flex', gap:'12px', margin:'15px 0'}}><div style={{fontSize:'1.3em'}}>{b.callout.icon?.emoji || '🔒'}</div><div style={{flex:1, fontWeight:'bold', color:'#007aff'}}>{t}</div></div>;
      return null;
    })}
  </div>
);

export default function Home() {
  const [mounted, setMounted] = useState(false), [view, setView] = useState('list'), [viewMode, setViewMode] = useState('covered'), [posts, setPosts] = useState([]), [options, setOptions] = useState({ categories: [], tags: [] }), [loading, setLoading] = useState(false), [activeTab, setActiveTab] = useState('Post'), [searchQuery, setSearchQuery] = useState(''), [isSearchOpen, setIsSearchOpen] = useState(false), [showAllTags, setShowAllTags] = useState(false), [selectedFolder, setSelectedFolder] = useState(null), [previewData, setPreviewData] = useState(null);
  const [form, setForm] = useState({ title: '', slug: '', excerpt: '', content: '', category: '', tags: '', cover: '', status: 'Published', type: 'Post', date: '' }), [currentId, setCurrentId] = useState(null), [rawLinks, setRawLinks] = useState(''), [mdLinks, setMdLinks] = useState(''), textAreaRef = useRef(null);

  useEffect(() => { setMounted(true); fetchPosts(); }, []);
  async function fetchPosts() { setLoading(true); try { const res = await fetch('/api/posts'); const data = await res.json(); if (data.success) { setPosts(data.posts || []); setOptions(data.options); } } finally { setLoading(false); } }
  
  if (!mounted) return null;

  const handleEdit = (p) => { setLoading(true); fetch('/api/post?id='+p.id).then(r=>r.json()).then(d=>{ if(d.success){ setForm(d.data); setCurrentId(p.id); setView('edit'); } }).finally(()=>setLoading(false)); };
  const handlePreview = (p) => { setLoading(true); fetch('/api/post?id='+p.id).then(r=>r.json()).then(d=>{ if(d.success) setPreviewData(d.data); }).finally(()=>setLoading(false)); };

  const filteredPosts = posts.filter(p => p.type === activeTab && (p.title.toLowerCase().includes(searchQuery.toLowerCase()) || (p.slug||'').toLowerCase().includes(searchQuery.toLowerCase())) && (selectedFolder ? p.category === selectedFolder : true));

  return (
    <div style={{ minHeight: '100vh', background: '#303030', padding: '40px 20px' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
          <div style={{ fontSize: '24px', fontWeight: '900', letterSpacing: '1px' }}>PRO<span style={{ color: '#007aff' }}>BLOG</span></div>
          <div style={{ display: 'flex', gap: '10px' }}>
            {view === 'list' && <><button onClick={() => setIsSearchOpen(!isSearchOpen)} style={s.iconBtn} className="btn-active"><Icons.Search /></button><button onClick={() => { setForm({ title: '', slug: 'p-' + Date.now().toString(36), excerpt: '', content: '', category: '', tags: '', cover: '', status: 'Published', type: activeTab, date: new Date().toISOString().split('T')[0] }); setCurrentId(null); setView('edit'); }} style={s.btnBlue} className="btn-active">发布新内容</button></>}
            {view === 'edit' && <button onClick={() => setView('list')} style={s.btnGray} className="btn-active">返回</button>}
          </div>
        </header>

        {view === 'list' ? (
          <main>
            <div style={s.tabBox}>{['Post', 'Widget'].map(t => <button key={t} onClick={() => { setActiveTab(t); setSelectedFolder(null); }} style={activeTab === t ? s.tabOn : s.tabOff}>{t === 'Post' ? '已发布' : '组件'}</button>)}</div>
            {isSearchOpen && <input style={s.search} placeholder="搜索..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />}
            <div style={s.toolbar}><button onClick={()=>setViewMode('folder')} style={viewMode==='folder'?s.iconOn:s.iconBtn}><Icons.FolderMode /></button><button onClick={()=>setViewMode('covered')} style={viewMode==='covered'?s.iconOn:s.iconBtn}><Icons.CoverMode /></button><button onClick={()=>setViewMode('text')} style={viewMode==='text'?s.iconOn:s.iconBtn}><Icons.TextMode /></button><button onClick={()=>setViewMode('gallery')} style={viewMode==='gallery'?s.iconOn:s.iconBtn}><Icons.GridMode /></button></div>

            <div style={viewMode === 'gallery' || viewMode === 'folder' ? {display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))', gap:'15px'} : {}}>
              {viewMode === 'folder' && options.categories.map(cat => <div key={cat} onClick={()=>{setSelectedFolder(cat); setViewMode('covered');}} style={s.folderCard} className="btn-active"><Icons.FolderIcon />{cat}</div>)}
              {viewMode !== 'folder' && filteredPosts.map(p => (
                <div key={p.id} onClick={()=>handlePreview(p)} className="card-covered" style={viewMode === 'text' ? s.cardText : viewMode === 'gallery' ? s.cardGallery : s.cardCovered}>
                  {viewMode === 'covered' && <>
                    <div style={s.coverWrap}>{p.cover ? <img src={p.cover} style={s.coverImg} /> : <div style={{fontSize:'28px', color:'#444'}}>{activeTab[0]}</div>}</div>
                    <div style={s.infoWrap}><div style={s.title}>{p.title}</div><div style={s.meta}>{p.category} · {p.date}</div></div>
                  </>}
                  {viewMode === 'text' && <div style={{flex:1, display:'flex'}}><div style={{flex:1}}>{p.title}</div><div style={s.meta}>{p.category} · {p.date}</div></div>}
                  {viewMode === 'gallery' && <>
                    <div style={s.galCover}>{p.cover ? <img src={p.cover} style={s.coverImg} /> : <div style={{fontSize:'40px', color:'#444'}}>{activeTab[0]}</div>}</div>
                    <div style={{padding:'15px'}}><div style={{fontSize:'14px', fontWeight:'bold'}}>{p.title}</div><div style={s.meta}>{p.category} · {p.date}</div></div>
                  </>}
                  <div className="drawer-zone"><div onClick={(e)=>{e.stopPropagation(); handleEdit(p)}} style={s.drEdit}><Icons.Edit /></div><div onClick={(e)=>{e.stopPropagation(); if(confirm('彻底删除？')){fetch('/api/post?id='+p.id,{method:'DELETE'}).then(()=>fetchPosts())}}} style={s.drDel}><Icons.Trash /></div></div>
                </div>
              ))}
            </div>
          </main>
        ) : (
          <main style={s.panel}><div style={{marginBottom:'20px'}}><label style={s.lab}>标题 *</label><input value={form.title} onChange={e=>setForm({...form, title:e.target.value})} /></div>
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'20px', marginBottom:'20px'}}>
              <div><label style={s.lab}>分类 *</label><input list="cats" value={form.category} onChange={e=>setForm({...form, category:e.target.value})} /><datalist id="cats">{options.categories.map(o=><option key={o} value={o}/>)}</datalist></div>
              <div><label style={s.lab}>日期 *</label><input type="date" value={form.date} onChange={e=>setForm({...form, date:e.target.value})} /></div>
            </div>
            <div style={{marginBottom:'20px'}}><label style={s.lab}>标签</label><input value={form.tags} onChange={e=>setForm({...form, tags:e.target.value})} /></div>
            <div style={{marginBottom:'20px'}}><label style={s.lab}>封面 URL</label><input value={form.cover} onChange={e=>setForm({...form, cover:e.target.value})} /></div>
            <div style={{marginBottom:'30px'}}><label style={s.lab}>摘要</label><input value={form.excerpt} onChange={e=>setForm({...form, excerpt:e.target.value})} /></div>
            <div style={s.toolBox}><button onClick={()=>window.open("https://x1file.top/home")} style={s.btnGrayFull}>🎬 打开网盘获取素材</button><textarea style={{height:'80px', background:'#18181c'}} placeholder="直链转换..." value={rawLinks} onChange={e=>setRawLinks(e.target.value)} /><button onClick={()=>{setMdLinks(rawLinks.split('\n').filter(l=>l.trim()).map(u=>`![image](${u.trim()})`).join('\n'))}} style={s.btnBlueFull}>立即转换</button>{mdLinks && <button onClick={()=>{navigator.clipboard.writeText(mdLinks); alert('已复制')}} style={s.btnGrayFull}>复制全部结果</button>}</div>
            <div style={s.editTool}><button style={s.toolItem} onClick={()=>setForm({...form, content:form.content+'# '})}>H1</button><button style={s.toolItem} onClick={()=>setForm({...form, content:form.content+'**加粗**'})}>B</button><button style={s.btnBlueSmall} onClick={()=>setForm({...form, content:form.content+':::lock 123\n\n:::'})}>🔒 加密块</button></div>
            <textarea style={{height:'500px', borderRadius:'0 0 10px 10px', background:'#18181c'}} value={form.content} onChange={e=>setForm({...form, content:e.target.value})} />
            <button onClick={()=>{setLoading(true); fetch('/api/post',{method:'POST', body:JSON.stringify({...form, id:currentId})}).then(()=>{setView('list'); fetchPosts();})}} disabled={!isFormValid} style={isFormValid?s.btnPublish:s.btnDisabled}>确认发布</button>
          </main>
        )}
        {previewData && <div className="modal-overlay" onClick={()=>setPreviewData(null)}><div className="modal-box" onClick={e=>e.stopPropagation()}><div style={{padding:'20px', borderBottom:'1px solid #333', display:'flex', justifyContent:'space-between'}}><strong>预览: {previewData.title}</strong><button onClick={()=>setPreviewData(null)} style={{background:'none', border:'none', color:'#666', fontSize:'24px', cursor:'pointer'}}>×</button></div><div className="modal-body"><NotionContent blocks={previewData.rawBlocks} /></div></div></div>}
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
  cardCovered: { position:'relative', background:'#424242', borderRadius:'12px', marginBottom:'12px', display:'flex', flexDirection:'row', alignItems:'stretch', overflow:'hidden', minHeight:'120px' },
  cardText: { position:'relative', background:'#424242', padding:'16px 20px', borderBottom:'1px solid #333', cursor:'pointer', overflow:'hidden' },
  cardGallery: { position:'relative', background:'#424242', borderRadius:'12px', marginBottom:'12px', display:'flex', flexDirection:'column', overflow:'hidden' },
  coverWrap: { width:'160px', flexShrink:0, background:'#303030', display:'flex', alignItems:'center', justifyContent:'center' },
  coverImg: { width:'100%', height:'100%', objectFit:'cover' },
  infoWrap: { padding:'20px 35px', flex:1, display:'flex', flexDirection:'column', justifyContent:'flex-start' },
  title: { fontWeight:'bold', fontSize:'20px', color:'#fff', marginBottom:'8px' },
  meta: { color:'#fff', fontSize:'12px', opacity:0.8 },
  galCover: { height:'140px', background:'#303030', display:'flex', alignItems:'center', justifyContent:'center' },
  drEdit: { flex:1, background:'#007aff', display:'flex', alignItems:'center', justifyContent:'center' },
  drDel: { flex:1, background:'#ff4d4f', display:'flex', alignItems:'center', justifyContent:'center' },
  panel: { background:'#424242', padding:'30px', borderRadius:'20px', border:'1px solid #555' },
  lab: { display:'block', fontSize:'11px', color:'#fff', marginBottom:'10px', fontWeight:'bold', textTransform:'uppercase' },
  toolBox: { background:'#303030', padding:'20px', borderRadius:'15px', marginBottom:'30px', border:'1px solid #555' },
  btnBlueFull: { width:'100%', padding:'12px', background:'#007aff', color:'#fff', border:'none', borderRadius:'8px', cursor:'pointer', fontWeight:'bold', marginTop:'10px' },
  btnGrayFull: { width:'100%', padding:'12px', background:'#424242', color:'#fff', border:'1px solid #555', borderRadius:'8px', cursor:'pointer', fontWeight:'bold' },
  editTool: { background:'#303030', padding:'10px', borderRadius:'8px 8px 0 0', display:'flex', gap:'10px', border:'1px solid #555', borderBottom:'none' },
  toolItem: { background:'#424242', color:'#fff', padding:'6px 12px', border:'1px solid #555', borderRadius:'4px', cursor:'pointer' },
  btnBlueSmall: { background:'#007aff', color:'#fff', padding:'6px 12px', border:'none', borderRadius:'4px', cursor:'pointer' },
  btnPublish: { width:'100%', padding:'20px', background:'#fff', color:'#000', border:'none', borderRadius:'12px', fontWeight:'bold', fontSize:'16px', marginTop:'40px', cursor:'pointer' },
  btnDisabled: { width:'100%', padding:'20px', background:'#222', color:'#666', border:'none', borderRadius:'12px', fontWeight:'bold', fontSize:'16px', marginTop:'40px', cursor:'not-allowed' }
};
