
/**
 * JosJis Staking
 * Main Controller
 * Version: V2
 * Network: Polygon Mainnet
 */

import { modal } from "../../web3/web3-config.js";

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
    clearWalletSession
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
    providerReady: false,

    chainId: null,

    contractReady: false,
    stakingPaused: false,

    refreshing: false,
    busy: false,

    durationRewardBps: 0n,
    positions: []
};

let refreshInterval = null;
let countdownInterval = null;

let walletSyncSequence = 0;
let appKitListenersInitialized = false;

const providerListeners = new WeakSet();

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

function updateActionButtons() {
    const transactionReady =
        state.connected &&
        state.providerReady &&
        state.chainId === CONFIG.chainId &&
        state.contractReady &&
        !state.stakingPaused;

    if (elements.stakeBtn) {
        elements.stakeBtn.disabled =
            !transactionReady ||
            state.busy ||
            state.refreshing;
    }

    if (elements.positionsContainer) {
        elements.positionsContainer
            .querySelectorAll("button[data-action]")
            .forEach((button) => {
                button.disabled =
                    !state.connected ||
                    !state.providerReady ||
                    state.chainId !== CONFIG.chainId ||
                    state.busy;
            });
    }
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
        if (connected && address) {
            elements.explorerLink.href =
                `https://polygonscan.com/address/${address}`;

            elements.explorerLink.hidden = false;
        } else {
            elements.explorerLink.removeAttribute("href");
            elements.explorerLink.hidden = true;
        }
    }

    updateActionButtons();
}

function clearWalletUI() {
    walletSyncSequence++;

    state.walletAddress = null;
    state.walletProvider = null;

    state.connected = false;
    state.providerReady = false;

    state.chainId = null;
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

    setMessage(
        elements.stakingMessage,
        "Connect your wallet to continue."
    );

    setMessage(elements.stakeMessage, "");

    updateStakeEstimate();
}

/* =========================================
   WALLET PROVIDER VALIDATION
========================================= */

function getInjectedProvider() {
    if (
        typeof window !== "undefined" &&
        window.ethereum &&
        typeof window.ethereum.request === "function"
    ) {
        return window.ethereum;
    }

    return null;
}

async function validateTransactionProvider(
    provider,
    expectedAddress
) {
    if (
        !provider ||
        typeof provider.request !== "function" ||
        !expectedAddress
    ) {
        return false;
    }

    try {
        const accounts = await provider.request({
            method: "eth_accounts"
        });

        if (!Array.isArray(accounts) || accounts.length === 0) {
            return false;
        }

        const providerAddress = accounts[0];

        if (
            providerAddress.toLowerCase() !==
            expectedAddress.toLowerCase()
        ) {
            return false;
        }

        const providerChainId = await provider.request({
            method: "eth_chainId"
        });

        const numericChainId =
            Number.parseInt(providerChainId, 16);

        return numericChainId === CONFIG.chainId;

    } catch (error) {
        console.warn(
            "Transaction provider validation failed:",
            error
        );

        return false;
    }
}

/* =========================================
   PROVIDER EVENTS
========================================= */

function setupProviderEvents(provider) {
    if (
        !provider ||
        typeof provider.on !== "function" ||
        providerListeners.has(provider)
    ) {
        return;
    }

    providerListeners.add(provider);

    provider.on("accountsChanged", async (accounts) => {
        if (!Array.isArray(accounts) || accounts.length === 0) {
            clearWalletUI();

            setMessage(
                elements.stakingMessage,
                "Wallet account disconnected.",
                "warning"
            );

            return;
        }

        await syncAppKitWallet(provider);
    });

    provider.on("chainChanged", async () => {
        await syncAppKitWallet(provider);
    });

    provider.on("disconnect", () => {
        state.providerReady = false;
        state.walletProvider = null;

        clearWalletSession();

        updateActionButtons();

        setMessage(
            elements.stakingMessage,
            "Wallet provider disconnected. Reconnect your wallet.",
            "warning"
        );
    });
}

/* =========================================
   APPKIT WALLET SYNCHRONIZATION
========================================= */

