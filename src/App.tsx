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
  
  // Generate combined summary for all files
  const combinedSummary = patchFiles.length > 0 ? (() => {
    let commonFiles: Record<string, string[]> = {};
    patchFiles.forEach(patchFile => {
      patchFile.diffs.forEach(diff => {
        if (diff.newName) {
          if (commonFiles[diff.newName]) {
            commonFiles[diff.newName].push(patchFile.name);
          } else {
            commonFiles[diff.newName] = [patchFile.name];
          }
        }
      });
    });
    

    let presentInAllPatches: string[] = [];
    Object.entries(commonFiles).forEach(([fileName, patches]) => {
      if (patchFiles.length == patches.length) {
        presentInAllPatches.push(fileName);
      }
    });
    return {
      totalPatchFiles: patchFiles.length,
      presentInAllPatches,
    };
  })() : null;

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
    <div className="min-h-screen bg-slate-50">
      {/* Header with GitHub link */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-end h-8">
            <a 
              href="https://github.com/debamitro/patch-explorer" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors duration-200"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
            </a>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <h1 className="text-7xl font-bold bg-indigo-600 bg-clip-text text-transparent mb-4">
            Patch Explorer
          </h1>
          <p className="text-gray-600 text-lg">Understand your code diffs with ease</p>
        </div>
        
        <div className="flex flex-col items-center mb-8 gap-6">
          <label htmlFor="patch-upload" className="group relative inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none">
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <span className="relative z-10 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              {patchFiles.length === 0 ? 'Choose Patch Files' : `Add More Files (${patchFiles.length}/5)`}
            </span>
            <input
              id="patch-upload"
              type="file"
              accept=".patch,.diff"
              multiple
              onChange={handleFileUpload}
              className="hidden"
              disabled={patchFiles.length >= 5}
            />
          </label>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-lg shadow-sm max-w-md">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </div>
            </div>
          )}
        </div>

        {patchFiles.length > 0 ? (
          <>
            {/* Combined Summary Section */}
            {combinedSummary && (
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 mb-6">
                <div className="flex items-center gap-2 mb-6">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <h3 className="text-xl font-bold text-gray-800">Overall Summary</h3>
                  <span className="text-sm text-gray-500 ml-2">({combinedSummary.totalPatchFiles} patch files)</span>
                </div>
                {combinedSummary.presentInAllPatches.length > 0 ? (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">{combinedSummary.presentInAllPatches.length} Files present in all patches:</h4>
                    <div className="flex flex-wrap gap-2">
                      {combinedSummary.presentInAllPatches.map((fileName, index) => (
                        <span 
                          key={index}
                          className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 border border-indigo-200"
                        >
                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          {fileName}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <svg className="w-8 h-8 mx-auto text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-sm text-gray-500">No files are present in all patches</p>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-1 mb-6 overflow-x-auto pb-2 scrollbar-hide">
              {patchFiles.map((file) => (
                <div
                  key={file.id}
                  className={`group flex items-center gap-3 px-4 py-3 rounded-t-lg cursor-pointer transition-all duration-200 whitespace-nowrap min-w-fit border-b-2 ${
                    activeTabId === file.id
                      ? 'bg-white text-indigo-600 border-indigo-500 shadow-sm'
                      : 'bg-white/70 text-gray-600 border-transparent hover:bg-white hover:text-gray-800 hover:shadow-sm'
                  }`}
                  onClick={() => setActiveTabId(file.id)}
                >
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="font-medium text-sm">
                      {file.name}
                    </span>
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                      {file.diffs.length} files
                    </span>
                  </div>
                  <button
                    className="ml-2 p-1 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all duration-200 opacity-0 group-hover:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(file.id);
                    }}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          
            {activeSummary && (
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 mb-6">
                <div className="flex items-center gap-2 mb-6">
                  <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <h3 className="text-xl font-bold text-gray-800">Summary</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
                    <div className="text-3xl font-bold text-blue-600 mb-2">{activeSummary.totalFiles}</div>
                    <div className="text-sm font-medium text-blue-700">Files Changed</div>
                  </div>
                  <div className="text-center p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border border-green-100">
                    <div className="text-3xl font-bold text-green-600 mb-2">+{activeSummary.addedLines}</div>
                    <div className="text-sm font-medium text-green-700">Lines Added</div>
                  </div>
                  <div className="text-center p-4 bg-gradient-to-br from-red-50 to-rose-50 rounded-lg border border-red-100">
                    <div className="text-3xl font-bold text-red-600 mb-2">-{activeSummary.deletedLines}</div>
                    <div className="text-sm font-medium text-red-700">Lines Deleted</div>
                  </div>
                </div>
              </div>
            )}
          
            <div className="bg-white rounded-xl shadow-lg border border-gray-200" ref={diffContainerRef}>
            </div>
          </>
        ) : (
          <div className="text-center py-20 px-8">
            <div className="max-w-md mx-auto">
              <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full flex items-center justify-center">
                <svg className="w-12 h-12 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 12l2 2 4-4" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-4">Ready to explore patches</h3>
              <p className="text-gray-600 mb-2">Upload .patch or .diff files to view their contents</p>
              <p className="text-sm text-gray-500">You can upload up to 5 files at once</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
