
/* =========================================
   JOSJIS STAKING
   Version: V5
   Mode: Polygon Mainnet
========================================= */

import { modal, rpcProvider } from "../../web3/web3-config.js";
import { getTokenBalance } from "../../assets/js/core/token-manager.js";

import {
    BrowserProvider,
    Contract,
    formatUnits,
    parseUnits
} from "https://esm.sh/ethers@6.15.0";


/* =========================================
   CONFIGURATION
========================================= */

const CONFIG = {
    chainId: 137,
    decimals: 18,
    autoRefresh: 15000,

    tokenAddress: "0x52C8Ff13ada1431376b3E77E8219b644805122dF",
    stakingAddress: "0x9b196084F6650bf5A1f38d2Abc0f93358Dc31382"
};

const TOKEN_ABI = [
    "function balanceOf(address) view returns (uint256)",
    "function allowance(address,address) view returns (uint256)",
    "function approve(address,uint256) returns (bool)"
];

const STAKING_ABI = [
    "function stakingToken() view returns (address)",
    "function stakingPaused() view returns (bool)",
    "function availableRewards() view returns (uint256)",
    "function durationConfigs(uint256) view returns (uint16 rewardBps,bool enabled)",
    "function positions(uint256) view returns (address user,uint256 amount,uint256 reward,uint64 unlockTime,bool principalWithdrawn,bool rewardClaimed)",
    "function stake(uint256 amount,uint256 duration) returns (uint256 id)",
    "function withdrawPrincipal(uint256 id)",
    "function claimReward(uint256 id)",
    "event Staked(uint256 indexed id,address indexed user,uint256 amount,uint256 reward)"
];


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
    stakeDuration: document.getElementById("stakeDuration"),
    selectedRewardRate: document.getElementById("selectedRewardRate"),
    estimatedReward: document.getElementById("estimatedReward"),
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
let walletProvider = null;

let realBalance = 0n;
let positions = [];

let contractReady = false;
let contractPaused = true;
let contractError = null;
let positionsError = null;

let balanceLoading = false;
let actionBusy = false;

let refreshTimer = null;
let countdownTimer = null;
let balanceRequest = 0;


/* =========================================
   CONTRACT INSTANCES
========================================= */

const readToken = new Contract(
    CONFIG.tokenAddress,
    TOKEN_ABI,
    rpcProvider
);

const readStaking = new Contract(
    CONFIG.stakingAddress,
    STAKING_ABI,
    rpcProvider
);


/* =========================================
   HELPERS
========================================= */

const UNIT = 10n ** BigInt(CONFIG.decimals);

function formatJJS(rawValue) {
    try {
        const value = BigInt(rawValue);
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

        return grouped + (fraction ? "." + fraction : "");
    } catch {
        return "0";
    }
}


