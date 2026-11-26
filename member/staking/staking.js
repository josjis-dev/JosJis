
/* =========================================
   JOSJIS DUMMY STAKING
   Version: V2
   Mode: Simulation Only
   Wallet: Reown AppKit
========================================= */

import { modal } from "../../web3/web3-config.js";

import {
    getTokenBalance
} from "../../assets/js/core/token-manager.js";


/* =========================================
   CONFIGURATION
========================================= */

const STAKING_CONFIG = {
    lockPeriod: 7 * 24 * 60 * 60 * 1000,
    chainId: 137,
    storageKey: "josjis_dummy_staking_v2",
    refreshInterval: 15000
};


/* =========================================
   ELEMENTS
========================================= */

const elements = {
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
let accountUnsubscribe = null;
let networkUnsubscribe = null;
let stateUnsubscribe = null;


/* =========================================
   HELPERS
========================================= */

function formatJJS(value) {
    const number = Number(value);

    if (!Number.isFinite(number)) {
        return "0";
    }

    return number.toLocaleString("en-US", {
        maximumFractionDigits: 4
    });
}


function shortenAddress(address) {
    return address.slice(0, 6) + "..." + address.slice(-4);
}


function normalizeChainId(chainId) {
    if (chainId === null || chainId === undefined) {
        return null;
    }

    const parsed = Number(chainId);

    return Number.isFinite(parsed) ? parsed : null;
}


function getTotalStaked() {
    return positions.reduce(
        (total, position) => total + Number(position.amount),
        0
    );
}


function getAvailableBalance() {
    return Math.max(0, realBalance - getTotalStaked());
}


function isCorrectNetwork() {
    return walletChainId === STAKING_CONFIG.chainId;
}


function getTimeRemaining(timestamp) {
    const remaining = timestamp - Date.now();

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


function setMessage(message) {
    elements.stakingMessage.textContent = message;
}


function setStakeMessage(message) {
    elements.stakeMessage.textContent = message;
}


/* =========================================
   LOCAL STORAGE
========================================= */

function getStorageKey() {
    if (!walletAddress) return null;

    return (
        STAKING_CONFIG.storageKey +
        "_" +
        walletAddress.toLowerCase()
    );
}


function saveData() {
    const key = getStorageKey();

    if (!key) return;

    try {
        localStorage.setItem(
            key,
            JSON.stringify({
                positions
            })
        );

    } catch (error) {
        console.error("Staking storage error:", error);

        setStakeMessage(
            "Unable to save staking simulation data."
        );
    }
}


function loadData() {
    const key = getStorageKey();

    if (!key) return;

    try {
        const saved = localStorage.getItem(key);

        if (!saved) {
            positions = [];
            return;
        }

        const data = JSON.parse(saved);

        positions = Array.isArray(data.positions)
            ? data.positions.filter(position => {
                return (
                    Number.isFinite(Number(position.amount)) &&
                    Number(position.amount) > 0 &&
                    Number.isFinite(Number(position.unlockTime))
                );
            })
            : [];

    } catch (error) {
        console.error("Failed to load staking data:", error);

        positions = [];
    }
}


/* =========================================
   REAL JJS BALANCE
========================================= */

async function refreshBalance() {
    if (!walletAddress || !isCorrectNetwork()) {
        realBalance = 0;
        balanceError = null;

        updateDashboard();

        return;
    }

    const address = walletAddress;

    balanceLoading = true;
    balanceError = null;

    updateDashboard();

    try {
        const result = await getTokenBalance(
            "JJS",
            address
        );

        // Hindari hasil lama menimpa wallet baru.
        if (
            !walletAddress ||
            walletAddress.toLowerCase() !== address.toLowerCase()
        ) {
            return;
        }

        if (result.error) {
            throw new Error(result.error);
        }

        realBalance = Number(result.formatted);

        if (!Number.isFinite(realBalance)) {
            throw new Error("Invalid JJS balance.");
        }

        balanceError = null;

    } catch (error) {
        console.error("JJS balance error:", error);

        balanceError = error.message ||
            "Unable to read JJS balance.";

    } finally {
        balanceLoading = false;

        updateDashboard();
    }
}


/* =========================================
   WALLET UI
========================================= */

function updateWalletUI() {
    if (!walletAddress) return;

    elements.walletAddress.textContent = walletAddress;

    elements.connectBtn.textContent = "Wallet Connected";
    elements.connectBtn.disabled = true;

    elements.copyBtn.hidden = false;
    elements.explorerLink.hidden = false;

    elements.explorerLink.href =
        "https://polygonscan.com/address/" + walletAddress;

    elements.refreshBtn.disabled = !isCorrectNetwork();

    if (!isCorrectNetwork()) {
        elements.walletStatus.textContent = "Wrong Network";

        elements.stakeAmount.disabled = true;
        elements.maxBtn.disabled = true;
        elements.stakeBtn.disabled = true;

        elements.stakeBtn.textContent =
            "Switch to Polygon Mainnet";

        setMessage(
            "Please switch your wallet to Polygon Mainnet."
        );

        return;
    }

    elements.walletStatus.textContent = "Connected";

    elements.stakeAmount.disabled = false;
    elements.maxBtn.disabled = false;
    elements.stakeBtn.disabled = false;

    elements.stakeBtn.textContent = "Stake JJS";
}


function disconnectWalletUI() {
    walletAddress = null;
    walletChainId = null;

    positions = [];
    realBalance = 0;

    balanceLoading = false;
    balanceError = null;

    elements.walletStatus.textContent = "Not Connected";
    elements.walletAddress.textContent = "Not connected";

    elements.connectBtn.textContent = "Connect Wallet";
    elements.connectBtn.disabled = false;

    elements.copyBtn.hidden = true;
    elements.explorerLink.hidden = true;

    elements.stakeAmount.value = "";
    elements.stakeAmount.disabled = true;

    elements.maxBtn.disabled = true;

    elements.stakeBtn.disabled = true;
    elements.stakeBtn.textContent = "Connect Wallet to Stake";

    elements.refreshBtn.disabled = true;

    updateDashboard();
}


/* =========================================
   WALLET SESSION
========================================= */

async function syncWalletSession() {
    try {
        const address = await modal.getAddress();

        const chainId = normalizeChainId(
            await modal.getChainId()
        );

        if (!address) {
            disconnectWalletUI();
            return;
        }

        const changed =
            !walletAddress ||
            walletAddress.toLowerCase() !== address.toLowerCase();

        walletAddress = address;
        walletChainId = chainId;

        if (changed) {
            loadData();
            realBalance = 0;
        }

        updateWalletUI();
        updateDashboard();

        if (isCorrectNetwork()) {
            await refreshBalance();
        }

    } catch (error) {
        console.error("Wallet session error:", error);

        setMessage(
            "Unable to restore wallet session. Please try again."
        );
    }
}


async function connectWallet() {
    try {
        setMessage("Opening wallet connection...");

        await modal.open({
            view: "Connect"
        });

        // Account/network subscriptions will update the UI.
        // Also check the current session after opening.
        await syncWalletSession();

    } catch (error) {
        console.error("Wallet connection error:", error);

        setMessage(
            error.message || "Unable to open wallet connection."
        );
    }
}


/* =========================================
   ACCOUNT AND NETWORK SUBSCRIPTIONS
========================================= */

function setupWalletSubscriptions() {

    if (typeof modal.subscribeAccount === "function") {

        accountUnsubscribe = modal.subscribeAccount(
            async account => {
                const address = account?.address;

                if (!address) {
                    disconnectWalletUI();
                    return;
                }

                const changed =
                    !walletAddress ||
                    walletAddress.toLowerCase() !== address.toLowerCase();

                walletAddress = address;

                if (changed) {
                    loadData();
                    realBalance = 0;
                }

                updateWalletUI();
                updateDashboard();

                if (isCorrectNetwork()) {
                    await refreshBalance();
                }
            }
        );
    }


    if (typeof modal.subscribeNetwork === "function") {

        networkUnsubscribe = modal.subscribeNetwork(
            async network => {
                walletChainId = normalizeChainId(
                    network?.chainId
                );

                if (!walletAddress) return;

                updateWalletUI();

                if (isCorrectNetwork()) {
                    await refreshBalance();
                } else {
                    realBalance = 0;
                    updateDashboard();

                    setMessage(
                        "Please switch to Polygon Mainnet."
                    );
                }
            }
        );
    }


    if (typeof modal.subscribeState === "function") {

        stateUnsubscribe = modal.subscribeState(
            async state => {
                if (state?.open === false) {
                    await syncWalletSession();
                }
            }
        );
    }
}


/* =========================================
   DASHBOARD
========================================= */

function updateDashboard() {

    const totalStaked = getTotalStaked();

    elements.totalStaked.textContent =
        formatJJS(totalStaked);

    if (!walletAddress) {

        elements.availableBalance.textContent = "--";

    } else if (balanceLoading) {

        elements.availableBalance.textContent = "Loading...";

    } else if (balanceError) {

        elements.availableBalance.textContent = "Unavailable";

    } else {

        elements.availableBalance.textContent =
            formatJJS(getAvailableBalance());
    }

    elements.activePositions.textContent =
        positions.length;

    elements.pendingRewards.textContent = "0";

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

    if (!isCorrectNetwork()) {
        setStakeMessage("Please switch to Polygon Mainnet.");
        return;
    }

    if (balanceLoading || balanceError) {
        setStakeMessage(
            "JJS balance is not available. Refresh your balance first."
        );
        return;
    }

    const amount = Number(elements.stakeAmount.value);

    if (!Number.isFinite(amount) || amount <= 0) {
        setStakeMessage("Enter a valid JJS amount.");
        return;
    }

    const availableBalance = getAvailableBalance();

    if (amount > availableBalance) {
        setStakeMessage(
            "Insufficient real JJS balance available for this simulation."
        );
        return;
    }

    const now = Date.now();

    const position = {
        id: now,
        amount,
        startTime: now,
        unlockTime: now + STAKING_CONFIG.lockPeriod,
        status: "active"
    };

    positions.push(position);

    saveData();
    updateDashboard();

    elements.stakeAmount.value = "";

    setStakeMessage(
        `${formatJJS(amount)} JJS added to your dummy staking position. No blockchain transaction occurred and no JJS was transferred.`
    );
}


/* =========================================
   WITHDRAW SIMULATION
========================================= */

function withdrawPosition(positionId) {

    const position = positions.find(
        item => item.id === positionId
    );

    if (!position) return;

    if (Date.now() < position.unlockTime) {
        alert("This staking simulation is still locked.");
        return;
    }

    positions = positions.filter(
        item => item.id !== positionId
    );

    saveData();
    updateDashboard();

    setStakeMessage(
        `${formatJJS(position.amount)} JJS released from your dummy staking position. No blockchain transaction occurred.`
    );
}


/* =========================================
   RENDER POSITIONS
========================================= */

function renderPositions() {

    if (!walletAddress || positions.length === 0) {

        elements.positionsContainer.innerHTML = `
            <div class="staking-empty-state">
                <div class="empty-icon">🔒</div>
                <h3>No Staking Positions</h3>
                <p>Your dummy staking positions will appear here.</p>
            </div>
        `;

        return;
    }

    elements.positionsContainer.innerHTML =
        positions.map(position => {

            const unlocked =
                Date.now() >= Number(position.unlockTime);

            const status = unlocked
                ? "Ready to Withdraw"
                : "Locked";

            const countdown =
                getTimeRemaining(Number(position.unlockTime));

            return `
                <article class="staking-card">

                    <div class="staking-card-heading">
                        <h2>Position #${position.id}</h2>

                        <span class="staking-status">
                            ${status}
                        </span>
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
   BUTTON EVENTS
========================================= */

elements.connectBtn.addEventListener(
    "click",
    connectWallet
);


elements.copyBtn.addEventListener(
    "click",
    async () => {

        if (!walletAddress) return;

        try {
            await navigator.clipboard.writeText(walletAddress);

            setMessage("Wallet address copied.");

        } catch (error) {
            setMessage("Unable to copy wallet address.");
        }
    }
);


elements.maxBtn.addEventListener(
    "click",
    () => {

        if (!walletAddress || !isCorrectNetwork()) return;

        if (balanceLoading || balanceError) {
            setStakeMessage("JJS balance is not available yet.");
            return;
        }

        elements.stakeAmount.value =
            getAvailableBalance();
    }
);


elements.stakeBtn.addEventListener(
    "click",
    stakeTokens
);


elements.refreshBtn.addEventListener(
    "click",
    async () => {

        if (!walletAddress) return;

        if (!isCorrectNetwork()) {
            setMessage("Please switch to Polygon Mainnet.");
            return;
        }

        setMessage("Refreshing JJS balance and staking data...");

        await refreshBalance();

        if (!balanceError) {
            setMessage(
                "JJS balance and dummy staking data refreshed."
            );
        } else {
            setMessage(
                "Unable to refresh JJS balance: " + balanceError
            );
        }
    }
);


elements.positionsContainer.addEventListener(
    "click",
    event => {

        const button = event.target.closest("[data-withdraw]");

        if (!button || button.disabled) return;

        withdrawPosition(
            Number(button.dataset.withdraw)
        );
    }
);


/* =========================================
   AUTOMATIC REFRESH
========================================= */

function startAutoRefresh() {

    if (refreshTimer) {
        clearInterval(refreshTimer);
    }

    refreshTimer = setInterval(() => {

        if (walletAddress && isCorrectNetwork()) {
            refreshBalance();
        }

    }, STAKING_CONFIG.refreshInterval);
}


/* =========================================
   COUNTDOWN REFRESH
========================================= */

setInterval(() => {

    if (!walletAddress) return;

    renderPositions();

}, 1000);


/* =========================================
   INITIALIZATION
========================================= */

async function initialize() {

    disconnectWalletUI();

    setMessage("Restoring Reown wallet session...");

    setupWalletSubscriptions();

    await syncWalletSession();

    startAutoRefresh();

    if (!walletAddress) {
        setMessage(
            "Connect your wallet to access dummy staking."
        );
    }
}


initialize();
