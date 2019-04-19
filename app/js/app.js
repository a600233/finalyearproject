import '../css/app.css';
import '../css/product.css';

import Web3 from 'web3';
import { default as contract } from 'truffle-contract';
import ecommerce_store_artifacts from '../../build/contracts/EcommerceStore.json';
import config from './config';

var EcommerceStore = contract(ecommerce_store_artifacts);

const ipfsAPI = require('ipfs-api');
const ethUtil = require('ethereumjs-util');

const ipfs = ipfsAPI({
  host: config.ipfs.host,
  port: config.ipfs.port,
  protocol: config.ipfs.protocol,
});

window.Utils = {
  /**
   * 渲染产品详情
   * @param {String} productId 产品ID
   */
  renderProductDetails: function(productId) {
    EcommerceStore.deployed().then(function(i) {
      i.getProductDetail.call(productId).then(function(p) {
        console.log(p);
        let content = "";

        // 产品介绍
        ipfs.cat(p[4]).then(function(stream) {
          //读取图片哈希Utf8Array
          stream.on('data', function(chunk) {
            // do stuff with this chunk of data
            content += chunk.toString();
            console.log(content);
            $("#product-desc").append("<div>" + content+ "</div>");
          });
        });
        // bids
        const msg = localStorage.getItem('BidMsg' + productId);
        msg && $("#bid-msg").append(msg).show();
        // 产品图片
        $("#product-image").append("<img src='" + config.ipfs.base + p[3] + "' />");
        // 产品价格
        $("#product-price").html(Utils.getEth(p[7]));
        // 产品名称
        $("#product-name").html(p[1]);
          console.log(p[1]);
        // 拍卖结束时间
        $("#product-auction-end").html(Utils.countDownDate(p[6]));
        // 产品ID
        $("#product-id").val(p[0]);
        $("#revealing, #bidding, #finalize-auction, #after-sale").hide();
        let currentTime = Utils.getCurrentTimeInSeconds();
        if (parseInt(p[8]) == 1) {//Sold
          EcommerceStore.deployed().then(function(i) {
            $("#thrid-party").show();
            i.highestBidderInfo.call(productId).then(function(f) {

                $("#final-result-sec").append(" He or she (" + f[0]+ ") win the bid with" + Utils.getEth(f[2]) + "!").show();

            })
            i.escrowInfo.call(productId).then(function(f) {

              $("#final-result-sec").append('<p><strong>ADDRESS FOR THIS AUCTION:</strong></p><p>'+ f[0]+ '------------------------> Bidder</p>').show();
              $("#final-result-sec").append('<p>'+ f[1] +'------------------------> Seller</p>').show();
              $("#final-result-sec").append('<p>'+ f[2]+'------------------------> The Third Party</p>').show();
              if(f[3] == true) {
                $("#successful").show();
                $("#successful").html("Amount from the escrow has been released");
              } else {
                $("#release-count").html(f[4] + " of 3 participants have agreed to release funds");
                $("#refund-count").html(f[5] + " of 3 participants have agreed to refund the buyer");
              }
            });
          });
        } else if (parseInt(p[8]) == 2) {
          $("#wrong").append("Abortive Auction!").show();//unsold
        } else if (currentTime < p[5]) {
          // 拍卖未开始
          $("#waiting").show();
          alert("The auction hasn't started yet!");
        } else if (currentTime < parseInt(p[6])) {
          $("#bidding").show();//揭标还是竞标！！！！
        } else if (currentTime < (parseInt(p[6]) + 120)) {
          $("#revealing").show();//揭标时间
        } else {
          $("#finalize-auction").show();//当前时间大于拍卖结束时间
        }
      });
    });
  },
  /**
   * 获取当前时间戳
   */
  getCurrentTimeInSeconds: function() {
    return Math.round(new Date() / 1000);
  },
  /**
   * 展示价格
   * @param {String} amt
   */
  getEth: function(amt) {
    return ' ' + web3.fromWei(amt, 'ether')+' ETH';//Ξ
  },
  /**
   * 显示结束时间
   * @param {Number} seconds 秒
   */
  countDownDate: function(duration) {
    let now = Utils.getCurrentTimeInSeconds();
    let distance = duration - now;
    if (distance <= 0) {
      return 'EXPIRED';
    }
    let days = Math.trunc(distance / (24 * 60 * 60));
    distance -= days * 24 * 60 * 60;
    let hours = Math.trunc(distance / (60 * 60));
    distance -= hours * 60 * 60;
    let minutes = Math.trunc(distance / 60);

    if (days > 0) {
      return (
        'Auction will close in ' +
        days +
        ' days ' +
        hours +
        ' hours ' +
        minutes +
        ' minutes'
      );
    } else if (hours > 0) {
      return 'Auction will close in ' + hours + ' hours ' + minutes + ' minutes ';
    } else if (minutes > 0) {
      return 'Auction will close in ' + minutes + ' minutes ';
    } else {
      return 'Auction will close in ' + distance + ' seconds';
    }
  },
  /**
   * 保存产品
   * @param {*} reader
   * @param {*} decodedParams
   */
  saveProduct: function(reader, decodedParams) {
    let imageId, descId;
    Utils.saveImageOnIpfs(reader).then(function(id) {
      imageId = id;
      Utils.saveTextBlobOnIpfs(decodedParams['product-description']).then(function(id) {
        descId = id;
        Utils.saveProductToBlockchain(decodedParams, imageId, descId);
      });
    });
  },
  /**
   * 将产品保存到链上
   * @param {*} params
   * @param {*} imageId
   * @param {*} descId
   */
  saveProductToBlockchain: function(params, imageId, descId) {
    let startTime = Date.parse(params['product-auction-start']) / 1000;
    let auctionDuration = parseInt(params['product-auction-end']) * 24 * 60 * 60;
    let endTime =
      startTime + auctionDuration;

    EcommerceStore.deployed().then(function(i) {
      i.addProduct(
        params['product-name'],
        params['product-categories'],
        imageId,
        descId,
        startTime,
        endTime,
        web3.toWei(params['product-price'], 'ether'),
        parseInt(params['product-condition']),
        {
          from: web3.eth.accounts[0],
          gas: 666666,
        },
      ).then(function(f) {
        $('#successful').show();
        $('#successful').html('Your auction was hold successfully!');
        setTimeout(() => {
          location.href = './index.html';
        }, 1000);
      }).catch(err => {
        reject(err);
        $('#wrong').show();
        $('#wrong').html(
          'THERE IS AN ERROR IN LISTING A ITEM!',
        );
      });
    });
  },
  /**
   * 保存图片到ipfs
   * @param {*} reader
   */
  saveImageOnIpfs: function(reader) {
    return new Promise(function(resolve, reject) {
      const buffer = Buffer.from(reader.result);
      ipfs
        .add(buffer)
        .then(response => {
          resolve(response[0].hash);
        })
        .catch(err => {
          reject(err);
          $('#wrong').show();
          $('#wrong').html(
            'THERE IS AN ERROR IN IPFS!',
          );
        });
    });
  },
  /**
   * 保存文本到ipfs
   * @param {*} blob
   */
  saveTextBlobOnIpfs: function(blob) {
    return new Promise(function(resolve, reject) {
      const descBuffer = Buffer.from(blob, 'utf-8');
      ipfs
        .add(descBuffer)
        .then(response => {
          resolve(response[0].hash);
        })
        .catch(err => {
          reject(err);
          $('#wrong').show();
          $('#wrong').html(
            'THERE IS AN ERROR IN IPFS!',
          );
        });
    });
  },
  // 渲染分类
  renderCategories: function() {
    const categories = ["All", "Arts & Crafts","Automotive","Baby","Beauty & Personal Care","Books","Computers","Electronics","Women Fashion","Men Fashion","Girls Fashion","Boys Fashion","Health & Household","Home & Kitchen","Industrial & Scientific","Luggage","Movies & Television","Pet Supplies","Sports & Outdoors","Tools & Home Improvement","Toys","Video Games"];
    let ul = '<ul>';
    for(let i = 0, length = categories.length; i < length; i++) {
      ul += `<li><button class="btn btn-default">${categories[i]}</button></li>`;
    }
    ul += '</ul>';
    $('#categories').html(ul).on('click', 'li>button', function() {
      const type = $(this).text();
      if (type === 'All') {
        $('#product-list .blogpost').fadeIn();
      } else {
        $('#product-list .blogpost').fadeOut();
        $('#product-list').find(`[type="${type}"]`).fadeIn();
      }
    });
  },
  // 渲染产品列表
  renderStore: function() {
    EcommerceStore.deployed().then(function(i) {
      i.productIndex().then((number) => {
        $('#item-num').html('' + number);
        for (let j = 0; j < number; j++) {
          i.getProductDetail(j + 1).then(function(p) {
            $("#product-list .blogposts").append(Utils.buildProduct(p, j + 1));
            if (p[6] < new Date/1000) {
              $("#product-reveal-list .blogposts").append(Utils.buildProduct(p, j + 1));
            }
          });
        }
      });
    });
  },
  /**
   * 构建产品
   * @param {*} product
   * @param {*} id
   */
  buildProduct: function(product, id) {
    const dom = `<a href="product.html?Id=${id}" class="blogpost" type="${product[2]}">
                    <div class="image">
                      <img src="${config.ipfs.base}${product[3]}" class="image1" />
                    </div>
                    <div class="title">
                      <div class="price">${Utils.getEth(product[7])}</div>
                      <div>
                          ${product[1]}
                      </div>
                      <div class="type">
                          ${product[2]}
                      </div>
                      <div class="time">${new Date(product[5] * 1000)}</div>
                    </div>
                  </a>`;
    return dom;
  }
}

