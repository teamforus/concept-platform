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
    var body = fs.readFileSync('identity.json', 'ucs2')
    body = body.replace(/^\uFEFF/, ''); // strip bom
    const obj = JSON.parse(body);
    return {
        abi: JSON.parse(obj.contracts[name].abi),
        bin: '0x' + obj.contracts[name].bin
    }
}

getERC20Contract = function(address = null) {
    const abi = [{'constant':false,'inputs':[{'name':'_spender','type':'address'},{'name':'_value','type':'uint256'}],'name':'approve','outputs':[{'name':'','type':'bool'}],'payable':false,'stateMutability':'nonpayable','type':'function'},{'constant':true,'inputs':[],'name':'getName','outputs':[{'name':'name','type':'string'}],'payable':false,'stateMutability':'view','type':'function'},{'constant':true,'inputs':[],'name':'totalSupply','outputs':[{'name':'','type':'uint256'}],'payable':false,'stateMutability':'view','type':'function'},{'constant':false,'inputs':[{'name':'_from','type':'address'},{'name':'_to','type':'address'},{'name':'_value','type':'uint256'}],'name':'transferFrom','outputs':[{'name':'','type':'bool'}],'payable':false,'stateMutability':'nonpayable','type':'function'},{'constant':false,'inputs':[{'name':'_spender','type':'address'},{'name':'_subtractedValue','type':'uint256'}],'name':'decreaseApproval','outputs':[{'name':'','type':'bool'}],'payable':false,'stateMutability':'nonpayable','type':'function'},{'constant':true,'inputs':[{'name':'_owner','type':'address'}],'name':'balanceOf','outputs':[{'name':'balance','type':'uint256'}],'payable':false,'stateMutability':'view','type':'function'},{'constant':false,'inputs':[{'name':'_to','type':'address'},{'name':'_value','type':'uint256'}],'name':'transfer','outputs':[{'name':'','type':'bool'}],'payable':false,'stateMutability':'nonpayable','type':'function'},{'constant':false,'inputs':[{'name':'_spender','type':'address'},{'name':'_addedValue','type':'uint256'}],'name':'increaseApproval','outputs':[{'name':'','type':'bool'}],'payable':false,'stateMutability':'nonpayable','type':'function'},{'constant':true,'inputs':[{'name':'_owner','type':'address'},{'name':'_spender','type':'address'}],'name':'allowance','outputs':[{'name':'','type':'uint256'}],'payable':false,'stateMutability':'view','type':'function'},{'inputs':[{'name':'name','type':'string'},{'name':'totalSupply','type':'uint256'}],'payable':false,'stateMutability':'nonpayable','type':'constructor'},{'anonymous':false,'inputs':[{'indexed':true,'name':'from','type':'address'},{'indexed':true,'name':'to','type':'address'},{'indexed':false,'name':'value','type':'uint256'}],'name':'Transfer','type':'event'},{'anonymous':false,'inputs':[{'indexed':true,'name':'owner','type':'address'},{'indexed':true,'name':'spender','type':'address'},{'indexed':false,'name':'value','type':'uint256'}],'name':'Approval','type':'event'}];
    
    const tokenContract = new web3.eth.Contract(abi, address, null);

    return tokenContract
}

