import { SharedFileInfo, ConnectionStatus, TransferProgress, ReceivedFile } from '../types';

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
  ],
};

const CHUNK_SIZE = 64 * 1024; // 64 KB chunks for optimal WebRTC throughput
const MAX_BUFFERED_AMOUNT = 1 * 1024 * 1024; // 1 MB buffer limit

export class PeerTransferEngine {
  private roomId: string;
  private role: 'sender' | 'receiver';
  private pc: RTCPeerConnection | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private ws: WebSocket | null = null;
  private bc: BroadcastChannel | null = null;

  private filesToSend: File[] = [];
  private receivedFilesMap: Map<string, ReceivedFile> = new Map();

  private status: ConnectionStatus = 'idle';
  private onStatusChangeCallbacks: ((status: ConnectionStatus) => void)[] = [];
  private onProgressCallbacks: ((progress: TransferProgress) => void)[] = [];
  private onFilesReceivedCallbacks: ((files: ReceivedFile[]) => void)[] = [];
  private onIncomingMetaCallbacks: ((files: SharedFileInfo[]) => void)[] = [];

  // Transfer stats tracking
  private totalTransferSize = 0;
  private totalBytesProcessed = 0;
  private transferStartTime = 0;
  private lastSpeedCheckTime = 0;
  private lastSpeedCheckBytes = 0;
  private currentSpeedMbits = 0;

  constructor(roomId: string, role: 'sender' | 'receiver') {
    this.roomId = roomId;
    this.role = role;
    this.setupBroadcastChannel();
  }

  public setFilesToSend(files: File[]) {
    this.filesToSend = files;
    this.totalTransferSize = files.reduce((acc, f) => acc + f.size, 0);
  }

  public onStatusChange(cb: (status: ConnectionStatus) => void) {
    this.onStatusChangeCallbacks.push(cb);
  }

  public onProgress(cb: (progress: TransferProgress) => void) {
    this.onProgressCallbacks.push(cb);
  }

  public onFilesReceived(cb: (files: ReceivedFile[]) => void) {
    this.onFilesReceivedCallbacks.push(cb);
  }

  public onIncomingMeta(cb: (files: SharedFileInfo[]) => void) {
    this.onIncomingMetaCallbacks.push(cb);
  }

  private updateStatus(newStatus: ConnectionStatus) {
    this.status = newStatus;
    this.onStatusChangeCallbacks.forEach((cb) => cb(newStatus));
  }

  private setupBroadcastChannel() {
    try {
      this.bc = new BroadcastChannel(`shareguru_room_${this.roomId}`);
      this.bc.onmessage = (e) => {
        this.handleSignalingPayload(e.data);
      };
    } catch {
      // BroadcastChannel not supported or error
    }
  }

