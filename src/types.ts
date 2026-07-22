export interface SharedFileInfo {
  id: string;
  name: string;
  size: number;
  type: string;
  lastModified: number;
}

export type ConnectionStatus =
  | 'idle'
  | 'created'
  | 'waiting'
  | 'connecting'
  | 'connected'
  | 'transferring'
  | 'completed'
  | 'failed'
  | 'disconnected';

export interface TransferProgress {
  fileId: string;
  fileName: string;
  fileSize: number;
  transferredBytes: number;
  totalBytes: number;
  speedMbits: number; // in Mbit/s
  percentage: number;
  elapsedSeconds: number;
  etaSeconds: number;
  currentFileIndex: number;
  totalFilesCount: number;
}

export interface SignalingMessage {
  type:
    | 'join-room'
    | 'room-joined'
    | 'offer'
    | 'answer'
    | 'ice-candidate'
    | 'file-meta-sync'
    | 'peer-connected'
    | 'peer-disconnected'
    | 'error';
  roomId: string;
  role?: 'sender' | 'receiver';
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
  files?: SharedFileInfo[];
  message?: string;
}

export interface ReceivedFile {
  info: SharedFileInfo;
  chunks: Uint8Array[];
  receivedBytes: number;
  completed: boolean;
  blobUrl?: string;
}
