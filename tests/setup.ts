// Глобальные настройки для тестов
beforeEach(() => {
  // Сброс таймеров перед каждым тестом
  jest.useFakeTimers();
});

afterEach(() => {
  // Восстановление таймеров после каждого теста
  jest.useRealTimers();
  jest.clearAllTimers();
});

// Мок для fetch API
global.fetch = jest.fn();

// Мок для WebSocket
const WebSocketMock = jest.fn().mockImplementation(() => ({
  readyState: 1, // OPEN
  send: jest.fn(),
  close: jest.fn(),
  onopen: null,
  onmessage: null,
  onclose: null,
  onerror: null,
})) as any;

WebSocketMock.CONNECTING = 0;
WebSocketMock.OPEN = 1;
WebSocketMock.CLOSING = 2;
WebSocketMock.CLOSED = 3;

global.WebSocket = WebSocketMock;

// Мок для EventSource
const EventSourceMock = jest.fn().mockImplementation(() => ({
  readyState: 1, // OPEN
  close: jest.fn(),
  onopen: null,
  onmessage: null,
  onerror: null,
})) as any;

EventSourceMock.CONNECTING = 0;
EventSourceMock.OPEN = 1;
EventSourceMock.CLOSED = 2;

global.EventSource = EventSourceMock; 