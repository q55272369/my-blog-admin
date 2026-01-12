'use client';
import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic'; // 🟢 新增：用于动态加载
import MarkdownIt from 'markdown-it';
import 'react-markdown-editor-lite/lib/index.css';

// 🟢 关键修复：禁止编辑器在服务器端运行，防止 Application Error 崩溃
const MdEditor = dynamic(() => import('react-markdown-editor-lite'), {
  ssr: false,
  loading: () => <div style={{height: '500px', background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>编辑器加载中...</div>
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
  const [fetchError, setFetchError] = useState(null); // 🟢 记录错误原因

  // 🔴 请修改为你的真实图床/网盘地址
  const LSKY_URL = "https://img.你的域名.com/dashboard"; 
  const CLOUDREVE_URL = "https://pan.你的域名.com/home"; 

  useEffect(() => { setMounted(true); }, []);

  const fetchPosts = async () => {
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
      setFetchError('网络请求出错，请检查 API');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    if (mounted && view === 'list') fetchPosts(); 
  }, [view, mounted]);

  if (!mounted) return <div style={{padding:'20px'}}>系统初始化...</div>;

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
        alert('读取文章失败: ' + data.error);
      }
    } catch(e) {
      alert('无法连接到后台');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!title || !slug) return alert('标题和 Slug 是必填项！');
    if (currentId && !confirm('确定要保存修改吗？')) return;
    setLoading(true);
    try {
      const res = await fetch('/api/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: currentId, title, slug, excerpt, content }),
      });
      const data = await res.json();
      if (data.success) { 
        alert('🎉 操作成功！'); 
        setView('list'); 
      } else { 
        alert('❌ 提交失败: ' + data.error); 
      }
    } catch (e) { alert('提交时发生网络错误'); } 
    finally { setLoading(false); }
  };

  const openPopup = (url) => {
    window.open(url, 'UploadWindow', 'width=800,height=700,resizable=yes,scrollbars=yes');
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '20px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', borderBottom: '1px solid #eee', paddingBottom: '20px' }}>
        <h2 style={{ margin: 0, color: '#333' }}>Notion 内容管理</h2>
        {view === 'edit' && <button onClick={() => setView('list')} style={btnStyle}>🔙 返回列表</button>}
      </div>

      {view === 'list' && (
        <div>
            <button onClick={handleCreate} style={createBtnStyle}>➕ 新建文章</button>
            
            {loading && <p style={{color:'#666'}}>📡 正在同步 Notion 数据...</p>}
            
            {fetchError && (
              <div style={{padding:'20px', background:'#fff5f5', color:'#c53030', borderRadius:'8px', border:'1px solid #feb2b2', marginBottom:'20px'}}>
                <strong>⚠️ 同步失败：</strong> {fetchError}
                <p style={{fontSize:'12px', marginTop:'10px'}}>请检查 Cloudflare 后台的环境变量（Secret）是否填对。</p>
              </div>
            )}

            {!loading && !fetchError && (
              <div style={{ border: '1px solid #eee', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
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
                                  <td style={tdStyle}>
                                    <div style={{fontWeight:'bold'}}>{p.title}</div>
                                    <div style={{fontSize:'11px', color:'#999'}}>{p.slug}</div>
                                  </td>
                                  <td style={tdStyle}>
                                      <span style={{ 
                                          padding: '2px 8px', borderRadius: '4px', fontSize: '11px',
                                          background: p.status === 'Published' ? '#def7ec' : '#fef3c7',
                                          color: p.status === 'Published' ? '#03543f' : '#92400e'
                                      }}>
                                          {p.status}
                                      </span>
                                  </td>
                                  <td style={{...tdStyle, textAlign:'right'}}>
                                      <button onClick={() => handleEdit(p)} style={editBtnStyle}>✏️ 编辑</button>
                                  </td>
                              </tr>
                          ))}
                          {posts.length === 0 && !loading && (
                              <tr><td colSpan="3" style={{padding:'40px', textAlign:'center', color:'#999'}}>数据库里没有文章，快去写一篇吧！</td></tr>
                          )}
                      </tbody>
                  </table>
              </div>
            )}
        </div>
      )}

      {view === 'edit' && (
        <div>
           <div style={{ background: '#f0fdf4', padding: '12px', marginBottom: '20px', borderRadius: '8px', display:'flex', gap:'12px', alignItems:'center' }}>
                <span style={{fontSize:'13px', fontWeight:'bold', color:'#166534'}}>📦 素材助手：</span>
                <button onClick={() => openPopup(LSKY_URL)} style={toolBtnStyle}>🖼️ 兰空图床</button>
                <button onClick={() => openPopup(CLOUDREVE_URL)} style={toolBtnStyle}>🎬 Cloudreve</button>
           </div>
           
           <div style={{display:'flex', flexDirection:'column', gap:'15px', marginBottom:'20px'}}>
             <input style={inputStyle} placeholder="文章标题 (title)" value={title} onChange={e => setTitle(e.target.value)} />
             <div style={{display:'flex', gap:'10px'}}>
                  <input style={{...inputStyle, flex:1}} placeholder="别名 (slug)" value={slug} onChange={e => setSlug(e.target.value)} />
                  <input style={{...inputStyle, flex:2}} placeholder="摘要 (excerpt)" value={excerpt} onChange={e => setExcerpt(e.target.value)} />
             </div>
           </div>

           <div style={{ height: '550px', border: '1px solid #ddd', borderRadius: '6px', overflow: 'hidden' }}>
                <MdEditor 
                  value={content} 
                  style={{height:'100%'}} 
                  renderHTML={text => mdParser.render(text)} 
                  onChange={({text}) => setContent(text)} 
                  placeholder="使用 Markdown 开始创作..."
                />
           </div>
           
           <button onClick={handleSubmit} disabled={loading} style={submitBtnStyle}>
                {loading ? '⏳ 处理中...' : (currentId ? '💾 保存修改' : '🚀 立即发布')}
           </button>
        </div>
      )}
    </div>
  );
}

// 样式定义
const btnStyle = { padding: '8px 16px', borderRadius: '6px', border: '1px solid #ddd', cursor: 'pointer', background: '#fff', fontSize: '13px' };
const createBtnStyle = { padding: '10px 24px', background: '#000', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', marginBottom: '20px', fontWeight: 'bold' };
const editBtnStyle = { padding: '5px 12px', borderRadius: '4px', border: '1px solid #ddd', cursor: 'pointer', background: '#fff', fontSize: '12px' };
const toolBtnStyle = { padding: '6px 12px', borderRadius: '4px', border: '1px solid #16a34a', color: '#166534', cursor: 'pointer', background: '#fff', fontWeight: 'bold', fontSize: '12px' };
const inputStyle = { width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #ddd', outline: 'none', boxSizing: 'border-box' };
const submitBtnStyle = { width: '100%', marginTop: '20px', padding: '16px', background: '#000', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '16px' };
const thStyle = { padding: '12px 15px', textAlign: 'left', borderBottom: '1px solid #eee', fontSize: '12px', color: '#666', textTransform: 'uppercase' };
const tdStyle = { padding: '15px', fontSize: '14px' };
