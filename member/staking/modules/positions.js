/**
 * JosJis Staking
 * Module: Positions
 * Version: V1
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

/**
 * Scans Staked events for a wallet address.
 * Set fromBlock to the staking contract deployment block
 * when known to reduce RPC requests.
 */

export async function getUserPositionIds(
    walletAddress,
    fromBlock = 0
) {
    validateAddress(walletAddress);

    const { provider, stakingContract } = getReadContracts();

    const latestBlock = await provider.getBlockNumber();

    const startBlock = Number(fromBlock);

    if (
        !Number.isSafeInteger(startBlock) ||
        startBlock < 0 ||
        startBlock > latestBlock
    ) {
        throw new Error("Invalid starting block.");
    }

    const filter = stakingContract.filters.Staked(
        null,
        walletAddress
    );

    const positionIds = new Set();

    const chunkSize = CONFIG.logChunkSize;

    for (
        let start = startBlock;
        start <= latestBlock;
        start += chunkSize
    ) {
        const end = Math.min(
            start + chunkSize - 1,
            latestBlock
        );

        const events = await stakingContract.queryFilter(
            filter,
            start,
            end
        );

        for (const event of events) {
            positionIds.add(
                event.args.id.toString()
            );
        }
    }

    return Array.from(positionIds)
        .map(id => BigInt(id))
        .sort((a, b) => a < b ? -1 : a > b ? 1 : 0);
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
