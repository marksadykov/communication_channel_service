import { ChannelState } from './channel';

export interface EventTypes {
  channelStateChange: {
    channelId: string;
    oldState: ChannelState;
    newState: ChannelState;
    timestamp: number;
  };
  channelSwitch: {
    fromChannelId: string;
    toChannelId: string;
    timestamp: number;
  };
  connectionLost: {
    channelId: string;
    error: Error;
    timestamp: number;
  };
  dataBuffered: {
    data: any;
    timestamp: number;
    bufferSize: number;
  };
  healthCheckFailed: {
    channelId: string;
    error: Error;
    timestamp: number;
  };
  dataReceived: {
    channelId: string;
    data: any;
    timestamp: number;
  };
} 