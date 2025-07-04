# Отказоустойчивый сервис канала связи

Надежный TypeScript/JavaScript сервис для обеспечения непрерывной связи с автоматическим переключением между каналами при сбоях.

## 🚀 Возможности

- ✅ **Автоматическое переключение** между каналами при сбоях
- ✅ **Поддержка множественных протоколов**: HTTP, WebSocket и SSE соединения
- ✅ **Буферизация данных** при переключении каналов
- ✅ **Система приоритетов** для выбора каналов
- ✅ **Мониторинг состояния** каналов в реальном времени
- ✅ **Типобезопасная система событий** с полной типизацией TypeScript
- ✅ **Обработка race conditions** и конкурентных операций
- ✅ **Восстановление каналов** после сбоев
- ✅ **Расширяемая архитектура** для добавления новых типов соединений

## 📦 Установка

```bash
npm install
```

## 🏗️ Сборка

```bash
npm run build
```

## 🧪 Тестирование

```bash
# Запуск всех тестов
npm test

# Запуск тестов в режиме наблюдения
npm run test:watch

# Запуск с покрытием кода
npm test -- --coverage
```

## 🚀 Быстрый старт

```typescript
import { ChannelManager, ServiceConfig, ChannelState } from "./src";

const config: ServiceConfig = {
  channels: [
    {
      id: "primary",
      url: "https://api.primary.com",
      priority: 10,
      state: ChannelState.IDLE,
      type: "http",
      lastCheck: 0,
      failureCount: 0,
      timeout: 5000,
    },
    {
      id: "backup",
      url: "https://api.backup.com",
      priority: 5,
      state: ChannelState.IDLE,
      type: "http",
      lastCheck: 0,
      failureCount: 0,
      timeout: 5000,
    },
  ],
  healthCheckInterval: 30000,
  maxRetries: 3,
  bufferSize: 1000,
  failoverTimeout: 5000,
};

const manager = new ChannelManager(config);

// Отправка данных
await manager.sendData({ message: "Hello World" });

// Подписка на события
manager.on("channelSwitch", (data) => {
  console.log(`Switched to channel: ${data.toChannelId}`);
});

manager.on("connectionLost", (data) => {
  console.error(`Connection lost: ${data.error.message}`);
});
```

## 🏗️ Архитектура

Сервис состоит из следующих основных компонентов:

### Core Components

- **`ChannelManager`** - Основной менеджер каналов, координирующий все операции
- **`ChannelHealthChecker`** - Мониторинг состояния каналов и проверка доступности
- **`ChannelPriorityQueue`** - Управление очередью приоритетов каналов
- **`DataBuffer`** - Буферизация данных при переключении каналов
- **`TypedEventEmitter`** - Типобезопасная система событий

### Connectors

- **`WebSocketConnector`** - Адаптер для WebSocket соединений
- **`HttpConnector`** - Адаптер для HTTP REST API
- **`SSEConnector`** - Адаптер для Server-Sent Events

### Utils

- **`Logger`** - Система логирования с уровнями
- **`RetryUtil`** - Утилиты для повторных попыток с экспоненциальной задержкой

## 📋 API Reference

### ChannelManager

Основной класс для управления каналами связи.

#### Конструктор

```typescript
new ChannelManager(config: ServiceConfig)
```

#### Методы

```typescript
// Отправка данных
async sendData(data: any, priority?: number): Promise<void>

// Добавление нового канала
addChannel(channel: Channel): void

// Удаление канала
removeChannel(channelId: string): void

// Получение текущего канала
getCurrentChannel(): Channel | null

// Получение статистики каналов
getChannelStats(): ChannelStats[]

// Получение размера буфера
getBufferSize(): number

// Подписка на события
on<K extends keyof EventTypes>(event: K, listener: (data: EventTypes[K]) => void): void

// Отписка от событий
off<K extends keyof EventTypes>(event: K, listener: (data: EventTypes[K]) => void): void

// Отключение от всех каналов
async disconnect(): Promise<void>
```

### События

```typescript
// Изменение состояния канала
'channelStateChange': {
  channelId: string;
  oldState: ChannelState;
  newState: ChannelState;
  timestamp: number;
}

// Переключение между каналами
'channelSwitch': {
  fromChannelId: string;
  toChannelId: string;
  timestamp: number;
}

// Потеря соединения
'connectionLost': {
  channelId: string;
  error: Error;
  timestamp: number;
}

// Данные помещены в буфер
'dataBuffered': {
  data: any;
  timestamp: number;
  bufferSize: number;
}

// Ошибка проверки состояния
'healthCheckFailed': {
  channelId: string;
  error: Error;
  timestamp: number;
}

// Получение данных
'dataReceived': {
  channelId: string;
  data: any;
  timestamp: number;
}
```

