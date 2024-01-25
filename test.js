// import { BigNumber, utils } from 'ethers';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const ethers = require('ethers')

const smallUnits = ethers.BigNumber.from(5000);
const r = ethers.utils.formatUnits(smallUnits, 6);
console.log('r', r)