
/* =========================================
   JOSJIS DUMMY STAKING
   Version: V4
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
    decimals: 18,
    lockPeriod: 7 * 24 * 60 * 60 * 1000,
    storageKey: "josjis_dummy_staking_v3",
    autoRefresh: 15000
};

const UNIT = 10n ** BigInt(CONFIG.decimals);


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
let realBalance = 0n;

let balanceLoading = false;
let balanceError = null;

let refreshTimer = null;
let countdownTimer = null;
let balanceRequest = 0;
let lastBalanceAddress = null;


/* =========================================
   HELPERS
========================================= */

function formatJJS(rawValue) {
    let value;

    try {
        value = BigInt(rawValue);
    } catch {
        return "0";
    }

    const negative = value < 0n;
    if (negative) value = -value;

    const whole = value / UNIT;

    const fraction = (value % UNIT)
        .toString()
        .padStart(CONFIG.decimals, "0")
        .slice(0, 4)
        .replace(/0+$/, "");

    const grouped = whole.toString().replace(
        /\B(?=(\d{3})+(?!\d))/g,
        ","
    );

    return (negative ? "-" : "") +
        grouped +
        (fraction ? "." + fraction : "");
}


function parseJJS(value) {
    const input = String(value).trim();

    if (!/^\d+(\.\d{1,18})?$/.test(input)) {
        throw new Error(
            "Enter a valid amount with up to 18 decimal places."
        );
    }

    const parts = input.split(".");
    const whole = BigInt(parts[0]);
    const fraction = BigInt(
        (parts[1] || "").padEnd(CONFIG.decimals, "0") || "0"
    );

    return whole * UNIT + fraction;
}


function shortenAddress(address) {
    return address.slice(0, 6) + "..." + address.slice(-4);
}


function setMessage(message) {
    el.stakingMessage.textContent = message;
}


function setStakeMessage(message) {
    el.stakeMessage.textContent = message;
}


function getTotalStaked() {
    return positions.reduce(
        (total, item) => total + item.amountRaw,
        0n
    );
}


function getAvailableBalance() {
    const available = realBalance - getTotalStaked();

    return available > 0n ? available : 0n;
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
        const data = {
            version: 4,
            positions: positions.map(item => ({
                id: item.id,
                amount: item.amount,
                startTime: item.startTime,
                unlockTime: item.unlockTime,
                status: item.status
            }))
        };

        localStorage.setItem(key, JSON.stringify(data));

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

        if (!Array.isArray(data.positions)) {
            positions = [];
            return;
        }

        positions = data.positions
            .map(item => {
                try {
                    const amountRaw = parseJJS(item.amount);

                    if (
                        amountRaw <= 0n ||
                        !Number.isFinite(Number(item.id)) ||
                        !Number.isFinite(Number(item.unlockTime)) ||
                        !Number.isFinite(Number(item.startTime))
                    ) {
                        return null;
                    }

                    return {
                        id: Number(item.id),
                        amount: String(item.amount),
                        amountRaw,
                        startTime: Number(item.startTime),
                        unlockTime: Number(item.unlockTime),
                        status: "active"
                    };

                } catch {
                    return null;
                }
            })
            .filter(Boolean);

    } catch (error) {
        console.error("Load staking data error:", error);
        positions = [];
    }
}


/* =========================================
   VALIDATE STORED POSITIONS
========================================= */

function validatePositionsAgainstBalance() {
    const total = getTotalStaked();

    if (total > realBalance) {
        positions = [];
        saveData();

        setStakeMessage(
            "Invalid old simulation data was cleared because total staked exceeded your current JJS wallet balance."
        );

        return false;
    }

    return true;
}


/* =========================================
   DISCONNECTED UI
========================================= */

