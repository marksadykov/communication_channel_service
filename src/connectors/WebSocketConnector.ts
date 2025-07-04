import WebSocket from 'ws';
import { Channel } from '../types/channel';
import { TypedEventEmitter } from '../core/TypedEventEmitter';
import { EventTypes } from '../types/events';

export class WebSocketConnector {
  private ws: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private isConnecting = false;

  constructor(
    private channel: Channel,
    private eventEmitter: TypedEventEmitter<EventTypes>
  ) {}

  async connect(): Promise<void> {
    if (this.isConnecting || this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    this.isConnecting = true;

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.channel.url);

        const timeout = setTimeout(() => {
          this.ws?.close();
          reject(new Error('WebSocket connection timeout'));
        }, this.channel.timeout);

        this.ws.onopen = () => {
          clearTimeout(timeout);
          this.isConnecting = false;
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data.toString());
            this.eventEmitter.emit('dataReceived', {
              channelId: this.channel.id,
              data,
              timestamp: Date.now()
            });
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };

        this.ws.onclose = () => {
          this.isConnecting = false;
          if (this.ws?.readyState !== WebSocket.CLOSED) {
            this.eventEmitter.emit('connectionLost', {
              channelId: this.channel.id,
              error: new Error('WebSocket connection closed'),
              timestamp: Date.now()
            });
          }
        };

        this.ws.onerror = (error) => {
          clearTimeout(timeout);
          this.isConnecting = false;
          reject(error);
        };

      } catch (error) {
        this.isConnecting = false;
        reject(error);
      }
    });
  }

  async send(data: any): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket is not connected');
    }

    return new Promise((resolve, reject) => {
      this.ws!.send(JSON.stringify(data), (error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.isConnecting = false;
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
} 