async function syncAppKitWallet(providerCandidate = null) {
    const sequence = ++walletSyncSequence;

    try {
        if (
            !modal ||
            typeof modal.getAddress !== "function"
        ) {
            throw new Error(
                "AppKit account information is unavailable."
            );
        }

        const address = modal.getAddress();
        const chainId = modal.getChainId();

        if (!address) {
            clearWalletUI();
            return;
        }

        state.connected = true;
        state.walletAddress = address;
        state.chainId = Number(chainId);

        setWalletUI(true, address);

        let provider = providerCandidate;

        if (!provider) {
            provider = getInjectedProvider();
        }

        const providerValid =
            await validateTransactionProvider(
                provider,
                address
            );

        if (sequence !== walletSyncSequence) return;

        if (
            providerValid &&
            state.chainId === CONFIG.chainId
        ) {
            setWalletProvider(provider);

            state.walletProvider = provider;
            state.providerReady = true;

            setupProviderEvents(provider);

            setMessage(
                elements.stakingMessage,
                "Wallet connected. Transaction provider ready.",
                "success"
            );

        } else {
            state.walletProvider = null;
            state.providerReady = false;

            clearWalletSession();

            if (state.chainId !== CONFIG.chainId) {
                setMessage(
                    elements.stakingMessage,
                    "Please switch your wallet to Polygon Mainnet.",
                    "warning"
                );
            } else {
                setMessage(
                    elements.stakingMessage,
                    "Wallet connected. Transaction provider is not available yet. You can still view your staking data.",
                    "warning"
                );
            }
        }

        updateActionButtons();

        await refreshAll();

    } catch (error) {
        console.error(
            "AppKit wallet synchronization error:",
            error
        );

        if (sequence !== walletSyncSequence) return;

        setMessage(
            elements.stakingMessage,
            getErrorMessage(error),
            "error"
        );
    }
}

/* =========================================
   APPKIT LISTENERS
========================================= */

function setupAppKitListeners() {
    if (appKitListenersInitialized) return;

    appKitListenersInitialized = true;

    if (typeof modal.subscribeState === "function") {
        modal.subscribeState(() => {
            syncAppKitWallet();
        });
    }

    if (typeof modal.subscribeAccount === "function") {
        modal.subscribeAccount((account) => {
            if (account?.isConnected === false) {
                clearWalletUI();

                setMessage(
                    elements.stakingMessage,
                    "Wallet disconnected."
                );

                return;
            }

            syncAppKitWallet();
        });
    }

    if (typeof modal.subscribeNetwork === "function") {
        modal.subscribeNetwork(() => {
            syncAppKitWallet();
        });
    }

    /*
     * Provider subscription is kept as an additional source.
     * AppKit account synchronization does not depend on it.
     */
    try {
        subscribeWalletProvider((provider, error) => {
            if (error) {
                console.error(
                    "Wallet provider subscription error:",
                    error
                );

                return;
            }

            if (provider) {
                syncAppKitWallet(provider);
            }
        });
    } catch (error) {
        console.warn(
            "Provider subscription unavailable:",
            error
        );
    }
}

/* =========================================
   WALLET CONNECTION
========================================= */

