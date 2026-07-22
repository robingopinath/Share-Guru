import React, { useState, useEffect, useRef } from 'react';
import {
  Upload,
  Download,
  Copy,
  Check,
  QrCode,
  ShieldAlert,
  FileUp,
  FileCheck2,
  Share2,
  HardDrive,
  RefreshCw,
  AlertCircle,
  FileIcon,
  X,
  Zap,
  Info,
  Folder,
  FolderUp,
} from 'lucide-react';
import { PeerTransferEngine } from '../lib/webrtc';
import { ConnectionStatus, TransferProgress, ReceivedFile, SharedFileInfo } from '../types';
import { formatBytes, generateRoomId, generateSvgQrCode } from '../lib/utils';

// Helper to recursively extract files from dropped items (supporting folders and subfolders)
const getAllFilesFromDataTransfer = async (dataTransfer: DataTransfer): Promise<File[]> => {
  const files: File[] = [];

  const readEntry = async (entry: any, path = ''): Promise<void> => {
    if (!entry) return;

    if (entry.isFile) {
      await new Promise<void>((resolve) => {
        entry.file(
          (file: File) => {
            const relativePath = path ? `${path}/${file.name}` : file.name;
            try {
              Object.defineProperty(file, 'webkitRelativePath', {
                value: relativePath,
                writable: true,
                configurable: true,
              });
            } catch {
              // Read-only fallback
            }
            files.push(file);
            resolve();
          },
          () => resolve()
        );
      });
    } else if (entry.isDirectory) {
      const dirReader = entry.createReader();
      const entries: any[] = [];

      const readBatch = async (): Promise<any[]> => {
        return new Promise((resolve) => {
          dirReader.readEntries(
            (results: any[]) => resolve(results),
            () => resolve([])
          );
        });
      };

      let batch: any[];
      do {
        batch = await readBatch();
        entries.push(...batch);
      } while (batch.length > 0);

      const currentPath = path ? `${path}/${entry.name}` : entry.name;
      for (const child of entries) {
        await readEntry(child, currentPath);
      }
    }
  };

  const items = Array.from(dataTransfer.items || []);
  const promises: Promise<void>[] = [];

  for (const item of items) {
    if (item.kind === 'file') {
      const entry = item.webkitGetAsEntry ? item.webkitGetAsEntry() : null;
      if (entry) {
        promises.push(readEntry(entry));
      } else {
        const file = item.getAsFile();
        if (file) files.push(file);
      }
    }
  }

  if (promises.length > 0) {
    await Promise.all(promises);
  } else if (dataTransfer.files && dataTransfer.files.length > 0) {
    files.push(...Array.from(dataTransfer.files));
  }

  return files;
};

