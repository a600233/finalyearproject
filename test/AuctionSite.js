// 引入合约
var AuctionSite = artifacts.require('./contracts/AuctionSite.sol');
const ethUtil = require('ethereumjs-util');
const Web3 = require('web3');
const web3 = new Web3(
  new Web3.providers.HttpProvider('http://localhost:8545'),
);

contract('AuctionSite', async accounts => {
  // 确保能获取到默认的eth钱包地址
  it('should return default account', async () => {
    const code = web3.eth.getCode(accounts[0]);
    assert.equal(code, '0x');
  });
  // 确保默认的eth钱包地址账户余额大于零
  it('default account balance > 0', async () => {
    const balance = web3.fromWei(web3.eth.getBalance(accounts[0]));
    assert.equal(balance > 0, true);
  });
  // 确保可以成功添加产品，并可获取到产品详情
  it('should return product detail when add product to blockchain', async () => {
    const instance = await AuctionSite.deployed();
    const name = 'EVO10';
    const categories = 'Cell Phones & Accessories';
    await instance.addProduct(
      name,
      categories,
      'QmV9Pc573i5xHxEDsNZnxRntnuohepAoE9kp64C6ikWc4z',
      'QmPFNbvm9Tj7kLQBiZpkUGAoer6a9WM1Av7DU6YmkiuRZc',
      Math.floor(new Date().getTime()/1000),
      Math.floor(new Date().getTime()/1000) + 300,
      web3.toWei(1),
      0,
      { from: accounts[9] },
    );
    const productDetail = await instance.getProductDetail(1);
    assert.equal(productDetail[1], name);
    assert.equal(productDetail[2], categories);
    assert.equal(productDetail[8], 0);
  });
  // 确保可以获取到产品数量
  it('should return product count === 1', async () => {
    const instance = await AuctionSite.deployed();
    const productCount = await instance.productIndex();
    assert.equal(productCount, 1);
  });
  // 确保用户可以正常投标
  it('should return true when bid', async () => {
    const instance = await AuctionSite.deployed();
    const secretPhraseBid = 2;
    const sealedBid = '0x' + ethUtil .keccak256(web3.toWei(2, 'ether') + secretPhraseBid).toString('hex');
    const sendAmount = 2;
    const result = await instance.bid(1, sealedBid, {
      value: web3.toWei(sendAmount),
      from: accounts[9],
      gas: 233333,
    });
    assert.equal(result.receipt.status, true);
  });
});
