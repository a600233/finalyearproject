import "../css/app.css";

import {
  default as Web3
} from 'web3';//以太坊js接口
import {
  default as contract
} from 'truffle-contract'
import ecommerce_store_artifacts from '../../build/contracts/EcommerceStore.json'

var EcommerceStore = contract(ecommerce_store_artifacts);

const ipfsAPI = require('ipfs-api');
const ethUtil = require('ethereumjs-util');
//const mongo = "http://localhost:3000";
//const cate = ["Art","Books","Cameras","Cell Phones & Accessories","Clothing","Computers & Tablets","Gift Cards & Coupons","Musical Instruments & Gear","Pet Supplies","Pottery & Glass","Sporting Goods","Tickets","Toys & Hobbies","Video Games"];

const ipfs = ipfsAPI({
  host: 'localhost',
  port: '5001',
  protocol: 'http'
});

window.App = {
  start: function() {
    var self = this;

    EcommerceStore.setProvider(web3.currentProvider);//matemask当前协议
    renderStore();//渲染前端 把商品放到 主页。

    var reader;//图片读取器

    $("#product-image").change(function(event) {
      //onsole.log(test1); fortest
      const file = event.target.files[0]
      reader = new window.FileReader()//新建一个
      reader.readAsArrayBuffer(file)
      //此方法会按字节读取文件内容，并转换为ArrayBuffer对象。
//readAsArrayBuffer读取文件后，会在内存中创建一个ArrayBuffer对象（二进制缓冲区），
//将二进制数据存放在其中。通过此方式，可以直接在网络中传输二进制内容。
    });

$("#add-item-to-store").submit(function(event) {
      const req = $("#add-item-to-store").serialize();
      let params = JSON.parse('{"' + req.replace(/"/g, '\\"').replace(/&/g, '","').replace(/=/g, '":"') + '"}');
      let decodedParams = {}
      Object.keys(params).forEach(function(v) {
        decodedParams[v] = decodeURIComponent(decodeURI(params[v]));
      });
      saveProduct(reader, decodedParams);//保存图片和描述信息到
      event.preventDefault();
    });

    if ($("#product-details").length > 0) {
      console.log(window.location);
      console.log("Search Params = " + new URLSearchParams(window.location))
      let productId = new URLSearchParams(window.location.search).get('Id');
      console.log(productId);
      renderProductDetails(productId);
    }

    $("#finalize-auction").submit(function(event) {
      $("#msg").hide();
      let productId = $("#product-id").val();
      EcommerceStore.deployed().then(function(i) {
        i.finalizeAuction(parseInt(productId), {
          from: web3.eth.accounts[0]
        }).then(
          function(f) {
            $("#msg").show();
            $("#msg").html("The auction has been finalized and winner declared.");
            console.log(f)
            location.reload();
          }
        ).catch(function(e) {
          console.log(e);
          $("#msg").show();
          $("#msg").html("The auction can not be finalized by the buyer or seller, only a third party aribiter can finalize it");
        })
      });
      event.preventDefault();
    });


    $("#bidding").submit(function(event) {
      $("#msg").hide();//进行投标
      let amount = $("#bid-amount").val();
      let sendAmount = $("#bid-send-amount").val();
      let secretText = $("#secret-text").val();
      let sealedBid = '0x' + ethUtil.keccak256(web3.toWei(amount, 'ether') + secretText).toString('hex');
      let productId = $("#product-id").val();
      console.log(sealedBid + " for " + productId);
      EcommerceStore.deployed().then(function(i) {
        i.bid(parseInt(productId), sealedBid, {
          value: web3.toWei(sendAmount),
          from: web3.eth.accounts[0],
          gas:  666666
        }).then(
          function(f) {
            $("#msg").html("Your bid has been successfully submitted!");
            $("#msg").show();
            console.log(f)
          }
        )
      });
      event.preventDefault();
    });

    $("#revealing").submit(function(event) {
      $("#msg").hide();
      let amount = $("#actual-amount").val();
      let secretText = $("#reveal-secret-text").val();
      let productId = $("#product-id").val();
      EcommerceStore.deployed().then(function(i) {
        i.revealBid(parseInt(productId), web3.toWei(amount).toString(), secretText, {
          from: web3.eth.accounts[0],
          gas: 440000
        }).then(
          function(f) {
            $("#msg").show();
            $("#msg").html("Your bid has been successfully revealed!");
            console.log(f)
          }
        )
      });
      event.preventDefault();
    });

      /*  $("#release-funds").click(function() {
        let productId = new URLSearchParams(window.location.search).get('id');
        EcommerceStore.deployed().then(function(f) {
          $("#msg").html("Your transaction has been submitted. Please wait for few
          seconds for the confirmation").show();
          console.log(productId);
          f.releaseAmountToSeller(productId, {from: web3.eth.accounts[0], gas: 440000}).then(function(f) {
            console.log(f);
            location.reload();
          }).catch(function(e) {
            console.log(e);
          })
        });
      });*/
    $("#refund-funds").click(function() {
      let productId = new URLSearchParams(window.location.search).get('id');
      EcommerceStore.deployed().then(function(f) {
        $("#msg").html("Your transaction has been submitted. Please wait for fewseconds for the confirmation").show();
        f.refundAmountToBuyer(productId, {from: web3.eth.accounts[0], gas: 440000}).then(function(f) {
          console.log(f);
          location.reload();
        }).catch(function(e) {
          console.log(e);
        })
      });
      alert("refund the funds!");
    });
},
};


function renderProductDetails(productId) {
  EcommerceStore.deployed().then(function(i) {
    i.getProduct.call(productId).then(function(p) {
      console.log(p);
      let content = "";
      ipfs.cat(p[4]).then(function(stream) {
//读取图片哈希Utf8Array
        console.log(stream);

        stream.on('data', function(chunk) {
        // do stuff with this chunk of data
        content += chunk.toString();
        console.log(content);
        $("#product-desc").append("<div>" + content+ "</div>");
        })

      });

      $("#product-image").append("<img src='http://localhost:8082/ipfs/" + p[3] + "' width='250px' />");
      $("#product-price").html(displayPrice(p[7]));
      $("#product-name").html(p[1].name);
      $("#product-auction-end").html(displayEndHours(p[6]));
      $("#product-id").val(p[0]);
      $("#revealing, #bidding, #finalize-auction, #escrow-info").hide();
      let currentTime = getCurrentTimeInSeconds();
      if (parseInt(p[8]) == 1) {
        EcommerceStore.deployed().then(function(i) {
          $("#escrow-info").show();
          i.highestBidderInfo.call(productId).then(function(f) {
          /*  if (f[2].toLocaleString() == '0') {
              $("#product-status").html("Auction has ended. No bids were revealed");
            } else {

          }*/
          $("#product-status").html("Auction has ended. Product sold to " + f[0]+ " for " + displayPrice(f[2]) + "The money is in the escrow. Two of the three participants (Buyer, Seller and Arbiter) have to " +"either release the funds to seller or refund the money to the buyer");
        })
        i.escrowInfo.call(productId).then(function(f) {
          $("#buyer").html('Buyer: ' + f[0]);
          $("#seller").html('Seller: ' + f[1]);
          $("#arbiter").html('Arbiter: ' + f[2]);
          if(f[3] == true) {
            $("#release-count").html("Amount from the escrow has been released");
          } else {
            $("#release-count").html(f[4] + " of 3 participants have agreed to release funds");
            $("#refund-count").html(f[5] + " of 3 participants have agreed to refund the buyer");
          }
        });
      });//  $("#product-status").html("Product sold");
      } else if (parseInt(p[8]) == 2) {
        $("#product-status").html("Product was not sold");
      } else if (currentTime < parseInt(p[6])) {
        $("#bidding").show();//揭标还是竞标！！！！
      } else if (currentTime < (parseInt(p[6]) + 600)) {
        $("#revealing").show();
      } else {
        $("#finalize-auction").show();
      }
    });
  });
}

//引用方法
function Utf8ArrayToStr(array) {
  var out, i, len, c;
  var char2, char3;

  out = "";
  len = array.length;
  i = 0;
  while (i < len) {
    c = array[i++];
    switch (c >> 4) {
      case 0:
      case 1:
      case 2:
      case 3:
      case 4:
      case 5:
      case 6:
      case 7:
        // 0xxxxxxx
        out += String.fromCharCode(c);
        break;
      case 12:
      case 13:
        // 110x xxxx   10xx xxxx
        char2 = array[i++];
        out += String.fromCharCode(((c & 0x1F) << 6) | (char2 & 0x3F));
        break;
      case 14:
        // 1110 xxxx  10xx xxxx  10xx xxxx
        char2 = array[i++];
        char3 = array[i++];
        out += String.fromCharCode(((c & 0x0F) << 12) |
          ((char2 & 0x3F) << 6) |
          ((char3 & 0x3F) << 0));
        break;
      default:
        break;
    }
  }

  return out;
}

function utf82str(utf)
    {
        var str = "";
        var tmp;

        for(var i = 0; i < utf.length; i++)
        {
            // 英文字符集合
            if(utf.charCodeAt(i) >> 7 == 0x00)
            {
                str += utf.charAt(i);
                continue;
            }
            // 其他字符集
            else if(utf.charCodeAt(i) >> 5 == 0x06)
            {
                tmp = ((utf.charCodeAt(i + 0) & 0x1f) << 6) |
                      ((utf.charCodeAt(i + 1) & 0x3f) << 0);
                str += String.fromCharCode(tmp);
                i++;
                continue;
            }
            // 中文字符集
            else if(utf.charCodeAt(i) >> 4 == 0x0e)
            {
                tmp = ((utf.charCodeAt(i + 0) & 0x0f) << 12) |
                      ((utf.charCodeAt(i + 1) & 0x3f) <<  6) |
                      ((utf.charCodeAt(i + 2) & 0x3f) <<  0);
                str += String.fromCharCode(tmp);
                i += 2;
                continue;
            }
            // 其他字符集
            else if(utf.charCodeAt(i) >> 3 == 0x1f)
            {
                tmp = ((utf.charCodeAt(i + 0) & 0x07) << 18) |
                      ((utf.charCodeAt(i + 1) & 0x3f) << 12) |
                      ((utf.charCodeAt(i + 2) & 0x3f) <<  6);
                      ((utf.charCodeAt(i + 3) & 0x3f) <<  0);
                str += String.fromCharCode(tmp);
                i += 3;
                continue;
            }
            // 非法字符集
            else
            {
                throw "不是UTF-8字符集"
            }
        }

        return str;
    }


function getCurrentTimeInSeconds() {
  return Math.round(new Date() / 1000);//精确到秒
}

function displayPrice(amount) {
  return 'Ξ' + web3.fromWei(amount, 'ether');
}

//引用
function displayEndHours(seconds) {
  let current_time = getCurrentTimeInSeconds()
  let remaining_seconds = seconds - current_time;

  if (remaining_seconds <= 0) {
    return "Auction has finished";
  }

  let days = Math.trunc(remaining_seconds / (24 * 60 * 60));

  remaining_seconds -= days * 24 * 60 * 60
  let hours = Math.trunc(remaining_seconds / (60 * 60));

  remaining_seconds -= hours * 60 * 60

  let minutes = Math.trunc(remaining_seconds / 60);

  if (days > 0) {
    return "Auction will finish in " + days + " days, " + hours + ", hours, " + minutes + " minutes";
  } else if (hours > 0) {
    return "Auction will finish  in " + hours + " hours, " + minutes + " minutes ";
  } else if (minutes > 0) {
    return "Auction will finish  in " + minutes + " minutes ";
  } else {
    return "Auction will finish  in " + remaining_seconds + " seconds";
  }
}


function saveProduct(reader, decodedParams) {
  let imgHash, desHash;
  saveImageOnIpfs(reader).then(function(id) {
    imgHash = id;//存储到imghash
    saveTextBlobOnIpfs(decodedParams["product-description"]).then(function(id) {
      desHash = id;
      saveProductToBlockchain(decodedParams, imgHash, desHash);//覆盖之前描述信息和哈希
      console.log("successfully!");
    })
  })
}

function saveProductToBlockchain(params, imgHash, desHash) {
  console.log(params);
  let auctionStartTime = Date.parse(params["product-auction-start"]) / 1000;
  let auctionEndTime = auctionStartTime + parseInt(params["product-auction-end"]) * 24 * 60 * 60

//调用合约上传到区块链
  EcommerceStore.deployed().then(function(i) {
    i.addProductToStore(params["product-name"], params["product-category"], imgHash, desHash, auctionStartTime,
      auctionEndTime, web3.toWei(params["product-price"], 'ether'), parseInt(params["product-condition"]), {
        from: web3.eth.accounts[0],
        gas: 623164
      }).then(function(f) {
      console.log(f);
      $("#msg").show();
      $("#msg").html("Your item has been added successfully!");
    })
  });
}

function saveImageOnIpfs(reader) {
  return new Promise(function(resolve, reject) {
    const buffer = Buffer.from(reader.result);
    ipfs.add(buffer)
      .then((response) => {
        console.log(response)
        resolve(response[0].hash);
      }).catch((err) => {
        console.error(err)
        reject(err);
      })
  })
}

function saveTextBlobOnIpfs(blob) {
  return new Promise(function(resolve, reject) {
    const description = Buffer.from(blob, 'utf-8');
    ipfs.add(description)
      .then((response) => {
        console.log(response)
        console.log("successfully!")
        resolve(response[0].hash);
      }).catch((err) => {
        console.error(err)
        reject(err);
      })
  })
}

/*function renderProducts(div, filters) {
 $.ajax({
  url: mongo + "/products",
  type: 'get',
  contentType: "application/json; charset=utf-8",
  data: filters
 }).done(function(data) {
  if (data.length == 0) {
   $("#" + div).html('No products found');
  } else {
   $("#" + div).html('');
  }
  while(data.length > 0) {
   let chunks = data.splice(0, 4);
   let row = $("<div/>");
   row.addClass("row");
   chunks.forEach(function(value) {
    let node = buildProduct(value);
    row.append(node);
   })
   $("#" + div).append(row);
  }
 })
}*/

function renderStore() {
  EcommerceStore.deployed().then(function(i) { //调用合约
    i.getProduct(1).then(function(p) {
      $("#product-list").append(buildProduct(p, 1));
    });
    i.getProduct(2).then(function(p) {
      $("#product-list").append(buildProduct(p, 2));
    });
    i.getProduct(3).then(function(p) {
      $("#product-list").append(buildProduct(p, 3));
    });


  });
/*  renderProducts("product-list", {});
  renderProducts("product-reveal-list", {productStatus: "reveal"});
  renderProducts("product-finalize-list", {productStatus: "finalize"});
  cate.forEach(function(content) {
   $("#categories").append("<div>" + content + "");
 })*/
}

function buildProduct(product, id) {
  console.log("buildProduct");
  console.log(id);
  let node = $("<div/>");
  node.addClass("col-sm-3 text-center col-margin-bottom-1");
  node.append("<img src='http://localhost:8082/ipfs/" + product[3] + "' width='150px' />");
  console.log(product[3]);
  node.append("<div>" + product[1] + "</div>");
  node.append("<div>" + product[2] + "</div>");
  node.append("<div>" + new Date(product[5] * 1000) + "</div>");
  node.append("<div>" + new Date(product[6] * 1000) + "</div>");
  node.append("<div>Ether " + product[7] + "</div>");
  node.append("<a href='product.html?Id=" + id + "'class='btn btn-primary'>Show</a>")
  return node;
};



window.addEventListener('load', function() {

  if (typeof web3 !== 'undefined') {
    console.warn("Using web3 detected from external source. If you find that your accounts don't appear or you have 0 MetaCoin, ensure you've configured that source properly. If using MetaMask, see the following link. Feel free to delete this warning. :) http://truffleframework.com/tutorials/truffle-and-metamask")

    window.web3 = new Web3(web3.currentProvider);
  } else {
    console.warn("No web3 detected. Falling back to http://localhost:8545. You should remove this fallback when you deploy live, as it's inherently insecure. Consider switching to Metamask for development. More info here: http://truffleframework.com/tutorials/truffle-and-metamask");

    window.web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));
  }

  App.start();
});
