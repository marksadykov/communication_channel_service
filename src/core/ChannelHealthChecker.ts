import { Channel, ChannelState } from '../types/channel';
import { TypedEventEmitter } from './TypedEventEmitter';
import { EventTypes } from '../types/events';

export class ChannelHealthChecker {
  private checks = new Map<string, ReturnType<typeof setInterval>>();
  private eventEmitter: TypedEventEmitter<EventTypes>;
  private abortControllers = new Map<string, AbortController>();

  constructor(eventEmitter: TypedEventEmitter<EventTypes>) {
    this.eventEmitter = eventEmitter;
  }

  startMonitoring(channel: Channel, interval: number = 30000): void {
    this.stopMonitoring(channel.id);
    
    const checkId = setInterval(async () => {
      await this.checkChannelHealth(channel);
    }, interval);
    
    this.checks.set(channel.id, checkId);
  }

  stopMonitoring(channelId: string): void {
    const checkId = this.checks.get(channelId);
    if (checkId) {
      clearInterval(checkId);
      this.checks.delete(channelId);
    }
    
    const controller = this.abortControllers.get(channelId);
    if (controller) {
      controller.abort();
      this.abortControllers.delete(channelId);
    }
  }

  private async checkChannelHealth(channel: Channel): Promise<void> {
    const startTime = Date.now();
    
    try {
      const response = await this.performHealthCheck(channel);
      const responseTime = Date.now() - startTime;
      
      if (response.ok && responseTime < channel.timeout) {
        this.handleHealthCheckSuccess(channel);
      } else {
        this.handleHealthCheckFailure(channel, new Error(`Health check failed: ${response.status}`));
      }
    } catch (error) {
      this.handleHealthCheckFailure(channel, error as Error);
    }
  }

  private async performHealthCheck(channel: Channel): Promise<{ ok: boolean; status: number }> {
    const controller = new AbortController();
    this.abortControllers.set(channel.id, controller);
    
    const timeoutId = setTimeout(() => {
      controller.abort();
      this.abortControllers.delete(channel.id);
    }, channel.timeout);
    
    try {
      const healthUrl = this.getHealthCheckUrl(channel);
      const response = await fetch(healthUrl, {
        signal: controller.signal,
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...channel.headers
        }
      });
      
      clearTimeout(timeoutId);
      this.abortControllers.delete(channel.id);
      
      return { ok: response.ok, status: response.status };
    } catch (error) {
      clearTimeout(timeoutId);
      this.abortControllers.delete(channel.id);
      throw error;
    }
  }

  private getHealthCheckUrl(channel: Channel): string {
    switch (channel.type) {
      case 'websocket':
        return channel.url.replace('ws://', 'http://').replace('wss://', 'https://') + '/health';
      case 'http':
      case 'sse':
        return `${channel.url}/health`;
      default:
        return `${channel.url}/health`;
    }
  }

  private handleHealthCheckSuccess(channel: Channel): void {
    if (channel.state === ChannelState.UNAVAILABLE) {
      const oldState = channel.state;
      channel.state = ChannelState.IDLE;
      channel.failureCount = 0;
      
      this.eventEmitter.emit('channelStateChange', {
        channelId: channel.id,
        oldState,
        newState: ChannelState.IDLE,
        timestamp: Date.now()
      });
    }
  }

  private handleHealthCheckFailure(channel: Channel, error: Error): void {
    channel.failureCount++;
    
    this.eventEmitter.emit('healthCheckFailed', {
      channelId: channel.id,
      error,
      timestamp: Date.now()
    });
    
    if (channel.failureCount >= 3) {
      const oldState = channel.state;
      channel.state = ChannelState.UNAVAILABLE;
      
      this.eventEmitter.emit('channelStateChange', {
        channelId: channel.id,
        oldState,
        newState: ChannelState.UNAVAILABLE,
        timestamp: Date.now()
      });
    }
  }
} 