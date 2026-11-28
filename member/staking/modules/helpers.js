
/**
 * JosJis Staking
 * Module: Helpers
 * Version: V1
 *
 * PURPOSE:
 * Provide reusable utility functions for the staking interface.
 *
 * RESPONSIBILITIES:
 * - Format JJS token amounts for display.
 * - Parse user-entered JJS amounts into token base units.
 * - Calculate and format staking countdowns.
 * - Format Unix timestamps as readable dates.
 * - Shorten wallet addresses and transaction hashes.
 * - Extract readable error messages.
 * - Validate basic EVM wallet address syntax.
 *
 * ARCHITECTURE:
 * This module contains general-purpose utilities only.
 * Web3 providers, wallet connections, contract instances,
 * and blockchain operations should be handled by JosJis Core.
 */

// =========================================
// FORMAT JJS AMOUNT
// =========================================

/**
 * Convert a JJS token amount from base units into a readable string.
 *
 * @param {bigint|string|number} value - Token amount in base units.
 * @param {number} precision - Maximum number of displayed decimal places.
 * @returns {string} Formatted JJS amount.
 *
 * Uses BigInt to avoid floating-point precision loss.
 * Returns "0" if formatting fails.
 */
export function formatJJS(value, precision = 4) {
    try {
        const amount = BigInt(value ?? 0);
        const unit = 10n ** 18n;

        const whole = amount / unit;
        const fraction = amount % unit;

        const fractionText = fraction
            .toString()
            .padStart(18, "0")
            .slice(0, precision)
            .replace(/0+$/, "");

        if (!fractionText) {
            return whole.toLocaleString("en-US");
        }

        return (
            whole.toLocaleString("en-US") +
            "." +
            fractionText
        );

    } catch (error) {
        console.error("formatJJS error:", error);
        return "0";
    }
}

// =========================================
// PARSE JJS AMOUNT
// =========================================

/**
 * Convert a user-entered JJS amount into its smallest token unit.
 *
 * @param {string|number} value - Human-readable JJS amount.
 * @returns {bigint} Amount converted to 18-decimal base units.
 * @throws {Error} If the supplied amount has an invalid format.
 *
 * Accepts up to 18 decimal places.
 * Does not use JavaScript floating-point arithmetic for conversion.
 */
export function parseJJS(value) {
    if (typeof value !== "string" && typeof value !== "number") {
        throw new Error("Invalid JJS amount.");
    }

    const amount = String(value).trim();

    if (!/^\d+(\.\d{1,18})?$/.test(amount)) {
        throw new Error("Enter a valid JJS amount.");
    }

    const [whole, fraction = ""] = amount.split(".");

    return (
        BigInt(whole) * (10n ** 18n) +
        BigInt((fraction + "0".repeat(18)).slice(0, 18))
    );
}

// =========================================
// FORMAT COUNTDOWN
// =========================================

/**
 * Format the remaining time until a staking position unlocks.
 *
 * @param {number|string|bigint} unlockTime - Unlock timestamp in Unix seconds.
 * @returns {string} Remaining time or "Unlocked".
 *
 * Displays available time units:
 * - Days (d)
 * - Hours (h)
 * - Minutes (m)
 * - Seconds (s)
 *
 * Returns "--" if countdown formatting fails.
 */
export function formatCountdown(unlockTime) {
    try {
        const unlock = Number(unlockTime);
        const now = Math.floor(Date.now() / 1000);

        let remaining = unlock - now;

        if (!Number.isFinite(remaining) || remaining <= 0) {
            return "Unlocked";
        }

        const days = Math.floor(remaining / 86400);
        remaining %= 86400;

        const hours = Math.floor(remaining / 3600);
        remaining %= 3600;

        const minutes = Math.floor(remaining / 60);
        const seconds = remaining % 60;

        const parts = [];

        if (days > 0) parts.push(`${days}d`);
        if (hours > 0) parts.push(`${hours}h`);
        if (minutes > 0) parts.push(`${minutes}m`);

        parts.push(`${seconds}s`);

        return parts.join(" ");

    } catch (error) {
        console.error("formatCountdown error:", error);
        return "--";
    }
}

