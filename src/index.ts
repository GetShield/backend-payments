import * as dotenv from 'dotenv';

dotenv.config();

import express = require('express');
import { Application, Request, Response } from 'express';
import * as bodyParser from 'body-parser';

import cors from 'cors';

import rateLimit from 'express-rate-limit';
import axios from 'axios';
import { BigNumber, utils } from 'ethers';
import { Schema, model, connect } from 'mongoose';
import { TnxStatus, tnxModel } from './tnx/tnx.model';
//@ts-ignore
import TronTxDecoder from 'tron-tx-decoder';

const decoder = new TronTxDecoder({ mainnet: true });

if (!process.env['MONGO_URL']) {
  throw new Error('DB url missing');
}
connect(process.env['MONGO_URL']).then((res) => {
  console.log('DB CONNECTED---> : ');
});

const app: Application = express();
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

const PORT = process.env['PORT'] || 4000;

app.get('/checkPaymentStatus', async (req, res) => {
  try {
    const query = req.query;
    if (!query.orderId) {
      throw new Error('missing orderId field');
    }

    const order = await tnxModel.findOne({ orderId: query.orderId.toString() });
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    const isComplete = order.status === TnxStatus.complete;
    return res.json({ orderStatus: isComplete });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

app.post('/add-tnx', async (req, res) => {
  try {
    const body = req.body;
    // Math.floor((new Date()).getTime() / 1000)

    if (!body.timestamp || !body.value || !body.orderId) {
      throw new Error('missing fields');
    }
    const tnx = await tnxModel.create(body);
    console.log('tnx', tnx);
    return res.json({
      tnx,
    });
  } catch (error: any) {
    res.status(500).json({
      error: error.message,
      message: 'Could not create tnx',
    });
  }
});

async function decodeTxInput(txId: string) {
  const decodedInput = await decoder.decodeInputById(txId);
  return decodedInput;
}
// const WALLET_ADDRESS = 'TPR1bjDXdAbUgYj3WanuG5KuVdYhSyrQBd'
// https://api.trongrid.io/v1/accounts/TNSvYZn3fV7bcJHaPwdBGCk6yT5DffmK4h/transactions/trc20?&contract_address=TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t
const WALLET_ADDRESS = 'TWNxsGw1o4rnP4FExQSEXuYzLtXm3dMkRd';
app.post('/check-tnx', async (req, res) => {
  try {
    const body = req.body;
    console.log('body', body);
    if (!body.timestamp || !body.value || !body.orderId) {
      throw new Error('missing fields');
    }
    console.log('orderId', body.orderId);
    const foundTx = await tnxModel.findOne({
      orderId: body.orderId,
    });
    console.log('foundTx', foundTx);
    if (!foundTx) {
      // throw new Error('tnx not found')
      return res.json({
        found: false,
      });
    }
    // const list = await axios.get(`https://api.trongrid.io/v1/accounts/${WALLET_ADDRESS}/transactions`)
    const list = await axios.get(
      `https://api.trongrid.io/v1/accounts/${WALLET_ADDRESS}/transactions/trc20?&contract_address=TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t`,
    );
    console.log('list length', list.data?.data?.length);
    if (!list.data || !list.data?.data?.length) {
      return res.json({
        found: false,
      });
    }

    const listTx = list.data.data;

    let tnxComplete = false;
    for (let index = 0; index < listTx.length; index++) {
      const d = listTx[index];
      try {
        // const txData = await decodeTxInput(d.txID);
        // console.log('txData: ', txData);
        // console.log('txData', txData);
        const value = d.value.toString();
        console.log('value -> ', value);
        const smallUnits = BigNumber.from(value);
        console.log('smallUnits -> ', smallUnits);
        const baseUnits = utils.formatUnits(smallUnits, 6);
        console.log('smallUnits', baseUnits, typeof baseUnits);

        // const foundValue = foundTx.value.split('.')[0]
        // console.log('foundValue', foundValue);
        // const formattedVal = baseUnits.split('.')[0]
        // console.log('formattedVal', formattedVal);
        if (foundTx.value == baseUnits) {
          tnxComplete = true;
          foundTx.status = TnxStatus.complete;
          foundTx.tnxData = d;
          await foundTx.save();
          break;
        }
      } catch (error: any) {
        console.log('Error ==>', error.message);
      }
    }

    return res.json({
      found: tnxComplete,
    });
    // list.data.data.filter(async (d: any) => {
    //   try {
    // const txData = await decodeTxInput(d.txID);
    // console.log('txData', txData);
    //   } catch (error) {

    //   }
    //   // const rawTxData = d.raw_data.contract?.[0]?.parameter?.value?.data
    //   // if (rawTxData) {
    //   //   const abi = ['function transfer(address to, uint256 value)'];
    //   //   const iface = new utils.Interface(abi);
    //   //   const decoded = iface.parseTransaction({ data: 'a9059cbb000000000000000000000000b58829bf8fa1bf33736feb36e43fbb412215ed06000000000000000000000000000000000000000000000000000000000000bebc200' });
    //   //   console.log(decoded);
    //   // }
    // })
    // list.
    // console.log('list -- ', list.data.data);
    return res.status(200).send('webhoook');
  } catch (error: any) {
    res.status(500).json({
      error: error.message,
      message: 'Could not create tnx',
    });
  }
});

try {
  app.listen(PORT, (): void => {
    console.log(`Connected successfully on port ${PORT}`);
  });
} catch (error: any) {
  console.error(`Error occured while trying to start server: ${error.message}`);
}

//Catch uncaught exceptions
process.on('uncaughtException', function (err) {
  // handle the error safely
  console.error('Error: Uncaught Exception :: ', err);
});
