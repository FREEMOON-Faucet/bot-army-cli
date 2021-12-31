
/*
 * The FREEMOON Faucet Bot Army CLI
 *
 *  - Subscribe                         - subscribe
 *  - Claim                             - claim
 *  - Display public keys               - pubKeys
 *  - Display private keys              - privKeys
 *  - Display balances                  - balances
 *  - Display number of subscribed bots - subCount
 *  - Transfer tokens between accounts  - transfer
 *  - Distribute tokens to bot balances - distribute
 *  - Gather tokens from bot balances   - gather
 */


const { ethers } = require("ethers")
const dotenv = require("dotenv")

const { mainnet, testnet } = require("./addresses.js")
const erc20Abi = require("./abi/ERC20.js")
const faucetAbi = require("./abi/faucet.js")

dotenv.config()
const PROVIDER = process.env.PROVIDER || "https://mainway.freemoon.xyz/gate"
const MNEMONIC = process.env.MNEMONIC

const network = mainnet

const freeAddr = network.freeAddr
const fmnAddr = network.fmnAddr
const faucetAddr = network.faucetAddr

const gasLimit = "1000000"
const gasLimitTx = "30000"

const insufficientBal = new Error(`Insufficient Balance.`)
const insufficientGas = new Error(`Insufficient FSN Gas.`)



const assert = (cond) => {
    for(let i = 0; i < cond.length; i++) {
        if(!cond[ i ][ 0 ]) throw new Error(cond[ i ][ 1 ])
    }
}

const connect = () => {
    const provider = new ethers.providers.JsonRpcProvider(PROVIDER)
    const wallet = ethers.Wallet.fromMnemonic(MNEMONIC)
    const signer = wallet.connect(provider)
    const free = new ethers.Contract(freeAddr, erc20Abi, signer)
    const fmn = new ethers.Contract(fmnAddr, erc20Abi, signer)
    const faucet = new ethers.Contract(faucetAddr, faucetAbi, signer)

    return { provider, wallet, signer, free, faucet }
}

const countSubbedBots = async (limit, provider, faucet) => {
    let requests = []
    let totalSubbed = 0
    
    for(let i = 0; i < limit; i++) {
        for(let j = 0; j < 10; j++) {
            let currentAddr = (ethers.Wallet.fromMnemonic(MNEMONIC, `m/44'/60'/0'/0/${ totalSubbed + j }`)).address
            requests.push(faucet.isSubscribed(currentAddr))
        }

        let results = await Promise.all(requests)
        requests = []
        let subscribed = results.filter(res => res)
        totalSubbed += subscribed.length
        if(subscribed.length < 10) break
    }

    return totalSubbed
}

const derivePub = (limit, provider) => {
    let list = []
    for(let i = 0; i < limit; i++) {
        let wallet = ethers.Wallet.fromMnemonic(MNEMONIC, `m/44'/60'/0'/0/${ i }`)
        let publicKey = wallet.address
        list.push(publicKey)
    }

    return list
}

const derivePriv = (limit, provider) => {
    let list = []
    for(let i = 0; i < limit; i++) {
        let wallet = ethers.Wallet.fromMnemonic(MNEMONIC, `m/44'/60'/0'/0/${ i }`)
        let privateKey = (wallet._signingKey()).privateKey
        list.push(privateKey)
    }

    return list
}

const resolveAllBatches = async (allBatches, finalMsg) => { 
    console.log(`\n>>> Resolving requests ... `)
    let success = 0, fail = 0

    for(let i = 0; i < allBatches.length; i++) {
        const receipts = await Promise.all(allBatches[ i ])
       
        for(let j = 0; j < receipts.length; j++) {
            try {
                await receipts[ j ].wait()
                success++
            } catch(err) {
                fail++
            }
        }
    }

    console.log(finalMsg(success, fail))
}



const resolveAllRequests = async (allRequests, finalMsg) => {
    console.log(`\n>>> Resolving requests ... `)
    let success = 0, fail = 0

    const receipts = await Promise.all(allRequests)
    
    for(let i = 0; i < receipts.length; i++) {
        try {
            await receipts[ i ].wait()
            success++
        } catch(err) {
            fail++
        }
    }

    console.log(finalMsg(success, fail))
}

        




