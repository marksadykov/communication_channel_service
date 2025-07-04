import { TypedEventEmitter } from './TypedEventEmitter';
import { EventTypes } from '../types/events';

interface BufferItem {
  data: any;
  timestamp: number;
  retryCount: number;
  priority: number;
}

export class DataBuffer {
  private buffer: BufferItem[] = [];
  private maxSize: number;
  private processing = false;
  private eventEmitter: TypedEventEmitter<EventTypes>;

  constructor(maxSize: number = 1000, eventEmitter: TypedEventEmitter<EventTypes>) {
    this.maxSize = maxSize;
    this.eventEmitter = eventEmitter;
  }

  add(data: any, priority: number = 0): void {
    if (this.buffer.length >= this.maxSize) {
      // Удаляем самый старый элемент с наименьшим приоритетом
      this.buffer.sort((a, b) => a.priority - b.priority || a.timestamp - b.timestamp);
      this.buffer.shift();
    }
    
    const item: BufferItem = {
      data,
      timestamp: Date.now(),
      retryCount: 0,
      priority
    };
    
    this.buffer.push(item);
    this.sortBuffer();
    
    this.eventEmitter.emit('dataBuffered', {
      data,
      timestamp: item.timestamp,
      bufferSize: this.buffer.length
    });
  }

  async flush(sendFunction: (data: any) => Promise<void>): Promise<void> {
    if (this.processing || this.buffer.length === 0) return;
    
    this.processing = true;
    const itemsToProcess = [...this.buffer];
    this.buffer = [];
    
    try {
      for (const item of itemsToProcess) {
        try {
          await sendFunction(item.data);
        } catch (error) {
          item.retryCount++;
          if (item.retryCount < 3) {
            this.buffer.push(item);
          }
        }
      }
    } finally {
      this.processing = false;
    }
  }

  getSize(): number {
    return this.buffer.length;
  }

  clear(): void {
    this.buffer = [];
  }

  private sortBuffer(): void {
    this.buffer.sort((a, b) => {
      // Сначала по приоритету (больший приоритет = первый)
      if (a.priority !== b.priority) return b.priority - a.priority;
      // Затем по времени (старше = первый)
      return a.timestamp - b.timestamp;
    });
  }
} 