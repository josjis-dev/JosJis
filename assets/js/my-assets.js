
import {
    modal,
    token,
    formatUnits,
    rpcProvider
} from "../../web3/web3-config.js";

import { Contract } from
    "https://esm.sh/ethers@6.15.0";


// =====================================
// JOSJIS MY ASSETS
// =====================================

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

let currentAddress = null;
let refreshInterval = null;
let isRefreshing = false;
let refreshNumber = 0;


// =====================================
// USDT0 POLYGON CONFIGURATION
// =====================================

const USDT0_CONTRACT =
    "0xc2132D05D31c914a87C6611C10748AEb04B58e8F";

const USDT0_ABI = [
    "function balanceOf(address account) view returns (uint256)",
    "function decimals() view returns (uint8)"
];

const usdt0Token = new Contract(
    USDT0_CONTRACT,
    USDT0_ABI,
    rpcProvider
);


// =====================================
// FORMAT BALANCE
// =====================================

function formatBalance(value, decimals = 4) {

    const parts = value.split(".");

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
// SHOW CONNECTED WALLET
// =====================================

function showWallet(address) {

    currentAddress = address;

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
// DISCONNECTED
// =====================================

function showDisconnected() {

    refreshNumber++;
    currentAddress = null;

    walletAddress.textContent = "Not connected";
    walletStatus.textContent = "Disconnected";

    connectBtn.hidden = false;
    copyBtn.hidden = true;
    explorerLink.hidden = true;

    refreshBtn.disabled = true;

    jjsBalance.textContent = "--";
    polBalance.textContent = "--";

    if (usdt0Balance) {
        usdt0Balance.textContent = "--";
    }

    assetsMessage.textContent =
        "Connect your wallet to view your assets.";

    if (refreshInterval) {
        clearInterval(refreshInterval);
        refreshInterval = null;
    }

}


// =====================================
// WRONG NETWORK
// =====================================

function showWrongNetwork(address) {

    refreshNumber++;
    currentAddress = null;

    walletAddress.textContent = address;
    walletStatus.textContent = "Wrong Network";

    connectBtn.hidden = true;
    copyBtn.hidden = true;
    explorerLink.hidden = true;

    refreshBtn.disabled = true;

    jjsBalance.textContent = "--";
    polBalance.textContent = "--";

    if (usdt0Balance) {
        usdt0Balance.textContent = "--";
    }

    assetsMessage.textContent =
        "Please switch to Polygon Mainnet.";

    if (refreshInterval) {
        clearInterval(refreshInterval);
        refreshInterval = null;
    }

}


// =====================================
// READ ASSET BALANCES
// =====================================

async function refreshAssets() {

    if (!currentAddress || isRefreshing) {
        return;
    }

    const address = currentAddress;
    const requestId = refreshNumber;

    isRefreshing = true;
    refreshBtn.disabled = true;

    assetsMessage.textContent =
        "Updating asset balances...";

    try {

        const [
            jjsResult,
            polResult,
            usdt0Result,
            jjsDecimals,
            usdt0Decimals
        ] = await Promise.all([

            token.balanceOf(address),

            rpcProvider.getBalance(address),

            usdt0Token.balanceOf(address),

            token.decimals(),

            usdt0Token.decimals()

        ]);

        if (
            currentAddress !== address ||
            requestId !== refreshNumber
        ) {
            return;
        }

        const jjsFormatted = formatUnits(
            jjsResult,
            jjsDecimals
        );

        const polFormatted = formatUnits(
            polResult,
            18
        );

        const usdt0Formatted = formatUnits(
            usdt0Result,
            usdt0Decimals
        );

        jjsBalance.textContent =
            formatBalance(jjsFormatted);

        polBalance.textContent =
            formatBalance(polFormatted);

        if (usdt0Balance) {
            usdt0Balance.textContent =
                formatBalance(usdt0Formatted);
        }

        assetsMessage.textContent =
            "Balances successfully updated.";

    } catch (error) {

        console.error("My Assets Error:", error);

        if (
            currentAddress === address &&
            requestId === refreshNumber
        ) {

            assetsMessage.textContent =
                "Unable to load balances. Check Polygon RPC connection.";

        }

    } finally {

        isRefreshing = false;

        if (currentAddress) {
            refreshBtn.disabled = false;
        }

    }

}


// =====================================
// SYNC WALLET
// Dashboard-style address detection
// =====================================

function syncWallet(accountAddress = null) {

    const address =
        modal.getAddress() || accountAddress;

    if (!address) {
        return;
    }

    const chainId = modal.getChainId();

    if (Number(chainId) !== 137) {

        showWrongNetwork(address);
        return;

    }

    const addressChanged =
        !currentAddress ||
        currentAddress.toLowerCase() !== address.toLowerCase();

    if (addressChanged) {

        refreshNumber++;

        showWallet(address);

        assetsMessage.textContent =
            "Wallet connected. Loading assets...";

    }

    if (!refreshInterval) {

        refreshInterval = setInterval(() => {

            syncWallet();
            refreshAssets();

        }, 15000);

    }

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

        console.error("Connect Error:", error);

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

        console.error("Copy Error:", error);

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

modal.subscribeState((state) => {

    if (state.isConnected) {
        syncWallet();
    }

});


// =====================================
// ACCOUNT LISTENER
// =====================================

modal.subscribeAccount((account) => {

    if (account.address) {
        syncWallet(account.address);
    }

});


// =====================================
// NETWORK LISTENER
// =====================================

modal.subscribeNetwork(() => {

    syncWallet();

});


// =====================================
// RESTORE WALLET SESSION
// =====================================

async function restoreWalletSession() {

    walletStatus.textContent = "Checking...";

    assetsMessage.textContent =
        "Restoring wallet session...";

    for (let attempt = 0; attempt < 40; attempt++) {

        try {

            const address = modal.getAddress();

            if (address) {

                syncWallet(address);
                return;

            }

        } catch (error) {

            console.error("Restore Error:", error);

        }

        await new Promise(resolve =>
            setTimeout(resolve, 250)
        );

    }

    if (!currentAddress) {

        walletStatus.textContent = "Waiting for wallet";

        assetsMessage.textContent =
            "No active wallet session detected. Connect your wallet.";

    }

}


// =====================================
// INITIALIZE
// =====================================

restoreWalletSession();
