#!/usr/bin/env node

const commander = require("commander")
const program = new commander.Command()
const {
    subscribe,
    claim,
    pubKeys,
    privKeys,
    balances,
    subCount,
    transfer
} = require("./freemoon.js")


const myParseInt = (value) => {
    const parsedValue = parseInt(value, 10)
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
    .argument("[gasPrice]", "gas price in gwei", myParseInt, 2)
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
    .argument("[gasPrice]", "gas price in gwei", myParseInt, 2)
    .argument("[batchSize]", "max transactions submitted per second", myParseInt, 5)
    .description("Total number of bots to claim for every hour, if they have not claimed already")
    .action(async (limit, gasPrice, batchSize) => {
        console.log(`Claiming for ${ limit } bots per hour, gas price is ${ gasPrice } gwei, ${ batchSize } requests per second.`)

        let claiming
        
        try {
            await claim({ limit, gasPrice, batchSize })
            // console.log(`Claims complete. Waiting until ${ new Date(Date.now()) } for next claim ...`)
            claiming = setInterval(async () => {
                await claim({ limit, gasPrice, batchSize })
                // console.log(`Claims complete. Waiting until ${ new Date(Date.now()) } for next claim ...`)
            }, 3601000)
        } catch(err) {
            clearInterval(claiming)
            console.log(`\nError: ${ err.message }`)
        }
    })

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
    .argument("[gasPrice]", "gas price in gwei", myParseInt, 2)
    .description("Transfer either FSN, FREE, or FMN from & to specified adderss indices.")
    .action(async (token, amount, to, from, gasPrice) => {
        console.log(`Transferring ${ amount } ${ token } from address ${ from } to address ${ to }, gas price is ${ gasPrice } gwei.`)

        try {
            await transfer({ token, amount, to, from, gasPrice })
        } catch(err) {
            console.log(`\nError: ${ err.message }`)
        }
    })


program.parse(process.argv)
