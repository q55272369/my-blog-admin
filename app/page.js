'use client';
import React, { useState, useEffect } from 'react';
import MarkdownIt from 'markdown-it';
import MdEditor from 'react-markdown-editor-lite';
import 'react-markdown-editor-lite/lib/index.css';

const mdParser = new MarkdownIt();

export default function Home() {
  const [view, setView] = useState('list');
  const [posts, setPosts] = useState([]);
  const [currentId, setCurrentId] = useState(null);
  
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  // 🟢 修正：变量名改为 excerpt
  const [excerpt, setExcerpt] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);

  // 👇🔴🔴🔴 请在这里修改你的真实地址 🔴🔴🔴👇
  const LSKY_URL = "https://x1pic.top/dashboard"; 
  const CLOUDREVE_URL = "https://x1file.top/home"; 

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/posts');
      const data = await res.json();
      if (data.success) {
        setPosts(data.posts);
      } else {
        console.error(data.error);
      }
    } catch (e) { console.error(e); } 
    finally { setLoading(false); }
  };

  useEffect(() => { 
    if (view === 'list') fetchPosts(); 
  }, [view]);

  const handleCreate = () => {
    setCurrentId(null); 
    setTitle(''); setSlug(''); setExcerpt(''); setContent(''); 
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
        // 🟢 修正：读取 excerpt
        setExcerpt(data.data.excerpt); 
        setContent(data.data.content); 
        setView('edit');
      } else {
        alert('读取文章失败: ' + data.error);
      }
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
        body: JSON.stringify({ 
            id: currentId, 
            // 🟢 修正：发送 excerpt
            title, slug, excerpt, content 
        }),
      });
      const data = await res.json();
      
      if (data.success) { 
        alert(currentId ? '✅ 更新成功！' : '🎉 发布成功！'); 
        setView('list'); 
      } else { 
        alert('❌ 失败: ' + (data.error || '未知错误')); 
      }
    } catch (e) { alert('网络错误'); } 
    finally { setLoading(false); }
  };

  const openPopup = (url) => {
    window.open(url, 'UploadWindow', 'width=600,height=700,resizable=yes,scrollbars=yes,status=yes');
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '20px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', borderBottom: '1px solid #eee', paddingBottom: '20px' }}>
        <h2 style={{ margin: 0, fontSize: '24px' }}>Notion CMS</h2>
        {view === 'edit' && (
            <button onClick={() => setView('list')} style={backBtnStyle}>🔙 返回列表</button>
        )}
      </div>

      {view === 'list' && (
        <div>
            <button onClick={handleCreate} style={createBtnStyle}>➕ 新建文章</button>
            {loading && posts.length === 0 ? <p style={{color:'#666'}}>加载中...</p> : (
                <div style={{ border: '1px solid #eee', borderRadius: '8px', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                        <thead style={{ background: '#f9fafb' }}>
                            <tr>
                                <th style={{...thStyle, width: '60%'}}>文章标题</th>
                                <th style={{...thStyle, width: '20%'}}>状态</th>
                                <th style={{...thStyle, width: '20%', textAlign:'right'}}>操作</th>
                            </tr>
                        </thead>
                        <tbody>
                            {posts.map(p => (
                                <tr key={p.id} style={{ borderBottom: '1px solid #eee' }}>
                                    <td style={tdStyle}>
                                        <div style={{fontWeight:'500'}}>{p.title}</div>
                                        <div style={{fontSize:'12px', color:'#888', marginTop:'4px'}}>{p.slug}</div>
                                    </td>
                                    <td style={tdStyle}>
                                        <span style={{ 
                                            padding: '2px 8px', borderRadius: '4px', fontSize: '12px',
                                            background: p.status === 'Published' ? '#def7ec' : '#fde8e8',
                                            color: p.status === 'Published' ? '#03543f' : '#9b1c1c'
                                        }}>
                                            {p.status}
                                        </span>
                                    </td>
                                    <td style={{...tdStyle, textAlign:'right'}}>
                                        <button onClick={() => handleEdit(p)} style={editBtnStyle}>✏️ 编辑</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
      )}

      {view === 'edit' && (
        <div>
           <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '12px', marginBottom: '20px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '15px' }}>
                <span style={{fontSize:'14px', fontWeight:'bold', color: '#166534'}}>📦 素材助手：</span>
                <button onClick={() => openPopup(LSKY_URL)} style={toolBtnStyle}>🖼️ 兰空图床</button>
                <button onClick={() => openPopup(CLOUDREVE_URL)} style={toolBtnStyle}>🎬 Cloudreve</button>
           </div>

           <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '20px' }}>
                <input style={inputStyle} placeholder="文章标题 (Title)" value={title} onChange={e => setTitle(e.target.value)} />
                <div style={{ display: 'flex', gap: '15px' }}>
                    <div style={{flex: 1}}>
                        <input style={inputStyle} placeholder="网址别名 (Slug) - 必填" value={slug} onChange={e => setSlug(e.target.value)} />
                    </div>
                    <div style={{flex: 2}}>
                        {/* 🟢 修正：提示改为摘要 (Excerpt) */}
                        <input style={inputStyle} placeholder="文章摘要 (Excerpt) - 选填" value={excerpt} onChange={e => setExcerpt(e.target.value)} />
                    </div>
                </div>
           </div>

           <div style={{ height: '600px', border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
                <MdEditor 
                    value={content} 
                    style={{ height: '100%' }} 
                    renderHTML={text => mdParser.render(text)} 
                    onChange={({ text }) => setContent(text)} 
                    placeholder="开始你的创作..."
                />
           </div>

           <button 
                onClick={handleSubmit} 
                disabled={loading} 
                style={{
                    ...submitBtnStyle, 
                    background: loading ? '#ccc' : '#000',
                    cursor: loading ? 'not-allowed' : 'pointer'
                }}
           >
                {loading ? '⏳ 正在处理中...' : (currentId ? '💾 保存修改' : '🚀 立即发布')}
           </button>
        </div>
      )}
    </div>
  );
}

const btnBase = { border: 'none', borderRadius: '6px', cursor: 'pointer', transition: '0.2s' };
const createBtnStyle = { ...btnBase, padding: '10px 20px', background: '#000', color: '#fff', fontSize: '14px', fontWeight: '500', marginBottom: '20px' };
const backBtnStyle = { ...btnBase, padding: '8px 15px', background: '#f3f4f6', color: '#374151', fontSize: '13px' };
const editBtnStyle = { ...btnBase, padding: '6px 12px', background: '#fff', border: '1px solid #d1d5db', color: '#374151', fontSize: '12px' };
const toolBtnStyle = { ...btnBase, padding: '6px 12px', background: '#fff', border: '1px solid #16a34a', color: '#166534', fontSize: '13px', fontWeight: '600', display:'flex', alignItems:'center', gap:'4px' };
const submitBtnStyle = { ...btnBase, width: '100%', marginTop: '20px', padding: '16px', color: '#fff', fontSize: '16px', fontWeight: 'bold' };
const inputStyle = { width: '100%', padding: '12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '15px', outline: 'none', boxSizing: 'border-box' };
const thStyle = { padding: '12px 16px', textAlign: 'left', color: '#4b5563', fontWeight: '600', borderBottom: '1px solid #e5e7eb' };
const tdStyle = { padding: '16px', verticalAlign: 'middle' };