function showDisconnected() {
    balanceRequest++;

    walletAddress = null;
    walletChainId = null;
    lastBalanceAddress = null;

    positions = [];
    realBalance = 0n;

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

    el.stakeAmount.disabled =
        balanceLoading || !!balanceError;

    el.maxBtn.disabled =
        balanceLoading || !!balanceError;

    el.stakeBtn.disabled =
        balanceLoading || !!balanceError;

    el.stakeBtn.textContent = "Stake JJS";
    el.refreshBtn.disabled = false;
}


/* =========================================
   WALLET SESSION SYNC
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
        realBalance = 0n;
        balanceError = null;
        balanceLoading = false;
        lastBalanceAddress = null;

        loadData();

        el.stakeAmount.value = "";
    }

    walletChainId = newChainId;

    updateWalletUI();
    updateDashboard();

    if (!isPolygon()) {
        balanceRequest++;
        realBalance = 0n;
        balanceLoading = false;
        balanceError = null;
        lastBalanceAddress = null;

        updateDashboard();
        return true;
    }

    if (
        addressChanged ||
        networkChanged ||
        lastBalanceAddress !== address.toLowerCase()
    ) {
        refreshBalance();
    }

    return true;
}


/* =========================================
   RESTORE WALLET SESSION
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

    updateWalletUI();
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

        if (!result || result.error || result.raw === undefined) {
            throw new Error(
                result?.error || "Unable to read JJS balance."
            );
        }

        const balance = BigInt(result.raw.toString());

        if (balance < 0n) {
            throw new Error("Invalid JJS balance.");
        }

        realBalance = balance;
        balanceError = null;
        lastBalanceAddress = address.toLowerCase();

        validatePositionsAgainstBalance();

        setMessage(
            "JJS wallet balance successfully updated."
        );

    } catch (error) {
        console.error("JJS balance error:", error);

        if (requestId === balanceRequest) {
            balanceError =
                error.message || "Unable to read JJS balance.";
        }

    } finally {
        if (requestId === balanceRequest) {
            balanceLoading = false;

            updateWalletUI();
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

    let amountRaw;

    try {
        amountRaw = parseJJS(el.stakeAmount.value);
    } catch (error) {
        setStakeMessage(error.message);
        return;
    }

    if (amountRaw <= 0n) {
        setStakeMessage("Enter a valid JJS amount.");
        return;
    }

    if (amountRaw > getAvailableBalance()) {
        setStakeMessage("Insufficient available JJS balance.");
        return;
    }

    const now = Date.now();

    positions.push({
        id: now,
        amount: el.stakeAmount.value.trim(),
        amountRaw,
        startTime: now,
        unlockTime: now + CONFIG.lockPeriod,
        status: "active"
    });

    saveData();
    updateDashboard();

    el.stakeAmount.value = "";

    setStakeMessage(
        "Dummy staking position created. No blockchain transaction occurred and no tokens were transferred."
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
        `${formatJJS(position.amountRaw)} JJS released from dummy staking. No blockchain transaction occurred.`
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
                    <strong>${formatJJS(position.amountRaw)}</strong>
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

    const available = getAvailableBalance();

    // Convert raw units to a decimal string without Number precision loss.
    const whole = available / UNIT;
    const fraction = (available % UNIT)
        .toString()
        .padStart(CONFIG.decimals, "0")
        .replace(/0+$/, "");

    el.stakeAmount.value =
        whole.toString() + (fraction ? "." + fraction : "");
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
        if (walletAddress && isPolygon()) {
            refreshBalance();
        }
    }, CONFIG.autoRefresh);
}


/* =========================================
   COUNTDOWN REFRESH
========================================= */

function startCountdown() {
    if (countdownTimer) {
        clearInterval(countdownTimer);
    }

    countdownTimer = setInterval(() => {
        if (walletAddress) {
            renderPositions();
        }
    }, 1000);
}


/* =========================================
   INITIALIZE
========================================= */

async function initialize() {
    showDisconnected();

    setMessage("Restoring saved wallet session...");
    setStakeMessage("Connect your wallet to start staking.");

    await restoreWalletSession();

    startAutoRefresh();
    startCountdown();
}


initialize();