const subscribe = async ({ limit, gasPrice, batchSize }) => {
    const { provider, signer, faucet } = connect()

    const publicKeys = derivePub(limit, provider)
    const totalSubbed = await countSubbedBots(limit, provider, faucet)
    const transactionCount = await provider.getTransactionCount(publicKeys[ 0 ])
    
    const subCost = await faucet.subscriptionCost()
    const gasPriceGwei = ethers.utils.parseUnits(String(gasPrice), "gwei")

    const fsnBal = await provider.getBalance(publicKeys[ 0 ])
    const totalCost = subCost.mul(limit - totalSubbed).add("500000000000000000")

    if(limit < totalSubbed) throw new Error(`\n>>> This army has ${ totalSubbed } bots already subscribed.`)
    if(totalCost.gte(fsnBal)) throw new Error(`\n>>> Total Cost (+0.5 for gas): ${ ethers.utils.formatUnits(totalCost, "ether") } FSN,\n>>> Balance: ${ ethers.utils.formatUnits(fsnBal, "ether") } FSN`)

    let batchStart = totalSubbed
    let batchEnd
    let batchNum = 0
    let allBatches = []

    const buildTx = (batch, n) => {
        console.log(`\n>>> Building tx batch ${ n } ...`)
        let requests = batch.map((addr, i) => {
            let txNonce = transactionCount + (n * batchSize) + i
            console.log(`\n\taddress: ${ addr },\n\tfrom: ${ publicKeys[ 0 ] },\n\tgasLimit: ${ gasLimit },\n\tgasPrice: ${ gasPrice },\n\tvalue: ${ subCost },\n\tnonce: ${ txNonce }`)
            return faucet.subscribe(addr, {
                from: publicKeys[ 0 ],
                gasLimit,
                gasPrice: gasPriceGwei,
                value: subCost,
                nonce: txNonce
            })
        })

        return requests
    }


    const subscribing = setInterval(async () => {
        let batch = []
        batchEnd = limit > (batchStart + batchSize) ? batchStart + batchSize : limit
        for(let i = batchStart; i < batchEnd; i++) {
            batch.push(publicKeys[ i ])
        }
        let pendingBatch = buildTx(batch, batchNum)
        allBatches.push(pendingBatch)
        batchStart = batchEnd
        batchNum++
        if(batchEnd === limit) {
            clearInterval(subscribing)
            await resolveAllBatches(allBatches, (s, f) => (`\n>>> Subscribing complete, ${ s } successful, ${ f } unsuccessful.`))
        }
    }, 1000)
}



const claim = async ({ limit, gasPrice, batchSize }) => {
    const { provider, signer, faucet } = connect()

    const publicKeys = derivePub(limit, provider)
    const totalSubbed = await countSubbedBots(limit, provider, faucet)
    const transactionCount = await provider.getTransactionCount(publicKeys[ 0 ])

    const gasPriceGwei = ethers.utils.parseUnits(String(gasPrice), "gwei")
    const fsnBal = Number(ethers.utils.formatUnits(await provider.getBalance(publicKeys[ 0 ])))

    if(totalSubbed < limit) throw new Error(`\n>>> Only ${ totalSubbed } bots are subscribed, cannot claim for ${ limit } bots.`)
    if(fsnBal < 0.5) throw new Error(`\n>>> Leave 0.5 FSN for gas. Current funds: ${ fsnBal }`)

    let batchStart = 0
    let batchEnd
    let batchNum = 0
    let allBatches = []

    const buildTx = (batch, n) => {
        console.log(`\n>>> Building tx batch ${ n } ...`)
        let requests = batch.map((addr, i) => {
            let txNonce = transactionCount + (n * batchSize) + i
            console.log(`\n\taddress: ${ addr },\n\tfrom: ${ publicKeys[ 0 ] },\n\tgasLimit: ${ gasLimit },\n\tgasPrice: ${ gasPriceGwei },\n\tnonce: ${ txNonce }`)
            return faucet.claim(addr, {
                from: publicKeys[ 0 ],
                gasLimit,
                gasPrice: gasPriceGwei,
                nonce: txNonce
            })
        })

        return requests
    }


    const claiming = setInterval(async () => {
        let batch = []
        batchEnd = limit > (batchStart + batchSize) ? batchStart + batchSize : limit
        for(let i = batchStart; i < batchEnd; i++) {
            batch.push(publicKeys[ i ])
        }
        let pendingBatch = buildTx(batch, batchNum)
        allBatches.push(pendingBatch)
        batchStart = batchEnd
        batchNum++
        if(batchEnd === limit) {
            clearInterval(claiming)
            await resolveAllBatches(allBatches, (s, f) => (`>>> Claiming complete, ${ s } successful, ${ f } unsuccessful.`))
            console.log(`>>> Waiting until ${ (new Date(Date.now())).toISOString().replace("T", ", ") } for next claim ...`)
        }
    }, 1000)
}



