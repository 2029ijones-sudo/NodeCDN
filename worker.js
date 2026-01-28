import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://aehdpjpsmeppdwinhdos.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFlaGRwanBzbWVwcGR3aW5oZG9zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1NTIzOTksImV4cCI6MjA4NTEyODM5OX0.9vF6fQWHaZgt-buPv4ui-Lo6VisAPdBJiFZVik8WKGI'

export default {
  async fetch(request, env) {
    try {
      const url = new URL(request.url);
      const path = url.pathname;
      
      // Initialize Supabase client
      const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      
      // Routes
      if (path === '/' || path === '/index.html') {
        return serveIndex();
      }
      else if (path === '/api/upload' && request.method === 'POST') {
        return await handleUpload(request, supabase);
      }
      else if (path === '/api/files' && request.method === 'GET') {
        return await handleGetFiles(supabase);
      }
      else if (path.startsWith('/cdn/')) {
        return await handleCDN(path, supabase);
      }
      
      return new Response('Not Found', { status: 404 });
      
    } catch (error) {
      console.error('Worker error:', error);
      return new Response(`Error: ${error.message}\nStack: ${error.stack}`, { 
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
    <title>CDN Platform</title>
    <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
    <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
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
    
    <script>
      // SIMPLE REACT APP THAT ACTUALLY WORKS
      console.log('Script loaded');
      
      const { useState, useEffect } = React;
      
      // Upload Component
      const Upload = () => {
        const [uploading, setUploading] = useState(false);
        
        const handleUpload = async (e) => {
          const files = Array.from(e.target.files);
          if (files.length === 0) return;
          
          setUploading(true);
          
          const file = files[0]; // Just upload first file for simplicity
          const formData = new FormData();
          formData.append('file', file);
          
          try {
            const response = await fetch('/api/upload', {
              method: 'POST',
              body: formData
            });
            const data = await response.json();
            
            if (data.success) {
              alert('Uploaded: ' + file.name + '\\nCDN URL: ' + data.cdnUrl);
              window.location.reload();
            } else {
              alert('Upload failed: ' + data.error);
            }
          } catch (error) {
            alert('Error: ' + error.message);
          } finally {
            setUploading(false);
          }
        };
        
        return React.createElement('div', { 
          style: { border: '2px dashed #ccc', padding: '40px', textAlign: 'center', margin: '20px 0', borderRadius: '10px' }
        }, [
          React.createElement('h2', null, 'Upload Files to CDN'),
          React.createElement('input', {
            type: 'file',
            onChange: handleUpload,
            disabled: uploading
          }),
          uploading && React.createElement('p', null, 'Uploading...')
        ]);
      };
      
      // FileList Component
      const FileList = () => {
        const [files, setFiles] = useState([]);
        const [loading, setLoading] = useState(true);
        
        useEffect(() => {
          fetch('/api/files')
            .then(res => res.json())
            .then(data => {
              setFiles(data.files || []);
              setLoading(false);
            })
            .catch(err => {
              console.error('Error:', err);
              setLoading(false);
            });
        }, []);
        
        const copyToClipboard = (text) => {
          navigator.clipboard.writeText(text);
          alert('Copied to clipboard!');
        };
        
        if (loading) {
          return React.createElement('p', null, 'Loading files...');
        }
        
        if (files.length === 0) {
          return React.createElement('p', null, 'No files uploaded yet.');
        }
        
        return React.createElement('div', null, [
          React.createElement('h2', null, 'Uploaded Files'),
          ...files.map(file => 
            React.createElement('div', { 
              key: file.id,
              style: { border: '1px solid #ddd', padding: '15px', margin: '10px 0', borderRadius: '5px' }
            }, [
              React.createElement('strong', null, file.name),
              React.createElement('p', null, file.size + ' bytes • ' + file.type),
              React.createElement('code', {style: {display: 'block', background: '#f5f5f5', padding: '5px'}}, 
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
      
      // Main App Component
      const App = () => {
        return React.createElement('div', null, [
          React.createElement('h1', null, 'CDN Platform'),
          React.createElement('p', null, 'Upload files and get CDN URLs'),
          React.createElement(Upload, null),
          React.createElement(FileList, null)
        ]);
      };
      
      // RENDER THE APP - THIS IS WHAT WAS MISSING
      console.log('Rendering app...');
      const rootElement = document.getElementById('root');
      if (rootElement) {
        const root = ReactDOM.createRoot(rootElement);
        root.render(React.createElement(App));
        console.log('App rendered successfully');
      } else {
        console.error('Root element not found');
      }
    </script>
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
    
    console.log('Uploading to Supabase:', fileName, file.type, file.size);
    
    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('cdn-files')
      .upload(fileName, fileBuffer, {
        contentType: file.type,
        upsert: false
      });
    
    if (error) {
      console.error('Supabase error:', error);
      throw new Error('Supabase upload error: ' + error.message);
    }
    
    // Get public URL from Supabase
    const { data: { publicUrl } } = supabase.storage
      .from('cdn-files')
      .getPublicUrl(fileName);
    
    // Also provide a CDN URL through your worker
    const host = request.headers.get('host');
    const cdnUrl = 'https://' + host + '/cdn/' + fileName;
    
    return Response.json({
      success: true,
      fileId: fileId,
      fileName: file.name,
      size: file.size,
      type: file.type,
      directUrl: publicUrl,
      cdnUrl: cdnUrl,
      message: 'File uploaded successfully'
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
    console.log('Getting files from Supabase...');
    
    const { data: files, error } = await supabase.storage
      .from('cdn-files')
      .list();
    
    if (error) {
      console.error('Supabase list error:', error);
      throw error;
    }
    
    console.log('Found files:', files?.length || 0);
    
    const fileList = await Promise.all((files || []).map(async (file) => {
      const { data: { publicUrl } } = supabase.storage
        .from('cdn-files')
        .getPublicUrl(file.name);
      
      return {
        id: file.id,
        name: file.name.split('-').slice(1).join('-') || file.name,
        originalName: file.name,
        size: file.metadata?.size || 0,
        type: file.metadata?.mimetype || 'application/octet-stream',
        cdnUrl: 'https://' + new URL(publicUrl).host + '/cdn/' + file.name,
        directUrl: publicUrl,
        updated: file.updated_at
      };
    }));
    
    return Response.json({ 
      success: true,
      files: fileList 
    });
    
  } catch (error) {
    console.error('Get files error:', error);
    return Response.json({ 
      success: false,
      files: [],
      error: error.message 
    });
  }
}

async function handleCDN(path, supabase) {
  const fileName = path.split('/').pop();
  
  try {
    console.log('CDN request for:', fileName);
    
    // Get the public URL from Supabase
    const { data: { publicUrl } } = supabase.storage
      .from('cdn-files')
      .getPublicUrl(fileName);
    
    console.log('Redirecting to:', publicUrl);
    
    // Redirect to Supabase URL
    return Response.redirect(publicUrl, 302);
    
  } catch (error) {
    console.error('CDN error:', error);
    return new Response('File not found: ' + fileName, { status: 404 });
  }
}
