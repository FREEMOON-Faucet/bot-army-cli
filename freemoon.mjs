
import { program } from "commander/esm.mjs"
import { ethers } from "ethers"
import dotenv from "dotenv"

program
    .option("-l | --limit <number>", "how many bot addresses to display", 10)
    .parse()

const options = program.opts()
const LIMIT = Number(options.limit)
if(isNaN(LIMIT)) {
    throw new program.InvalidArgumentError(`Not a number: ${ options.limit }`)
}

dotenv.config()
const PROVIDER = process.env.PROVIDER || "https://mainway.freemoon.xyz/gate"
const MNEMONIC = process.env.MNEMONIC


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
        console.log(`${ i }: ${ wallet.address }`)
    }
}


displayBots(LIMIT)

