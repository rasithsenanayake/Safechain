const { Blockchain } = require('./blockchain');

console.log('Initializing Safe Chain...');

// Create a new blockchain
const safeChain = new Blockchain();

// Add some blocks
safeChain.addBlock({ data: 'Initial Block' });
safeChain.addBlock({ data: 'Second Block with Transaction Data' });
safeChain.addBlock({ data: 'Third Block with More Data' });

// Display the blockchain
console.log(JSON.stringify(safeChain, null, 2));
