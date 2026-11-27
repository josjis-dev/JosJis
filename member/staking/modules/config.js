/**
 * JosJis Staking
 * Module: Configuration
 * Version: V2
 * Network: Polygon Mainnet
 */

export const CONFIG = {
    chainId: 137,
    decimals: 18,
    autoRefresh: 15000,
    logChunkSize: 10000,

    tokenAddress: "0x52C8Ff13ada1431376b3E77E8219b644805122dF",
    stakingAddress: "0x9b196084F6650bf5A1f38d2Abc0f93358Dc31382"
};

/* =========================================
   TOKEN ABI
========================================= */

export const TOKEN_ABI = [
    "function balanceOf(address) view returns (uint256)",
    "function allowance(address,address) view returns (uint256)",
    "function approve(address,uint256) returns (bool)"
];

/* =========================================
   STAKING ABI
   Based on PolygonScan verified ABI
========================================= */

export const STAKING_ABI = [

    // Read-only functions
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

    // User functions
    "function stake(uint256 amount, uint256 duration) returns (uint256 id)",
    "function withdrawPrincipal(uint256 id)",
    "function claimReward(uint256 id)",

    // Reward funding functions
    "function fundRewards(uint256 amount)",
    "function withdrawUnusedRewards(address recipient, uint256 amount)",

    // Owner functions
    "function setDuration(uint256 duration, uint16 rewardBps, bool enabled)",
    "function setPaused(bool paused)",

    // Ownership functions
    "function acceptOwnership()",
    "function transferOwnership(address newOwner)",
    "function renounceOwnership()",

    // Events
    "event DurationUpdated(uint256 duration, uint16 rewardBps, bool enabled)",
    "event OwnershipTransferStarted(address indexed previousOwner, address indexed newOwner)",
    "event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)",
    "event PauseUpdated(bool paused)",
    "event PrincipalWithdrawn(uint256 indexed id, address indexed user, uint256 amount)",
    "event RewardClaimed(uint256 indexed id, address indexed user, uint256 amount)",
    "event RewardsFunded(address indexed funder, uint256 amount)",
    "event Staked(uint256 indexed id, address indexed user, uint256 amount, uint256 reward)",
    "event UnusedRewardsWithdrawn(address indexed recipient, uint256 amount)",

    // Custom errors
    "error OwnableInvalidOwner(address owner)",
    "error OwnableUnauthorizedAccount(address account)",
    "error ReentrancyGuardReentrantCall()",
    "error SafeERC20FailedOperation(address token)"
];

/* =========================================
   DURATION LABELS
========================================= */

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

/* =========================================
   UNIT
========================================= */

export const UNIT = 10n ** BigInt(CONFIG.decimals);
