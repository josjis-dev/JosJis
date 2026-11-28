
/**
 * JosJis Staking
 * Module: Contracts
 * Version: V4
 * Network: Polygon Mainnet
 *
 * PURPOSE:
 * Provide read-only access to the deployed JJS token
 * and JosJis staking smart contracts.
 *
 * RESPONSIBILITIES:
 * - Initialize a Polygon read-only RPC provider.
 * - Create read-only token and staking contract instances.
 * - Validate the configured network and contract deployments.
 * - Verify that the staking contract uses the expected JJS token.
 * - Read staking status and duration configurations.
 * - Retrieve individual staking positions.
 * - Read user token balances and staking allowances.
 *
 * ARCHITECTURE NOTE:
 * This version creates its own RPC provider, contract instances,
 * and RPC error handler.
 *
 * JosJis Core already provides shared RPC, contract registry,
 * and error management capabilities. This module should eventually
 * use those shared services to avoid duplicated Web3 infrastructure.
 *
 * No Core refactor is performed in this version.
 */

// =========================================
// EXTERNAL DEPENDENCIES
// =========================================

/**
 * Contract:
 * Used to create ethers contract instances.
 *
 * JsonRpcProvider:
 * Used to connect to a public Polygon RPC endpoint
 * without requiring a connected wallet.
 */
import {
    Contract,
    JsonRpcProvider
} from "https://esm.sh/ethers@6.15.0";

// =========================================
// STAKING CONFIGURATION
// =========================================

/**
 * Configuration and ABI definitions for the staking feature.
 *
 * CONFIG:
 * Contains the Polygon chain ID and deployed contract addresses.
 *
 * TOKEN_ABI:
 * Defines the ERC-20 functions required by the staking interface.
 *
 * STAKING_ABI:
 * Defines the read and write interface of the staking contract.
 */
import {
    CONFIG,
    TOKEN_ABI,
    STAKING_ABI
} from "./config.js";

// =========================================
// PUBLIC READ-ONLY RPC
// =========================================

/**
 * Public Polygon RPC endpoint used for blockchain read operations.
 *
 * The provider is configured for the Polygon Mainnet chain ID.
 *
 * This provider does not require wallet authorization and
 * cannot sign transactions.
 *
 * ARCHITECTURE NOTE:
 * The shared JosJis Core RPC Manager should eventually own
 * this connection instead of creating another provider here.
 */
const PUBLIC_RPC_URL =
    "https://polygon-bor-rpc.publicnode.com";

const rpcProvider = new JsonRpcProvider(
    PUBLIC_RPC_URL,
    CONFIG.chainId
);

// =========================================
// ERROR HANDLER
// =========================================

/**
 * Extract a readable error message from common ethers
 * and JSON-RPC error response structures.
 *
 * @param {Error|object} error - Original RPC or contract error.
 * @returns {string} Best available error message.
 *
 * ARCHITECTURE NOTE:
 * This is a local error formatter. JosJis Core Error Manager
 * should eventually provide shared error normalization.
 */
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

/**
 * Execute a read operation and attach a descriptive label
 * if the operation fails.
 *
 * @param {string} label - Name of the RPC or contract operation.
 * @param {Function} callback - Asynchronous operation to execute.
 * @returns {Promise<*>} Result returned by the callback.
 * @throws {Error} Labeled error containing the original error message.
 *
 * This helper centralizes error logging for read operations
 * performed by this module.
 */
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

// =========================================
// PROVIDER VALIDATION
// =========================================

/**
 * Return the configured read-only RPC provider after basic checks.
 *
 * @returns {JsonRpcProvider} Configured Polygon RPC provider.
 * @throws {Error} If the provider is unavailable or invalid.
 *
 * This function checks that:
 * - The provider instance exists.
 * - The provider exposes the getNetwork() method.
 *
 * The actual network ID is checked by operations that need
 * to verify Polygon Mainnet connectivity.
 */
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

// =========================================
// READ-ONLY CONTRACTS
// =========================================

/**
 * Create read-only instances of the JJS token and staking contracts.
 *
 * @returns {object} Object containing:
 * - provider
 * - tokenContract
 * - stakingContract
 *
 * Both contracts use the public RPC provider.
 * No wallet signer is attached to these instances.
 *
 * ARCHITECTURE NOTE:
 * Contract definitions and instances should eventually be obtained
 * through the JosJis Core Contract Registry.
 */
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

// =========================================
// VALIDATE STAKING CONTRACT
// =========================================

/**
 * Validate the Polygon network and deployed staking contracts.
 *
 * Validation steps:
 * 1. Create read-only contract instances.
 * 2. Verify the RPC network ID.
 * 3. Check that the JJS token contract has deployed bytecode.
 * 4. Check that the staking contract has deployed bytecode.
 * 5. Read the staking contract's configured token address.
 * 6. Read the staking pause status.
 * 7. Read the available reward balance.
 * 8. Compare the configured staking token with the expected JJS address.
 *
 * @returns {Promise<object>} Validation result.
 *
 * Successful result:
 * {
 *   valid: true,
 *   chainId,
 *   paused,
 *   availableRewards,
 *   stakingTokenAddress,
 *   tokenAddress
 * }
 *
 * Failed result:
 * {
 *   valid: false,
 *   error
 * }
 *
 * This function returns validation failures instead of
 * propagating them to the caller.
 */
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

// =========================================
// READ STAKING STATUS
// =========================================

/**
 * Retrieve the current global staking contract status.
 *
 * Reads:
 * - Network ID
 * - Pause status
 * - Available reward balance
 * - Total staked amount
 * - Total reserved rewards
 * - Next position ID
 *
 * @returns {Promise<object>} Current staking contract statistics.
 * @throws {Error} If the network or a contract read operation fails.
 */
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

// =========================================
// READ DURATION CONFIGURATION
// =========================================

/**
 * Retrieve the reward configuration for a staking duration.
 *
 * @param {number|string|bigint} duration - Duration in seconds.
 * @returns {Promise<object>} Duration configuration containing:
 * - rewardBps: Reward rate in basis points.
 * - enabled: Whether the duration is enabled.
 *
 * The duration value is converted to BigInt before
 * calling the staking contract.
 */
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

// =========================================
// READ USER POSITION
// =========================================

/**
 * Retrieve an individual staking position by its ID.
 *
 * @param {number|string|bigint} positionId - Staking position ID.
 * @returns {Promise<object>} Position information:
 * - user
 * - amount
 * - reward
 * - unlockTime
 * - principalWithdrawn
 * - rewardClaimed
 *
 * The position ID is converted to BigInt before
 * calling the staking contract.
 */
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

// =========================================
// READ TOKEN BALANCE
// =========================================

/**
 * Retrieve the JJS token balance of a wallet.
 *
 * @param {string} walletAddress - Wallet address to query.
 * @returns {Promise<bigint>} JJS balance in token base units.
 * @throws {Error} If the wallet address is missing or the read fails.
 *
 * This is a read-only ERC-20 operation.
 */
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

// =========================================
// READ TOKEN ALLOWANCE
// =========================================

/**
 * Retrieve the JJS allowance granted to the staking contract.
 *
 * @param {string} walletAddress - Wallet address that owns the tokens.
 * @returns {Promise<bigint>} Approved amount in token base units.
 * @throws {Error} If the wallet address is missing or the read fails.
 *
 * The spender address is the configured JosJis staking contract.
 * This function does not request or modify token approval.
 */
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
