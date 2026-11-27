/**
 * JosJis Staking
 * Main Controller
 * Version: V1
 * Network: Polygon Mainnet
 */

import {
    modal
} from "../../web3/web3-config.js";

import {
    CONFIG,
    DURATION_LABELS
} from "./modules/config.js";

import {
    formatJJS,
    formatCountdown,
    parseJJS,
    getErrorMessage,
    shortenAddress
} from "./modules/helpers.js";

import {
    validateStakingContract,
    getDurationConfig,
    getJJSBalance
} from "./modules/contracts.js";

import {
    setWalletProvider,
    subscribeWalletProvider,
    getConnectedAddress,
    clearWalletSession,
    getWalletSession
} from "./modules/wallet.js";

import {
    approveJJS,
    stakeJJS,
    withdrawPrincipal,
    claimReward
} from "./modules/staking-actions.js";

import {
    getUserPositions
} from "./modules/positions.js";

import {
    loadDashboardData,
    clearDashboard
} from "./modules/dashboard.js";

/* =========================================
   DOM ELEMENTS
========================================= */

const $ = (id) => document.getElementById(id);

const elements = {
    walletStatus: $("walletStatus"),
    walletAddress: $("walletAddress"),
    connectBtn: $("connectBtn"),
    copyBtn: $("copyBtn"),
    explorerLink: $("explorerLink"),
    stakingMessage: $("stakingMessage"),
    refreshBtn: $("refreshBtn"),

    totalStaked: $("totalStaked"),
    availableBalance: $("availableBalance"),
    activePositions: $("activePositions"),
    pendingRewards: $("pendingRewards"),

    stakeAmount: $("stakeAmount"),
    maxBtn: $("maxBtn"),
    stakeDuration: $("stakeDuration"),
    selectedRewardRate: $("selectedRewardRate"),
    estimatedReward: $("estimatedReward"),
    stakeBtn: $("stakeBtn"),
    stakeMessage: $("stakeMessage"),

    positionsContainer: $("positionsContainer")
};

/* =========================================
   APPLICATION STATE
========================================= */

const state = {
    walletAddress: null,
    walletProvider: null,
    connected: false,
    contractReady: false,
    stakingPaused: false,
    refreshing: false,
    busy: false,
    durationRewardBps: 0n,
    positions: []
};

let refreshInterval = null;
let countdownInterval = null;

/* =========================================
   UI HELPERS
========================================= */

function setMessage(element, message, type = "") {
    if (!element) return;

    element.textContent = message;
    element.dataset.type = type;
}

function setButtonLoading(button, loading, originalText) {
    if (!button) return;

    button.disabled = loading;
    button.textContent = loading
        ? "Please wait..."
        : originalText;
}

function setWalletUI(connected, address = null) {
    state.connected = connected;
    state.walletAddress = address;

    if (elements.walletStatus) {
        elements.walletStatus.textContent = connected
            ? "Connected"
            : "Disconnected";
    }

    if (elements.walletAddress) {
        elements.walletAddress.textContent = connected
            ? shortenAddress(address)
            : "Not connected";
    }

    if (elements.connectBtn) {
        elements.connectBtn.textContent = connected
            ? "Connected"
            : "Connect Wallet";
    }

    if (elements.copyBtn) {
        elements.copyBtn.disabled = !connected;
    }

    if (elements.explorerLink) {
        if (connected) {
            elements.explorerLink.href =
                `https://polygonscan.com/address/${address}`;
            elements.explorerLink.hidden = false;
        } else {
            elements.explorerLink.removeAttribute("href");
            elements.explorerLink.hidden = true;
        }
    }

    if (elements.stakeBtn) {
        elements.stakeBtn.disabled =
            !connected ||
            !state.contractReady ||
            state.stakingPaused;
    }
}

