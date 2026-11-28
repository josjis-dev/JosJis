
/**
 * ============================================================
 * PROJECT: JOSJIS
 * MODULE: STAKING ACTIONS
 * FILE: member/staking/modules/staking-actions.js
 * NETWORK: Polygon Mainnet
 * LIBRARY: Ethers.js 6.15.0
 * ============================================================
 *
 * PURPOSE:
 * Handles staking-related blockchain reads and transactions.
 *
 * CORE INTEGRATION:
 * - RPC Manager handles public blockchain read operations.
 * - Token Manager handles JJS balance and allowance reads.
 * - Transaction Manager handles wallet signing and approval.
 *
 * RESPONSIBILITIES:
 * - Read JJS wallet balance and staking allowance.
 * - Validate wallet, network, token, and staking contracts.
 * - Submit JJS approval through JosJis Core.
 * - Submit staking transactions.
 * - Withdraw staking principal.
 * - Claim staking rewards.
 * - Validate transaction results and staking positions.
 *
 * IMPORTANT:
 * Staking-specific business logic remains in this module.
 * Shared blockchain infrastructure is delegated to JosJis Core.
 */

// ============================================================
// 1. IMPORT EXTERNAL LIBRARIES
// ============================================================

import {
    Contract,
    Interface,
    parseUnits,
    formatUnits
} from "https://esm.sh/ethers@6.15.0";

// ============================================================
// 2. IMPORT STAKING CONFIGURATION
// ============================================================

import {
    CONFIG,
    TOKEN_ABI,
    STAKING_ABI
} from "./config.js";

// ============================================================
// 3. IMPORT JOSJIS CORE
// ============================================================

import {
    RPC,
    Token,
    Transaction
} from "../../../assets/js/core/index.js";

// ============================================================
// 4. TOKEN INTERFACE
// ============================================================

/**
 * Creates an ABI interface for encoding ERC20 transactions.
 *
 * This interface does not create another RPC provider
 * or manage blockchain connections.
 */
const tokenInterface = new Interface(TOKEN_ABI);

// ============================================================
// 5. SIGNER CONTRACTS
// ============================================================

/**
 * Creates staking contract instances connected to the
 * validated JosJis Core wallet signer.
 *
 * @returns {Promise<object>} Signer and writable contracts.
 */
