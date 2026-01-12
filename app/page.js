'use client';
import React, { useState, useEffect } from 'react';
import MarkdownIt from 'markdown-it';
import MdEditor from 'react-markdown-editor-lite';
import 'react-markdown-editor-lite/lib/index.css';

const mdParser = new MarkdownIt();

export default function Home() {
  // 🟢 关键：防止服务器端渲染导致崩溃
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const [view, setView] = useState('list');
  const [posts, setPosts] = useState([]);
  const [currentId, setCurrentId] = useState(null);
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);

  // 🔴 记得在这里填入你的真实地址
  const LSKY_URL = "https://img.你的域名.com/dashboard"; 
  const CLOUDREVE_URL = "https://pan.你的域名.com/home"; 

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/posts');
      const data = await res.json();
      if (data.success) {
        setPosts(data.posts || []);
      }
    } catch (e) { console.error('Fetch Error:', e); } 
    finally { setLoading(false); }
  };

  useEffect(() => { 
    if (mounted && view === 'list') fetchPosts(); 
  }, [view, mounted]);

  // 如果还没挂载，显示简单提示，不加载编辑器组件
  if (!mounted) return <div style={{padding:'20px'}}>系统启动中...</div>;

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
        setTitle(data.data.title); 
        setSlug(data.data.slug);
        setExcerpt(data.data.excerpt); 
        setContent(data.data.content); 
        setView('edit');
      } else { alert('读取失败: ' + data.error); }
    } catch(e) { alert('网络错误'); } 
    finally { setLoading(false); }
  };

  const handleSubmit = async () => {
    if (!title || !slug) return alert('标题和 Slug 是必填项！');
    if (currentId && !confirm('确定要覆盖更新这篇文章吗？')) return;
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
      } else { alert('错误: ' + data.error); }
    } catch (e) { alert('网络错误'); } 
    finally { setLoading(false); }
  };

  const openPopup = (url) => {
    window.open(url, 'UploadWindow', 'width=600,height=700,resizable=yes,scrollbars=yes');
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '20px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', borderBottom: '1px solid #eee', paddingBottom: '20px' }}>
        <h2 style={{ margin: 0 }}>Notion CMS {currentId ? ' (编辑)' : ''}</h2>
        {view === 'edit' && <button onClick={() => setView('list')} style={btnStyle}>🔙 返回列表</button>}
      </div>

      {view === 'list' && (
        <div>
            <button onClick={handleCreate} style={{...btnStyle, background:'#000', color:'#fff', marginBottom:'20px'}}>➕ 新建文章</button>
            <div style={{ border: '1px solid #eee', borderRadius: '8px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{ background: '#f9fafb' }}>
                        <tr>
                            <th style={thStyle}>文章标题</th>
                            <th style={thStyle}>状态</th>
                            <th style={{...thStyle, textAlign:'right'}}>操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        {posts.map(p => (
                            <tr key={p.id} style={{ borderBottom: '1px solid #eee' }}>
                                <td style={tdStyle}>{p.title}</td>
                                <td style={tdStyle}>{p.status}</td>
                                <td style={{...tdStyle, textAlign:'right'}}>
                                    <button onClick={() => handleEdit(p)} style={editBtnStyle}>✏️ 编辑</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
      )}

      {view === 'edit' && (
        <div>
           <div style={{ background: '#f0fdf4', padding: '12px', marginBottom: '20px', borderRadius: '8px', display:'flex', gap:'10px' }}>
                <button onClick={() => openPopup(LSKY_URL)} style={toolBtnStyle}>🖼️ 兰空图床</button>
                <button onClick={() => openPopup(CLOUDREVE_URL)} style={toolBtnStyle}>🎬 Cloudreve</button>
           </div>
           <input style={inputStyle} placeholder="文章标题" value={title} onChange={e => setTitle(e.target.value)} />
           <div style={{display:'flex', gap:'10px', marginBottom:'15px'}}>
                <input style={{...inputStyle, flex:1}} placeholder="Slug (网址别名)" value={slug} onChange={e => setSlug(e.target.value)} />
                <input style={{...inputStyle, flex:2}} placeholder="摘要 (Excerpt)" value={excerpt} onChange={e => setExcerpt(e.target.value)} />
           </div>
           <div style={{ height: '500px', border: '1px solid #ddd', borderRadius:'4px', overflow:'hidden' }}>
                <MdEditor value={content} style={{height:'100%'}} renderHTML={text => mdParser.render(text)} onChange={({text}) => setContent(text)} />
           </div>
           <button onClick={handleSubmit} disabled={loading} style={submitBtnStyle}>
                {loading ? '⏳ 处理中...' : '🚀 立即保存 / 发布'}
           </button>
        </div>
      )}
    </div>
  );
}

const btnStyle = { padding: '8px 16px', borderRadius: '6px', border: '1px solid #ccc', cursor: 'pointer', background: '#fff' };
const editBtnStyle = { padding: '4px 8px', borderRadius: '4px', border: '1px solid #ddd', cursor: 'pointer', background: '#fff', fontSize: '12px' };
const toolBtnStyle = { padding: '6px 12px', borderRadius: '4px', border: '1px solid #16a34a', color: '#166534', cursor: 'pointer', background: '#fff', fontWeight:'bold' };
const inputStyle = { width: '100%', padding: '12px', marginBottom: '15px', borderRadius: '6px', border: '1px solid #ddd' };
const submitBtnStyle = { width: '100%', marginTop: '20px', padding: '15px', background: '#000', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' };
const thStyle = { padding: '12px', textAlign: 'left', borderBottom: '1px solid #eee', fontSize: '13px', color: '#666' };
const tdStyle = { padding: '12px', fontSize: '14px' };
