import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import detectionRouter from './routes/detection';
import yolov8Service from './services/yolov8';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'], // Allow Vite dev server
  credentials: true,
}));
app.use(express.json());

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api', detectionRouter);

// Root endpoint
app.get('/', (req: Request, res: Response) => {
  res.json({
    name: 'SkyMate YOLOv8 Server',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/api/health',
      detect: '/api/detect (POST)',
    },
  });
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('❌ Server error:', err);
  res.status(500).json({
    success: false,
    error: err.message || 'Internal server error',
  });
});

// Initialize YOLOv8 model before starting server
async function startServer() {
  try {
    console.log('🚀 Starting SkyMate YOLOv8 Server...\n');

    // Initialize YOLOv8 model
    await yolov8Service.initialize();

    // Start Express server
    app.listen(PORT, () => {
      console.log('\n✅ Server is running!');
      console.log(`   URL: http://localhost:${PORT}`);
      console.log(`   Health check: http://localhost:${PORT}/api/health`);
      console.log(`   Detection endpoint: POST http://localhost:${PORT}/api/detect\n`);
    });
  } catch (error: any) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n⏹️  Shutting down server...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n⏹️  Shutting down server...');
  process.exit(0);
});

// Start the server
startServer();

