export enum ChannelState {
  IDLE = 'idle',
  CONNECTED = 'connected',
  UNAVAILABLE = 'unavailable'
}

export interface Channel {
  id: string;
  url: string;
  priority: number;
  state: ChannelState;
  type: 'websocket' | 'http' | 'sse';
  lastCheck: number;
  failureCount: number;
  timeout: number;
  headers?: Record<string, string>;
  retryInterval?: number;
}

export interface ChannelStats {
  channelId: string;
  state: ChannelState;
  failureCount: number;
  lastCheck: number;
  uptime: number;
} 