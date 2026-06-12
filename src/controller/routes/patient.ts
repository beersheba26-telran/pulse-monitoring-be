import { Router } from 'express';
import apiService from '../../service/ApiServiceImpl';

const patientRouter = Router();

patientRouter.get('/notifications/:notificationId', async (req, res) => {
    try {
        const data = await apiService.getPatientByNotificationId(req.params.notificationId);
        if (!data) {
            res.status(404).json({ error: 'Patient not found' });
            return;
        }
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: (error as Error).message });
    }
});

patientRouter.get('/:patientId', async (req, res) => {
    try {
        const data = await apiService.getPatientByPatientId(req.params.patientId);
        if (!data) {
            res.status(404).json({ error: 'Patient not found' });
            return;
        }
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: (error as Error).message });
    }
});

export default patientRouter;
