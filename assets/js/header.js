
import {
    modal,
    token,
    formatUnits
} from "../../web3/web3-config.js";

// =====================================
// JOSJIS SHARED HEADER
// =====================================

const headerHTML = `
<header class="site-header">

    <a href="index.html" class="logo">
        JosJis
    </a>

    <button
        class="menu-toggle"
        id="menuToggle"
        type="button"
        aria-label="Toggle navigation"
        aria-expanded="false"
        aria-controls="mainNav"
    >
        <span></span>
        <span></span>
        <span></span>
    </button>

    <nav id="mainNav" class="main-nav">

        <a href="index.html" data-page="index.html">Home</a>

        <a href="buy-jjs.html" data-page="buy-jjs.html">
            How to Buy
        </a>

        <a href="about.html" data-page="about.html">About</a>

        <div class="nav-dropdown">

            <button
                class="dropdown-toggle"
                type="button"
                aria-expanded="false"
                aria-controls="tokenSubmenu"
            >
                Token
                <span class="dropdown-arrow">▾</span>
            </button>

            <div class="dropdown-menu" id="tokenSubmenu">

                <a href="tokenomics.html"
                   data-page="tokenomics.html">
                    Tokenomics
                </a>

                <a href="utility.html"
                   data-page="utility.html">
                    Utility
                </a>

            </div>

        </div>

        <a href="ecosystem.html" data-page="ecosystem.html">
            Ecosystem
        </a>

        <a href="dashboard.html" data-page="dashboard.html">
            Dashboard
        </a>

        <div class="nav-dropdown">

            <button
                class="dropdown-toggle"
                type="button"
                aria-expanded="false"
                aria-controls="communitySubmenu"
            >
                Community
                <span class="dropdown-arrow">▾</span>
            </button>

            <div class="dropdown-menu" id="communitySubmenu">

                <a href="crypto-donations.html"
                   data-page="crypto-donations.html">
                    Donate
                </a>

                <a href="roadmap.html"
                   data-page="roadmap.html">
                    Roadmap
                </a>

                <a href="contact.html"
                   data-page="contact.html">
                    Contact
                </a>

            </div>

        </div>

        <!-- WALLET INFO -->

        <div class="header-wallet-info">

            <span
                id="headerJJSBalance"
                class="header-jjs-balance"
            >
                0 JJS
            </span>

            <button
                id="headerWalletBtn"
                class="wallet-connect-btn"
                type="button"
            >
                Connect Wallet
            </button>

        </div>

    </nav>

</header>
`;


// =====================================
// HEADER STYLE
// =====================================

const headerStyle = document.createElement("style");

headerStyle.textContent = `

    .nav-dropdown .dropdown-menu {
        display: none;
    }

    .nav-dropdown.open .dropdown-menu {
        display: block;
    }

    .dropdown-arrow {
        display: inline-block;
        font-size: 20px;
        margin-left: 5px;
        line-height: 1;
        transition: transform 0.25s ease;
    }

    .nav-dropdown.open .dropdown-arrow {
        transform: rotate(180deg);
    }

    .header-wallet-info {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
    }

    .header-jjs-balance {
        padding: 9px 12px;
        border-radius: 8px;
        background: #241637;
        border: 1px solid #56358a;
        color: #c4a5ff;
        font-size: 13px;
        font-weight: 700;
        white-space: nowrap;
    }

    .wallet-connect-btn {
        padding: 10px 16px;
        border: 0;
        border-radius: 8px;
        background: #8b5cf6;
        color: #ffffff;
        font-weight: 600;
        cursor: pointer;
        white-space: nowrap;
    }

    .wallet-connect-btn:hover {
        background: #7c3aed;
    }

    .wallet-connect-btn:disabled {
        opacity: 0.6;
        cursor: wait;
    }

`;

document.head.appendChild(headerStyle);


// =====================================
// WALLET BUTTON & JJS BALANCE
// =====================================