export const ShareWorkspace: React.FC = () => {
  const [mode, setMode] = useState<'send' | 'receive'>('send');

  // Sender state
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [senderRoomId, setSenderRoomId] = useState<string>('');
  const [senderEngine, setSenderEngine] = useState<PeerTransferEngine | null>(null);
  const [senderStatus, setSenderStatus] = useState<ConnectionStatus>('idle');
  const [senderProgress, setSenderProgress] = useState<TransferProgress | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Receiver state
  const [receiverRoomInput, setReceiverRoomInput] = useState<string>('');
  const [activeReceiverRoomId, setActiveReceiverRoomId] = useState<string>('');
  const [receiverEngine, setReceiverEngine] = useState<PeerTransferEngine | null>(null);
  const [receiverStatus, setReceiverStatus] = useState<ConnectionStatus>('idle');
  const [receiverProgress, setReceiverProgress] = useState<TransferProgress | null>(null);
  const [incomingMeta, setIncomingMeta] = useState<SharedFileInfo[]>([]);
  const [receivedFiles, setReceivedFiles] = useState<ReceivedFile[]>([]);

  // Check URL params on mount for auto-join room
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const roomParam = urlParams.get('room');
    if (roomParam) {
      setMode('receive');
      setReceiverRoomInput(roomParam.toUpperCase());
    }
  }, []);

  // Cleanup WebRTC engines on unmount
  useEffect(() => {
    return () => {
      if (senderEngine) senderEngine.destroy();
      if (receiverEngine) receiverEngine.destroy();
    };
  }, [senderEngine, receiverEngine]);

  // File Drag & Drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer) {
      const extractedFiles = await getAllFilesFromDataTransfer(e.dataTransfer);
      if (extractedFiles.length > 0) {
        setSelectedFiles((prev) => [...prev, ...extractedFiles]);
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArray = Array.from(e.target.files);
      setSelectedFiles((prev) => [...prev, ...filesArray]);
    }
  };

  const removeSelectedFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Start Sender Session
  const startSenderSession = () => {
    if (selectedFiles.length === 0) return;

    const roomId = generateRoomId();
    setSenderRoomId(roomId);

    const engine = new PeerTransferEngine(roomId, 'sender');
    engine.setFilesToSend(selectedFiles);

    engine.onStatusChange((status) => {
      setSenderStatus(status);
    });

    engine.onProgress((prog) => {
      setSenderProgress(prog);
    });

    engine.initSignaling();
    setSenderEngine(engine);
  };

  const resetSenderSession = () => {
    if (senderEngine) senderEngine.destroy();
    setSenderEngine(null);
    setSenderRoomId('');
    setSenderStatus('idle');
    setSenderProgress(null);
    setSelectedFiles([]);
  };

  // Connect Receiver Session
  const connectReceiverSession = () => {
    const cleanCode = receiverRoomInput.trim().toUpperCase();
    if (!cleanCode) return;

    if (receiverEngine) receiverEngine.destroy();

    setActiveReceiverRoomId(cleanCode);
    const engine = new PeerTransferEngine(cleanCode, 'receiver');

    engine.onStatusChange((status) => {
      setReceiverStatus(status);
    });

    engine.onProgress((prog) => {
      setReceiverProgress(prog);
    });

    engine.onIncomingMeta((meta) => {
      setIncomingMeta(meta);
    });

    engine.onFilesReceived((files) => {
      setReceivedFiles(files);
    });

    engine.initSignaling();
    setReceiverEngine(engine);
  };

  const resetReceiverSession = () => {
    if (receiverEngine) receiverEngine.destroy();
    setReceiverEngine(null);
    setActiveReceiverRoomId('');
    setReceiverStatus('idle');
    setReceiverProgress(null);
    setIncomingMeta([]);
    setReceivedFiles([]);
  };

  const getShareUrl = () => {
    const origin = window.location.origin;
    return `${origin}/?room=${senderRoomId}`;
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(getShareUrl());
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(senderRoomId);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const getTotalSelectedSize = () => {
    return selectedFiles.reduce((acc, f) => acc + f.size, 0);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Mode Selection Tabs */}
      <div className="flex justify-center mb-8">
        <div className="bg-slate-200/80 p-1.5 rounded-2xl flex space-x-1 shadow-inner">
          <button
            onClick={() => {
              setMode('send');
            }}
            className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center space-x-2 ${
              mode === 'send'
                ? 'bg-white text-slate-900 shadow-md scale-[1.02]'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Upload className="w-4 h-4 text-emerald-600" />
            <span>Send Files</span>
          </button>
          <button
            onClick={() => {
              setMode('receive');
            }}
            className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center space-x-2 ${
              mode === 'receive'
                ? 'bg-white text-slate-900 shadow-md scale-[1.02]'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Download className="w-4 h-4 text-teal-600" />
            <span>Receive Files</span>
          </button>
        </div>
      </div>

      {/* SENDER MODE */}
      {mode === 'send' && (
        <div className="space-y-6">
          {!senderEngine ? (
            /* File Drag & Drop Card */
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-3xl p-8 sm:p-12 text-center transition-all duration-200 bg-white shadow-sm ${
                isDragging
                  ? 'border-emerald-500 bg-emerald-50/50 scale-[1.01]'
                  : 'border-slate-300 hover:border-slate-400'
              }`}
            >
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <FileUp className="w-8 h-8" />
              </div>

              <h2 className="text-2xl font-bold text-slate-900 tracking-tight mb-2">
                Drop files or folders here to share directly
              </h2>
              <p className="text-sm text-slate-600 max-w-md mx-auto mb-6">
                Peer-to-peer encrypted transfer. Full folder structures, no cloud uploads, no size limits.
              </p>

              <div className="flex flex-wrap items-center justify-center gap-3">
                <label className="inline-flex items-center px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-medium text-sm cursor-pointer shadow-md hover:shadow-lg transition-all space-x-2">
                  <Upload className="w-4 h-4 text-emerald-400" />
                  <span>Select Files</span>
                  <input
                    type="file"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </label>

                <label className="inline-flex items-center px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium text-sm cursor-pointer shadow-md hover:shadow-lg transition-all space-x-2 border border-slate-700">
                  <FolderUp className="w-4 h-4 text-amber-400" />
                  <span>Select Folder</span>
                  <input
                    type="file"
                    // @ts-ignore
                    webkitdirectory=""
                    directory=""
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Selected File List Preview */}
              {selectedFiles.length > 0 && (
                <div className="mt-8 text-left bg-slate-50 border border-slate-200 rounded-2xl p-4 max-w-2xl mx-auto">
                  <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Selected Files & Folders ({selectedFiles.length})
                    </span>
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                      Total: {formatBytes(getTotalSelectedSize())}
                    </span>
                  </div>

                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {selectedFiles.map((file, idx) => {
                      const filePath = file.webkitRelativePath || file.name;
                      const isFromFolder = Boolean(file.webkitRelativePath && file.webkitRelativePath.includes('/'));
                      return (
                        <div
                          key={idx}
                          className="flex items-center justify-between bg-white border border-slate-200 p-2.5 rounded-xl text-sm"
                        >
                          <div className="flex items-center space-x-3 overflow-hidden">
                            {isFromFolder ? (
                              <Folder className="w-4 h-4 text-amber-500 flex-shrink-0" />
                            ) : (
                              <FileIcon className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                            )}
                            <span className="truncate font-medium text-slate-800" title={filePath}>
                              {filePath}
                            </span>
                            <span className="text-xs text-slate-400 flex-shrink-0">
                              ({formatBytes(file.size)})
                            </span>
                          </div>
                          <button
                            onClick={() => removeSelectedFile(idx)}
                            className="text-slate-400 hover:text-rose-500 p-1 rounded-md hover:bg-rose-50 transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-200 flex justify-end">
                    <button
                      onClick={startSenderSession}
                      className="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center space-x-2"
                    >
                      <Share2 className="w-4 h-4" />
                      <span>Create P2P Share Room</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Active Sender Room Panel */
            <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                      Active P2P Sender Room
                    </span>
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 mt-1">Ready for Peer Connection</h3>
                </div>

                <button
                  onClick={resetSenderSession}
                  className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-semibold transition-colors flex items-center space-x-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Start New Transfer</span>
                </button>
              </div>

              {/* Room Share Link & Code Box */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Room Code */}
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl">
                  <span className="text-xs font-medium text-slate-500 block mb-1">Room Access Code</span>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-mono font-bold tracking-widest text-slate-900">
                      {senderRoomId}
                    </span>
                    <button
                      onClick={handleCopyCode}
                      className="p-2 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                      title="Copy Code"
                    >
                      {copiedCode ? <Check className="w-5 h-5 text-emerald-600" /> : <Copy className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* Share URL */}
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl md:col-span-2">
                  <span className="text-xs font-medium text-slate-500 block mb-1">Direct Share URL</span>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      readOnly
                      value={getShareUrl()}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-mono text-slate-700 focus:outline-none"
                    />
                    <button
                      onClick={handleCopyLink}
                      className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-medium transition-colors flex items-center space-x-1.5 whitespace-nowrap"
                    >
                      {copiedLink ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy Link</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => setShowQrModal(!showQrModal)}
                      className="p-1.5 border border-slate-300 hover:bg-slate-100 rounded-xl text-slate-700 transition-colors"
                      title="View QR Code"
                    >
                      <QrCode className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* QR Code Modal Overlay */}
              {showQrModal && (
                <div className="p-4 bg-slate-900/5 rounded-2xl border border-slate-200 flex flex-col items-center justify-center space-y-3">
                  <div
                    className="w-44 h-44 p-2 bg-white rounded-xl shadow-md border border-slate-200"
                    dangerouslySetInnerHTML={{ __html: generateSvgQrCode(getShareUrl()) }}
                  />
                  <p className="text-xs text-slate-600 font-medium">Scan with mobile camera to receive files</p>
                </div>
              )}

              {/* Connection Status Badge & Meter */}
              <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-md space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div
                      className={`w-3 h-3 rounded-full ${
                        senderStatus === 'waiting'
                          ? 'bg-amber-400 animate-ping'
                          : senderStatus === 'connecting'
                          ? 'bg-blue-400 animate-pulse'
                          : senderStatus === 'connected' || senderStatus === 'transferring'
                          ? 'bg-emerald-400'
                          : senderStatus === 'completed'
                          ? 'bg-emerald-500'
                          : 'bg-rose-500'
                      }`}
                    />
                    <span className="text-sm font-semibold capitalize tracking-wide">
                      Status: {senderStatus === 'waiting' ? 'Waiting for Receiver...' : senderStatus}
                    </span>
                  </div>

                  {senderProgress && senderProgress.speedMbits > 0 && (
                    <div className="flex items-center space-x-1.5 text-emerald-400 text-xs font-mono font-bold bg-slate-800 px-3 py-1 rounded-full border border-slate-700">
                      <Zap className="w-3.5 h-3.5" />
                      <span>{senderProgress.speedMbits} Mbit/s</span>
                    </div>
                  )}
                </div>

                {/* Progress Bar & Gauges */}
                {senderProgress && (
                  <div className="space-y-3 pt-2">
                    <div className="flex justify-between text-xs text-slate-300 font-medium">
                      <span>
                        Sending: {senderProgress.fileName} ({senderProgress.currentFileIndex}/{senderProgress.totalFilesCount})
                      </span>
                      <span>{senderProgress.percentage}%</span>
                    </div>

                    <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-300"
                        style={{ width: `${senderProgress.percentage}%` }}
                      />
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-slate-400 pt-2 border-t border-slate-800">
                      <div>
                        <span className="block text-[10px] text-slate-500 uppercase font-semibold">Transferred</span>
                        <span className="font-mono text-white">
                          {formatBytes(senderProgress.transferredBytes)} / {formatBytes(senderProgress.totalBytes)}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-slate-500 uppercase font-semibold">Speed</span>
                        <span className="font-mono text-emerald-400">{senderProgress.speedMbits} Mbit/s</span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-slate-500 uppercase font-semibold">Elapsed</span>
                        <span className="font-mono text-white">{senderProgress.elapsedSeconds}s</span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-slate-500 uppercase font-semibold">ETA</span>
                        <span className="font-mono text-white">
                          {senderProgress.etaSeconds > 0 ? `${senderProgress.etaSeconds}s` : 'Done'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Security & Privacy Notice */}
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start space-x-3 text-xs text-amber-900">
                <ShieldAlert className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block mb-0.5">Important Privacy Reminder:</span>
                  <span>
                    When you close this browser tab, your files will immediately become inaccessible. Shareguru stores
                    zero data on external servers — all transfers flow strictly peer-to-peer.
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* RECEIVER MODE */}
      {mode === 'receive' && (
        <div className="space-y-6">
          {!receiverEngine ? (
            /* Enter Room Code Card */
            <div className="bg-white border border-slate-200 rounded-3xl p-8 sm:p-12 text-center shadow-sm max-w-xl mx-auto space-y-6">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-tr from-teal-500 to-cyan-500 text-white flex items-center justify-center shadow-lg shadow-teal-500/20">
                <Download className="w-8 h-8" />
              </div>

              <div>
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Receive Shared Files</h2>
                <p className="text-sm text-slate-600 mt-1">
                  Enter the 6-character room access code provided by the sender.
                </p>
              </div>

              <div className="space-y-3">
                <input
                  type="text"
                  maxLength={10}
                  placeholder="e.g. GURU83"
                  value={receiverRoomInput}
                  onChange={(e) => setReceiverRoomInput(e.target.value.toUpperCase())}
                  className="w-full text-center tracking-widest font-mono text-2xl font-bold uppercase py-3 px-4 rounded-2xl border-2 border-slate-300 focus:border-teal-500 focus:outline-none transition-colors"
                />

                <button
                  onClick={connectReceiverSession}
                  disabled={!receiverRoomInput.trim()}
                  className="w-full py-3 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 text-white font-semibold text-sm rounded-xl shadow-md transition-all flex items-center justify-center space-x-2"
                >
                  <Zap className="w-4 h-4" />
                  <span>Connect to P2P Sender</span>
                </button>
              </div>
            </div>
          ) : (
            /* Active Receiver Room Panel */
            <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-teal-600 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200">
                    Room Code: {activeReceiverRoomId}
                  </span>
                  <h3 className="text-2xl font-bold text-slate-900 mt-1">Incoming P2P Stream</h3>
                </div>

                <button
                  onClick={resetReceiverSession}
                  className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-semibold transition-colors flex items-center space-x-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Leave Room</span>
                </button>
              </div>

              {/* Status Indicator Bar */}
              <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-md space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div
                      className={`w-3 h-3 rounded-full ${
                        receiverStatus === 'connecting'
                          ? 'bg-amber-400 animate-ping'
                          : receiverStatus === 'connected' || receiverStatus === 'transferring'
                          ? 'bg-emerald-400'
                          : receiverStatus === 'completed'
                          ? 'bg-teal-400'
                          : 'bg-rose-500'
                      }`}
                    />
                    <span className="text-sm font-semibold capitalize tracking-wide">
                      Status: {receiverStatus === 'connecting' ? 'Connecting to Sender...' : receiverStatus}
                    </span>
                  </div>

                  {receiverProgress && receiverProgress.speedMbits > 0 && (
                    <div className="flex items-center space-x-1.5 text-teal-300 text-xs font-mono font-bold bg-slate-800 px-3 py-1 rounded-full border border-slate-700">
                      <Zap className="w-3.5 h-3.5" />
                      <span>{receiverProgress.speedMbits} Mbit/s</span>
                    </div>
                  )}
                </div>

                {/* Progress Bar & Gauges */}
                {receiverProgress && (
                  <div className="space-y-3 pt-2">
                    <div className="flex justify-between text-xs text-slate-300 font-medium">
                      <span>Receiving Data Stream</span>
                      <span>{receiverProgress.percentage}%</span>
                    </div>

                    <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700">
                      <div
                        className="h-full bg-gradient-to-r from-teal-500 to-cyan-400 rounded-full transition-all duration-300"
                        style={{ width: `${receiverProgress.percentage}%` }}
                      />
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-slate-400 pt-2 border-t border-slate-800">
                      <div>
                        <span className="block text-[10px] text-slate-500 uppercase font-semibold">Received</span>
                        <span className="font-mono text-white">
                          {formatBytes(receiverProgress.transferredBytes)} / {formatBytes(receiverProgress.totalBytes)}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-slate-500 uppercase font-semibold">Speed</span>
                        <span className="font-mono text-teal-300">{receiverProgress.speedMbits} Mbit/s</span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-slate-500 uppercase font-semibold">Elapsed</span>
                        <span className="font-mono text-white">{receiverProgress.elapsedSeconds}s</span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-slate-500 uppercase font-semibold">ETA</span>
                        <span className="font-mono text-white">
                          {receiverProgress.etaSeconds > 0 ? `${receiverProgress.etaSeconds}s` : 'Done'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Received Files List & Download Controls */}
              {receivedFiles.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                    Files Delivered ({receivedFiles.length})
                  </h4>

                  <div className="space-y-2">
                    {receivedFiles.map((rf, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between bg-slate-50 border border-slate-200 p-3.5 rounded-2xl"
                      >
                        <div className="flex items-center space-x-3 overflow-hidden">
                          <FileCheck2 className="w-5 h-5 text-teal-600 flex-shrink-0" />
                          <div>
                            <span className="font-medium text-slate-900 text-sm block truncate">
                              {rf.info.name}
                            </span>
                            <span className="text-xs text-slate-500">
                              {formatBytes(rf.info.size)} • {rf.completed ? 'Ready for Download' : 'Transferring...'}
                            </span>
                          </div>
                        </div>

                        {rf.completed && rf.blobUrl && (
                          <a
                            href={rf.blobUrl}
                            download={rf.info.name}
                            className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-medium text-xs rounded-xl shadow-xs transition-colors flex items-center space-x-1.5"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Save File</span>
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Safari & Mobile Compatibility Hints */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2 text-xs text-slate-600">
                <div className="flex items-center space-x-2 text-slate-900 font-semibold">
                  <Info className="w-4 h-4 text-teal-600" />
                  <span>Browser & Device Tips:</span>
                </div>
                <ul className="list-disc list-inside space-y-1 pl-1 text-slate-500">
                  <li>
                    <strong className="text-slate-700">Safari Users:</strong> Large files loaded into Safari memory
                    require Chrome/Firefox for streaming direct to disk.
                  </li>
                  <li>
                    <strong className="text-slate-700">Mobile Devices:</strong> Keep the browser tab open in the
                    foreground so your OS doesn't pause the background network activity during large transfers.
                  </li>
                </ul>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
