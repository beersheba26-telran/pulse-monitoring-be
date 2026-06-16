import { RequestHandler, Request, Response, NextFunction } from "express";
import logger from "../../logger";
import { jwtDecode }  from "jwt-decode";
import HttpError from "../errors/HttpError";
const BEARER = "Bearer "
export const user_context: RequestHandler = (req, res, next) => {
    const authHeader = req.header("Authorization")
    req.user_id = null; req.role = null;
    if (authHeader && authHeader.startsWith(BEARER)) {
        const token = authHeader.slice(BEARER.length)
        logger.debug(`user_context: url is ${req.url}; method is ${req.method}; received token ${token.slice(0, 5)}`)
        const {username, role} = parseToken(token)
        req.user_id = username; req.role = role; 
        logger.debug(`added to request ${JSON.stringify({user_id: username, role: role})}`)
    } else {
        logger.debug(`user_context: url is ${req.url}; method is ${req.method}; no token received`)
    }
    next()
   
}
function parseToken(token: string): {username: string|null, role: string|null} {
    try {
        const payload = jwtDecode(token) as any
        const username = payload.username
        const groups = payload["cognito:groups"] as string[] | undefined 
        const role = groups && groups.includes("DOCTOR") ? "DOCTOR" : "PATIENT"
        return {username, role}
    } catch (err) {
        logger.error(`Failed to decode token ${token.slice(0, 5)}: ${(err as Error).message}`)
        return {username: null, role: null}
    }
   
}
export function auth(role:string): RequestHandler {
    return (req: Request, res: Response, next: NextFunction) => {
        
        if (!req.user_id) {
            throw new HttpError(401, "Unauthorized: missing username in request")
        }
        if (role && req.role !== role) {
            throw new HttpError(403, "Forbidden: insufficient permissions")
        }
        next()
    }
}