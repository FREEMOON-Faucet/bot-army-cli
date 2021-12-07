import { program } from "commander/esm.mjs"

program
    .option("-n | --name <string>", "user full name", "johnny")
    .option("-a | --age <number>", "user age", 23)
    .parse(process.argv)

const options = program.opts()
console.log(options.name, typeof options.name)
console.log(options.age, typeof options.age)


