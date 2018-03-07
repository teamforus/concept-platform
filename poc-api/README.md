## Me API

### Remarks

All addresses and keys have to start with 0x

### Listeners

#### createAccount

Creates a new account

##### JSON message
```javascript
{
    eventName: 'createAccount'
    // Has no parameters. eventData can be omitted.
}
```

##### Triggers
- newAccount

#### addAccount

Adds an existing account

##### JSON message
```javascript
{
    eventName: 'addAccount',
    eventData: {
        privateKey: {{string}} // Private key of the account to add.
    }
}
```

##### Triggers
- newAccount

#### getBalance

##### JSON message
```javascript
{
    eventName: 'getBalance',
    eventData: {
        address: {{string}} // Address to get balance from.
    }
}
```

##### Triggers
- balance

#### sendEther
Transfers ether from one account to another

##### JSON message
```javascript
{
    eventName: 'sendEther',
    eventData: {
        from: {{string}} // Address to transfer from.
        to: {{string}} // Address to transfer to.
        amount: {{number}} // Amount in wei to transfer.
    }
}
```

##### Triggers
- receipt
- balance

#### deployToken
Deploys a new ERC20 contract.
The totalSupply is initially given to the creator of the contract.

##### JSON message
```javascript
{
    eventName: 'deployToken',
    eventData: {
        creatorAddress: {{string}} // Account address of the creator.
        totalSupply: {{number}} // Total supply for this token.
    }
}
```

##### Triggers
-tokenDeployed

#### getTokenName
Get the name of a token

##### JSON message
```javascript
{
    eventName: 'getTokenName',
    eventData: {
        address: {{string}} // Address of the token
    }
}
```

##### Triggers
-

#### getTokenTotalSupply
Get the total supply of a token

##### JSON message
```javascript
{
    eventName: 'getTokenTotalSupply',
    eventData: {
        address: {{string}} // Address of the token
    }
}
```

##### Triggers
-

#### getTokenBalanceOf
Get the token balance of a specific owner

##### JSON message
```javascript
{
    eventName: '',
    eventData: {
        tokenAddress: {{string}}, // Address of the token
        ownerAddress: {{string}} // Address of the owner
    }
}
```

##### Triggers
-






### Events

#### newAccount
Notification of a newly created or added existing account

##### JSON message
```javascript
{
    eventName: 'newAccount',
    eventData: {
        address: {{string}} // The address of the new account.
    }
}
```

##### Triggered by
- addAccount
- createAccount

#### balance
The current balance of an account

##### JSON message
```javascript
{
    eventName: 'balance',
    eventData: {
        address: {{string}}, // The account the balance belongs to.
        balance: {{number}} // Balance in wei.
    }
}
```

##### Triggered by
- getBalance
- sendEther

#### receipt
The receipt for a mined transaction

##### JSON message
```javascript
{
    eventName: 'receipt',
    eventData: {
        receipt: receipt // The receipt as received from web3js; see http://web3js.readthedocs.io/en/1.0/web3-eth.html#gettransactionreceipt.
    }
}
```

##### Triggered by
- sendEther

### tokenDeployed
Confirms the creation of an ERC20 contract

##### JSON message
```javascript
{
    eventName: 'tokenDeployed',
    eventData: {
        address: {{string}} // The addres of the created contract
    }
}
```

##### Triggered by
- sendEther