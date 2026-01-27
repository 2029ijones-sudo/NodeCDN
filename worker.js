export default {
  async fetch(request, env) {
    try {
      const url = new URL(request.url);
      const path = url.pathname;
      
      console.log('Request to:', path);
      
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
      else if (path === '/src/App.jsx') {
        return serveAppJSX(); // ADD THIS
      }
      else if (path === '/api/upload' && request.method === 'POST') {
        return new Response(JSON.stringify({
          success: true,
          cdn_url: `https://${url.hostname}/cdn/test-file`,
          message: 'Upload would work with R2'
        }), { headers: { 'Content-Type': 'application/json' } });
      }
      else if (path === '/api/files' && request.method === 'GET') {
        return new Response(JSON.stringify({
          files: [
            {
              id: 'test-1',
              name: 'example.js',
              size: 1024,
              type: 'application/javascript',
              upload_time: new Date().toISOString(),
              cdn_url: `https://${url.hostname}/cdn/test-1`
            }
          ]
        }), { headers: { 'Content-Type': 'application/json' } });
      }
      else if (path.startsWith('/cdn/')) {
        const fileId = path.split('/').pop();
        return new Response(`// CDN File: ${fileId}\nconsole.log('Hello from CDN');`, {
          headers: {
            'Content-Type': 'application/javascript',
            'Cache-Control': 'public, max-age=3600'
          }
        });
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
    <title>CDN Platform</title>
    <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
    <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
    <script type="module" src="/src/App.jsx"></script> <!-- FIX: Import App.jsx -->
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

// ADD THIS FUNCTION
function serveAppJSX() {
  const jsx = `
import Upload from './Upload.jsx';
import FileList from './FileList.jsx';

const App = () => {
  return React.createElement('div', null, [
    React.createElement('h1', {key: 'title'}, '🚀 CDN Platform'),
    React.createElement('p', {key: 'desc'}, 'Upload files and get CDN URLs instantly'),
    React.createElement(Upload, {key: 'upload'}),
    React.createElement(FileList, {key: 'filelist'})
  ]);
};

ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(App));
`;
  
  return new Response(jsx, { 
    headers: { 'Content-Type': 'application/javascript' } 
  });
}

function serveUploadJSX() {
  const jsx = `const Upload = () => {
  const [uploading, setUploading] = React.useState(false);
  
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
        alert(\`Uploaded: \${file.name}\\nURL: \${data.cdn_url}\\n\${data.message}\`);
      } catch (error) {
        alert(\`Failed: \${error.message}\`);
      }
    }
    
    setUploading(false);
  };
  
  return React.createElement('div', { className: 'upload-area' }, [
    React.createElement('h2', null, '📁 Upload Files to CDN'),
    React.createElement('input', {
      type: 'file',
      multiple: true,
      onChange: handleUpload,
      disabled: uploading
    }),
    uploading && React.createElement('p', null, 'Uploading...'),
    React.createElement('p', {style: {color: '#666', fontSize: '14px', marginTop: '10px'}}, 
      'Note: Files are stored temporarily for demo. Add R2 for permanent storage.'
    )
  ]);
};

export default Upload;`;
  
  return new Response(jsx, { 
    headers: { 'Content-Type': 'application/javascript' } 
  });
}

function serveFileListJSX() {
  const jsx = `const FileList = () => {
  const [files, setFiles] = React.useState([]);
  
  React.useEffect(() => {
    fetch('/api/files')
      .then(response => response.json())
      .then(data => setFiles(data.files || []));
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
  
  return React.createElement('div', null, [
    React.createElement('h2', null, '📄 Uploaded Files'),
    files.length === 0 ? 
      React.createElement('p', null, 'No files uploaded yet. Upload some above!') :
      files.map(file => 
        React.createElement('div', { 
          key: file.id, 
          className: 'file-item'
        }, [
          React.createElement('strong', null, file.name),
          React.createElement('p', null, \`\${formatSize(file.size)} • \${file.type}\`),
          React.createElement('code', null, file.cdn_url),
          React.createElement('button', {
            onClick: () => copyToClipboard(file.cdn_url)
          }, 'Copy URL'),
          React.createElement('button', {
            onClick: () => window.open(file.cdn_url, '_blank')
          }, 'Open File')
        ])
      )
  ]);
};

export default FileList;`;
  
  return new Response(jsx, { 
    headers: { 'Content-Type': 'application/javascript' } 
  });
}
