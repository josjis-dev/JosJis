
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

// Status proses pengambilan data
let loading = false;

// Mengambil seluruh data wallet
export async function loadWalletData(address) {
    if (!address) {
        throw new Error("Alamat wallet belum tersedia.");
    }

    if (loading) {
        return dataStore;
    }

    loading = true;

    try {
        const [balances] = await Promise.all([
            getAllBalances(address)
        ]);

        dataStore.wallet = {
            ...getWalletInfo(),
            address
        };

        dataStore.balances = balances;
        dataStore.lastUpdated = Date.now();

        return dataStore;

    } finally {
        loading = false;
    }
}

// Mengambil informasi token
export async function loadTokenDetails(tokenName) {
    const details = await getTokenDetails(tokenName);

    dataStore.tokenDetails[tokenName] = details;

    return details;
}

// Mengambil total supply token
export async function loadTotalSupply(tokenName) {
    const supply = await getTotalSupply(tokenName);

    dataStore.totalSupply[tokenName] = supply;

    return supply;
}

// Mengambil seluruh informasi token
export async function loadAllTokenDetails() {
    const tokens = ["JJS", "USDT0"];

    const results = await Promise.allSettled(
        tokens.map(token => loadTokenDetails(token))
    );

    return Object.fromEntries(
        tokens.map((token, index) => [
            token,
            results[index].status === "fulfilled"
                ? results[index].value
                : { error: results[index].reason.message }
        ])
    );
}

// Mengambil seluruh total supply
export async function loadAllTotalSupply() {
    const tokens = ["JJS"];

    const results = await Promise.allSettled(
        tokens.map(token => loadTotalSupply(token))
    );

    return Object.fromEntries(
        tokens.map((token, index) => [
            token,
            results[index].status === "fulfilled"
                ? results[index].value
                : { error: results[index].reason.message }
        ])
    );
}

// Mengambil seluruh data dashboard
export async function loadDashboardData(address) {
    const [walletData, tokenDetails, totalSupply] =
        await Promise.allSettled([
            loadWalletData(address),
            loadAllTokenDetails(),
            loadAllTotalSupply()
        ]);

    return {
        wallet: walletData.status === "fulfilled"
            ? walletData.value.wallet
            : { error: walletData.reason.message },

        balances: walletData.status === "fulfilled"
            ? walletData.value.balances
            : null,

        tokenDetails: tokenDetails.status === "fulfilled"
            ? tokenDetails.value
            : {},

        totalSupply: totalSupply.status === "fulfilled"
            ? totalSupply.value
            : {},

        lastUpdated: dataStore.lastUpdated
    };
}

// Mengambil data yang tersimpan
export function getCachedData() {
    return dataStore;
}

// Mengambil data saldo tersimpan
export function getCachedBalances() {
    return dataStore.balances;
}

// Menghapus cache
export function clearDataCache() {
    dataStore.wallet = null;
    dataStore.balances = null;
    dataStore.tokenDetails = {};
    dataStore.totalSupply = {};
    dataStore.lastUpdated = null;
}

// Memeriksa apakah data sedang dimuat
export function isDataLoading() {
    return loading;
}

// Mengambil waktu pembaruan terakhir
export function getLastUpdated() {
    return dataStore.lastUpdated;
}
