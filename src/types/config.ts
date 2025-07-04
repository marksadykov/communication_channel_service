import { Channel } from './channel';

export interface ServiceConfig {
  channels: Channel[];
  healthCheckInterval: number;
  maxRetries: number;
  bufferSize: number;
  failoverTimeout: number;
  enableLogging?: boolean;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
} 