const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

const PORT = 3123;

// Keep track of connected POS clients
let clients = [];

io.on('connection', (socket) => {
  console.log('🔗 POS Client connected:', socket.id);
  clients.push(socket);

  socket.on('disconnect', () => {
    console.log('❌ POS Client disconnected:', socket.id);
    clients = clients.filter(c => c.id !== socket.id);
  });
});

// Endpoint for iOS Shortcuts or other APIs to send voice text
app.post('/api/voice', (req, res) => {
  const { text } = req.body;
  
  if (!text) {
    return res.status(400).json({ error: 'No text provided' });
  }

  console.log(`🎙️ Voice command received: "${text}"`);

  if (clients.length === 0) {
    console.log('⚠️ No POS clients connected.');
    return res.json({ reply: "POS chưa được mở trên máy tính hoặc mất kết nối." });
  }

  // We forward the text to the POS web app
  const posSocket = clients[0];
  
  // Timeout in case POS is frozen or takes too long
  let replied = false;
  const timeout = setTimeout(() => {
    if (!replied) {
      replied = true;
      res.json({ reply: "Giao dịch đang được xử lý hoặc POS phản hồi chậm." });
    }
  }, 10000); // 10s wait maximum

  posSocket.emit('voice_command', text, (replyText) => {
    if (!replied) {
      replied = true;
      clearTimeout(timeout);
      console.log(`🤖 POS replied: "${replyText}"`);
      res.json({ reply: replyText });
    }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`=============================================`);
  console.log(`🚀 POS Bridge Server IS RUNNING!`);
  console.log(`🔗 Cổng kết nối (Port): ${PORT}`);
  console.log(`📱 Cấu hình iOS Shortcut POST tới: http://<ĐỊA_CHỈ_IP_CỦA_MÁY>:${PORT}/api/voice`);
  console.log(`=============================================`);
});
