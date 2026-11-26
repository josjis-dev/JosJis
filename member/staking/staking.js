
/* =========================================
   JOSJIS DUMMY STAKING
   Version: V3
   Mode: Simulation Only
   Wallet: Shared Reown AppKit Session
========================================= */

import { modal } from "../../web3/web3-config.js";

import {
    getTokenBalance
} from "../../assets/js/core/token-manager.js";


/* =========================================
   CONFIGURATION
========================================= */

const CONFIG = {
    chainId: 137,
    lockPeriod: 7 * 24 * 60 * 60 * 1000,
    storageKey: "josjis_dummy_staking_v3",
    autoRefresh: 15000
};


/* =========================================
   ELEMENTS
========================================= */

const el = {
    walletStatus: document.getElementById("walletStatus"),
    walletAddress: document.getElementById("walletAddress"),
    connectBtn: document.getElementById("connectBtn"),
    copyBtn: document.getElementById("copyBtn"),
    explorerLink: document.getElementById("explorerLink"),
    stakingMessage: document.getElementById("stakingMessage"),

    totalStaked: document.getElementById("totalStaked"),
    availableBalance: document.getElementById("availableBalance"),
    activePositions: document.getElementById("activePositions"),
    pendingRewards: document.getElementById("pendingRewards"),

    stakeAmount: document.getElementById("stakeAmount"),
    maxBtn: document.getElementById("maxBtn"),
    stakeBtn: document.getElementById("stakeBtn"),
    stakeMessage: document.getElementById("stakeMessage"),

    refreshBtn: document.getElementById("refreshBtn"),
    positionsContainer: document.getElementById("positionsContainer")
};


/* =========================================
   STATE
========================================= */

let walletAddress = null;
let walletChainId = null;

let positions = [];
let realBalance = 0;

let balanceLoading = false;
let balanceError = null;

let refreshTimer = null;
let balanceRequest = 0;


/* =========================================
   HELPERS
========================================= */

function formatJJS(value) {
    const number = Number(value);

    if (!Number.isFinite(number)) return "0";

    return number.toLocaleString("en-US", {
        maximumFractionDigits: 4
    });
}


function setMessage(message) {
    el.stakingMessage.textContent = message;
}


function setStakeMessage(message) {
    el.stakeMessage.textContent = message;
}


function getTotalStaked() {
    return positions.reduce(
        (total, item) => total + Number(item.amount),
        0
    );
}


function getAvailableBalance() {
    return Math.max(
        0,
        realBalance - getTotalStaked()
    );
}


function isPolygon() {
    return Number(walletChainId) === CONFIG.chainId;
}


function getTimeRemaining(timestamp) {
    const remaining = Number(timestamp) - Date.now();

    if (remaining <= 0) {
        return "Ready to withdraw";
    }

    const days = Math.floor(remaining / 86400000);

    const hours = Math.floor(
        (remaining % 86400000) / 3600000
    );

    const minutes = Math.floor(
        (remaining % 3600000) / 60000
    );

    const seconds = Math.floor(
        (remaining % 60000) / 1000
    );

    return `${days}d ${hours}h ${minutes}m ${seconds}s`;
}


/* =========================================
   LOCAL STORAGE
========================================= */

function storageKey() {
    if (!walletAddress) return null;

    return CONFIG.storageKey + "_" +
        walletAddress.toLowerCase();
}


function saveData() {
    const key = storageKey();

    if (!key) return;

    try {
        localStorage.setItem(
            key,
            JSON.stringify({ positions })
        );
    } catch (error) {
        console.error("Storage error:", error);
        setStakeMessage("Unable to save simulation data.");
    }
}


function loadData() {
    const key = storageKey();

    if (!key) return;

    try {
        const saved = localStorage.getItem(key);

        if (!saved) {
            positions = [];
            return;
        }

        const data = JSON.parse(saved);

        positions = Array.isArray(data.positions)
            ? data.positions.filter(item =>
                Number.isFinite(Number(item.amount)) &&
                Number(item.amount) > 0 &&
                Number.isFinite(Number(item.unlockTime))
            )
            : [];

    } catch (error) {
        console.error("Load staking data error:", error);
        positions = [];
    }
}


