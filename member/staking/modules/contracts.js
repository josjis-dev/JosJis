
/**
 * ============================================================
 * PROJECT: JOSJIS
 * MODULE: STAKING CONTRACTS
 * FILE: member/staking/modules/contracts.js
 * VERSION: V5
 * NETWORK: Polygon Mainnet
 * ============================================================
 *
 * PURPOSE:
 * Provides read-only access to the deployed JJS token
 * and JosJis staking smart contracts.
 *
 * RESPONSIBILITIES:
 * 1. Use JosJis Core RPC Manager for blockchain reads.
 * 2. Use JosJis Core Token Manager for ERC-20 operations.
 * 3. Create read-only staking contract instances.
 * 4. Validate the configured network and contract deployments.
 * 5. Verify the staking contract uses the expected JJS token.
 * 6. Read global staking status and duration configurations.
 * 7. Retrieve individual staking positions.
 * 8. Read wallet JJS balances and staking allowances.
 *
 * ARCHITECTURE:
 * - Core RPC Manager: Shared Polygon RPC and failover.
 * - Core Token Manager: ERC-20 balance and allowance reads.
 * - config.js: Staking addresses and ABI definitions.
 *
 * This module does not create its own RPC provider.
 *
 * COMPATIBILITY:
 * Existing exported function names and return structures
 * are preserved for existing staking module integrations.
 *
 * IMPORTANT:
 * This module performs read-only operations.
 * Transaction signing and contract writes are handled
 * by the staking action and transaction modules.
 * ============================================================
 */

// ============================================================
// EXTERNAL DEPENDENCIES
// ============================================================

/**
 * Contract:
 * Used to create ethers contract instances for staking reads.
 */
import {
    Contract
} from "https://esm.sh/ethers@6.15.0";

// ============================================================
// JOSJIS CORE
// ============================================================

/**
 * RPC:
 * Provides the shared Polygon RPC provider and request handling.
 *
 * Token:
 * Provides registered ERC-20 contract access, balance reads,
 * and allowance reads.
 */
import {
    RPC,
    Token
} from "../../../assets/js/core/index.js";

// ============================================================
// STAKING CONFIGURATION
// ============================================================

/**
 * CONFIG:
 * Contains the configured Polygon network and contract addresses.
 *
 * TOKEN_ABI:
 * Defines the ERC-20 interface used by the staking application.
 *
 * STAKING_ABI:
 * Defines the JosJis staking contract interface.
 */
import {
    CONFIG,
    TOKEN_ABI,
    STAKING_ABI
} from "./config.js";

// ============================================================
// ERROR HANDLER
// ============================================================

/**
 * Extracts a readable message from common ethers and JSON-RPC
 * error response structures.
 *
 * @param {Error|object|string} error - Original error.
 * @returns {string} Readable error message.
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
 * Executes a read operation and adds a descriptive label
 * when the operation fails.
 *
 * @param {string} label - Name of the read operation.
 * @param {Function} callback - Asynchronous operation.
 * @returns {Promise<*>} Operation result.
 * @throws {Error} Labeled error.
 */
async function readWithLabel(label, callback) {
    try {
        return await callback();
    } catch (error) {
        console.error(
            `[Contracts V5] ${label} failed:`,
            error
        );

        throw new Error(
            `${label}: ${getRpcErrorMessage(error)}`
        );
    }
}

// ============================================================
// PROVIDER ACCESS
// ============================================================

/**
 * Returns the active provider managed by JosJis Core.
 *
 * This function does not create a new RPC provider.
 *
 * @returns {JsonRpcProvider} Active Core RPC provider.
 * @throws {Error} If the Core provider is unavailable.
 */
export function getRpcProvider() {
    const provider = RPC.getProvider();

    if (!provider) {
        throw new Error(
            "JosJis Core RPC provider is unavailable."
        );
    }

    if (
        typeof provider.getNetwork !== "function"
    ) {
        throw new Error(
            "Invalid Core RPC provider: getNetwork() unavailable."
        );
    }

    return provider;
}

