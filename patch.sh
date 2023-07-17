#!/bin/bash

# Patch script to get compatible version of bb.js

# Clone the barretenberg repository
git clone https://github.com/AztecProtocol/barretenberg.git

# Build the barretenberg cpp library to wasm
cd barretenberg/cpp
./bootstap.sh
cmake --install build

# Build the bb.js library
cd ../ts
yarn build

# move to node_js folder
cd ../..
mv barretenberg/ts/dest/ node_modules/bb.js
