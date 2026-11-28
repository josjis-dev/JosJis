
/**
 * JosJis Staking
 * Module: Staking Actions
 * Version: V8
 * Network: Polygon Mainnet
 *
 * READ:
 * Public Polygon RPC
 *
 * WRITE:
 * MetaMask Signer through Core Transaction Manager
 *
 * APPROVE:
 * Public RPC gas estimation
 * MetaMask signer transaction submission
 */

import {
    Contract,
    JsonRpcProvider,
    parseUnits,
    formatUnits
} from "https://esm.sh/ethers@6.15.0";

import {
    CONFIG,
    TOKEN_ABI,
    STAKING_ABI
} from "./config.js";

import {
    getWalletSigner
} from "../../../assets/js/core/transaction-manager.js";

/* =========================================
   PUBLIC READ RPC
========================================= */

const READ_RPC_URL =
    "https://polygon-bor-rpc.publicnode.com";

const readProvider = new JsonRpcProvider(
    READ_RPC_URL,
    CONFIG.chainId
);

/* =========================================
   READ-ONLY CONTRACT INSTANCES
========================================= */

const tokenReadContract = new Contract(
    CONFIG.tokenAddress,
    TOKEN_ABI,
    readProvider
);

const stakingReadContract = new Contract(
    CONFIG.stakingAddress,
    STAKING_ABI,
    readProvider
);

/* =========================================
   SIGNER CONTRACTS
========================================= */

async function getSignerContracts() {
    const signer = await getWalletSigner();

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

/* =========================================
   ERROR SERIALIZER V8
========================================= */

function serializeError(error) {
    const seen = new WeakSet();

    function clean(value, depth = 0) {
        if (value === null || value === undefined) {
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
            message: error?.message || String(error),
            serializationError:
                serializationError?.message || String(serializationError)
        });
    }
}

/* =========================================
   VALIDATE AMOUNT
========================================= */

