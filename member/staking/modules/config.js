
/**
 * ============================================================
 * PROJECT: JOSJIS
 * MODULE: STAKING CONFIGURATION
 * FILE: member/staking/modules/config.js
 * VERSION: V3
 * NETWORK: Polygon Mainnet
 * ============================================================
 *
 * PURPOSE:
 * Provides centralized configuration and ABI definitions
 * for the JosJis staking application.
 *
 * RESPONSIBILITIES:
 * 1. Define the supported blockchain network.
 * 2. Store deployed token and staking contract addresses.
 * 3. Define token precision and unit conversion.
 * 4. Provide ERC-20 and staking contract ABI definitions.
 * 5. Define supported staking duration labels.
 * 6. Configure historical event scanning and dashboard refresh.
 *
 * ARCHITECTURE:
 * - This module contains staking-specific configuration.
 * - Shared RPC services are managed by JosJis Core.
 * - Shared ERC-20 operations are managed by JosJis Core.
 * - Contract ABIs remain available to staking feature modules.
 *
 * IMPORTANT:
 * Contract addresses, ABI signatures, duration values,
 * and configuration constants must match the deployed
 * Polygon Mainnet contracts.
 *
 * Do not change deployed contract settings here unless
 * the corresponding application integration is reviewed.
 * ============================================================
 */

// ============================================================
// STAKING CONFIGURATION
// ============================================================

/**
 * General configuration for the staking application.
 *
 * chainId:
 * Polygon Mainnet chain identifier.
 *
 * deploymentBlock:
 * Staking contract deployment block.
 * Used as the starting point for historical event scanning.
 *
 * decimals:
 * JJS token decimal precision.
 *
 * autoRefresh:
 * Dashboard refresh interval in milliseconds.
 *
 * logChunkSize:
 * Maximum block range used when processing historical logs.
 *
 * tokenAddress:
 * Deployed JJS ERC-20 token contract address.
 *
 * stakingAddress:
 * Deployed JosJis staking contract address.
 *
 * These values are application configuration.
 * They do not deploy or modify smart contracts.
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

// ============================================================
// ERC-20 TOKEN ABI
// ============================================================

/**
 * Minimal ERC-20 ABI required by the staking application.
 *
 * balanceOf:
 * Reads the token balance of a wallet.
 *
 * allowance:
 * Reads the approved token amount for a spender.
 *
 * approve:
 * Authorizes a spender to transfer tokens on behalf
 * of the token owner.
 *
 * The Core Token Manager may provide shared ERC-20
 * functionality, while this ABI remains available for
 * modules that explicitly require the interface.
 */
export const TOKEN_ABI = [
    "function balanceOf(address) view returns (uint256)",
    "function allowance(address,address) view returns (uint256)",
    "function approve(address,uint256) returns (bool)"
];

// ============================================================
// STAKING CONTRACT ABI
// Based on PolygonScan verified ABI
// ============================================================

/**
 * ABI definitions for the deployed JosJis staking contract.
 *
 * The ABI is organized into:
 * 1. Read-only functions.
 * 2. User staking functions.
 * 3. Reward funding functions.
 * 4. Owner management functions.
 * 5. Ownership management functions.
 * 6. Contract events.
 * 7. Custom errors.
 *
 * This ABI describes the external contract interface.
 * It does not implement the smart contract itself.
 */
export const STAKING_ABI = [

    // --------------------------------------------------------
    // READ-ONLY FUNCTIONS
    // --------------------------------------------------------
    // Retrieve contract settings, staking positions,
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

    // --------------------------------------------------------
    // USER STAKING FUNCTIONS
    // --------------------------------------------------------
    // Functions available to users for creating and managing
    // their individual staking positions.

    "function stake(uint256 amount, uint256 duration) returns (uint256 id)",
    "function withdrawPrincipal(uint256 id)",
    "function claimReward(uint256 id)",

    // --------------------------------------------------------
    // REWARD FUNDING FUNCTIONS
    // --------------------------------------------------------
    // Functions for adding reward tokens and withdrawing
    // unused reward funds.

    "function fundRewards(uint256 amount)",
    "function withdrawUnusedRewards(address recipient, uint256 amount)",

    // --------------------------------------------------------
    // OWNER MANAGEMENT FUNCTIONS
    // --------------------------------------------------------
    // Administrative functions for staking configuration
    // and pause management.

    "function setDuration(uint256 duration, uint16 rewardBps, bool enabled)",
    "function setPaused(bool paused)",

    // --------------------------------------------------------
    // OWNERSHIP MANAGEMENT FUNCTIONS
    // --------------------------------------------------------
    // Ownership transfer and renunciation operations.

    "function acceptOwnership()",
    "function transferOwnership(address newOwner)",
    "function renounceOwnership()",

    // --------------------------------------------------------
    // CONTRACT EVENTS
    // --------------------------------------------------------
    // Events used to track contract activity and process
    // historical staking information.

    "event DurationUpdated(uint256 duration, uint16 rewardBps, bool enabled)",
    "event OwnershipTransferStarted(address indexed previousOwner, address indexed newOwner)",
    "event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)",
    "event PauseUpdated(bool paused)",
    "event PrincipalWithdrawn(uint256 indexed id, address indexed user, uint256 amount)",
    "event RewardClaimed(uint256 indexed id, address indexed user, uint256 amount)",
    "event RewardsFunded(address indexed funder, uint256 amount)",
    "event Staked(uint256 indexed id, address indexed user, uint256 amount, uint256 reward)",
    "event UnusedRewardsWithdrawn(address indexed recipient, uint256 amount)",

    // --------------------------------------------------------
    // CUSTOM ERRORS
    // --------------------------------------------------------
    // Error definitions used to identify authorization,
    // ownership, and reentrancy failures.

    "error OwnableInvalidOwner(address owner)",
    "error OwnableUnauthorizedAccount(address account)",
    "error ReentrancyGuardReentrantCall()",
    "error SafeERC20FailedOperation(address token)"
];

// ============================================================
// STAKING DURATION LABELS
// ============================================================

/**
 * Human-readable labels for supported staking durations.
 *
 * Object keys:
 * Duration values expressed in seconds.
 *
 * Object values:
 * Labels displayed by the staking interface.
 *
 * These labels must remain consistent with the duration
 * configurations enabled in the deployed staking contract.
 *
 * IMPORTANT:
 * Defining a duration label does not automatically enable
 * that duration in the staking smart contract.
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

// ============================================================
// TOKEN UNIT MULTIPLIER
// ============================================================

/**
 * Token unit multiplier derived from the configured decimals.
 *
 * BigInt is used to preserve integer precision when handling
 * token amounts in their smallest denomination.
 *
 * For an 18-decimal token:
 *
 * UNIT = 1000000000000000000n
 *
 * This value is useful for token amount calculations that
 * require exact integer arithmetic.
 */
export const UNIT = 10n ** BigInt(CONFIG.decimals);
