JosJis Staking

JosJis Staking is a staking feature within the JosJis Web3 Ecosystem on the Polygon network.

The purpose of this project is to allow JJS holders to lock their tokens in a separate staking smart contract and manage their staking positions through the JosJis website.

Project Status

Version: V1 – Initial Testing
Status: Planning and Development
Network: Polygon
Token: JosJis (JJS)

Directory Structure

member/staking/
├── README.md
├── index.html
├── staking.css
└── staking.js

V1 Features

The initial version focuses on basic staking functionality:

- Connect wallet.
- Display connected wallet address.
- Display JJS wallet balance.
- Approve JJS spending for the staking contract.
- Stake JJS tokens.
- Display staked JJS balance.
- Withdraw JJS after the lock period expires.
- Display staking transaction information.

Initial Staking Rules

- Initial lock period: 7 days.
- Users can create staking positions.
- Staked JJS cannot be withdrawn before maturity.
- No automatic renewal.
- The principal is returned after the lock period.
- No new JJS tokens are minted.

Reward System

The reward system will not be activated during the initial staking test.

A future version may introduce:

- JJS staking rewards.
- A funded reward pool.
- Exclusive staking membership benefits.
- Community participation privileges.

All rewards must be backed by available JJS allocations. Rewards are not guaranteed.

Smart Contract

The staking contract will be separate from the official JosJis token contract.

The main JJS token contract will not be modified.

The staking contract must be tested on a test network before any mainnet deployment.

Security Considerations

- Never request or store users' private keys or seed phrases.
- Use wallet signatures for transactions.
- Verify the staking contract address before interacting.
- Protect staked principal from unauthorized withdrawal.
- Test staking, approval, lock periods, and withdrawals before mainnet deployment.

Official JJS Token

Network: Polygon Mainnet

Contract Address:

"0x52C8Ff13ada1431376b3E77E8219b644805122dF"

Website

https://josjis-dev.github.io/josjis/

Important Notice

This project is under development.

Do not send JJS directly to the staking contract address. Always use the official staking interface and verify the contract address before making transactions.

The initial version is intended for testing and development, not public staking with real funds.
