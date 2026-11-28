
/**
 * ============================================================
 * PROJECT: JOSJIS
 * MODULE: POSITIONS
 * VERSION: V3
 * NETWORK: Polygon Mainnet
 * ============================================================
 *
 * PURPOSE:
 * Retrieves, processes, and summarizes user staking positions.
 *
 * CORE INTEGRATION:
 * - RPC Manager handles blockchain read operations.
 * - Staking configuration provides contract settings and ABI.
 *
 * RESPONSIBILITIES:
 * - Retrieve individual staking positions.
 * - Scan Staked events to discover position IDs.
 * - Cache event scan results.
 * - Format staking position information.
 * - Filter active, withdrawable, and claimable positions.
 * - Calculate user staking summaries.
 *
 * IMPORTANT:
 * This module performs read-only blockchain operations.
 * Staking-specific position logic remains in this module.
 */

// ============================================================
// 1. IMPORT EXTERNAL LIBRARIES
// ============================================================

import {
    Contract
} from "https://esm.sh/ethers@6.15.0";

// ============================================================
// 2. IMPORT STAKING CONFIGURATION
// ============================================================

import {
    CONFIG,
    STAKING_ABI
} from "./config.js";

// ============================================================
// 3. IMPORT JOSJIS CORE
// ============================================================

import {
    RPC
} from "../../../assets/js/core/index.js";

// ============================================================
// 4. IMPORT STAKING HELPERS
// ============================================================

import {
    formatJJS,
    formatDate,
    formatCountdown
} from "./helpers.js";

// ============================================================
// 5. SCAN CONFIGURATION
// ============================================================

/**
 * Maximum number of blockchain blocks scanned per request.
 */
const EVENT_SCAN_CHUNK_SIZE = 2000;

/**
 * Default starting block for staking event discovery.
 */
const DEFAULT_FROM_BLOCK = CONFIG.deploymentBlock;

/**
 * Cache for event scan results.
 *
 * Cache keys are separated by wallet address and starting block.
 */
const positionIdsCache = new Map();

/**
 * Cache validity duration in milliseconds.
 */
const CACHE_DURATION = 15000;

// ============================================================
// 6. VALIDATE ADDRESS
// ============================================================

/**
 * Validates an Ethereum-compatible wallet address.
 *
 * @param {string} address - Wallet address.
 * @throws {Error} If the address is invalid.
 */
function validateAddress(address) {
    if (
        typeof address !== "string" ||
        !/^0x[a-fA-F0-9]{40}$/.test(address)
    ) {
        throw new Error("Invalid wallet address.");
    }
}

// ============================================================
// 7. VALIDATE STARTING BLOCK
// ============================================================

/**
 * Validates the starting block for event scanning.
 *
 * @param {number|string} fromBlock - Starting block.
 * @returns {number} Validated starting block.
 */
function validateStartingBlock(fromBlock) {
    const startBlock = Number(fromBlock);

    if (
        !Number.isSafeInteger(startBlock) ||
        startBlock < DEFAULT_FROM_BLOCK
    ) {
        throw new Error("Invalid starting block.");
    }

    return startBlock;
}

// ============================================================
// 8. READ POSITION
// ============================================================

/**
 * Retrieves the details of a staking position.
 *
 * Blockchain reads are executed through JosJis Core RPC Manager.
 *
 * @param {string|number|bigint} positionId - Position ID.
 * @returns {Promise<object>} Position details.
 */
