#!/usr/bin/env node

const commander = require("commander")
const program = new commander.Command()
const {
    subscribe,
    claim,
    genSeedPhrase,
    pubKeys,
    privKeys,
    balances,
    subCount,
    transfer,
    distribute,
    gather
} = require("./freemoon.js")

const myParseInt = (value) => {
    const parsedValue = parseInt(value, 10)
    if(isNaN(parsedValue) || parsedValue < 0) throw new commander.InvalidArgumentError("Not a number.")
    return parsedValue
}

const myParseFloat = (value) => {
    const parsedValue = parseFloat(value, 10)
    if(isNaN(parsedValue) || parsedValue < 0) throw new commander.InvalidArgumentError("Not a number.")
    return parsedValue
}

const myToken = (value) => {
    if(value !== "FSN" && value !== "FREE" && value !== "FMN") throw new commander.InvalidArgumentError("Token must be \"FSN\", \"FREE\", or \"FMN\".")
    return value
}


// version and description
program
    .version("1.0.0")
    .description("The FREEMOON Faucet Bot Army Command Line Interface")

// subscribe
program
    .command("subscribe")
    .argument("<limit>", "total bots to be subscribed", myParseInt)
    .argument("[gasPrice]", "gas price in gwei", myParseFloat, 2)
    .argument("[batchSize]", "max transactions submitted per second", myParseInt, 5)
    .description("Total number of bots to subscribe, if not already subscribed")
    .action(async (limit, gasPrice, batchSize) => {
        let suffix = limit === 1 ? "st" : "th"
        suffix = limit === 2 ? "nd" : suffix
        suffix = limit === 3 ? "rd" : suffix

        console.log(`Subscribing up to the ${ limit }${ suffix } bot, gas price is ${ gasPrice } gwei, ${ batchSize } requests per second.`)

        try {
            await subscribe({ limit, gasPrice, batchSize })
        } catch(err) {
            console.log(`\nError: ${ err.message }`)
        }
    })

// claim
program
    .command("claim")
    .argument("<limit>", "total bots to claim for every hour")
    .argument("[gasPrice]", "gas price in gwei", myParseFloat, 2)
    .argument("[batchSize]", "max transactions submitted per second", myParseInt, 5)
    .description("Total number of bots to claim for every hour, if they have not claimed already")
    .action(async (limit, gasPrice, batchSize) => {
        console.log(`Claiming for ${ limit } bots per hour, gas price is ${ gasPrice } gwei, ${ batchSize } requests per second.`)

        let claiming
        
        try {
            await claim({ limit, gasPrice, batchSize })
            claiming = setInterval(async () => {
                await claim({ limit, gasPrice, batchSize })
            }, 3720000)
        } catch(err) {
            clearInterval(claiming)
            console.log(`\nError: ${ err.message }`)
        }
    })

// generate random new seed phrase
program
    .command("genSeedPhrase")
    .description("Generate a new seed phrase to use in the bot army")
    .action(() => genSeedPhrase())

// display public keys
program
    .command("pubKeys")
    .argument("[limit]", "max value", myParseInt, 10)
    .description("Display specified number of public keys of bot army")
    .action((limit) => pubKeys({ limit }))

// display private keys
program
    .command("privKeys")
    .argument("[limit]", "max value", myParseInt, 10)
    .description("Display specified number of private keys of bot army")
    .action((limit) => privKeys({ limit }))

// display balances
program
    .command("balances")
    .argument("[limit]", "max value", myParseInt, 10)
    .description("Display FSN and FREE balances of specified number of bot addresses")
    .action((limit) => balances({ limit }))

// count number of subscribed bots
program
    .command("subCount")
    .argument("[limit]", "max value", myParseInt, 10)
    .description("Count the number of subscribed bots up to a given upper limit")
    .action((limit) => subCount({ limit }))

// transfer FSN, FREE, or FMN
program
    .command("transfer")
    .argument("<token>", "token to transfer", myToken)
    .argument("<amount>", "amount to transfer")
    .argument("<to>", "index of to address", myParseInt)
    .argument("[from]", "index of from address", myParseInt, 0)
    .argument("[gasPrice]", "gas price in gwei", myParseFloat, 2)
    .description("Transfer either FSN, FREE, or FMN from & to specified address indices.")
    .action(async (token, amount, to, from, gasPrice) => {
        console.log(`Transferring ${ amount } ${ token } from address ${ from } to address ${ to }, gas price is ${ gasPrice } gwei.`)

        try {
            await transfer({ token, amount, to, from, gasPrice })
        } catch(err) {
            console.log(`\nError: ${ err.message }`)
        }
    })

// distribute FSN, FREE, and FMN
program
    .command("distribute")
    .argument("<token>", "token to distribute", myToken)
    .argument("<amount>", "max amount to have in each account")
    .argument("<limit>", "max value", myParseInt)
    .argument("[gasPrice]", "gas price in gwei", myParseFloat, 2)
    .description("Distribute either FSN, FREE, or FMN to a number of addresses.")
    .action(async (token, amount, limit, gasPrice) => {
        console.log(`Distributing max ${ amount } ${ token } to max ${ limit } addresses, gas price is ${ gasPrice } gwei.`)

        try {
            await distribute({ token, amount, limit, gasPrice })
        } catch(err) {
            console.log(`\nError: ${ err.message }`)
        }
    })

// gather FSN, FREE, and FMN
program
    .command("gather")
    .argument("<token>", "token to gather", myToken)
    .argument("<amount>", "max amount to leave in each account")
    .argument("<limit>", "max value", myParseInt)
    .argument("[gasPrice]", "gas price in gwei", myParseFloat, 2)
    .description("Gather either FSN, FREE, or FMN from a number of addresses.")
    .action(async (token, amount, limit, gasPrice) => {
        console.log(`Gathering max ${ amount } ${ token } from max ${ limit } addresses, gas price is ${ gasPrice } gwei.`)

        try {
            await gather({ token, amount, limit, gasPrice })
        } catch(err) {
            console.log(`\nError: ${ err.message }`)
        }
    })


program.parse(process.argv)
