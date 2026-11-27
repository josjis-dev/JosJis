/**
 * JosJis Staking
 * Module: Helpers
 * Version: V1
 */

/* =========================================
   FORMAT JJS AMOUNT
========================================= */

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

/* =========================================
   PARSE JJS AMOUNT
========================================= */

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

/* =========================================
   FORMAT COUNTDOWN
========================================= */

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

/* =========================================
   GET TIME REMAINING
========================================= */

export function getTimeRemaining(unlockTime) {
    const unlock = Number(unlockTime);
    const now = Math.floor(Date.now() / 1000);

    if (!Number.isFinite(unlock)) {
        return 0;
    }

    return Math.max(0, unlock - now);
}

/* =========================================
   FORMAT DATE
========================================= */

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

/* =========================================
   SHORTEN WALLET ADDRESS
========================================= */

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

/* =========================================
   GET ERROR MESSAGE
========================================= */

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

/* =========================================
   VALIDATE WALLET ADDRESS
========================================= */

export function isValidAddress(address) {
    return (
        typeof address === "string" &&
        /^0x[a-fA-F0-9]{40}$/.test(address)
    );
}

/* =========================================
   FORMAT TRANSACTION HASH
========================================= */

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
