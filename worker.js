import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://aehdpjpsmeppdwinhdos.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFlaGRwanBzbWVwcGR3aW5oZG9zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1NTIzOTksImV4cCI6MjA4NTEyODM5OX0.9vF6fQWHaZgt-buPv4ui-Lo6VisAPdBJiFZVik8WKGI'

export default {
  async fetch(request, env) {
    try {
      const url = new URL(request.url);
      const path = url.pathname;
      
      console.log('Request to:', path);
      
      // Initialize Supabase client
      const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      
      // Routes
      if (path === '/' || path === '/index.html') {
        return serveIndex();
      }
      else if (path === '/api/upload' && request.method === 'POST') {
        return handleUpload(request, supabase);
      }
      else if (path === '/api/files' && request.method === 'GET') {
        return handleGetFiles(supabase);
      }
      else if (path.startsWith('/cdn/')) {
        return handleCDN(path, supabase);
      }
      
      return new Response('Not Found', { status: 404 });
      
    } catch (error) {
      console.error('Worker error:', error);
      return new Response(`Error: ${error.message}`, { 
        status: 500,
        headers: { 'Content-Type': 'text/plain' }
      });
    }
  }
};

function serveIndex() {
  const html = `<!DOCTYPE html>
<html>
<head>
    <title>CDN Platform with Supabase</title>
    <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
    <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
    <script>
      // Simple inline React app - NO .jsx files needed
      const { useState, useEffect } = React;
      
      const Upload = () => {
        const [uploading, setUploading] = useState(false);
        
        const handleUpload = async (e) => {
          const files = Array.from(e.target.files);
          setUploading(true);
          
          for (const file of files) {
            const formData = new FormData();
            formData.append('file', file);
            
            try {
              const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData
              });
              const data = await response.json();
              
              if (data.success) {
                alert('Uploaded: ' + file.name + '\\nDirect URL: ' + data.directUrl + '\\nCDN URL: ' + data.cdnUrl);
                window.location.reload();
              } else {
                alert('Upload failed: ' + data.error);
              }
            } catch (error) {
              alert('Error: ' + error.message);
            }
          }
          
          setUploading(false);
        };
        
        return React.createElement('div', { 
          className: 'upload-area',
          style: { border: '2px dashed #ccc', padding: '40px', textAlign: 'center', margin: '20px 0', borderRadius: '10px' }
        }, [
          React.createElement('h2', null, 'Upload Files to CDN'),
          React.createElement('input', {
            type: 'file',
            multiple: true,
            onChange: handleUpload,
            disabled: uploading
          }),
          uploading && React.createElement('p', null, 'Uploading to Supabase...'),
          React.createElement('p', {style: {color: '#666', fontSize: '14px', marginTop: '10px'}}, 
            'Files are stored in Supabase Storage and served via CDN'
          )
        ]);
      };
      
      const FileList = () => {
        const [files, setFiles] = useState([]);
        const [loading, setLoading] = useState(true);
        
        useEffect(() => {
          fetchFiles();
        }, []);
        
        const fetchFiles = async () => {
          try {
            const response = await fetch('/api/files');
            const data = await response.json();
            setFiles(data.files || []);
          } catch (error) {
            console.error('Error fetching files:', error);
          } finally {
            setLoading(false);
          }
        };
        
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
        
        return React.createElement('div', null, [
          React.createElement('h2', null, 'Files in CDN'),
          loading ? 
            React.createElement('p', null, 'Loading files...') :
            files.length === 0 ? 
              React.createElement('p', null, 'No files uploaded yet. Upload some above!') :
              files.map(file => 
                React.createElement('div', { 
                  key: file.id, 
                  className: 'file-item',
                  style: { border: '1px solid #ddd', padding: '15px', margin: '10px 0', borderRadius: '5px' }
                }, [
                  React.createElement('strong', null, file.name),
                  React.createElement('p', null, 
                    formatSize(file.size) + ' • ' + file.type
                  ),
                  React.createElement('code', {style: {background: '#f5f5f5', padding: '5px', display: 'block', fontFamily: 'monospace'}}, 
                    file.cdnUrl
                  ),
                  React.createElement('div', {style: {marginTop: '10px'}}, [
                    React.createElement('button', {
                      onClick: () => copyToClipboard(file.cdnUrl),
                      style: {background: '#2ecc71', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '4px', margin: '5px'}
                    }, 'Copy URL'),
                    React.createElement('button', {
                      onClick: () => window.open(file.cdnUrl, '_blank'),
                      style: {background: '#3498db', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '4px', margin: '5px'}
                    }, 'Open File')
                  ])
                ])
              )
        ]);
      };
      
      const App = () => {
        return React.createElement('div', {style: {fontFamily: 'Arial', padding: '20px', maxWidth: '800px', margin: '0 auto'}}, [
          React.createElement('h1', {key: 'title'}, 'CDN Platform with Supabase'),
          React.createElement('p', {key: 'desc'}, 'Upload files and get CDN URLs instantly'),
          React.createElement(Upload, {key: 'upload'}),
          React.createElement(FileList, {key: 'filelist'})
        ]);
      };
      
      ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(App));
    </script>
    <style>
        body { font-family: Arial; padding: 20px; max-width: 800px; margin: 0 auto; }
        .upload-area { border: 2px dashed #ccc; padding: 40px; text-align: center; margin: 20px 0; border-radius: 10px; }
        .file-item { padding: 15px; border: 1px solid #ddd; margin: 10px 0; border-radius: 5px; }
        button { background: #0066cc; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; margin: 5px; }
        input[type="file"] { margin: 10px 0; padding: 10px; }
        code { background: #f5f5f5; padding: 5px; display: block; font-family: monospace; }
    </style>
</head>
<body>
    <div id="root"></div>
</body>
</html>`;
  
  return new Response(html, { 
    headers: { 'Content-Type': 'text/html' } 
  });
}

