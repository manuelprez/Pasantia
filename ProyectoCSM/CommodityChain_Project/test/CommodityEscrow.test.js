const { expect } = require('chai');

describe('CommodityEscrow', function () {
  it('should initialize agreement, deposit funds and release payment', async function () {
    const [deployer, buyer, seller, arbiter] = await ethers.getSigners();
    const Escrow = await ethers.getContractFactory('CommodityEscrow');
    const escrow = await Escrow.deploy();

    const batchId = 1;

    await expect(escrow.initializeAgreement(batchId, buyer.address, seller.address, arbiter.address))
      .to.emit(escrow, 'AgreementInitialized')
      .withArgs(batchId, buyer.address, seller.address, arbiter.address);

    await expect(escrow.connect(buyer).depositarFondos(batchId, { value: ethers.parseEther('0.01') }))
      .to.emit(escrow, 'FundsDeposited')
      .withArgs(batchId, buyer.address, ethers.parseEther('0.01'));

    const agreement = await escrow.agreements(batchId);
    expect(agreement.status).to.equal(1); // Funded
    expect(agreement.amount).to.equal(ethers.parseEther('0.01'));

    await expect(escrow.connect(arbiter).liberarPago(batchId))
      .to.emit(escrow, 'PaymentReleased')
      .withArgs(batchId, seller.address, ethers.parseEther('0.01'));

    const finalAgreement = await escrow.agreements(batchId);
    expect(finalAgreement.status).to.equal(2); // Released
    expect(finalAgreement.amount).to.equal(0);
  });
});
