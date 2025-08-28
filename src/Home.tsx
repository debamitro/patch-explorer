import { useState, useCallback, useEffect, useRef } from 'react';
import { parse, html } from 'diff2html/lib/diff2html';
import type { DiffFile } from 'diff2html/lib/types';
import { createTwoFilesPatch } from 'diff';
import 'diff2html/bundles/css/diff2html.min.css';

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

function Home() {
  const [patchFiles, setPatchFiles] = useState<PatchFile[]>([]);
  const [activeTabId, setActiveTabId] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [selectedFileName, setSelectedFileName] = useState<string>('');
  const diffContainerRef = useRef<HTMLDivElement>(null);
  const modalDiffContainerRef = useRef<HTMLDivElement>(null);

  const getFileDiffsFromAllPatches = useCallback((fileName: string) => {
    const fileDiffs: Array<{ patchName: string; diff: DiffFile }> = [];
    
    patchFiles.forEach(patchFile => {
      const matchingDiff = patchFile.diffs.find(diff => 
        diff.newName === fileName || diff.oldName === fileName
      );
      if (matchingDiff) {
        fileDiffs.push({
          patchName: patchFile.name,
          diff: matchingDiff
        });
      }
    });
    
    return fileDiffs;
  }, [patchFiles]);

  const handleFileNameClick = useCallback((fileName: string) => {
    setSelectedFileName(fileName);
    setIsModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setSelectedFileName('');
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
      });

      diffContainerRef.current.innerHTML = diffHtml;
    }
  }, [activeFile]);

  // Render modal diff when selected file changes
  useEffect(() => {
    if (selectedFileName && modalDiffContainerRef.current && isModalOpen) {
      const fileDiffs = getFileDiffsFromAllPatches(selectedFileName);
      
      if (fileDiffs.length > 0) {
        let modalContent = '';
        let hasChanges = true;
        
        // If exactly 2 diffs, show comparison between them
        if (fileDiffs.length === 2) {
          const [first, second] = fileDiffs;
          
          // Extract the final content from each diff
          const getFileContent = (diff: DiffFile) => {
            const lines: string[] = [];
            diff.blocks?.forEach(block => {
              block.lines?.forEach(line => {
                if (line.type === 'delete' || line.type === 'insert') {
                  lines.push(line.content.substring(1)); // Remove the +/- prefix
                }
              });
            });
            return lines.join('\n');
          };
          
          const firstContent = getFileContent(first.diff);
          const secondContent = getFileContent(second.diff);
          
          // Create a unified diff between the two versions using jsdiff
          const unifiedDiff = createTwoFilesPatch(
            `${selectedFileName} (${first.patchName})`,
            `${selectedFileName} (${second.patchName})`,
            firstContent,
            secondContent,
            undefined,
            undefined
          );
          
          // Check if there are actual changes (not just headers)
          hasChanges = unifiedDiff.includes('@@') && (unifiedDiff.includes('+') || unifiedDiff.includes('-'));
          if (!hasChanges) {
            modalContent = `
              <div class="mb-6">
                <h4 class="text-lg font-semibold text-indigo-800 mb-3 p-3 bg-indigo-50 rounded-lg border border-indigo-200">
                  🔄 Comparison: ${first.patchName} → ${second.patchName}
                </h4>
                <p class="text-sm text-gray-600">No changes found between these two patches.</p>
              </div>
            `;
          } else {
            try {
              const comparisonDiff = parse(unifiedDiff);
              const comparisonHtml = html(comparisonDiff, {
                drawFileList: false,
                matching: 'lines',
                outputFormat: 'line-by-line',
                renderNothingWhenEmpty: true,
              });

              modalContent = `
              <div class="mb-6">
                <h4 class="text-lg font-semibold text-indigo-800 mb-3 p-3 bg-indigo-50 rounded-lg border border-indigo-200">
                  🔄 Comparison: ${first.patchName} → ${second.patchName}
                </h4>
                ${comparisonHtml}
              </div>
              <div class="border-t pt-6">
                <h4 class="text-md font-semibold text-gray-600 mb-4">Individual Diffs:</h4>
            `;
            } catch (error) {
              // Fallback to individual diffs if comparison fails
              modalContent = `
              <div class="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p class="text-sm text-yellow-800">⚠️ Could not generate comparison diff. Showing individual diffs instead.</p>
              </div>
            `;
            }
          }
        }
        
        if (hasChanges) {
        // Show individual diffs (either as fallback or in addition to comparison)
        fileDiffs.forEach(({ patchName, diff }) => {
          const diffHtml = html([diff], {
            drawFileList: false,
            matching: 'lines',
            outputFormat: 'line-by-line',
          });
          
          modalContent += `
            <div class="mb-6">
              <h4 class="text-lg font-semibold text-gray-800 mb-3 p-3 bg-gray-50 rounded-lg border">
                📄 ${patchName}
              </h4>
              ${diffHtml}
            </div>
          `;
        });
      }
        if (fileDiffs.length === 2) {
          modalContent += '</div>'; // Close the individual diffs section
        }
        
        modalDiffContainerRef.current.innerHTML = modalContent;
      }
    }
  }, [selectedFileName, isModalOpen, getFileDiffsFromAllPatches]);

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
                          className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 border border-indigo-200 cursor-pointer hover:bg-indigo-200 transition-colors duration-200"
                          onClick={() => handleFileNameClick(fileName)}
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
          
            <div className="bg-white shadow-lg border border-gray-200 p-1" ref={diffContainerRef}>
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
        
        {/* Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] flex flex-col">
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
                <div className="flex items-center gap-3">
                  <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <h2 className="text-xl font-bold text-gray-800">File Diffs: {selectedFileName}</h2>
                </div>
                <button
                  onClick={closeModal}
                  className="p-2 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors duration-200"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto p-6 min-h-0">
                <div ref={modalDiffContainerRef} className="space-y-6">
                  {/* Diff content will be rendered here */}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Home;