function parseJJS(value) {
    const input = String(value).trim();

    if (!/^\d+(\.\d{1,18})?$/.test(input)) {
        throw new Error(
            "Enter a valid amount with up to 18 decimal places."
        );
    }

    return parseUnits(input, CONFIG.decimals);
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


function isPolygon() {
    return Number(walletChainId) === CONFIG.chainId;
}


function getTimeRemaining(unlockTime) {
    const remaining = Number(unlockTime) * 1000 - Date.now();

    if (remaining <= 0) {
        return "Ready";
    }

    const days = Math.floor(remaining / 86400000);
    const hours = Math.floor((remaining % 86400000) / 3600000);
    const minutes = Math.floor((remaining % 3600000) / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);

    return `${days}d ${hours}h ${minutes}m ${seconds}s`;
}


function createElement(tag, className, text) {
    const node = document.createElement(tag);

    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;

    return node;
}


function setBusy(value) {
    actionBusy = value;
    updateControls();
}


function updateControls() {
    const connected = !!walletAddress;
    const correctNetwork = connected && isPolygon();

    const canUse = (
        connected &&
        correctNetwork &&
        contractReady &&
        !contractPaused &&
        !actionBusy
    );

    el.stakeAmount.disabled = !canUse || balanceLoading;
    el.stakeDuration.disabled = !canUse;
    el.maxBtn.disabled = !canUse || balanceLoading;
    el.refreshBtn.disabled = !connected || !correctNetwork || actionBusy;

    if (!connected) {
        el.stakeBtn.disabled = true;
        el.stakeBtn.textContent = "Connect Wallet to Stake";
    } else if (!correctNetwork) {
        el.stakeBtn.disabled = true;
        el.stakeBtn.textContent = "Switch to Polygon Mainnet";
    } else if (!contractReady) {
        el.stakeBtn.disabled = true;
        el.stakeBtn.textContent = "Contract Unavailable";
    } else if (contractPaused) {
        el.stakeBtn.disabled = true;
        el.stakeBtn.textContent = "Staking Paused";
    } else if (actionBusy) {
        el.stakeBtn.disabled = true;
        el.stakeBtn.textContent = "Processing...";
    } else {
        el.stakeBtn.disabled = false;
        el.stakeBtn.textContent = "Approve & Stake JJS";
    }
}


/* =========================================
   CONTRACT VALIDATION
========================================= */

async function validateContract() {
    try {
        const network = await rpcProvider.getNetwork();

        if (Number(network.chainId) !== CONFIG.chainId) {
            throw new Error("Website RPC is not connected to Polygon.");
        }

        const tokenAddress = await readStaking.stakingToken();

        if (
            tokenAddress.toLowerCase() !==
            CONFIG.tokenAddress.toLowerCase()
        ) {
            throw new Error(
                "Staking contract token does not match the official JJS token."
            );
        }

        contractPaused = await readStaking.stakingPaused();
        contractReady = true;
        contractError = null;

        return true;

    } catch (error) {
        console.error("Contract validation error:", error);

        contractReady = false;
        contractError = error.message || "Unable to validate staking contract.";

        setMessage("Staking contract validation failed: " + contractError);

        return false;
    }
}


/* =========================================
   WALLET UI
========================================= */

function showDisconnected() {
    balanceRequest++;

    walletAddress = null;
    walletChainId = null;

    realBalance = 0n;
    positions = [];

    balanceLoading = false;
    positionsError = null;

    el.walletStatus.textContent = "Not Connected";
    el.walletAddress.textContent = "Not connected";

    el.connectBtn.textContent = "Connect Wallet";
    el.connectBtn.disabled = false;

    el.copyBtn.hidden = true;
    el.explorerLink.hidden = true;

    el.stakeAmount.value = "";
    el.selectedRewardRate.textContent = "--";
    el.estimatedReward.textContent = "0 JJS";

    el.totalStaked.textContent = "--";
    el.availableBalance.textContent = "--";
    el.activePositions.textContent = "--";
    el.pendingRewards.textContent = "--";

    setStakeMessage("Connect your wallet to start staking.");

    renderPositions();
    updateControls();
}


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
        setMessage("Please switch your wallet to Polygon Mainnet.");
    } else {
        el.walletStatus.textContent = "Connected";
    }

    updateControls();
}


/* =========================================
   WALLET PROVIDER
========================================= */

modal.subscribeProviders((providers) => {
    walletProvider =
        providers?.["eip155"] || null;
});


async function getSignerContracts() {
    if (!walletAddress || !isPolygon()) {
        throw new Error("Connect a wallet on Polygon Mainnet.");
    }

    if (!walletProvider) {
        throw new Error(
            "Wallet provider is not available. Reconnect your wallet."
        );
    }

    const browserProvider = new BrowserProvider(walletProvider);
    const network = await browserProvider.getNetwork();

    if (Number(network.chainId) !== CONFIG.chainId) {
        throw new Error("Wallet is not connected to Polygon Mainnet.");
    }

    const signer = await browserProvider.getSigner();
    const signerAddress = await signer.getAddress();

    if (signerAddress.toLowerCase() !== walletAddress.toLowerCase()) {
        throw new Error("Wallet account changed. Please refresh the page.");
    }

    return {
        signer,
        token: new Contract(CONFIG.tokenAddress, TOKEN_ABI, signer),
        staking: new Contract(CONFIG.stakingAddress, STAKING_ABI, signer)
    };
}


