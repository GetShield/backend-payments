import * as dotenv from 'dotenv';

dotenv.config();

import express = require('express');
import { Application, Request, Response } from 'express';
import * as bodyParser from 'body-parser';

import cors from 'cors';

import rateLimit from 'express-rate-limit';
import { connect } from 'mongoose';
import { PORT, RECEIVER_WALLET_ADDRESS } from './const';
import { checkPaymentStatus } from './controllers/checkPaymentStatus.controller';
import { initTnxController } from './controllers/initTnx.controller';
import { checkTnxStatusController } from './controllers/checkTnxStatus.controller';
import { Logger } from './utils/Logger';

const logger = Logger.getInstance('index-server')

if (!process.env['MONGO_URL']) {
  throw new Error('DB url missing in env');
}
if (!RECEIVER_WALLET_ADDRESS) {
  throw new Error('wallet address missing in env');
}

connect(process.env['MONGO_URL']).then((res) => {
  console.log('DB CONNECTED---> : ');
  logger.info({ message: 'DB CONNECTED---> :' })
}).catch((e) => {
  console.log('Database not connected: ', e)
  logger.error({ message: 'DB NOT CONNECTED---> :', error: e })
  process.exit(0)
});

const app: Application = express();
app.use(Logger.getHttpLoggerInstance());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors());

// Rate limiter to protech from bruteforce attacks
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 80, // Limit each IP to 8 requests per `window` (here, per minute)
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Apply the rate limiting middleware to all requests
app.use(limiter);

app.get('/ping', (req: Request, res: Response): Response => {
  return res.status(200).send('pong');
});

app.get('/checkPaymentStatus', checkPaymentStatus);

app.post('/add-tnx', initTnxController);

app.post('/check-tnx', checkTnxStatusController);

try {
  app.listen(PORT, (): void => {
    console.log(`Connected successfully on port ${PORT}`);
  });
} catch (error: any) {
  console.error(`Error occured while trying to start server: ${error.message}`);
  logger.error({ message: `Error occured while trying to start server: ${error.message}` });
}

//Catch uncaught exceptions
process.on('uncaughtException', function (err) {
  // handle the error safely
  console.error('Error: Uncaught Exception :: ', err);
  logger.error({ message: `Error Uncaught Exception`, error: err });
});