// ============================================================
// READ-ONLY CONTRACTS
// ============================================================

/**
 * Creates read-only token and staking contract instances.
 *
 * The token contract is obtained through the Core Token Manager.
 * The staking contract uses the configured staking ABI.
 *
 * This function is retained for compatibility with existing
 * modules that expect provider and contract instances.
 *
 * @returns {object} Read-only provider and contract instances.
 * @throws {Error} If contract initialization fails.
 */
export function getReadContracts() {
    const provider = getRpcProvider();

    const tokenContract = Token.getTokenContract(
        "JJS",
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

// ============================================================
// INTERNAL STAKING READ HELPER
// ============================================================

/**
 * Executes a staking contract read through Core RPC Manager.
 *
 * A contract instance is created using the provider supplied
 * by RPC Manager for the current request.
 *
 * This allows the RPC Manager to perform endpoint failover.
 *
 * @param {Function} callback - Contract read operation.
 * @returns {Promise<*>} Contract read result.
 */
async function readStaking(callback) {
    return await RPC.rpcRequest(async (provider) => {
        const stakingContract = new Contract(
            CONFIG.stakingAddress,
            STAKING_ABI,
            provider
        );

        return await callback(stakingContract);
    });
}

// ============================================================
// VALIDATE STAKING CONTRACT
// ============================================================

/**
 * Validates the configured network and deployed contracts.
 *
 * Validation steps:
 * 1. Check the RPC network ID.
 * 2. Check JJS token contract bytecode.
 * 3. Check staking contract bytecode.
 * 4. Read the staking contract token address.
 * 5. Read the staking pause status.
 * 6. Read the available reward balance.
 * 7. Compare the staking token with the configured JJS address.
 *
 * @returns {Promise<object>} Contract validation result.
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
 * Validation errors are returned instead of being propagated.
 */
export async function validateStakingContract() {
    try {
        const result = await readWithLabel(
            "Staking contract validation",
            () => RPC.rpcRequest(async (provider) => {
                const network = await provider.getNetwork();

                if (
                    Number(network.chainId) !== CONFIG.chainId
                ) {
                    throw new Error(
                        "RPC provider is not connected to Polygon Mainnet."
                    );
                }

                const tokenCode = await provider.getCode(
                    CONFIG.tokenAddress
                );

                if (!tokenCode || tokenCode === "0x") {
                    throw new Error(
                        "JJS token contract was not found at the configured address."
                    );
                }

                const stakingCode = await provider.getCode(
                    CONFIG.stakingAddress
                );

                if (!stakingCode || stakingCode === "0x") {
                    throw new Error(
                        "Staking contract was not found at the configured address."
                    );
                }

                const stakingContract = new Contract(
                    CONFIG.stakingAddress,
                    STAKING_ABI,
                    provider
                );

                const stakingTokenAddress =
                    await stakingContract.stakingToken();

                const paused =
                    await stakingContract.stakingPaused();

                const availableRewards =
                    await stakingContract.availableRewards();

                if (
                    stakingTokenAddress.toLowerCase() !==
                    CONFIG.tokenAddress.toLowerCase()
                ) {
                    throw new Error(
                        "Staking contract is connected to an unexpected JJS token."
                    );
                }

                return {
                    chainId: Number(network.chainId),
                    paused,
                    availableRewards,
                    stakingTokenAddress,
                    tokenAddress: CONFIG.tokenAddress
                };
            })
        );

        return {
            valid: true,
            ...result
        };

    } catch (error) {
        console.error(
            "[Contracts V5] Contract validation failed:",
            error
        );

        return {
            valid: false,
            error: getRpcErrorMessage(error)
        };
    }
}

// ============================================================
// READ STAKING STATUS
// ============================================================

/**
 * Retrieves the current global staking contract status.
 *
 * Reads:
 * - Network ID.
 * - Pause status.
 * - Available reward balance.
 * - Total staked amount.
 * - Total reserved rewards.
 * - Next position ID.
 *
 * All contract reads are executed through Core RPC Manager.
 *
 * @returns {Promise<object>} Global staking statistics.
 * @throws {Error} If the network or a contract read fails.
 */
export async function getStakingStatus() {
    return await readWithLabel(
        "Staking status",
        () => RPC.rpcRequest(async (provider) => {
            const network = await provider.getNetwork();

            if (
                Number(network.chainId) !== CONFIG.chainId
            ) {
                throw new Error(
                    "RPC provider is not connected to Polygon Mainnet."
                );
            }

            const stakingContract = new Contract(
                CONFIG.stakingAddress,
                STAKING_ABI,
                provider
            );

            const paused =
                await stakingContract.stakingPaused();

            const availableRewards =
                await stakingContract.availableRewards();

            const totalStaked =
                await stakingContract.totalStaked();

            const totalReservedRewards =
                await stakingContract.totalReservedRewards();

            const nextPositionId =
                await stakingContract.nextPositionId();

            return {
                paused,
                availableRewards,
                totalStaked,
                totalReservedRewards,
                nextPositionId
            };
        })
    );
}

// ============================================================
// READ DURATION CONFIGURATION
// ============================================================

/**
 * Retrieves the reward configuration for a staking duration.
 *
 * @param {number|string|bigint} duration - Duration in seconds.
 * @returns {Promise<object>} Duration configuration.
 *
 * Returned properties:
 * - rewardBps: Reward rate in basis points.
 * - enabled: Whether the duration is enabled.
 */
export async function getDurationConfig(duration) {
    const result = await readWithLabel(
        `durationConfigs(${duration})`,
        () => readStaking(
            (stakingContract) =>
                stakingContract.durationConfigs(
                    BigInt(duration)
                )
        )
    );

    return {
        rewardBps: result.rewardBps,
        enabled: result.enabled
    };
}

// ============================================================
// READ USER POSITION
// ============================================================

/**
 * Retrieves an individual staking position by its ID.
 *
 * @param {number|string|bigint} positionId - Position ID.
 * @returns {Promise<object>} Staking position information.
 *
 * Returned properties:
 * - user
 * - amount
 * - reward
 * - unlockTime
 * - principalWithdrawn
 * - rewardClaimed
 */
export async function getPosition(positionId) {
    const position = await readWithLabel(
        `positions(${positionId})`,
        () => readStaking(
            (stakingContract) =>
                stakingContract.positions(
                    BigInt(positionId)
                )
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

// ============================================================
// READ TOKEN BALANCE
// ============================================================

/**
 * Retrieves the JJS token balance of a wallet.
 *
 * The Core Token Manager handles the ERC-20 read operation
 * and uses the shared Core RPC infrastructure.
 *
 * @param {string} walletAddress - Wallet address to query.
 * @returns {Promise<bigint>} JJS balance in base units.
 * @throws {Error} If the wallet address is missing or the read fails.
 */
export async function getJJSBalance(walletAddress) {
    if (!walletAddress) {
        throw new Error(
            "Wallet address is required."
        );
    }

    return await readWithLabel(
        "JJS balanceOf()",
        async () => {
            const result = await Token.getTokenBalance(
                "JJS",
                walletAddress
            );

            return result.raw;
        }
    );
}

// ============================================================
// READ TOKEN ALLOWANCE
// ============================================================

/**
 * Retrieves the JJS allowance granted to the staking contract.
 *
 * The Core Token Manager handles the ERC-20 allowance read.
 *
 * @param {string} walletAddress - Token owner's wallet address.
 * @returns {Promise<bigint>} Approved amount in base units.
 * @throws {Error} If the wallet address is missing or the read fails.
 *
 * This function does not request or modify token approval.
 */
export async function getJJSAllowance(walletAddress) {
    if (!walletAddress) {
        throw new Error(
            "Wallet address is required."
        );
    }

    return await readWithLabel(
        "JJS allowance()",
        async () => {
            const result = await Token.getAllowance(
                "JJS",
                walletAddress,
                CONFIG.stakingAddress
            );

            return result.raw;
        }
    );
}