function clearWalletUI() {
    state.walletAddress = null;
    state.connected = false;
    state.walletProvider = null;
    state.positions = [];

    clearWalletSession();

    setWalletUI(false);

    clearDashboard({
        totalStaked: elements.totalStaked,
        balance: elements.availableBalance,
        userTotalStaked: elements.totalStaked,
        availableRewards: elements.pendingRewards,
        totalPositions: elements.activePositions
    });

    renderPositions([]);

    setMessage(elements.stakingMessage, "Connect your wallet to continue.");
    setMessage(elements.stakeMessage, "");

    updateStakeEstimate();
}

/* =========================================
   WALLET CONNECTION
========================================= */

async function syncWallet(provider) {
    if (!provider) {
        clearWalletUI();
        return;
    }

    try {
        setWalletProvider(provider);

        const address = await getConnectedAddress(provider);

        state.walletProvider = provider;

        setWalletUI(true, address);

        setMessage(
            elements.stakingMessage,
            "Wallet connected successfully.",
            "success"
        );

        await refreshAll();

    } catch (error) {
        console.error("Wallet synchronization error:", error);

        clearWalletUI();

        setMessage(
            elements.stakingMessage,
            getErrorMessage(error),
            "error"
        );
    }
}

async function connectWallet() {
    try {
        if (!modal || typeof modal.open !== "function") {
            throw new Error("Wallet connection modal is unavailable.");
        }

        setMessage(
            elements.stakingMessage,
            "Opening wallet connection..."
        );

        await modal.open();

    } catch (error) {
        console.error("Wallet connection error:", error);

        setMessage(
            elements.stakingMessage,
            getErrorMessage(error),
            "error"
        );
    }
}

function disconnectWallet() {
    clearWalletUI();

    setMessage(
        elements.stakingMessage,
        "Wallet disconnected."
    );
}

/* =========================================
   CONTRACT INITIALIZATION
========================================= */

async function initializeContracts() {
    try {
        const result = await validateStakingContract();

        if (!result.valid) {
            throw new Error(result.error);
        }

        state.contractReady = true;
        state.stakingPaused = result.paused;

        if (result.paused) {
            setMessage(
                elements.stakingMessage,
                "Staking is currently paused.",
                "warning"
            );
        } else {
            setMessage(
                elements.stakingMessage,
                "Staking contract connected.",
                "success"
            );
        }

        return true;

    } catch (error) {
        console.error("Contract initialization error:", error);

        state.contractReady = false;

        setMessage(
            elements.stakingMessage,
            getErrorMessage(error),
            "error"
        );

        return false;
    }
}

/* =========================================
   DURATION CONFIGURATION
========================================= */

async function updateDurationInfo() {
    if (!elements.stakeDuration) return;

    const duration = elements.stakeDuration.value;

    if (!duration || !state.contractReady) {
        state.durationRewardBps = 0n;
        updateStakeEstimate();
        return;
    }

    try {
        const config = await getDurationConfig(duration);

        if (!config.enabled) {
            state.durationRewardBps = 0n;

            setMessage(
                elements.stakeMessage,
                "This staking duration is unavailable.",
                "warning"
            );

            updateStakeEstimate();
            return;
        }

        state.durationRewardBps = BigInt(config.rewardBps);

        if (elements.selectedRewardRate) {
            const rate = Number(config.rewardBps) / 100;

            elements.selectedRewardRate.textContent =
                `${rate.toFixed(2)}%`;
        }

        setMessage(elements.stakeMessage, "");

        updateStakeEstimate();

    } catch (error) {
        console.error("Duration configuration error:", error);

        state.durationRewardBps = 0n;

        setMessage(
            elements.stakeMessage,
            getErrorMessage(error),
            "error"
        );

        updateStakeEstimate();
    }
}

/* =========================================
   STAKE REWARD ESTIMATE
========================================= */

function updateStakeEstimate() {
    if (!elements.estimatedReward) return;

    try {
        const amount = elements.stakeAmount?.value || "0";

        const parsedAmount = parseJJS(amount);

        const reward =
            parsedAmount * state.durationRewardBps / 10000n;

        elements.estimatedReward.textContent =
            formatJJS(reward);

    } catch {
        elements.estimatedReward.textContent = "0";
    }
}

