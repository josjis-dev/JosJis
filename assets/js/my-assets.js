
import { modal } from "../../web3/web3-config.js";
import { Token } from "./core/index.js";

// =====================================
// JOSJIS MY ASSETS
// =====================================

// ELEMENTS

const connectBtn = document.getElementById("connectBtn");
const copyBtn = document.getElementById("copyBtn");
const refreshBtn = document.getElementById("refreshBtn");

const walletStatus = document.getElementById("walletStatus");
const walletAddress = document.getElementById("walletAddress");
const assetsMessage = document.getElementById("assetsMessage");

const jjsBalance = document.getElementById("jjsBalance");
const polBalance = document.getElementById("polBalance");
const usdt0Balance = document.getElementById("usdt0Balance");

const explorerLink = document.getElementById("explorerLink");

// =====================================
// CONFIGURATION
// =====================================

const POLYGON_CHAIN_ID = 137;
const AUTO_REFRESH_INTERVAL = 15000;
const RESTORE_ATTEMPTS = 40;
const RESTORE_DELAY = 250;

// =====================================
// STATE
// =====================================

let currentAddress = null;
let refreshInterval = null;

let isRefreshing = false;
let refreshQueued = false;
let refreshNumber = 0;

let hasWalletSession = false;
let isInitializing = true;

// =====================================
// FORMAT BALANCE
// =====================================

function formatBalance(value, decimals = 4) {

    if (value === null || value === undefined) {
        return "--";
    }

    const parts = String(value).split(".");

    let integerPart = parts[0] || "0";
    let decimalPart = parts[1] || "";

    integerPart = integerPart.replace(
        /\B(?=(\d{3})+(?!\d))/g,
        ","
    );

    decimalPart = decimalPart
        .slice(0, decimals)
        .replace(/0+$/, "");

    return decimalPart
        ? `${integerPart}.${decimalPart}`
        : integerPart;
}

// =====================================
// RESET BALANCES
// =====================================

function resetBalances() {

    jjsBalance.textContent = "--";
    polBalance.textContent = "--";
    usdt0Balance.textContent = "--";

}

// =====================================
// SHOW CONNECTED WALLET
// =====================================

function showWallet(address) {

    currentAddress = address;
    hasWalletSession = true;

    walletAddress.textContent = address;
    walletStatus.textContent = "Connected";

    connectBtn.hidden = true;
    copyBtn.hidden = false;
    explorerLink.hidden = false;

    explorerLink.href =
        `https://polygonscan.com/address/${address}`;

    refreshBtn.disabled = false;

}

// =====================================
// STOP AUTO REFRESH
// =====================================

function stopAutoRefresh() {

    if (refreshInterval) {

        clearInterval(refreshInterval);
        refreshInterval = null;

    }

}

// =====================================
// START AUTO REFRESH
// =====================================

function startAutoRefresh() {

    if (refreshInterval) return;

    refreshInterval = setInterval(() => {

        syncWallet();

    }, AUTO_REFRESH_INTERVAL);

}

// =====================================
// DISCONNECTED
// =====================================

function showDisconnected() {

    refreshNumber++;

    currentAddress = null;
    hasWalletSession = false;
    refreshQueued = false;

    walletAddress.textContent = "Not connected";
    walletStatus.textContent = "Disconnected";

    connectBtn.hidden = false;
    copyBtn.hidden = true;
    explorerLink.hidden = true;

    refreshBtn.disabled = true;

    resetBalances();

    assetsMessage.textContent =
        "Connect your wallet to view your assets.";

    stopAutoRefresh();

}

// =====================================
// WRONG NETWORK
// =====================================

function showWrongNetwork(address) {

    refreshNumber++;

    currentAddress = null;
    refreshQueued = false;

    walletAddress.textContent = address;
    walletStatus.textContent = "Wrong Network";

    connectBtn.hidden = true;
    copyBtn.hidden = true;
    explorerLink.hidden = true;

    refreshBtn.disabled = true;

    resetBalances();

    assetsMessage.textContent =
        "Please switch to Polygon Mainnet.";

    stopAutoRefresh();

}

// =====================================
// DISPLAY ASSET BALANCE
// =====================================

function displayAssetBalance(
    element,
    result,
    symbol,
    failedAssets
) {

    if (
        result &&
        !result.error &&
        result.formatted !== undefined
    ) {

        element.textContent = formatBalance(
            result.formatted
        );

        return;

    }

    element.textContent = "--";
    failedAssets.push(symbol);

    console.error(
        `${symbol} Balance Error:`,
        result?.error || "Balance data unavailable"
    );

}

// =====================================
// READ ASSET BALANCES USING CORE
// Core -> Token Manager -> RPC Manager
// =====================================