async function getSignerContracts() {
    const signer = await Transaction.getWalletSigner();

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

// ============================================================
// 6. STAKING READ HELPER
// ============================================================

/**
 * Executes a staking contract read through JosJis Core RPC.
 *
 * A read-only contract instance is created using the provider
 * selected by RPC Manager for each operation.
 *
 * @param {Function} callback - Staking contract read operation.
 * @returns {Promise<*>} Result returned by the callback.
 */
async function readStaking(callback) {
    return RPC.rpcRequest(async provider => {
        const stakingContract = new Contract(
            CONFIG.stakingAddress,
            STAKING_ABI,
            provider
        );

        return callback(stakingContract);
    });
}

// ============================================================
// 7. ERROR SERIALIZER
// ============================================================

/**
 * Converts complex errors into JSON-safe diagnostic data.
 *
 * Handles:
 * - BigInt values.
 * - Circular references.
 * - Nested error objects.
 * - Unreadable properties.
 *
 * @param {Error|object} error - Error to serialize.
 * @returns {string} Serialized error information.
 */
function serializeError(error) {
    const seen = new WeakSet();

    function clean(value, depth = 0) {
        if (
            value === null ||
            value === undefined
        ) {
            return value ?? null;
        }

        if (typeof value === "bigint") {
            return value.toString();
        }

        if (
            typeof value === "string" ||
            typeof value === "number" ||
            typeof value === "boolean"
        ) {
            return value;
        }

        if (typeof value !== "object") {
            return String(value);
        }

        if (depth > 5) {
            return "[MAX_DEPTH]";
        }

        if (seen.has(value)) {
            return "[CIRCULAR]";
        }

        seen.add(value);

        if (Array.isArray(value)) {
            return value.map(item =>
                clean(item, depth + 1)
            );
        }

        const result = {};

        const keys = [
            "name",
            "message",
            "code",
            "shortMessage",
            "reason",
            "action",
            "method",
            "data",
            "error",
            "info",
            "cause",
            "status",
            "statusText",
            "body",
            "response",
            "requestBody",
            "transaction",
            "args"
        ];

        for (const key of keys) {
            try {
                if (value[key] !== undefined) {
                    result[key] = clean(
                        value[key],
                        depth + 1
                    );
                }
            } catch {
                result[key] = "[UNREADABLE]";
            }
        }

        return result;
    }

    try {
        return JSON.stringify(clean(error));
    } catch (serializationError) {
        return JSON.stringify({
            message:
                error?.message || String(error),

            serializationError:
                serializationError?.message ||
                String(serializationError)
        });
    }
}

// ============================================================
// 8. VALIDATE AMOUNT
// ============================================================

/**
 * Validates and converts a human-readable JJS amount.
 *
 * @param {string|number} amount - JJS amount.
 * @returns {bigint} Amount in the smallest token unit.
 */
function validateAmount(amount) {
    if (
        typeof amount !== "string" &&
        typeof amount !== "number"
    ) {
        throw new Error(
            "Invalid JJS amount."
        );
    }

    const value = String(amount).trim();

    if (!/^\d+(\.\d{1,18})?$/.test(value)) {
        throw new Error(
            "Enter a valid JJS amount."
        );
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

// ============================================================
// 9. VALIDATE POSITION ID
// ============================================================

/**
 * Validates a staking position identifier.
 *
 * @param {string|number|bigint} positionId - Position ID.
 * @returns {bigint} Validated position ID.
 */
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

// ============================================================
// 10. CHECK READ RPC NETWORK
// ============================================================

/**
 * Checks the network returned by JosJis Core RPC Manager.
 *
 * @returns {Promise<object>} Verified network information.
 */
async function validateReadNetwork() {
    const network = await RPC.rpcRequest(
        provider => provider.getNetwork()
    );

    if (
        Number(network.chainId) !==
        Number(CONFIG.chainId)
    ) {
        throw new Error(
            "Wrong read RPC network: " +
            network.chainId
        );
    }

    return network;
}

// ============================================================
// 11. READ CONTRACT BYTECODE
// ============================================================

/**
 * Checks whether a contract has deployed bytecode.
 *
 * @param {string} address - Contract address.
 * @returns {Promise<string>} Contract bytecode.
 */
async function getContractCode(address) {
    return RPC.rpcRequest(
        provider => provider.getCode(address)
    );
}

// ============================================================
// 12. READ JJS BALANCE AND ALLOWANCE
// ============================================================

/**
 * Retrieves wallet JJS balance and staking allowance.
 *
 * Uses:
 * - Transaction Manager for wallet signer validation.
 * - RPC Manager for network and contract verification.
 * - Token Manager for balance and allowance reads.
 *
 * @returns {Promise<object>} Wallet diagnostic information.
 */
export async function getJJSWalletStatus() {
    let stage = "START";

    try {
        stage = "GET_WALLET_SIGNER";

        const signer = await Transaction.getWalletSigner();

        const address = await signer.getAddress();

        stage = "CHECK_NETWORK";

        const network = await validateReadNetwork();

        stage = "CHECK_TOKEN_CODE";

        const tokenCode = await getContractCode(
            CONFIG.tokenAddress
        );

        if (!tokenCode || tokenCode === "0x") {
            throw new Error(
                "JJS token contract code not found."
            );
        }

        stage = "CHECK_STAKING_CODE";

        const stakingCode = await getContractCode(
            CONFIG.stakingAddress
        );

        if (!stakingCode || stakingCode === "0x") {
            throw new Error(
                "Staking contract code not found."
            );
        }

        stage = "READ_BALANCE";

        const balanceResult =
            await Token.getTokenBalance(
                "JJS",
                address
            );

        const balance = balanceResult.raw;

        stage = "READ_ALLOWANCE";

        const allowanceResult =
            await Token.getAllowance(
                "JJS",
                address,
                CONFIG.stakingAddress
            );

        const allowance = allowanceResult.raw;

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
            "[JJS WALLET STATUS]",
            {
                stage,
                serialized: serializeError(error)
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

// ============================================================
// 13. APPROVE JJS
// ============================================================

/**
 * Approves JJS spending for the staking contract.
 *
 * Core Transaction Manager handles the approval transaction.
 * Core Token Manager reads the current and updated allowance.
 * Core RPC Manager handles gas estimation and contract checks.
 *
 * @param {string|number} amount - Approval amount in JJS.
 * @returns {Promise<object>} Approval result.
 */
export async function approveJJS(amount) {
    let stage = "VALIDATE_AMOUNT";

    try {
        const parsedAmount = validateAmount(amount);

        stage = "GET_SIGNER";

        const signer = await Transaction.getWalletSigner();

        const signerAddress = await signer.getAddress();

        stage = "GET_CORE_PROVIDER";

        const walletProvider =
            await Transaction.getWalletProvider();

        if (
            !walletProvider ||
            typeof walletProvider.request !== "function"
        ) {
            throw new Error(
                "JosJis Core wallet provider is unavailable."
            );
        }

        stage = "CHECK_WALLET_NETWORK";

        const walletChainId = await walletProvider.request({
            method: "eth_chainId"
        });

        const chainId = Number(
            BigInt(walletChainId)
        );

        if (
            chainId !== Number(CONFIG.chainId)
        ) {
            throw new Error(
                "Wallet is not connected to Polygon Mainnet."
            );
        }

        stage = "CHECK_WALLET_ACCOUNT";

        const accounts = await walletProvider.request({
            method: "eth_accounts"
        });

        if (
            !Array.isArray(accounts) ||
            accounts.length === 0
        ) {
            throw new Error(
                "No connected wallet account found."
            );
        }

        if (
            accounts[0].toLowerCase() !==
            signerAddress.toLowerCase()
        ) {
            throw new Error(
                "AppKit account does not match signer address."
            );
        }

        stage = "CHECK_READ_RPC_NETWORK";

        await validateReadNetwork();

        stage = "READ_ALLOWANCE";

        const currentAllowanceResult =
            await Token.getAllowance(
                "JJS",
                signerAddress,
                CONFIG.stakingAddress
            );

        const currentAllowance =
            currentAllowanceResult.raw;

        if (currentAllowance >= parsedAmount) {
            console.log(
                "[JJS APPROVE] Already approved."
            );

            return {
                approved: true,
                alreadyApproved: true,
                allowance: currentAllowance,
                formattedAllowance: formatUnits(
                    currentAllowance,
                    CONFIG.decimals
                )
            };
        }

        stage = "CHECK_TOKEN_CODE";

        const tokenCode = await getContractCode(
            CONFIG.tokenAddress
        );

        if (!tokenCode || tokenCode === "0x") {
            throw new Error(
                "JJS token contract code not found."
            );
        }

        stage = "PREPARE_APPROVE";

        const approveData =
            tokenInterface.encodeFunctionData(
                "approve",
                [
                    CONFIG.stakingAddress,
                    parsedAmount
                ]
            );

        console.log(
            "[JJS APPROVE] Transaction prepared:",
            {
                from: signerAddress,
                to: CONFIG.tokenAddress,
                spender: CONFIG.stakingAddress,
                amount: formatUnits(
                    parsedAmount,
                    CONFIG.decimals
                )
            }
        );

        stage = "ESTIMATE_APPROVE_GAS";

        const estimatedGas =
            await RPC.rpcRequest(provider =>
                provider.estimateGas({
                    from: signerAddress,
                    to: CONFIG.tokenAddress,
                    data: approveData,
                    value: 0n
                })
            );

        if (estimatedGas <= 0n) {
            throw new Error(
                "Gas estimation returned zero."
            );
        }

        console.log(
            "[JJS APPROVE] Gas pre-check:",
            estimatedGas.toString()
        );

        stage = "SEND_APPROVE_TO_WALLET";

        console.log(
            "[JJS APPROVE] Requesting wallet confirmation..."
        );

        // Submit approval through the JosJis Core Transaction Manager.
        const approvalTransaction =
            await Transaction.approveToken(
                "JJS",
                CONFIG.stakingAddress,
                amount
            );

        const transactionHash = approvalTransaction.hash;

        if (
            typeof transactionHash !== "string" ||
            !/^0x[a-fA-F0-9]{64}$/.test(transactionHash)
        ) {
            throw new Error(
                "Wallet did not return a valid transaction hash."
            );
        }

        console.log(
            "[JJS APPROVE] Transaction submitted:",
            transactionHash
        );

        stage = "WAIT_APPROVAL_CONFIRMATION";

        // Use a healthy Core RPC provider for the long receipt wait.
        const receiptProvider =
            await RPC.getHealthyProvider();

        const receipt =
            await receiptProvider.waitForTransaction(
                transactionHash,
                1,
                180000
            );

        if (!receipt) {
            throw new Error(
                "Approval receipt was not found within 180 seconds. Check the transaction hash before retrying."
            );
        }

        if (Number(receipt.status) !== 1) {
            throw new Error(
                "Approval transaction failed on Polygon."
            );
        }

        stage = "VERIFY_ALLOWANCE";

        const updatedAllowanceResult =
            await Token.getAllowance(
                "JJS",
                signerAddress,
                CONFIG.stakingAddress
            );

        const updatedAllowance =
            updatedAllowanceResult.raw;

        if (updatedAllowance < parsedAmount) {
            throw new Error(
                "Transaction confirmed, but allowance is still insufficient."
            );
        }

        console.log(
            "[JJS APPROVE] Approval confirmed:",
            transactionHash
        );

        return {
            approved: true,
            alreadyApproved: false,

            transactionHash,

            allowance: updatedAllowance,

            formattedAllowance: formatUnits(
                updatedAllowance,
                CONFIG.decimals
            ),

            estimatedGas,
            receipt
        };

    } catch (error) {
        console.error(
            "[JJS APPROVE DIAGNOSTIC]",
            {
                stage,
                timestamp: new Date().toISOString(),
                tokenAddress: CONFIG.tokenAddress,
                stakingAddress: CONFIG.stakingAddress,
                chainId: CONFIG.chainId,
                error: serializeError(error)
            }
        );

        throw new Error(
            "APPROVE FAILED [" +
            stage +
            "]: " +
            serializeError(error)
        );
    }
}

// ============================================================
// 14. STAKE JJS
// ============================================================

/**
 * Stakes JJS for the selected duration.
 *
 * @param {string|number} amount - Amount of JJS to stake.
 * @param {string|number|bigint} duration - Staking duration.
 * @returns {Promise<object>} Staking transaction result.
 */
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

    const allowanceResult =
        await Token.getAllowance(
            "JJS",
            address,
            CONFIG.stakingAddress
        );

    const currentAllowance = allowanceResult.raw;

    if (currentAllowance < parsedAmount) {
        throw new Error(
            "Insufficient JJS allowance. Approve JJS before staking."
        );
    }

    const durationConfig =
        await readStaking(contract =>
            contract.durationConfigs(parsedDuration)
        );

    if (!durationConfig.enabled) {
        throw new Error(
            "This staking duration is not enabled."
        );
    }

    const paused =
        await readStaking(contract =>
            contract.stakingPaused()
        );

    if (paused) {
        throw new Error(
            "Staking is currently paused."
        );
    }

    const transaction = await stakingContract.stake(
        parsedAmount,
        parsedDuration
    );

    const receipt = await transaction.wait();

    if (!receipt || Number(receipt.status) !== 1) {
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

// ============================================================
// 15. WITHDRAW PRINCIPAL
// ============================================================

/**
 * Withdraws the principal from an eligible staking position.
 *
 * @param {string|number|bigint} positionId - Staking position ID.
 * @returns {Promise<object>} Withdrawal transaction result.
 */
export async function withdrawPrincipal(positionId) {
    const id = validatePositionId(positionId);

    const {
        stakingContract,
        address
    } = await getSignerContracts();

    const position =
        await readStaking(contract =>
            contract.positions(id)
        );

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

    const transaction =
        await stakingContract.withdrawPrincipal(id);

    const receipt = await transaction.wait();

    if (!receipt || Number(receipt.status) !== 1) {
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

// ============================================================
// 16. CLAIM REWARD
// ============================================================

/**
 * Claims the reward from an eligible staking position.
 *
 * @param {string|number|bigint} positionId - Staking position ID.
 * @returns {Promise<object>} Reward claim transaction result.
 */
export async function claimReward(positionId) {
    const id = validatePositionId(positionId);

    const {
        stakingContract,
        address
    } = await getSignerContracts();

    const position =
        await readStaking(contract =>
            contract.positions(id)
        );

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

    const transaction =
        await stakingContract.claimReward(id);

    const receipt = await transaction.wait();

    if (!receipt || Number(receipt.status) !== 1) {
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
