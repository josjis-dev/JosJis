/**
 * JosJis Staking
 * Module: Staking Actions
 * Version: V1
 * Network: Polygon Mainnet
 */

import {
    parseUnits
} from "https://esm.sh/ethers@6.15.0";

import {
    CONFIG
} from "./config.js";

import {
    getSignerContracts
} from "./wallet.js";

/* =========================================
   VALIDATE AMOUNT
========================================= */

function validateAmount(amount) {
    if (
        typeof amount !== "string" &&
        typeof amount !== "number"
    ) {
        throw new Error("Invalid JJS amount.");
    }

    const value = String(amount).trim();

    if (!/^\d+(\.\d{1,18})?$/.test(value)) {
        throw new Error("Enter a valid JJS amount.");
    }

    const parsedAmount = parseUnits(
        value,
        CONFIG.decimals
    );

    if (parsedAmount <= 0n) {
        throw new Error("Amount must be greater than zero.");
    }

    return parsedAmount;
}

/* =========================================
   VALIDATE POSITION ID
========================================= */

function validatePositionId(positionId) {
    let id;

    try {
        id = BigInt(positionId);
    } catch {
        throw new Error("Invalid staking position ID.");
    }

    if (id < 0n) {
        throw new Error("Position ID cannot be negative.");
    }

    return id;
}

/* =========================================
   APPROVE JJS
========================================= */

export async function approveJJS(amount) {
    const parsedAmount = validateAmount(amount);

    const {
        tokenContract,
        address
    } = await getSignerContracts();

    const currentAllowance = await tokenContract.allowance(
        address,
        CONFIG.stakingAddress
    );

    if (currentAllowance >= parsedAmount) {
        return {
            approved: true,
            alreadyApproved: true,
            allowance: currentAllowance
        };
    }

    const transaction = await tokenContract.approve(
        CONFIG.stakingAddress,
        parsedAmount
    );

    const receipt = await transaction.wait();

    if (!receipt || receipt.status !== 1) {
        throw new Error("JJS approval transaction failed.");
    }

    return {
        approved: true,
        alreadyApproved: false,
        transactionHash: transaction.hash,
        receipt
    };
}

/* =========================================
   STAKE JJS
========================================= */

export async function stakeJJS(amount, duration) {
    const parsedAmount = validateAmount(amount);

    let parsedDuration;

    try {
        parsedDuration = BigInt(duration);
    } catch {
        throw new Error("Invalid staking duration.");
    }

    if (parsedDuration <= 0n) {
        throw new Error("Staking duration must be greater than zero.");
    }

    const {
        tokenContract,
        stakingContract,
        address
    } = await getSignerContracts();

    const currentAllowance = await tokenContract.allowance(
        address,
        CONFIG.stakingAddress
    );

    if (currentAllowance < parsedAmount) {
        throw new Error(
            "Insufficient JJS allowance. Approve JJS before staking."
        );
    }

    const durationConfig = await stakingContract.durationConfigs(
        parsedDuration
    );

    if (!durationConfig.enabled) {
        throw new Error("This staking duration is not enabled.");
    }

    const paused = await stakingContract.stakingPaused();

    if (paused) {
        throw new Error("Staking is currently paused.");
    }

    const transaction = await stakingContract.stake(
        parsedAmount,
        parsedDuration
    );

    const receipt = await transaction.wait();

    if (!receipt || receipt.status !== 1) {
        throw new Error("Staking transaction failed.");
    }

    let positionId = null;

    for (const log of receipt.logs) {
        try {
            const parsedLog = stakingContract.interface.parseLog(log);

            if (
                parsedLog &&
                parsedLog.name === "Staked" &&
                parsedLog.args.user.toLowerCase() === address.toLowerCase()
            ) {
                positionId = parsedLog.args.id;
                break;
            }
        } catch {
            // Ignore logs that do not belong to the staking contract.
        }
    }

    return {
        success: true,
        positionId,
        transactionHash: transaction.hash,
        receipt
    };
}

/* =========================================
   WITHDRAW PRINCIPAL
========================================= */

export async function withdrawPrincipal(positionId) {
    const id = validatePositionId(positionId);

    const {
        stakingContract,
        address
    } = await getSignerContracts();

    const position = await stakingContract.positions(id);

    if (position.user.toLowerCase() !== address.toLowerCase()) {
        throw new Error("This staking position does not belong to your wallet.");
    }

    if (position.principalWithdrawn) {
        throw new Error("Principal has already been withdrawn.");
    }

    const currentTime = BigInt(
        Math.floor(Date.now() / 1000)
    );

    if (currentTime < position.unlockTime) {
        throw new Error("Staking lock period has not ended.");
    }

    const transaction = await stakingContract.withdrawPrincipal(id);

    const receipt = await transaction.wait();

    if (!receipt || receipt.status !== 1) {
        throw new Error("Principal withdrawal failed.");
    }

    return {
        success: true,
        positionId: id,
        transactionHash: transaction.hash,
        receipt
    };
}

/* =========================================
   CLAIM REWARD
========================================= */

export async function claimReward(positionId) {
    const id = validatePositionId(positionId);

    const {
        stakingContract,
        address
    } = await getSignerContracts();

    const position = await stakingContract.positions(id);

    if (position.user.toLowerCase() !== address.toLowerCase()) {
        throw new Error("This staking position does not belong to your wallet.");
    }

    if (position.rewardClaimed) {
        throw new Error("Reward has already been claimed.");
    }

    if (position.reward <= 0n) {
        throw new Error("This position has no reward to claim.");
    }

    const transaction = await stakingContract.claimReward(id);

    const receipt = await transaction.wait();

    if (!receipt || receipt.status !== 1) {
        throw new Error("Reward claim failed.");
    }

    return {
        success: true,
        positionId: id,
        transactionHash: transaction.hash,
        receipt
    };
}
