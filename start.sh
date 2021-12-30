#! /bin/bash

read -p "Please enter your bot army 12-word seed phrase: " MNEMONIC
read -p "Please enter your preferred Fusion RPC gateway (optional): " PROVIDER

export MNEMONIC=$MNEMONIC

if [[ -z $PROVIDER ]]; then
    export PROVIDER="https://mainway.freemoon.xyz/gate";
fi

echo "Seed phrase set to \"$MNEMONIC"\";
echo "Provider set to \"$PROVIDER"\";
