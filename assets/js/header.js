
import { modal } from "../../web3/web3-config.js";

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

        <button
            id="headerWalletBtn"
            class="wallet-connect-btn"
            type="button"
        >
            Connect Wallet
        </button>

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
`;

document.head.appendChild(headerStyle);


// =====================================
// WALLET BUTTON
// =====================================

function initializeWalletButton() {

    const walletBtn =
        document.getElementById("headerWalletBtn");

    if (!walletBtn) return;

    function updateWalletButton() {

        const connected = modal.getIsConnected();
        const address = modal.getAddress();
        const chainId = Number(modal.getChainId());

        if (!connected || !address) {

            walletBtn.textContent = "Connect Wallet";
            walletBtn.title = "Connect your wallet";

            return;
        }

        if (chainId !== 137) {

            walletBtn.textContent = "Wrong Network";
            walletBtn.title = "Switch to Polygon";

            return;
        }

        walletBtn.textContent =
            address.slice(0, 6) + "..." +
            address.slice(-4);

        walletBtn.title = "Connected to Polygon";
    }


    walletBtn.addEventListener("click", async () => {

        try {

            if (!modal.getIsConnected()) {

                await modal.open({
                    view: "Connect"
                });

            } else if (Number(modal.getChainId()) !== 137) {

                await modal.open({
                    view: "Networks"
                });

            } else {

                await modal.open({
                    view: "Account"
                });

            }

        } catch (error) {

            console.error("Wallet error:", error);

        }

    });


    // Listen to AppKit changes

    modal.subscribeState(() => {
        updateWalletButton();
    });

    modal.subscribeAccount(() => {
        updateWalletButton();
    });

    modal.subscribeNetwork(() => {
        updateWalletButton();
    });


    // Restore existing wallet session

    updateWalletButton();

    let attempts = 0;

    const restoreSession = setInterval(() => {

        updateWalletButton();

        attempts++;

        if (modal.getIsConnected() || attempts >= 40) {
            clearInterval(restoreSession);
        }

    }, 250);

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


    // ACTIVE PAGE

    navLinks.forEach(link => {

        if (link.dataset.page === currentPage) {

            link.classList.add("active");

            link.setAttribute("aria-current", "page");

            const dropdown = link.closest(".nav-dropdown");

            if (dropdown) {
                dropdown.classList.add("has-active");
            }

        }

    });


    // CLOSE ALL DROPDOWNS

    function closeAllDropdowns() {

        document.querySelectorAll(".nav-dropdown").forEach(dropdown => {

            dropdown.classList.remove("open");

            const button =
                dropdown.querySelector(".dropdown-toggle");

            if (button) {
                button.setAttribute("aria-expanded", "false");
            }

        });

    }


    // MOBILE MAIN MENU

    menuToggle.addEventListener("click", () => {

        const isOpen = mainNav.classList.toggle("open");

        menuToggle.classList.toggle("active", isOpen);

        menuToggle.setAttribute(
            "aria-expanded",
            String(isOpen)
        );

        if (!isOpen) {
            closeAllDropdowns();
        }

    });


    // DROPDOWN MENUS

    document.querySelectorAll(".dropdown-toggle").forEach(button => {

        button.addEventListener("click", () => {

            const currentDropdown =
                button.closest(".nav-dropdown");

            const isCurrentlyOpen =
                currentDropdown.classList.contains("open");

            closeAllDropdowns();

            if (!isCurrentlyOpen) {

                currentDropdown.classList.add("open");

                button.setAttribute("aria-expanded", "true");

            }

        });

    });


    // CLOSE MENUS AFTER NAVIGATION

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


    // INITIALIZE WALLET

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
