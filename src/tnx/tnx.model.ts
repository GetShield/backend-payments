import { Schema, model, connect } from 'mongoose';

export enum TnxStatus {
    pending = 'pending',
    complete = 'complete'
}

// 1. Create an interface representing a document in MongoDB.
interface ITnx {
    timestamp: string;
    value: string;
    orderId?: string;
    status?: TnxStatus;
    tnxData?: any;
}

// 2. Create a Schema corresponding to the document interface.
const tnxSchema = new Schema<ITnx>({
    timestamp: { type: String, required: true },
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
});

// 3. Create a Model.
export const tnxModel = model<ITnx>('tnx', tnxSchema);