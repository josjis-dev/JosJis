
/*
========================================
 ERROR MANAGER
 JosJis Ecosystem
========================================
*/

// Daftar kategori error
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

// Mengambil pesan error
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

// Mengenali kategori error
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

// Pesan yang mudah dipahami pengguna
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

// Mengubah error menjadi format standar
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

// Mengambil pesan error saja
export function getFriendlyMessage(error) {
    return normalizeError(error).message;
}

// Menampilkan error ke console
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

// Menangani error dan mengembalikan format standar
export function handleError(error, context = "JosJis") {
    return logError(error, context);
}

// Membuat error khusus aplikasi
export function createAppError(
    message,
    type = ERROR_TYPES.UNKNOWN
) {
    const error = new Error(message);

    error.name = "JosJisAppError";
    error.errorType = type;

    return error;
}

// Memeriksa apakah error berasal dari pembatalan pengguna
export function isUserRejected(error) {
    return classifyError(error) === ERROR_TYPES.USER_REJECTED;
}

// Memeriksa apakah error berasal dari RPC
export function isRPCError(error) {
    return classifyError(error) === ERROR_TYPES.RPC;
}

// Memeriksa apakah error berasal dari transaksi
export function isTransactionError(error) {
    const type = classifyError(error);

    return (
        type === ERROR_TYPES.TRANSACTION ||
        type === ERROR_TYPES.INSUFFICIENT_FUNDS ||
        type === ERROR_TYPES.USER_REJECTED
    );
}