const pubKeys = ({ limit }) => {
    const { provider } = connect()

    const publicKeys = derivePub(limit, provider)
    publicKeys.forEach((pub, i) => console.log(`${ i + 1 }: ${ pub }`))
}



const privKeys = ({ limit }) => {
    const { provider } = connect()
    
    const privateKeys = derivePriv(limit, provider)
    privateKeys.forEach((priv, i) => console.log(`${ i + 1 }: ${ priv }`))
}



const balances = async ({ limit }) => {
    const { provider, free } = connect()

    const publicKeys = derivePub(limit, provider)

    let fsnRequests = [], freeRequests = []
    
    for(let i = 0; i < publicKeys.length; i++) {
        fsnRequests.push(provider.getBalance(publicKeys[ i ]))
        freeRequests.push(free.balanceOf(publicKeys[ i ]))
    } 

    let fsnResults = await Promise.all(fsnRequests)
    let freeResults = await Promise.all(freeRequests)

    for(let i = 0; i < publicKeys.length; i++) {
        console.log(`${ i + 1 }: ${ publicKeys[ i ] }: FSN: ${ ethers.utils.formatUnits(fsnResults[ i ], 18) }, FREE: ${ ethers.utils.formatUnits(freeResults[ i ], 18) }`)
    }
}



const subCount = async ({ limit }) => {
    const { provider, faucet } = connect()
    
    console.log(`Counting subscribed addresses up to upper limit of ${ limit * 10 } ...`)

    const totalSubbed = await countSubbedBots(limit, provider, faucet)

    console.log(`Total subscribed addresses: ${ totalSubbed }`)
}



const transfer = async ({ token, amount, to, from, gasPrice }) => {
    const { provider } = connect()
    
    const limit = from > to ? from : to

    const toIndex = to - 1
    const fromIndex = from - 1

    const amountWei = ethers.utils.parseUnits(String(amount), "ether")
    const gasPriceGwei = ethers.utils.parseUnits(String(gasPrice), "gwei")
    const gasRequired = gasPriceGwei.mul(gasLimit)

    const publicKeys = derivePub(limit)
    const privateKeys = derivePriv(limit)
    const signer = new ethers.Wallet(privateKeys[ fromIndex ], provider)

    const toAddr = publicKeys[ toIndex ]

    const fsnBal = await provider.getBalance(publicKeys[ fromIndex ])
    
    if(token === "FSN") {
        const gasRequiredTx = gasPriceGwei.mul(gasLimitTx)
        if((fsnBal.sub(gasRequiredTx)).lt(amountWei)) throw insufficientBal
        if((fsnBal.sub(amountWei)).lt(gasRequiredTx)) throw insufficientGas

        await signer.sendTransaction({
            to: toAddr,
            value: amountWei,
            gasPrice: gasPriceGwei,
            gasLimit: ethers.BigNumber.from(gasLimitTx)
        })
    } else if(token === "FREE") {
        const free = new ethers.Contract(freeAddr, erc20Abi, signer)
        const bal = await free.balanceOf(publicKeys[ fromIndex ])
        if(bal.lt(amountWei)) throw insufficientBal
        if(fsnBal.lt(gasRequired)) throw insufficientGas

        await free.transfer(toAddr, amountWei, { gasPrice: gasPriceGwei, gasLimit  })
    } else if(token === "FMN") {
        const fmn = new ethers.Contract(fmnAddr, erc20Abi, signer)
        const bal = await fmn.balanceOf(publicKeys[ fromIndex ])
        if(bal.lt(amountWei)) throw insufficientBal
        if(fsnBal.lt(gasRequired)) throw insufficientGas

        await fmn.transfer(toAddr, amountWei, { gasPrice: gasPriceGwei, gasLimit })
    }
    
    console.log(`\n>>> Success. Run \"balances\" command to verify.`)
}



