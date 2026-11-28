
/**
 * JosJis Staking
 * Module: Staking Actions
 * Version: V6
 * Network: Polygon Mainnet
 *
 * READ:
 * Public Polygon RPC
 *
 * WRITE:
 * MetaMask Signer through Core Transaction Manager
 */

import {
    Contract,
    JsonRpcProvider,
    parseUnits,
    formatUnits
} from "https://esm.sh/ethers@6.15.0";

import {
    CONFIG,
    TOKEN_ABI,
    STAKING_ABI
} from "./config.js";

import {
    getWalletSigner
} from "../../../assets/js/core/transaction-manager.js";

/* =========================================
   PUBLIC READ RPC
========================================= */

const READ_RPC_URL =
    "https://polygon-bor-rpc.publicnode.com";

const readProvider = new JsonRpcProvider(
    READ_RPC_URL,
    CONFIG.chainId
);

/* =========================================
   READ-ONLY CONTRACT INSTANCES
========================================= */

const tokenReadContract = new Contract(
    CONFIG.tokenAddress,
    TOKEN_ABI,
    readProvider
);

const stakingReadContract = new Contract(
    CONFIG.stakingAddress,
    STAKING_ABI,
    readProvider
);

/* =========================================
   CONTRACT INSTANCES
   SIGNER USED ONLY FOR TRANSACTIONS
========================================= */

async function getSignerContracts() {
    const signer = await getWalletSigner();

    const address = await signer.getAddress();

    const tokenContract = new Contract(
        CONFIG.tokenAddress,
        TOKEN_ABI,
        signer
    );

    const stakingContract = new Contract(
        CONFIG.stakingAddress,
        STAKING_ABI,
        signer
    );

    return {
        signer,
        address,
        tokenContract,
        stakingContract
    };
}

/* =========================================
   ERROR FORMATTER
========================================= */

function serializeError(error) {
    const details = {
        message: error?.message || null,
        code: error?.code || null,
        shortMessage: error?.shortMessage || null,
        reason: error?.reason || null,
        action: error?.action || null,
        method: error?.method || null,
        data: error?.data || null,
        info: error?.info || null,
        nestedError: error?.info?.error || null
    };

    return JSON.stringify(
        details,
        (_, value) =>
            typeof value === "bigint"
                ? value.toString()
                : value
    );
}

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
        throw new Error(
            "Amount must be greater than zero."
        );
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
        throw new Error(
            "Invalid staking position ID."
        );
    }

    if (id < 0n) {
        throw new Error(
            "Position ID cannot be negative."
        );
    }

    return id;
}

/* =========================================
   CHECK READ RPC NETWORK
========================================= */

async function validateReadNetwork() {
    const network = await readProvider.getNetwork();

    if (Number(network.chainId) !== CONFIG.chainId) {
        throw new Error(
            "Wrong read RPC network: " + network.chainId
        );
    }

    return network;
}

/* =========================================
   READ JJS BALANCE & ALLOWANCE
   READ-ONLY: NO TRANSACTION
========================================= */