/* =========================================
   WALLET SESSION SYNC
========================================= */

function syncWallet(accountAddress = null) {
    try {
        const address = modal.getAddress() || accountAddress;
        const chainId = modal.getChainId();

        if (!address || chainId === undefined || chainId === null) {
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
            realBalance = 0n;
            positions = [];
            positionsError = null;
            el.stakeAmount.value = "";
        }

        walletChainId = newChainId;

        updateWalletUI();

        if (!isPolygon()) {
            balanceRequest++;
            realBalance = 0n;
            balanceLoading = false;
            updateDashboard();
            return true;
        }

        if (addressChanged || networkChanged) {
            refreshAll();
        }

        return true;

    } catch (error) {
        console.error("Wallet sync error:", error);
        return false;
    }
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
                if (syncWallet(address)) {
                    return;
                }
            }
        } catch (error) {
            console.error("Wallet restore error:", error);
        }

        await new Promise(resolve => setTimeout(resolve, 250));
    }

    if (!walletAddress) {
        showDisconnected();
        setMessage("No active wallet session detected. Connect your wallet.");
    }
}


/* =========================================
   CONNECT WALLET
========================================= */

async function connectWallet() {
    try {
        setMessage("Opening wallet connection...");

        await modal.open({ view: "Connect" });

        await restoreWalletSession();

    } catch (error) {
        console.error("Connect wallet error:", error);
        setMessage(error.message || "Unable to connect wallet.");
    }
}


/* =========================================
   JJS BALANCE
========================================= */

async function refreshBalance() {
    if (!walletAddress || !isPolygon()) return;

    const address = walletAddress;
    const requestId = ++balanceRequest;

    balanceLoading = true;
    updateControls();

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
            throw new Error(result?.error || "Unable to read JJS balance.");
        }

        realBalance = BigInt(result.raw.toString());

    } catch (error) {
        console.error("Balance error:", error);
        setMessage("Unable to read JJS balance: " + error.message);

    } finally {
        if (requestId === balanceRequest) {
            balanceLoading = false;
            updateDashboard();
            updateControls();
        }
    }
}


/* =========================================
   LOAD ON-CHAIN POSITIONS
========================================= */

async function loadPositions() {
    if (!walletAddress) return;

    positionsError = null;

    try {
        const filter = readStaking.filters.Staked(null, walletAddress);

        const logs = await readStaking.queryFilter(
            filter,
            0,
            "latest"
        );

        const ids = [
            ...new Set(
                logs.map(log => log.args.id.toString())
            )
        ];

        const loaded = [];

        for (const id of ids) {
            const p = await readStaking.positions(id);

            if (p.user.toLowerCase() !== walletAddress.toLowerCase()) {
                continue;
            }

            loaded.push({
                id: id,
                amount: p.amount,
                reward: p.reward,
                unlockTime: Number(p.unlockTime),
                principalWithdrawn: p.principalWithdrawn,
                rewardClaimed: p.rewardClaimed
            });
        }

        positions = loaded.sort(
            (a, b) => Number(a.id) - Number(b.id)
        );

    } catch (error) {
        console.error("Position loading error:", error);

        positionsError =
            "Unable to load position history from the RPC provider.";
    }

    updateDashboard();
}


/* =========================================
   CONTRACT STATUS
========================================= */

async function refreshContractStatus() {
    try {
        contractPaused = await readStaking.stakingPaused();
        contractReady = true;

        const available = await readStaking.availableRewards();

        el.stakeMessage.dataset.availableRewards =
            formatJJS(available);

    } catch (error) {
        contractReady = false;
        contractError = error.message || "Contract read failed.";
        console.error("Contract status error:", error);
    }

    updateControls();
}


/* =========================================
   REFRESH ALL DATA
========================================= */

async function refreshAll() {
    if (!walletAddress || !isPolygon()) return;

    await Promise.all([
        refreshBalance(),
        loadPositions(),
        refreshContractStatus()
    ]);

    updateDashboard();
    await updateRewardEstimate();
}


