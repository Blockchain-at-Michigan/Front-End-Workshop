var web3 = new Web3(new Web3.providers.HttpProvider('http://localhost:7545'));
console.log(web3);
var eth = web3.eth;

var spanCurrAccountAddress = document.getElementById('curr-account');
var divAccountsList = document.getElementById('accounts-list');
var divSquigglesList = document.getElementById('squiggles-list');
var divCreateInfo = document.getElementById('create-info');
var divSquiggleRendering = document.getElementById('squiggle-rendering');
var inputCreateAddress = document.getElementById('create-address');
var btnUpdate = document.getElementById('btnUpdate');
var btnToggle = document.getElementById('btnToggle');
var btnOwner = document.getElementById('btnOwner');
var btnTransfer = document.getElementById('btnTransfer');
var btnCreateSquiggle = document.getElementById('btnCreateSquiggle');
var accountToTransfer = document.getElementById('transfer-account');

var squiggleTokenContract;
var squiggleToken;
var squiggleContractOwner;
var defaultAccountIndex;
var defaultAccount;
var contractLoaded = false;
var selectedSquiggle;

renderSquiggle = function(squiggleValue) {
    var c = document.getElementById("myCanvas");
    var ctx = c.getContext("2d");
    var currX = (c.width / 2) | 0;
    var currY = (c.height / 2) | 0;
    var nextX, nextY;
    var increment = 10;
    ctx.clearRect(0, 0, c.width, c.height);
    if (!squiggleValue) {
        return;
    }
    ctx.beginPath();
    do {
        ctx.moveTo(currX, currY);
        var dir = squiggleValue.modulo(8);
        squiggleValue = squiggleValue.dividedToIntegerBy(8);
        switch (dir.toNumber()) {
            case 0:
                nextX = currX + increment;
                nextY = currY - increment;
                break;
            case 1:
                nextX = currX + increment;
                nextY = currY;
                break;
            case 2:
                nextX = currX + increment;
                nextY = currY + increment;
                break;
            case 3:
                nextX = currX;
                nextY = currY + increment;
                break;
            case 4:
                nextX = currX - increment;
                nextY = currY + increment;
                break;
            case 5:
                nextX = currX - increment;
                nextY = currY;
                break;
            case 6:
                nextX = currX - increment;
                nextY = currY - increment;
                break;
            case 7:
                nextX = currX;
                nextY = currY - increment;
                break;
        }
        ctx.lineTo(nextX, nextY);
        currX = nextX;
        currY = nextY;
    } while(squiggleValue > 8);
    ctx.stroke();
}

var accs = [];
var ethBalance = [];
var squiggles = [];
for (var i = 0; i < eth.accounts.length; ++i) {
    const currIndex = i;
    var acc = eth.accounts[currIndex];
    var rowDiv = document.createElement('tr');
    accs.push(document.createElement('td'));
    accs[currIndex].id = `account-${currIndex}`;
    accs[currIndex].innerText = acc;
    accs[currIndex].className = 'account';
    accs[currIndex].draggable = true;
    accs[currIndex].addEventListener('click', function() {
        setAccountToAddress(this.innerText);
    });
    accs[currIndex].addEventListener('dragstart', function(e) {
        e.dataTransfer.setData('text/plain', this.innerText);
    });
    ethBalance.push(document.createElement('td'));
    ethBalance[currIndex].className = 'eth-balance';
    ethBalance[currIndex].id = `eth-balance-${currIndex}`;
    ethBalance[currIndex].addEventListener('click', function() {
        setAccountToAddress(accs[currIndex].innerText);
    });
    squiggles.push(document.createElement('td'));
    squiggles[currIndex].className = 'balance-output';
    squiggles[currIndex].id = `account-output-${currIndex}`;
    squiggles[currIndex].addEventListener('click', function() {
        setAccountToAddress(squiggles[currIndex].innerText);
    });
    rowDiv.appendChild(accs[i]);
    rowDiv.appendChild(ethBalance[i]);
    rowDiv.appendChild(squiggles[i]);
    divAccountsList.appendChild(rowDiv);
}

setOptions = function(contract, from, gasPrice, gas) {
    contract.options.from = from;
    contract.options.gasPrice = gasPrice;
    contract.options.gas = gas;
}