/* =========================================
   DISCONNECTED UI
========================================= */

function showDisconnected() {
    balanceRequest++;

    walletAddress = null;
    walletChainId = null;

    positions = [];
    realBalance = 0;

    balanceLoading = false;
    balanceError = null;

    el.walletStatus.textContent = "Not Connected";
    el.walletAddress.textContent = "Not connected";

    el.connectBtn.textContent = "Connect Wallet";
    el.connectBtn.disabled = false;

    el.copyBtn.hidden = true;
    el.explorerLink.hidden = true;

    el.stakeAmount.value = "";
    el.stakeAmount.disabled = true;

    el.maxBtn.disabled = true;

    el.stakeBtn.disabled = true;
    el.stakeBtn.textContent = "Connect Wallet to Stake";

    el.refreshBtn.disabled = true;

    updateDashboard();
}


/* =========================================
   WALLET UI
========================================= */

function updateWalletUI() {
    if (!walletAddress) return;

    el.walletAddress.textContent = walletAddress;

    el.copyBtn.hidden = false;
    el.explorerLink.hidden = false;

    el.explorerLink.href =
        "https://polygonscan.com/address/" + walletAddress;

    el.connectBtn.disabled = true;
    el.connectBtn.textContent = "Wallet Connected";

    if (!isPolygon()) {
        el.walletStatus.textContent = "Wrong Network";

        el.stakeAmount.disabled = true;
        el.maxBtn.disabled = true;
        el.stakeBtn.disabled = true;

        el.stakeBtn.textContent = "Switch to Polygon Mainnet";
        el.refreshBtn.disabled = true;

        setMessage("Please switch your wallet to Polygon Mainnet.");

        return;
    }

    el.walletStatus.textContent = "Connected";

    el.stakeAmount.disabled = false;
    el.maxBtn.disabled = false;
    el.stakeBtn.disabled = false;

    el.stakeBtn.textContent = "Stake JJS";
    el.refreshBtn.disabled = false;
}


/* =========================================
   WALLET SESSION SYNC
   Same restoration pattern as Member Area
========================================= */

function syncWallet(accountAddress = null) {
    let address;
    let chainId;

    try {
        address = modal.getAddress() || accountAddress;
        chainId = modal.getChainId();

    } catch (error) {
        console.error("Wallet sync error:", error);
        return false;
    }

    if (!address) return false;

    if (chainId === undefined || chainId === null) {
        el.walletStatus.textContent = "Checking Network";
        setMessage("Checking wallet network...");
        return false;
    }

    const newChainId = Number(chainId);

    const addressChanged =
        !walletAddress ||
        walletAddress.toLowerCase() !== address.toLowerCase();

    const networkChanged =
        walletChainId !== newChainId;

    if (addressChanged) {
        balanceRequest++;

        walletAddress = address;
        positions = [];
        realBalance = 0;

        loadData();

        el.stakeAmount.value = "";
    } else {
        walletAddress = address;
    }

    walletChainId = newChainId;

    if (addressChanged || networkChanged) {
        balanceError = null;
    }

    updateWalletUI();
    updateDashboard();

    if (isPolygon()) {
        refreshBalance();
    } else {
        balanceRequest++;
        realBalance = 0;
        balanceLoading = false;
        updateDashboard();
    }

    return true;
}


/* =========================================
   RESTORE WALLET SESSION
   40 attempts x 250 ms
========================================= */

async function restoreWalletSession() {
    el.walletStatus.textContent = "Checking...";
    setMessage("Restoring saved wallet session...");

    for (let attempt = 0; attempt < 40; attempt++) {
        try {
            const address = modal.getAddress();

            if (address) {
                const restored = syncWallet(address);

                if (restored) {
                    setMessage(
                        "Wallet session restored. Dummy staking mode is active."
                    );

                    return;
                }
            }

        } catch (error) {
            console.error("Restore wallet error:", error);
        }

        await new Promise(resolve =>
            setTimeout(resolve, 250)
        );
    }

    if (!walletAddress) {
        showDisconnected();

        setMessage(
            "No active wallet session detected. Connect your wallet."
        );
    }
}


