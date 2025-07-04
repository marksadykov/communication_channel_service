import { ChannelManager, ServiceConfig, ChannelState } from '../index';

// Пример базового использования
const config: ServiceConfig = {
  channels: [
    {
      id: 'primary-api',
      url: 'https://api.primary.com',
      priority: 10,
      state: ChannelState.IDLE,
      type: 'http',
      lastCheck: 0,
      failureCount: 0,
      timeout: 5000,
      headers: {
        'Authorization': 'Bearer token123'
      }
    },
    {
      id: 'backup-api',
      url: 'https://api.backup.com',
      priority: 5,
      state: ChannelState.IDLE,
      type: 'http',
      lastCheck: 0,
      failureCount: 0,
      timeout: 5000
    },
    {
      id: 'websocket-channel',
      url: 'wss://ws.example.com',
      priority: 8,
      state: ChannelState.IDLE,
      type: 'websocket',
      lastCheck: 0,
      failureCount: 0,
      timeout: 3000
    }
  ],
  healthCheckInterval: 30000,
  maxRetries: 3,
  bufferSize: 1000,
  failoverTimeout: 5000,
  enableLogging: true,
  logLevel: 'info'
};

async function main() {
  const channelManager = new ChannelManager(config);

  // Подписка на события
  channelManager.on('channelSwitch', (data) => {
    console.log(`Switched from ${data.fromChannelId} to ${data.toChannelId}`);
  });

  channelManager.on('connectionLost', (data) => {
    console.error(`Connection lost on channel ${data.channelId}:`, data.error);
  });

  channelManager.on('dataReceived', (data) => {
    console.log(`Received data from ${data.channelId}:`, data.data);
  });

  // Отправка данных
  try {
    await channelManager.sendData({ 
      message: 'Hello World', 
      timestamp: Date.now() 
    });
    
    console.log('Data sent successfully');
  } catch (error) {
    console.error('Failed to send data:', error);
  }

  // Получение статистики
  const stats = channelManager.getChannelStats();
  console.log('Channel stats:', stats);

  // Добавление нового канала
  channelManager.addChannel({
    id: 'emergency-channel',
    url: 'https://emergency.api.com',
    priority: 15,
    state: ChannelState.IDLE,
    type: 'http',
    lastCheck: 0,
    failureCount: 0,
    timeout: 2000
  });

  // Изящное отключение через 30 секунд
  setTimeout(async () => {
    await channelManager.disconnect();
    console.log('Service disconnected');
  }, 30000);
}

main().catch(console.error); 