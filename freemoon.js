
/*
 * The FREEMOON Faucet Bot Army CLI
 *
 * Operations:
 *  - Run
 *  - List
 *  - Transfer
 *
 * Run:
 *  - Subscribe                         - subscribe
 *  - Claim                             - claim
 *
 * List:
 *  - Display public keys               - pubKeys
 *  - Display private keys              - privKeys
 *  - Display balances                  - balances
 *  - Display number of subscribed bots - subCount
 *
 * Transfer:
 *  - Distribute FSN                    - distFsn
 *  - Distribute FREE                   - distFree
 *  - Gather FSN                        - gathFsn
 *  - Gather FREE                       - gathFree
 */


const { ethers } = require("ethers")
const dotenv = require("dotenv")

const { freeAddr, faucetAddr } = require("./addresses.js")
const erc20Abi = require("./abi/ERC20.js")
const faucetAbi = require("./abi/faucet.js")

dotenv.config()
const PROVIDER = process.env.PROVIDER || "https://mainway.freemoon.xyz/gate"
const MNEMONIC = process.env.MNEMONIC

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
        const results = await Promise.allSettled(allBatches[ i ])

        success += results.filter(res => res.status === "fulfilled").length
        fail += results.filter(res => res.status === "rejected").length
    }

    console.log(finalMsg(success, fail))
}



const subscribe = async ({ limit, gasPrice, batchSize }) => {
    const { provider, signer, faucet } = connect()

    const publicKeys = derivePub(limit, provider)
    const totalSubbed = await countSubbedBots(limit, provider, faucet)
    const transactionCount = await provider.getTransactionCount(publicKeys[ 0 ])
    
    const subCost = await faucet.subscriptionCost()
    const currentGas = ethers.utils.parseUnits(String(gasPrice), "gwei")
    const gasLimit = "1000000"

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
            console.log(`\n\taddress: ${ addr },\n\tfrom: ${ publicKeys[ 0 ] },\n\tgasLimit: ${ gasLimit },\n\tgasPrice: ${ currentGas },\n\tvalue: ${ subCost },\n\tnonce: ${ txNonce }`)
            return faucet.subscribe(addr, {
                from: publicKeys[ 0 ],
                gasLimit: "1000000",
                gasPrice: currentGas,
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



const claim = async (opts) => {}



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
        console.log(`${ publicKeys[ i ] }: FSN: ${ ethers.utils.formatUnits(fsnResults[ i ], 18) }, FREE: ${ ethers.utils.formatUnits(freeResults[ i ], 18) }`)
    }
}



const subCount = async ({ limit }) => {
    const { provider, faucet } = connect()
    
    console.log(`Counting subscribed addresses up to upper limit of ${ limit * 10 } ...`)

    const totalSubbed = await countSubbedBots(limit, provider, faucet)

    console.log(`Total subscribed addresses: ${ totalSubbed }`)
}



const distFsn = async (opts) => {}



const distFree = async (opts) => {}



const gathFsn = async (opts) => {}



const gathFree = async (opts) => {}



module.exports = { subscribe, claim, pubKeys, privKeys, balances, subCount }
