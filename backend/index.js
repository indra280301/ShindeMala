import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import db from './db.js';
import authRoutes from './routes/auth.js';
import menuRoutes from './routes/menu.js';
import tablesRoutes from './routes/tables.js';
import ordersRoutes from './routes/orders.js';
import dashboardRoutes from './routes/dashboard.js';
import staffRoutes from './routes/staff.js';
import reportsRoutes from './routes/reports.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);
export const io = new Server(httpServer, {
    cors: {
        origin: '*', // For development
        methods: ['GET', 'POST', 'PUT', 'DELETE']
    }
});

const PORT = process.env.PORT || 5000;

io.on('connection', (socket) => {
    console.log('A client connected to Shinde Mala WebSocket:', socket.id);
    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/tables', tablesRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/reports', reportsRoutes);

// Basic health check route
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Shinde Mala ERP Backend Running' });
});

httpServer.listen(PORT, () => {
    console.log(`Server & WebSockets running on port ${PORT}`);
});
