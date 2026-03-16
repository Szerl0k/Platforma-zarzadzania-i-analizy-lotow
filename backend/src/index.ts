import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { AppDataSource } from './database/data-source';
import { authenticate, authorize } from './middleware/auth';
import { errorHandler } from './middleware/errorHandler';
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import preferencesRoutes from './routes/preferences';
import roleRoutes from './routes/roles';
import permissionRoutes from './routes/permissions';

dotenv.config();

const app = express();
const port = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

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