var squiggleIds = [];
var squiggleValues = [];
chooseSquiggle = function(index) {
    if (index >= 0) {
        selectedSquiggle = index;
        renderSquiggle(squiggleValues[index].tag);
        squiggleIds.forEach(function(squiggleId, i) {
            squiggleId.style.fontWeight = index === i ? 'bold' : 'normal';
        });
        squiggleValues.forEach(function(squiggleValue, i) {
            squiggleValue.style.fontWeight = index === i ? 'bold' : 'normal';
        });
    } else {
        renderSquiggle(undefined);
    }
}

updateAccounts = function() {
    for (var i = 0; i < eth.accounts.length; ++i) {
        var acctSpan = document.getElementById(`account-${i}`);
        var outputSpan = document.getElementById(`account-output-${i}`);
        var ethBalanceSpan = document.getElementById(`eth-balance-${i}`);
        var bal = new BigNumber(squiggleToken.balanceOf(eth.accounts[i]));
        if (eth.accounts[i] === squiggleContractOwner) {
            outputSpan.innerText = `Owner Squiggles: ${bal}`;
        } else {
            outputSpan.innerText = `Squiggles: ${bal}`;
        }
        var ethBal = eth.getBalance(eth.accounts[i]);
        ethBalanceSpan.innerText = ethBal.dividedBy(1000000000000000000).toString(10);

        acctSpan.style.fontWeight = eth.accounts[i] === defaultAccount ? 'bold' : 'normal';
        outputSpan.style.fontWeight = eth.accounts[i] === defaultAccount ? 'bold' : 'normal';
        ethBalanceSpan.style.fontWeight = eth.accounts[i] === defaultAccount ? 'bold' : 'normal';
    }

    if (defaultAccount === squiggleContractOwner) {
        divCreateInfo.style.visibility = 'visible';
    } else {
        divCreateInfo.style.visibility = 'hidden';
    }

    divSquigglesList.innerHTML = '';
    squiggleToken.tokensOfOwner(defaultAccount, function(err, res) {
        if (res.length > 0) {
            if ((selectedSquiggle === undefined || selectedSquiggle >= res.length)) {
                selectedSquiggle = 0;
            }
            var headerRow = document.createElement('tr');
            var header1 = document.createElement('th');
            header1.innerText = 'Squiggle Id';
            var header2 = document.createElement('th');
            header2.innerText = 'Squiggle Value';
            header2.className = 'squiggle-value';
            headerRow.appendChild(header1);
            headerRow.appendChild(header2);
            divSquigglesList.appendChild(headerRow);
            divSquiggleRendering.style.visibility = 'visible';
        } else {
            chooseSquiggle(-1);
            divSquigglesList.innerText = 'No Squiggles Owned!';
            divSquiggleRendering.style.visibility = 'hidden';
        }
        for (var i = 0; i < res.length; ++i) {
            const squiggleId = web3.toBigNumber(res[i]);
            const index = i;
            squiggleToken.getSquiggle(squiggleId.toNumber(), function(err, res2) {
                var squiggleValue = new BigNumber(res2);
                var rowDiv = document.createElement('tr');
                squiggleIds[index] = document.createElement('td');
                squiggleIds[index].innerText = squiggleId.toNumber();
                squiggleIds[index].classList.add('clickable');
                squiggleIds[index].draggable = true;
                squiggleValues[index] = document.createElement('td');
                squiggleValues[index].innerText = squiggleValue.toString(10);
                squiggleValues[index].tag = squiggleValue;
                squiggleValues[index].draggable = true;
                squiggleValues[index].className = 'squiggle-value';
                squiggleIds[index].addEventListener('click', function() {
                    chooseSquiggle(index);
                });
                squiggleIds[index].addEventListener('dragstart', function(e) {
                    e.dataTransfer.setData('text/plain', `${squiggleId.toNumber()}`);
                });
                squiggleValues[index].addEventListener('click', function() {
                    chooseSquiggle(index);
                });
                squiggleValues[index].addEventListener('dragstart', function(e) {
                    e.dataTransfer.setData('text/plain', `${squiggleId.toNumber()}`);
                });
                if (index === 0) {
                    chooseSquiggle(0);
                }
                rowDiv.appendChild(squiggleIds[index]);
                rowDiv.appendChild(squiggleValues[index]);
                divSquigglesList.appendChild(rowDiv);
            });
        }
    });
}

