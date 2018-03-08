var fs = require('fs');

const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 8484 });

const dirty = require('dirty');
var identitiesDB = dirty('identities.db');

var Web3 = require('web3');

var settings = require('./settings.js');

var web3 = new Web3(settings.host);

// Function to broadcast messages to all websocket clients
wss.broadcast = function broadcast(data) {
    wss.clients.forEach(function each(client) {
        if (client.readyState === WebSocket.OPEN) {
            client.send(data);
        }
    });
};

// When a new websocket client connects...
wss.on('connection', function connection(ws) {

    // ignore errors (dropped connections)
    ws.on('error', function(error) {
        // do nothing
    });

    // receive events from websocket client
    ws.on('message', function incoming(message) {
        const event = JSON.parse(message);

        switch (event.eventName) {
            case 'getBalance':
                getBalance(ws, event.eventData.address);
                break;
            case 'sendEther':
                sendEther(
                    ws,
                    event.eventData.from,
                    event.eventData.to,
                    event.eventData.amount
                );
                break;
            case 'addAccount':
                addAccount(ws, event.eventData.privateKey);
                break;
            case 'createAccount':
                createAccount(ws);
                break;
            case 'deployToken':
                deployToken(
                    ws,
                    event.eventData.creatorAddress,
                    event.eventData.tokenName,
                    event.eventData.totalSupply
                );
                break;
            case 'getTokenName':
                getTokenName(ws, event.eventData.address);
                break;
            case 'getTokenTotalSupply':
                getTokenTotalSupply(ws, event.eventData.address);
                break;
            case 'getTokenBalanceOf':
                getTokenBalanceOf(
                    ws,
                    event.eventData.tokenAddress,
                    event.eventData.ownerAddress
                );
                break;
            case 'deployIdentity':
            deployIdentity(
                    ws,
                    event.eventData.creatorAddress
                );
                break;
            case 'setIdentityAttribute':
            setIdentityAttribute(
                    ws,
                    event.eventData.ownerAddress,
                    event.eventData.identityAddress,
                    event.eventData.attributeName,
                    event.eventData.attributeValue,
                );
                break;
            case 'getIdentityAttribute':
            getIdentityAttribute(
                    ws,
                    event.eventData.identityAddress,
                    event.eventData.attributeName
                );
                break;
            case 'validateIdentityAttribute':
            validateIdentityAttribute(
                    ws,
                    event.eventData.ownerAddress,
                    event.eventData.identityAddress,
                    event.eventData.attributeName,
                    event.eventData.validatorAddress
                );
                break;
        }

    });

});

getBalance = function(ws, address) {
    web3.eth.getBalance(address).then((balance) => {
        
        const message = JSON.stringify({
            eventName: 'balance',
            eventData: {
                address: address,
                balance: balance
            }
        });
    
        ws.send(message);
    });
}

sendEther = async function(ws, from, to, value) {
    const localIdentity = identitiesDB.get(from);

    const trx = {
        from: from,
        to: to,
        chainId: settings.chainId,
        value: value,
        gas: 210000
    };

    var receipt = await web3.eth.accounts.signTransaction(trx, localIdentity.privateKey)
    .then((sgnTrx) => {
        return web3.eth.sendSignedTransaction(sgnTrx.rawTransaction);
    }).then((result) => {
        return result;
    }).catch((error) => {
        throw new Error(error);
    });

    const message = JSON.stringify({
        eventName: 'receipt',
        eventData: {
            receipt: receipt
        }
    });

    ws.send(message);

    getBalance(ws, from);
}

addAccount = function(ws, privateKey) {
    const identity = web3.eth.accounts.privateKeyToAccount(privateKey);
    newAccount(ws, identity);
}

createAccount = function(ws) {
    const identity = web3.eth.accounts.create();
    newAccount(ws, identity);
}

newAccount = function(ws, identity) {
    identitiesDB.set(identity.address, {
        'address': identity.address,
        'privateKey': identity.privateKey
    });
    
    const message = JSON.stringify({
        eventName: 'newAccount',
        eventData: {
            address: identity.address
        }
    });

    ws.send(message);
}

getContractData = function(file, name) {
    var body = fs.readFileSync(file, 'ucs2')
    body = body.replace(/^\uFEFF/, ''); // strip bom
    const obj = JSON.parse(body);
    return {
        abi: JSON.parse(obj.contracts[name].abi),
        bin: '0x' + obj.contracts[name].bin
    }
}

getERC20Contract = function(address = null) {
    const contractData = getContractData('ERC20.json', 'ERC20.sol:ERC20');
    
    contractData.contract = new web3.eth.Contract(contractData.abi, address, null);

    return contractData;
}

