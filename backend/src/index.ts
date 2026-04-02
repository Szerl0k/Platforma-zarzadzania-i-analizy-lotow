import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { AppDataSource } from './common/database/data-source';
import { authenticate, authorize } from './common/middleware/auth';
import { errorHandler } from './common/middleware/errorHandler';
import authRoutes from './users/routes/auth.routes';
import userRoutes from './users/routes/users.routes';
import preferencesRoutes from './users/routes/preferences.routes';
import roleRoutes from './users/routes/roles.routes';
import permissionRoutes from './users/routes/permissions.routes';

dotenv.config();

const app = express();
const port = process.env.PORT || 5001;

app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

app.get('/api/health', (_req, res) => {
    res.json({ status: 'OK', message: 'Backend is running' });
});

// Public routes
app.use('/api/auth', authRoutes);

// Protected routes
app.use('/api/users/me/preferences', authenticate, preferencesRoutes);
app.use('/api/users', authenticate, userRoutes);

// Admin routes
app.use('/api/roles', authenticate, authorize('users:write'), roleRoutes);
app.use('/api/permissions', authenticate, authorize('users:write'), permissionRoutes);

app.use(errorHandler);

AppDataSource.initialize()
    .then(() => {
        console.log('Database connected successfully via TypeORM');
        app.listen(port, () => {
            console.log(`Backend server running on port ${port}`);
        });
    })
    .catch((err) => {
        console.error('Database connection error:', err);
        process.exit(1);
    });
