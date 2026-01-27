export default {
  async fetch(request, env) {
    try {
      const url = new URL(request.url);
      const path = url.pathname;
      
      console.log('Request to:', path);
      
      // Routes - SIMPLIFIED VERSION
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
        return new Response(JSON.stringify({
          success: true,
          cdn_url: `https://${url.hostname}/cdn/test-file`,
          message: 'Upload would work with R2, but using D1 only for now'
        }), { headers: { 'Content-Type': 'application/json' } });
      }
      else if (path === '/api/files' && request.method === 'GET') {
        // Return test data instead of querying D1
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
        // Return sample file
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
    <script>
      // Simple inline React app
      const App = () => {
        return React.createElement('div', {style: {padding: '20px'}}, [
          React.createElement('h1', null, '🚀 CDN Platform'),
          React.createElement('p', null, 'Worker is running!'),
          React.createElement('button', {
            onClick: () => alert('Upload feature needs R2 storage')
          }, 'Test Upload'),
          React.createElement('button', {
            onClick: () => window.open('/cdn/test-file', '_blank')
          }, 'Test CDN URL')
        ]);
      };
      
      ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(App));
    </script>
    <style>
        body { font-family: Arial; padding: 20px; }
        button { margin: 10px; padding: 10px 20px; }
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
        alert(\`Uploaded: \${file.name}\\nMessage: \${data.message}\`);
      } catch (error) {
        alert(\`Failed: \${error.message}\`);
      }
    }
    
    setUploading(false);
  };
  
  return React.createElement('div', { style: { border: '2px dashed #ccc', padding: '40px', textAlign: 'center' } }, [
    React.createElement('h2', null, '📁 Upload Files'),
    React.createElement('input', {
      type: 'file',
      multiple: true,
      onChange: handleUpload,
      disabled: uploading
    }),
    uploading && React.createElement('p', null, 'Uploading...'),
    React.createElement('p', {style: {color: '#666', fontSize: '14px'}}, 
      'Note: File storage requires R2 bucket configuration')
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
  
  return React.createElement('div', null, [
    React.createElement('h2', null, '📄 Example Files'),
    files.length === 0 ? 
      React.createElement('p', null, 'No files available. Upload some!') :
      files.map(file => 
        React.createElement('div', { 
          key: file.id, 
          style: { border: '1px solid #ddd', padding: '10px', margin: '5px 0' }
        }, [
          React.createElement('strong', null, file.name),
          React.createElement('p', null, \`\${file.size} bytes • \${file.type}\`),
          React.createElement('code', {style: {display: 'block', background: '#f5f5f5', padding: '5px'}}, 
            file.cdn_url
          ),
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
