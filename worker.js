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
      else if (path.startsWith('/browse/')) {
        return await handleBrowse(path, supabase);
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
  // Use regular quotes for the entire HTML string and escape properly
  const html = `<!DOCTYPE html>
<html>
<head>
    <title>CDN Platform - Folder/ZIP Support</title>
    <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
    <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/file-saver@2.0.5/dist/FileSaver.min.js"></script>
    <style>
        body { font-family: Arial; padding: 20px; max-width: 1000px; margin: 0 auto; }
        .upload-area { border: 2px dashed #ccc; padding: 40px; text-align: center; margin: 20px 0; border-radius: 10px; }
        .file-item { padding: 15px; border: 1px solid #ddd; margin: 10px 0; border-radius: 5px; }
        .folder-view { background: #f8f9fa; padding: 20px; border-radius: 10px; margin: 20px 0; }
        .folder-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
        .folder-contents { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 10px; }
        .folder-item { padding: 10px; background: white; border-radius: 5px; border: 1px solid #e0e0e0; }
        .file-icon { font-size: 24px; margin-right: 10px; }
        .folder-icon { color: #ffb74d; }
        .zip-icon { color: #4caf50; }
        .file-icon-text { color: #2196f3; }
        button { background: #0066cc; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; margin: 5px; }
        .upload-btn { background: #2ecc71; }
        .zip-btn { background: #9c27b0; }
        .download-btn { background: #ff9800; }
        input[type="file"] { margin: 10px 0; padding: 10px; }
        code { background: #f5f5f5; padding: 5px; display: block; font-family: monospace; font-size: 12px; }
        pre { background: #2d2d2d; color: white; padding: 15px; border-radius: 5px; overflow-x: auto; }
        .tab { display: inline-block; padding: 10px 20px; cursor: pointer; border-bottom: 2px solid transparent; }
        .tab.active { border-bottom-color: #0066cc; font-weight: bold; }
        .dropzone { border: 2px dashed #4caf50; background: #f1f8e9; }
    </style>
</head>
<body>
    <div id="root"></div>
    
    <script>
      const { useState, useEffect, useRef } = React;
      
      // Main App with Tabs
      const App = () => {
        const [activeTab, setActiveTab] = useState('upload');
        
        return React.createElement('div', null, [
          React.createElement('h1', null, '📦 CDN Platform - Folder & ZIP Support'),
          React.createElement('p', null, 'Upload folders/ZIPs and browse files like jsDelivr'),
          
          React.createElement('div', {style: {borderBottom: '1px solid #ddd', marginBottom: '20px'}}, [
            React.createElement('span', {
              className: activeTab === 'upload' ? 'tab active' : 'tab',
              onClick: () => setActiveTab('upload'),
              style: {marginRight: '20px'}
            }, '📤 Upload'),
            React.createElement('span', {
              className: activeTab === 'browse' ? 'tab active' : 'tab',
              onClick: () => setActiveTab('browse')
            }, '📁 Browse Files'),
            React.createElement('span', {
              className: activeTab === 'examples' ? 'tab active' : 'tab',
              onClick: () => setActiveTab('examples')
            }, '💡 Examples')
          ]),
          
          activeTab === 'upload' ? React.createElement(UploadTab, {key: 'upload'}) : null,
          activeTab === 'browse' ? React.createElement(BrowseTab, {key: 'browse'}) : null,
          activeTab === 'examples' ? React.createElement(ExamplesTab, {key: 'examples'}) : null
        ]);
      };
      
      // Upload Tab with folder/ZIP support
      const UploadTab = () => {
        const [uploading, setUploading] = useState(false);
        const [selectedFiles, setSelectedFiles] = useState([]);
        const [folderStructure, setFolderStructure] = useState({});
        const fileInputRef = useRef(null);
        const folderInputRef = useRef(null);
        
        const handleFileSelect = (e) => {
          const files = Array.from(e.target.files);
          if (files.length === 0) return;
          
          const newFiles = files.map(file => ({
            id: crypto.randomUUID(),
            file: file,
            name: file.name,
            size: file.size,
            type: file.type,
            path: file.webkitRelativePath || file.name,
            status: 'pending'
          }));
          
          setSelectedFiles(prev => [...prev, ...newFiles]);
          updateFolderStructure([...selectedFiles, ...newFiles]);
        };
        
        const handleFolderSelect = async (e) => {
          const files = Array.from(e.target.files);
          if (files.length === 0) return;
          
          const newFiles = files.map(file => ({
            id: crypto.randomUUID(),
            file: file,
            name: file.name,
            size: file.size,
            type: file.type,
            path: file.webkitRelativePath || file.name,
            status: 'pending'
          }));
          
          setSelectedFiles(prev => [...prev, ...newFiles]);
          updateFolderStructure([...selectedFiles, ...newFiles]);
        };
        
        const handleDrop = (e) => {
          e.preventDefault();
          e.stopPropagation();
          
          const items = e.dataTransfer.items;
          const files = [];
          
          for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (item.kind === 'file') {
              const file = item.getAsFile();
              if (item.webkitGetAsEntry) {
                const entry = item.webkitGetAsEntry();
                if (entry.isDirectory) {
                  // Skip directories for now - browser doesn't give us files
                  continue;
                }
              }
              files.push(file);
            }
          }
          
          if (files.length > 0) {
            const newFiles = files.map(file => ({
              id: crypto.randomUUID(),
              file: file,
              name: file.name,
              size: file.size,
              type: file.type,
              path: file.name,
              status: 'pending'
            }));
            
            setSelectedFiles(prev => [...prev, ...newFiles]);
            updateFolderStructure([...selectedFiles, ...newFiles]);
          }
        };
        
        const updateFolderStructure = (files) => {
          const structure = {};
          
          files.forEach(file => {
            const path = file.path;
            const parts = path.split('/');
            let current = structure;
            
            for (let i = 0; i < parts.length; i++) {
              const part = parts[i];
              if (i === parts.length - 1) {
                // File
                current[part] = { type: 'file', ...file };
              } else {
                // Folder
                if (!current[part]) {
                  current[part] = { type: 'folder', contents: {} };
                }
                current = current[part].contents;
              }
            }
          });
          
          setFolderStructure(structure);
        };
        
        const createZip = async () => {
          if (selectedFiles.length === 0) return;
          
          const zip = new JSZip();
          
          // Add files to ZIP
          selectedFiles.forEach(fileObj => {
            zip.file(fileObj.path, fileObj.file);
          });
          
          // Generate ZIP
          const content = await zip.generateAsync({ type: 'blob' });
          
          // Download ZIP
          saveAs(content, 'cdn-files.zip');
          
          // Also offer to upload the ZIP
          const zipFile = new File([content], 'cdn-files.zip', { type: 'application/zip' });
          const zipFileObj = {
            id: crypto.randomUUID(),
            file: zipFile,
            name: 'cdn-files.zip',
            size: zipFile.size,
            type: 'application/zip',
            path: 'cdn-files.zip',
            status: 'pending'
          };
          
          setSelectedFiles(prev => [...prev, zipFileObj]);
          updateFolderStructure([...selectedFiles, zipFileObj]);
          
          alert('ZIP created! You can now upload it.');
        };
        
        const uploadAllFiles = async () => {
          if (selectedFiles.length === 0) {
            alert('Please select files first');
            return;
          }
          
          setUploading(true);
          
          for (let i = 0; i < selectedFiles.length; i++) {
            const fileObj = selectedFiles[i];
            
            // Update status
            setSelectedFiles(prev => prev.map(f => 
              f.id === fileObj.id ? { ...f, status: 'uploading' } : f
            ));
            
            try {
              const formData = new FormData();
              formData.append('file', fileObj.file);
              
              const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData
              });
              
              const data = await response.json();
              
              if (data.success) {
                setSelectedFiles(prev => prev.map(f => 
                  f.id === fileObj.id ? { 
                    ...f, 
                    status: 'uploaded',
                    cdnUrl: data.cdnUrl,
                    directUrl: data.directUrl
                  } : f
                ));
              } else {
                setSelectedFiles(prev => prev.map(f => 
                  f.id === fileObj.id ? { 
                    ...f, 
                    status: 'error',
                    error: data.error
                  } : f
                ));
              }
            } catch (error) {
              setSelectedFiles(prev => prev.map(f => 
                f.id === fileObj.id ? { 
                  ...f, 
                  status: 'error',
                  error: error.message
                } : f
              ));
            }
          }
          
          setUploading(false);
          
          const successful = selectedFiles.filter(f => f.status === 'uploaded').length;
          if (successful > 0) {
            alert('✅ ' + successful + ' files uploaded! Page will refresh.');
            setTimeout(() => window.location.reload(), 1500);
          }
        };
        
        const removeFile = (id) => {
          setSelectedFiles(prev => prev.filter(f => f.id !== id));
          updateFolderStructure(selectedFiles.filter(f => f.id !== id));
        };
        
        const clearAllFiles = () => {
          setSelectedFiles([]);
          setFolderStructure({});
        };
        
        const formatSize = (bytes) => {
          if (bytes === 0) return '0 Bytes';
          const k = 1024;
          const sizes = ['Bytes', 'KB', 'MB', 'GB'];
          const i = Math.floor(Math.log(bytes) / Math.log(k));
          return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        };
        
        const renderFolderStructure = (structure, path = '') => {
          const items = [];
          
          for (const [name, item] of Object.entries(structure)) {
            const fullPath = path ? path + '/' + name : name;
            
            if (item.type === 'folder') {
              items.push(
                React.createElement('div', { key: fullPath, className: 'folder-item' }, [
                  React.createElement('span', { className: 'file-icon folder-icon' }, '📁'),
                  React.createElement('strong', null, name + '/'),
                  React.createElement('div', { style: { marginLeft: '20px', marginTop: '10px' } },
                    renderFolderStructure(item.contents, fullPath)
                  )
                ])
              );
            } else {
              items.push(
                React.createElement('div', { key: fullPath, className: 'folder-item' }, [
                  React.createElement('span', { className: 'file-icon file-icon-text' }, '📄'),
                  React.createElement('div', { style: { display: 'inline-block' } }, [
                    React.createElement('div', null, [
                      React.createElement('strong', null, name),
                      React.createElement('span', { style: { marginLeft: '10px', fontSize: '12px', color: '#666' } },
                        formatSize(item.size)
                      )
                    ]),
                    item.status === 'uploaded' && 
                      React.createElement('code', { style: { fontSize: '11px', marginTop: '5px' } }, item.cdnUrl)
                  ]),
                  React.createElement('button', {
                    onClick: () => removeFile(item.id),
                    style: { 
                      float: 'right', 
                      background: 'transparent', 
                      color: '#e74c3c',
                      padding: '2px 8px',
                      fontSize: '12px'
                    }
                  }, '✕')
                ])
              );
            }
          }
          
          return items;
        };
        
        return React.createElement('div', null, [
          React.createElement('div', {
            key: 'upload-area',
            className: 'upload-area',
            onDragOver: (e) => { e.preventDefault(); e.currentTarget.classList.add('dropzone'); },
            onDragLeave: (e) => { e.currentTarget.classList.remove('dropzone'); },
            onDrop: (e) => { 
              e.preventDefault(); 
              e.currentTarget.classList.remove('dropzone'); 
              handleDrop(e); 
            }
          }, [
            React.createElement('h2', null, '📤 Upload Files/Folders'),
            React.createElement('p', null, 'Drag & drop, select files, or select a folder'),
            
            React.createElement('div', { style: { margin: '20px 0' } }, [
              React.createElement('button', {
                onClick: () => fileInputRef.current?.click(),
                className: 'upload-btn',
                style: { marginRight: '10px' }
              }, 'Select Files'),
              React.createElement('button', {
                onClick: () => folderInputRef.current?.click(),
                className: 'upload-btn'
              }, 'Select Folder'),
              selectedFiles.length > 0 && 
                React.createElement('button', {
                  onClick: createZip,
                  className: 'zip-btn',
                  style: { marginLeft: '10px' }
                }, 'Create ZIP')
            ]),
            
            React.createElement('input', {
              ref: fileInputRef,
              type: 'file',
              multiple: true,
              onChange: handleFileSelect,
              style: { display: 'none' }
            }),
            
            React.createElement('input', {
              ref: folderInputRef,
              type: 'file',
              webkitdirectory: true,
              directory: true,
              multiple: true,
              onChange: handleFolderSelect,
              style: { display: 'none' }
            }),
            
            React.createElement('p', { style: { fontSize: '14px', color: '#666', marginTop: '10px' } },
              selectedFiles.length + ' files selected'
            )
          ]),
          
          selectedFiles.length > 0 && React.createElement('div', { key: 'actions', style: { margin: '20px 0' } }, [
            React.createElement('button', {
              onClick: uploadAllFiles,
              disabled: uploading,
              className: 'upload-btn',
              style: { padding: '12px 30px', fontSize: '16px' }
            }, uploading ? 'Uploading...' : 'Upload All (' + selectedFiles.length + ' files)'),
            React.createElement('button', {
              onClick: clearAllFiles,
              disabled: uploading,
              style: { background: '#e74c3c', marginLeft: '10px' }
            }, 'Clear All')
          ]),
          
          Object.keys(folderStructure).length > 0 && 
            React.createElement('div', { key: 'folder-view', className: 'folder-view' }, [
              React.createElement('div', { className: 'folder-header' }, [
                React.createElement('h3', null, '📁 Folder Structure'),
                React.createElement('span', null, selectedFiles.length + ' items')
              ]),
              React.createElement('div', { className: 'folder-contents' },
                renderFolderStructure(folderStructure)
              )
            ])
        ]);
      };
      
      // Browse Tab - Like jsDelivr file browser
      const BrowseTab = () => {
        const [files, setFiles] = useState([]);
        const [loading, setLoading] = useState(true);
        const [currentPath, setCurrentPath] = useState('');
        const [fileContent, setFileContent] = useState('');
        const [viewingFile, setViewingFile] = useState(null);
        
        useEffect(() => {
          fetchFiles();
        }, [currentPath]);
        
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
        
        const viewFile = async (file) => {
          try {
            setViewingFile(file);
            const response = await fetch(file.directUrl);
            if (response.ok) {
              const text = await response.text();
              setFileContent(text.substring(0, 5000)); // Limit preview
            } else {
              setFileContent('Cannot preview this file type');
            }
          } catch (error) {
            setFileContent('Error loading file: ' + error.message);
          }
        };
        
        const formatSize = (bytes) => {
          if (bytes === 0) return '0 Bytes';
          const k = 1024;
          const sizes = ['Bytes', 'KB', 'MB', 'GB'];
          const i = Math.floor(Math.log(bytes) / Math.log(k));
          return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        };
        
        const getFileIcon = (fileName, fileType) => {
          if (fileName.endsWith('.zip')) return '📦';
          if (fileName.endsWith('.js')) return '📜';
          if (fileName.endsWith('.jsx')) return '⚛️';
          if (fileName.endsWith('.html')) return '🌐';
          if (fileName.endsWith('.css')) return '🎨';
          if (fileName.endsWith('.json')) return '📋';
          if (fileType.includes('image')) return '🖼️';
          return '📄';
        };
        
        if (loading) {
          return React.createElement('p', null, 'Loading files...');
        }
        
        if (files.length === 0) {
          return React.createElement('p', null, 'No files uploaded yet.');
        }
        
        return React.createElement('div', null, [
          React.createElement('h2', null, '📁 File Browser'),
          React.createElement('p', null, files.length + ' files available'),
          
          viewingFile ? 
            React.createElement('div', { key: 'file-viewer', style: { margin: '20px 0' } }, [
              React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' } }, [
                React.createElement('h3', null, [
                  React.createElement('span', { style: { marginRight: '10px' } }, getFileIcon(viewingFile.name, viewingFile.type)),
                  viewingFile.name
                ]),
                React.createElement('button', {
                  onClick: () => setViewingFile(null),
                  style: { background: '#666' }
                }, '← Back')
              ]),
              
              React.createElement('div', { style: { marginBottom: '15px' } }, [
                React.createElement('code', { style: { display: 'block', marginBottom: '5px' } }, viewingFile.cdnUrl),
                React.createElement('code', { style: { display: 'block', background: '#e8f4fd' } }, viewingFile.directUrl)
              ]),
              
              React.createElement('div', { style: { marginBottom: '15px' } }, [
                React.createElement('button', {
                  onClick: () => navigator.clipboard.writeText(viewingFile.cdnUrl),
                  style: { marginRight: '10px' }
                }, 'Copy CDN URL'),
                React.createElement('button', {
                  onClick: () => window.open(viewingFile.directUrl, '_blank'),
                  className: 'download-btn'
                }, 'Download File')
              ]),
              
              React.createElement('h4', null, 'File Preview:'),
              React.createElement('pre', null, fileContent),
              
              React.createElement('p', { style: { fontSize: '12px', color: '#666', marginTop: '10px' } },
                fileContent.length >= 5000 ? '(Preview truncated to 5000 characters)' : ''
              )
            ]) :
            
            React.createElement('div', { key: 'file-list', className: 'folder-contents', style: { marginTop: '20px' } },
              files.map(file => 
                React.createElement('div', {
                  key: file.id,
                  className: 'folder-item',
                  onClick: () => viewFile(file),
                  style: { cursor: 'pointer' }
                }, [
                  React.createElement('div', { style: { fontSize: '24px', marginBottom: '10px' } },
                    getFileIcon(file.name, file.type)
                  ),
                  React.createElement('strong', { style: { display: 'block', marginBottom: '5px' } }, file.name),
                  React.createElement('div', { style: { fontSize: '12px', color: '#666' } }, [
                    React.createElement('div', null, formatSize(file.size)),
                    React.createElement('div', null, new Date(file.updated).toLocaleDateString()),
                    React.createElement('div', null, file.type.split('/')[0] || 'file')
                  ])
                ])
              )
            )
        ]);
      };
      
      // Examples Tab - FIXED to use regular strings instead of template literals
      const ExamplesTab = () => {
        return React.createElement('div', null, [
          React.createElement('h2', null, '💡 How to Use This CDN'),
          
          React.createElement('div', { style: { margin: '20px 0' } }, [
            React.createElement('h3', null, '📁 Folder Upload Example:'),
            React.createElement('pre', null, 
'project/\n├── index.html\n├── style.css\n├── script.js\n└── images/\n    └── logo.png\n\nUpload the entire folder, then use:\n\n<!-- In HTML -->\n<link rel="stylesheet" href="https://YOUR-CDN/cdn/project/style.css">\n<script src="https://YOUR-CDN/cdn/project/script.js"></script>\n<img src="https://YOUR-CDN/cdn/project/images/logo.png">'
            ),
            
            React.createElement('h3', { style: { marginTop: '30px' } }, '📦 ZIP Package Example:'),
            React.createElement('pre', null,
'// Upload a ZIP file containing your library\n// Then users can access individual files:\n\nimport { Component } from \'https://YOUR-CDN/cdn/my-library.zip/Component.js\';\n// Note: ZIP browsing requires extracting on the client side'
            ),
            
            React.createElement('h3', { style: { marginTop: '30px' } }, '🚀 Quick Usage:'),
            React.createElement('ol', null, [
              React.createElement('li', null, 'Upload files/folders/ZIPs'),
              React.createElement('li', null, 'Copy the CDN URL'),
              React.createElement('li', null, 'Use in your projects:'),
              React.createElement('li', null, 
                React.createElement('code', null, '<script src="https://YOUR-CDN/cdn/file.js"></script>')
              )
            ])
          ])
        ]);
      };
      
      // Render the app
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

async function handleBrowse(path, supabase) {
  // This would handle ZIP file browsing/extraction
  // For now, just redirect to the file
  const fileName = path.replace('/browse/', '');
  return Response.redirect(`/cdn/${fileName}`, 302);
}