function updateDashboard() {
    if (!walletAddress) return;

    const principal = positions.reduce(
        (sum, p) => sum + (
            p.principalWithdrawn ? 0n : p.amount
        ),
        0n
    );

    const pending = positions.reduce(
        (sum, p) => sum + (
            p.rewardClaimed ? 0n : p.reward
        ),
        0n
    );

    const outstanding = positions.filter(
        p => !p.principalWithdrawn || !p.rewardClaimed
    ).length;

    el.totalStaked.textContent = formatJJS(principal);

    el.availableBalance.textContent =
        balanceLoading ? "Loading..." : formatJJS(realBalance);

    el.activePositions.textContent = outstanding;
    el.pendingRewards.textContent = formatJJS(pending);

    renderPositions();
}


/* =========================================
   REWARD ESTIMATE
========================================= */

async function updateRewardEstimate() {
    if (!contractReady) return;

    try {
        const duration = BigInt(el.stakeDuration.value);
        const config = await readStaking.durationConfigs(duration);

        const rewardBps = BigInt(config.rewardBps);
        const enabled = config.enabled;

        if (!enabled) {
            el.selectedRewardRate.textContent = "Unavailable";
            el.estimatedReward.textContent = "0 JJS";
            return;
        }

        const percent = (Number(rewardBps) / 100).toFixed(2);

        el.selectedRewardRate.textContent = percent + "%";

        let amount = 0n;

        if (el.stakeAmount.value.trim()) {
            amount = parseJJS(el.stakeAmount.value);
        }

        const reward = amount * rewardBps / 10000n;

        el.estimatedReward.textContent =
            formatJJS(reward) + " JJS";

    } catch (error) {
        el.selectedRewardRate.textContent = "--";
        el.estimatedReward.textContent = "0 JJS";
        console.error("Reward estimate error:", error);
    }
}


/* =========================================
   APPROVE AND STAKE
========================================= */

async function stakeTokens() {
    if (!walletAddress || !isPolygon()) {
        setStakeMessage("Connect your wallet to Polygon Mainnet.");
        return;
    }

    if (!contractReady || contractPaused) {
        setStakeMessage("Staking contract is unavailable or paused.");
        return;
    }

    let amount;
    let duration;

    try {
        amount = parseJJS(el.stakeAmount.value);
        duration = BigInt(el.stakeDuration.value);
    } catch (error) {
        setStakeMessage(error.message);
        return;
    }

    if (amount <= 0n) {
        setStakeMessage("Enter a valid JJS amount.");
        return;
    }

    if (amount > realBalance) {
        setStakeMessage("Insufficient JJS wallet balance.");
        return;
    }

    setBusy(true);

    try {
        setStakeMessage("Checking staking configuration...");

        const config = await readStaking.durationConfigs(duration);

        if (!config.enabled) {
            throw new Error("This staking duration is not available.");
        }

        const reward = amount * BigInt(config.rewardBps) / 10000n;
        const availableRewards = await readStaking.availableRewards();

        if (reward > availableRewards) {
            throw new Error("Insufficient reward reserves in the staking contract.");
        }

        const { token, staking } = await getSignerContracts();

        const allowance = await token.allowance(
            walletAddress,
            CONFIG.stakingAddress
        );

        if (allowance < amount) {
            setStakeMessage("Please approve JJS spending in your wallet...");

            const approveTx = await token.approve(
                CONFIG.stakingAddress,
                amount
            );

            setStakeMessage("Approval submitted. Waiting for confirmation...");

            await approveTx.wait();
        }

        setStakeMessage("Please confirm the staking transaction...");

        const stakeTx = await staking.stake(amount, duration);

        setStakeMessage("Staking transaction submitted. Waiting for confirmation...");

        const receipt = await stakeTx.wait();

        if (!receipt || receipt.status !== 1) {
            throw new Error("Staking transaction failed.");
        }

        el.stakeAmount.value = "";

        setStakeMessage(
            "Staking successful. Transaction: " + receipt.hash
        );

        await refreshAll();

    } catch (error) {
        console.error("Stake transaction error:", error);

        setStakeMessage(
            error.shortMessage ||
            error.reason ||
            error.message ||
            "Staking transaction failed."
        );

    } finally {
        setBusy(false);
    }
}


