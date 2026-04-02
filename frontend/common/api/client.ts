import axios from 'axios';

const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api';

export const apiClient = axios.create({
    baseURL: apiUrl,
    withCredentials: true,
});

let isRefreshing = false;
let failedQueue: Array<{ resolve: (value?: unknown) => void; reject: (reason?: unknown) => void }> = [];

function processQueue(error: unknown) {
    failedQueue.forEach(({ resolve, reject }) => {
        if (error) reject(error);
        else resolve();
    });
    failedQueue = [];
}

apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        if (
            error.response?.status === 401 &&
            !originalRequest._retry &&
            !originalRequest.url?.includes('/auth/refresh') &&
            !originalRequest.url?.includes('/auth/login') &&
            !originalRequest.url?.includes('/auth/register')
        ) {
            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    failedQueue.push({
                        resolve: () => resolve(apiClient(originalRequest)),
                        reject,
                    });
                });
            }

            originalRequest._retry = true;
            isRefreshing = true;

            try {
                await apiClient.post('/auth/refresh');
                processQueue(null);
                return apiClient(originalRequest);
            } catch (refreshError) {
                processQueue(refreshError);
                if (typeof window !== 'undefined' && !['/login', '/register'].includes(window.location.pathname)) {
                    window.location.href = '/login';
                }
                return Promise.reject(refreshError);
            } finally {
                isRefreshing = false;
            }
        }

        return Promise.reject(error);
    }
);
