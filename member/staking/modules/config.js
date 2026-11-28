
/**
 * JosJis Staking
 * Module: Configuration
 * Version: V3
 * Network: Polygon Mainnet
 *
 * PURPOSE:
 * Central configuration module for the staking feature.
 *
 * RESPONSIBILITIES:
 * - Define the Polygon network and deployment settings.
 * - Store the JJS token and staking contract addresses.
 * - Provide the token and staking contract ABI definitions.
 * - Define supported staking duration labels.
 * - Provide the token unit multiplier.
 *
 * ARCHITECTURE:
 * This module currently contains feature-specific configuration
 * and ABI definitions. Shared Web3 infrastructure should use
 * JosJis Core wherever applicable.
 */

// =========================================
// STAKING CONFIGURATION
// =========================================

/**
 * General staking application configuration.
 *
 * chainId:
 * Polygon Mainnet network identifier.
 *
 * deploymentBlock:
 * Block number where the staking contract was deployed.
 * Can be used as the starting point for historical event queries.
 *
 * decimals:
 * JJS token decimal precision.
 *
 * autoRefresh:
 * Dashboard refresh interval in milliseconds.
 *
 * logChunkSize:
 * Maximum chunk size used by log-processing operations.
 *
 * tokenAddress:
 * Deployed JJS ERC-20 token contract address.
 *
 * stakingAddress:
 * Deployed JosJis staking contract address.
 */
export const CONFIG = {
    chainId: 137,
    deploymentBlock: 98053621,
    decimals: 18,
    autoRefresh: 15000,
    logChunkSize: 10000,

    tokenAddress: "0x52C8Ff13ada1431376b3E77E8219b644805122dF",
    stakingAddress: "0x9b196084F6650bf5A1f38d2Abc0f93358Dc31382"
};

// =========================================
// TOKEN ABI
// =========================================

/**
 * Minimal ERC-20 ABI required by the staking interface.
 *
 * balanceOf:
 * Reads the token balance of an address.
 *
 * allowance:
 * Reads the amount of tokens approved for a spender.
 *
 * approve:
 * Authorizes a spender to use a specified token amount.
 */
export const TOKEN_ABI = [
    "function balanceOf(address) view returns (uint256)",
    "function allowance(address,address) view returns (uint256)",
    "function approve(address,uint256) returns (bool)"
];

// =========================================
// STAKING ABI
// Based on PolygonScan verified ABI
// =========================================

/**
 * ABI definitions for interacting with the deployed staking contract.
 *
 * The ABI is organized into:
 * - Read-only functions
 * - User staking functions
 * - Reward funding functions
 * - Owner management functions
 * - Ownership management functions
 * - Contract events
 * - Custom errors
 */
export const STAKING_ABI = [

    // -----------------------------------------
    // Read-only functions
    // -----------------------------------------
    // Retrieve contract settings, staking data,
    // ownership information, and reward statistics.

    "function BPS() view returns (uint256)",
    "function MAX_DURATION() view returns (uint256)",
    "function MAX_REWARD_BPS() view returns (uint256)",
    "function availableRewards() view returns (uint256)",
    "function durationConfigs(uint256) view returns (uint16 rewardBps, bool enabled)",
    "function nextPositionId() view returns (uint256)",
    "function owner() view returns (address)",
    "function pendingOwner() view returns (address)",
    "function positions(uint256) view returns (address user, uint256 amount, uint256 reward, uint64 unlockTime, bool principalWithdrawn, bool rewardClaimed)",
    "function stakingPaused() view returns (bool)",
    "function stakingToken() view returns (address)",
    "function totalReservedRewards() view returns (uint256)",
    "function totalStaked() view returns (uint256)",

    // -----------------------------------------
    // User functions
    // -----------------------------------------
    // Functions available for users to manage
    // their staking positions.

    "function stake(uint256 amount, uint256 duration) returns (uint256 id)",
    "function withdrawPrincipal(uint256 id)",
    "function claimReward(uint256 id)",

    // -----------------------------------------
    // Reward funding functions
    // -----------------------------------------
    // Functions for funding rewards and withdrawing
    // unused reward tokens.

    "function fundRewards(uint256 amount)",
    "function withdrawUnusedRewards(address recipient, uint256 amount)",

    // -----------------------------------------
    // Owner functions
    // -----------------------------------------
    // Administrative functions for staking configuration
    // and pause management.

    "function setDuration(uint256 duration, uint16 rewardBps, bool enabled)",
    "function setPaused(bool paused)",

    // -----------------------------------------
    // Ownership functions
    // -----------------------------------------
    // Ownership transfer and renunciation operations.

    "function acceptOwnership()",
    "function transferOwnership(address newOwner)",
    "function renounceOwnership()",

    // -----------------------------------------
    // Events
    // -----------------------------------------
    // Event definitions used to track contract activity
    // and process staking history.

    "event DurationUpdated(uint256 duration, uint16 rewardBps, bool enabled)",
    "event OwnershipTransferStarted(address indexed previousOwner, address indexed newOwner)",
    "event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)",
    "event PauseUpdated(bool paused)",
    "event PrincipalWithdrawn(uint256 indexed id, address indexed user, uint256 amount)",
    "event RewardClaimed(uint256 indexed id, address indexed user, uint256 amount)",
    "event RewardsFunded(address indexed funder, uint256 amount)",
    "event Staked(uint256 indexed id, address indexed user, uint256 amount, uint256 reward)",
    "event UnusedRewardsWithdrawn(address indexed recipient, uint256 amount)",

    // -----------------------------------------
    // Custom errors
    // -----------------------------------------
    // Error definitions used to identify contract
    // authorization, ownership, and reentrancy failures.

    "error OwnableInvalidOwner(address owner)",
    "error OwnableUnauthorizedAccount(address account)",
    "error ReentrancyGuardReentrantCall()",
    "error SafeERC20FailedOperation(address token)"
];

// =========================================
// DURATION LABELS
// =========================================

/**
 * Human-readable labels for supported staking durations.
 *
 * Object keys represent duration values in seconds.
 * Values are labels displayed by the staking interface.
 *
 * These labels must remain consistent with the duration
 * configurations supported by the deployed staking contract.
 */
export const DURATION_LABELS = {
    "60": "1 Minute",
    "300": "5 Minutes",
    "86400": "1 Day",
    "604800": "7 Days",
    "2592000": "30 Days",
    "7776000": "90 Days",
    "15552000": "180 Days",
    "31536000": "365 Days"
};

// =========================================
// TOKEN UNIT
// =========================================

/**
 * Token unit multiplier based on the configured decimals.
 *
 * BigInt is used to preserve integer precision when
 * handling token amounts in their smallest unit.
 *
 * For 18 decimals:
 * UNIT = 1000000000000000000n
 */
export const UNIT = 10n ** BigInt(CONFIG.decimals);