/* =========================================
   WITHDRAW PRINCIPAL
========================================= */

async function withdrawPrincipal(positionId) {
    const position = positions.find(
        p => p.id === String(positionId)
    );

    if (!position || position.principalWithdrawn) return;

    if (Date.now() < position.unlockTime * 1000) {
        setStakeMessage("This position has not matured yet.");
        return;
    }

    setBusy(true);

    try {
        const { staking } = await getSignerContracts();

        setStakeMessage("Confirm principal withdrawal in your wallet...");

        const tx = await staking.withdrawPrincipal(position.id);

        setStakeMessage("Withdrawal submitted. Waiting for confirmation...");

        const receipt = await tx.wait();

        if (!receipt || receipt.status !== 1) {
            throw new Error("Principal withdrawal failed.");
        }

        setStakeMessage("Principal successfully withdrawn.");

        await refreshAll();

    } catch (error) {
        console.error("Principal withdrawal error:", error);

        setStakeMessage(
            error.shortMessage ||
            error.reason ||
            error.message ||
            "Unable to withdraw principal."
        );

    } finally {
        setBusy(false);
    }
}


/* =========================================
   CLAIM REWARD
========================================= */

async function claimReward(positionId) {
    const position = positions.find(
        p => p.id === String(positionId)
    );

    if (!position || position.rewardClaimed) return;

    if (Date.now() < position.unlockTime * 1000) {
        setStakeMessage("Rewards are locked until the maturity date.");
        return;
    }

    setBusy(true);

    try {
        const { staking } = await getSignerContracts();

        setStakeMessage("Confirm reward claim in your wallet...");

        const tx = await staking.claimReward(position.id);

        setStakeMessage("Reward claim submitted. Waiting for confirmation...");

        const receipt = await tx.wait();

        if (!receipt || receipt.status !== 1) {
            throw new Error("Reward claim failed.");
        }

        setStakeMessage("JJS reward successfully claimed.");

        await refreshAll();

    } catch (error) {
        console.error("Reward claim error:", error);

        setStakeMessage(
            error.shortMessage ||
            error.reason ||
            error.message ||
            "Unable to claim reward."
        );

    } finally {
        setBusy(false);
    }
}


/* =========================================
   RENDER POSITIONS
========================================= */

function renderPositions() {
    el.positionsContainer.replaceChildren();

    if (!walletAddress) {
        el.positionsContainer.append(
            createEmptyState("Connect your wallet to view your positions.")
        );
        return;
    }

    if (positionsError) {
        el.positionsContainer.append(
            createEmptyState(positionsError)
        );
        return;
    }

    if (positions.length === 0) {
        el.positionsContainer.append(
            createEmptyState("Your on-chain staking positions will appear here.")
        );
        return;
    }

    for (const position of positions) {
        const matured =
            Date.now() >= position.unlockTime * 1000;

        const card = createElement("article", "staking-card");

        const heading = createElement("div", "staking-card-heading");
        heading.append(
            createElement("h2", "", "Position #" + position.id),
            createElement(
                "span",
                "staking-status",
                matured ? "Matured" : "Locked"
            )
        );

        const amountCard = createElement("div", "staking-stat-card");
        amountCard.append(
            createElement("span", "", "Staked Principal"),
            createElement("strong", "", formatJJS(position.amount)),
            createElement("small", "", "JJS")
        );

        const rewardCard = createElement("div", "staking-stat-card");
        rewardCard.append(
            createElement("span", "", "Position Reward"),
            createElement("strong", "", formatJJS(position.reward)),
            createElement("small", "", "JJS")
        );

        const lockInfo = createElement("div", "staking-lock-info");

        const unlockDate = new Date(
            position.unlockTime * 1000
        ).toLocaleString();

        const timeBox = document.createElement("div");
        timeBox.append(
            createElement("span", "", "Time Remaining"),
            createElement(
                "strong",
                "position-countdown",
                matured ? "Ready" : getTimeRemaining(position.unlockTime)
            )
        );

        const dateBox = document.createElement("div");
        dateBox.append(
            createElement("span", "", "Unlock Date"),
            createElement("strong", "", unlockDate)
        );

        lockInfo.append(timeBox, dateBox);

        card.append(heading, amountCard, rewardCard, lockInfo);

        if (!position.principalWithdrawn) {
            const withdrawBtn = createElement(
                "button",
                "staking-button full-width",
                matured ? "Withdraw Principal" : "Principal Locked"
            );

            withdrawBtn.type = "button";
            withdrawBtn.disabled = !matured || actionBusy;
            withdrawBtn.dataset.withdraw = position.id;

            card.append(withdrawBtn);
        } else {
            card.append(
                createElement("p", "staking-message", "Principal withdrawn.")
            );
        }

        if (!position.rewardClaimed) {
            const claimBtn = createElement(
                "button",
                "staking-button secondary full-width",
                matured ? "Claim Reward" : "Reward Locked"
            );

            claimBtn.type = "button";
            claimBtn.disabled = !matured || actionBusy;
            claimBtn.dataset.claim = position.id;

            card.append(claimBtn);
        } else {
            card.append(
                createElement("p", "staking-message", "Reward claimed.")
            );
        }

        el.positionsContainer.append(card);
    }
}