deployToken = async function(ws, creatorAddress, tokenName, totalSupply) {
    const localIdentity = identitiesDB.get(creatorAddress);

    const contractData = getERC20Contract();

    const deploy = contractData.contract.deploy({
        data: contractData.bin,
        arguments: [tokenName, parseInt(totalSupply)]
    });
    
    const trx = {
      // nonce: this.vault.getNonce(),
      chainId: settings.chainId,
      gas: 3000000,
      data: deploy._deployData
    };

    const receipt = await web3.eth.accounts.signTransaction(trx, localIdentity.privateKey)
    .then((sgnTrx) => {
        return web3.eth.sendSignedTransaction(sgnTrx.rawTransaction);
    }).then((receipt) => {
        return receipt;
    }).catch((error) => {
        throw new Error(error);
    });

    console.log(receipt);

    const message = JSON.stringify({
        eventName: 'tokenDeployed',
        eventData: {
            address: receipt.contractAddress
        }
    });

    ws.send(message);
}

getTokenName = async function(ws, tokenAddress) {
    const contractData = getERC20Contract(tokenAddress);
    contractData.contract.methods.getName().call()
    .then((name) => {
        console.log(name);
    });
}

getTokenTotalSupply = async function(ws, tokenAddress) {
    const contractData = getERC20Contract(tokenAddress);
    contractData.contract.methods.totalSupply().call()
    .then((totalSupply) => {
        console.log(totalSupply);
    });
}

getTokenBalanceOf = async function(ws, tokenAddress, ownerAddress) {
    console.log('getTokenBalanceOf');
    const contractData = getERC20Contract(tokenAddress);
    contractData.contract.methods.balanceOf(ownerAddress).call()
    .then((balance) => {
        console.log(balance);
    });
}

getIdentityContract = function(address = null) {
    const contractData = getContractData('identity.json', 'identity.sol:Identity');
    
    contractData.contract = new web3.eth.Contract(contractData.abi, address, null);

    return contractData;
}

deployIdentity = async function(ws, creatorAddress) {
    const localIdentity = identitiesDB.get(creatorAddress);

    const contractData = getIdentityContract();

    const deploy = contractData.contract.deploy({data: contractData.bin});

    const trx = {
      // nonce: this.vault.getNonce(),
      chainId: settings.chainId,
      gas: 3000000,
      data: deploy._deployData
    };

    const receipt = await web3.eth.accounts.signTransaction(trx, localIdentity.privateKey)
    .then((sgnTrx) => {
        return web3.eth.sendSignedTransaction(sgnTrx.rawTransaction);
    }).then((receipt) => {
        return receipt;
    }).catch((error) => {
        throw new Error(error);
    });

    const message = JSON.stringify({
        eventName: 'identityDeployed',
        eventData: {
            address: receipt.contractAddress
        }
    });

    ws.send(message);
}

setIdentityAttribute = async function(ws, ownerAddress, identityAddress, attributeName, attributeValue) {
    const localIdentity = identitiesDB.get(ownerAddress);

    const contractData = getIdentityContract(identityAddress);

    const trx = {
        // nonce: this.vault.getNonce(),
        to: identityAddress,
        chainId: settings.chainId,
        gas: 3000000,
        data: contractData.contract.methods.setAttribute(
            attributeName,
            attributeValue
        ).encodeABI()
    };

    const receipt = await web3.eth.accounts.signTransaction(trx, localIdentity.privateKey)
    .then((sgnTrx) => {
        return web3.eth.sendSignedTransaction(sgnTrx.rawTransaction);
    }).then((receipt) => {
        return receipt;
    }).catch((error) => {
        throw new Error(error);
    });

    const message = JSON.stringify({
        eventName: 'identityAttributeChanged',
        eventData: {
            identityAddress: identityAddress,
            attributeName: attributeName,
            attributeValue: attributeValue
        }
    });
    ws.send(message);
}

validateIdentityAttribute = async function(ws, ownerAddress, identityAddress, attributeName, validatorAddress) {
    const localIdentity = identitiesDB.get(ownerAddress);

    const contractData = getIdentityContract(identityAddress);

    const trx = {
        // nonce: this.vault.getNonce(),
        to: identityAddress,
        chainId: settings.chainId,
        gas: 3000000,
        data: contractData.contract.methods.validateAttribute(
            attributeName,
            validatorAddress
        ).encodeABI()
    };

    const receipt = await web3.eth.accounts.signTransaction(trx, localIdentity.privateKey)
    .then((sgnTrx) => {
        return web3.eth.sendSignedTransaction(sgnTrx.rawTransaction);
    }).then((receipt) => {
        return receipt;
    }).catch((error) => {
        throw new Error(error);
    });

    const message = JSON.stringify({
        eventName: 'identityAttributeValidated',
        eventData: {
            identityAddress: identityAddress,
            attributeName: attributeName,
            validatorAddress: validatorAddress
        }
    });
    ws.send(message);
}


getIdentityAttribute = async function(ws, identityAddress, attributeName) {
    const contractData = getIdentityContract(identityAddress);
    const getIdentityContractMethod = contractData.contract.methods.getAttribute(attributeName);
    getIdentityContractMethod.call().then((result) => {

        const message = JSON.stringify({
            eventName: 'identityAttribute',
            eventData: {
                identityAddress: identityAddress,
                attribute: {
                    name: result[0],
                    value: result[1],
                    validator: web3.utils.toHex(result[2])
                }
            }
        });
        ws.send(message);
    }).catch((error) => {
        throw new Error(error);
    });
}