async function handleUpload(request, supabase) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    
    if (!file) {
      return Response.json({ success: false, error: 'No file provided' });
    }
    
    const fileId = crypto.randomUUID();
    const fileName = fileId + '-' + file.name.replace(/[^a-zA-Z0-9.]/g, '-');
    const fileBuffer = await file.arrayBuffer();
    
    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('cdn-files')
      .upload(fileName, fileBuffer, {
        contentType: file.type,
        upsert: false
      });
    
    if (error) {
      throw new Error('Supabase upload error: ' + error.message);
    }
    
    // Get public URL from Supabase
    const { data: { publicUrl } } = supabase.storage
      .from('cdn-files')
      .getPublicUrl(fileName);
    
    // Also provide a CDN URL through your worker
    const cdnUrl = 'https://' + request.headers.get('host') + '/cdn/' + fileName;
    
    return Response.json({
      success: true,
      fileId: fileId,
      fileName: file.name,
      size: file.size,
      type: file.type,
      directUrl: publicUrl,
      cdnUrl: cdnUrl,
      message: 'File uploaded successfully to Supabase Storage'
    });
    
  } catch (error) {
    console.error('Upload error:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}

async function handleGetFiles(supabase) {
  try {
    const { data: files, error } = await supabase.storage
      .from('cdn-files')
      .list();
    
    if (error) throw error;
    
    const fileList = await Promise.all(files.map(async (file) => {
      const { data: { publicUrl } } = supabase.storage
        .from('cdn-files')
        .getPublicUrl(file.name);
      
      return {
        id: file.id,
        name: file.name.split('-').slice(1).join('-'), // Remove UUID prefix
        originalName: file.name,
        size: file.metadata?.size || 0,
        type: file.metadata?.mimetype || 'unknown',
        cdnUrl: 'https://' + new URL(publicUrl).host + '/cdn/' + file.name,
        directUrl: publicUrl,
        updated: file.updated_at
      };
    }));
    
    return Response.json({ files: fileList });
  } catch (error) {
    console.error('Get files error:', error);
    return Response.json({ 
      files: [],
      error: error.message 
    });
  }
}

async function handleCDN(path, supabase) {
  const fileName = path.split('/').pop();
  
  try {
    // Get the public URL from Supabase
    const { data: { publicUrl } } = supabase.storage
      .from('cdn-files')
      .getPublicUrl(fileName);
    
    // Fetch the file from Supabase
    const response = await fetch(publicUrl);
    
    if (!response.ok) {
      throw new Error('File not found in Supabase');
    }
    
    // Return the file with caching headers
    return new Response(response.body, {
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'application/octet-stream',
        'Cache-Control': 'public, max-age=31536000',
        'Access-Control-Allow-Origin': '*',
        'X-CDN-Source': 'Supabase Storage'
      }
    });
    
  } catch (error) {
    console.error('CDN error:', error);
    return new Response('File not found', { status: 404 });
  }
}
