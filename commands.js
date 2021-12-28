const commander = require("commander")
const program = new commander.Command()
const {
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

program
    .version("1.0.0")
    .description("The FREEMOON Faucet Bot Army Command Line Interface")

program
    .command("pubKeys")
    .argument("[limit]", "max value", myParseInt, 10)
    .description("Display specified number of public keys of bot army")
    .action((limit) => pubKeys({ limit }))

program
    .command("privKeys")
    .argument("[limit]", "max value", myParseInt, 10)
    .description("Display specified number of private keys of bot army")
    .action((limit) => privKeys({ limit }))


program.parse(process.argv)
