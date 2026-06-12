import express from 'express';
import morgan from 'morgan';
import cors from 'cors';
import notificationsRouter from './routes/notifications';
import patientRouter from './routes/patient';

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));
app.use('/notifications', notificationsRouter);
app.use('/patient', patientRouter);

export default app;