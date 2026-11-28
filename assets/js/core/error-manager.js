
/**
 * ============================================================
 * PROJECT: JOSJIS
 * MODULE: ERROR MANAGER
 * FILE: assets/js/core/error-manager.js
 * ============================================================
 *
 * PURPOSE:
 * Centralized error detection, classification, normalization,
 * and logging system for the JosJis ecosystem.
 *
 * RESPONSIBILITIES:
 * 1. Define standardized application error categories.
 * 2. Extract useful information from different error objects.
 * 3. Identify the category of an encountered error.
 * 4. Provide user-friendly error messages.
 * 5. Normalize errors into a consistent object structure.
 * 6. Log diagnostic information to the browser console.
 * 7. Create application-specific errors.
 * 8. Identify specific error categories through helper functions.
 *
 * SUPPORTED ERROR CATEGORIES:
 * - RPC_ERROR
 * - WALLET_ERROR
 * - NETWORK_ERROR
 * - CONTRACT_ERROR
 * - TRANSACTION_ERROR
 * - USER_REJECTED
 * - INSUFFICIENT_FUNDS
 * - UNKNOWN_ERROR
 *
 * DEPENDENCIES:
 * - JavaScript ES Modules
 *
 * IMPORTANT:
 * This module does not execute transactions or modify
 * blockchain state. It only processes application errors.
 *
 * NOTE:
 * Existing functions, exports, messages, classification order,
 * and execution logic are preserved.
 */

// ============================================================
// 1. ERROR CATEGORY DEFINITIONS
// ============================================================

/**
 * Central collection of standardized error identifiers.
 *
 * PURPOSE:
 * Provides consistent error category names across
 * different JosJis modules.
 *
 * RPC:
 * Blockchain RPC communication failures.
 *
 * WALLET:
 * Wallet connection or provider access failures.
 *
 * NETWORK:
 * Blockchain network or chain configuration problems.
 *
 * CONTRACT:
 * Smart contract execution or contract call failures.
 *
 * TRANSACTION:
 * Transaction processing, gas, or nonce failures.
 *
 * USER_REJECTED:
 * Operations rejected or cancelled by the user.
 *
 * INSUFFICIENT_FUNDS:
 * Insufficient balance for transaction execution.
 *
 * UNKNOWN:
 * Errors that cannot be identified by existing rules.
 */
export const ERROR_TYPES = {
    RPC: "RPC_ERROR",
    WALLET: "WALLET_ERROR",
    NETWORK: "NETWORK_ERROR",
    CONTRACT: "CONTRACT_ERROR",
    TRANSACTION: "TRANSACTION_ERROR",
    USER_REJECTED: "USER_REJECTED",
    INSUFFICIENT_FUNDS: "INSUFFICIENT_FUNDS",
    UNKNOWN: "UNKNOWN_ERROR"
};

// ============================================================
// 2. EXTRACT ERROR MESSAGE
// ============================================================

/**
 * Extracts available message information from an error object.
 *
 * @param {Error|Object|null} error - Original error object.
 * @returns {string} Combined lowercase error message.
 *
 * SUPPORTED MESSAGE SOURCES:
 * - error.message
 * - error.shortMessage
 * - error.reason
 * - error.info.error.message
 * - error.error.message
 *
 * PROCESS:
 * 1. Return an empty string if no error exists.
 * 2. Collect available error message properties.
 * 3. Remove empty or undefined values.
 * 4. Combine the remaining messages.
 * 5. Convert the final result to lowercase.
 *
 * This helper is used by classifyError().
 */
