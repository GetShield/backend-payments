import { Request, Response } from "express";
import { tnxModel } from "../tnx/tnx.model";
import { Logger } from "../utils/Logger";

const logger = Logger.getInstance('init-tnx-controller')

export const initTnxController = async (req: Request, res: Response) => {
    try {
        const body = req.body;
        // Math.floor((new Date()).getTime() / 1000)
        logger.info({ message: 'Tnx Init Called', data: body })
        if (!body.value || !body.orderId) {
            throw new Error('missing fields');
        }
        const tnx = await tnxModel.create(body);
        logger.info({ message: 'Tnx Init Db entry Created', data: { tnx_id: tnx._id } })

        console.log('tnx', tnx);
        return res.json({
            tnx,
        });
    } catch (error: any) {
        logger.error({ message: 'Tnx Init Failed', error })
        res.status(500).json({
            error: error.message,
            message: 'Could not create tnx',
        });
    }
}