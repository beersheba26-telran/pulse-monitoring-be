import 'dotenv/config';
import app from './controller/app';
import logger from './logger';
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  logger.info({ port: PORT }, 'Server is running');
});
