var web3;
var eth;
var squiggleIds;
var squiggleValues;
var accs;
var ethBalance;
var squiggles;

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
var coloredSquiggleCheckbox = document.getElementById('colored-squiggle');
var animatedSquiggleCheckbox = document.getElementById('animated-squiggle');
var currAccountDiv = document.getElementById('curr-account-div');

var squiggleTokenContract;
var squiggleToken;
var squiggleContractOwner;
var defaultAccountIndex;
var defaultAccount;
var contractLoaded;
var selectedSquiggle;
var useColor;
var animated;

var getXYIncrement = function(dir) {
    var xyIncrement = new Object();
    switch (dir) {
        case 0: // Down-Right
            xyIncrement.x = 1;
            xyIncrement.y = -1;
            break;
        case 1:  // Right
            xyIncrement.x = 1;
            xyIncrement.y = 0;
            break;
        case 2:  // Up-Right
            xyIncrement.x = 1;
            xyIncrement.y = 1;
            break;
        case 3:  // Up
            xyIncrement.x = 0;
            xyIncrement.y = 1;
            break;
        case 4: // Up-Left
            xyIncrement.x = -1;
            xyIncrement.y = 1;
            break;
        case 5: // Left
            xyIncrement.x = -1;
            xyIncrement.y = 0;
            break;
        case 6: // Down-Left
            xyIncrement.x = -1;
            xyIncrement.y = -1;
            break;
        case 7: // Down
            xyIncrement.x = 0;
            xyIncrement.y = -1;
            break;
    }
    return xyIncrement;
}

var renderSquiggle = async function(squiggleValue) {
    // TODO: create your own rendering idea
    var c = document.getElementById("myCanvas");
    var ctx = c.getContext("2d");
    var currX = (c.width / 2) | 0;
    var currY = (c.height / 2) | 0;
    var nextX, nextY;
    if (!squiggleValue) {
        return;
    }
    var moveList = [];
    var range = new Object();
    range.minX = currX;
    range.minY = currY;
    range.maxX = currX;
    range.maxY = currY;
    do {
        var dir = squiggleValue.modulo(8);
        squiggleValue = squiggleValue.dividedToIntegerBy(8);

        var xyIncrement = getXYIncrement(dir.toNumber());
        moveList.push(xyIncrement);
        nextX = currX + xyIncrement.x;
        nextY = currY + xyIncrement.y;

        range.minX = (range.minX > nextX) ? nextX : range.minX;
        range.minY = (range.minY > nextY) ? nextY : range.minY;
        range.maxX = (range.maxX < nextX) ? nextX : range.maxX;
        range.maxY = (range.maxY < nextY) ? nextY : range.maxY;

        currX = nextX;
        currY = nextY;
    } while(squiggleValue > 8);

    ctx.clearRect(0, 0, c.width, c.height);
    var currX = (c.width / 2) | 0;
    var currY = (c.height / 2) | 0;
    var biggestChange = Math.max(range.maxX - range.minX, range.maxY - range.minY);
    var increment = ((c.width / biggestChange) | 0) - 1;
    var xChange = (currX - ((range.maxX + range.minX) / 2)) * increment;
    var yChange = (currY - ((range.maxY + range.minY) / 2)) * increment;
    for (var i = 0; i < moveList.length; ++i) {
        ctx.beginPath();
        ctx.moveTo(currX + xChange, currY + yChange);

        nextX = currX + moveList[i].x * increment;
        nextY = currY + moveList[i].y * increment;

        ctx.lineTo(nextX + xChange, nextY + yChange);
        currX = nextX;
        currY = nextY;
        if (useColor) {
            red   = (Math.sin(0.0117647059*5*(i) + 0) * 127 + 128) | 0;
            green = (Math.sin(0.0117647059*5*(i) + 2) * 127 + 128) | 0;
            blue  = (Math.sin(0.0117647059*5*(i) + 4) * 127 + 128) | 0;
            while (red.length < 2) { red = '0' + red; }
            while (green.length < 2) { green = '0' + green; }
            while (blue.length < 2) { blue = '0' + blue; }
            var str = red.toString(16) + green.toString(16) + blue.toString(16);
            ctx.strokeStyle="#" + str;
        } else {
            ctx.strokeStyle="#000000";
        }
        ctx.stroke();
        if (animated) {
            await sleepFor(10);
        }
    }
};

var sleepFor = function(millis) {
    return new Promise(function(resolve, reject) {
        setTimeout(function() {
            resolve(true);
        }, millis);
    });
}

