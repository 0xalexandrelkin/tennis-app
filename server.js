const express = require('express');
const path = require('path');
const http = require('http');
const WebSocket = require('ws');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Отдаём статику
app.use(express.static(path.join(__dirname, 'public')));

// Храним текущее состояние ячеек: ключ — `row-col`, значение — объект { userId: avatarUrl, ... }
const state = new Map();

wss.on('connection', ws => {
  // При подключении — отправляем всю текущую state
  for (const [key, users] of state.entries()) {
    const [row, col] = key.split('-').map(Number);
    ws.send(JSON.stringify({ row, col, users }));
  }

  ws.on('message', message => {
    try {
      const { row, col, users } = JSON.parse(message);
      state.set(`${row}-${col}`, users);

      // Рассылаем всем подключённым клиентам, включая инициатора
      wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(message);
        }
      });
    } catch (err) {
      console.error('Ошибка при обработке WS-сообщения:', err);
    }
  });
});

const PORT = parseInt(process.env.PORT, 10) || 3000;

// Слушаем на всех интерфейсах, чтобы было доступно по LANIP
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Сервер запущен на http://localhost:${PORT} и http://<ваш-IP>:${PORT}`);
});


