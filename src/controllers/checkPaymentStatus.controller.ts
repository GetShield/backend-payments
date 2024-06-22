import { Request, Response } from "express";
import { tnxModel, tnxProdModel, TnxStatus } from "../tnx/tnx.model";
import { Logger } from "../utils/Logger";

const logger = Logger.getInstance('check-payment-status-controller')


export const checkPaymentStatus = async (req: Request, res: Response) => {
    const query = req.query;
    try {
        logger.info({ message: `Checking payment status for orderId: ${query.orderId}` })
        if (!query.orderId) {
            throw new Error('missing orderId field');
        }
        const model: any = query.env === 'production' ? tnxProdModel : tnxModel;
        const order = await model.findOne({ orderId: query.orderId.toString() });
        logger.info({ message: `Result of payment status check for orderId: ${query.orderId}`, data: { _id: order?._id, status: order?.status } })
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }
        const isComplete = order.status === TnxStatus.complete;
        return res.json({ orderStatus: isComplete });
    } catch (error: any) {
        logger.error({ message: `Payment status check Failed orderId: ${query.orderId}`, error })
        return res.status(500).json({ error: error.message });
    }
}