/* =========================================
   DASHBOARD REFRESH
========================================= */

async function refreshAll() {
    if (state.refreshing) return;

    state.refreshing = true;

    try {
        if (!state.contractReady) {
            await initializeContracts();
        }

        if (!state.contractReady) return;

        if (!state.connected || !state.walletAddress) {
            return;
        }

        const data = await loadDashboardData(
            state.walletAddress
        );

        state.stakingPaused = data.stakingPaused;
        state.positions = data.positions;

        if (elements.totalStaked) {
            elements.totalStaked.textContent =
                data.userTotalStakedFormatted;
        }

        if (elements.availableBalance) {
            elements.availableBalance.textContent =
                data.balanceFormatted;
        }

        if (elements.activePositions) {
            elements.activePositions.textContent =
                data.totalPositions;
        }

        if (elements.pendingRewards) {
            elements.pendingRewards.textContent =
                data.userTotalRewardsFormatted;
        }

        if (elements.stakeBtn) {
            elements.stakeBtn.disabled =
                state.stakingPaused || state.busy;
        }

        renderPositions(data.positions);

        await updateDurationInfo();

    } catch (error) {
        console.error("Dashboard refresh error:", error);

        setMessage(
            elements.stakingMessage,
            getErrorMessage(error),
            "error"
        );

    } finally {
        state.refreshing = false;
    }
}

/* =========================================
   RENDER POSITIONS
========================================= */

function createPositionElement(position) {
    const card = document.createElement("div");

    card.className = "position-card";

    const title = document.createElement("h3");
    title.textContent = `Position #${position.id}`;

    const amount = document.createElement("p");
    amount.textContent =
        `Staked: ${position.amountFormatted} JJS`;

    const reward = document.createElement("p");
    reward.textContent =
        `Reward: ${position.rewardFormatted} JJS`;

    const unlock = document.createElement("p");
    unlock.textContent =
        `Unlock: ${position.unlockDate}`;

    const countdown = document.createElement("p");
    countdown.className = "position-countdown";
    countdown.dataset.unlockTime =
        position.unlockTime.toString();

    countdown.textContent = position.countdown;

    const status = document.createElement("p");

    status.textContent =
        position.principalWithdrawn
            ? "Principal withdrawn"
            : position.unlocked
                ? "Ready to withdraw"
                : "Locked";

    const rewardStatus = document.createElement("p");

    rewardStatus.textContent =
        position.rewardClaimed
            ? "Reward claimed"
            : position.reward > 0n
                ? "Reward available"
                : "No reward";

    const actions = document.createElement("div");
    actions.className = "position-actions";

    if (position.canWithdraw) {
        const withdrawButton = document.createElement("button");

        withdrawButton.type = "button";
        withdrawButton.textContent = "Withdraw Principal";
        withdrawButton.dataset.action = "withdraw";
        withdrawButton.dataset.positionId = position.id;

        actions.appendChild(withdrawButton);
    }

    if (position.canClaim) {
        const claimButton = document.createElement("button");

        claimButton.type = "button";
        claimButton.textContent = "Claim Reward";
        claimButton.dataset.action = "claim";
        claimButton.dataset.positionId = position.id;

        actions.appendChild(claimButton);
    }

    card.append(
        title,
        amount,
        reward,
        unlock,
        countdown,
        status,
        rewardStatus,
        actions
    );

    return card;
}

function renderPositions(positions) {
    if (!elements.positionsContainer) return;

    elements.positionsContainer.replaceChildren();

    if (!positions || positions.length === 0) {
        const empty = document.createElement("p");

        empty.textContent = state.connected
            ? "No staking positions found."
            : "Connect your wallet to view positions.";

        elements.positionsContainer.appendChild(empty);

        return;
    }

    for (const position of positions) {
        elements.positionsContainer.appendChild(
            createPositionElement(position)
        );
    }
}

/* =========================================
   COUNTDOWN REFRESH
========================================= */

