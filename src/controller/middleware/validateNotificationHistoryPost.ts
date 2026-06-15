import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';

const notificationHistoryParamsSchema = z.object({
    notificationid: z.string().min(1, 'notificationid is required')
});

const notificationHistoryBodySchema = z.object({
    action: z.string().min(1, 'action is required'),
    timestamp: z.iso.datetime(),
    report: z.string().min(1, 'report is required'),
    doctor_name: z.string().optional(),
    doctor_id: z.string().min(1, 'doctor_id is required')
});

export function validateNotificationHistoryPost(req: Request, res: Response, next: NextFunction) {
    const paramsResult = notificationHistoryParamsSchema.safeParse(req.params);
    if (!paramsResult.success) {
        return res.status(400).json({
            error: 'Invalid route params',
            details: paramsResult.error.flatten()
        });
    }

    const bodyResult = notificationHistoryBodySchema.safeParse(req.body);
    if (!bodyResult.success) {
        return res.status(400).json({
            error: 'Invalid request body',
            details: bodyResult.error.flatten()
        });
    }

    req.params = paramsResult.data;
    req.body = bodyResult.data;
    next();
}
