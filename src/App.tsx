import { useState, useCallback, useEffect, useRef } from 'react';
import { parse, html } from 'diff2html/lib/diff2html';
import 'diff2html/bundles/css/diff2html.min.css';
import './App.css';

interface PatchFile {
  id: string;
  name: string;
  content: string;
}

function App() {
  const [patchFiles, setPatchFiles] = useState<PatchFile[]>([]);
  const [activeTabId, setActiveTabId] = useState<string>('');
  const [error, setError] = useState<string>('');
  const diffContainerRef = useRef<HTMLDivElement>(null);

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    if (patchFiles.length + files.length > 5) {
      setError('Maximum 5 patch files allowed');
      return;
    }

    const newFiles: PatchFile[] = [];
    let filesProcessed = 0;

    Array.from(files).forEach((file, index) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        if (!content) {
          setError(`Failed to read file: ${file.name}`);
          return;
        }
        
        const fileId = `${Date.now()}-${index}`;
        newFiles.push({
          id: fileId,
          name: file.name,
          content: content
        });
        
        filesProcessed++;
        if (filesProcessed === files.length) {
          setPatchFiles(prev => {
            const updated = [...prev, ...newFiles];
            if (updated.length > 0 && !activeTabId) {
              setActiveTabId(updated[0].id);
            }
            return updated;
          });
          setError('');
        }
      };
      reader.onerror = () => {
        setError(`Error reading file: ${file.name}`);
      };
      reader.readAsText(file);
    });
  }, [patchFiles.length, activeTabId]);

  const activeFile = patchFiles.find(file => file.id === activeTabId);

  // Render diff when active file changes
  useEffect(() => {
    if (activeFile && diffContainerRef.current) {
      const parsedDiff = parse(activeFile.content);
      console.log(parsedDiff);
      const diffHtml = html(parsedDiff, {
        drawFileList: true,
        matching: 'lines',
        outputFormat: 'line-by-line',
        synchronisedScroll: true,
        highlight: true,
        fileListToggle: false,
        fileListStartVisible: false,
        colorScheme: 'dark'
      });

      diffContainerRef.current.innerHTML = diffHtml;
    }
  }, [activeFile]);

  const removeFile = useCallback((fileId: string) => {
    setPatchFiles(prev => {
      const updated = prev.filter(file => file.id !== fileId);
      if (activeTabId === fileId && updated.length > 0) {
        setActiveTabId(updated[0].id);
      } else if (updated.length === 0) {
        setActiveTabId('');
      }
      return updated;
    });
  }, [activeTabId]);

  return (
    <div className="app">
      <h1>Patch Explorer</h1>
      <div className="upload-container">
        <label htmlFor="patch-upload" className="upload-button">
          {patchFiles.length === 0 ? 'Choose Patch Files' : `Add More Files (${patchFiles.length}/5)`}
          <input
            id="patch-upload"
            type="file"
            accept=".patch,.diff"
            multiple
            onChange={handleFileUpload}
            style={{ display: 'none' }}
            disabled={patchFiles.length >= 5}
          />
        </label>
        {error && <div className="error">{error}</div>}
      </div>

      {patchFiles.length > 0 ? (
        <>
          <div className="tabs-container">
            {patchFiles.map((file) => (
              <div
                key={file.id}
                className={`tab ${activeTabId === file.id ? 'active' : ''}`}
                onClick={() => setActiveTabId(file.id)}
              >
                <span className="tab-name">{file.name}</span>
                <button
                  className="tab-close"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(file.id);
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <div className="diff-container" ref={diffContainerRef}>
          </div>
        </>
      ) : (
        <div className="empty-state">
          <p>Upload .patch or .diff files to view their contents</p>
          <p className="empty-state-sub">You can upload up to 5 files at once</p>
        </div>
      )}
    </div>
  );
}

export default App;
