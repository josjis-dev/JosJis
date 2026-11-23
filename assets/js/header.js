
// =====================================
// JOSJIS SHARED HEADER
// WITH GLOBAL WALLET CONNECTION
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

        <a href="index.html" data-page="index.html">
            Home
        </a>

        <a href="buy-jjs.html" data-page="buy-jjs.html">
            How to Buy
        </a>

        <a href="about.html" data-page="about.html">
            About
        </a>

        <!-- TOKEN DROPDOWN -->
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

        <!-- COMMUNITY DROPDOWN -->
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

    </nav>

    <!-- GLOBAL WALLET -->
    <div class="global-wallet">

        <button
            id="globalWalletBtn"
            class="global-wallet-btn"
            type="button"
        >
            Connect Wallet
        </button>

        <span
            id="globalWalletStatus"
            class="global-wallet-status"
            aria-live="polite"
        >
            Not connected
        </span>

    </div>

</header>
`;


// =====================================
// HEADER STYLE
// =====================================

const headerStyle = document.createElement("style");

headerStyle.textContent = `

    /* DROPDOWN */

    .nav-dropdown .dropdown-menu {
        display: none;
    }

    .nav-dropdown.open .dropdown-menu {
        display: block;
    }

    .dropdown-arrow {
        display: inline-block;
        font-size: 28px;
        margin-left: 5px;
        line-height: 1;
        transition: transform 0.25s ease;
    }

    .nav-dropdown.open .dropdown-arrow {
        transform: rotate(180deg);
    }


    /* GLOBAL WALLET */

    .global-wallet {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
        margin-left: 18px;
        flex-shrink: 0;
    }

    .global-wallet-btn {
        background: linear-gradient(
            135deg,
            #8b5cf6,
            #6d28d9
        );
        color: #ffffff;
        border: 1px solid #a78bfa;
        border-radius: 9px;
        padding: 10px 16px;
        font-size: 13px;
        font-weight: bold;
        cursor: pointer;
        transition: 0.25s ease;
        white-space: nowrap;
    }

    .global-wallet-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 15px rgba(139,92,246,0.3);
    }

    .global-wallet-status {
        color: #a78bfa;
        font-size: 10px;
        text-align: center;
    }

    .global-wallet-btn:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }


    /* MOBILE */

    @media (max-width: 900px) {

        .global-wallet {
            width: 100%;
            margin: 15px 0 5px;
            padding-top: 15px;
            border-top: 1px solid rgba(255,255,255,0.1);
        }

        .global-wallet-btn {
            width: 100%;
            max-width: 260px;
        }

    }

`;

document.head.appendChild(headerStyle);


// =====================================
// INITIALIZE HEADER
// =====================================

document.addEventListener("DOMContentLoaded", () => {

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
                button.setAttribute("aria-expanded", "false");
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

                button.setAttribute("aria-expanded", "true");

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
    // GLOBAL WALLET CONNECTION
    // =====================================

    const walletBtn =
        document.getElementById("globalWalletBtn");

    const walletStatus =
        document.getElementById("globalWalletStatus");


    // UPDATE WALLET DISPLAY

    function updateWalletUI(state) {

        if (!state || !state.isConnected) {

            walletBtn.textContent = "Connect Wallet";

            walletStatus.textContent = "Not connected";

            return;
        }

        const address = state.address;

        walletBtn.textContent = address
            ? address.slice(0, 6) + "..." + address.slice(-4)
            : "Connected";

        walletStatus.textContent =
            state.chainId === 137
                ? "Connected · Polygon"
                : "Connected · Wrong Network";

    }


    // INITIALIZE WALLET

    function initializeWallet() {

        if (!window.JosJisWallet) {
            return;
        }

        updateWalletUI(
            window.JosJisWallet.getState()
        );

    }


    // =====================================
    // WALLET BUTTON CLICK
    // =====================================

    walletBtn.addEventListener("click", async () => {

        if (!window.JosJisWallet) {

            walletStatus.textContent =
                "Wallet manager unavailable";

            console.error(
                "JosJisWallet is not available. Check wallet.js."
            );

            return;
        }

        try {

            walletBtn.disabled = true;

            if (window.JosJisWallet.isConnected()) {

                await window.JosJisWallet.modal.open({
                    view: "Account"
                });

            } else {

                await window.JosJisWallet.connect();

            }

        } catch (error) {

            console.error(
                "Wallet connection error:",
                error
            );

            walletStatus.textContent =
                "Connection failed";

        } finally {

            walletBtn.disabled = false;

        }

    });


    // =====================================
    // WALLET STATE EVENTS
    // =====================================

    window.addEventListener("josjis:wallet", (event) => {

        updateWalletUI(event.detail);

    });


    // =====================================
    // WALLET MANAGER READY EVENT
    // =====================================

    window.addEventListener("josjis:wallet-ready", () => {

        initializeWallet();

    });


    // =====================================
    // INITIAL WALLET CHECK
    // =====================================

    initializeWallet();


    console.log(
        "JosJis Header and Global Wallet initialized."
    );

});
