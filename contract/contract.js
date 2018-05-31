'use strict'
var Bidder = function(jsonStr) {
    if (jsonStr) {
        var obj = JSON.parse(jsonStr);
        this.address = obj.address;
        this.drawNo = obj.drawNo;
        this.idx = obj.idx;
    } 
}


Bidder.prototype = {
    toString: function() {
        return JSON.stringify(this);
    }
};

var BidderBoard = function() {
    LocalContractStorage.defineProperty(this, "balance"); 
    LocalContractStorage.defineProperty(this, "ownerAddress"); 
    LocalContractStorage.defineProperty(this, "counter");
    LocalContractStorage.defineMapProperty(this, "bidderMap",{
        parse:function(jsonText){
            return new Bidder(jsonText);
        },
        stringify:function(obj){
            return obj.toString();
        }
    });
};


BidderBoard.prototype = {
    init: function() {
        this.balance = new BigNumber(0);
        this.ownerAddress = Blockchain.transaction.from;
        this.counter = 0;
    },
    getOwnerAddress:function(){
        return this.ownerAddress;
    },
    getBalance:function(){
        return this.balance;
    },
    getCounter:function(){
        return this.counter;
    },
    getAll:function(){
        var list = [];
        for(var i=0;i<this.counter;i++){
            var bid = this.bidderMap.get(i);
            list.push(bid);
        }
        return list;
    },
    _nextCounter:function(){
        return this.counter +1;
    },
    _random: function(txHash) {
        var sum = 0;

        for (var i = 0; i < txHash.length; i++) {
            sum += txHash.charCodeAt(i);
        }
        var rnd = parseInt(sum.toString().slice(-1), 10); //取tx has的h每个字母ASCII码，加和，取最后一位数字作为随机的中奖码(0-9)
        return rnd;
    },
    draw:function(){
        var address = Blockchain.transaction.from;
        
        var value = Blockchain.transaction.value;
        var minValue = new BigNumber(1000000000000000);
        if (value.lt(minValue)) {
            throw new Error("扭蛋额应该大于 0.01 NAS之间");
        }
        var hash = Blockchain.transaction.hash;
        var drawNo = this._random(hash);
        var balance = this.balance;
        var newBalance = value.plus(balance);
        this.balance = newBalance;
        
        var bidder = new Bidder();

        bidder.address = address;
        bidder.drawNo = drawNo;
        bidder.idx = this.counter;

        this.counter = this._nextCounter();
        
        this.bidderMap.put(bidder.idx,bidder);

        return 'success';

    },
    getMine:function(){
        var address = Blockchain.transaction.from;
        var list = [];
        for(var i=0;i<this.counter;i++){
            var bid = this.bidderMap.get(i);
            if(!bid) return;
            if(bid.address == address){
                list.push(bid);
            }
        }
        return list;
    },
        //提现
    withdraw: function() {
        if (Blockchain.transaction.from != this.ownerAddress) {
            throw new Error("Permission denied.");
        }

        var result = Blockchain.transfer(this.ownerAddress, this.balance);
        if (!result) {
            throw new Error("Withdraw failed. Address:" + this.ownerAddress + ", NAS:" + this.balance);
        }
        return 'success';
    },
}

module.exports = BidderBoard;