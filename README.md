# bot-army-cli

## Web App

Visit the [FREEMOON Faucet](https://freemoonfaucet.xyz) smart contract platform today!

For more info and to learn about the FREEMOON Faucet, visit https://www.freemoon.info.

## Update

Run ```npm update``` locally to update to the latest version.

## Installation and Setup

### Intro

This guide assumes you have access to a basic Ubuntu VPS such as from Contabo (tested on 20.04 and above). Although a VPS is not necessary, it allows for 24/7 runtime with minimal cost.

It also assumes you have a secure 12-word seed phrase and a balance of FSN in the 0 index address, to pay for gas and to subscribe bots.

### Make FREEMOON Folder

Create a folder to install the bot army:

```bash
mkdir ~/Freemoon
cd ~/Freemoon
```

### Dependencies

Install curl, which is used to download other dependencies:

```bash
sudo apt install curl
```

In order to run the bot army, NodeJS, NPM, and NPX must be installed. The easiest way to do this is to install [Node Version Manager](https://github.com/nvm-sh/nvm). Please note that this link has the latest instructions on installation. At the time of writing, version 17 of node had problems, so 16 is used here:

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.1/install.sh | bash
source ~/.bashrc
nvm install 16.3.0
```

To verify that each dependency is installed, ensure that the version is visible:

```bash
node -v
npm -v
npx -v
```

Finally, install [Tmux](https://www.howtogeek.com/671422/how-to-use-tmux-on-linux-and-why-its-better-than-screen/), which is required in order to run the FREEMOON Bot Army as a background process, allowing you to detach from VPS:

```bash
sudo apt install tmux
```

### Install Bot Army

Install the FREEMOON Bot Army along with dependencies locally:

```bash
npm install bot-army-cli
```

### Open a Background Process Window

Run ```tmux``` to open a background process window, then run ```Ctrl + B``` followed by ```$``` to set the name of the session to "bot-army".

### Set Environmental Variables

To set environmental variables, allow the start script to be executable, then run it:

```bash
sudo chmod +x node_modules/bot-army-cli/start.sh
. node_modules/bot-army-cli/start.sh
```

Enter your 12-word seed phrase, followed by your preferred Fusion RPC gateway (defaults to https://mainway.freemoon.xyz/gate).

If you need to re-enter the seed phrase or the provider URL, just run the second command again.

### Exit the Session

You can now run the Bot Army from the command line. In order to detach from the session (thus allowing you to run 24/7), run ```Ctrl + B``` followed by ```d```. You can view the process running at any time, by running:

```bash
tmux ls
```

In order to reattach the session, run this command with whatever you named the session, in our case "bot-army":

```bash
tmux attach-session -t bot-army
```

## Usage

### Intro

Make sure you are attached to the bot-army-cli session with environmental variables set.

### Help

To display commands and their arguments, run:

```bash
npx freemoon --help
```

### Public Keys

```bash
npx freemoon pubKeys 23
```

This command will display the public keys of each bot in your army. This is derived from your seed phrase, so are always the same. In this example, 23 is specified as the number of keys to display, but defaults to displaying 10.

### Private Keys

```bash
npx freemoon privKeys 5
```

It may be desirable to add bots to MetaMask, for which you will need to import the private keys. This command will do that. In this example, 5 is specified as the number of private keys to display, but defaults to 10.

It is worth importing the 0 index base address from your army, for ease of viewing the balances of FSN, FREE and possible FMN. You can top this account up with FSN for gas.

### FSN & FREE Balances

```bash
npx freemoon balances 8
```

This will display the FSN and FREE balances of the first 8 bots, but any number of bots can be viewed.

### Count Subscribed Bots

```bash
npx freemoon subCount 100
```

This will count the number of already subscribed addresses up to an upper limit of 10 times the number inputted, in this case 100, so the upper limit for counting will be 1000.

### Subscribe

```bash
npx freemoon subscribe 100 3 3
```

To subscribe bots to the army, run this command with the number of bots to subscribe. The other two arguments are optional, defaulting to 2 gwei as the gas price and 5 requests per second. In this example, the user wishes to subscribe up to the 100th bot in the army, with 3 gwei as the gas price to be safe and 3 requests per second. If there are bots already subscribed up to this limit, they are ignored.

### Transfer

```bash
npx freemoon transfer FSN 0.5 5 1 4
```

Run this command to transfer balances of either FSN, FREE, or FMN between bot army addresses. The first argument is the token to transfer. It can be either FSN, FREE, or FMN. The second argument is the amount to transfer. The third argument is the index of the destination address, and the fourth is the source address, defaulting to 1, the base address. The final argument is the gas price for the transaction, defaulting once again to 2 gwei.

### Claim

```bash
npx freemoon claim 100 3 5
```

This command starts the claim process for your bot army. The first argument is the number of subscribed bots to employ per hour. The second argument specifies the gas price in gwei, defaulting to 2 gwei, and the third argument is the requests to make per second, defaulting to 5.

### Distribute

```bash
npx freemoon distribute FREE 10000 10 3
```

The distribute function allows you to batch transfer an amount of either FSN, FREE, or FMN from the base address up to a specified number of bot addresses. The first argument is the token to distribute, either FSN, FREE, or FMN. Please ensure you have the funds necessary in your base address. The second argument is the amount to transfer to each address. The third argument is the number of addresses to distribute this amount to each, so if an address already has the amount specified or more, it will get ignored, otherwise it will get filled UP TO that amount. The final argument is the gas price to use, defaulting to 2 gwei.

In the example above, the user wishes to distribute 10 000 FREE to each address up to the 10th, with a gas price of 3 gwei.

NB: The base address is not counted as a recipient of the distribution.

### Gather

```bash
npx freemoon gather FSN 0.5 20 2
```

The gather function allows you to batch transfer either FSN, FREE, or FMN from a specified limit of bot addresses, leaving a set balance on each address.

In the example, the user wishes to gather all FSN from the first 20 addresses (to the base address), leaving 0.5 FSN on each address. If an address has 0.5 FSN or less plus some for gas, it is ignored, otherwise the surplus above 0.5 FSN is transferred to base address.

The first argument is the token, either FSN, FREE, or FMN. The second argument is the amount to leave in each address. The third argument is the number of addresses to gather from. Keep in mind although it says the first 20 addresses, the base address is ignored as it is the receiver of the gathered funds. The final argument is the gas price, defaulting to 2 gwei.

NB: The base address is not counted as an address to be gathered from.

## Management of Bot Army

- Occasionally you will need to add FSN to the base address, in order to pay for gas. If there isn't enough gas, the bot will close and need to be restarted.

- The FREE balance will build up on the base address. You can transfer FREE from the base address to the other bots to increase the chance of winning. You do not need to stop your bot army to do this, just open another console window on your VPS.

- You will need to restart the bot to increase the number of bots you are claiming for.

- If your VPS reboots for any reason, you will need to restart the bot army.

- Over time, there will be a FREE balance built up on the base address, which can be used to supply a new bot in the army with increased odds of winning FMN. In this case, periodically the user can subscribe new addresses. Use the distribute command to fund the new addresses with FREE. If you wish to gather all the FREE, use the gather command but keep in mind you will need to distribute a small amount of FSN to each address for gas first.