setDefaultAccountIndex = function(index) {
    if (index < 0) {
        index = 0;
    }
    if (index >= web3.eth.accounts.length) {
        index = web3.eth.accounts.length - 1;
    }
    defaultAccountIndex = index;
    defaultAccount = web3.eth.accounts[defaultAccountIndex];
    eth.defaultAccount = defaultAccount;
    if (contractLoaded) {
        updateAccounts();
    }
    spanCurrAccountAddress.innerText = defaultAccount;
}
setAccountToAddress = function(address) {
    if (defaultAccount !== address) {
        setDefaultAccountIndex(web3.eth.accounts.indexOf(address));
    }
}
toggleDefaultAccountIndex = function() {
    setDefaultAccountIndex((defaultAccountIndex + 1) % web3.eth.accounts.length);
}
setDefaultAccountIndex(0);

loadSquiggleTokenContract = function(callback) {
    var squiggleTokenContract = web3.eth.contract([{"constant":true,"inputs":[],"name":"name","outputs":[{"name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"_to","type":"address"},{"name":"_tokenId","type":"uint256"}],"name":"approve","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"_to","type":"address"}],"name":"createRandomSquiggle","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"totalSupply","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"_from","type":"address"},{"name":"_to","type":"address"},{"name":"_tokenId","type":"uint256"}],"name":"transferFrom","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[{"name":"_tokenId","type":"uint256"}],"name":"ownerOf","outputs":[{"name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"_owner","type":"address"}],"name":"balanceOf","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[],"name":"renounceOwnership","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[{"name":"_owner","type":"address"}],"name":"tokensOfOwner","outputs":[{"name":"","type":"uint256[]"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"owner","outputs":[{"name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"isOwner","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"_tokenId","type":"uint256"}],"name":"indexOf","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"symbol","outputs":[{"name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"_to","type":"address"},{"name":"_tokenId","type":"uint256"}],"name":"transfer","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[{"name":"_tokenId","type":"uint256"}],"name":"getSquiggle","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"newOwner","type":"address"}],"name":"transferOwnership","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"inputs":[],"payable":false,"stateMutability":"nonpayable","type":"constructor"},{"payable":true,"stateMutability":"payable","type":"fallback"},{"anonymous":false,"inputs":[{"indexed":true,"name":"previousOwner","type":"address"},{"indexed":true,"name":"newOwner","type":"address"}],"name":"OwnershipTransferred","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"_from","type":"address"},{"indexed":true,"name":"_to","type":"address"},{"indexed":false,"name":"_tokenId","type":"uint256"}],"name":"Transfer","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"_owner","type":"address"},{"indexed":true,"name":"_approved","type":"address"},{"indexed":false,"name":"_tokenId","type":"uint256"}],"name":"Approval","type":"event"}]);
    squiggleToken = squiggleTokenContract.at('0xAB31626f5320bA65590728F69dF384a7CD465dB1');
    squiggleToken.owner(function(err, res) {
        squiggleContractOwner = res;
        setAccountToAddress(squiggleContractOwner);
        contractLoaded = true;
        callback(undefined, squiggleToken);
    });
};

loadSquiggleTokenContract(function(e, contract) {
    if (typeof contract.address !== 'undefined') {
         console.log(`Contract found! address: ${contract.address} transactionHash: ${contract.transactionHash}`);
    }
    updateAccounts();
});

btnUpdate.addEventListener('click', function() {
    updateAccounts();
});

spanCurrAccountAddress.innerText = defaultAccount;
btnToggle.addEventListener('click', function() {
    toggleDefaultAccountIndex();
});
btnOwner.addEventListener('click', function() {
    setAccountToAddress(squiggleContractOwner);
});

btnTransfer.addEventListener('click', function() {
    var accountToTransferTo = accountToTransfer.value;
    var idToTransfer = document.getElementById('transfer-id')
    var id = idToTransfer.value;

    squiggleToken.transfer(accountToTransferTo, id, {"from": defaultAccount, "gasPrice": 100000, "gas": 967000}, function(err, res) {
        if (!err) {
            accountToTransfer.value = '';
            idToTransfer.value = '';
            updateAccounts();
        } else {
            console.log(err);
        }
    });
});

btnCreateSquiggle.addEventListener('click', function() {
    squiggleToken.createRandomSquiggle(inputCreateAddress.value, {"from": defaultAccount, "gasPrice": 100000, "gas": 137637}, function() {
        updateAccounts();
    });
});
