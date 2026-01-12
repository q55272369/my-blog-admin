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
        body: JSON.stringify({ id: currentId,
