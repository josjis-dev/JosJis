
import {
    modal,
    token,
    formatUnits,
    rpcProvider
} from "../../web3/web3-config.js";


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

const explorerLink = document.getElementById("explorerLink");

let currentAddress = null;
let refreshInterval = null;
let isRefreshing = false;


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
// WALLET DISPLAY
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

    assetsMessage.textContent =
        "Wallet connected successfully.";
}


function showDisconnected() {

    currentAddress = null;

    walletAddress.textContent = "Not connected";

    walletStatus.textContent = "Disconnected";

    connectBtn.hidden = false;
    copyBtn.hidden = true;
    explorerLink.hidden = true;

    refreshBtn.disabled = true;

    jjsBalance.textContent = "--";
    polBalance.textContent = "--";

    assetsMessage.textContent =
        "Connect your wallet to view your assets.";

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

    isRefreshing = true;

    refreshBtn.disabled = true;

    assetsMessage.textContent =
        "Updating asset balances...";

    try {

        const address = currentAddress;

        const [jjsResult, polResult, decimals] =
            await Promise.all([

                token.balanceOf(address),

                rpcProvider.getBalance(address),

                token.decimals()

            ]);

        // Ignore results if wallet changed
        if (currentAddress !== address) {
            return;
        }

        const jjsFormatted = formatUnits(
            jjsResult,
            decimals
        );

        const polFormatted = formatUnits(
            polResult,
            18
        );

        jjsBalance.textContent =
            formatBalance(jjsFormatted);

        polBalance.textContent =
            formatBalance(polFormatted);

        assetsMessage.textContent =
            "Balances successfully updated.";

    } catch (error) {

        console.error("My Assets Error:", error);

        assetsMessage.textContent =
            "Unable to load balances. Please try again.";

    } finally {

        isRefreshing = false;

        if (currentAddress) {
            refreshBtn.disabled = false;
        }

    }
}


// =====================================
// CONNECT WALLET
// =====================================

connectBtn.addEventListener("click", async () => {

    try {

        await modal.open();

    } catch (error) {

        console.error("Wallet Connection Error:", error);

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
// CHECK WALLET SESSION
// =====================================

function checkWallet() {

    const connected = modal.getIsConnected();
    const address = modal.getAddress();
    const chainId = modal.getChainId();

    if (!connected || !address) {

        showDisconnected();

        return;

    }

    if (Number(chainId) !== 137) {

        currentAddress = null;

        walletAddress.textContent = address;

        walletStatus.textContent = "Wrong Network";

        connectBtn.hidden = true;
        copyBtn.hidden = true;
        explorerLink.hidden = true;

        refreshBtn.disabled = true;

        jjsBalance.textContent = "--";
        polBalance.textContent = "--";

        assetsMessage.textContent =
            "Please switch to Polygon Mainnet.";

        if (refreshInterval) {
            clearInterval(refreshInterval);
            refreshInterval = null;
        }

        return;

    }

    if (currentAddress !== address) {

        showWallet(address);

        refreshAssets();

    }

    if (!refreshInterval) {

        refreshInterval = setInterval(() => {

            refreshAssets();

        }, 15000);

    }

}


// =====================================
// APPKIT LISTENERS
// =====================================

modal.subscribeState(() => {

    checkWallet();

});

modal.subscribeAccount(() => {

    checkWallet();

});

modal.subscribeNetwork(() => {

    checkWallet();

});


// =====================================
// RESTORE WALLET SESSION
// =====================================

async function restoreWalletSession() {

    walletStatus.textContent = "Checking...";

    assetsMessage.textContent =
        "Restoring wallet session...";

    for (let i = 0; i < 40; i++) {

        checkWallet();

        if (modal.getIsConnected()) {
            return;
        }

        await new Promise(resolve =>
            setTimeout(resolve, 250)
        );

    }

    checkWallet();

    if (!modal.getIsConnected()) {

        walletStatus.textContent = "Disconnected";

        assetsMessage.textContent =
            "Connect your wallet to view your assets.";

    }

}


// =====================================
// INITIALIZE
// =====================================

restoreWalletSession();
