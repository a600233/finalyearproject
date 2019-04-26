var AuctionSite = artifacts.require("./AuctionSite.sol");

module.exports = function(deployer) {
  deployer.deploy(AuctionSite);
};
