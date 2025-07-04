export { ChannelManager } from './core/ChannelManager';
export { TypedEventEmitter } from './core/TypedEventEmitter';
export { Channel, ChannelState, ChannelStats } from './types/channel';
export { ServiceConfig } from './types/config';
export { EventTypes } from './types/events';

// Дополнительные экспорты для продвинутого использования
export { ChannelPriorityQueue } from './core/ChannelPriorityQueue';
export { ChannelHealthChecker } from './core/ChannelHealthChecker';
export { DataBuffer } from './core/DataBuffer';
export { WebSocketConnector } from './connectors/WebSocketConnector';
export { HttpConnector } from './connectors/HttpConnector';
export { SSEConnector } from './connectors/SSEConnector';

// Утилиты
export { Logger, LogLevel, logger } from './utils/logger';
export { RetryUtil, RetryOptions } from './utils/retry'; 