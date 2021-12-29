const commander = require("commander")
const program = new commander.Command()
const {
    subscribe,
    claim,
    pubKeys,
    privKeys,
    balances,
    subCount
} = require("./freemoon.js")


const myParseInt = (value) => {
    const parsedValue = parseInt(value, 10)
    if(isNaN(parsedValue)) throw new commander.InvalidArgumentError("Not a number.")
    return parsedValue
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
    .argument("<limit>", "max value")
    .argument("[gasPrice]", "gas price in gwei", myParseInt, 2)
    .argument("[batchSize]", "max transactions submitted per second", myParseInt, 5)
    .description("Total number of bots to claim every hour")
    .action((limit, gasPrice, batchSize) => claim({ limit, gasPrice, batchSize }))

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


program.parse(process.argv)
