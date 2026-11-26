/* =========================================
   JOSJIS DUMMY STAKING
   Version: V1
   Mode: Simulation Only
========================================= */

const STAKING_CONFIG = {
    lockPeriod: 7 * 24 * 60 * 60 * 1000,
    simulatedBalance: 10000000,
    storageKey: "josjis_dummy_staking_v1"
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
let positions = [];
let simulatedBalance = STAKING_CONFIG.simulatedBalance;


/* =========================================
   HELPERS
========================================= */

function formatJJS(value) {
    return Number(value).toLocaleString("en-US", {
        maximumFractionDigits: 4
    });
}


function shortenAddress(address) {
    return address.slice(0, 6) + "..." + address.slice(-4);
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


/* =========================================
   LOCAL STORAGE
========================================= */

function saveData() {
    if (!walletAddress) return;

    const data = {
        positions,
        simulatedBalance
    };

    localStorage.setItem(
        STAKING_CONFIG.storageKey + "_" + walletAddress.toLowerCase(),
        JSON.stringify(data)
    );
}


function loadData() {
    if (!walletAddress) return;

    const saved = localStorage.getItem(
        STAKING_CONFIG.storageKey + "_" + walletAddress.toLowerCase()
    );

    if (saved) {
        try {
            const data = JSON.parse(saved);

            positions = Array.isArray(data.positions)
                ? data.positions
                : [];

            simulatedBalance = Number.isFinite(
                Number(data.simulatedBalance)
            )
                ? Number(data.simulatedBalance)
                : STAKING_CONFIG.simulatedBalance;

        } catch (error) {
            console.error("Failed to load dummy staking data:", error);

            positions = [];
            simulatedBalance = STAKING_CONFIG.simulatedBalance;
        }

    } else {
        positions = [];
        simulatedBalance = STAKING_CONFIG.simulatedBalance;
    }
}


/* =========================================
   WALLET CONNECTION
========================================= */

async function connectWallet() {
    if (!window.ethereum) {
        elements.stakingMessage.textContent =
            "MetaMask was not detected. Open this page in a compatible wallet browser.";

        return;
    }

    try {
        const accounts = await window.ethereum.request({
            method: "eth_requestAccounts"
        });

        if (!accounts || !accounts.length) {
            throw new Error("No wallet account available.");
        }

        const chainId = await window.ethereum.request({
            method: "eth_chainId"
        });

        if (Number(chainId) !== 137) {
            elements.stakingMessage.textContent =
                "Please switch to Polygon Mainnet. Dummy mode does not send transactions.";
            return;
        }

        walletAddress = accounts[0];

        loadData();
        updateWalletUI();
        updateDashboard();

        elements.stakingMessage.textContent =
            "Wallet connected. Dummy staking mode is active.";

    } catch (error) {
        console.error("Wallet connection error:", error);

        elements.stakingMessage.textContent =
            error.message || "Unable to connect wallet.";
    }
}


function updateWalletUI() {
    if (!walletAddress) return;

    elements.walletStatus.textContent = "Connected";
    elements.walletAddress.textContent = walletAddress;

    elements.connectBtn.textContent = "Wallet Connected";
    elements.connectBtn.disabled = true;

    elements.copyBtn.hidden = false;
    elements.explorerLink.hidden = false;

    elements.explorerLink.href =
        "https://polygonscan.com/address/" + walletAddress;

    elements.stakeAmount.disabled = false;
    elements.maxBtn.disabled = false;

    elements.stakeBtn.disabled = false;
    elements.stakeBtn.textContent = "Stake JJS";

    elements.refreshBtn.disabled = false;
}


function disconnectWalletUI() {
    walletAddress = null;
    positions = [];
    simulatedBalance = STAKING_CONFIG.simulatedBalance;

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
    renderPositions();
}


/* =========================================
   DASHBOARD
========================================= */

function updateDashboard() {
    const totalStaked = positions.reduce(
        (total, position) => total + Number(position.amount),
        0
    );

    elements.totalStaked.textContent =
        formatJJS(totalStaked);

    elements.availableBalance.textContent =
        formatJJS(simulatedBalance);

    elements.activePositions.textContent =
        positions.length;

    elements.pendingRewards.textContent = "0";

    renderPositions();
}


/* =========================================
   STAKE
========================================= */

function stakeTokens() {
    if (!walletAddress) {
        elements.stakeMessage.textContent =
            "Connect your wallet first.";
        return;
    }

    const amount = Number(elements.stakeAmount.value);

    if (!Number.isFinite(amount) || amount <= 0) {
        elements.stakeMessage.textContent =
            "Enter a valid JJS amount.";
        return;
    }

    if (amount > simulatedBalance) {
        elements.stakeMessage.textContent =
            "Insufficient simulated JJS balance.";
        return;
    }

    const now = Date.now();

    const position = {
        id: Date.now(),
        amount: amount,
        startTime: now,
        unlockTime: now + STAKING_CONFIG.lockPeriod,
        status: "active"
    };

    simulatedBalance -= amount;
    positions.push(position);

    saveData();
    updateDashboard();

    elements.stakeAmount.value = "";

    elements.stakeMessage.textContent =
        `${formatJJS(amount)} JJS successfully staked in DUMMY MODE. No blockchain transaction occurred.`;
}


/* =========================================
   WITHDRAW
========================================= */

function withdrawPosition(positionId) {
    const position = positions.find(
        item => item.id === positionId
    );

    if (!position) return;

    if (Date.now() < position.unlockTime) {
        alert("This dummy staking position is still locked.");
        return;
    }

    simulatedBalance += Number(position.amount);

    positions = positions.filter(
        item => item.id !== positionId
    );

    saveData();
    updateDashboard();

    elements.stakeMessage.textContent =
        `${formatJJS(position.amount)} JJS returned to your simulated balance. No blockchain transaction occurred.`;
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

    elements.positionsContainer.innerHTML = positions.map(position => {
        const unlocked = Date.now() >= position.unlockTime;

        const status = unlocked
            ? "Ready to Withdraw"
            : "Locked";

        const countdown = getTimeRemaining(position.unlockTime);

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
                    <small>JJS</small>
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


elements.copyBtn.addEventListener("click", async () => {
    if (!walletAddress) return;

    try {
        await navigator.clipboard.writeText(walletAddress);

        elements.stakingMessage.textContent =
            "Wallet address copied.";

    } catch (error) {
        elements.stakingMessage.textContent =
            "Unable to copy wallet address.";
    }
});


elements.maxBtn.addEventListener("click", () => {
    if (!walletAddress) return;

    elements.stakeAmount.value = simulatedBalance;
});


elements.stakeBtn.addEventListener(
    "click",
    stakeTokens
);


elements.refreshBtn.addEventListener("click", () => {
    if (!walletAddress) return;

    loadData();
    updateDashboard();

    elements.stakingMessage.textContent =
        "Dummy staking data refreshed.";
});


elements.positionsContainer.addEventListener("click", event => {
    const button = event.target.closest("[data-withdraw]");

    if (!button || button.disabled) return;

    withdrawPosition(Number(button.dataset.withdraw));
});


/* =========================================
   WALLET EVENTS
========================================= */

if (window.ethereum) {

    window.ethereum.on("accountsChanged", accounts => {
        if (accounts && accounts.length) {
            walletAddress = accounts[0];

            loadData();
            updateWalletUI();
            updateDashboard();

        } else {
            disconnectWalletUI();
        }
    });


    window.ethereum.on("chainChanged", chainId => {
        if (Number(chainId) !== 137) {
            disconnectWalletUI();

            elements.stakingMessage.textContent =
                "Please return to Polygon Mainnet.";
        } else {
            connectWallet();
        }
    });

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

    elements.stakingMessage.textContent =
        "Dummy staking mode. Connect your wallet to begin.";

    if (window.ethereum) {
        try {
            const accounts = await window.ethereum.request({
                method: "eth_accounts"
            });

            const chainId = await window.ethereum.request({
                method: "eth_chainId"
            });

            if (accounts.length && Number(chainId) === 137) {
                walletAddress = accounts[0];

                loadData();
                updateWalletUI();
                updateDashboard();

                elements.stakingMessage.textContent =
                    "Wallet session restored. Dummy staking mode is active.";
            }

        } catch (error) {
            console.error("Wallet session restoration failed:", error);
        }
    }
}


initialize();
