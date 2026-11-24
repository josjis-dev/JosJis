
import {
    modal,
    token,
    formatUnits,
    rpcProvider
} from "../../web3/web3-config.js";

import {
    Contract,
    JsonRpcProvider
} from "https://esm.sh/ethers@6.15.0";


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
let refreshQueued = false;
let refreshNumber = 0;


// =====================================
// RPC CONFIGURATION
// =====================================

// Primary RPC:
// Diambil dari web3-config.js

// Backup RPC:
// Digunakan jika primary RPC gagal.

const backupRPCs = [
    "https://polygon.drpc.org",
    "https://polygon-rpc.com"
];

const rpcProviders = [
    rpcProvider,
    ...backupRPCs.map(url =>
        new JsonRpcProvider(
            url,
            137,
            { staticNetwork: true }
        )
    )
];


// =====================================
// CONTRACT CONFIGURATION
// =====================================

const USDT0_CONTRACT =
    "0xc2132D05D31c914a87C6611C10748AEb04B58e8F";

const USDT0_ABI = [
    "function balanceOf(address account) view returns (uint256)"
];

const usdt0Token = new Contract(
    USDT0_CONTRACT,
    USDT0_ABI,
    rpcProvider
);


// =====================================
// RPC TIMEOUT
// =====================================

const RPC_TIMEOUT = 8000;

function withTimeout(promise, milliseconds) {

    return new Promise((resolve, reject) => {

        const timer = setTimeout(() => {

            reject(new Error("RPC request timeout"));

        }, milliseconds);

        Promise.resolve(promise).then(

            result => {
                clearTimeout(timer);
                resolve(result);
            },

            error => {
                clearTimeout(timer);
                reject(error);
            }

        );

    });

}


// =====================================
// RPC FALLBACK READER
// =====================================

async function readWithFallback(readFunction) {

    let lastError = null;

    for (let i = 0; i < rpcProviders.length; i++) {

        const provider = rpcProviders[i];

        try {

            const result = await withTimeout(
                Promise.resolve().then(() =>
                    readFunction(provider)
                ),
                RPC_TIMEOUT
            );

            return result;

        } catch (error) {

            lastError = error;

            console.warn(
                `Polygon RPC ${i + 1} failed:`,
                error
            );

        }

    }

    throw lastError || new Error("All RPC endpoints failed");

}


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

    if (refreshInterval) {

        clearInterval(refreshInterval);
        refreshInterval = null;

    }

}


// =====================================
// READ JJS BALANCE
// =====================================

async function readJJS(address) {

    return readWithFallback(provider => {

        const contract = token.connect(provider);

        return contract.balanceOf(address);

    });

}


// =====================================
// READ POL BALANCE
// =====================================

async function readPOL(address) {

    return readWithFallback(provider => {

        return provider.getBalance(address);

    });

}


// =====================================
// READ USDT0 BALANCE
// =====================================

async function readUSDT0(address) {

    return readWithFallback(provider => {

        const contract = usdt0Token.connect(provider);

        return contract.balanceOf(address);

    });

}


// =====================================
// READ ASSET BALANCES
// =====================================

async function refreshAssets() {

    if (!currentAddress) {
        return;
    }

    // Queue refresh if another request is running.

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

        // Each asset is loaded independently.

        const results = await Promise.allSettled([

            readJJS(address),
            readPOL(address),
            readUSDT0(address)

        ]);

        // Ignore outdated requests.

        if (
            currentAddress !== address ||
            requestId !== refreshNumber
        ) {
            return;
        }

        const failedAssets = [];

        // ---------------------------------
        // JJS
        // ---------------------------------

        if (results[0].status === "fulfilled") {

            const formatted = formatUnits(
                results[0].value,
                18
            );

            jjsBalance.textContent =
                formatBalance(formatted);

        } else {

            failedAssets.push("JJS");

            console.error(
                "JJS Balance Error:",
                results[0].reason
            );

        }


        // ---------------------------------
        // POL
        // ---------------------------------

        if (results[1].status === "fulfilled") {

            const formatted = formatUnits(
                results[1].value,
                18
            );

            polBalance.textContent =
                formatBalance(formatted);

        } else {

            failedAssets.push("POL");

            console.error(
                "POL Balance Error:",
                results[1].reason
            );

        }


        // ---------------------------------
        // USDT0
        // ---------------------------------

        if (results[2].status === "fulfilled") {

            const formatted = formatUnits(
                results[2].value,
                6
            );

            usdt0Balance.textContent =
                formatBalance(formatted);

        } else {

            failedAssets.push("USDT0");

            console.error(
                "USDT0 Balance Error:",
                results[2].reason
            );

        }


        // ---------------------------------
        // UPDATE MESSAGE
        // ---------------------------------

        if (failedAssets.length === 0) {

            assetsMessage.textContent =
                "Balances successfully updated.";

        } else if (failedAssets.length === 3) {

            assetsMessage.textContent =
                "Unable to refresh balances. Showing last available values.";

        } else {

            assetsMessage.textContent =
                `Some balances could not be updated (${failedAssets.join(", ")}). Showing last available values.`;

        }

    } catch (error) {

        console.error(
            "My Assets Error:",
            error
        );

        if (
            currentAddress === address &&
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

        // Run queued refresh after current request.

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
        currentAddress.toLowerCase() !==
        address.toLowerCase();

    if (addressChanged) {

        refreshNumber++;

        // Do not display another wallet's old balance.

        resetBalances();

        showWallet(address);

        assetsMessage.textContent =
            "Wallet connected. Loading assets...";

    }

    if (!refreshInterval) {

        refreshInterval = setInterval(() => {

            syncWallet();

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

modal.subscribeState(state => {

    if (state.isConnected) {

        syncWallet();

    } else {

        showDisconnected();

    }

});


// =====================================
// ACCOUNT LISTENER
// =====================================

modal.subscribeAccount(account => {

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

            console.error(
                "Restore Error:",
                error
            );

        }

        await new Promise(resolve =>
            setTimeout(resolve, 250)
        );

    }

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
