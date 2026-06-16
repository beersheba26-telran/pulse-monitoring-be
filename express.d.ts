/**
 * introducing additional fields for Request defining a security_context
 */
declare global {
    namespace Express {
        interface Request {
            user_id?: string | null,
            role?: string | null,
        }
    }
}
export {}