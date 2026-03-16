declare global {
    namespace Express {
        interface Request {
            userId?: string;
            roleId?: number;
        }
    }
}

export {};
