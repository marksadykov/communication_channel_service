import { EventTypes } from '../types/events';

export class TypedEventEmitter<T = EventTypes> {
  private listeners: { [K in keyof T]?: Array<(data: T[K]) => void> } = {};
  private maxListeners: number = 10;

  on<K extends keyof T>(event: K, listener: (data: T[K]) => void): void {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    
    if (this.listeners[event]!.length >= this.maxListeners) {
      console.warn(`Warning: Possible memory leak detected. Event "${String(event)}" has ${this.listeners[event]!.length} listeners.`);
    }
    
    this.listeners[event]!.push(listener);
  }

  off<K extends keyof T>(event: K, listener: (data: T[K]) => void): void {
    const eventListeners = this.listeners[event];
    if (eventListeners) {
      const index = eventListeners.indexOf(listener);
      if (index > -1) {
        eventListeners.splice(index, 1);
      }
    }
  }

  emit<K extends keyof T>(event: K, data: T[K]): void {
    const eventListeners = this.listeners[event];
    if (eventListeners) {
      eventListeners.forEach(listener => {
        try {
          listener(data);
        } catch (error) {
          console.error(`Error in event listener for "${String(event)}":`, error);
        }
      });
    }
  }

  removeAllListeners<K extends keyof T>(event?: K): void {
    if (event) {
      delete this.listeners[event];
    } else {
      this.listeners = {};
    }
  }

  setMaxListeners(n: number): void {
    this.maxListeners = n;
  }
} 