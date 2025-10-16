import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
import helmet from 'helmet';
import http from 'http';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5002;

// Create HTTP server for Socket.IO
const server = http.createServer(app);

// Configure Socket.IO
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:5173', 'https://zapalert-ph.netlify.app'],
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Store in app context for access in routes
app.set("io", io);

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'https://zapalert-ph.netlify.app'],
  credentials: true,
}));

app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MongoDB Connection - REMOVED DEPRECATED OPTIONS
mongoose.connect(process.env.MONGO_URI)
.then(() => {
  console.log('Connected to MongoDB successfully');
})
.catch((error) => {
  console.error('❌ MongoDB connection error:', error);
  process.exit(1);
});

// Import routes using ES modules
import emergencyRoutes from './routes/emergencies.js';
import helperRoutes from './routes/helpers.js';
import helpOffersRouter from './routes/helpOffers.js';

app.use('/api/help-offers', helpOffersRouter);
app.use('/api/emergencies', emergencyRoutes);
app.use('/api/helpers', helperRoutes);

// Health Check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    serverTime: new Date().toISOString(),
    message: 'Emergency Response API is running!'
  });
});

// Root
app.get('/', (req, res) => {
  res.json({ 
    message: 'ZAPALERT PH Emergency Response API is running! 🚀',
    endpoints: {
      reportEmergency: 'POST /api/emergencies',
      getEmergencies: 'GET /api/emergencies',
      registerHelper: 'POST /api/helpers',
      getHelpers: 'GET /api/helpers',
      helpOffers: 'POST /api/help-offers'
    }
  });
});

// Socket.IO connection handling
io.on("connection", (socket) => {
  console.log("✅ New client connected:", socket.id);
  
  socket.on("disconnect", () => {
    console.log("🔌 Client disconnected:", socket.id);
  });
});

// Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    success: false, 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 Catch
app.use('*', (req, res) => {
  res.status(404).json({ 
    success: false, 
    message: 'API endpoint not found' 
  });
});

// Start Server
server.listen(PORT, () => {
  const serverUrl =
    process.env.NODE_ENV === "production"
      ? "https://zapalert-ph-backend.onrender.com"
      : `http://localhost:${PORT}`;

  console.log(`ZAPALERT PH Backend running on port ${PORT}`);
  console.log(`Server URL: ${serverUrl}`);
});