/* =========================================
   CONNECT WALLET
========================================= */

async function connectWallet() {
    try {
        setMessage("Opening wallet connection...");

        await modal.open({
            view: "Connect"
        });

        await restoreWalletSession();

    } catch (error) {
        console.error("Connect wallet error:", error);

        setMessage(
            error.message || "Unable to open wallet connection."
        );
    }
}


/* =========================================
   REAL JJS BALANCE
========================================= */

async function refreshBalance() {
    if (!walletAddress || !isPolygon()) return;

    const address = walletAddress;
    const requestId = ++balanceRequest;

    balanceLoading = true;
    balanceError = null;

    updateDashboard();

    try {
        const result = await getTokenBalance("JJS", address);

        if (
            !walletAddress ||
            walletAddress.toLowerCase() !== address.toLowerCase() ||
            requestId !== balanceRequest
        ) {
            return;
        }

        if (!result || result.error) {
            throw new Error(
                result?.error || "Unable to read JJS balance."
            );
        }

        const balance = Number(result.formatted);

        if (!Number.isFinite(balance)) {
            throw new Error("Invalid JJS balance.");
        }

        realBalance = balance;
        balanceError = null;

    } catch (error) {
        console.error("JJS balance error:", error);

        if (requestId === balanceRequest) {
            balanceError = error.message ||
                "Unable to read JJS balance.";
        }

    } finally {
        if (requestId === balanceRequest) {
            balanceLoading = false;
            updateDashboard();
        }
    }
}


/* =========================================
   DASHBOARD
========================================= */

function updateDashboard() {
    el.totalStaked.textContent =
        formatJJS(getTotalStaked());

    if (!walletAddress) {
        el.availableBalance.textContent = "--";

    } else if (!isPolygon()) {
        el.availableBalance.textContent = "Polygon required";

    } else if (balanceLoading) {
        el.availableBalance.textContent = "Loading...";

    } else if (balanceError) {
        el.availableBalance.textContent = "Unavailable";

    } else {
        el.availableBalance.textContent =
            formatJJS(getAvailableBalance());
    }

    el.activePositions.textContent = positions.length;
    el.pendingRewards.textContent = "0";

    renderPositions();
}


/* =========================================
   STAKE SIMULATION
========================================= */

function stakeTokens() {
    if (!walletAddress) {
        setStakeMessage("Connect your wallet first.");
        return;
    }

    if (!isPolygon()) {
        setStakeMessage("Please switch to Polygon Mainnet.");
        return;
    }

    if (balanceLoading || balanceError) {
        setStakeMessage("JJS balance is not available yet.");
        return;
    }

    const amount = Number(el.stakeAmount.value);

    if (!Number.isFinite(amount) || amount <= 0) {
        setStakeMessage("Enter a valid JJS amount.");
        return;
    }

    if (amount > getAvailableBalance()) {
        setStakeMessage("Insufficient available JJS balance.");
        return;
    }

    const now = Date.now();

    positions.push({
        id: now,
        amount,
        startTime: now,
        unlockTime: now + CONFIG.lockPeriod,
        status: "active"
    });

    saveData();
    updateDashboard();

    el.stakeAmount.value = "";

    setStakeMessage(
        `${formatJJS(amount)} JJS added to dummy staking. No blockchain transaction occurred and no tokens were transferred.`
    );
}


/* =========================================
   WITHDRAW SIMULATION
========================================= */

function withdrawPosition(positionId) {
    const position = positions.find(
        item => Number(item.id) === Number(positionId)
    );

    if (!position) return;

    if (Date.now() < Number(position.unlockTime)) {
        alert("This staking position is still locked.");
        return;
    }

    positions = positions.filter(
        item => Number(item.id) !== Number(positionId)
    );

    saveData();
    updateDashboard();

    setStakeMessage(
        `${formatJJS(position.amount)} JJS released from dummy staking. No blockchain transaction occurred.`
    );
}


/* =========================================
   RENDER POSITIONS
========================================= */

