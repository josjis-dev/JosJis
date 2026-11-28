
/**
 * JosJis Staking
 * Module: Positions
 * Version: V2
 * Network: Polygon Mainnet
 */

import {
    CONFIG
} from "./config.js";

import {
    getReadContracts
} from "./contracts.js";

import {
    formatJJS,
    formatDate,
    formatCountdown
} from "./helpers.js";

/* =========================================
   SCAN CONFIGURATION
========================================= */

const EVENT_SCAN_CHUNK_SIZE = 2000;

/*
 * Cache event scan results to reduce repeated RPC requests.
 * Cache is separated by wallet address and starting block.
 */

const positionIdsCache = new Map();

const CACHE_DURATION = 15000;

/* =========================================
   VALIDATE ADDRESS
========================================= */

function validateAddress(address) {
    if (
        typeof address !== "string" ||
        !/^0x[a-fA-F0-9]{40}$/.test(address)
    ) {
        throw new Error("Invalid wallet address.");
    }
}

/* =========================================
   READ POSITION
========================================= */

export async function getPositionDetails(positionId) {
    const { stakingContract } = getReadContracts();

    const id = BigInt(positionId);

    if (id < 0n) {
        throw new Error("Invalid position ID.");
    }

    const position = await stakingContract.positions(id);

    return {
        id,
        user: position.user,
        amount: position.amount,
        reward: position.reward,
        unlockTime: position.unlockTime,
        principalWithdrawn: position.principalWithdrawn,
        rewardClaimed: position.rewardClaimed
    };
}

/* =========================================
   FORMAT POSITION
========================================= */

export function formatPosition(position) {
    const now = Math.floor(Date.now() / 1000);
    const unlockTime = Number(position.unlockTime);

    const unlocked = now >= unlockTime;

    return {
        id: position.id.toString(),
        user: position.user,
        amount: position.amount,
        reward: position.reward,

        amountFormatted: formatJJS(position.amount),
        rewardFormatted: formatJJS(position.reward),

        unlockTime: position.unlockTime,
        unlockDate: formatDate(position.unlockTime),

        principalWithdrawn: position.principalWithdrawn,
        rewardClaimed: position.rewardClaimed,

        unlocked,
        countdown: unlocked
            ? "Unlocked"
            : formatCountdown(position.unlockTime),

        canWithdraw:
            unlocked &&
            !position.principalWithdrawn,

        canClaim:
            !position.rewardClaimed &&
            position.reward > 0n
    };
}

/* =========================================
   GET USER POSITION IDS FROM EVENTS
========================================= */

export async function getUserPositionIds(
    walletAddress,
    fromBlock = 0
) {
    validateAddress(walletAddress);

    const { provider, stakingContract } = getReadContracts();

    const startBlock = Number(fromBlock);

    if (
        !Number.isSafeInteger(startBlock) ||
        startBlock < 0
    ) {
        throw new Error("Invalid starting block.");
    }

    const latestBlock = await provider.getBlockNumber();

    if (startBlock > latestBlock) {
        throw new Error("Invalid starting block.");
    }

    const normalizedAddress = walletAddress.toLowerCase();

    const cacheKey =
        `${normalizedAddress}:${startBlock}`;

    const cached = positionIdsCache.get(cacheKey);

    /*
     * Use cached results only when the latest block
     * has not changed and cache has not expired.
     */

    if (
        cached &&
        cached.latestBlock === latestBlock &&
        Date.now() - cached.timestamp < CACHE_DURATION
    ) {
        return cached.ids.map(id => BigInt(id));
    }

    const filter = stakingContract.filters.Staked(
        null,
        walletAddress
    );

    const positionIds = new Set();

    for (
        let start = startBlock;
        start <= latestBlock;
        start += EVENT_SCAN_CHUNK_SIZE
    ) {
        const end = Math.min(
            start + EVENT_SCAN_CHUNK_SIZE - 1,
            latestBlock
        );

        const events = await stakingContract.queryFilter(
            filter,
            start,
            end
        );

        for (const event of events) {
            if (event.args?.id !== undefined) {
                positionIds.add(
                    event.args.id.toString()
                );
            }
        }
    }

    const sortedIds = Array.from(positionIds)
        .map(id => BigInt(id))
        .sort((a, b) => a < b ? -1 : a > b ? 1 : 0);

    positionIdsCache.set(cacheKey, {
        ids: sortedIds.map(id => id.toString()),
        latestBlock,
        timestamp: Date.now()
    });

    return sortedIds;
}

/* =========================================
   GET USER POSITIONS
========================================= */

export async function getUserPositions(
    walletAddress,
    fromBlock = 0
) {
    validateAddress(walletAddress);

    const ids = await getUserPositionIds(
        walletAddress,
        fromBlock
    );

    const positions = await Promise.all(
        ids.map(id => getPositionDetails(id))
    );

    return positions
        .filter(position =>
            position.user.toLowerCase() ===
            walletAddress.toLowerCase()
        )
        .map(formatPosition);
}

/* =========================================
   GET ACTIVE POSITIONS
========================================= */

export async function getActivePositions(
    walletAddress,
    fromBlock = 0
) {
    const positions = await getUserPositions(
        walletAddress,
        fromBlock
    );

    return positions.filter(position =>
        !position.principalWithdrawn ||
        !position.rewardClaimed
    );
}

/* =========================================
   GET WITHDRAWABLE POSITIONS
========================================= */

export async function getWithdrawablePositions(
    walletAddress,
    fromBlock = 0
) {
    const positions = await getUserPositions(
        walletAddress,
        fromBlock
    );

    return positions.filter(position =>
        position.canWithdraw
    );
}

/* =========================================
   GET CLAIMABLE POSITIONS
========================================= */

export async function getClaimablePositions(
    walletAddress,
    fromBlock = 0
) {
    const positions = await getUserPositions(
        walletAddress,
        fromBlock
    );

    return positions.filter(position =>
        position.canClaim
    );
}

/* =========================================
   GET POSITION SUMMARY
========================================= */

export async function getPositionSummary(
    walletAddress,
    fromBlock = 0
) {
    const positions = await getUserPositions(
        walletAddress,
        fromBlock
    );

    let totalStaked = 0n;
    let totalRewards = 0n;
    let totalWithdrawn = 0;
    let totalClaimed = 0;

    for (const position of positions) {
        if (!position.principalWithdrawn) {
            totalStaked += position.amount;
        } else {
            totalWithdrawn++;
        }

        if (!position.rewardClaimed) {
            totalRewards += position.reward;
        } else {
            totalClaimed++;
        }
    }

    return {
        totalPositions: positions.length,
        totalStaked,
        totalRewards,
        totalWithdrawn,
        totalClaimed,
        totalStakedFormatted: formatJJS(totalStaked),
        totalRewardsFormatted: formatJJS(totalRewards),
        positions
    };
}
