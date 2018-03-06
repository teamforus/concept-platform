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
