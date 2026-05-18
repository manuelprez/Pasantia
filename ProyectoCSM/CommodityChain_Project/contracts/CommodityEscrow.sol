// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract CommodityEscrow {
    enum EscrowStatus {
        AwaitingDeposit,
        Funded,
        Released,
        Disputed,
        Cancelled,
        Completed
    }

    struct Agreement {
        uint256 batchId;
        address buyer;
        address seller;
        address arbiter;
        uint256 amount;
        EscrowStatus status;
        uint256 createdAt;
        uint256 depositedAt;
        bool exists;
    }

    mapping(uint256 => Agreement) public agreements;

    event AgreementInitialized(uint256 indexed batchId, address indexed buyer, address indexed seller, address arbiter);
    event FundsDeposited(uint256 indexed batchId, address indexed payer, uint256 amount);
    event PaymentReleased(uint256 indexed batchId, address indexed beneficiary, uint256 amount);
    event DisputeOpened(uint256 indexed batchId, address indexed openedBy, string reason);
    event AgreementCancelled(uint256 indexed batchId);

    modifier onlyBuyer(uint256 batchId) {
        require(msg.sender == agreements[batchId].buyer, 'Only buyer can execute this action');
        _;
    }

    modifier onlyArbiter(uint256 batchId) {
        require(msg.sender == agreements[batchId].arbiter, 'Only arbiter can execute this action');
        _;
    }

    modifier onlyParticipant(uint256 batchId) {
        require(
            msg.sender == agreements[batchId].buyer || msg.sender == agreements[batchId].seller,
            'Only buyer or seller can execute this action'
        );
        _;
    }

    function initializeAgreement(
        uint256 batchId,
        address buyer,
        address seller,
        address arbiter
    ) external {
        require(batchId != 0, 'Invalid batchId');
        require(buyer != address(0) && seller != address(0) && arbiter != address(0), 'Invalid address');
        require(!agreements[batchId].exists, 'Agreement already exists');

        agreements[batchId] = Agreement({
            batchId: batchId,
            buyer: buyer,
            seller: seller,
            arbiter: arbiter,
            amount: 0,
            status: EscrowStatus.AwaitingDeposit,
            createdAt: block.timestamp,
            depositedAt: 0,
            exists: true
        });

        emit AgreementInitialized(batchId, buyer, seller, arbiter);
    }

    function depositarFondos(uint256 batchId) external payable onlyBuyer(batchId) {
        Agreement storage agreement = agreements[batchId];
        require(agreement.exists, 'Agreement does not exist');
        require(agreement.status == EscrowStatus.AwaitingDeposit, 'Agreement not awaiting deposit');
        require(msg.value > 0, 'Amount must be greater than zero');

        agreement.amount = msg.value;
        agreement.depositedAt = block.timestamp;
        agreement.status = EscrowStatus.Funded;

        emit FundsDeposited(batchId, msg.sender, msg.value);
    }

    function liberarPago(uint256 batchId) external {
        Agreement storage agreement = agreements[batchId];
        require(agreement.exists, 'Agreement does not exist');
        require(agreement.status == EscrowStatus.Funded, 'Agreement is not funded');
        require(
            msg.sender == agreement.buyer || msg.sender == agreement.arbiter,
            'Only buyer or arbiter can release payment'
        );

        uint256 payout = agreement.amount;
        agreement.amount = 0;
        agreement.status = EscrowStatus.Released;

        payable(agreement.seller).transfer(payout);

        emit PaymentReleased(batchId, agreement.seller, payout);
    }

    function abrirDisputa(uint256 batchId, string calldata reason) external onlyParticipant(batchId) {
        Agreement storage agreement = agreements[batchId];
        require(agreement.exists, 'Agreement does not exist');
        require(agreement.status == EscrowStatus.Funded, 'Only dispute allowed when funds are locked');

        agreement.status = EscrowStatus.Disputed;

        emit DisputeOpened(batchId, msg.sender, reason);
    }

    function cancelarAcuerdo(uint256 batchId) external onlyArbiter(batchId) {
        Agreement storage agreement = agreements[batchId];
        require(agreement.exists, 'Agreement does not exist');
        require(
            agreement.status == EscrowStatus.AwaitingDeposit || agreement.status == EscrowStatus.Funded,
            'Cannot cancel in current state'
        );

        if (agreement.status == EscrowStatus.Funded) {
            payable(agreement.buyer).transfer(agreement.amount);
            agreement.amount = 0;
        }

        agreement.status = EscrowStatus.Cancelled;
        emit AgreementCancelled(batchId);
    }
}
