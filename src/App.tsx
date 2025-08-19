import { useState, useCallback, useEffect, useRef } from 'react';
import { parse, html } from 'diff2html/lib/diff2html';
import { DiffFile } from 'diff2html/lib/types';
import 'diff2html/bundles/css/diff2html.min.css';
import './App.css';

interface PatchFile {
  id: string;
  name: string;
  diffs: DiffFile[];
}

interface ChangeSummary {
  totalFiles: number;
  addedLines: number;
  deletedLines: number;
}

function App() {
  const [patchFiles, setPatchFiles] = useState<PatchFile[]>([]);
  const [activeTabId, setActiveTabId] = useState<string>('');
  const [error, setError] = useState<string>('');
  const diffContainerRef = useRef<HTMLDivElement>(null);

  const generateChangeSummary = useCallback((diffs: DiffFile[]): ChangeSummary => {
    let addedLines = 0;
    let deletedLines = 0;

    diffs.forEach(diff => {
      const fileName = diff.newName || diff.oldName || 'Unknown';
      
      // Count added and deleted lines
      diff.blocks?.forEach(block => {
        block.lines?.forEach(line => {
          if (line.type === 'insert') {
            addedLines++;
          } else if (line.type === 'delete') {
            deletedLines++;
          }
        });
      });
    });

    return {
      totalFiles: diffs.length,
      addedLines,
      deletedLines,
    };
  }, []);

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
          diffs: parse(content)
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
  const activeSummary = activeFile ? generateChangeSummary(activeFile.diffs) : null;

  // Render diff when active file changes
  useEffect(() => {
    if (activeFile && diffContainerRef.current) {
      const diffHtml = html(activeFile.diffs, {
        drawFileList: true,
        matching: 'lines',
        outputFormat: 'line-by-line',
        highlight: true,
        fileListToggle: false,
        fileListStartVisible: false,
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
                <span className="tab-name">{file.name + ` (${file.diffs.length} files)`}</span>
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
          
          {activeSummary && (
            <div className="summary-section">
              <h3>Summary</h3>
              <div className="summary-stats">
                <div className="stat-item">
                  <span className="stat-label">Files Changed:</span>
                  <span className="stat-value">{activeSummary.totalFiles}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Lines Added:</span>
                  <span className="stat-value added">+{activeSummary.addedLines}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Lines Deleted:</span>
                  <span className="stat-value deleted">-{activeSummary.deletedLines}</span>
                </div>
              </div>
            </div>
          )}
          
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