function getErrorMessage(error) {
    if (!error) {
        return "";
    }

    return [
        error.message,
        error.shortMessage,
        error.reason,
        error.info?.error?.message,
        error.error?.message
    ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
}

// ============================================================
// 3. CLASSIFY ERROR CATEGORY
// ============================================================

/**
 * Identifies the category of an encountered error.
 *
 * @param {Error|Object|null} error - Original error object.
 * @returns {string} Standardized error category.
 *
 * CLASSIFICATION ORDER:
 *
 * 1. USER_REJECTED
 *    Detects wallet or user rejection codes.
 *
 * 2. INSUFFICIENT_FUNDS
 *    Detects insufficient balance or gas funds.
 *
 * 3. NETWORK
 *    Detects network, chain, or wrong-network messages.
 *
 * 4. RPC
 *    Detects RPC, timeout, and connection failures.
 *
 * 5. WALLET
 *    Detects wallet, provider, and connection problems.
 *
 * 6. CONTRACT
 *    Detects contract execution and revert errors.
 *
 * 7. TRANSACTION
 *    Detects transaction, gas, and nonce errors.
 *
 * 8. UNKNOWN
 *    Returned when no existing classification rule matches.
 *
 * IMPORTANT:
 * The classification order is preserved because
 * an error message may contain keywords from multiple categories.
 */
export function classifyError(error) {
    const message = getErrorMessage(error);

    const code = error?.code;

    if (
        code === 4001 ||
        code === "ACTION_REJECTED" ||
        code === "USER_REJECTED"
    ) {
        return ERROR_TYPES.USER_REJECTED;
    }

    if (
        code === "INSUFFICIENT_FUNDS" ||
        message.includes("insufficient funds") ||
        message.includes("insufficient balance")
    ) {
        return ERROR_TYPES.INSUFFICIENT_FUNDS;
    }

    if (
        message.includes("network") ||
        message.includes("chain") ||
        message.includes("wrong network")
    ) {
        return ERROR_TYPES.NETWORK;
    }

    if (
        message.includes("rpc") ||
        message.includes("timeout") ||
        message.includes("failed to fetch") ||
        message.includes("could not detect network")
    ) {
        return ERROR_TYPES.RPC;
    }

    if (
        message.includes("wallet") ||
        message.includes("provider") ||
        message.includes("not connected")
    ) {
        return ERROR_TYPES.WALLET;
    }

    if (
        message.includes("revert") ||
        message.includes("execution reverted") ||
        message.includes("call exception")
    ) {
        return ERROR_TYPES.CONTRACT;
    }

    if (
        message.includes("transaction") ||
        message.includes("gas") ||
        message.includes("nonce")
    ) {
        return ERROR_TYPES.TRANSACTION;
    }

    return ERROR_TYPES.UNKNOWN;
}

// ============================================================
// 4. USER-FRIENDLY ERROR MESSAGES
// ============================================================

/**
 * Maps standardized error categories to user-friendly messages.
 *
 * PURPOSE:
 * Prevents raw technical error messages from being
 * directly presented to ordinary website users.
 *
 * RPC:
 * Displays a blockchain connection warning.
 *
 * WALLET:
 * Displays a wallet connection warning.
 *
 * NETWORK:
 * Informs users about the required Polygon network.
 *
 * CONTRACT:
 * Indicates that the smart contract rejected a request.
 *
 * TRANSACTION:
 * Indicates a transaction processing failure.
 *
 * USER_REJECTED:
 * Indicates that the user cancelled an operation.
 *
 * INSUFFICIENT_FUNDS:
 * Indicates insufficient transaction balance or gas funds.
 *
 * UNKNOWN:
 * Provides a generic error message.
 *
 * These messages are returned by normalizeError()
 * and getFriendlyMessage().
 */
const ERROR_MESSAGES = {
    [ERROR_TYPES.RPC]:
        "Koneksi blockchain bermasalah. Silakan coba lagi.",

    [ERROR_TYPES.WALLET]:
        "Wallet belum terhubung atau tidak dapat diakses.",

    [ERROR_TYPES.NETWORK]:
        "Jaringan tidak sesuai. Silakan gunakan Polygon.",

    [ERROR_TYPES.CONTRACT]:
        "Smart contract menolak permintaan tersebut.",

    [ERROR_TYPES.TRANSACTION]:
        "Transaksi gagal diproses. Silakan periksa kembali.",

    [ERROR_TYPES.USER_REJECTED]:
        "Transaksi dibatalkan oleh pengguna.",

    [ERROR_TYPES.INSUFFICIENT_FUNDS]:
        "Saldo tidak mencukupi untuk transaksi dan biaya gas.",

    [ERROR_TYPES.UNKNOWN]:
        "Terjadi kesalahan yang tidak diketahui."
};

// ============================================================
// 5. NORMALIZE ERROR OBJECT
// ============================================================

/**
 * Converts an original error into a standardized error object.
 *
 * @param {Error|Object|null} error - Original error object.
 * @returns {Object} Normalized error information.
 *
 * RETURNED STRUCTURE:
 *
 * type:
 * Standardized error category.
 *
 * message:
 * User-friendly error message.
 *
 * originalMessage:
 * Original technical error message.
 *
 * code:
 * Original error code when available.
 *
 * timestamp:
 * Error creation timestamp in milliseconds.
 *
 * PURPOSE:
 * Provides a consistent error structure for other modules.
 */
export function normalizeError(error) {
    const type = classifyError(error);

    return {
        type,
        message: ERROR_MESSAGES[type],
        originalMessage: error?.shortMessage ||
            error?.message ||
            "Unknown error",
        code: error?.code || null,
        timestamp: Date.now()
    };
}

// ============================================================
// 6. GET USER-FRIENDLY ERROR MESSAGE
// ============================================================

/**
 * Returns only the user-friendly error message.
 *
 * @param {Error|Object|null} error - Original error object.
 * @returns {string} User-friendly error message.
 *
 * Internally uses normalizeError() to classify the error
 * and retrieve the corresponding message.
 */
export function getFriendlyMessage(error) {
    return normalizeError(error).message;
}

// ============================================================
// 7. LOG ERROR INFORMATION
// ============================================================

/**
 * Logs normalized error information to the browser console.
 *
 * @param {Error|Object|null} error - Original error object.
 * @param {string} context - Module or operation identifier.
 * @returns {Object} Normalized error information.
 *
 * LOGGED INFORMATION:
 * - Error category.
 * - User-friendly message.
 * - Original technical message.
 * - Error code.
 *
 * The context parameter identifies where the error occurred.
 *
 * The normalized error object is also returned
 * for additional processing by the calling module.
 */
export function logError(error, context = "JosJis") {
    const normalized = normalizeError(error);

    console.error(`[${context}]`, {
        type: normalized.type,
        message: normalized.message,
        originalMessage: normalized.originalMessage,
        code: normalized.code
    });

    return normalized;
}

// ============================================================
// 8. HANDLE APPLICATION ERROR
// ============================================================

/**
 * Handles an application error using the centralized logger.
 *
 * @param {Error|Object|null} error - Original error object.
 * @param {string} context - Module or operation identifier.
 * @returns {Object} Normalized error information.
 *
 * PURPOSE:
 * Provides a common error-handling entry point
 * for other JosJis modules.
 *
 * Currently delegates processing to logError().
 */
export function handleError(error, context = "JosJis") {
    return logError(error, context);
}

// ============================================================
// 9. CREATE CUSTOM APPLICATION ERROR
// ============================================================

/**
 * Creates a custom error associated with the JosJis application.
 *
 * @param {string} message - Custom error description.
 * @param {string} type - Standardized error category.
 * @returns {Error} Application-specific error instance.
 *
 * CREATED ERROR PROPERTIES:
 *
 * name:
 * Identifies the error as JosJisAppError.
 *
 * errorType:
 * Stores the associated application error category.
 *
 * PURPOSE:
 * Allows application modules to create errors
 * with additional JosJis-specific information.
 */
export function createAppError(
    message,
    type = ERROR_TYPES.UNKNOWN
) {
    const error = new Error(message);

    error.name = "JosJisAppError";
    error.errorType = type;

    return error;
}

// ============================================================
// 10. CHECK USER-REJECTED ERROR
// ============================================================

/**
 * Checks whether an error represents user rejection.
 *
 * @param {Error|Object|null} error - Original error object.
 * @returns {boolean} True if the error is USER_REJECTED.
 *
 * Commonly used when users cancel wallet connection
 * or reject a transaction request.
 */
export function isUserRejected(error) {
    return classifyError(error) === ERROR_TYPES.USER_REJECTED;
}

// ============================================================
// 11. CHECK RPC ERROR
// ============================================================

/**
 * Checks whether an error belongs to the RPC category.
 *
 * @param {Error|Object|null} error - Original error object.
 * @returns {boolean} True if the error is RPC_ERROR.
 *
 * Can be used by modules that need to distinguish
 * blockchain communication failures from other errors.
 */
export function isRPCError(error) {
    return classifyError(error) === ERROR_TYPES.RPC;
}

// ============================================================
// 12. CHECK TRANSACTION ERROR
// ============================================================

/**
 * Checks whether an error is transaction-related.
 *
 * @param {Error|Object|null} error - Original error object.
 * @returns {boolean} True if the error is transaction-related.
 *
 * TRANSACTION-RELATED CATEGORIES:
 * - TRANSACTION_ERROR
 * - INSUFFICIENT_FUNDS
 * - USER_REJECTED
 *
 * PURPOSE:
 * Groups common transaction-related failures
 * into a single boolean check.
 */
export function isTransactionError(error) {
    const type = classifyError(error);

    return (
        type === ERROR_TYPES.TRANSACTION ||
        type === ERROR_TYPES.INSUFFICIENT_FUNDS ||
        type === ERROR_TYPES.USER_REJECTED
    );
}
