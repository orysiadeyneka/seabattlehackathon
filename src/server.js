require('dotenv').config();
const path = require('path');
const http = require('http');
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { WebSocketServer } = require('ws');

const botsRouter = require('./routes/bots');
const adminRouter = require('./routes/admin');
const visualizationController = require('./services/visualizationController');
const tournamentEngine = require('./services/tournamentEngine');
const storage = require('./services/storage');

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Static frontend
app.use(express.static(path.join(__dirname, '..', 'public')));

// API routes
app.use('/api/bots', botsRouter);
app.use('/api/admin', adminRouter);

// Fallback routes for pages
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});
app.get('/view', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'view.html'));
});
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'admin.html'));
});

// WebSocket for visualization
const wss = new WebSocketServer({ server, path: '/ws/visualization' });
visualizationController.init(wss);

// Initialize storage & tournament engine
storage.init().then(() => {
  tournamentEngine.init({
    storage,
    visualization: visualizationController,
  });

  server.listen(PORT, () => {
    console.log(`Sea Battle Hackathon server running at http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('Failed to initialize storage:', err);
  process.exit(1);
});
