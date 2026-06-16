import "express-serve-static-core";

interface SecurityContextFields {
    user_id?: string | null;
    username?: string | null;
    role?: string | null;
    auth_error?: string | null;
}

declare global {
    namespace Express {
        interface Request extends SecurityContextFields {}
    }
}

declare module "express-serve-static-core" {
    interface Request extends SecurityContextFields {}
}

export {};