deployToken = async function(ws, creatorAddress, tokenName, totalSupply) {
    const localIdentity = identitiesDB.get(creatorAddress);

    const binary = '606060405234156200001057600080fd5b604051620012bf380380620012bf833981016040528080518201919060200180519060200190919050506000811115156200004a57600080fd5b816000908051906020019062000062929190620000b6565b508060028190555080600160003373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002081905550505062000165565b828054600181600116156101000203166002900490600052602060002090601f016020900481019282601f10620000f957805160ff19168380011785556200012a565b828001600101855582156200012a579182015b82811115620001295782518255916020019190600101906200010c565b5b5090506200013991906200013d565b5090565b6200016291905b808211156200015e57600081600090555060010162000144565b5090565b90565b61114a80620001756000396000f300606060405260043610610099576000357c0100000000000000000000000000000000000000000000000000000000900463ffffffff168063095ea7b31461009e57806317d7de7c146100f857806318160ddd1461018657806323b872dd146101af578063661884631461022857806370a0823114610282578063a9059cbb146102cf578063d73dd62314610329578063dd62ed3e14610383575b600080fd5b34156100a957600080fd5b6100de600480803573ffffffffffffffffffffffffffffffffffffffff169060200190919080359060200190919050506103ef565b604051808215151515815260200191505060405180910390f35b341561010357600080fd5b61010b6104e1565b6040518080602001828103825283818151815260200191508051906020019080838360005b8381101561014b578082015181840152602081019050610130565b50505050905090810190601f1680156101785780820380516001836020036101000a031916815260200191505b509250505060405180910390f35b341561019157600080fd5b610199610589565b6040518082815260200191505060405180910390f35b34156101ba57600080fd5b61020e600480803573ffffffffffffffffffffffffffffffffffffffff1690602001909190803573ffffffffffffffffffffffffffffffffffffffff16906020019091908035906020019091905050610593565b604051808215151515815260200191505060405180910390f35b341561023357600080fd5b610268600480803573ffffffffffffffffffffffffffffffffffffffff16906020019091908035906020019091905050610952565b604051808215151515815260200191505060405180910390f35b341561028d57600080fd5b6102b9600480803573ffffffffffffffffffffffffffffffffffffffff16906020019091905050610be3565b6040518082815260200191505060405180910390f35b34156102da57600080fd5b61030f600480803573ffffffffffffffffffffffffffffffffffffffff16906020019091908035906020019091905050610c2c565b604051808215151515815260200191505060405180910390f35b341561033457600080fd5b610369600480803573ffffffffffffffffffffffffffffffffffffffff16906020019091908035906020019091905050610e50565b604051808215151515815260200191505060405180910390f35b341561038e57600080fd5b6103d9600480803573ffffffffffffffffffffffffffffffffffffffff1690602001909190803573ffffffffffffffffffffffffffffffffffffffff1690602001909190505061104c565b6040518082815260200191505060405180910390f35b600081600360003373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060008573ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168152602001908152602001600020819055508273ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff167f8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925846040518082815260200191505060405180910390a36001905092915050565b6104e961110a565b60008054600181600116156101000203166002900480601f01602080910402602001604051908101604052809291908181526020018280546001816001161561010002031660029004801561057f5780601f106105545761010080835404028352916020019161057f565b820191906000526020600020905b81548152906001019060200180831161056257829003601f168201915b5050505050905090565b6000600254905090565b60008073ffffffffffffffffffffffffffffffffffffffff168373ffffffffffffffffffffffffffffffffffffffff16141515156105d057600080fd5b600160008573ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002054821115151561061e57600080fd5b600360008573ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060003373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020016000205482111515156106a957600080fd5b6106fb82600160008773ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168152602001908152602001600020546110d390919063ffffffff16565b600160008673ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020016000208190555061079082600160008673ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168152602001908152602001600020546110ec90919063ffffffff16565b600160008573ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020016000208190555061086282600360008773ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060003373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168152602001908152602001600020546110d390919063ffffffff16565b600360008673ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060003373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168152602001908152602001600020819055508273ffffffffffffffffffffffffffffffffffffffff168473ffffffffffffffffffffffffffffffffffffffff167fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef846040518082815260200191505060405180910390a3600190509392505050565b600080600360003373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060008573ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002054905080831115610a63576000600360003373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060008673ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002081905550610af7565b610a7683826110d390919063ffffffff16565b600360003373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060008673ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168152602001908152602001600020819055505b8373ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff167f8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925600360003373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060008873ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168152602001908152602001600020546040518082815260200191505060405180910390a3600191505092915050565b6000600160008373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168152602001908152602001600020549050919050565b60008073ffffffffffffffffffffffffffffffffffffffff168373ffffffffffffffffffffffffffffffffffffffff1614151515610c6957600080fd5b600160003373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168152602001908152602001600020548211151515610cb757600080fd5b610d0982600160003373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168152602001908152602001600020546110d390919063ffffffff16565b600160003373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002081905550610d9e82600160008673ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168152602001908152602001600020546110ec90919063ffffffff16565b600160008573ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168152602001908152602001600020819055508273ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff167fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef846040518082815260200191505060405180910390a36001905092915050565b6000610ee182600360003373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060008673ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168152602001908152602001600020546110ec90919063ffffffff16565b600360003373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060008573ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168152602001908152602001600020819055508273ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff167f8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925600360003373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060008773ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168152602001908152602001600020546040518082815260200191505060405180910390a36001905092915050565b6000600360008473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060008373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002054905092915050565b60008282111515156110e157fe5b818303905092915050565b600080828401905083811015151561110057fe5b8091505092915050565b6020604051908101604052806000815250905600a165627a7a72305820cabe157e4facd1caefe40897ffeb88d3bc133f1645b69bf298c2953a7f4c1dc00029';
    
    const tokenContract = getERC20Contract();

    const deploy = tokenContract.deploy({
        data: binary,
        arguments: [tokenName, totalSupply]
    });

    const trx = {
      // nonce: this.vault.getNonce(),
      chainId: settings.chainId,
      gas: 2000000,
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
        eventName: 'tokenDeployed',
        eventData: {
            address: receipt.contractAddress
        }
    });

    ws.send(message);
}

getTokenName = async function(ws, tokenAddress) {
    const tokenContract = getERC20Contract(tokenAddress);
    tokenContract.methods.getName().call().then((name) => {
        console.log(name);
    });
}

getTokenTotalSupply = async function(ws, tokenAddress) {
    const tokenContract = getERC20Contract(tokenAddress);
    const totalSupplyMethod = tokenContract.methods.totalSupply();
    totalSupplyMethod.call().then((totalSupply) => {
        console.log(totalSupply);
    });
}

getTokenBalanceOf = async function(ws, tokenAddress, ownerAddress) {
    console.log(getTokenBalanceOf);
    const tokenContract = getERC20Contract(tokenAddress);
    const totalSupplyMethod = tokenContract.methods.balanceOf(ownerAddress);
    totalSupplyMethod.call().then((balance) => {
        console.log(balance);
    });
}

getIdentityContract = function(address = null) {
    const contractData = getContractData('identity.json', 'identity.sol:Identity');
    
    contractData.contract = new web3.eth.Contract(contractData.abi, address, null);

    return contractData
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