async function connectWallet() {
    try {
        if (!modal || typeof modal.open !== "function") {
            throw new Error(
                "Wallet connection modal is unavailable."
            );
        }

        setMessage(
            elements.stakingMessage,
            "Opening wallet connection..."
        );

        await modal.open();

        /*
         * Check the current AppKit session after opening.
         */
        await syncAppKitWallet();

    } catch (error) {
        console.error(
            "Wallet connection error:",
            error
        );

        setMessage(
            elements.stakingMessage,
            getErrorMessage(error),
            "error"
        );
    }
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

        updateActionButtons();

        return true;

    } catch (error) {
        console.error(
            "Contract initialization error:",
            error
        );

        state.contractReady = false;

        updateActionButtons();

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

        state.durationRewardBps =
            BigInt(config.rewardBps);

        if (elements.selectedRewardRate) {
            const rate =
                Number(config.rewardBps) / 100;

            elements.selectedRewardRate.textContent =
                `${rate.toFixed(2)}%`;
        }

        setMessage(elements.stakeMessage, "");

        updateStakeEstimate();

    } catch (error) {
        console.error(
            "Duration configuration error:",
            error
        );

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
        const amount =
            elements.stakeAmount?.value || "0";

        const parsedAmount = parseJJS(amount);

        const reward =
            parsedAmount *
            state.durationRewardBps /
            10000n;

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

    updateActionButtons();

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

        renderPositions(data.positions);

        await updateDurationInfo();

    } catch (error) {
        console.error(
            "Dashboard refresh error:",
            error
        );

        setMessage(
            elements.stakingMessage,
            getErrorMessage(error),
            "error"
        );

    } finally {
        state.refreshing = false;

        updateActionButtons();
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
        const withdrawButton =
            document.createElement("button");

        withdrawButton.type = "button";
        withdrawButton.textContent = "Withdraw Principal";
        withdrawButton.dataset.action = "withdraw";
        withdrawButton.dataset.positionId = position.id;

        withdrawButton.disabled =
            !state.providerReady ||
            state.chainId !== CONFIG.chainId;

        actions.appendChild(withdrawButton);
    }

    if (position.canClaim) {
        const claimButton =
            document.createElement("button");

        claimButton.type = "button";
        claimButton.textContent = "Claim Reward";
        claimButton.dataset.action = "claim";
        claimButton.dataset.positionId = position.id;

        claimButton.disabled =
            !state.providerReady ||
            state.chainId !== CONFIG.chainId;

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

    updateActionButtons();
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
   TRANSACTION READINESS
========================================= */

function requireTransactionReady() {
    if (!state.connected || !state.walletAddress) {
        throw new Error("Connect your wallet first.");
    }

    if (!state.providerReady || !state.walletProvider) {
        throw new Error(
            "Transaction provider is unavailable. Reconnect your wallet."
        );
    }

    if (state.chainId !== CONFIG.chainId) {
        throw new Error(
            "Please switch your wallet to Polygon Mainnet."
        );
    }

    if (!state.contractReady) {
        throw new Error(
            "Staking contract is not ready."
        );
    }
}

/* =========================================
   APPROVE AND STAKE
========================================= */

async function handleStake() {
    if (state.busy) return;

    try {
        requireTransactionReady();
    } catch (error) {
        setMessage(
            elements.stakeMessage,
            getErrorMessage(error),
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

    const amount =
        elements.stakeAmount?.value?.trim();

    const duration =
        elements.stakeDuration?.value;

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
        elements.stakeBtn?.textContent ||
        "Approve & Stake JJS";

    setButtonLoading(
        elements.stakeBtn,
        true,
        originalText
    );

    updateActionButtons();

    try {
        const parsedAmount = parseJJS(amount);

        if (parsedAmount <= 0n) {
            throw new Error(
                "Amount must be greater than zero."
            );
        }

        setMessage(
            elements.stakeMessage,
            "Checking JJS allowance..."
        );

        const approval = await approveJJS(amount);

        if (!approval.approved) {
            throw new Error(
                "JJS approval was not completed."
            );
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

        const result = await stakeJJS(
            amount,
            duration
        );

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
        console.error(
            "Approve and stake error:",
            error
        );

        setMessage(
            elements.stakeMessage,
            getErrorMessage(error),
            "error"
        );

    } finally {
        state.busy = false;

        if (elements.stakeBtn) {
            elements.stakeBtn.textContent = originalText;
        }

        updateActionButtons();
    }
}

/* =========================================
   POSITION ACTIONS
========================================= */

async function handlePositionAction(
    action,
    positionId,
    button
) {
    if (state.busy) return;

    try {
        requireTransactionReady();
    } catch (error) {
        setMessage(
            elements.stakingMessage,
            getErrorMessage(error),
            "error"
        );
        return;
    }

    state.busy = true;

    const originalText = button.textContent;

    button.disabled = true;
    button.textContent = "Please wait...";

    updateActionButtons();

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
            throw new Error(
                "Unknown position action."
            );
        }

        await refreshAll();

    } catch (error) {
        console.error(
            "Position action error:",
            error
        );

        setMessage(
            elements.stakingMessage,
            getErrorMessage(error),
            "error"
        );

    } finally {
        state.busy = false;

        button.textContent = originalText;

        updateActionButtons();
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
            elements.stakeAmount.value =
                formatJJS(balance, 18);
        }

        updateStakeEstimate();

    } catch (error) {
        console.error(
            "Max balance error:",
            error
        );

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
        console.error(
            "Copy address error:",
            error
        );

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

            if (!button || button.disabled) return;

            await handlePositionAction(
                button.dataset.action,
                button.dataset.positionId,
                button
            );
        }
    );
}

/* =========================================
   INITIALIZE
========================================= */

async function initialize() {
    console.log(
        "JosJis Staking V2 initializing..."
    );

    setupEventListeners();

    const contractReady =
        await initializeContracts();

    if (contractReady) {
        await updateDurationInfo();
    }

    setupAppKitListeners();

    /*
     * Restore an existing AppKit session.
     */
    await syncAppKitWallet();

    /*
     * Automatic dashboard refresh.
     */
    if (!refreshInterval) {
        refreshInterval = setInterval(
            refreshAll,
            CONFIG.autoRefresh
        );
    }

    if (!countdownInterval) {
        countdownInterval = setInterval(
            updateCountdowns,
            1000
        );
    }

    console.log(
        "JosJis Staking V2 initialized."
    );
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
