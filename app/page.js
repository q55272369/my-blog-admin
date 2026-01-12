'use client';
import React, { useState, useEffect, useRef } from 'react';

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [view, setView] = useState('list');
  const [posts, setPosts] = useState([]);
  const [options, setOptions] = useState({ categories: [], tags: [] });
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('Post');

  const [form, setForm] = useState({ title: '', slug: '', excerpt: '', content: '', category: '', tags: '', cover: '', status: 'Published', type: 'Post', date: '' });
  const [currentId, setCurrentId] = useState(null);
  const [rawLinks, setRawLinks] = useState('');
  const [mdLinks, setMdLinks] = useState('');

  const textAreaRef = useRef(null);

  // 🔴 必填校验：标题、分类、日期
  const isFormValid = form.title.trim() !== '' && form.category.trim() !== '' && form.date !== '';

  useEffect(() => {
    setMounted(true);
    fetchPosts();
    const style = document.head.appendChild(document.createElement('style'));
    style.innerHTML = `
      body { background-color: #121212; color: #e1e1e3; margin: 0; font-family: "Inter", system-ui, sans-serif; }
      .list-card { background: #18181c; border: 1px solid #2d2d30; border-radius: 12px; padding: 20px; margin-bottom: 12px; cursor: pointer; transition: 0.3s; position: relative; overflow: hidden; }
      .list-card:hover { border-color: #007aff; background: #202024; transform: translateY(-2px); }
      .delete-btn { position: absolute; right: -80px; top: 0; bottom: 0; width: 80px; background: #ff4d4f; color: #fff; display: flex; align-items: center; justify-content: center; transition: 0.3s; font-weight: bold; }
      .list-card:hover .delete-btn { right: 0; }
      .btn-click:active { transform: scale(0.97); }
      .required-star { color: #ff4d4f; margin-left: 3px; font-weight: bold; }
      .preview-area { background: #121212; border: 1px solid #333; border-radius: 8px; padding: 15px; min-height: 100px; margin-top: 10px; color: #fff; line-height: 1.6; }
      input, select, textarea { transition: 0.2s; outline: none; }
      input:focus, textarea:focus { border-color: #007aff !important; }
    `;
  }, []);

  async function fetchPosts() {
    setLoading(true);
    try {
      const res = await fetch('/api/posts');
      const data = await res.json();
      if (data.success) {
        setPosts(data.posts || []);
        setOptions(data.options || { categories: [], tags: [] });
      }
    } finally { setLoading(false); }
  }

  const insertText = (before, after = '') => {
    const el = textAreaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = el.value.substring(start, end);
    const newText = el.value.substring(0, start) + before + selected + after + el.value.substring(end);
    setForm({ ...form, content: newText });
    setTimeout(() => { el.focus(); el.setSelectionRange(start + before.length, end + before.length); }, 10);
  };

  const handleEdit = (post) => {
    setLoading(true);
    fetch(`/api/post?id=${post.id}`).then(res => res.json()).then(data => {
      if (data.success) { setForm(data.data); setCurrentId(post.id); setView('edit'); }
    }).finally(() => setLoading(false));
  };

  if (!mounted) return null;

  return (
    <div style={{ minHeight: '100vh', background: '#121212' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '40px 20px' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
          <div style={{ fontSize: '22px', fontWeight: '900' }}>CMS<span style={{ color: '#007aff' }}>CONSOLE</span></div>
          {view === 'edit' && <button onClick={() => setView('list')} className="btn-click" style={css.btnBack}>返回</button>}
        </header>

        {view === 'list' ? (
          <main>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div style={css.tabs}>
                {['Post', 'Widget'].map(t => (
                  <button key={t} onClick={() => setActiveTab(t)} style={activeTab === t ? css.tabActive : css.tab}>{t}</button>
                ))}
              </div>
              <button onClick={() => { setForm({ title: '', slug: 'p-' + Date.now().toString(36), excerpt: '', content: '', category: '', tags: '', cover: '', status: 'Published', type: 'Post', date: new Date().toISOString().split('T')[0] }); setCurrentId(null); setView('edit'); }} style={css.btnNew}>新建文章</button>
            </div>
            {posts.filter(p => p.type === activeTab).map(p => (
              <div key={p.id} onClick={() => handleEdit(p)} className="list-card">
                <div style={{ fontWeight: 'bold', fontSize: '18px', marginBottom: '8px' }}>{p.title}</div>
                <div style={{ color: '#666', fontSize: '13px' }}>{p.category} · {p.date || '无日期'}</div>
                <div onClick={(e) => { e.stopPropagation(); if (confirm('删除？')) { fetch('/api/post?id=' + p.id, { method: 'DELETE' }).then(() => fetchPosts()) } }} className="delete-btn">删除</div>
              </div>
            ))}
          </main>
        ) : (
          <main style={css.formPanel}>
            {/* 标题行 */}
            <div style={{ marginBottom: '20px' }}>
              <label style={css.label}>标题<span className="required-star">*</span></label>
              <input style={css.input} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="输入文章标题..." />
            </div>

            {/* 分类、日期、状态行 */}
            <div style={css.grid3}>
              <div><label style={css.label}>分类<span className="required-star">*</span></label><input list="cats" autoComplete="off" style={css.input} value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} /><datalist id="cats">{options.categories.map(o => <option key={o} value={o} />)}</datalist></div>
              <div><label style={css.label}>日期<span className="required-star">*</span></label><input type="date" style={css.input} value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></div>
              <div><label style={css.label}>状态</label><select style={css.input} value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}><option value="Published">公开</option><option value="Hidden">隐藏</option></select></div>
            </div>

            {/* 独立行：标签、封面、摘要 */}
            <div style={{ marginBottom: '20px' }}><label style={css.label}>标签 (点击快捷添加)</label>
              <input style={{ ...css.input, marginBottom: '8px' }} value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} />
              <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>{options.tags.map(t => (<span key={t} className="tag-chip" onClick={() => { const current = form.tags.split(',').filter(Boolean); if (!current.includes(t)) setForm({ ...form, tags: [...current, t].join(',') }) }}>{t}</span>))}</div>
            </div>
            <div style={{ marginBottom: '20px' }}><label style={css.label}>封面图链接 (Cover URL)</label><input style={css.input} value={form.cover} onChange={e => setForm({ ...form, cover: e.target.value })} /></div>
            <div style={{ marginBottom: '20px' }}><label style={css.label}>摘要 (Excerpt)</label><input style={css.input} value={form.excerpt} onChange={e => setForm({ ...form, excerpt: e.target.value })} /></div>

            {/* 工具箱 1: 批量直链转换 */}
            <div style={css.toolBox}>
              <div style={{ fontSize: '11px', color: '#666', fontWeight: 'bold', marginBottom: '10px' }}>批量链接转 MD</div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <textarea style={{ ...css.toolInput, height: '45px' }} placeholder="粘贴直链..." value={rawLinks} onChange={e => setRawLinks(e.target.value)} />
                <button onClick={() => { setMdLinks(rawLinks.split('\n').filter(l => l.trim()).map(u => `![image](${u.trim()})`).join('\n')) }} style={css.toolAction}>转换</button>
              </div>
              {mdLinks && <button onClick={() => { navigator.clipboard.writeText(mdLinks); alert('复制成功'); }} style={css.miniBtn}>复制 Markdown 结果</button>}
            </div>

            {/* 工具箱 2: 文字编辑工具栏 */}
            <div style={css.toolbarContainer}>
              <button className="toolbar-btn" onClick={() => insertText('# ', '')}>H1</button>
              <button className="toolbar-btn" onClick={() => insertText('**', '**')}>B</button>
              <button className="toolbar-btn" onClick={() => insertText('[', '](url)')}>Link</button>
              <button className="toolbar-btn" onClick={() => insertText('[', ']{red}')} style={{ color: 'red' }}>Red</button>
              <button className="toolbar-btn" onClick={() => insertText('[', ']{blue}')} style={{ color: 'blue' }}>Blue</button>
              <button className="toolbar-btn" onClick={() => insertText('[', ']{green}')} style={{ color: 'green' }}>Green</button>
              <button className="toolbar-btn" style={{ marginLeft: 'auto' }} onClick={() => window.open(LSKY_URL)}>🖼️ 图床</button>
              <button className="toolbar-btn" onClick={() => window.open(CLOUDREVE_URL)}>🎬 网盘</button>
            </div>

            {/* 编辑区域 */}
            <textarea ref={textAreaRef} style={css.textarea} value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} placeholder="开始你的创作..." />

            <button onClick={() => {
              setLoading(true);
              fetch('/api/post', { method: 'POST', body: JSON.stringify({ ...form, id: currentId }) }).then(() => { setView('list'); fetchPosts(); })
            }} disabled={loading || !isFormValid} style={!isFormValid ? css.btnDisabled : css.btnSave}>
              {loading ? '同步中...' : '🚀 确认发布 / 覆盖更新'}
            </button>
          </main>
        )}
      </div>
    </div>
  );
}

