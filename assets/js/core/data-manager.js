
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

// Penyimpanan data sementara
const dataStore = {
    wallet: null,
    balances: null,
    tokenDetails: {},
    totalSupply: {},
    lastUpdated: null
};

// Status proses pengambilan saldo
let loading = false;

// Promise untuk mencegah pembacaan wallet
// yang sama berjalan berulang secara bersamaan.
let walletLoadPromise = null;
let walletLoadAddress = null;

/*
========================================
ERROR HELPER
========================================
*/

function getErrorMessage(error) {

    if (error?.message) {
        return error.message;
    }

    return String(error || "Unknown error");
}

/*
========================================
WALLET DATA
========================================
*/

export async function loadWalletData(address) {

    if (!address) {
        throw new Error("Alamat wallet belum tersedia.");
    }

    // Gunakan proses yang sedang berjalan jika
    // alamat wallet sama.
    if (
        walletLoadPromise &&
        walletLoadAddress?.toLowerCase() === address.toLowerCase()
    ) {
        return walletLoadPromise;
    }

    // Jangan mengembalikan cache lama ketika
    // ada proses untuk alamat berbeda.
    const currentAddress = address;

    loading = true;
    walletLoadAddress = currentAddress;

    walletLoadPromise = (async () => {

        try {

            const balances = await getAllBalances(currentAddress);

            if (!balances) {
                throw new Error("Data saldo tidak tersedia.");
            }

            dataStore.wallet = {
                ...getWalletInfo(),
                address: currentAddress
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

/*
========================================
TOKEN DETAILS
========================================
*/

export async function loadTokenDetails(tokenName) {

    const details = await getTokenDetails(tokenName);

    dataStore.tokenDetails[tokenName] = details;

    return details;
}

/*
========================================
TOTAL SUPPLY
========================================
*/

export async function loadTotalSupply(tokenName) {

    const supply = await getTotalSupply(tokenName);

    dataStore.totalSupply[tokenName] = supply;

    return supply;
}

/*
========================================
LOAD ALL TOKEN DETAILS
========================================
*/

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

/*
========================================
LOAD ALL TOTAL SUPPLY
========================================
*/

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

/*
========================================
DASHBOARD DATA
========================================
*/

export async function loadDashboardData(address) {

    if (!address) {
        throw new Error("Alamat wallet belum tersedia.");
    }

    /*
    LANGKAH 1
    Ambil saldo terlebih dahulu.
    */

    let walletResult;

    try {

        walletResult = await loadWalletData(address);

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

    /*
    LANGKAH 2
    Setelah pembacaan saldo selesai,
    ambil informasi token dan supply.
    */

    const [tokenDetails, totalSupply] =
        await Promise.allSettled([

            loadAllTokenDetails(),

            loadAllTotalSupply()

        ]);

    /*
    LANGKAH 3
    Gabungkan hasil.
    */

    return {

        wallet: walletResult.wallet,

        balances: walletResult.balances,

        tokenDetails:
            tokenDetails.status === "fulfilled"
                ? tokenDetails.value
                : {
                    error: getErrorMessage(tokenDetails.reason)
                },

        totalSupply:
            totalSupply.status === "fulfilled"
                ? totalSupply.value
                : {
                    error: getErrorMessage(totalSupply.reason)
                },

        lastUpdated: dataStore.lastUpdated

    };
}

/*
========================================
GET CACHED DATA
========================================
*/

export function getCachedData() {
    return dataStore;
}

/*
========================================
GET CACHED BALANCES
========================================
*/

export function getCachedBalances() {
    return dataStore.balances;
}

/*
========================================
CLEAR CACHE
========================================
*/

export function clearDataCache() {

    dataStore.wallet = null;
    dataStore.balances = null;
    dataStore.tokenDetails = {};
    dataStore.totalSupply = {};
    dataStore.lastUpdated = null;

}

/*
========================================
LOADING STATUS
========================================
*/

export function isDataLoading() {
    return loading;
}

/*
========================================
LAST UPDATED
========================================
*/

export function getLastUpdated() {
    return dataStore.lastUpdated;
}
