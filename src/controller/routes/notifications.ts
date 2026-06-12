import { Router } from 'express';
import apiService from '../../service/ApiServiceImpl';
import { ActionData } from '../../model/api_types';

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

notificationsRouter.post('/history/:notification_id', async (req, res) => {
    try {
        const body = req.body as ActionData;
        await apiService.addActionToNotification(req.params.notification_id, body);
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: (error as Error).message });
    }
});

export default notificationsRouter;