// =========================================
// GET TIME REMAINING
// =========================================

/**
 * Calculate the remaining time before a staking position unlocks.
 *
 * @param {number|string|bigint} unlockTime - Unlock timestamp in Unix seconds.
 * @returns {number} Remaining seconds, or zero if already unlocked
 *                   or the timestamp is invalid.
 */
export function getTimeRemaining(unlockTime) {
    const unlock = Number(unlockTime);
    const now = Math.floor(Date.now() / 1000);

    if (!Number.isFinite(unlock)) {
        return 0;
    }

    return Math.max(0, unlock - now);
}

// =========================================
// FORMAT DATE
// =========================================

/**
 * Convert a Unix timestamp into a readable date and time.
 *
 * @param {number|string|bigint} timestamp - Unix timestamp in seconds.
 * @returns {string} Formatted date and time, or "--" if invalid.
 *
 * Uses the en-US locale with the user's local timezone.
 */
export function formatDate(timestamp) {
    try {
        const date = new Date(Number(timestamp) * 1000);

        if (Number.isNaN(date.getTime())) {
            return "--";
        }

        return date.toLocaleString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });

    } catch (error) {
        console.error("formatDate error:", error);
        return "--";
    }
}

// =========================================
// SHORTEN WALLET ADDRESS
// =========================================

/**
 * Shorten an EVM wallet address for compact interface display.
 *
 * @param {string} address - Wallet address.
 * @param {number} start - Number of hexadecimal characters to retain at the start.
 * @param {number} end - Number of characters to retain at the end.
 * @returns {string} Shortened address or fallback value.
 *
 * Example:
 * 0x1234567890abcdef1234567890abcdef12345678
 * becomes:
 * 0x123456...5678
 */
export function shortenAddress(address, start = 6, end = 4) {
    if (
        typeof address !== "string" ||
        !address.startsWith("0x") ||
        address.length < start + end + 2
    ) {
        return address || "--";
    }

    return (
        address.slice(0, start + 2) +
        "..." +
        address.slice(-end)
    );
}

// =========================================
// GET ERROR MESSAGE
// =========================================

/**
 * Extract a readable message from common JavaScript and ethers errors.
 *
 * @param {Error|object|string|null|undefined} error - Error object or value.
 * @returns {string} Best available error message.
 *
 * Checks common error fields in priority order:
 * - reason
 * - shortMessage
 * - info.error.message
 * - data.message
 * - message
 *
 * Returns "Unknown error." when no error value is provided.
 */
export function getErrorMessage(error) {
    if (!error) {
        return "Unknown error.";
    }

    if (error.reason) {
        return error.reason;
    }

    if (error.shortMessage) {
        return error.shortMessage;
    }

    if (error.info?.error?.message) {
        return error.info.error.message;
    }

    if (error.data?.message) {
        return error.data.message;
    }

    if (error.message) {
        return error.message;
    }

    return String(error);
}

// =========================================
// VALIDATE WALLET ADDRESS
// =========================================

/**
 * Check whether a value matches the basic EVM address format.
 *
 * @param {string} address - Address to validate.
 * @returns {boolean} True if the value contains 40 hexadecimal
 *                    characters after the 0x prefix.
 *
 * This performs format validation only.
 * It does not verify checksum casing or blockchain account existence.
 */
export function isValidAddress(address) {
    return (
        typeof address === "string" &&
        /^0x[a-fA-F0-9]{40}$/.test(address)
    );
}

// =========================================
// FORMAT TRANSACTION HASH
// =========================================

/**
 * Shorten a 32-byte transaction hash for interface display.
 *
 * @param {string} hash - Transaction hash.
 * @returns {string} Shortened hash or fallback value.
 *
 * Only accepts a hexadecimal hash with the expected 66-character length.
 */
export function shortenHash(hash) {
    if (
        typeof hash !== "string" ||
        !hash.startsWith("0x") ||
        hash.length !== 66
    ) {
        return hash || "--";
    }

    return hash.slice(0, 10) + "..." + hash.slice(-8);
}
