import { Channel } from '../types/channel';
import { TypedEventEmitter } from '../core/TypedEventEmitter';
import { EventTypes } from '../types/events';

export class SSEConnector {
  private eventSource: EventSource | null = null;
  private isConnecting = false;

  constructor(
    private channel: Channel,
    private eventEmitter: TypedEventEmitter<EventTypes>
  ) {}

  async connect(): Promise<void> {
    if (this.isConnecting || this.eventSource?.readyState === EventSource.OPEN) {
      return;
    }

    this.isConnecting = true;

    return new Promise((resolve, reject) => {
      try {
        this.eventSource = new EventSource(this.channel.url);

        const timeout = setTimeout(() => {
          this.eventSource?.close();
          reject(new Error('SSE connection timeout'));
        }, this.channel.timeout);

        this.eventSource.onopen = () => {
          clearTimeout(timeout);
          this.isConnecting = false;
          resolve();
        };

        this.eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            this.eventEmitter.emit('dataReceived', {
              channelId: this.channel.id,
              data,
              timestamp: Date.now()
            });
          } catch (error) {
            console.error('Error parsing SSE message:', error);
          }
        };

        this.eventSource.onerror = (error) => {
          clearTimeout(timeout);
          this.isConnecting = false;
          
          if (this.eventSource?.readyState === EventSource.CLOSED) {
            this.eventEmitter.emit('connectionLost', {
              channelId: this.channel.id,
              error: new Error('SSE connection lost'),
              timestamp: Date.now()
            });
          }
          
          reject(error);
        };

      } catch (error) {
        this.isConnecting = false;
        reject(error);
      }
    });
  }

  async send(data: any): Promise<void> {
    // SSE обычно только получает данные, для отправки используем HTTP
    const response = await fetch(this.channel.url.replace('/events', '/send'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.channel.headers
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error(`SSE send failed: ${response.status}`);
    }
  }

  disconnect(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.isConnecting = false;
  }

  isConnected(): boolean {
    return this.eventSource?.readyState === EventSource.OPEN;
  }
} 