function renderPositions() {
    if (!walletAddress || positions.length === 0) {
        el.positionsContainer.innerHTML = `
            <div class="staking-empty-state">
                <div class="empty-icon">🔒</div>
                <h3>No Staking Positions</h3>
                <p>Your dummy staking positions will appear here.</p>
            </div>
        `;

        return;
    }

    el.positionsContainer.innerHTML = positions.map(position => {
        const unlocked =
            Date.now() >= Number(position.unlockTime);

        const status = unlocked
            ? "Ready to Withdraw"
            : "Locked";

        const countdown =
            getTimeRemaining(position.unlockTime);

        return `
            <article class="staking-card">

                <div class="staking-card-heading">
                    <h2>Position #${position.id}</h2>
                    <span class="staking-status">${status}</span>
                </div>

                <div class="staking-stat-card">
                    <span>Staked Amount</span>
                    <strong>${formatJJS(position.amount)}</strong>
                    <small>JJS · Simulation only</small>
                </div>

                <div class="staking-lock-info">
                    <div>
                        <span>Lock Period</span>
                        <strong>7 Days</strong>
                    </div>

                    <div>
                        <span>Time Remaining</span>
                        <strong>${countdown}</strong>
                    </div>
                </div>

                <button
                    type="button"
                    class="staking-button full-width"
                    data-withdraw="${position.id}"
                    ${unlocked ? "" : "disabled"}
                >
                    ${unlocked ? "Withdraw JJS" : "Locked"}
                </button>

            </article>
        `;
    }).join("");
}


/* =========================================
   APPKIT SUBSCRIPTIONS
========================================= */

modal.subscribeState(() => {
    syncWallet();
});


modal.subscribeAccount(account => {
    if (account?.address) {
        syncWallet(account.address);

    } else if (account?.isConnected === false) {
        showDisconnected();
    }
});


modal.subscribeNetwork(() => {
    syncWallet();
});


/* =========================================
   BUTTON EVENTS
========================================= */

el.connectBtn.addEventListener(
    "click",
    connectWallet
);


el.copyBtn.addEventListener("click", async () => {
    if (!walletAddress) return;

    try {
        await navigator.clipboard.writeText(walletAddress);
        setMessage("Wallet address copied.");

    } catch (error) {
        setMessage("Unable to copy wallet address.");
    }
});


el.maxBtn.addEventListener("click", () => {
    if (!walletAddress || !isPolygon()) return;

    if (balanceLoading || balanceError) {
        setStakeMessage("JJS balance is not available yet.");
        return;
    }

    el.stakeAmount.value = getAvailableBalance();
});


el.stakeBtn.addEventListener(
    "click",
    stakeTokens
);


el.refreshBtn.addEventListener("click", async () => {
    if (!walletAddress) return;

    if (!isPolygon()) {
        setMessage("Please switch to Polygon Mainnet.");
        return;
    }

    setMessage("Refreshing JJS balance...");

    await refreshBalance();

    if (balanceError) {
        setMessage("Unable to refresh JJS balance: " + balanceError);
    } else {
        setMessage("JJS balance and staking data refreshed.");
    }
});


el.positionsContainer.addEventListener("click", event => {
    const button = event.target.closest("[data-withdraw]");

    if (!button || button.disabled) return;

    withdrawPosition(button.dataset.withdraw);
});


/* =========================================
   AUTOMATIC REFRESH
========================================= */

function startAutoRefresh() {
    if (refreshTimer) {
        clearInterval(refreshTimer);
    }

    refreshTimer = setInterval(() => {
        // Same approach as Member Area:
        // check the current AppKit session again.
        syncWallet();

    }, CONFIG.autoRefresh);
}


/* =========================================
   COUNTDOWN REFRESH
========================================= */

setInterval(() => {
    if (walletAddress) {
        renderPositions();
    }
}, 1000);


/* =========================================
   INITIALIZE
========================================= */

async function initialize() {
    showDisconnected();

    setupInitialMessage();

    await restoreWalletSession();

    startAutoRefresh();
}


function setupInitialMessage() {
    setMessage("Restoring saved wallet session...");
    setStakeMessage("Connect your wallet to start staking.");
}


initialize();