export async function getPositionDetails(positionId) {
    const id = BigInt(positionId);

    if (id < 0n) {
        throw new Error("Invalid position ID.");
    }

    const position = await RPC.rpcRequest(async provider => {
        const stakingContract = new Contract(
            CONFIG.stakingAddress,
            STAKING_ABI,
            provider
        );

        return stakingContract.positions(id);
    });

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

// ============================================================
// 9. FORMAT POSITION
// ============================================================

/**
 * Converts raw staking position data into display-ready values.
 *
 * @param {object} position - Raw staking position.
 * @returns {object} Formatted staking position.
 */
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

// ============================================================
// 10. GET USER POSITION IDS FROM EVENTS
// ============================================================

/**
 * Discovers staking position IDs by scanning Staked events.
 *
 * Uses Core RPC Manager for:
 * - Latest block retrieval.
 * - Event queries.
 * - Automatic RPC endpoint failover.
 *
 * @param {string} walletAddress - Wallet address.
 * @param {number|string} fromBlock - Starting block.
 * @returns {Promise<bigint[]>} Sorted position IDs.
 */
export async function getUserPositionIds(
    walletAddress,
    fromBlock = DEFAULT_FROM_BLOCK
) {
    validateAddress(walletAddress);

    const startBlock = validateStartingBlock(fromBlock);

    // Retrieve the latest block through Core RPC Manager.
    const latestBlock = await RPC.rpcRequest(
        provider => provider.getBlockNumber()
    );

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

    const positionIds = new Set();

    /*
     * Scan blockchain events in configured block chunks.
     * Each query is routed through Core RPC Manager.
     */

    for (
        let start = startBlock;
        start <= latestBlock;
        start += EVENT_SCAN_CHUNK_SIZE
    ) {
        const end = Math.min(
            start + EVENT_SCAN_CHUNK_SIZE - 1,
            latestBlock
        );

        const events = await RPC.rpcRequest(async provider => {
            const stakingContract = new Contract(
                CONFIG.stakingAddress,
                STAKING_ABI,
                provider
            );

            const filter = stakingContract.filters.Staked(
                null,
                walletAddress
            );

            return stakingContract.queryFilter(
                filter,
                start,
                end
            );
        });

        for (const event of events) {
            if (event.args?.id !== undefined) {
                positionIds.add(
                    event.args.id.toString()
                );
            }
        }
    }

    // Convert discovered IDs into sorted BigInt values.
    const sortedIds = Array.from(positionIds)
        .map(id => BigInt(id))
        .sort((a, b) => a < b ? -1 : a > b ? 1 : 0);

    // Store the scan results in the local cache.
    positionIdsCache.set(cacheKey, {
        ids: sortedIds.map(id => id.toString()),
        latestBlock,
        timestamp: Date.now()
    });

    return sortedIds;
}

// ============================================================
// 11. GET USER POSITIONS
// ============================================================

/**
 * Retrieves all staking positions belonging to a wallet.
 *
 * @param {string} walletAddress - Wallet address.
 * @param {number|string} fromBlock - Starting block.
 * @returns {Promise<object[]>} Formatted user positions.
 */
export async function getUserPositions(
    walletAddress,
    fromBlock = DEFAULT_FROM_BLOCK
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

// ============================================================
// 12. GET ACTIVE POSITIONS
// ============================================================

/**
 * Retrieves positions that have not completed both actions.
 *
 * @param {string} walletAddress - Wallet address.
 * @param {number|string} fromBlock - Starting block.
 * @returns {Promise<object[]>} Active positions.
 */
export async function getActivePositions(
    walletAddress,
    fromBlock = DEFAULT_FROM_BLOCK
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

// ============================================================
// 13. GET WITHDRAWABLE POSITIONS
// ============================================================

/**
 * Retrieves positions whose principal can be withdrawn.
 *
 * @param {string} walletAddress - Wallet address.
 * @param {number|string} fromBlock - Starting block.
 * @returns {Promise<object[]>} Withdrawable positions.
 */
export async function getWithdrawablePositions(
    walletAddress,
    fromBlock = DEFAULT_FROM_BLOCK
) {
    const positions = await getUserPositions(
        walletAddress,
        fromBlock
    );

    return positions.filter(position =>
        position.canWithdraw
    );
}

// ============================================================
// 14. GET CLAIMABLE POSITIONS
// ============================================================

/**
 * Retrieves positions with unclaimed staking rewards.
 *
 * @param {string} walletAddress - Wallet address.
 * @param {number|string} fromBlock - Starting block.
 * @returns {Promise<object[]>} Claimable positions.
 */
export async function getClaimablePositions(
    walletAddress,
    fromBlock = DEFAULT_FROM_BLOCK
) {
    const positions = await getUserPositions(
        walletAddress,
        fromBlock
    );

    return positions.filter(position =>
        position.canClaim
    );
}

// ============================================================
// 15. GET POSITION SUMMARY
// ============================================================

/**
 * Calculates staking totals for a wallet.
 *
 * @param {string} walletAddress - Wallet address.
 * @param {number|string} fromBlock - Starting block.
 * @returns {Promise<object>} Position summary.
 */
export async function getPositionSummary(
    walletAddress,
    fromBlock = DEFAULT_FROM_BLOCK
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
