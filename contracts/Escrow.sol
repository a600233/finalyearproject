pragma solidity ^0.4.18;
contract Escrow {
  // 产品id
  uint public productId;
  // 买家
  address public buyer;
  // 卖家
  address public seller;
  // 仲裁
  address public arbiter;
  // 存储钱
  uint public amount;
  bool public fundsDisbursed;
  mapping (address => bool) releaseAmount;
  uint public releaseCount;
  mapping (address => bool) refundAmount;
  uint public refundCount;

  event CreateEscrow(
    uint _productId,
    address _buyer,
    address _seller,
    address _arbiter
  );
  event UnlockAmount(
    uint _productId,
    string _operation,
    address _operator
  );
  event DisburseAmount(
    uint _productId,
    uint _amount,
    address _beneficiary
  );

  function Escrow(
    uint _productId,
    address _buyer,
    address _seller,
    address _arbiter
  ) payable public {
    productId = _productId;
    buyer = _buyer;
    seller = _seller;
    arbiter = _arbiter;
    amount = msg.value;
    fundsDisbursed = false;
    CreateEscrow(_productId, _buyer, _seller, _arbiter);
  }

  // 托管信息
  function escrowInfo() view public returns (
    address,
    address,
    address,
    bool,
    uint,
    uint
  ) {
    return (
      buyer,
      seller,
      arbiter,
      fundsDisbursed,
      releaseCount,
      refundCount
    );
  }

  // 向卖方发放金额
  function releaseAmountToSeller(address caller) public {
	seller.transfer(amount);
	 fundsDisbursed = true;

  }

  // 退款金额给买方
  function refundAmountToBuyer(address caller) public {
	buyer.transfer(amount);
	fundsDisbursed = true;
  }
}