function validateAmount(amount) {
    if (
        typeof amount !== "string" &&
        typeof amount !== "number"
    ) {
        throw new Error("Invalid JJS amount.");
    }

    const value = String(amount).trim();

    if (!/^\d+(\.\d{1,18})?$/.test(value)) {
        throw new Error("Enter a valid JJS amount.");
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

/* =========================================
   VALIDATE POSITION ID
========================================= */

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

/* =========================================
   CHECK READ RPC NETWORK
========================================= */

async function validateReadNetwork() {
    const network = await readProvider.getNetwork();

    if (Number(network.chainId) !== CONFIG.chainId) {
        throw new Error(
            "Wrong read RPC network: " + network.chainId
        );
    }

    return network;
}

/* =========================================
   READ JJS BALANCE & ALLOWANCE
========================================= */

export async function getJJSWalletStatus() {
    let stage = "START";

    try {
        stage = "GET_WALLET_SIGNER";

        const signer = await getWalletSigner();

        const address = await signer.getAddress();

        stage = "CHECK_NETWORK";

        const network = await validateReadNetwork();

        stage = "CHECK_TOKEN_CODE";

        const tokenCode = await readProvider.getCode(
            CONFIG.tokenAddress
        );

        if (!tokenCode || tokenCode === "0x") {
            throw new Error(
                "JJS token contract code not found."
            );
        }

        stage = "CHECK_STAKING_CODE";

        const stakingCode = await readProvider.getCode(
            CONFIG.stakingAddress
        );

        if (!stakingCode || stakingCode === "0x") {
            throw new Error(
                "Staking contract code not found."
            );
        }

        stage = "READ_BALANCE";

        const balance = await tokenReadContract.balanceOf(
            address
        );

        stage = "READ_ALLOWANCE";

        const allowance = await tokenReadContract.allowance(
            address,
            CONFIG.stakingAddress
        );

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
            "[JJS WALLET STATUS V8]",
            {
                stage,
                error,
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

/* =========================================
   APPROVE JJS - V8 DIAGNOSTIC
========================================= */

export async function approveJJS(amount) {
    let stage = "VALIDATE_AMOUNT";

    try {
        const parsedAmount = validateAmount(amount);

        stage = "GET_SIGNER_CONTRACTS";

        const {
            signer,
            tokenContract,
            address
        } = await getSignerContracts();

        stage = "CHECK_WALLET_ADDRESS";

        const signerAddress = await signer.getAddress();

        if (
            signerAddress.toLowerCase() !==
            address.toLowerCase()
        ) {
            throw new Error(
                "Signer address does not match wallet address."
            );
        }

        stage = "CHECK_WALLET_NETWORK";

        const signerProvider = signer.provider;

        if (!signerProvider) {
            throw new Error(
                "Wallet signer provider is unavailable."
            );
        }

        const signerNetwork =
            await signerProvider.getNetwork();

        if (
            Number(signerNetwork.chainId) !==
            CONFIG.chainId
        ) {
            throw new Error(
                "Wallet is not connected to Polygon."
            );
        }

        stage = "CHECK_READ_RPC_NETWORK";

        await validateReadNetwork();

        stage = "READ_ALLOWANCE";

        const currentAllowance =
            await tokenReadContract.allowance(
                address,
                CONFIG.stakingAddress
            );

        if (currentAllowance >= parsedAmount) {
            console.log(
                "[JJS APPROVE V8] Already approved."
            );

            return {
                approved: true,
                alreadyApproved: true,
                allowance: currentAllowance
            };
        }

        stage = "CHECK_TOKEN_CODE";

        const tokenCode = await readProvider.getCode(
            CONFIG.tokenAddress
        );

        if (!tokenCode || tokenCode === "0x") {
            throw new Error(
                "JJS token contract code not found."
            );
        }

        stage = "PREPARE_APPROVE";

        const approveMethod = tokenContract.getFunction(
            "approve"
        );

        const transactionRequest =
            await approveMethod.populateTransaction(
                CONFIG.stakingAddress,
                parsedAmount
            );

        if (
            !transactionRequest.to ||
            transactionRequest.to.toLowerCase() !==
            CONFIG.tokenAddress.toLowerCase()
        ) {
            throw new Error(
                "Approve transaction target is incorrect."
            );
        }

        if (!transactionRequest.data) {
            throw new Error(
                "Approve transaction data is missing."
            );
        }

        console.log(
            "[JJS APPROVE V8] Transaction prepared:",
            {
                from: address,
                to: transactionRequest.to,
                data: transactionRequest.data,
                value: transactionRequest.value || "0",
                amount: formatUnits(
                    parsedAmount,
                    CONFIG.decimals
                )
            }
        );

        /* =================================
           PUBLIC RPC GAS ESTIMATION
        ================================= */

        stage = "ESTIMATE_APPROVE_GAS";

        console.log(
            "[JJS APPROVE V8] Estimating gas through public RPC..."
        );

        const estimatedGas =
            await readProvider.estimateGas({
                ...transactionRequest,
                from: address
            });

        if (estimatedGas <= 0n) {
            throw new Error(
                "Gas estimation returned zero."
            );
        }

        // 20% buffer + 10,000 gas units.
        const gasLimit =
            estimatedGas * 120n / 100n + 10000n;

        console.log(
            "[JJS APPROVE V8] Gas estimation successful:",
            {
                estimatedGas: estimatedGas.toString(),
                gasLimit: gasLimit.toString()
            }
        );

        /* =================================
           SEND APPROVE TO METAMASK
        ================================= */

        stage = "SEND_APPROVE_TO_WALLET";

        console.log(
            "[JJS APPROVE V8] Requesting wallet confirmation..."
        );

        const transaction = await signer.sendTransaction({
            ...transactionRequest,
            gasLimit
        });

        console.log(
            "[JJS APPROVE V8] Transaction submitted:",
            transaction.hash
        );

        /* =================================
           WAIT RECEIPT
        ================================= */

        stage = "WAIT_APPROVAL_CONFIRMATION";

        const receipt = await transaction.wait();

        if (!receipt || receipt.status !== 1) {
            throw new Error(
                "Approval transaction failed on Polygon."
            );
        }

        console.log(
            "[JJS APPROVE V8] Approval confirmed:",
            transaction.hash
        );

        return {
            approved: true,
            alreadyApproved: false,
            transactionHash: transaction.hash,
            estimatedGas,
            gasLimit,
            receipt
        };

    } catch (error) {
        const diagnostic = {
            version: "V8",
            stage,
            timestamp: new Date().toISOString(),
            tokenAddress: CONFIG.tokenAddress,
            stakingAddress: CONFIG.stakingAddress,
            chainId: CONFIG.chainId,
            error: serializeError(error)
        };

        console.error(
            "[JJS APPROVE DIAGNOSTIC V8]",
            diagnostic
        );

        throw new Error(
            "APPROVE FAILED [V8 - " +
            stage +
            "]: " +
            serializeError(error)
        );
    }
}

/* =========================================
   STAKE JJS
========================================= */

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

    const currentAllowance =
        await tokenReadContract.allowance(
            address,
            CONFIG.stakingAddress
        );

    if (currentAllowance < parsedAmount) {
        throw new Error(
            "Insufficient JJS allowance. Approve JJS before staking."
        );
    }

    const durationConfig =
        await stakingReadContract.durationConfigs(
            parsedDuration
        );

    if (!durationConfig.enabled) {
        throw new Error(
            "This staking duration is not enabled."
        );
    }

    const paused =
        await stakingReadContract.stakingPaused();

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

    if (!receipt || receipt.status !== 1) {
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

/* =========================================
   WITHDRAW PRINCIPAL
========================================= */

export async function withdrawPrincipal(positionId) {
    const id = validatePositionId(positionId);

    const {
        stakingContract,
        address
    } = await getSignerContracts();

    const position = await stakingReadContract.positions(id);

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

    if (!receipt || receipt.status !== 1) {
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

/* =========================================
   CLAIM REWARD
========================================= */

export async function claimReward(positionId) {
    const id = validatePositionId(positionId);

    const {
        stakingContract,
        address
    } = await getSignerContracts();

    const position = await stakingReadContract.positions(id);

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

    if (!receipt || receipt.status !== 1) {
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