  private sendSignalingPayload(payload: object) {
    // Send over WebSocket if connected
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload));
    }
    // Also send over BroadcastChannel for local same-origin multi-tab testing
    if (this.bc) {
      try {
        this.bc.postMessage(payload);
      } catch {
        // ignore
      }
    }
  }

  public initSignaling() {
    this.updateStatus('connecting');

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.sendSignalingPayload({
          type: 'join-room',
          roomId: this.roomId,
          role: this.role,
        });

        if (this.role === 'sender') {
          this.updateStatus('waiting');
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          this.handleSignalingPayload(msg);
        } catch {
          // ignore invalid json
        }
      };

      this.ws.onerror = () => {
        // Fallback to local mode if ws fails
        if (this.role === 'sender') {
          this.updateStatus('waiting');
        }
      };

      this.ws.onclose = () => {
        if (this.status !== 'completed' && this.status !== 'transferring') {
          // Attempt retry if needed
        }
      };
    } catch {
      if (this.role === 'sender') {
        this.updateStatus('waiting');
      }
    }
  }

  private async handleSignalingPayload(msg: any) {
    if (!msg || msg.roomId !== this.roomId) return;

    switch (msg.type) {
      case 'peer-joined':
        if (this.role === 'sender') {
          // Receiver joined room, create offer!
          await this.createPeerConnection();
          this.createAndSendOffer();
        }
        break;

      case 'offer':
        if (this.role === 'receiver') {
          await this.createPeerConnection();
          await this.handleOfferAndSendAnswer(msg.offer);
        }
        break;

      case 'answer':
        if (this.role === 'sender' && this.pc) {
          await this.pc.setRemoteDescription(new RTCSessionDescription(msg.answer));
        }
        break;

      case 'ice-candidate':
        if (this.pc && msg.candidate) {
          try {
            await this.pc.addIceCandidate(new RTCIceCandidate(msg.candidate));
          } catch {
            // ICE candidate error non-fatal
          }
        }
        break;

      case 'peer-disconnected':
        if (this.status !== 'completed') {
          this.updateStatus('disconnected');
        }
        break;
    }
  }

  private async createPeerConnection() {
    if (this.pc) return;

    this.pc = new RTCPeerConnection(ICE_SERVERS);

    this.pc.onicecandidate = (e) => {
      if (e.candidate) {
        this.sendSignalingPayload({
          type: 'ice-candidate',
          roomId: this.roomId,
          candidate: e.candidate,
        });
      }
    };

    this.pc.onconnectionstatechange = () => {
      if (this.pc) {
        const state = this.pc.connectionState;
        if (state === 'connected') {
          this.updateStatus('connected');
        } else if (state === 'disconnected' || state === 'failed') {
          if (this.status !== 'completed') {
            this.updateStatus('disconnected');
          }
        }
      }
    };

    if (this.role === 'sender') {
      // Create Data Channel
      this.dataChannel = this.pc.createDataChannel('shareguru-files', {
        ordered: true,
      });
      this.setupDataChannel(this.dataChannel);
    } else {
      // Receive Data Channel
      this.pc.ondatachannel = (e) => {
        this.dataChannel = e.channel;
        this.setupDataChannel(this.dataChannel);
      };
    }
  }

  private async createAndSendOffer() {
    if (!this.pc) return;
    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);

    this.sendSignalingPayload({
      type: 'offer',
      roomId: this.roomId,
      offer: offer,
    });
  }

  private async handleOfferAndSendAnswer(offer: RTCSessionDescriptionInit) {
    if (!this.pc) return;
    await this.pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);

    this.sendSignalingPayload({
      type: 'answer',
      roomId: this.roomId,
      answer: answer,
    });
  }

  private setupDataChannel(channel: RTCDataChannel) {
    channel.binaryType = 'arraybuffer';

    channel.onopen = () => {
      this.updateStatus('connected');
      if (this.role === 'sender' && this.filesToSend.length > 0) {
        this.sendMetadataAndStartTransfer();
      }
    };

    channel.onclose = () => {
      if (this.status !== 'completed') {
        this.updateStatus('disconnected');
      }
    };

    channel.onerror = (err) => {
      console.error('DataChannel error:', err);
    };

    channel.onmessage = (event) => {
      this.handleIncomingDataChannelMessage(event.data);
    };
  }

  // Sender: Sending files over DataChannel
  private async sendMetadataAndStartTransfer() {
    if (!this.dataChannel || this.dataChannel.readyState !== 'open') return;

    const fileMetas: SharedFileInfo[] = this.filesToSend.map((f, idx) => ({
      id: `file_${idx}_${Date.now()}`,
      name: f.webkitRelativePath || f.name,
      size: f.size,
      type: f.type || 'application/octet-stream',
      lastModified: f.lastModified,
    }));

    // Send metadata header
    const header = JSON.stringify({
      type: 'METADATA',
      files: fileMetas,
      totalSize: this.totalTransferSize,
    });
    this.dataChannel.send(header);

    this.updateStatus('transferring');
    this.transferStartTime = Date.now();
    this.lastSpeedCheckTime = Date.now();
    this.lastSpeedCheckBytes = 0;
    this.totalBytesProcessed = 0;

    // Stream files chunk by chunk
    for (let i = 0; i < this.filesToSend.length; i++) {
      const file = this.filesToSend[i];
      const meta = fileMetas[i];

      // Notify file start
      this.dataChannel.send(
        JSON.stringify({
          type: 'START_FILE',
          fileId: meta.id,
        })
      );

      let offset = 0;
      while (offset < file.size) {
        // Handle backpressure
        if (this.dataChannel.bufferedAmount > MAX_BUFFERED_AMOUNT) {
          await new Promise<void>((resolve) => {
            if (this.dataChannel) {
              this.dataChannel.bufferedAmountLowThreshold = MAX_BUFFERED_AMOUNT / 2;
              this.dataChannel.onbufferedamountlow = () => {
                if (this.dataChannel) this.dataChannel.onbufferedamountlow = null;
                resolve();
              };
            } else {
              resolve();
            }
          });
        }

        const slice = file.slice(offset, offset + CHUNK_SIZE);
        const buffer = await slice.arrayBuffer();

        if (this.dataChannel && this.dataChannel.readyState === 'open') {
          this.dataChannel.send(buffer);
        } else {
          break;
        }

        offset += buffer.byteLength;
        this.totalBytesProcessed += buffer.byteLength;
        this.updateTransferProgress(meta.id, meta.name, file.size, offset, i, this.filesToSend.length);
      }

      // Notify file end
      if (this.dataChannel && this.dataChannel.readyState === 'open') {
        this.dataChannel.send(
          JSON.stringify({
            type: 'END_FILE',
            fileId: meta.id,
          })
        );
      }
    }

    // Notify all files complete
    if (this.dataChannel && this.dataChannel.readyState === 'open') {
      this.dataChannel.send(JSON.stringify({ type: 'ALL_COMPLETE' }));
    }

    this.updateStatus('completed');
  }

  // Receiver: Handling incoming data channel chunks
  private currentReceivingFileId: string | null = null;

  private handleIncomingDataChannelMessage(data: any) {
    if (typeof data === 'string') {
      try {
        const msg = JSON.parse(data);

        if (msg.type === 'METADATA') {
          this.totalTransferSize = msg.totalSize;
          const files: SharedFileInfo[] = msg.files;

          this.onIncomingMetaCallbacks.forEach((cb) => cb(files));

          files.forEach((fileInfo) => {
            this.receivedFilesMap.set(fileInfo.id, {
              info: fileInfo,
              chunks: [],
              receivedBytes: 0,
              completed: false,
            });
          });

          this.updateStatus('transferring');
          this.transferStartTime = Date.now();
          this.lastSpeedCheckTime = Date.now();
          this.lastSpeedCheckBytes = 0;
          this.totalBytesProcessed = 0;
        } else if (msg.type === 'START_FILE') {
          this.currentReceivingFileId = msg.fileId;
        } else if (msg.type === 'END_FILE') {
          const recFile = this.receivedFilesMap.get(msg.fileId);
          if (recFile) {
            recFile.completed = true;
            // Assemble blob
            const blob = new Blob(recFile.chunks, { type: recFile.info.type });
            recFile.blobUrl = URL.createObjectURL(blob);
          }
          this.currentReceivingFileId = null;
          this.triggerReceivedFilesUpdate();
        } else if (msg.type === 'ALL_COMPLETE') {
          this.updateStatus('completed');
          this.triggerReceivedFilesUpdate();
        }
      } catch {
        // String message parsing error
      }
    } else if (data instanceof ArrayBuffer) {
      if (!this.currentReceivingFileId) return;

      const recFile = this.receivedFilesMap.get(this.currentReceivingFileId);
      if (recFile) {
        recFile.chunks.push(new Uint8Array(data));
        recFile.receivedBytes += data.byteLength;
        this.totalBytesProcessed += data.byteLength;

        this.updateTransferProgress(
          recFile.info.id,
          recFile.info.name,
          recFile.info.size,
          recFile.receivedBytes,
          0,
          this.receivedFilesMap.size
        );
      }
    }
  }

  private updateTransferProgress(
    fileId: string,
    fileName: string,
    fileSize: number,
    fileTransferredBytes: number,
    currentIdx: number,
    totalCount: number
  ) {
    const now = Date.now();
    const timeDeltaSec = (now - this.lastSpeedCheckTime) / 1000;

    if (timeDeltaSec >= 0.3) {
      const bytesDelta = this.totalBytesProcessed - this.lastSpeedCheckBytes;
      // Calculate speed in Mbit/s
      const mbits = (bytesDelta * 8) / (timeDeltaSec * 1_000_000);
      this.currentSpeedMbits = Math.max(0.1, Number(mbits.toFixed(1)));

      this.lastSpeedCheckTime = now;
      this.lastSpeedCheckBytes = this.totalBytesProcessed;
    }

    const elapsedSeconds = Math.max(0.1, (now - this.transferStartTime) / 1000);
    const percentage =
      this.totalTransferSize > 0
        ? Math.min(100, Math.round((this.totalBytesProcessed / this.totalTransferSize) * 100))
        : 0;

    const remainingBytes = Math.max(0, this.totalTransferSize - this.totalBytesProcessed);
    const avgBytesPerSec = this.totalBytesProcessed / elapsedSeconds;
    const etaSeconds = avgBytesPerSec > 0 ? Math.round(remainingBytes / avgBytesPerSec) : 0;

    const progress: TransferProgress = {
      fileId,
      fileName,
      fileSize,
      transferredBytes: fileTransferredBytes,
      totalBytes: this.totalTransferSize,
      speedMbits: this.currentSpeedMbits,
      percentage,
      elapsedSeconds: Math.round(elapsedSeconds),
      etaSeconds,
      currentFileIndex: currentIdx + 1,
      totalFilesCount: totalCount,
    };

    this.onProgressCallbacks.forEach((cb) => cb(progress));
  }

  private triggerReceivedFilesUpdate() {
    const files = Array.from(this.receivedFilesMap.values());
    this.onFilesReceivedCallbacks.forEach((cb) => cb(files));
  }

  public destroy() {
    if (this.dataChannel) {
      try {
        this.dataChannel.close();
      } catch {
        // ignore
      }
    }
    if (this.pc) {
      try {
        this.pc.close();
      } catch {
        // ignore
      }
    }
    if (this.ws) {
      try {
        this.ws.close();
      } catch {
        // ignore
      }
    }
    if (this.bc) {
      try {
        this.bc.close();
      } catch {
        // ignore
      }
    }
  }
}