async function refreshAssets() {

    if (!currentAddress) return;

    if (isRefreshing) {
        refreshQueued = true;
        return;
    }

    const address = currentAddress;
    const requestId = refreshNumber;

    isRefreshing = true;
    refreshBtn.disabled = true;

    assetsMessage.textContent =
        "Updating asset balances...";

    try {

        const balances =
            await Token.getAllBalances(address);

        // Ignore outdated requests.

        if (
            !currentAddress ||
            currentAddress.toLowerCase() !== address.toLowerCase() ||
            requestId !== refreshNumber
        ) {
            return;
        }

        const failedAssets = [];

        displayAssetBalance(
            jjsBalance,
            balances?.JJS,
            "JJS",
            failedAssets
        );

        displayAssetBalance(
            polBalance,
            balances?.POL,
            "POL",
            failedAssets
        );

        displayAssetBalance(
            usdt0Balance,
            balances?.USDT0,
            "USDT0",
            failedAssets
        );

        if (failedAssets.length === 0) {

            assetsMessage.textContent =
                "Balances successfully updated.";

        } else if (failedAssets.length === 3) {

            assetsMessage.textContent =
                "Unable to retrieve balances. Please try again.";

        } else {

            assetsMessage.textContent =
                `Some balances could not be updated: ${failedAssets.join(", ")}.`;

        }

    } catch (error) {

        console.error(
            "My Assets Core Error:",
            error
        );

        if (
            currentAddress &&
            currentAddress.toLowerCase() === address.toLowerCase() &&
            requestId === refreshNumber
        ) {

            assetsMessage.textContent =
                "Unable to update balances. Please try again.";

        }

    } finally {

        isRefreshing = false;

        if (currentAddress) {
            refreshBtn.disabled = false;
        }

        if (refreshQueued) {

            refreshQueued = false;

            if (currentAddress) {
                refreshAssets();
            }

        }

    }

}

// =====================================
// SYNC WALLET
// =====================================

function syncWallet(accountAddress = null) {

    let address = null;
    let chainId = null;

    try {

        address = modal.getAddress() || accountAddress;
        chainId = modal.getChainId();

    } catch (error) {

        console.error(
            "Wallet State Error:",
            error
        );

        return;

    }

    if (!address) return;

    if (chainId === undefined || chainId === null) {

        walletStatus.textContent = "Checking Network";

        assetsMessage.textContent =
            "Checking wallet network...";

        return;

    }

    if (Number(chainId) !== POLYGON_CHAIN_ID) {

        showWrongNetwork(address);
        return;

    }

    const addressChanged =
        !currentAddress ||
        currentAddress.toLowerCase() !== address.toLowerCase();

    if (addressChanged) {

        refreshNumber++;
        refreshQueued = false;

        resetBalances();

        showWallet(address);

        assetsMessage.textContent =
            "Wallet connected. Loading assets...";

    } else {

        hasWalletSession = true;

    }

    startAutoRefresh();
    refreshAssets();

}

// =====================================
// CONNECT WALLET
// =====================================

connectBtn.addEventListener("click", async () => {

    try {

        await modal.open({
            view: "Connect"
        });

    } catch (error) {

        console.error(
            "Connect Error:",
            error
        );

        assetsMessage.textContent =
            "Unable to open wallet connection.";

    }

});

// =====================================
// COPY WALLET ADDRESS
// =====================================

copyBtn.addEventListener("click", async () => {

    if (!currentAddress) return;

    try {

        await navigator.clipboard.writeText(
            currentAddress
        );

        assetsMessage.textContent =
            "Wallet address copied.";

    } catch (error) {

        console.error(
            "Copy Error:",
            error
        );

        assetsMessage.textContent =
            "Unable to copy wallet address.";

    }

});

// =====================================
// MANUAL REFRESH
// =====================================

refreshBtn.addEventListener("click", () => {

    refreshAssets();

});

// =====================================
// APPKIT STATE LISTENER
// =====================================

modal.subscribeState(() => {

    const address = modal.getAddress();

    if (address) {
        syncWallet(address);
    }

});

// =====================================
// ACCOUNT LISTENER
// =====================================

modal.subscribeAccount(account => {

    if (account?.address) {

        syncWallet(account.address);

    } else if (
        !isInitializing &&
        hasWalletSession &&
        account?.isConnected === false
    ) {

        showDisconnected();

    }

});

// =====================================
// NETWORK LISTENER
// =====================================

modal.subscribeNetwork(() => {

    const address = modal.getAddress();

    if (address) {
        syncWallet(address);
    }

});

// =====================================
// RESTORE WALLET SESSION
// =====================================

async function restoreWalletSession() {

    walletStatus.textContent = "Checking...";

    assetsMessage.textContent =
        "Restoring wallet session...";

    for (
        let attempt = 0;
        attempt < RESTORE_ATTEMPTS;
        attempt++
    ) {

        try {

            const address = modal.getAddress();

            if (address) {

                syncWallet(address);

                isInitializing = false;

                return;

            }

        } catch (error) {

            console.error(
                "Restore Error:",
                error
            );

        }

        await new Promise(resolve => {
            setTimeout(resolve, RESTORE_DELAY);
        });

    }

    isInitializing = false;

    if (!currentAddress) {

        walletStatus.textContent =
            "Waiting for wallet";

        assetsMessage.textContent =
            "No active wallet session detected. Connect your wallet.";

    }

}

// =====================================
// INITIALIZE
// =====================================

restoreWalletSession();
