
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


import { program } from "commander/esm.mjs"
import { ethers } from "ethers"
import dotenv from "dotenv"

import { freeAddr, faucetAddr } from "./addresses.mjs"
import erc20Abi from "./abi/ERC20.mjs"
import faucetAbi from "./abi/faucet.mjs"

program
    .requiredOption("-o | --operation <string>", "desired operation, can be run, list, or transfer.")
    .option("-l | --limit <number>", "maximum value argument for a specified operation.")
    .option("-b | --batch-size <number>", "maximum number of requests per block")
    .parse()

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

const subscribe = async (opts) => {}

const claim = async (opts) => {}

const pubKeys = (opts) => {
    const limit = opts.limit ? opts.limit : 10
    const { provider } = connect()

    const publicKeys = derivePub(limit, provider)
    publicKeys.forEach((pub, i) => console.log(`${ i + 1 }: ${ pub }`))
}

const privKeys = (opts) => {
    const limit = opts.limit ? opts.limit : 10
    const { provider } = connect()
    
    const privateKeys = derivePriv(limit, provider)
    privateKeys.forEach((priv, i) => console.log(`${ i + 1 }: ${ priv }`))
}

const balances = async (opts) => {
    const limit = opts.limit ? opts.limit : 10
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

const subCount = async (opts) => {
    const limit = opts.limit ? opts.limit : 100
    const { provider, faucet } = connect()
    
    let requests = []
    let totalSubbed = 0

    console.log(`Counting subscribed addresses up to upper limit of ${ limit * 10 } ...`)
    
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

    console.log(`Total subscribed addresses: ${ totalSubbed }`)
}

const distFsn = async (opts) => {}

const distFree = async (opts) => {}

const gathFsn = async (opts) => {}

const gathFree = async (opts) => {}


const start = () => {
    const options = program.opts()
    let execution

    switch(options.operation) {
        case "subscribe":
            execution = subscribe
            break
        case "claim":
            execution = claim
            break
        case "pubKeys":
            execution = pubKeys
            break
        case "privKeys":
            execution = privKeys
            break
        case "balances":
            execution = balances
            break
        case "subCount":
            execution = subCount
            break
        case "distFsn":
            execution = distFsn
            break
        case "distFree":
            execution = distFree
            break
        case "gathFsn":
            execution = gathFsn
            break
        case "gathFree":
            execution = gathFree
            break
        default:
            throw new Error(`Invalid argument \"${ options.operation }\".`)
    }
    
    if(execution) execution(options)
    else console.log(options.operation)
}

try {
    start()
} catch(err) {
    console.log(err.message)
}
