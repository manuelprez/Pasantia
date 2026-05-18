async function main() {
  const [deployer, buyer, seller, arbiter] = await ethers.getSigners();

  console.log('Deployer:', deployer.address);
  console.log('Buyer:   ', buyer.address);
  console.log('Seller:  ', seller.address);
  console.log('Arbiter: ', arbiter.address);

  const Escrow = await ethers.getContractFactory('CommodityEscrow');
  const escrow = await Escrow.deploy();

  const deployedAddress = escrow.target || escrow.address || (await escrow.getAddress());
  console.log('CommodityEscrow deployed at:', deployedAddress);

  const batchId = 1;

  const txInit = await escrow.initializeAgreement(batchId, buyer.address, seller.address, arbiter.address);
  await txInit.wait();
  console.log('Agreement initialized for batchId:', batchId);

  const depositAmount = ethers.parseEther('0.01');
  const txDeposit = await escrow.connect(buyer).depositarFondos(batchId, { value: depositAmount });
  await txDeposit.wait();
  console.log('Funds deposited:', depositAmount.toString());

  const agreementAfterDeposit = await escrow.agreements(batchId);
  console.log('Agreement status after deposit:', agreementAfterDeposit.status.toString());
  console.log('Agreement amount:', agreementAfterDeposit.amount.toString());

  const txRelease = await escrow.connect(arbiter).liberarPago(batchId);
  await txRelease.wait();
  console.log('Payment released by arbiter');

  const agreementFinal = await escrow.agreements(batchId);
  console.log('Final agreement status:', agreementFinal.status.toString());
  console.log('Final agreement amount:', agreementFinal.amount.toString());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
