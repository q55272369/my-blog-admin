'use client';
import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import MarkdownIt from 'markdown-it';
import 'react-markdown-editor-lite/lib/index.css';

// 🟢 彻底隔离编辑器，防止服务器端渲染崩溃
const MdEditor = dynamic(() => import('react-markdown-editor-lite'), {
  ssr: false,
  loading: () => <div style={{height: '500px', background: '#f9f9f9', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>编辑器努力加载中...</div>
});

const mdParser = new MarkdownIt();

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [view, setView] = useState('list');
  const [posts, setPosts] = useState([]);
  const [currentId, setCurrentId] = useState(null);
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState(null);

  // 🔴 修改为你的真实地址
  const LSKY_URL = "https://img.你的域名.com/dashboard"; 
  const CLOUDREVE_URL = "https://pan.你的域名.com/home"; 

  // 只在客户端挂载
  useEffect(() => { setMounted(true); }, []);

  const fetchPosts = async () => {
    if (!mounted) return;
    setLoading(true);
    setFetchError(null);
    try {
      const res = await fetch('/api/posts');
      const data = await res.json();
      if (data.success) {
        setPosts(data.posts || []);
      } else {
        setFetchError(data.error || '获取数据失败');
      }
    } catch (e) {
      setFetchError('无法连接后台 API');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    if (mounted && view === 'list') fetchPosts(); 
  }, [view, mounted]);

  // 如果没有挂载，返回空白，防止 Next.js 预渲染报错
  if (!mounted) return null;

  const handleCreate = () => {
    setCurrentId(null); setTitle(''); setSlug(''); setExcerpt(''); setContent(''); 
    setView('edit');
  };

  const handleEdit = async (post) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/post?id=${post.id}`);
      const data = await res.json();
      if (data.success) {
        setCurrentId(post.id); 
        setTitle(data.data.title || ''); 
        setSlug(data.data.slug || '');
        setExcerpt(data.data.excerpt || ''); 
        setContent(data.data.content || ''); 
        setView('edit');
      } else {
        alert('读取失败: ' + data.error);
      }
    } catch(e) {
      alert('网络错误');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!title || !slug) return alert('标题和 Slug 是必填项！');
    setLoading(true);
    try {
      const res = await fetch('/api/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: currentId, title, slug, excerpt, content }),
      });
      const data = await res.json();
      if (data.success) { 
        alert('操作成功！'); 
        setView('list'); 
      } else { 
        alert('提交失败: ' + data.error); 
      }
    } catch (e) { alert('提交出错'); } 
    finally { setLoading(false); }
  };

  const openPopup = (url) => {
    window.open(url, 'UploadWindow', 'width=800,height=700');
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '20px', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', borderBottom: '1px solid #eee', paddingBottom: '20px' }}>
        <h2 style={{ margin: 0 }}>Notion CMS {view === 'edit' && ' - 文章编辑'}</h2>
        {view === 'edit' && <button onClick={() => setView('list')} style={{padding:'8px 15px', cursor:'pointer'}}>🔙 返回列表</button>}
      </div>

      {view === 'list' && (
        <div key="list-view">
            <button onClick={handleCreate} style={{padding:'10px 20px', background:'#000', color:'#fff', border:'none', borderRadius:'6px', cursor:'pointer', marginBottom:'20px'}}>➕ 新建文章</button>
            
            {loading && <p>📡 同步中...</p>}
            
            {fetchError && (
              <div style={{padding:'15px', background:'#fff5f5', color:'#c53030', borderRadius:'6px', marginBottom:'20px', fontSize:'14px'}}>
                ⚠️ <strong>错误：</strong> {fetchError}
              </div>
            )}

            {!loading && !fetchError && (
              <div style={{ border: '1px solid #eee', borderRadius: '8px', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead style={{ background: '#f9fafb' }}>
                          <tr>
                              <th style={{padding:'12px', textAlign:'left', fontSize:'13px', color:'#666'}}>文章</th>
                              <th style={{padding:'12px', textAlign:'right', fontSize:'13px', color:'#666'}}>操作</th>
                          </tr>
                      </thead>
                      <tbody>
                          {posts.map(p => (
                              <tr key={p.id} style={{ borderBottom: '1px solid #eee' }}>
                                  <td style={{padding:'12px'}}>
                                    <div style={{fontWeight:'bold'}}>{p.title}</div>
                                    <div style={{fontSize:'12px', color:'#999'}}>{p.slug}</div>
                                  </td>
                                  <td style={{padding:'12px', textAlign:'right'}}>
                                      <button onClick={() => handleEdit(p)} style={{padding:'5px 10px', cursor:'pointer'}}>✏️ 编辑</button>
                                  </td>
                              </tr>
                          ))}
                          {posts.length === 0 && !loading && <tr><td colSpan="2" style={{padding:'40px', textAlign:'center', color:'#999'}}>暂无文章</td></tr>}
                      </tbody>
                  </table>
              </div>
            )}
        </div>
      )}

      {view === 'edit' && (
        <div key="edit-view">
           <div style={{ background: '#f0fdf4', padding: '12px', marginBottom: '20px', borderRadius: '8px', display:'flex', gap:'12px' }}>
                <button onClick={() => openPopup(LSKY_URL)} style={{padding:'6px 12px', cursor:'pointer', color:'#166534', fontWeight:'bold', border:'1px solid #16a34a', borderRadius:'4px'}}>🖼️ 兰空图床</button>
                <button onClick={() => openPopup(CLOUDREVE_URL)} style={{padding:'6px 12px', cursor:'pointer', color:'#166534', fontWeight:'bold', border:'1px solid #16a34a', borderRadius:'4px'}}>🎬 Cloudreve</button>
           </div>
           
           <input style={{width:'100%', padding:'12px', borderRadius:'6px', border:'1px solid #ddd', boxSizing:'border-box', marginBottom:'15px'}} placeholder="文章标题 (Title)" value={title} onChange={e => setTitle(e.target.value)} />
           <div style={{display:'flex', gap:'10px', marginBottom:'15px'}}>
                <input style={{flex:1, padding:'10px', borderRadius:'6px', border:'1px solid #ddd'}} placeholder="别名 (Slug)" value={slug} onChange={e => setSlug(e.target.value)} />
                <input style={{flex:2, padding:'10px', borderRadius:'6px', border:'1px solid #ddd'}} placeholder="摘要 (Excerpt)" value={excerpt} onChange={e => setExcerpt(e.target.value)} />
           </div>

           <div style={{ height: '550px', border: '1px solid #ddd', borderRadius: '6px', overflow: 'hidden' }}>
                <MdEditor 
                  value={content} 
                  style={{height:'100%'}} 
                  renderHTML={text => mdParser.render(text)} 
                  onChange={({text}) => setContent(text)} 
                  placeholder="使用 Markdown 创作..."
                />
           </div>
           
           <button onClick={handleSubmit} disabled={loading} style={{width:'100%', marginTop:'20px', padding:'16px', background:'#000', color:'#fff', border:'none', borderRadius:'6px', fontWeight:'bold', cursor:'pointer'}}>
                {loading ? '⏳ 处理中...' : '🚀 立即保存 / 发布'}
           </button>
        </div>
      )}
    </div>
  );
}

const btnStyle = { padding: '8px 16px', borderRadius: '6px', border: '1px solid #ddd', cursor: 'pointer', background: '#fff', fontSize: '13px' };
