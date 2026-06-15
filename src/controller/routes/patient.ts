import { Router } from 'express';
import apiService from '../../service/ApiServiceImpl';
import HttpError from '../errors/HttpError';

const patientRouter = Router();

patientRouter.get('/notifications/:notificationId', async (req, res) => {
    const data = await apiService.getPatientByNotificationId(req.params.notificationId);
    if (!data) {
        throw new HttpError(404, 'Patient not found');
    }
    res.json(data);
});

patientRouter.get('/:patientId', async (req, res) => {
    const data = await apiService.getPatientByPatientId(req.params.patientId);
    if (!data) {
        throw new HttpError(404, 'Patient not found');
    }
    res.json(data);
});

export default patientRouter;