function updateCountdowns() {
    if (!elements.positionsContainer) return;

    const countdownElements =
        elements.positionsContainer.querySelectorAll(
            "[data-unlock-time]"
        );

    for (const element of countdownElements) {
        element.textContent = formatCountdown(
            element.dataset.unlockTime
        );
    }
}

/* =========================================
   APPROVE AND STAKE
========================================= */

async function handleStake() {
    if (state.busy) return;

    if (!state.connected) {
        setMessage(
            elements.stakeMessage,
            "Connect your wallet first.",
            "error"
        );
        return;
    }

    if (state.stakingPaused) {
        setMessage(
            elements.stakeMessage,
            "Staking is currently paused.",
            "error"
        );
        return;
    }

    const amount = elements.stakeAmount?.value?.trim();
    const duration = elements.stakeDuration?.value;

    if (!amount || !duration) {
        setMessage(
            elements.stakeMessage,
            "Enter an amount and select a duration.",
            "error"
        );
        return;
    }

    state.busy = true;

    const originalText =
        elements.stakeBtn?.textContent || "Approve & Stake JJS";

    setButtonLoading(elements.stakeBtn, true, originalText);

    try {
        const parsedAmount = parseJJS(amount);

        if (parsedAmount <= 0n) {
            throw new Error("Amount must be greater than zero.");
        }

        setMessage(
            elements.stakeMessage,
            "Checking JJS allowance..."
        );

        const approval = await approveJJS(amount);

        if (!approval.approved) {
            throw new Error("JJS approval was not completed.");
        }

        if (!approval.alreadyApproved) {
            setMessage(
                elements.stakeMessage,
                "Approval confirmed. Preparing staking transaction...",
                "success"
            );
        }

        setMessage(
            elements.stakeMessage,
            "Please confirm the staking transaction in your wallet."
        );

        const result = await stakeJJS(amount, duration);

        setMessage(
            elements.stakeMessage,
            result.positionId !== null
                ? `Staking successful. Position #${result.positionId.toString()}`
                : "Staking successful.",
            "success"
        );

        if (elements.stakeAmount) {
            elements.stakeAmount.value = "";
        }

        updateStakeEstimate();

        await refreshAll();

    } catch (error) {
        console.error("Approve and stake error:", error);

        setMessage(
            elements.stakeMessage,
            getErrorMessage(error),
            "error"
        );

    } finally {
        state.busy = false;

        if (elements.stakeBtn) {
            elements.stakeBtn.disabled =
                !state.connected ||
                !state.contractReady ||
                state.stakingPaused;

            elements.stakeBtn.textContent = originalText;
        }
    }
}

/* =========================================
   POSITION ACTIONS
========================================= */

async function handlePositionAction(action, positionId, button) {
    if (state.busy) return;

    if (!state.connected) {
        setMessage(
            elements.stakingMessage,
            "Connect your wallet first.",
            "error"
        );
        return;
    }

    state.busy = true;

    const originalText = button.textContent;

    button.disabled = true;
    button.textContent = "Please wait...";

    try {
        if (action === "withdraw") {
            setMessage(
                elements.stakingMessage,
                `Withdrawing principal from position #${positionId}...`
            );

            await withdrawPrincipal(positionId);

            setMessage(
                elements.stakingMessage,
                "Principal withdrawal successful.",
                "success"
            );

        } else if (action === "claim") {
            setMessage(
                elements.stakingMessage,
                `Claiming reward from position #${positionId}...`
            );

            await claimReward(positionId);

            setMessage(
                elements.stakingMessage,
                "Reward claim successful.",
                "success"
            );

        } else {
            throw new Error("Unknown position action.");
        }

        await refreshAll();

    } catch (error) {
        console.error("Position action error:", error);

        setMessage(
            elements.stakingMessage,
            getErrorMessage(error),
            "error"
        );

    } finally {
        state.busy = false;

        button.disabled = false;
        button.textContent = originalText;
    }
}

/* =========================================
   MAX BUTTON
========================================= */