var padWithZeroes = function(number, length) {
    var my_string = '' + number;
    while (my_string.length < length) {
        my_string = '0' + my_string;
    }

    return my_string;
}

var setOptions = function(contract, from, gasPrice, gas) {
    contract.options.from = from;
    contract.options.gasPrice = gasPrice;
    contract.options.gas = gas;
};

var chooseSquiggle = function(index) {
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
};

var getSquiggleBalance = function(account) {
    return new Promise(function(resolve, reject) {
        squiggleToken.balanceOf(account, function(err, bal) {
            if (!err) {
                resolve(bal);
            } else {
                console.log(err);
                reject(err);
            }
        });
    });
}

var getEthBalance = function(account) {
    return new Promise(function(resolve, reject) {
        eth.getBalance(account, function(err, bal) {
            if (!err) {
                resolve(bal);
            } else {
                console.log(err);
                reject(err);
            }
        });
    });
}

var updateAccounts = async function(selectLastSquiggle) {
    for (var i = 0; i < eth.accounts.length; ++i) {
        var acctSpan = document.getElementById(`account-${i}`);
        var outputSpan = document.getElementById(`account-output-${i}`);
        var ethBalanceSpan = document.getElementById(`eth-balance-${i}`);
        var currAccount = eth.accounts[i];
        var bal = await getSquiggleBalance(currAccount);
        if (currAccount === squiggleContractOwner) {
            outputSpan.innerText = `Owner Squiggles: ${bal}`;
        } else {
            outputSpan.innerText = `Squiggles: ${bal}`;
        }
        var ethBal = await getEthBalance(currAccount);
        ethBalanceSpan.innerText = ethBal.dividedBy(1000000000000000000).toString(10);

        acctSpan.style.fontWeight = currAccount === defaultAccount ? 'bold' : 'normal';
        outputSpan.style.fontWeight = currAccount === defaultAccount ? 'bold' : 'normal';
        ethBalanceSpan.style.fontWeight = currAccount === defaultAccount ? 'bold' : 'normal';
    }

    if (defaultAccount === squiggleContractOwner) {
        divCreateInfo.style.display = 'block';
    } else {
        divCreateInfo.style.display = 'none';
    }

    divSquigglesList.innerHTML = '';
    squiggleToken.tokensOfOwner(defaultAccount, function(err, res) {
        if (!err) {
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
                    if (index === (selectLastSquiggle ? squiggleIds.length - 1 : 0)) {
                        chooseSquiggle(index);
                    }
                    rowDiv.appendChild(squiggleIds[index]);
                    rowDiv.appendChild(squiggleValues[index]);
                    divSquigglesList.appendChild(rowDiv);
                });
            }
        } else {
            console.log(err);
        }
    });
}

// Account management functions
var setDefaultAccountIndex = function(index) {
    if (index < 0) {
        index = 0;
    }
    if (index >= web3.eth.accounts.length) {
        index = web3.eth.accounts.length - 1;
    }
    defaultAccountIndex = index;
    if (defaultAccount === web3.eth.accounts[defaultAccountIndex]) {
        return;
    }
    initializeUI();
    defaultAccount = web3.eth.accounts[defaultAccountIndex];
    eth.defaultAccount = defaultAccount;
    if (contractLoaded) {
        updateAccounts();
    }
    spanCurrAccountAddress.innerText = defaultAccount;
}
var setAccountToAddress = function(address) {
    if (defaultAccount !== address) {
        setDefaultAccountIndex(web3.eth.accounts.indexOf(address));
    }
}
var toggleDefaultAccountIndex = function() {
    setDefaultAccountIndex((defaultAccountIndex + 1) % web3.eth.accounts.length);
}

