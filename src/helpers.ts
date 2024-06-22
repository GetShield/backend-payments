// eslint-disable-next-line @typescript-eslint/ban-ts-comment
//@ts-ignore
import TronTxDecoder from 'tron-tx-decoder';
const decoder = new TronTxDecoder({ mainnet: true });

async function decodeTxInput(txId: string) {
    const decodedInput = await decoder.decodeInputById(txId);
    return decodedInput;
}