
/*
 * The FREEMOON Faucet Bot Army CLI
 *
 * Operations:
 *  - Run
 *  - List
 *  - Transfer
 *
 * Run:
 *  - Subscribe
 *  - Claim
 *
 * List:
 *  - Display public keys
 *  - Display private keys
 *  - Display balances
 *
 * Transfer:
 *  - Distribute FSN
 *  - Distribute FREE
 *  - Gather FSN
 *  - Gather FREE
 */


import { program } from "commander/esm.mjs"
import { ethers } from "ethers"
import dotenv from "dotenv"

program
    .requiredOption("-o | --operation <string>", "desired operation, can be run, list, or transfer.")
    .option("--list-op <string>", "desired list operation, can be balances, private keys, or public keys.")
    .option("--run-op <string", "desired run operation, can be subscribe or claim.")
    .option("--transfer-op <string>", "desired transfer operation, can be distFsn, distFree, gatherFsn, or gatherFree.")
    .option("-n | --number <number>", "specified number of something, depending on operation argument.")
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
    let provider = new ethers.providers.JsonRpcProvider(PROVIDER)
    let wallet = ethers.Wallet.fromMnemonic(MNEMONIC)
    let signer = wallet.connect(provider)

    return { provider, wallet, signer }
}

const displayBots = limit => {
    let { provider } = connect()
    for(let i = 0; i < limit; i++) {
        let wallet = ethers.Wallet.fromMnemonic(MNEMONIC, `m/44'/60'/0'/0/${ i }`)
        console.log(`${ i + 1 }: ${ wallet.address }`)
    }
}

const runOps = () => {}

const listOps = options => {
    assert([
        [ options.number, `Number argument missing.` ],
        [ !isNaN(Number(options.number)), `Invalid argument \"${ options.number }\" for number - must be of type number.` ],
        [ !options.runOps, `Run operation argument must not be defined.` ],
        [ !options.transferOps, `Transfer operation must not be defined.` ]
    ])
    displayBots(options.number)
}

const transferOps = () => {}

// Check arguments
const start = () => {
    const options = program.opts()
    let execution = null

    if(options.operation === "run") execution = runOps
    else if(options.operation === "list") execution = listOps
    else if(options.operation === "transfer") execution = transferOps
    else throw new Error(`Invalid argument \"${ options.operation }\" for operation - must be run, list, or transfer.`)

    execution(options)
}

try {
    start()
} catch(err) {
    console.log(err.message)
}
