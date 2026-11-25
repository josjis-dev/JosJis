
import {
    getAllBalances,
    getTokenDetails,
    getTotalSupply
} from "./token-manager.js";

import {
    getWalletInfo
} from "./wallet-manager.js";

/*
========================================
DATA MANAGER
JosJis Ecosystem
========================================
*/

// =====================================
// DATA STORE
// =====================================

const dataStore = {
    wallet: null,
    balances: null,
    tokenDetails: {},
    totalSupply: {},
    lastUpdated: null
};

// =====================================
// LOADING STATE
// =====================================

let loading = false;

let walletLoadPromise = null;
let walletLoadAddress = null;

// =====================================
// ERROR HELPER
// =====================================

function getErrorMessage(error) {

    if (error?.message) {
        return error.message;
    }

    return String(error || "Unknown error");
}

// =====================================
// VALIDATE BALANCES
// =====================================

function validateBalances(balances) {

    if (!balances || typeof balances !== "object") {
        throw new Error("Data saldo tidak tersedia.");
    }

    const keys = ["JJS", "POL", "USDT0"];

    const output = {};

    for (const key of keys) {

        const balance = balances[key];

        if (!balance) {

            output[key] = {
                error: "Data saldo tidak ditemukan."
            };

            continue;
        }

        if (balance.error) {

            output[key] = {
                error: getErrorMessage(balance.error)
            };

            continue;
        }

        output[key] = balance;
    }

    return output;
}

// =====================================
// WALLET DATA
// =====================================

export async function loadWalletData(
    address,
    suppliedBalances = null
) {

    if (!address) {
        throw new Error("Alamat wallet belum tersedia.");
    }

    // Gunakan saldo yang diberikan jika tersedia.
    // Tidak melakukan RPC balance request ulang.

    if (suppliedBalances !== null) {

        const balances = validateBalances(
            suppliedBalances
        );

        dataStore.wallet = {
            ...getWalletInfo(),
            address
        };

        dataStore.balances = balances;
        dataStore.lastUpdated = Date.now();

        return {
            wallet: dataStore.wallet,
            balances: dataStore.balances,
            lastUpdated: dataStore.lastUpdated
        };
    }

    // Cegah pembacaan bersamaan untuk wallet yang sama.

    if (
        walletLoadPromise &&
        walletLoadAddress?.toLowerCase() ===
        address.toLowerCase()
    ) {
        return walletLoadPromise;
    }

    loading = true;
    walletLoadAddress = address;

    walletLoadPromise = (async () => {

        try {

            const result = await getAllBalances(address);

            const balances = validateBalances(result);

            dataStore.wallet = {
                ...getWalletInfo(),
                address
            };

            dataStore.balances = balances;
            dataStore.lastUpdated = Date.now();

            return {
                wallet: dataStore.wallet,
                balances: dataStore.balances,
                lastUpdated: dataStore.lastUpdated
            };

        } finally {

            loading = false;
            walletLoadPromise = null;
            walletLoadAddress = null;

        }

    })();

    return walletLoadPromise;
}

// =====================================
// TOKEN DETAILS
// =====================================

export async function loadTokenDetails(tokenName) {

    const details = await getTokenDetails(tokenName);

    dataStore.tokenDetails[tokenName] = details;

    return details;
}

// =====================================
// TOTAL SUPPLY
// =====================================

export async function loadTotalSupply(tokenName) {

    const supply = await getTotalSupply(tokenName);

    dataStore.totalSupply[tokenName] = supply;

    return supply;
}

// =====================================
// LOAD ALL TOKEN DETAILS
// =====================================

export async function loadAllTokenDetails() {

    const tokens = ["JJS", "USDT0"];

    const results = await Promise.allSettled(
        tokens.map(token => loadTokenDetails(token))
    );

    return Object.fromEntries(

        tokens.map((token, index) => {

            const result = results[index];

            return [
                token,
                result.status === "fulfilled"
                    ? result.value
                    : {
                        error: getErrorMessage(result.reason)
                    }
            ];

        })

    );
}

// =====================================
// LOAD ALL TOTAL SUPPLY
// =====================================

export async function loadAllTotalSupply() {

    const tokens = ["JJS"];

    const results = await Promise.allSettled(
        tokens.map(token => loadTotalSupply(token))
    );

    return Object.fromEntries(

        tokens.map((token, index) => {

            const result = results[index];

            return [
                token,
                result.status === "fulfilled"
                    ? result.value
                    : {
                        error: getErrorMessage(result.reason)
                    }
            ];

        })

    );
}

// =====================================
// DASHBOARD DATA
// =====================================

export async function loadDashboardData(
    address,
    suppliedBalances = null
) {

    if (!address) {
        throw new Error("Alamat wallet belum tersedia.");
    }

    let walletResult;

    try {

        walletResult = await loadWalletData(
            address,
            suppliedBalances
        );

    } catch (error) {

        return {
            wallet: {
                error: getErrorMessage(error)
            },

            balances: null,
            tokenDetails: {},
            totalSupply: {},
            lastUpdated: dataStore.lastUpdated
        };
    }

    // Ambil informasi token dan supply.

    const [
        tokenDetails,
        totalSupply
    ] = await Promise.allSettled([

        loadAllTokenDetails(),

        loadAllTotalSupply()

    ]);

    return {

        wallet: walletResult.wallet,

        balances: walletResult.balances,

        tokenDetails:
            tokenDetails.status === "fulfilled"
                ? tokenDetails.value
                : {
                    error: getErrorMessage(
                        tokenDetails.reason
                    )
                },

        totalSupply:
            totalSupply.status === "fulfilled"
                ? totalSupply.value
                : {
                    error: getErrorMessage(
                        totalSupply.reason
                    )
                },

        lastUpdated: dataStore.lastUpdated

    };
}

// =====================================
// GET CACHED DATA
// =====================================

export function getCachedData() {
    return dataStore;
}

// =====================================
// GET CACHED BALANCES
// =====================================

export function getCachedBalances() {
    return dataStore.balances;
}

// =====================================
// CLEAR CACHE
// =====================================

export function clearDataCache() {

    dataStore.wallet = null;
    dataStore.balances = null;
    dataStore.tokenDetails = {};
    dataStore.totalSupply = {};
    dataStore.lastUpdated = null;

}

// =====================================
// LOADING STATUS
// =====================================

export function isDataLoading() {
    return loading;
}

// =====================================
// LAST UPDATED
// =====================================

export function getLastUpdated() {
    return dataStore.lastUpdated;
}
