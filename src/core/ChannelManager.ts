import { Channel, ChannelState, ChannelStats } from '../types/channel';
import { ServiceConfig } from '../types/config';
import { EventTypes } from '../types/events';
import { TypedEventEmitter } from './TypedEventEmitter';
import { ChannelPriorityQueue } from './ChannelPriorityQueue';
import { ChannelHealthChecker } from './ChannelHealthChecker';
import { DataBuffer } from './DataBuffer';
import { WebSocketConnector } from '../connectors/WebSocketConnector';
import { HttpConnector } from '../connectors/HttpConnector';
import { SSEConnector } from '../connectors/SSEConnector';

export class ChannelManager {
  private channels: ChannelPriorityQueue;
  private healthChecker: ChannelHealthChecker;
  private dataBuffer: DataBuffer;
  private eventEmitter: TypedEventEmitter<EventTypes>;
  private currentChannel: Channel | null = null;
  private switchingInProgress = false;
  private connectors: Map<string, WebSocketConnector | HttpConnector | SSEConnector> = new Map();

  constructor(private config: ServiceConfig) {
    this.eventEmitter = new TypedEventEmitter<EventTypes>();
    this.channels = new ChannelPriorityQueue();
    this.healthChecker = new ChannelHealthChecker(this.eventEmitter);
    this.dataBuffer = new DataBuffer(config.bufferSize, this.eventEmitter);
    
    this.initializeChannels();
    this.setupEventHandlers();
    // Удаляю вызов establishInitialConnection() из конструктора
  }

  async init(): Promise<void> {
    await this.establishInitialConnection();
  }

  private initializeChannels(): void {
    this.config.channels.forEach(channel => {
      this.channels.enqueue(channel);
      this.healthChecker.startMonitoring(channel, this.config.healthCheckInterval);
    });
  }

  private setupEventHandlers(): void {
    this.eventEmitter.on('channelStateChange', (data) => {
      this.channels.updateChannelState(data.channelId, data.newState);
      
      if (this.currentChannel?.id === data.channelId && 
          data.newState === ChannelState.UNAVAILABLE) {
        this.switchToNextChannel();
      }
    });

    this.eventEmitter.on('connectionLost', (data) => {
      if (this.currentChannel?.id === data.channelId) {
        this.switchToNextChannel();
      }
    });
  }

  private async establishInitialConnection(): Promise<void> {
    const availableChannels = this.channels.getAvailableChannels();
    
    if (availableChannels.length === 0) {
      throw new Error('No available channels for connection');
    }
    
    const channel = availableChannels[0];
    await this.connectToChannel(channel);
  }

  private async switchToNextChannel(): Promise<void> {
    if (this.switchingInProgress) return;
    
    this.switchingInProgress = true;
    
    try {
      const availableChannels = this.channels.getAvailableChannels()
        .filter(ch => ch.id !== this.currentChannel?.id);
      
      if (availableChannels.length === 0) {
        this.eventEmitter.emit('connectionLost', {
          channelId: this.currentChannel?.id || 'unknown',
          error: new Error('No available channels'),
          timestamp: Date.now()
        });
        this.currentChannel = null;
        return;
      }
      
      const nextChannel = availableChannels[0];
      const previousChannel = this.currentChannel;
      
      await this.connectToChannel(nextChannel);
      
      if (previousChannel) {
        this.disconnectFromChannel(previousChannel);
        this.eventEmitter.emit('channelSwitch', {
          fromChannelId: previousChannel.id,
          toChannelId: nextChannel.id,
          timestamp: Date.now()
        });
      }
      
      await this.dataBuffer.flush(async (data) => {
        await this.sendData(data);
      });
      
    } catch (error) {
      console.error('Error during channel switch:', error);
    } finally {
      this.switchingInProgress = false;
    }
  }

  private async connectToChannel(channel: Channel): Promise<void> {
    try {
      let connector;
      
      switch (channel.type) {
        case 'websocket':
          connector = new WebSocketConnector(channel, this.eventEmitter);
          break;
        case 'http':
          connector = new HttpConnector(channel, this.eventEmitter);
          break;
        case 'sse':
          connector = new SSEConnector(channel, this.eventEmitter);
          break;
        default:
          throw new Error(`Unsupported channel type: ${channel.type}`);
      }
      
      await connector.connect();
      
      if (this.currentChannel) {
        this.currentChannel.state = ChannelState.IDLE;
      }
      
      this.currentChannel = channel;
      channel.state = ChannelState.CONNECTED;
      this.connectors.set(channel.id, connector);
      
    } catch (error) {
      channel.state = ChannelState.UNAVAILABLE;
      channel.failureCount++;
      throw error;
    }
  }

  private disconnectFromChannel(channel: Channel): void {
    const connector = this.connectors.get(channel.id);
    if (connector) {
      connector.disconnect();
      this.connectors.delete(channel.id);
    }
    channel.state = ChannelState.IDLE;
  }

  async sendData(data: any, priority: number = 0): Promise<void> {
    if (!this.currentChannel || this.currentChannel.state !== ChannelState.CONNECTED) {
      this.dataBuffer.add(data, priority);
      return;
    }
    
    const connector = this.connectors.get(this.currentChannel.id);
    if (!connector) {
      this.dataBuffer.add(data, priority);
      return;
    }
    
    try {
      await connector.send(data);
    } catch (error) {
      this.dataBuffer.add(data, priority);
      this.eventEmitter.emit('connectionLost', {
        channelId: this.currentChannel.id,
        error: error as Error,
        timestamp: Date.now()
      });
    }
  }

  // Публичные методы
  addChannel(channel: Channel): void {
    this.channels.enqueue(channel);
    this.healthChecker.startMonitoring(channel, this.config.healthCheckInterval);
  }

  removeChannel(channelId: string): void {
    this.healthChecker.stopMonitoring(channelId);
    
    const connector = this.connectors.get(channelId);
    if (connector) {
      connector.disconnect();
      this.connectors.delete(channelId);
    }
    
    this.channels.removeChannel(channelId);
    
    if (this.currentChannel?.id === channelId) {
      this.currentChannel = null;
      this.switchToNextChannel();
    }
  }

  getCurrentChannel(): Channel | null {
    return this.currentChannel;
  }

  getChannelStats(): ChannelStats[] {
    return this.channels.getAllChannels().map(ch => ({
      channelId: ch.id,
      state: ch.state,
      failureCount: ch.failureCount,
      lastCheck: ch.lastCheck,
      uptime: ch.lastCheck - ch.lastCheck // Simplified calculation
    }));
  }

  getBufferSize(): number {
    return this.dataBuffer.getSize();
  }

  on<K extends keyof EventTypes>(event: K, listener: (data: EventTypes[K]) => void): void {
    this.eventEmitter.on(event, listener);
  }

  off<K extends keyof EventTypes>(event: K, listener: (data: EventTypes[K]) => void): void {
    this.eventEmitter.off(event, listener);
  }

  async disconnect(): Promise<void> {
    this.connectors.forEach(connector => {
      connector.disconnect();
    });
    this.connectors.clear();
    
    this.channels.getAllChannels().forEach(channel => {
      this.healthChecker.stopMonitoring(channel.id);
    });
    
    this.eventEmitter.removeAllListeners();
  }
} 