window.App = {
  start: function() {
    var self = this;

    EcommerceStore.setProvider(web3.currentProvider);
    Utils.renderStore();
    Utils.renderCategories();

    var reader;

    $('#product-image').change(function(event) {
      //onsole.log(test1); for test
      const file = event.target.files[0];
      reader = new window.FileReader();
      reader.readAsArrayBuffer(file);
    });

    $('#add-item-to-store').submit(function(event) {
      const req = $('#add-item-to-store').serialize();
      let params = JSON.parse(
        '{"' +
          req
            .replace(/"/g, '\\"')
            .replace(/&/g, '","')
            .replace(/=/g, '":"') +
          '"}',
      );
      let decodedParams = {};
      Object.keys(params).forEach(function(v) {
        decodedParams[v] = decodeURIComponent(decodeURI(params[v]));
      });
      Utils.saveProduct(reader, decodedParams);
      event.preventDefault();
    });

    $('#finalize-auction').submit(function(event) {
      $('#successful').hide();
      let productId = $('#product-id').val();
      EcommerceStore.deployed().then(function(i) {
        i.finishAuction(parseInt(productId), {
          from: web3.eth.accounts[0],
        })
          .then(function(f) {
            $('#warning').show();
            $('#warning').html(
              'The auction has been finalized and winner declared.',
            );
            console.log(f);
            location.reload();
          })
          .catch(function(e) {
            console.log(e);
            $('#wrong').show();
            $('#wrong').html(
              'Auctions can only be concluded by a third party!',
            );
          });
      });
      event.preventDefault();
    });

    if ($('#product-details').length > 0) {
      console.log('Search Params = ' + new URLSearchParams(window.location));
      let productId = new URLSearchParams(window.location.search).get('Id');
      Utils.renderProductDetails(productId);
    }

    $('#bidding').submit(function(event) {
      $('#successful').hide();
      let amount = $('#actual-bid-amount').val();
      let sendAmount = $('#bid-mask').val();
      let secretPhraseBid = $('#secret-phrase').val();
      let sealedBid =
        '0x' +
        ethUtil
          .keccak256(web3.toWei(amount, 'ether') + secretPhraseBid)
          .toString('hex');
      let productId = $('#product-id').val();
      console.log(sealedBid + ' for ' + productId);
      EcommerceStore.deployed().then(function(i) {
        i.bid(parseInt(productId), sealedBid, {
          value: web3.toWei(sendAmount),
          from: web3.eth.accounts[0],
          gas: 233333,
        }).then(function(f) {
          $('#successful').html('Your bid has been successfully submitted!');
          $('#successful').show();
          console.log(f);
          const msg = "<p>Bid: " + sealedBid + " with mask price of " + sendAmount + "</p>";
          const localMsg = localStorage.getItem('BidMsg:' + productId);
          localStorage.setItem('BidMsg' + productId, localMsg ? localMsg + msg : msg);
          $("#bid-msg").append(msg).show();
          $('#actual-bid-amount').val('');
          $('#bid-mask').val('');
          $('#secret-phrase').val('');
        });
      });
      event.preventDefault();
    });

    $('#revealing').submit(function(event) {
      $('#successful').hide();
      let amount = $('#actual-amount').val();
      let secretPhraseRev = $('#secret-phrase-revealt').val();
      let productId = $('#product-id').val();
      EcommerceStore.deployed().then(function(i) {
        i.revealBid(
          parseInt(productId),
          web3.toWei(amount).toString(),
          secretPhraseRev,
          {
            from: web3.eth.accounts[0],
            gas: 233333,
          },
        ).then(function(f) {
          $('#successful').show();
          $('#successful').html('Your bid has been successfully revealed!');
          $('#secret-phrase-revealt').val('');
          $('#actual-amount').val('');
          console.log(f);
        });
      });
      event.preventDefault();
    });
    $("#for-seller").click(function() {//给钱
      let productId = new URLSearchParams(window.location.search).get('id');
      EcommerceStore.deployed().then(function(f) {
        $("#warning").html("Please be patient for a moment.").show();
        console.log(productId);
        f.releaseAmountToSeller(parseInt(productId), {from: web3.eth.accounts[0], gas: 233333}).then(function(f) {
          console.log(f);
          location.reload();
        }).catch(function(e) {
          console.log(e);
          $('#wrong').show();
          $('#wrong').html(
            'ERROR IN RELEASE FUNDS!',
          );
        })
      });
    });
    $("#for-bidder").click(function() {//退款给
      let productId = new URLSearchParams(window.location.search).get('id');
      EcommerceStore.deployed().then(function(f) {
        $("#warning").html("Please be patient for a moment.").show();
        f.refundAmountToBuyer(parseInt(productId), {from: web3.eth.accounts[0], gas: 233333}).then(function(f) {
          console.log(f);
          location.reload();
        }).catch(function(e) {
          console.log(e);
          $('#wrong').show();
          $('#wrong').html(
            'ERROR IN RETERUNING FUNDS!',
          );
        })
      });
    });
  },
};

window.addEventListener('load', function() {
  if (typeof web3 !== 'undefined') {
    console.warn("Using web3 detected from external source. If you find that your accounts don't appear or you have 0 MetaCoin, ensure you've configured that source properly. If using MetaMask, see the following link. Feel free to delete this warning. :) http://truffleframework.com/tutorials/truffle-and-metamask");
    console.info(web3.currentProvider);
    window.web3 = new Web3(web3.currentProvider);
    console.info(window.web3.eth.defaultAccount);
  } else {
    console.warn("No web3 detected. Falling back to http://localhost:8545. You should remove this fallback when you deploy live, as it's inherently insecure. Consider switching to Metamask for development. More info here: http://truffleframework.com/tutorials/truffle-and-metamask");

    window.web3 = new Web3(
      new Web3.providers.HttpProvider('http://localhost:8545'),
    );
  }

  App.start();
});
