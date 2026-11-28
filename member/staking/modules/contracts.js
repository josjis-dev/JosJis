
/**
 * JosJis Staking
 * Module: Contracts
 * Version: V4
 * Network: Polygon Mainnet
 */

import {
    Contract,
    JsonRpcProvider
} from "https://esm.sh/ethers@6.15.0";

import {
    CONFIG,
    TOKEN_ABI,
    STAKING_ABI
} from "./config.js";

/* =========================================
   PUBLIC READ-ONLY RPC
========================================= */

const PUBLIC_RPC_URL =
    "https://polygon-bor-rpc.publicnode.com";

const rpcProvider = new JsonRpcProvider(
    PUBLIC_RPC_URL,
    CONFIG.chainId
);

/* =========================================
   ERROR HANDLER
========================================= */

function getRpcErrorMessage(error) {
    return (
        error?.info?.error?.message ||
        error?.error?.message ||
        error?.shortMessage ||
        error?.reason ||
        error?.message ||
        "Unknown RPC error."
    );
}

async function readWithLabel(label, callback) {
    try {
        return await callback();
    } catch (error) {
        console.error(
            `[Contracts V4] ${label} failed:`,
            error
        );

        throw new Error(
            `${label}: ${getRpcErrorMessage(error)}`
        );
    }
}

/* =========================================
   PROVIDER VALIDATION
========================================= */

export function getRpcProvider() {
    if (!rpcProvider) {
        throw new Error(
            "Polygon RPC provider is unavailable."
        );
    }

    if (
        typeof rpcProvider.getNetwork !== "function"
    ) {
        throw new Error(
            "Invalid RPC provider: getNetwork() unavailable."
        );
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
            provider,
            tokenContract,
            stakingContract
        } = getReadContracts();

        const network = await readWithLabel(
            "RPC network",
            () => provider.getNetwork()
        );

        if (Number(network.chainId) !== CONFIG.chainId) {
            throw new Error(
                "RPC provider is not connected to Polygon Mainnet."
            );
        }

        const tokenCode = await readWithLabel(
            "JJS contract bytecode",
            () => provider.getCode(CONFIG.tokenAddress)
        );

        if (!tokenCode || tokenCode === "0x") {
            throw new Error(
                "JJS token contract was not found at the configured address."
            );
        }

        const stakingCode = await readWithLabel(
            "Staking contract bytecode",
            () => provider.getCode(CONFIG.stakingAddress)
        );

        if (!stakingCode || stakingCode === "0x") {
            throw new Error(
                "Staking contract was not found at the configured address."
            );
        }

        const stakingTokenAddress = await readWithLabel(
            "stakingToken()",
            () => stakingContract.stakingToken()
        );

        const paused = await readWithLabel(
            "stakingPaused()",
            () => stakingContract.stakingPaused()
        );

        const availableRewards = await readWithLabel(
            "availableRewards()",
            () => stakingContract.availableRewards()
        );

        if (
            stakingTokenAddress.toLowerCase() !==
            CONFIG.tokenAddress.toLowerCase()
        ) {
            throw new Error(
                "Staking contract is connected to an unexpected JJS token."
            );
        }

        return {
            valid: true,
            chainId: Number(network.chainId),
            paused,
            availableRewards,
            stakingTokenAddress,
            tokenAddress: await tokenContract.getAddress()
        };

    } catch (error) {
        console.error(
            "[Contracts V4] Contract validation failed:",
            error
        );

        return {
            valid: false,
            error: getRpcErrorMessage(error)
        };
    }
}

/* =========================================
   READ STAKING STATUS
========================================= */

export async function getStakingStatus() {
    const {
        provider,
        stakingContract
    } = getReadContracts();

    const network = await readWithLabel(
        "Staking status network",
        () => provider.getNetwork()
    );

    if (Number(network.chainId) !== CONFIG.chainId) {
        throw new Error(
            "RPC provider is not connected to Polygon Mainnet."
        );
    }

    const paused = await readWithLabel(
        "stakingPaused()",
        () => stakingContract.stakingPaused()
    );

    const availableRewards = await readWithLabel(
        "availableRewards()",
        () => stakingContract.availableRewards()
    );

    const totalStaked = await readWithLabel(
        "totalStaked()",
        () => stakingContract.totalStaked()
    );

    const totalReservedRewards = await readWithLabel(
        "totalReservedRewards()",
        () => stakingContract.totalReservedRewards()
    );

    const nextPositionId = await readWithLabel(
        "nextPositionId()",
        () => stakingContract.nextPositionId()
    );

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

    const result = await readWithLabel(
        `durationConfigs(${duration})`,
        () => stakingContract.durationConfigs(
            BigInt(duration)
        )
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

    const position = await readWithLabel(
        `positions(${positionId})`,
        () => stakingContract.positions(
            BigInt(positionId)
        )
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
        throw new Error(
            "Wallet address is required."
        );
    }

    const { tokenContract } = getReadContracts();

    return await readWithLabel(
        "JJS balanceOf()",
        () => tokenContract.balanceOf(walletAddress)
    );
}

/* =========================================
   READ TOKEN ALLOWANCE
========================================= */

export async function getJJSAllowance(walletAddress) {
    if (!walletAddress) {
        throw new Error(
            "Wallet address is required."
        );
    }

    const { tokenContract } = getReadContracts();

    return await readWithLabel(
        "JJS allowance()",
        () => tokenContract.allowance(
            walletAddress,
            CONFIG.stakingAddress
        )
    );
}
