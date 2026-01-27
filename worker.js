// Simple Cloudflare Worker with D1
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    
    // Create table if not exists
    await env.DB.exec(`
      CREATE TABLE IF NOT EXISTS files (
        id TEXT PRIMARY KEY,
        name TEXT,
        size INTEGER,
        type TEXT,
        upload_time DATETIME DEFAULT CURRENT_TIMESTAMP,
        cdn_url TEXT
      );
    `);
    
    // Routes
    if (path === '/' || path === '/index.html') {
      return serveIndex();
    }
    else if (path === '/src/Upload.jsx') {
      return serveUploadJSX();
    }
    else if (path === '/src/FileList.jsx') {
      return serveFileListJSX();
    }
    else if (path === '/api/upload' && request.method === 'POST') {
      return handleUpload(request, env);
    }
    else if (path === '/api/files' && request.method === 'GET') {
      return handleGetFiles(env);
    }
    else if (path.startsWith('/cdn/')) {
      return serveCDNFile(path, env);
    }
    
    return new Response('Not Found', { status: 404 });
  }
};

function serveIndex() {
  const html = `<!DOCTYPE html>
<html>
<head>
    <title>CDN Platform</title>
    <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
    <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
    <script type="module" src="/src/App.jsx"></script>
    <style>
        body { font-family: Arial; padding: 20px; }
        .upload-area { border: 2px dashed #ccc; padding: 40px; text-align: center; margin: 20px 0; }
        .file-item { padding: 10px; border: 1px solid #ddd; margin: 5px 0; }
    </style>
</head>
<body>
    <div id="root"></div>
</body>
</html>`;
  return new Response(html, { headers: { 'Content-Type': 'text/html' } });
}

function serveUploadJSX() {
  const jsx = `import React from 'react';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import _ from 'lodash';

export default function Upload() {
  const [uploading, setUploading] = React.useState(false);
  
  const handleUpload = async (e) => {
    const files = Array.from(e.target.files);
    setUploading(true);
    
    for (const file of files) {
      const formData = new FormData();
      formData.append('file', file);
      
      try {
        const response = await axios.post('/api/upload', formData);
        alert(\`Uploaded: \${file.name}\\nURL: \${response.data.cdn_url}\`);
      } catch (error) {
        alert(\`Failed to upload \${file.name}\`);
      }
    }
    
    setUploading(false);
    window.location.reload();
  };
  
  return React.createElement('div', { className: 'upload-area' }, [
    React.createElement('h2', null, '📁 Upload Files to CDN'),
    React.createElement('input', {
      type: 'file',
      multiple: true,
      onChange: handleUpload,
      disabled: uploading
    }),
    uploading && React.createElement('p', null, 'Uploading...')
  ]);
}`;
  
  return new Response(jsx, { 
    headers: { 'Content-Type': 'application/javascript' } 
  });
}

function serveFileListJSX() {
  const jsx = `import React from 'react';
import axios from 'axios';
import moment from 'moment';
import _ from 'lodash';
import { marked } from 'marked';
import CryptoJS from 'crypto-js';

export default function FileList() {
  const [files, setFiles] = React.useState([]);
  
  React.useEffect(() => {
    axios.get('/api/files').then(response => {
      setFiles(response.data.files);
    });
  }, []);
  
  const formatSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };
  
  const getFileHash = (url) => {
    return CryptoJS.MD5(url).toString();
  };
  
  return React.createElement('div', { className: 'file-list' }, [
    React.createElement('h2', null, '📄 Uploaded Files'),
    files.length === 0 ? 
      React.createElement('p', null, 'No files uploaded yet.') :
      files.map(file => 
        React.createElement('div', { key: file.id, className: 'file-item' }, [
          React.createElement('strong', null, file.name),
          React.createElement('p', null, \`\${formatSize(file.size)} • \${file.type} • \${moment(file.upload_time).fromNow()}\`),
          React.createElement('input', {
            type: 'text',
            readOnly: true,
            value: file.cdn_url,
            style: { width: '100%', margin: '5px 0' }
          }),
          React.createElement('button', {
            onClick: () => copyToClipboard(file.cdn_url)
          }, 'Copy CDN URL'),
          React.createElement('button', {
            onClick: () => window.open(file.cdn_url, '_blank')
          }, 'Open File')
        ])
      )
  ]);
}`;
  
  return new Response(jsx, { 
    headers: { 'Content-Type': 'application/javascript' } 
  });
}

async function handleUpload(request, env) {
  const formData = await request.formData();
  const file = formData.get('file');
  
  // Generate ID
  const { v4: uuidv4 } = await import('uuid');
  const fileId = uuidv4();
  
  // Store in R2
  await env.BUCKET.put(`cdn/${fileId}`, file);
  
  // Save to D1 database
  await env.DB.prepare(
    `INSERT INTO files (id, name, size, type, cdn_url) 
     VALUES (?, ?, ?, ?, ?)`
  ).bind(
    fileId,
    file.name,
    file.size,
    file.type,
    `https://${request.headers.get('host')}/cdn/${fileId}`
  ).run();
  
  return Response.json({
    success: true,
    cdn_url: `https://${request.headers.get('host')}/cdn/${fileId}`,
    file_id: fileId
  });
}

async function handleGetFiles(env) {
  const { results } = await env.DB.prepare(
    `SELECT * FROM files ORDER BY upload_time DESC`
  ).all();
  
  return Response.json({ files: results });
}

async function serveCDNFile(path, env) {
  const fileId = path.split('/').pop();
  const file = await env.BUCKET.get(`cdn/${fileId}`);
  
  if (!file) {
    return new Response('File not found', { status: 404 });
  }
  
  return new Response(file.body, {
    headers: {
      'Content-Type': file.httpMetadata.contentType || 'application/octet-stream',
      'Cache-Control': 'public, max-age=31536000',
      'Access-Control-Allow-Origin': '*'
    }
  });
}
