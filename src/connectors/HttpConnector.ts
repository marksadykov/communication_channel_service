import { Channel } from '../types/channel';
import { TypedEventEmitter } from '../core/TypedEventEmitter';
import { EventTypes } from '../types/events';

export class HttpConnector {
  private abortController: AbortController | null = null;

  constructor(
    private channel: Channel,
    private eventEmitter: TypedEventEmitter<EventTypes>
  ) {}

  async connect(): Promise<void> {
    // Для HTTP проверяем доступность эндпоинта
    const response = await this.makeRequest('GET', '/health');
    if (!response.ok) {
      throw new Error(`HTTP connection failed: ${response.status}`);
    }
  }

  async send(data: any): Promise<void> {
    const response = await this.makeRequest('POST', '/data', data);
    if (!response.ok) {
      throw new Error(`HTTP send failed: ${response.status}`);
    }

    const responseData = await response.json();
    this.eventEmitter.emit('dataReceived', {
      channelId: this.channel.id,
      data: responseData,
      timestamp: Date.now()
    });
  }

  private async makeRequest(method: string, path: string, data?: any): Promise<Response> {
    this.abortController = new AbortController();
    
    const timeout = setTimeout(() => {
      this.abortController?.abort();
    }, this.channel.timeout);

    try {
      const response = await fetch(`${this.channel.url}${path}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...this.channel.headers
        },
        body: data ? JSON.stringify(data) : undefined,
        signal: this.abortController.signal
      });

      clearTimeout(timeout);
      return response;
    } catch (error) {
      clearTimeout(timeout);
      throw error;
    }
  }

  disconnect(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  isConnected(): boolean {
    return true; // HTTP не имеет постоянного соединения
  }
} 