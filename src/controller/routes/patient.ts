import { Router } from 'express';
import apiService from '../../service/ApiServiceImpl';
import HttpError from '../errors/HttpError';
import { auth } from '../middleware/auth';

const patientRouter = Router();

patientRouter.get<{ notificationId: string }>('/notifications/:notificationId',auth(""), async (req, res) => {
    const data = await apiService.getPatientByNotificationId(req.params.notificationId);
    if (!data) {
        throw new HttpError(404, 'Patient not found');
    }
    res.json(data);
});

patientRouter.get<{ patientId: string }>('/:patientId',auth(""), async (req, res) => {
    const data = await apiService.getPatientByPatientId(req.params.patientId);
    if (!data) {
        throw new HttpError(404, 'Patient not found');
    }
    res.json(data);
});

export default patientRouter;