const css = {
  btnBack: { padding: '8px 20px', background: '#2d2d30', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' },
  tabs: { background: '#18181c', padding: '4px', borderRadius: '12px', display: 'flex' },
  tab: { padding: '8px 25px', border: 'none', background: 'none', color: '#666', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' },
  tabActive: { padding: '8px 25px', border: 'none', background: '#333', color: '#fff', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold' },
  btnNew: { padding: '10px 24px', background: '#007aff', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' },
  formPanel: { background: '#18181c', padding: '30px', borderRadius: '20px', border: '1px solid #2d2d30' },
  label: { display: 'block', fontSize: '10px', color: '#666', marginBottom: '10px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1.5px' },
  input: { width: '100%', padding: '14px', background: '#121212', border: '1px solid #333', borderRadius: '10px', color: '#fff', marginBottom: '10px', boxSizing: 'border-box', fontSize: '15px' },
  grid3: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '20px' },
  toolbarContainer: { background: '#202024', padding: '10px', borderRadius: '8px 8px 0 0', display: 'flex', gap: '10px', border: '1px solid #333', borderBottom: 'none' },
  textarea: { width: '100%', height: '450px', background: '#121212', border: '1px solid #333', borderRadius: '0 0 10px 10px', color: '#fff', padding: '15px', fontFamily: 'monospace', lineHeight: '1.6', boxSizing: 'border-box', fontSize: '16px' },
  toolBox: { background: '#202024', padding: '15px', borderRadius: '12px', marginBottom: '20px', border: '1px solid #333' },
  toolInput: { flex: 1, padding: '10px', background: '#121212', border: '1px solid #333', color: '#fff', borderRadius: '8px', fontSize: '12px', resize: 'none' },
  toolAction: { padding: '0 20px', background: '#333', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '12px' },
  miniBtn: { marginTop: '10px', padding: '8px', background: '#333', color: '#007aff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', width: '100%' },
  btnSave: { width: '100%', padding: '20px', background: '#fff', color: '#000', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px', marginTop: '30px' },
  btnDisabled: { width: '100%', padding: '20px', background: '#333', color: '#666', border: 'none', borderRadius: '12px', cursor: 'not-allowed', marginTop: '30px' }
};