// Contract function
var loadSquiggleTokenContract = function(callback) {
    var squiggleTokenContract = web3.eth.contract([{"constant":false,"inputs":[{"name":"_to","type":"address"},{"name":"_tokenId","type":"uint256"}],"name":"approve","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"_to","type":"address"}],"name":"createRandomSquiggle","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[],"name":"renounceOwnership","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"_to","type":"address"},{"name":"_tokenId","type":"uint256"}],"name":"transfer","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"_from","type":"address"},{"name":"_to","type":"address"},{"name":"_tokenId","type":"uint256"}],"name":"transferFrom","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"newOwner","type":"address"}],"name":"transferOwnership","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"inputs":[],"payable":false,"stateMutability":"nonpayable","type":"constructor"},{"payable":true,"stateMutability":"payable","type":"fallback"},{"anonymous":false,"inputs":[{"indexed":true,"name":"previousOwner","type":"address"},{"indexed":true,"name":"newOwner","type":"address"}],"name":"OwnershipTransferred","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"_from","type":"address"},{"indexed":true,"name":"_to","type":"address"},{"indexed":false,"name":"_tokenId","type":"uint256"}],"name":"Transfer","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"_owner","type":"address"},{"indexed":true,"name":"_approved","type":"address"},{"indexed":false,"name":"_tokenId","type":"uint256"}],"name":"Approval","type":"event"},{"constant":true,"inputs":[{"name":"_owner","type":"address"}],"name":"balanceOf","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"_tokenId","type":"uint256"}],"name":"getSquiggle","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"_tokenId","type":"uint256"}],"name":"indexOf","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"isOwner","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"name","outputs":[{"name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"owner","outputs":[{"name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"_tokenId","type":"uint256"}],"name":"ownerOf","outputs":[{"name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"symbol","outputs":[{"name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"_owner","type":"address"}],"name":"tokensOfOwner","outputs":[{"name":"","type":"uint256[]"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"totalSupply","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"}]);
    // TODO: update this with the correct squiggle token address
    squiggleToken = squiggleTokenContract.at('0x733ef43c99d8369c8b0ff2f42b3928ac1162f035');
    squiggleToken.owner(function(err, res) {
        squiggleContractOwner = res;
        setAccountToAddress(squiggleContractOwner);
        contractLoaded = true;
        callback(undefined, squiggleToken);
    });
};

var initializeUI = function() {
    spanCurrAccountAddress.innerText = defaultAccount;
    divAccountsList.innerText = "";
    var headerRowDiv = document.createElement('tr');
    var headerDiv1 = document.createElement('th');
    headerDiv1.innerText = "Account Address";
    var headerDiv2 = document.createElement('th');
    headerDiv2.innerText = "ETH Balance";
    var headerDiv3 = document.createElement('th');
    headerDiv3.innerText = "SQGL Balance";
    headerRowDiv.appendChild(headerDiv1);
    headerRowDiv.appendChild(headerDiv2);
    headerRowDiv.appendChild(headerDiv3);
    divAccountsList.appendChild(headerRowDiv);
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
}

// Initialize and onload functions
var initialize = function(provider) {
    web3 = new Web3(provider);
    eth = web3.eth;
    squiggleIds = [];
    squiggleValues = [];
    accs = [];
    ethBalance = [];
    squiggles = [];
    contractLoaded = false;
    useColor = false;
    animated = false;
    setDefaultAccountIndex(0);
    loadSquiggleTokenContract(function(e, contract) {
        if (typeof contract.address !== 'undefined') {
             console.log(`Contract found! address: ${contract.address} transactionHash: ${contract.transactionHash}`);
        }
        updateAccounts();
    });
}

window.addEventListener('load', async () => {
    // Modern dapp browsers...
    if (window.ethereum) {
        try {
            // Request account access if needed
            await ethereum.enable();
            currAccountDiv.style.display = 'none';
            initialize(ethereum);
            setInterval(function() {
                setDefaultAccountIndex(0);
            }, 1000);
        } catch (error) {
            // User denied account access...
        }
    }
    // Legacy dapp browsers...
    else if (window.web3) {
        initialize(web3.currentProvider);
    }
    // Non-dapp browsers...
    else {
        currAccountDiv.style.display = 'block';
        initialize(new Web3.providers.HttpProvider('http://localhost:7545'));
    }
});

// Button Click Functions
btnUpdate.addEventListener('click', function() {
    updateAccounts();
});

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

    squiggleToken.transfer(accountToTransferTo, id, { "from": defaultAccount, "gasPrice": 1000000000, "gas": 967000}, function(err, res) {
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
    squiggleToken.createRandomSquiggle(inputCreateAddress.value, { "from": defaultAccount, "gasPrice": 1000000000, "gas": 257637}, function(err, res) {
        if (!err) {
            if (inputCreateAddress.value === defaultAccount) {
                updateAccounts(true);
            } else {
                alert("Squiggle Created!");
                updateAccounts(false);
            }
        } else {
            console.log(err);
        }
    });
});

coloredSquiggleCheckbox.addEventListener('click', function() {
    useColor = coloredSquiggleCheckbox.checked;
    chooseSquiggle(selectedSquiggle);
});

animatedSquiggleCheckbox.addEventListener('click', function() {
    animated = animatedSquiggleCheckbox.checked;
    chooseSquiggle(selectedSquiggle);
});
