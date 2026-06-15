import express from 'express';
import morgan from 'morgan';
import cors from 'cors';
import notificationsRouter from './routes/notifications';
import patientRouter from './routes/patient';
import HttpError from './errors/HttpError';
import { errorHandler } from './middleware/errorHandler';

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));
app.use('/notifications', notificationsRouter);
app.use('/patient', patientRouter);

app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});
app.use((_req, _res, next) => {
	next(new HttpError(404, 'Route not found'));
});
app.use(errorHandler);

export default app;