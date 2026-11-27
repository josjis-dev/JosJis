JosJis Staking Modules

This directory contains the modular JavaScript components used by the JosJis Staking application.

Module Structure

File| Responsibility
"config.js"| Contract addresses, ABIs, network settings, and staking configuration
"wallet.js"| Reown AppKit wallet connection, provider management, and signer
"contracts.js"| Smart contract initialization and read-only contract interactions
"staking-actions.js"| Stake, approve, withdraw principal, and claim reward transactions
"positions.js"| Staking position retrieval, event scanning, and position data
"dashboard.js"| Dashboard statistics, balance display, and staking interface updates
"helpers.js"| Shared utility functions, formatting, validation, and error handling

Main Application

The main entry point is:

"../staking.js"

It coordinates the modules and initializes the staking application.

Dependencies

- Ethers.js 6.15.0
- Reown AppKit
- JosJis ERC-20 Token on Polygon
- JosJis Staking Smart Contract on Polygon
- Shared Web3 configuration: "../../web3/web3-config.js"
- Shared core utilities: "../../assets/js/core/"

Network Configuration

- Network: Polygon Mainnet
- Chain ID: 137
- Token: JosJis (JJS)

Development Rules

1. Keep module responsibilities separate.
2. Use ES Modules ("import" and "export").
3. Avoid duplicate wallet or AppKit initialization.
4. Keep shared Web3 configuration unchanged.
5. Preserve existing staking functionality.
6. Do not modify smart contract addresses without verification.
7. Test read-only functions before performing transactions.
8. Never execute staking transactions automatically.

Security

All transaction requests must require explicit user interaction and wallet confirmation.

Never expose private keys, seed phrases, or sensitive wallet data.
