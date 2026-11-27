/**
 * JosJis Staking
 * Module: Contracts
 * Version: V1
 * Network: Polygon Mainnet
 */

import { Contract } from "https://esm.sh/ethers@6.15.0";

import {
    CONFIG,
    TOKEN_ABI,
    STAKING_ABI
} from "./config.js";

import {
    rpcProvider
} from "../../web3/web3-config.js";

/* =========================================
   PROVIDER VALIDATION
========================================= */

export function getRpcProvider() {
    if (!rpcProvider) {
        throw new Error("Polygon RPC provider is unavailable.");
    }

    return rpcProvider;
}

/* =========================================
   READ-ONLY CONTRACTS
========================================= */

export function getReadContracts() {
    const provider = getRpcProvider();

    const tokenContract = new Contract(
        CONFIG.tokenAddress,
        TOKEN_ABI,
        provider
    );

    const stakingContract = new Contract(
        CONFIG.stakingAddress,
        STAKING_ABI,
        provider
    );

    return {
        provider,
        tokenContract,
        stakingContract
    };
}

/* =========================================
   VALIDATE STAKING CONTRACT
========================================= */

export async function validateStakingContract() {
    try {
        const {
            tokenContract,
            stakingContract
        } = getReadContracts();

        const [
            stakingTokenAddress,
            paused,
            availableRewards
        ] = await Promise.all([
            stakingContract.stakingToken(),
            stakingContract.stakingPaused(),
            stakingContract.availableRewards()
        ]);

        const expectedToken = CONFIG.tokenAddress.toLowerCase();

        const actualToken = stakingTokenAddress.toLowerCase();

        if (actualToken !== expectedToken) {
            throw new Error(
                "Staking contract is connected to an unexpected token."
            );
        }

        return {
            valid: true,
            paused,
            availableRewards,
            stakingTokenAddress,
            tokenAddress: await tokenContract.getAddress()
        };

    } catch (error) {
        console.error("Staking contract validation failed:", error);

        return {
            valid: false,
            error: error?.message || "Contract validation failed."
        };
    }
}

/* =========================================
   READ STAKING STATUS
========================================= */

export async function getStakingStatus() {
    const { stakingContract } = getReadContracts();

    const [
        paused,
        availableRewards,
        totalStaked,
        totalReservedRewards,
        nextPositionId
    ] = await Promise.all([
        stakingContract.stakingPaused(),
        stakingContract.availableRewards(),
        stakingContract.totalStaked(),
        stakingContract.totalReservedRewards(),
        stakingContract.nextPositionId()
    ]);

    return {
        paused,
        availableRewards,
        totalStaked,
        totalReservedRewards,
        nextPositionId
    };
}

/* =========================================
   READ DURATION CONFIGURATION
========================================= */

export async function getDurationConfig(duration) {
    const { stakingContract } = getReadContracts();

    const result = await stakingContract.durationConfigs(
        BigInt(duration)
    );

    return {
        rewardBps: result.rewardBps,
        enabled: result.enabled
    };
}

/* =========================================
   READ USER POSITION
========================================= */

export async function getPosition(positionId) {
    const { stakingContract } = getReadContracts();

    const position = await stakingContract.positions(
        BigInt(positionId)
    );

    return {
        user: position.user,
        amount: position.amount,
        reward: position.reward,
        unlockTime: position.unlockTime,
        principalWithdrawn: position.principalWithdrawn,
        rewardClaimed: position.rewardClaimed
    };
}

/* =========================================
   READ TOKEN BALANCE
========================================= */

export async function getJJSBalance(walletAddress) {
    if (!walletAddress) {
        throw new Error("Wallet address is required.");
    }

    const { tokenContract } = getReadContracts();

    return await tokenContract.balanceOf(walletAddress);
}

/* =========================================
   READ TOKEN ALLOWANCE
========================================= */

export async function getJJSAllowance(walletAddress) {
    if (!walletAddress) {
        throw new Error("Wallet address is required.");
    }

    const { tokenContract } = getReadContracts();

    return await tokenContract.allowance(
        walletAddress,
        CONFIG.stakingAddress
    );
}
