import express from 'express';
import { APP_PORT } from './utils/constants';
import app from './app';

const server = express();

server.use(app);

server.listen(APP_PORT, () => {
  console.log(`Server is running on http://localhost:${APP_PORT}`);
});