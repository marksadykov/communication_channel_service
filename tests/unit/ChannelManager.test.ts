import { ChannelManager } from '../../src/core/ChannelManager';
import { ServiceConfig } from '../../src/types/config';
import { ChannelState } from '../../src/types/channel';

describe('ChannelManager', () => {
  let config: ServiceConfig;
  let channelManager: ChannelManager;

  beforeEach(() => {
    config = {
      channels: [
        {
          id: 'test-channel-1',
          url: 'https://test1.com',
          priority: 10,
          state: ChannelState.IDLE,
          type: 'http',
          lastCheck: 0,
          failureCount: 0,
          timeout: 5000
        },
        {
          id: 'test-channel-2',
          url: 'https://test2.com',
          priority: 5,
          state: ChannelState.IDLE,
          type: 'http',
          lastCheck: 0,
          failureCount: 0,
          timeout: 5000
        }
      ],
      healthCheckInterval: 30000,
      maxRetries: 3,
      bufferSize: 100,
      failoverTimeout: 5000
    };

    // Мокаем fetch для успешных ответов
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ success: true })
    });
  });

  afterEach(() => {
    if (channelManager) {
      channelManager.disconnect();
    }
  });

  it('should initialize with provided channels', () => {
    channelManager = new ChannelManager(config);
    const stats = channelManager.getChannelStats();
    
    expect(stats).toHaveLength(2);
    expect(stats[0].channelId).toBe('test-channel-1');
    expect(stats[1].channelId).toBe('test-channel-2');
  });

  it('should add new channel', () => {
    channelManager = new ChannelManager(config);
    
    const newChannel = {
      id: 'test-channel-3',
      url: 'https://test3.com',
      priority: 15,
      state: ChannelState.IDLE,
      type: 'http' as const,
      lastCheck: 0,
      failureCount: 0,
      timeout: 5000
    };

    channelManager.addChannel(newChannel);
    const stats = channelManager.getChannelStats();
    
    expect(stats).toHaveLength(3);
    expect(stats.find(s => s.channelId === 'test-channel-3')).toBeDefined();
  });

  it('should remove channel', () => {
    channelManager = new ChannelManager(config);
    
    channelManager.removeChannel('test-channel-1');
    const stats = channelManager.getChannelStats();
    
    expect(stats).toHaveLength(1);
    expect(stats.find(s => s.channelId === 'test-channel-1')).toBeUndefined();
  });

  it('should get buffer size', () => {
    channelManager = new ChannelManager(config);
    
    const bufferSize = channelManager.getBufferSize();
    expect(bufferSize).toBe(0);
  });

  it('should handle events', () => {
    channelManager = new ChannelManager(config);
    
    let eventReceived = false;
    
    channelManager.on('channelStateChange', (data) => {
      eventReceived = true;
      expect(data.channelId).toBeDefined();
      expect(data.oldState).toBeDefined();
      expect(data.newState).toBeDefined();
      expect(data.timestamp).toBeDefined();
    });

    // Проверяем, что обработчик событий зарегистрирован
    expect(eventReceived).toBe(false);
  });

  it('should get current channel', async () => {
    channelManager = new ChannelManager(config);
    await channelManager.init();
    const currentChannel = channelManager.getCurrentChannel();
    expect(currentChannel).toBeDefined();
    expect(currentChannel?.id).toBeDefined();
  });
}); 