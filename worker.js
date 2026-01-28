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
    <title>CDN Platform - Bulk Upload</title>
    <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
    <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
    <style>
        body { font-family: Arial; padding: 20px; max-width: 800px; margin: 0 auto; }
        .upload-area { border: 2px dashed #ccc; padding: 40px; text-align: center; margin: 20px 0; border-radius: 10px; }
        .file-item { padding: 15px; border: 1px solid #ddd; margin: 10px 0; border-radius: 5px; }
        .selected-files { margin: 20px 0; }
        .selected-file { padding: 10px; background: #f8f9fa; margin: 5px 0; border-radius: 5px; }
        button { background: #0066cc; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; margin: 5px; }
        .upload-all-btn { background: #2ecc71; font-weight: bold; padding: 12px 24px; }
        .cancel-btn { background: #e74c3c; }
        input[type="file"] { margin: 10px 0; padding: 10px; }
        code { background: #f5f5f5; padding: 5px; display: block; font-family: monospace; font-size: 14px; }
        .progress { height: 20px; background: #eee; border-radius: 10px; margin: 10px 0; overflow: hidden; }
        .progress-bar { height: 100%; background: #3498db; transition: width 0.3s; }
    </style>
</head>
<body>
    <div id="root"></div>
    
    <script>
      const { useState, useEffect } = React;
      
      // Upload Component with multiple file support
      const Upload = () => {
        const [uploading, setUploading] = useState(false);
        const [selectedFiles, setSelectedFiles] = useState([]);
        const [uploadProgress, setUploadProgress] = useState({});
        
        const handleFileSelect = (e) => {
          const files = Array.from(e.target.files);
          if (files.length === 0) return;
          
          const newFiles = files.map(file => ({
            id: crypto.randomUUID(),
            file: file,
            name: file.name,
            size: file.size,
            type: file.type,
            status: 'pending', // pending, uploading, uploaded, error
            progress: 0,
            cdnUrl: null,
            error: null
          }));
          
          setSelectedFiles(prev => [...prev, ...newFiles]);
          e.target.value = ''; // Reset file input
        };
        
        const removeFile = (id) => {
          setSelectedFiles(prev => prev.filter(f => f.id !== id));
        };
        
        const clearAllFiles = () => {
          setSelectedFiles([]);
          setUploadProgress({});
        };
        
        const uploadAllFiles = async () => {
          if (selectedFiles.length === 0) {
            alert('Please select files first');
            return;
          }
          
          setUploading(true);
          
          // Update all files to uploading status
          setSelectedFiles(prev => prev.map(f => ({
            ...f,
            status: 'uploading',
            progress: 0
          })));
          
          let uploadedCount = 0;
          const results = [];
          
          for (let i = 0; i < selectedFiles.length; i++) {
            const fileObj = selectedFiles[i];
            
            try {
              // Update progress for this file
              setSelectedFiles(prev => prev.map(f => 
                f.id === fileObj.id ? { ...f, progress: 10 } : f
              ));
              
              const formData = new FormData();
              formData.append('file', fileObj.file);
              
              // Send upload request
              const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData
              });
              
              const data = await response.json();
              
              if (data.success) {
                // Update file with success
                setSelectedFiles(prev => prev.map(f => 
                  f.id === fileObj.id ? { 
                    ...f, 
                    status: 'uploaded', 
                    progress: 100,
                    cdnUrl: data.cdnUrl,
                    directUrl: data.directUrl
                  } : f
                ));
                results.push({ name: fileObj.name, success: true, url: data.cdnUrl });
              } else {
                // Update file with error
                setSelectedFiles(prev => prev.map(f => 
                  f.id === fileObj.id ? { 
                    ...f, 
                    status: 'error', 
                    progress: 0,
                    error: data.error
                  } : f
                ));
                results.push({ name: fileObj.name, success: false, error: data.error });
              }
              
            } catch (error) {
              // Update file with error
              setSelectedFiles(prev => prev.map(f => 
                f.id === fileObj.id ? { 
                  ...f, 
                  status: 'error', 
                  progress: 0,
                  error: error.message
                } : f
              ));
              results.push({ name: fileObj.name, success: false, error: error.message });
            }
            
            uploadedCount++;
            
            // Update overall progress
            const overallProgress = Math.round((uploadedCount / selectedFiles.length) * 100);
            setUploadProgress({ overall: overallProgress });
          }
          
          setUploading(false);
          
          // Show summary
          const successful = results.filter(r => r.success).length;
          const failed = results.filter(r => !r.success).length;
          
          if (successful > 0) {
            alert(\`✅ Upload complete!\\n\\nSuccessful: \${successful} files\\nFailed: \${failed} files\\n\\nPage will reload to show new files.\`);
            setTimeout(() => window.location.reload(), 2000);
          } else if (failed > 0) {
            alert(\`❌ All uploads failed. Check console for details.\`);
          }
        };
        
        const formatSize = (bytes) => {
          if (bytes === 0) return '0 Bytes';
          const k = 1024;
          const sizes = ['Bytes', 'KB', 'MB', 'GB'];
          const i = Math.floor(Math.log(bytes) / Math.log(k));
          return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        };
        
        const getStatusColor = (status) => {
          switch(status) {
            case 'uploaded': return '#2ecc71';
            case 'uploading': return '#3498db';
            case 'error': return '#e74c3c';
            default: return '#95a5a6';
          }
        };
        
        const getStatusText = (status) => {
          switch(status) {
            case 'uploaded': return '✅ Uploaded';
            case 'uploading': return '⏳ Uploading...';
            case 'error': return '❌ Error';
            default: return '📄 Ready';
          }
        };
        
        return React.createElement('div', null, [
          React.createElement('div', { 
            key: 'upload-area',
            style: { border: '2px dashed #ccc', padding: '40px', textAlign: 'center', margin: '20px 0', borderRadius: '10px' }
          }, [
            React.createElement('h2', null, '📁 Upload Multiple Files to CDN'),
            React.createElement('p', null, 'Select multiple files at once (Ctrl+Click or drag & drop)'),
            React.createElement('input', {
              type: 'file',
              multiple: true,
              onChange: handleFileSelect,
              disabled: uploading,
              style: { padding: '15px', fontSize: '16px' }
            }),
            
            uploading && uploadProgress.overall && 
              React.createElement('div', {key: 'progress', style: {margin: '20px 0'}}, [
                React.createElement('p', null, \`Uploading: \${uploadProgress.overall}%\`),
                React.createElement('div', {className: 'progress'}, 
                  React.createElement('div', {
                    className: 'progress-bar',
                    style: {width: \`\${uploadProgress.overall}%\`}
                  })
                )
              ])
          ]),
          
          selectedFiles.length > 0 && React.createElement('div', {key: 'selected-files', className: 'selected-files'}, [
            React.createElement('div', {style: {display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px'}}, [
              React.createElement('h3', null, \`Selected Files (\${selectedFiles.length})\`),
              React.createElement('div', null, [
                selectedFiles.some(f => f.status === 'pending') && 
                  React.createElement('button', {
                    onClick: uploadAllFiles,
                    disabled: uploading,
                    className: 'upload-all-btn',
                    style: {marginRight: '10px'}
                  }, uploading ? 'Uploading...' : \`Upload All (\${selectedFiles.length} files)\`),
                
                React.createElement('button', {
                  onClick: clearAllFiles,
                  disabled: uploading,
                  className: 'cancel-btn'
                }, 'Clear All')
              ])
            ]),
            
            ...selectedFiles.map(fileObj => 
              React.createElement('div', {
                key: fileObj.id,
                className: 'selected-file',
                style: { 
                  borderLeft: \`4px solid \${getStatusColor(fileObj.status)}\`,
                  opacity: fileObj.status === 'uploaded' ? 0.8 : 1
                }
              }, [
                React.createElement('div', {style: {display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}, [
                  React.createElement('div', null, [
                    React.createElement('strong', null, fileObj.name),
                    React.createElement('p', {style: {margin: '5px 0', fontSize: '14px', color: '#666'}}, 
                      \`\${formatSize(fileObj.size)} • \${fileObj.type || 'Unknown type'}\`
                    )
                  ]),
                  
                  React.createElement('div', {style: {textAlign: 'right'}}, [
                    React.createElement('span', {
                      style: { 
                        color: getStatusColor(fileObj.status),
                        fontWeight: 'bold',
                        fontSize: '14px'
                      }
                    }, getStatusText(fileObj.status)),
                    
                    fileObj.status !== 'uploading' && 
                      React.createElement('button', {
                        onClick: () => removeFile(fileObj.id),
                        disabled: uploading,
                        style: { 
                          background: 'transparent', 
                          color: '#e74c3c', 
                          padding: '5px 10px',
                          fontSize: '12px',
                          marginLeft: '10px'
                        }
                      }, '✕')
                  ])
                ]),
                
                fileObj.status === 'uploading' && 
                  React.createElement('div', {className: 'progress', style: {marginTop: '10px'}}, 
                    React.createElement('div', {
                      className: 'progress-bar',
                      style: {width: \`\${fileObj.progress}%\`}
                    })
                  ),
                
                fileObj.status === 'uploaded' && fileObj.cdnUrl &&
                  React.createElement('div', {style: {marginTop: '10px'}}, [
                    React.createElement('code', {style: {fontSize: '12px'}}, fileObj.cdnUrl),
                    React.createElement('button', {
                      onClick: () => navigator.clipboard.writeText(fileObj.cdnUrl),
                      style: { 
                        background: '#2ecc71', 
                        color: 'white', 
                        border: 'none', 
                        padding: '5px 10px',
                        fontSize: '12px',
                        marginTop: '5px',
                        borderRadius: '3px'
                      }
                    }, 'Copy URL')
                  ]),
                
                fileObj.status === 'error' && fileObj.error &&
                  React.createElement('p', {style: {color: '#e74c3c', fontSize: '12px', marginTop: '5px'}}, 
                    \`Error: \${fileObj.error}\`
                  )
              ])
            )
          ])
        ]);
      };
      
      // FileList Component
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
            console.error('Error:', error);
          } finally {
            setLoading(false);
          }
        };
        
        const copyToClipboard = (text) => {
          navigator.clipboard.writeText(text);
          alert('✅ Copied to clipboard!');
        };
        
        const formatSize = (bytes) => {
          if (bytes === 0) return '0 Bytes';
          const k = 1024;
          const sizes = ['Bytes', 'KB', 'MB', 'GB'];
          const i = Math.floor(Math.log(bytes) / Math.log(k));
          return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        };
        
        if (loading) {
          return React.createElement('p', null, 'Loading files...');
        }
        
        if (files.length === 0) {
          return React.createElement('p', null, 'No files uploaded yet.');
        }
        
        return React.createElement('div', null, [
          React.createElement('h2', null, '📄 All Uploaded Files'),
          React.createElement('p', null, \`Total: \${files.length} files\`),
          ...files.map(file => 
            React.createElement('div', { 
              key: file.id,
              className: 'file-item',
              style: { border: '1px solid #ddd', padding: '15px', margin: '10px 0', borderRadius: '5px' }
            }, [
              React.createElement('div', {style: {display: 'flex', justifyContent: 'space-between', alignItems: 'start'}}, [
                React.createElement('div', {style: {flex: 1}}, [
                  React.createElement('strong', null, file.name),
                  React.createElement('p', {style: {margin: '5px 0', color: '#666', fontSize: '14px'}}, 
                    \`\${formatSize(file.size)} • \${file.type} • \${new Date(file.updated).toLocaleDateString()}\`
                  ),
                  React.createElement('code', {style: {display: 'block', background: '#f5f5f5', padding: '5px', margin: '5px 0', fontSize: '12px'}}, 
                    file.cdnUrl
                  ),
                  React.createElement('code', {style: {display: 'block', background: '#e8f4fd', padding: '5px', margin: '5px 0', fontSize: '12px'}}, 
                    file.directUrl
                  )
                ]),
                React.createElement('div', {style: {display: 'flex', flexDirection: 'column', gap: '5px'}}, [
                  React.createElement('button', {
                    onClick: () => copyToClipboard(file.cdnUrl),
                    style: {background: '#2ecc71', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '4px', fontSize: '14px'}
                  }, 'Copy CDN URL'),
                  React.createElement('button', {
                    onClick: () => copyToClipboard(file.directUrl),
                    style: {background: '#3498db', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '4px', fontSize: '14px'}
                  }, 'Copy Direct URL'),
                  React.createElement('button', {
                    onClick: () => window.open(file.directUrl, '_blank'),
                    style: {background: '#9b59b6', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '4px', fontSize: '14px'}
                  }, 'Open File')
                ])
              ])
            ])
          )
        ]);
      };
      
      // Main App Component
      const App = () => {
        return React.createElement('div', null, [
          React.createElement('h1', null, '🚀 CDN Platform - Bulk Upload'),
          React.createElement('p', null, 'Upload multiple files at once and get CDN URLs instantly'),
          React.createElement(Upload, null),
          React.createElement(FileList, null)
        ]);
      };
      
      // RENDER THE APP
      const rootElement = document.getElementById('root');
      if (rootElement) {
        const root = ReactDOM.createRoot(rootElement);
        root.render(React.createElement(App));
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
    const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-');
    const fileName = fileId + '-' + cleanName;
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
    
    // Get CORRECT public URL from Supabase
    const { data: { publicUrl } } = supabase.storage
      .from('cdn-files')
      .getPublicUrl(fileName);
    
    // Correct CDN URL format
    const host = request.headers.get('host');
    const cdnUrl = 'https://' + host + '/cdn/' + fileName;
    
    return Response.json({
      success: true,
      fileId: fileId,
      fileName: file.name,
      size: file.size,
      type: file.type,
      directUrl: publicUrl,  // This is the REAL Supabase URL
      cdnUrl: cdnUrl,        // This is your worker proxy URL
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
    
    // Get the CORRECT public URL from Supabase
    const { data: { publicUrl } } = supabase.storage
      .from('cdn-files')
      .getPublicUrl(fileName);
    
    console.log('Supabase URL:', publicUrl);
    
    // Fetch from Supabase and proxy it
    const response = await fetch(publicUrl, {
      headers: {
        'Accept': '*/*'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Supabase returned ${response.status}: ${response.statusText}`);
    }
    
    // Get the file data
    const fileData = await response.arrayBuffer();
    
    // Return with proper headers
    return new Response(fileData, {
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'application/octet-stream',
        'Cache-Control': 'public, max-age=31536000',
        'Access-Control-Allow-Origin': '*',
        'Content-Disposition': `inline; filename="${fileName.split('-').slice(1).join('-')}"`
      }
    });
    
  } catch (error) {
    console.error('CDN error:', error);
    return new Response(`File not found: ${fileName}\nError: ${error.message}`, { 
      status: 404,
      headers: { 'Content-Type': 'text/plain' }
    });
  }
}
