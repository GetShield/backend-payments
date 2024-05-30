import { Request, Response } from "express";
import { BigNumber, utils } from 'ethers';
import { tnxModel, TnxStatus } from "../tnx/tnx.model";
import axios from "axios";
import { RECEIVER_WALLET_ADDRESS, WEBHOOK_SECRET, WEBHOOK_URL } from "../const";
import { Logger } from "../utils/Logger";

const logger = Logger.getInstance('check-tnx-status')

// const WALLET_ADDRESS = 'TPR1bjDXdAbUgYj3WanuG5KuVdYhSyrQBd'
// https://api.trongrid.io/v1/accounts/TNSvYZn3fV7bcJHaPwdBGCk6yT5DffmK4h/transactions/trc20?&contract_address=TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t

export const checkTnxStatusController = async (req: Request, res: Response) => {
    const body = req.body;
    try {
        logger.info({ message: `checking tnx status for`, data: body });
        if (!body.value || !body.orderId) {
            throw new Error('missing fields');
        }
        console.log('orderId', body.orderId);
        const foundTx = await tnxModel.findOne({
            orderId: body.orderId,
        });
        console.log('foundTx', foundTx);
        if (!foundTx) {
            logger.error({ message: `No tnx found in DB for orderId: ${body.orderId}` });

            // throw new Error('tnx not found')
            return res.json({
                found: false,
            });
        }

        logger.info({ message: `Tnx found in DB for orderId: ${body.orderId}`, data: { _id: foundTx._id, value: foundTx.value, valueInNumber: Number(foundTx.value) } })
        // const list = await axios.get(`https://api.trongrid.io/v1/accounts/${WALLET_ADDRESS}/transactions`)
        const list = await axios.get(
            `https://api.trongrid.io/v1/accounts/${RECEIVER_WALLET_ADDRESS}/transactions/trc20?&contract_address=TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t`,
        );
        logger.info({ message: `Found ${list.data?.data?.length || 0} tnxs for in receiver wallet ${RECEIVER_WALLET_ADDRESS}`, data: { orderId: body.orderId } })
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
                // console.log('value -> ', value);
                const smallUnits = BigNumber.from(value);
                // console.log('smallUnits -> ', smallUnits);
                const baseUnits = utils.formatUnits(smallUnits, 6);
                // console.log('smallUnits', baseUnits, typeof baseUnits);

                // const foundValue = foundTx.value.split('.')[0]
                // console.log('foundValue', foundValue);
                // const formattedVal = baseUnits.split('.')[0]
                // console.log('formattedVal', formattedVal);

                if (Number(foundTx.value) == Number(baseUnits)) {
                    logger.info({ message: `Matching tnx found on chain for orderId: ${body.orderId}, updating status to complete in DB`, data: { onchainTnx: d } })
                    tnxComplete = true;
                    foundTx.status = TnxStatus.complete;
                    foundTx.tnxData = d;
                    await foundTx.save();
                    break;
                }
            } catch (error: any) {
                console.log('Error ==>', error.message);
                logger.error({ message: `Error while comparing foundTx with onchain Tnx orderId: ${body.orderId}`, error, index, d })
            }
        }

        if (tnxComplete && WEBHOOK_URL) {
            logger.info({ message: `Matching Tnx found online - webhook call initiated ` })
            try {
                const resWebhook = await axios.post(WEBHOOK_URL as string, {
                    "orderId": foundTx.orderId,
                    "orderStatus": 'completed'
                }, {
                    headers: {
                        Authorization: WEBHOOK_SECRET
                    }
                })
                logger.info({ message: `Webhook responded with Status: ${resWebhook.status} - for orderId ${foundTx.orderId}` })
            } catch (error: any) {
                logger.error({ message: `Webhook responded with Error code: ${error?.response?.status} for orderId: ${body.orderId}`, error })
                console.log('Error while calling webhook url', error)
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
        logger.error({ message: `Error while Checking tnx status for orderId: ${body.orderId}`, error })

        res.status(500).json({
            error: error.message,
            message: 'Could not create tnx',
        });
    }
}