import '../css/app.css';
import '../css/product.css';

import Web3 from 'web3';
import { default as contract } from 'truffle-contract';
import auction_site_artifacts from '../../build/contracts/AuctionSite.json';
import config from './config';

var AuctionSite = contract(auction_site_artifacts);

const ipfsAPI = require('ipfs-api');
const ethUtil = require('ethereumjs-util');

const ipfs = ipfsAPI({
  host: config.ipfs.host,
  port: config.ipfs.port,
  protocol: config.ipfs.protocol,
});//configure ipfs

window.Utils = {
  /**
   * 渲染产品详情
   * @param {String} productId 产品ID
   */
  renderProductDetails: function(productId) {
    AuctionSite.deployed().then(function(i) {
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
            $("#detailed-info").append("<br><div style=\"text-align:center;font-size: 30px; padding: 0;margin-bottom: 100px;\">" + content + "</div>");
          });
        });
        // bids
        const msg = localStorage.getItem('BidMsg' + productId);//将产品编号存到存储到key字段
         msg && $("#bid-msg").append(msg).show();
        // 产品图片
        $("#picture").append("<img src='" + config.ipfs.base + p[3] + "' />");
        // 产品价格
        $("#product-price").html(Utils.getEth(p[7]));
        // 产品名称
        $("#product-name").html(p[1]);
          console.log(p[1]);
        // 拍卖结束时间
        setInterval(function(){
          document.getElementById("product-auction-end").innerHTML = Utils.countDownDate(p[6])
        },1000);
        // 产品ID
        $("#product-id").val(p[0]);

        if(parseInt(p[9])==0){
          $("#item-condition").html("The Condition of Item:  "+"<strong>&nbsp;Brand New</strong>");
        }else{
          $("#item-condition").html("The Condition of Item: "+"<strong>&nbsp;Have Been Used</strong>");
        }

      console.log("qingkuang");
      console.log(p[9]);
        $("#claim, #bidding, #declare-end, #after-sale").hide();
        let presentTimeInSeconds = Utils.getPresentTime();
        if (parseInt(p[8]) == 1) {//Sold

          AuctionSite.deployed().then(function(i) {
            $("#thrid-party").show();
            /*if(parseInt(f[0]) == 0){
              $("#after-auction").hide();
              $("#final-result-sec").hide();
              $("#wrong").append("NO ONE CLAIM!!!").show();
            }*/
            i.highestBidderInfo.call(productId).then(function(f) {
              if(parseInt(f[0]) != 0){
                $("#final-result-sec").append("<p> &nbsp&nbspShe or He (" + f[0]+ ") win the bid with" +"<strong>"+ Utils.getEth(f[2]) +"</strong>!</p>").show();
              }else {
                $("#after-auction").hide();
                $("#final-result-sec").hide();
                $("#wrong").append("NO ONE CLAIM!!!").show();
              }
            })

            i.escrowInfo.call(productId).then(function(f) {
            if(parseInt(f[0]) != 0){
              $("#final-result-sec").append('<p><strong>&nbsp&nbspADDRESSES FOR THIS AUCTION:</strong></p><p>&nbsp&nbsp'+ f[0]+ '------------------------> Bidder</p>').show();
              $("#final-result-sec").append('<p>&nbsp&nbsp'+ f[1] +'------------------------> Seller</p>').show();
              $("#final-result-sec").append('<p>&nbsp&nbsp'+ f[2]+'------------------------> The Third Party</p>').show();
                console.log(f[3])
              if(f[3] == true) {
                $("#successful").show();
                $("#successful").html("<strong>Subsequent transaction of auction is completed!</strong>");
                $("#after-success").show();
                $("#after-success").html("<strong>Subsequent transaction of auction is completed!</strong>");
                $("#after-auction").hide();//隐藏后续交易
              }
              else {
                  console.log(f[4]);
                      console.log(f[5]);
                $("#release-count").show();
                $("#refund-count").show();
                $("#release-count").html( f[4]+ " of 3 agree to transfer eth to seller.");
                $("#refund-count").html( f[5]+ " of 3 agree to refund eth to bidder.");
              }
            }else{
              $("#after-auction").hide();
              $("#final-result-sec").hide();
              $("#wrong").append(" AUCTION CLOSED!").show();
            }
            });
          });
        } else if (parseInt(p[8]) == 2) {
          $("#wrong").append("Abortive Auction!").show();//unsold
        } else if (presentTimeInSeconds < p[5]) {
          // 拍卖未开始
          $("#waiting").show();
            $("#product-auction-end").hide();
          setInterval(function(){
            document.getElementById("waiting").innerHTML = Utils.countDownDateBeforeStart(p[5])
          },1000);
        } else if (presentTimeInSeconds < parseInt(p[6])) {
          $("#bidding").show();//竞标时间！！！！
        } else if (presentTimeInSeconds < (parseInt(p[6]) + 80)) {//claim time
          $("#claim").show();//揭标时间 80s
        //$("#product-auction-end").html(Utils.countDownDateForClaim(parseInt(p[6]) + 80));
        setInterval(function(){
          document.getElementById("product-auction-end").innerHTML = Utils.countDownDateForClaim(parseInt(p[6]) + 80)
        },1000);
        } else {
          $("#declare-end").show();//当前时间大于拍卖结束时间
          $("#claim-over").show();//显示时间截止
        }
      });
    });
  },
  /**
   * get present by seconds
   */
  getPresentTime: function() {
    return Math.round(new Date() / 1000);//toseconds
    //return new Date().getTime()/ 1000;
  },
  /**
   * Show the price of items
   * @param {String} amt
   */
  getEth: function(amt) {
    return ' ' + web3.fromWei(amt, 'ether')+' ETH';//Ξ
  },

  /**
   * 显示结束时间 display endingtime.
   * @param {Number} seconds 秒
   */
  countDownDate: function(endingtime) {
    let now = Utils.getPresentTime();
    let distance = endingtime - now;
    if (distance <= 0) {
      //location.reload();
      return 'EXPIRED';

    }
    var days = Math.floor(distance / ( 60 * 60 * 24));
    var hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / ( 60 * 60));
    var minutes = Math.floor((distance % (1000 * 60 * 60)) /  60);
    var seconds = Math.floor(distance % 60);

    if (distance > 0) {
      return (
        'Bidding will close in ' +
        minutes +
        ' minutes ' + seconds + ' seconds' //  days + ' days ' + hours + ' hours ' +
      );
    }
  },

  countDownDateForClaim: function(endingtime) {
    let now = Utils.getPresentTime();
    let distance = endingtime - now;
    if (distance <= 0) {
      //location.reload();
return 'EXPIRED';
    }
    var days = Math.floor(distance / ( 60 * 60 * 24));
    var hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / ( 60 * 60));
    var minutes = Math.floor((distance % (1000 * 60 * 60)) /  60);
    var seconds = Math.floor(distance % 60);

    if (distance > 0) {
      return (
        'Claim time: ' +
        minutes +
        ' minutes ' + seconds + ' seconds' //  days + ' days ' + hours + ' hours ' +
      );
    }

  },
  countDownDateBeforeStart: function(endingtime) {
    let now = Utils.getPresentTime();
    let distance = endingtime - now;
    if (distance <= 0) {
      //clearInterval(countDownDateBeforeStart);
      return 'EXPIRED';
    }
    var days = Math.floor(distance / ( 60 * 60 * 24));
    var hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / ( 60 * 60));
    var minutes = Math.floor((distance % (1000 * 60 * 60)) /  60);
    var seconds = Math.floor(distance % 60);

    if (distance > 0) {
      return (
        'Auction will start in ' +
        minutes +
        ' mins ' + seconds + ' sec.' //  days + ' days ' + hours + ' hours ' +
      );
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
    let auctionDuration = parseInt(params['product-auction-end']) * 60;//auction time * 24 * 60
    let endTime =
      startTime + auctionDuration;

    if(endTime >= Utils.getPresentTime()){
    AuctionSite.deployed().then(function(i) {
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
            $('#successful-list').show();
            $('#successful-list').html('Your auction was hold successfully!');
            setTimeout(() => {
              location.href = './index.html';
            }, 1500);
      }).catch(err => {
        reject(err);
        $('#wrong-list').show();
        $('#wrong-list').html(
          'THERE IS AN ERROR IN LISTING A ITEM! PLEASE CHECK YOUR INFORMATION OF ITEM!',
        );
      });
    });
    }else {
    $('#product-auction-start').val('');//时间不对自动清零
  alert("TIME FORMAT ERROR!!!");//提示错误
  }
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
    AuctionSite.deployed().then(function(i) {
      i.productIndex().then((number) => {
        $('#item-num').html('' + number);
        for (let j = number-1; j >= 0; j--) {//根据产品id，和产品数量来遍历获取列表的
          i.getProductDetail(j + 1).then(function(p) {
            $("#product-list .blogposts").append(Utils.buildProduct(p, j +1));//id越小，说明产品越早添加
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
    const dom = `<a href="item.html?Id=${id}" class="blogpost" type="${product[2]}">
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

    AuctionSite.setProvider(web3.currentProvider);
    Utils.renderStore();
    Utils.renderCategories();

    var reader;//到每个方法里

    $('#picture').change(function(event) {
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

    $('#declare-end').submit(function(event) {
      $('#successful').hide();
      let productId = $('#product-id').val();
      AuctionSite.deployed().then(function(i) {
        i.finishAuction(parseInt(productId), {
          from: web3.eth.accounts[0],
        })
          .then(function(f) {
            $('#warning').show();
            $('#warning').html(
              'The auction has been declared the end!',
            );
            console.log(f);
            location.reload();
          })
          .catch(function(e) {
            console.log(e);
            $('#wrong').show();
            $('#wrong').html(
              'Auctions can only be declared by the third party!',
            );
          });
      });
      event.preventDefault();
    });

    if ($('#product-details').length > 0) {
      console.log('Search Params = ' + new URLSearchParams(window.location));
      let productId = new URLSearchParams(window.location.search).get('Id');//itemID
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
        //if(sendAmount < parseInt(params['product-price']))
      AuctionSite.deployed().then(function(i) {
        i.bid(parseInt(productId), sealedBid, {
          value: web3.toWei(sendAmount),//直接sendamount
          from: web3.eth.accounts[0],
          gas: 233333,
        }).then(function(f) {
          $('#successful').html('Your bid has been successfully submitted!');
          $('#successful').show();
          console.log(f);
          const msg = "<p>Bid: " + sealedBid + " with mask price of " + sendAmount + " ETH"+"</p>";
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

    $('#claim').submit(function(event) {
      $('#successful').hide();
      let amount = $('#actual-amount').val();
      let secretPhraseRev = $('#secret-phrase-revealt').val();
      let productId = $('#product-id').val();
      AuctionSite.deployed().then(function(i) {
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
          $('#successful').html('Your bid has been successfully claimed!');
          $('#secret-phrase-revealt').val('');
          $('#actual-amount').val('');
          console.log(f);
        });
      });
      event.preventDefault();
    });
    $("#for-seller").click(function() {//给钱
      let productId = new URLSearchParams(window.location.search).get('Id');
      AuctionSite.deployed().then(function(f) {
        $("#warning").html("Please be patient for a moment.").show();
        console.log("productId:");
        console.log(parseInt(productId));
        f.releaseAmountToSeller(parseInt(productId), {from: web3.eth.accounts[0], gas: 233333}).then(function(f) {
          console.log(f);
          location.reload();
        }).catch(function(e) {
          console.log(e);
          alert("Sorry, there is an error, please CHECK this auction again!");
          $('#wrong').show();
          $('#wrong').html(
            'ERROR IN RELEASE FUNDS!',
          );
        })
      });
    });
    $("#for-bidder").click(function() {//退款给
      let productId = new URLSearchParams(window.location.search).get('Id');
      AuctionSite.deployed().then(function(f) {
        $("#warning").html("Please be patient for a moment.").show();
        console.log("productId:");
        console.log(parseInt(productId));

        f.refundAmountToBuyer(parseInt(productId), {from: web3.eth.accounts[0], gas: 233333}).then(function(f) {
          location.reload();
        }).catch(function(e) {
          console.log(e);
          alert("Sorry, there is an error, please CHECK this auction again!");
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