function initializeWalletButton() {

    const walletBtn =
        document.getElementById("headerWalletBtn");

    const balanceElement =
        document.getElementById("headerJJSBalance");

    if (!walletBtn || !balanceElement) return;

    let balanceRequest = 0;
    let lastAddress = "";


    // =====================================
    // UPDATE JJS BALANCE
    // =====================================

    async function updateJJSBalance(address) {

        const requestId = ++balanceRequest;

        try {

            balanceElement.textContent = "Loading...";

            const [balance, decimals] = await Promise.all([
                token.balanceOf(address),
                token.decimals()
            ]);

            if (requestId !== balanceRequest) return;

            if (
                modal.getAddress()?.toLowerCase() !==
                address.toLowerCase()
            ) {
                return;
            }

            const formattedBalance = Number(
                formatUnits(balance, decimals)
            ).toLocaleString("en-US", {
                maximumFractionDigits: 4
            });

            balanceElement.textContent =
                formattedBalance + " JJS";

        } catch (error) {

            console.error("JJS Balance Error:", error);

            if (requestId === balanceRequest) {

                balanceElement.textContent =
                    "Balance unavailable";

            }

        }

    }


    // =====================================
    // UPDATE WALLET BUTTON
    // =====================================

    function updateWalletButton() {

        try {

            const connected = modal.getIsConnected();
            const address = modal.getAddress();
            const chainId = Number(modal.getChainId());

            if (!connected || !address) {

                balanceRequest++;
                lastAddress = "";

                walletBtn.textContent = "Connect Wallet";
                walletBtn.title = "Connect your wallet";

                balanceElement.textContent = "0 JJS";

                return;
            }

            if (chainId !== 137) {

                balanceRequest++;
                lastAddress = "";

                walletBtn.textContent = "Wrong Network";
                walletBtn.title = "Switch to Polygon";

                balanceElement.textContent =
                    "Polygon required";

                return;
            }

            walletBtn.textContent =
                address.slice(0, 6) +
                "..." +
                address.slice(-4);

            walletBtn.title = "Connected to Polygon";

            // Only fetch when wallet address changes

            const normalizedAddress =
                address.toLowerCase();

            if (lastAddress !== normalizedAddress) {

                lastAddress = normalizedAddress;

                updateJJSBalance(address);

            }

        } catch (error) {

            console.error("Wallet state error:", error);

        }

    }


    // =====================================
    // CONNECT WALLET
    // =====================================

    walletBtn.addEventListener("click", async () => {

        try {

            walletBtn.disabled = true;

            await modal.open({
                view: "Connect"
            });

        } catch (error) {

            console.error("Header Wallet Error:", error);

            alert("Unable to open wallet connection.");

        } finally {

            walletBtn.disabled = false;

            updateWalletButton();

        }

    });


    // =====================================
    // APPKIT LISTENERS
    // =====================================

    modal.subscribeState(() => {

        updateWalletButton();

    });

    modal.subscribeAccount(() => {

        updateWalletButton();

    });

    modal.subscribeNetwork(() => {

        updateWalletButton();

    });


    // =====================================
    // INITIAL SESSION
    // =====================================

    updateWalletButton();

    let attempts = 0;

    const restoreSession = setInterval(() => {

        updateWalletButton();

        attempts++;

        if (
            modal.getIsConnected() ||
            attempts >= 40
        ) {

            clearInterval(restoreSession);

        }

    }, 250);


    // =====================================
    // AUTO REFRESH EVERY 15 SECONDS
    // =====================================

    setInterval(() => {

        if (
            modal.getIsConnected() &&
            Number(modal.getChainId()) === 137
        ) {

            const address = modal.getAddress();

            if (address) {

                updateJJSBalance(address);

            }

        }

    }, 15000);

}


// =====================================
// INITIALIZE HEADER
// =====================================

function initializeHeader() {

    document.body.insertAdjacentHTML(
        "afterbegin",
        headerHTML
    );

    const currentPage =
        window.location.pathname.split("/").pop() || "index.html";

    const navLinks =
        document.querySelectorAll(".main-nav a");

    const menuToggle =
        document.getElementById("menuToggle");

    const mainNav =
        document.getElementById("mainNav");


    // =====================================
    // ACTIVE PAGE
    // =====================================

    navLinks.forEach(link => {

        if (link.dataset.page === currentPage) {

            link.classList.add("active");

            link.setAttribute("aria-current", "page");

            const dropdown =
                link.closest(".nav-dropdown");

            if (dropdown) {

                dropdown.classList.add("has-active");

            }

        }

    });


    // =====================================
    // CLOSE ALL DROPDOWNS
    // =====================================

    function closeAllDropdowns() {

        document.querySelectorAll(".nav-dropdown").forEach(dropdown => {

            dropdown.classList.remove("open");

            const button =
                dropdown.querySelector(".dropdown-toggle");

            if (button) {

                button.setAttribute(
                    "aria-expanded",
                    "false"
                );

            }

        });

    }


    // =====================================
    // MOBILE MAIN MENU
    // =====================================

    menuToggle.addEventListener("click", () => {

        const isOpen =
            mainNav.classList.toggle("open");

        menuToggle.classList.toggle("active", isOpen);

        menuToggle.setAttribute(
            "aria-expanded",
            String(isOpen)
        );

        if (!isOpen) {

            closeAllDropdowns();

        }

    });


    // =====================================
    // DROPDOWN MENUS
    // =====================================

    document.querySelectorAll(".dropdown-toggle").forEach(button => {

        button.addEventListener("click", () => {

            const currentDropdown =
                button.closest(".nav-dropdown");

            const isCurrentlyOpen =
                currentDropdown.classList.contains("open");

            closeAllDropdowns();

            if (!isCurrentlyOpen) {

                currentDropdown.classList.add("open");

                button.setAttribute(
                    "aria-expanded",
                    "true"
                );

            }

        });

    });


    // =====================================
    // CLOSE MENUS AFTER NAVIGATION
    // =====================================

    navLinks.forEach(link => {

        link.addEventListener("click", () => {

            mainNav.classList.remove("open");

            menuToggle.classList.remove("active");

            menuToggle.setAttribute(
                "aria-expanded",
                "false"
            );

            closeAllDropdowns();

        });

    });


    // =====================================
    // INITIALIZE WALLET
    // =====================================

    initializeWalletButton();

}


// =====================================
// DOM READY
// =====================================

if (document.readyState === "loading") {

    document.addEventListener(
        "DOMContentLoaded",
        initializeHeader
    );

} else {

    initializeHeader();

}
