import { Router } from 'express';
import apiService from '../../service/ApiServiceImpl';
import { ActionData } from '../../model/api_types';
import logger from '../../logger';
import { validateNotificationHistoryPost } from '../middleware/validateNotificationHistoryPost';
const notificationsRouter = Router();

notificationsRouter.get('/doctor/:doctor_id', async (req, res) => {
    try {
        const data = await apiService.getNotificationsDoctor(req.params.doctor_id);
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: (error as Error).message });
    }
});

notificationsRouter.get('/patient/:patient_id', async (req, res) => {
    try {
        const data = await apiService.getNotificationsPatient(req.params.patient_id);
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: (error as Error).message });
    }
});

notificationsRouter.get('/history/:notification_id', async (req, res) => {
    try {
        const data = await apiService.getNotificationHistoryByNotificationId(req.params.notification_id);
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: (error as Error).message });
    }
});

notificationsRouter.post('/history/:notificationid', validateNotificationHistoryPost, async (req, res) => {
    try {
        const notificationId = req.params.notificationid as string;
        const body = req.body as ActionData;
        logger.debug(`Adding action to notification ${notificationId}: ${JSON.stringify(body)}`);
        await apiService.addActionToNotification(notificationId, body);
        res.status(204).send();
    } catch (error) {
        logger.error({ error }, `Error adding action to notification ${req.params.notificationid as string}`);
        res.status(500).json({ error: (error as Error).message });
    }
});

export default notificationsRouter;