async function handleMaxAmount() {
    if (!state.connected || !state.walletAddress) {
        setMessage(
            elements.stakeMessage,
            "Connect your wallet first.",
            "error"
        );
        return;
    }

    try {
        const balance = await getJJSBalance(
            state.walletAddress
        );

        if (elements.stakeAmount) {
            elements.stakeAmount.value = formatJJS(
                balance,
                18
            );
        }

        updateStakeEstimate();

    } catch (error) {
        console.error("Max balance error:", error);

        setMessage(
            elements.stakeMessage,
            getErrorMessage(error),
            "error"
        );
    }
}

/* =========================================
   COPY WALLET ADDRESS
========================================= */

async function handleCopyAddress() {
    if (!state.walletAddress) return;

    try {
        await navigator.clipboard.writeText(
            state.walletAddress
        );

        setMessage(
            elements.stakingMessage,
            "Wallet address copied.",
            "success"
        );

    } catch (error) {
        console.error("Copy address error:", error);

        setMessage(
            elements.stakingMessage,
            "Unable to copy wallet address.",
            "error"
        );
    }
}

/* =========================================
   EVENT LISTENERS
========================================= */

function setupEventListeners() {
    elements.connectBtn?.addEventListener(
        "click",
        connectWallet
    );

    elements.refreshBtn?.addEventListener(
        "click",
        refreshAll
    );

    elements.stakeBtn?.addEventListener(
        "click",
        handleStake
    );

    elements.maxBtn?.addEventListener(
        "click",
        handleMaxAmount
    );

    elements.copyBtn?.addEventListener(
        "click",
        handleCopyAddress
    );

    elements.stakeAmount?.addEventListener(
        "input",
        updateStakeEstimate
    );

    elements.stakeDuration?.addEventListener(
        "change",
        updateDurationInfo
    );

    elements.positionsContainer?.addEventListener(
        "click",
        async (event) => {
            const button = event.target.closest(
                "button[data-action][data-position-id]"
            );

            if (!button) return;

            await handlePositionAction(
                button.dataset.action,
                button.dataset.positionId,
                button
            );
        }
    );
}

/* =========================================
   WALLET PROVIDER EVENTS
========================================= */

function setupProviderEvents(provider) {
    if (!provider || typeof provider.on !== "function") {
        return;
    }

    provider.on("accountsChanged", async (accounts) => {
        if (!Array.isArray(accounts) || accounts.length === 0) {
            clearWalletUI();
            return;
        }

        await syncWallet(provider);
    });

    provider.on("chainChanged", async () => {
        await refreshAll();
    });

    provider.on("disconnect", () => {
        clearWalletUI();
    });
}

/* =========================================
   INITIALIZE
========================================= */

async function initialize() {
    console.log("JosJis Staking V1 initializing...");

    setupEventListeners();

    const contractReady = await initializeContracts();

    if (contractReady) {
        await updateDurationInfo();
    }

    try {
        subscribeWalletProvider((provider, error) => {
            if (error) {
                console.error(
                    "AppKit provider subscription error:",
                    error
                );

                setMessage(
                    elements.stakingMessage,
                    getErrorMessage(error),
                    "error"
                );

                return;
            }

            if (provider) {
                setupProviderEvents(provider);
                syncWallet(provider);
            } else {
                clearWalletUI();
            }
        });

    } catch (error) {
        console.error(
            "Unable to subscribe to wallet provider:",
            error
        );

        setMessage(
            elements.stakingMessage,
            getErrorMessage(error),
            "error"
        );
    }

    refreshInterval = setInterval(
        refreshAll,
        CONFIG.autoRefresh
    );

    countdownInterval = setInterval(
        updateCountdowns,
        1000
    );

    console.log("JosJis Staking initialized.");
}

/* =========================================
   START APPLICATION
========================================= */

if (document.readyState === "loading") {
    document.addEventListener(
        "DOMContentLoaded",
        initialize,
        { once: true }
    );
} else {
    initialize();
}