const distribute = async ({ token, amount, limit, gasPrice }) => {
    const { provider, signer, free, fmn, faucet } = connect()
    
    const publicKeys = derivePub(limit, provider)
    const totalSubbed = await countSubbedBots(limit, provider, faucet)
    const transactionCount = await provider.getTransactionCount(publicKeys[ 0 ])
    
    const gasPriceGwei = ethers.utils.parseUnits(String(gasPrice), "gwei")
    const fsnBal = await provider.getBalance(publicKeys[ 0 ])
    const amountEachWei = ethers.utils.parseUnits(String(amount), "ether")

    if(totalSubbed < limit) throw new Error(`\n>>> Only ${ totalSubbed } bots are subscribed, please subscribe all bots before distribution.`)


    let buildTx

    const buildFsnTx = async (batch) => {
        console.log(`\n>>> Building FSN tx, this may take some time ...`)
        let amountRequired = []
        let requiresFunds = []

        for(let i = 1; i < batch.length; i++) {
            const bal = await provider.getBalance(batch[ i ])
            if(bal.lt(amountEachWei)) {
                requiresFunds.push(batch[ i ])
                amountRequired.push(amountEachWei.sub(bal))
            }
        }

        let requests = requiresFunds.map((addr, i) => {
            let txNonce = transactionCount + i
            console.log(`\n\tto: ${ addr },\n\tfrom: ${ publicKeys[ 0 ] },\n\tvalue: ${ ethers.utils.formatUnits(amountRequired[ i ], "ether") },\n\tgasLimit: ${ gasLimit },\n\tgasPrice: ${ gasPriceGwei },\n\tnonce: ${ txNonce }`)
            return signer.sendTransaction({
                from: publicKeys[ 0 ],
                to: addr,
                value: amountRequired[ i ],
                gasLimit: ethers.BigNumber.from(gasLimitTx),
                gasPrice: gasPriceGwei,
                nonce: txNonce
            })
        })

        return requests
    }


    const buildFreeTx = async (batch) => {
        console.log(`\n>>> Building FREE tx, this may take some time ...`)
        let amountRequired = []
        let requiresFunds = []

        for(let i = 1; i < batch.length; i++) {
            const bal = await free.balanceOf(batch[ i ])
            if(bal.lt(amountEachWei)) {
                requiresFunds.push(batch[ i ])
                amountRequired.push(amountEachWei.sub(bal))
            }
        }

        let requests = requiresFunds.map((addr, i) => {
            let txNonce = transactionCount + i
            console.log(`\n\taddress: ${ addr }, \n\tfrom: ${ publicKeys[ 0 ] },\n\tgasLimit: ${ gasLimit },\n\tgasPrice: ${ gasPriceGwei },\n\tnonce: ${ txNonce }`)
            return free.transfer(addr, amountEachWei, {
                gasLimit,
                gasPrice: gasPriceGwei,
                nonce: txNonce
            })
        })

        return requests
    }


    const buildFmnTx = async (batch) => {
        console.log(`\n>>> Building FMN tx, this may take some time ...`)
        let amountRequired = []
        let requiresFunds = []

        for(let i = 1; i < batch.length; i++) {
            const bal = await fmn.balanceOf(batch[ i ])
            if(bal.lt(amountEachWei)) {
                requiresFunds.push(batch[ i ])
                amountRequired.push(amountEachWei.sub(bal))
            }
        }

        let requests = requiresFunds.map((addr, i) => {
            let txNonce = transactionCount + i
            console.log(`\n\taddress: ${ addr }, \n\tfrom: ${ publicKeys[ 0 ] },\n\tgasLimit: ${ gasLimit },\n\tgasPrice: ${ gasPriceGwei },\n\tnonce: ${ txNonce }`)
            // return fmn.transfer(addr, amountEachWei, {
            //     gasLimit,
            //     gasPrice: gasPriceGwei,
            //     nonce: txNonce
            // })
        })

        return requests
    }
    
    if(token === "FSN") {
        const gasRequiredTx = gasPriceGwei.mul(gasLimitTx)
        if(fsnBal.lt(gasRequiredTx)) throw insufficientGas
        buildTx = buildFsnTx
    } else if(token === "FREE") {
        const gasRequired = gasPriceGwei.mul(gasLimit)
        if(fsnBal.lt(gasRequired)) throw insufficientGas
        buildTx = buildFreeTx
    } else if(token === "FMN") {
        const gasRequired = gasPriceGwei.mul(gasLimit)
        if(fsnBal.lt(gasRequired)) throw insufficientGas
        buildTx = buildFmnTx
    }

    const allRequests = await buildTx(publicKeys)
    await resolveAllRequests(allRequests, (s, f) => (`>>> Transfer complete, ${ s } successful, ${ f } unsuccessful.`))
}



const gather = async (opts) => {}



module.exports = { subscribe, claim, pubKeys, privKeys, balances, subCount, transfer, distribute }