## ⚙️ Конфигурация

### ServiceConfig

```typescript
interface ServiceConfig {
  channels: Channel[]; // Массив каналов
  healthCheckInterval: number; // Интервал проверки состояния (мс)
  maxRetries: number; // Максимальное количество повторов
  bufferSize: number; // Размер буфера данных
  failoverTimeout: number; // Таймаут переключения (мс)
  enableLogging?: boolean; // Включить логирование
  logLevel?: "debug" | "info" | "warn" | "error"; // Уровень логирования
}
```

### Channel

```typescript
interface Channel {
  id: string; // Уникальный идентификатор
  url: string; // URL канала
  priority: number; // Приоритет (больше = выше)
  state: ChannelState; // Текущее состояние
  type: "websocket" | "http" | "sse"; // Тип соединения
  lastCheck: number; // Время последней проверки
  failureCount: number; // Количество ошибок
  timeout: number; // Таймаут соединения (мс)
  headers?: Record<string, string>; // HTTP заголовки
  retryInterval?: number; // Интервал повтора (мс)
}
```

## 🔧 Примеры использования

### Базовое использование

См. файл `src/examples/basic-usage.ts` для полного примера.

### Добавление пользовательского коннектора

```typescript
import { Channel } from "./types/channel";
import { TypedEventEmitter } from "./core/TypedEventEmitter";
import { EventTypes } from "./types/events";

export class CustomConnector {
  constructor(
    private channel: Channel,
    private eventEmitter: TypedEventEmitter<EventTypes>
  ) {}

  async connect(): Promise<void> {
    // Реализация подключения
  }

  async send(data: any): Promise<void> {
    // Реализация отправки данных
  }

  disconnect(): void {
    // Реализация отключения
  }

  isConnected(): boolean {
    // Проверка состояния соединения
  }
}
```

### Использование с логированием

```typescript
import { logger, LogLevel } from "./utils/logger";

logger.setLevel(LogLevel.DEBUG);
logger.info("Starting channel manager...");
logger.debug("Channel configuration:", config);
```

### Использование с повторными попытками

```typescript
import { RetryUtil } from "./utils/retry";

const result = await RetryUtil.withRetry(
  async () => {
    return await someAsyncOperation();
  },
  {
    maxAttempts: 5,
    delay: 1000,
    backoffMultiplier: 2,
    maxDelay: 10000,
  }
);
```

## 🧪 Тестирование

Проект включает полный набор тестов:

- **Unit тесты** для каждого компонента
- **Integration тесты** для проверки взаимодействия компонентов
- **Mock объекты** для WebSocket, EventSource и fetch API

### Запуск тестов

```bash
# Все тесты
npm test

# Тесты с покрытием
npm test -- --coverage

# Конкретный тест
npm test -- ChannelManager.test.ts
```

## 📁 Структура проекта

```
resilient-channel-service/
├── src/
│   ├── types/           # TypeScript типы и интерфейсы
│   ├── core/            # Основные компоненты
│   ├── connectors/      # Адаптеры для различных протоколов
│   ├── utils/           # Утилиты и вспомогательные функции
│   ├── examples/        # Примеры использования
│   └── index.ts         # Основной экспорт
├── tests/
│   ├── unit/            # Unit тесты
│   ├── integration/     # Integration тесты
│   └── setup.ts         # Настройка тестов
├── package.json
├── tsconfig.json
├── jest.config.js
└── README.md
```

## 🤝 Вклад в проект

1. Форкните репозиторий
2. Создайте ветку для новой функции (`git checkout -b feature/amazing-feature`)
3. Зафиксируйте изменения (`git commit -m 'Add amazing feature'`)
4. Отправьте в ветку (`git push origin feature/amazing-feature`)
5. Откройте Pull Request

## 📄 Лицензия

Этот проект лицензирован под MIT License - см. файл [LICENSE](LICENSE) для деталей.

## 🐛 Отчеты об ошибках

Если вы нашли ошибку, пожалуйста, создайте issue в GitHub с подробным описанием проблемы.

## 📞 Поддержка

Для вопросов и поддержки:

- Создайте issue в GitHub
- Обратитесь к документации в папке `docs/`
- Проверьте примеры в папке `src/examples/`
