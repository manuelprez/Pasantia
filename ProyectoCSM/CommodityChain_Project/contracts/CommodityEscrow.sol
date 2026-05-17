// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract CommodityEscrow {
    enum Status { Created, InTransit, Inspected, Delivered, Disputed, Completed }
    
    struct Batch {
        address producer;
        address buyer;
        uint256 price;
        Status status;
        string ipfsHash;
    }

    mapping(uint256 => Batch) public batches;

    function createBatch(uint256 _id, address _buyer, string memory _hash) public payable {
        batches[_id] = Batch(msg.sender, _buyer, msg.value, Status.Created, _hash);
    }

    function releasePayment(uint256 _id) public {
        require(msg.sender == batches[_id].buyer, "Solo el comprador libera");
        payable(batches[_id].producer).transfer(batches[_id].price);
        batches[_id].status = Status.Completed;
    }
}