function createEmptyState(message) {
    const box = createElement("div", "staking-empty-state");

    box.append(
        createElement("div", "empty-icon", "🔒"),
        createElement("h3", "", "Staking Positions"),
        createElement("p", "", message)
    );

    return box;
}


/* =========================================
   EVENT LISTENERS
========================================= */

el.connectBtn.addEventListener("click", connectWallet);

el.copyBtn.addEventListener("click", async () => {
    if (!walletAddress) return;

    try {
        await navigator.clipboard.writeText(walletAddress);
        setMessage("Wallet address copied.");
    } catch {
        setMessage("Unable to copy wallet address.");
    }
});


el.maxBtn.addEventListener("click", () => {
    if (!walletAddress || !isPolygon()) return;

    el.stakeAmount.value = formatUnits(
        realBalance,
        CONFIG.decimals
    );

    updateRewardEstimate();
});


el.stakeAmount.addEventListener(
    "input",
    updateRewardEstimate
);


el.stakeDuration.addEventListener(
    "change",
    updateRewardEstimate
);


el.stakeBtn.addEventListener(
    "click",
    stakeTokens
);


el.refreshBtn.addEventListener("click", async () => {
    if (!walletAddress || !isPolygon()) return;

    setMessage("Refreshing staking data...");

    await refreshAll();

    setMessage("Staking data refreshed.");
});


el.positionsContainer.addEventListener("click", event => {
    const withdrawButton = event.target.closest("[data-withdraw]");
    const claimButton = event.target.closest("[data-claim]");

    if (withdrawButton && !withdrawButton.disabled) {
        withdrawPrincipal(withdrawButton.dataset.withdraw);
    }

    if (claimButton && !claimButton.disabled) {
        claimReward(claimButton.dataset.claim);
    }
});


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
   AUTOMATIC REFRESH
========================================= */

function startAutoRefresh() {
    if (refreshTimer) clearInterval(refreshTimer);

    refreshTimer = setInterval(() => {
        if (walletAddress && isPolygon() && !actionBusy) {
            refreshAll();
        }
    }, CONFIG.autoRefresh);
}


function startCountdown() {
    if (countdownTimer) clearInterval(countdownTimer);

    countdownTimer = setInterval(() => {
        if (walletAddress) renderPositions();
    }, 1000);
}


/* =========================================
   INITIALIZE
========================================= */

async function initialize() {
    showDisconnected();

    setMessage("Checking staking contract...");

    const valid = await validateContract();

    if (!valid) {
        setStakeMessage(
            "Staking is unavailable: " + contractError
        );
        updateControls();
        return;
    }

    setMessage("Staking contract connected.");

    await restoreWalletSession();

    startAutoRefresh();
    startCountdown();

    updateControls();
}


initialize();
