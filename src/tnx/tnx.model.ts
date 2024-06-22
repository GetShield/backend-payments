import { Schema, model } from 'mongoose';

export enum TnxStatus {
    pending = 'pending',
    complete = 'complete'
}

interface ITnx {
    value: string;
    orderId?: string;
    status?: TnxStatus;
    tnxData?: any;
}

const tnxSchema = new Schema<ITnx>({
    value: { type: String, required: true },
    orderId: { type: String, unique: true },
    status: {
        type: String,
        enum: Object.values(TnxStatus),
        default: TnxStatus.pending
    },

    tnxData: {
        type: Schema.Types.Mixed
    }
}, {
    timestamps: true,
});

export const tnxModel = model<ITnx>('tnx', tnxSchema);
export const tnxProdModel = model<ITnx>('tnx-prod', tnxSchema);