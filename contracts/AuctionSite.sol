pragma solidity ^0.4.18;

import "contracts/Escrow.sol";

contract AuctionSite {
  enum ProductStatus {
    Open,
    Sold,
    Unsold
  }
  enum ProductCondition {
    New,
    Used
  }
  uint public productIndex;
  mapping(address => mapping(uint => Product)) stores;
  mapping(uint => address) productIdInStore;
  mapping(uint => address) productEscrow;
  struct Bid {
    address bidder;
    uint productId;
    uint value;
    bool revealed;
  }
//Product[] public products;
  struct Product {
    // 产品id
    uint id;
    // 产品名字
    string name;
    // 分类
    string categories;
    // 图片hash
    string pictureHash;
    // 图片描述信息的hash
    string descriptionHash;
    // 开始竞标的时间
    uint startTime;
    // 竞标结束时间
    uint endTime;
    // 起拍价格
    uint startingPrice;
    // 赢家的钱包地址
    address highestBidder;
    // 赢家竞标的价格
    uint highestBid;
    // 第二高的这个人的地址
    uint secondHighestBid;
    // 一共有多少人参与竞标
    uint totalBids;
    // 状态
    ProductStatus status;
    // 新、旧
    ProductCondition condition;
    mapping(address => mapping(bytes32 => Bid)) bids;
  }

  function AuctionSite() public {
    productIndex = 0;
  }

  // 添加产品到区块链
  function addProduct(
    string _name,
    string _categories,
    string _pictureHash,
    string _descriptionHash,
    uint _startTime,
    uint _endTime,
    uint _startingPrice,
    uint _productCondition
  ) public {
    require(_startTime < _endTime);
    productIndex += 1;
    Product memory product = Product(
      productIndex,
      _name,
      _categories,
      _pictureHash,
      _descriptionHash,
      _startTime,
      _endTime,
      _startingPrice,
      0,
      0,
      0,
      0,
      ProductStatus.Open,
      ProductCondition(_productCondition)
    );
    stores[msg.sender][productIndex] = product;
    productIdInStore[productIndex] = msg.sender;
  }

  // 根据产品ID获取产品详情
  function getProductDetail(uint _productId) view public returns(
    uint,
    string,
    string,
    string,
    string,
    uint,
    uint,
    uint,
    ProductStatus,
    ProductCondition
  ) {
    Product memory product = stores[productIdInStore[_productId]][_productId];
    return (
      product.id,
      product.name,
      product.categories,
      product.pictureHash,
      product.descriptionHash,
      product.startTime,
      product.endTime,
      product.startingPrice,
      product.status,
      product.condition
    );
  }

  // 出价
  function bid(uint _productId, bytes32 _bid) payable public returns(bool) {
    Product storage product = stores[productIdInStore[_productId]][_productId];
    require(now >= product.startTime);
    require(now <= product.endTime);//换if()
    require(msg.value > product.startingPrice);
    require(product.bids[msg.sender][_bid].bidder == 0);//require(productIdInStore[_productId] != msg.sender);卖家不能进行拍卖
    product.bids[msg.sender][_bid] = Bid(msg.sender, _productId, msg.value, false);
    product.totalBids += 1;//  product.totalBids = 1+product.totalBids;
    return true;
  }

  // 揭示出价
  function revealBid(
    uint _productId,
    string _amount,
    string _secret
  ) public {
    Product storage product = stores[productIdInStore[_productId]][_productId];
    require(now > product.endTime);
    bytes32 sealedBid = keccak256(_amount, _secret);// 加密bid
    Bid memory bidInfo = product.bids[msg.sender][sealedBid];
    require(bidInfo.bidder > 0); //0xf55 uint160
    require(bidInfo.revealed == false);
    uint refund; // 退款
    uint amount = stringToUint(_amount);
    if (bidInfo.value < amount) {
      refund = bidInfo.value;
    } else {
      if (address(product.highestBidder) == 0) {
        product.highestBidder = msg.sender;
        product.highestBid = amount;
        product.secondHighestBid = product.startingPrice;
        refund = bidInfo.value - amount;
      } else {
        if (amount > product.highestBid) {
          product.secondHighestBid = product.highestBid;
          product.highestBidder.transfer(product.highestBid);
          product.highestBidder = msg.sender;
          product.highestBid = amount;
          refund = bidInfo.value - amount;
        } else if (amount > product.secondHighestBid) {
          product.secondHighestBid = amount;
          refund = amount;
        } else {
          refund = amount;
        }
      }
      if (refund > 0) {
        msg.sender.transfer(refund);
        product.bids[msg.sender][sealedBid].revealed = true;
      }
    }
  }

  // 最高出价者的信息
  function highestBidderInfo(uint _productId) view public returns(
    address,
    uint,
    uint
  ) {
    Product memory product = stores[productIdInStore[_productId]][_productId];
    return (
      product.highestBidder,
      product.highestBid,
      product.secondHighestBid
    );
  }

  // 总的出价数
  function totalBids(uint _productId) view public returns(uint) {
    Product memory product = stores[productIdInStore[_productId]][_productId];
    return product.totalBids;
  }

  function stringToUint(string s) pure private returns(uint) {
    bytes memory b = bytes(s);
    uint result = 0;
    for (uint i = 0; i < b.length; i++) {
      if (b[i] >= 48 && b[i] <= 57) {
        result = result * 10 + (uint(b[i]) - 48);
      }
    }
    return result;
  }
  /*    function safeParseInt(string memory _a, uint _b) internal pure returns (uint _parsedInt) {
        bytes memory bresult = bytes(_a);
        uint mint = 0;
        bool decimals = false;
        for (uint i = 0; i < bresult.length; i++) {
            if ((uint(uint8(bresult[i])) >= 48) && (uint(uint8(bresult[i])) <= 57)) {
                if (decimals) {
                   if (_b == 0) break;
                    else _b--;
                }
                mint *= 10;
                mint += uint(uint8(bresult[i])) - 48;
            } else if (uint(uint8(bresult[i])) == 46) {
                require(!decimals, 'More than one decimal encountered in string!');
                decimals = true;
            } else {
                revert("Non-numeral character encountered in string!");
            }
        }
        if (_b > 0) {
            mint *= 10 ** _b;
        }
        return mint;
    }*/

  // 完成拍卖
  function finishAuction(uint _productId) public {
    Product storage product = stores[productIdInStore[_productId]][_productId];

    require(now > product.endTime);
    require(product.status == ProductStatus.Open);
    require(product.highestBidder != msg.sender);
    require(productIdInStore[_productId] != msg.sender);

    if (product.totalBids == 0) {
      product.status = ProductStatus.Unsold;
    } else {
      Escrow escrow = (new Escrow).value(product.secondHighestBid)(
        _productId,
        product.highestBidder,
        productIdInStore[_productId],
        msg.sender
      );
      productEscrow[_productId] = address(escrow);
      product.status = ProductStatus.Sold;

      uint refund = product.highestBid - product.secondHighestBid;
      product.highestBidder.transfer(refund);
    }
    stores[productIdInStore[_productId]][_productId] = product;
  }

  // 产品托管地址
  function escrowAddressForProduct(uint _productId) view public returns(address) {
    return productEscrow[_productId];
  }

  // 托管信息
  function escrowInfo(uint _productId) view public returns(
    address,
    address,
    address,
    bool,
    uint,
    uint
  ) {
    return Escrow(productEscrow[_productId]).escrowInfo();
  }

  // 向卖方发放金额
  function releaseAmountToSeller(uint _productId) public {
    Escrow(productEscrow[_productId]).releaseAmountToSeller(msg.sender);
  }

  // 退款金额给买方
  function refundAmountToBuyer(uint _productId) public {
    Escrow(productEscrow[_productId]).refundAmountToBuyer(msg.sender);
  }
}
