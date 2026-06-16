import { Router } from 'express';
import apiService from '../../service/ApiServiceImpl';
import { ActionData } from '../../model/api_types';
import logger from '../../logger';
import { validateNotificationHistoryPost } from '../middleware/validateNotificationHistoryPost';
import { auth } from '../middleware/auth';
import HttpError from '../errors/HttpError';
const notificationsRouter = Router();

notificationsRouter.get<{ doctor_id: string }>('/doctor/:doctor_id', auth("DOCTOR"), async (req, res) => {
    if (req.params.doctor_id !== req.user_id) {
        throw new HttpError(403, "Forbidden: cannot access notifications for other doctors")
    }
    const data = await apiService.getNotificationsDoctor(req.params.doctor_id);
    res.json(data);
});

notificationsRouter.get<{ patient_id: string }>('/patient/:patient_id', auth("PATIENT"), async (req, res) => {
    if (req.params.patient_id !== req.user_id) {
        throw new HttpError(403, "Forbidden: cannot access notifications for other patients")
    }
    const data = await apiService.getNotificationsPatient(req.params.patient_id);
    res.json(data);
});

notificationsRouter.get<{ notification_id: string }>('/history/:notification_id', auth(""), async (req, res) => {
    const data = await apiService.getNotificationHistoryByNotificationId(req.params.notification_id,req.user_id!, req.role!);
    res.json(data);
});

notificationsRouter.post('/history/:notificationid',auth("DOCTOR"), validateNotificationHistoryPost, async (req, res) => {
    const notificationId = req.params.notificationid as string;
    const body = req.body as ActionData;
    if (body.doctor_id !== req.user_id) {
        throw new HttpError(403, "Forbidden: cannot add action for other doctors");
    }
    logger.debug(`Adding action to notification ${notificationId}: ${JSON.stringify(body)}`);
    await apiService.addActionToNotification(notificationId, body);
    res.status(204).send();
});

export default notificationsRouter;