export async function getJJSWalletStatus() {
    let stage = "START";

    try {
        stage = "GET_WALLET_SIGNER";

        const signer = await getWalletSigner();

        const address = await signer.getAddress();

        stage = "CHECK_NETWORK";

        const network = await validateReadNetwork();

        stage = "CHECK_TOKEN_CODE";

        const tokenCode = await readProvider.getCode(
            CONFIG.tokenAddress
        );

        if (!tokenCode || tokenCode === "0x") {
            throw new Error(
                "JJS token contract code not found."
            );
        }

        stage = "CHECK_STAKING_CODE";

        const stakingCode = await readProvider.getCode(
            CONFIG.stakingAddress
        );

        if (!stakingCode || stakingCode === "0x") {
            throw new Error(
                "Staking contract code not found."
            );
        }

        stage = "READ_BALANCE";

        const balance = await tokenReadContract.balanceOf(
            address
        );

        stage = "READ_ALLOWANCE";

        const allowance = await tokenReadContract.allowance(
            address,
            CONFIG.stakingAddress
        );

        stage = "COMPLETE";

        return {
            address,

            tokenAddress: CONFIG.tokenAddress,
            stakingAddress: CONFIG.stakingAddress,

            balance,
            allowance,

            formattedBalance: formatUnits(
                balance,
                CONFIG.decimals
            ),

            formattedAllowance: formatUnits(
                allowance,
                CONFIG.decimals
            ),

            hasBalance: balance > 0n,
            hasAllowance: allowance > 0n,

            network: Number(network.chainId),

            tokenCodeValid: true,
            stakingCodeValid: true,

            diagnosticStage: stage
        };

    } catch (error) {
        console.error(
            "[JJS WALLET STATUS DIAGNOSTIC]",
            {
                stage,
                error
            }
        );

        throw new Error(
            "JJS diagnostic failed at " +
            stage +
            ": " +
            serializeError(error)
        );
    }
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

    // Read allowance through public RPC.
    const currentAllowance =
        await tokenReadContract.allowance(
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

    // Transaction through MetaMask signer.
    const transaction = await tokenContract.approve(
        CONFIG.stakingAddress,
        parsedAmount
    );

    const receipt = await transaction.wait();

    if (!receipt || receipt.status !== 1) {
        throw new Error(
            "JJS approval transaction failed."
        );
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
        throw new Error(
            "Invalid staking duration."
        );
    }

    if (parsedDuration <= 0n) {
        throw new Error(
            "Staking duration must be greater than zero."
        );
    }

    const {
        stakingContract,
        address
    } = await getSignerContracts();

    // Read allowance through public RPC.
    const currentAllowance =
        await tokenReadContract.allowance(
            address,
            CONFIG.stakingAddress
        );

    if (currentAllowance < parsedAmount) {
        throw new Error(
            "Insufficient JJS allowance. Approve JJS before staking."
        );
    }

    // Read staking configuration through public RPC.
    const durationConfig =
        await stakingReadContract.durationConfigs(
            parsedDuration
        );

    if (!durationConfig.enabled) {
        throw new Error(
            "This staking duration is not enabled."
        );
    }

    const paused =
        await stakingReadContract.stakingPaused();

    if (paused) {
        throw new Error(
            "Staking is currently paused."
        );
    }

    // Transaction through MetaMask signer.
    const transaction = await stakingContract.stake(
        parsedAmount,
        parsedDuration
    );

    const receipt = await transaction.wait();

    if (!receipt || receipt.status !== 1) {
        throw new Error(
            "Staking transaction failed."
        );
    }

    let positionId = null;

    for (const log of receipt.logs) {
        try {
            const parsedLog =
                stakingContract.interface.parseLog(log);

            if (
                parsedLog &&
                parsedLog.name === "Staked" &&
                parsedLog.args.user.toLowerCase() ===
                    address.toLowerCase()
            ) {
                positionId = parsedLog.args.id;
                break;
            }
        } catch {
            // Ignore logs from other contracts.
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

    // Read position through public RPC.
    const position = await stakingReadContract.positions(id);

    if (
        position.user.toLowerCase() !==
        address.toLowerCase()
    ) {
        throw new Error(
            "This staking position does not belong to your wallet."
        );
    }

    if (position.principalWithdrawn) {
        throw new Error(
            "Principal has already been withdrawn."
        );
    }

    const currentTime = BigInt(
        Math.floor(Date.now() / 1000)
    );

    if (currentTime < position.unlockTime) {
        throw new Error(
            "Staking lock period has not ended."
        );
    }

    // Transaction through MetaMask signer.
    const transaction =
        await stakingContract.withdrawPrincipal(id);

    const receipt = await transaction.wait();

    if (!receipt || receipt.status !== 1) {
        throw new Error(
            "Principal withdrawal failed."
        );
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

    // Read position through public RPC.
    const position = await stakingReadContract.positions(id);

    if (
        position.user.toLowerCase() !==
        address.toLowerCase()
    ) {
        throw new Error(
            "This staking position does not belong to your wallet."
        );
    }

    if (position.rewardClaimed) {
        throw new Error(
            "Reward has already been claimed."
        );
    }

    if (position.reward <= 0n) {
        throw new Error(
            "This position has no reward to claim."
        );
    }

    // Transaction through MetaMask signer.
    const transaction =
        await stakingContract.claimReward(id);

    const receipt = await transaction.wait();

    if (!receipt || receipt.status !== 1) {
        throw new Error(
            "Reward claim failed."
        );
    }

    return {
        success: true,
        positionId: id,
        transactionHash: transaction.hash,
        receipt
    };
}
