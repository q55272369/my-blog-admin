'use client';
import React, { useState, useEffect, useRef } from 'react';

// SVG 图标
const Icons = {
  Search: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>,
  CoverMode: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>,
  TextMode: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>,
  GridMode: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>,
  FolderMode: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>,
  FolderIcon: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="#ffffff" style={{opacity:0.8}}><path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"></path></svg>,
  EditIcon: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4L18.5 2.5z"></path></svg>,
  TrashIcon: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
};

// 🟢 预览渲染组件（模拟 Notion 样式）
const NotionView = ({ blocks }) => {
  if(!blocks) return <p style={{color:'#666', textAlign:'center', marginTop:'50px'}}>正在加载积木数据...</p>;
  return (
    <div style={{color:'#e1e1e3', fontSize:'15px', lineHeight:'1.8'}}>
      {blocks.map((b, i) => {
        const data = b[b.type];
        const text = data?.rich_text?.[0]?.plain_text || "";
        switch(b.type) {
          case 'heading_1': return <h1 key={i} style={{fontSize:'1.8em', borderBottom:'1px solid #333', paddingBottom:'0.3em', margin:'1.2em 0 0.6em'}}>{text}</h1>;
          case 'paragraph': return <p key={i} style={{margin:'0.6em 0', minHeight:'1em'}}>{text}</p>;
          case 'divider': return <hr key={i} style={{border:'none', borderTop:'1px solid #444', margin:'1.5em 0'}} />;
          case 'image': return <img key={i} src={data.external?.url || data.file?.url} style={{width:'100%', borderRadius:'8px', margin:'1em 0'}} alt="" />;
          case 'callout': 
            return (
              <div key={i} style={{background:'#2d2d30', padding:'16px 24px', borderRadius:'10px', border:'1px solid #3e3e42', display:'flex', gap:'12px', margin:'1em 0'}}>
                <div style={{fontSize:'1.3em'}}>{b.callout.icon?.emoji || '💡'}</div>
                <div style={{flex:1}}>
                  <div style={{fontWeight:'bold', color:'#007aff', marginBottom:'8px'}}>{text}</div>
                  <div style={{fontSize:'0.9em', opacity:0.6}}>[ 加密保护内容 ]</div>
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
  const [previewData, setPreviewData] = useState(null); // 预览数据

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
      .card-base { position: relative; background: #424242; border-radius: 12px; margin-bottom: 12px; border: 1px solid transparent; cursor: pointer; transition: 0.3s; overflow: hidden; }
      .card-base:hover { border-color: #007aff; transform: translateY(-2px); background: #4d4d4d; }
      
      .drawer-zone { position: absolute; right: -140px; top: 0; bottom: 0; width: 140px; display: flex; transition: 0.3s cubic-bezier(0.4, 0, 0.2, 1); z-index: 10; }
      .card-base:hover .drawer-zone { right: 0; }
      .dr-btn { flex: 1; display: flex; align-items: center; justify-content: center; color: #fff; transition: 0.2s; }
      .dr-edit { background: #007aff; } .dr-edit:hover { background: #008aff; }
      .dr-del { background: #ff4d4f; } .dr-del:hover { background: #ff7875; }

      .modal-bg { position: fixed; inset: 0; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; z-index: 1000; backdrop-filter: blur(4px); }
      .modal-box { background: #202024; width: 90%; maxWidth: 700px; height: 80vh; border-radius: 20px; border: 1px solid #333; display: flex; flex-direction: column; overflow: hidden; animation: zoomIn 0.2s; }
      .modal-body { flex: 1; overflow-y: auto; padding: 40px 80px; } /* 🟢 宽边距：模仿红框 */
      
      .btn-active:active { transform: scale(0.95); }
      .tag-chip { background: #333; padding: 4px 10px; border-radius: 4px; font-size: 11px; color: #bbb; margin: 0 5px 5px 0; cursor: pointer; position: relative; }
      .tag-del { position: absolute; top: -5px; right: -5px; background: #ff4d4f; color: white; border-radius: 50%; width: 14px; height: 14px; display: none; align-items: center; justify-content: center; font-size: 10px; }
      .tag-chip:hover .tag-del { display: flex; }
      @keyframes zoomIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
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
    fetch(`/api/post?id=${post.id}`).then(r => r.json()).then(d => {
      if(d.success) setPreviewData(d.data);
    }).finally(() => setLoading(false));
  };

  const handleEdit = (post) => {
    setLoading(true);
    fetch(`/api/post?id=${post.id}`).then(r => r.json()).then(d => {
      if (d.success) { setForm(d.data); setCurrentId(post.id); setView('edit'); }
    }).finally(() => setLoading(false));
  };

  if (!mounted) return null;

  const filteredPosts = posts.filter(p => (p.type === activeTab) && (p.title.toLowerCase().includes(searchQuery.toLowerCase()) || (p.slug || '').toLowerCase().includes(searchQuery.toLowerCase())) && (selectedFolder ? p.category === selectedFolder : true));

  return (
    <div style={{ minHeight: '100vh', background: '#303030', padding: '40px 20px' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
          <div style={{ fontSize: '24px', fontWeight: '900', letterSpacing: '1px' }}>PRO<span style={{ color: '#007aff' }}>BLOG</span></div>
          <div style={{ display: 'flex', gap: '10px' }}>
            {view === 'list' && (
              <>
                <button onClick={() => setIsSearchOpen(!isSearchOpen)} className={`icon-btn btn-active ${isSearchOpen ? 'active' : ''}`} style={css.iconBtn}><Icons.Search /></button>
                <button onClick={() => { setForm({ title: '', slug: 'p-' + Date.now().toString(36), excerpt: '', content: '', category: '', tags: '', cover: '', status: 'Published', type: activeTab, date: new Date().toISOString().split('T')[0] }); setCurrentId(null); setView('edit'); }} style={{ padding: '0 25px', background: '#007aff', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }} className="btn-active">发布新内容</button>
              </>
            )}
            {view === 'edit' && <button onClick={() => setView('list')} style={{ padding: '8px 20px', background: '#424242', color: '#fff', border: '1px solid #555', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>返回</button>}
          </div>
        </header>

        {view === 'list' ? (
          <main>
            <div style={{ display: 'flex', background: '#424242', padding: '5px', borderRadius: '12px', marginBottom: '25px', width: 'fit-content' }}>
              {['Post', 'Widget'].map(t => (
                <button key={t} onClick={() => { setActiveTab(t); setSearchQuery(''); setSelectedFolder(null); }} style={{ padding: '10px 30px', border: 'none', background: activeTab === t ? '#555' : 'none', color: activeTab === t ? '#fff' : '#888', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold' }}>{t === 'Post' ? '已发布' : '组件'}</button>
              ))}
            </div>

            {isSearchOpen && <input style={{ width:'100%', padding:'14px', background:'#424242', border:'1px solid #007aff', borderRadius:'12px', color:'#fff', marginBottom:'20px' }} placeholder="搜索标题或Slug..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginBottom: '15px' }}>
                <button onClick={() => {setViewMode('folder'); setSelectedFolder(null);}} style={viewMode === 'folder' ? css.iconActive : css.iconBtn}><Icons.FolderMode /></button>
                <button onClick={() => setViewMode('covered')} style={viewMode === 'covered' ? css.iconActive : css.iconBtn}><Icons.CoverMode /></button>
                <button onClick={() => setViewMode('text')} style={viewMode === 'text' ? css.iconActive : css.iconBtn}><Icons.TextMode /></button>
                <button onClick={() => setViewMode('gallery')} style={viewMode === 'gallery' ? css.iconActive : css.iconBtn}><Icons.GridMode /></button>
            </div>

            {loading && !previewData && <p style={{textAlign:'center', color:'#666'}}>📡 正在载入数据...</p>}

            <div style={viewMode === 'gallery' || viewMode === 'folder' ? {display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))', gap:'15px'} : {}}>
              {viewMode === 'folder' && options.categories.map(cat => (
                <div key={cat} onClick={() => {setSelectedFolder(cat); setViewMode('covered');}} style={{padding:'15px', background:'#424242', borderRadius:'10px', display:'flex', alignItems:'center', gap:'12px', border:'1px solid #555'}} className="btn-active">
                  <Icons.FolderIcon /><div style={{fontWeight:'bold', fontSize:'14px'}}>{cat}</div>
                </div>
              ))}

              {viewMode !== 'folder' && filteredPosts.map(p => (
                <div key={p.id} onClick={() => handlePreview(p)} className="card-base" style={viewMode === 'text' ? {display:'flex', alignItems:'center', padding:'16px 20px'} : {}}>
                  {viewMode === 'covered' && (
                    <>
                      <div style={{width:'160px', flexShrink:0, background:'#303030', display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden'}}>
                        {p.cover ? <img src={p.cover} style={{width:'100%', height:'100%', objectFit:'cover'}} /> : <div style={{fontSize:'28px', color:'#444'}}>{activeTab[0]}</div>}
                      </div>
                      <div style={{padding: '20px 35px', flex:1}}>
                        <div style={{fontWeight:'bold', fontSize:'20px', color:'#fff', marginBottom:'8px'}}>{p.title}</div>
                        <div style={{color:'#ffffff', fontSize:'12px', opacity: 0.8}}>{p.category} · {p.date}</div>
                      </div>
                    </>
                  )}
                  {viewMode === 'text' && (
                    <div style={{flex:1, display:'flex', alignItems:'center'}}>
                      <div style={{flex:1, fontSize:'14px', fontWeight:'500', color:'#fff'}}>{p.title}</div>
                      <div style={{fontSize:'12px', color:'#fff', opacity:0.8, marginRight:'20px'}}>{p.category}</div>
                      <div style={{fontSize:'12px', color:'#fff', opacity:0.6}}>{p.date}</div>
                    </div>
                  )}
                  {viewMode === 'gallery' && (
                    <>
                      <div style={{height:'140px', background:'#303030', display:'flex', alignItems:'center', justifyContent:'center'}}>
                        {p.cover ? <img src={p.cover} style={{width:'100%', height:'100%', objectFit:'cover'}} /> : <div style={{fontSize:'40px', color:'#444'}}>{activeTab[0]}</div>}
                      </div>
                      <div style={{padding:'15px'}}><div style={{fontSize:'14px', fontWeight:'bold', marginBottom:'6px', color:'#fff'}}>{p.title}</div><div style={{fontSize:'11px', opacity:0.6}}>{p.category} · {p.date}</div></div>
                    </>
                  )}
                  
                  <div className="drawer-zone">
                    <div onClick={(e) => { e.stopPropagation(); handleEdit(p); }} className="dr-btn dr-edit"><Icons.EditIcon /></div>
                    <div onClick={(e) => { e.stopPropagation(); if(confirm('彻底删除？')){fetch('/api/post?id='+p.id,{method:'DELETE'}).then(()=>fetchPosts())} }} className="dr-btn dr-del"><Icons.TrashIcon /></div>
                  </div>
                </div>
              ))}
            </div>
          </main>
        ) : (
          <main style={{ background: '#424242', padding: '30px', borderRadius: '20px', border: '1px solid #555' }}>
            <div style={{marginBottom:'20px'}}><label style={css.labelWhite}>标题 <span className="required-star">*</span></label><input value={form.title} onChange={e => setForm({...form, title: e.target.value})} /></div>
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'20px', marginBottom:'20px'}}>
                <div><label style={css.labelWhite}>分类 <span className="required-star">*</span></label><input list="cats" value={form.category} onChange={e => setForm({...form, category: e.target.value})} /><datalist id="cats">{options.categories.map(o => <option key={o} value={o} />)}</datalist></div>
                <div><label style={css.labelWhite}>发布日期 <span className="required-star">*</span></label><input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} /></div>
            </div>
            <div style={{marginBottom:'20px'}}><label style={css.labelWhite}>标签 (点选快捷添加)</label><input value={form.tags} onChange={e => setForm({...form, tags: e.target.value})} /><div style={{marginTop:'10px', display:'flex', flexWrap:'wrap'}}>{displayTags.map(t => <span key={t} className="tag-chip" onClick={()=>{const cur=form.tags.split(',').filter(Boolean); if(!cur.includes(t)) setForm({...form, tags:[...cur,t].join(',')})}}>{t}<div className="tag-del" onClick={(e)=>{e.stopPropagation(); fetch('/api/tags?name='+t,{method:'DELETE'}).then(()=>fetchPosts())}}>×</div></span>)}{options.tags.length > 12 && <span onClick={()=>setShowAllTags(!showAllTags)} style={{fontSize:'12px', color:'#007aff', cursor:'pointer', fontWeight:'bold', marginLeft:'5px'}}>{showAllTags ? '收起' : '...'}</span>}</div></div>
            <div style={{marginBottom:'20px'}}><label style={css.labelWhite}>封面图 URL</label><input value={form.cover} onChange={e => setForm({...form, cover: e.target.value})} /></div>
            <div style={{marginBottom:'30px'}}><label style={css.labelWhite}>摘要 (Excerpt)</label><input value={form.excerpt} onChange={e => setForm({...form, excerpt: e.target.value})} /></div>

            <div style={{background:'#303030', padding:'20px', borderRadius:'15px', marginBottom:'30px', border:'1px solid #555'}}>
              <button onClick={() => window.open("https://x1file.top/home")} style={{width:'100%', padding:'12px', background:'#424242', color:'#fff', border:'1px solid #555', borderRadius:'8px', cursor:'pointer', fontWeight:'bold', fontSize:'14px', marginBottom:'15px'}} className="btn-active">🎬 打开网盘获取素材</button>
              <textarea style={{height:'120px', background:'#18181c'}} placeholder="粘贴直链转换..." value={rawLinks} onChange={e=>setRawLinks(e.target.value)} />
              <button onClick={()=>{const lines=rawLinks.split('\n'); const final=[]; for(let i=0; i<lines.length; i++){const m=lines[i].match(/https?:\/\/[^\s]+/); if(m) final.push(`![](${m[0]})`);} setMdLinks(final.join('\n'))}} style={{width:'100%', padding:'12px', background:'#007aff', color:'#fff', border:'none', borderRadius:'8px', cursor:'pointer', marginTop:'10px', fontWeight:'bold'}} className="btn-active">立即转换</button>
              {mdLinks && <button onClick={()=>{navigator.clipboard.writeText(mdLinks); alert('已复制')}} style={{width:'100%', padding:'10px', background:'#555', color:'#fff', border:'none', borderRadius:'8px', cursor:'pointer', marginTop:'10px'}} className="btn-active">复制全部结果</button>}
            </div>

            <div style={{background:'#303030', padding:'10px', borderRadius:'8px 8px 0 0', display:'flex', gap:'10px', border:'1px solid #555', borderBottom:'none'}}>
                <button style={css.toolBtn} onClick={()=>insertText('# ', '')}>H1</button>
                <button style={css.toolBtn} onClick={()=>insertText('**', '**')}>B</button>
                <button style={css.toolBtn} onClick={()=>insertText('[', '](url)')}>Link</button>
                <button style={{...css.toolBtn, background:'#007aff', borderColor:'#007aff'}} onClick={()=>insertText(':::lock 123\n', '\n:::')}>🔒 插入加密块</button>
            </div>
            <textarea ref={textAreaRef} style={{height:'500px', borderRadius:'0 0 10px 10px', background:'#18181c'}} value={form.content} onChange={e => setForm({...form, content: e.target.value})} placeholder="在这里写正文..." />

            <button onClick={() => { setLoading(true); fetch('/api/post', { method: 'POST', body: JSON.stringify({ ...form, id: currentId }) }).then(() => { setView('list'); fetchPosts(); }) }} disabled={loading || !isFormValid} style={{width:'100%', padding:'20px', background: !isFormValid ? '#222' : '#fff', color: !isFormValid ? '#666' : '#000', border:'none', borderRadius:'12px', fontWeight:'bold', fontSize:'16px', marginTop:'40px', cursor: isFormValid ? 'pointer' : 'not-allowed'}} className="btn-active">确认发布</button>
          </main>
        )}

        {/* 🟢 预览浮层组件 */}
        {previewData && (
          <div className="modal-bg" onClick={() => setPreviewData(null)}>
            <div className="modal-box" onClick={e => e.stopPropagation()}>
              <div style={{padding:'20px 25px', borderBottom:'1px solid #333', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                <div style={{fontWeight:'900', fontSize:'18px'}}>预览: {previewData.title}</div>
                <button onClick={() => setPreviewData(null)} style={{background:'none', border:'none', color:'#666', fontSize:'24px', cursor:'pointer'}}>×</button>
              </div>
              <div className="modal-body">
                {previewData.cover && <img src={previewData.cover} style={{width:'100%', borderRadius:'12px', marginBottom:'20px'}} />}
                <div style={{fontSize:'12px', color:'#007aff', marginBottom:'10px'}}>{previewData.category} · {previewData.date}</div>
                <NotionView blocks={previewData.rawBlocks} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const css = {
  labelWhite: { display: 'block', fontSize: '11px', color: '#fff', marginBottom: '10px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1.5px' },
  iconBtn: { background: '#202024', border: '1px solid #333', color: '#666', cursor: 'pointer', borderRadius: '8px', width: '34px', height: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  iconActive: { background: '#007aff', border: '1px solid #007aff', color: '#fff', cursor: 'pointer', borderRadius: '8px', width: '34px', height: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  toolBtn: { background: '#424242', color: '#fff', border: '1px solid #555', padding: '6px 15px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', flex: 1 },
};
