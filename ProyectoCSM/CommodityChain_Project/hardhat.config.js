require('@nomicfoundation/hardhat-toolbox');

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    compilers: [
      {
        version: '0.8.20',
      },
    ],
  },
  paths: {
    sources: 'contracts',
    tests: 'test',
    artifacts: 'artifacts',
  },
};
