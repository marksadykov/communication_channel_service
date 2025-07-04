import { Channel, ChannelState } from '../types/channel';

export class ChannelPriorityQueue {
  private channels: Channel[] = [];
  private channelMap: Map<string, Channel> = new Map();

  enqueue(channel: Channel): void {
    this.channels.push(channel);
    this.channelMap.set(channel.id, channel);
    this.sort();
  }

  dequeue(): Channel | undefined {
    return this.channels.shift();
  }

  getAvailableChannels(): Channel[] {
    return this.channels.filter(ch => ch.state === ChannelState.IDLE);
  }

  getChannelById(channelId: string): Channel | undefined {
    return this.channelMap.get(channelId);
  }

  updateChannelState(channelId: string, state: ChannelState): void {
    const channel = this.channelMap.get(channelId);
    if (channel) {
      channel.state = state;
      this.sort();
    }
  }

  removeChannel(channelId: string): boolean {
    const channel = this.channelMap.get(channelId);
    if (channel) {
      const index = this.channels.indexOf(channel);
      if (index > -1) {
        this.channels.splice(index, 1);
        this.channelMap.delete(channelId);
        return true;
      }
    }
    return false;
  }

  getAllChannels(): Channel[] {
    return [...this.channels];
  }

  private sort(): void {
    this.channels.sort((a, b) => {
      // Сначала сортируем по состоянию (IDLE каналы имеют приоритет)
      if (a.state === ChannelState.IDLE && b.state !== ChannelState.IDLE) return -1;
      if (a.state !== ChannelState.IDLE && b.state === ChannelState.IDLE) return 1;
      
      // Затем по приоритету (больший приоритет = выше в очереди)
      if (a.priority !== b.priority) return b.priority - a.priority;
      
      // Затем по количеству ошибок (меньше ошибок = выше в очереди)
      return a.failureCount - b.failureCount;
    });
  }
} 