
// JOSJIS SHARED HEADER

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
            Checking wallet...
        </span>

    </div>

</header>
`;


// =====================================
// HEADER STYLE
// =====================================

const arrowStyle = document.createElement("style");

arrowStyle.textContent = `

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
        align-items: center;
        gap: 8px;
        margin-left: 12px;
    }

    .global-wallet-btn {
        padding: 10px 14px;
        border: 0;
        border-radius: 8px;
        background: #e6a800;
        color: #111;
        font-weight: 700;
        cursor: pointer;
        white-space: nowrap;
    }

    .global-wallet-btn:disabled {
        opacity: 0.6;
        cursor: wait;
    }

    .global-wallet-status {
        font-size: 12px;
        opacity: 0.8;
        overflow-wrap: anywhere;
    }

    @media (max-width: 768px) {

        .global-wallet {
            width: 100%;
            margin: 12px 0;
            flex-direction: column;
            align-items: flex-start;
        }

    }

`;

document.head.appendChild(arrowStyle);


// =====================================
// INITIALIZE HEADER
// =====================================

document.addEventListener("DOMContentLoaded", () => {

    document.body.insertAdjacentHTML("afterbegin", headerHTML);

    const currentPage =
        window.location.pathname.split("/").pop() || "index.html";

    const navLinks = document.querySelectorAll(".main-nav a");

    const menuToggle = document.getElementById("menuToggle");
    const mainNav = document.getElementById("mainNav");

    // =====================================
    // ACTIVE PAGE
    // =====================================

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
    // GLOBAL WALLET
    // =====================================

    const walletBtn =
        document.getElementById("globalWalletBtn");

    const walletStatus =
        document.getElementById("globalWalletStatus");


    function updateWalletUI(state) {

        if (!state || !state.isConnected || !state.address) {

            walletBtn.textContent = "Connect Wallet";
            walletStatus.textContent = "Not connected";

            return;
        }

        const address = state.address;

        walletBtn.textContent =
            address.slice(0, 6) + "..." + address.slice(-4);

        walletStatus.textContent =
            state.chainId === 137
                ? "Polygon Connected"
                : "Wrong Network";
    }


    // Initial wallet state

    function checkWallet() {

        if (window.JosJisWallet) {

            updateWalletUI(
                window.JosJisWallet.getState()
            );

        } else {

            walletStatus.textContent =
                "Wallet manager unavailable";

        }

    }

    checkWallet();


    // Listen to wallet changes

    window.addEventListener("josjis:wallet", event => {

        updateWalletUI(event.detail);

    });


    // Connect button

    walletBtn.addEventListener("click", async () => {

        try {

            if (!window.JosJisWallet) {

                throw new Error(
                    "Wallet manager is not loaded."
                );

            }

            if (window.JosJisWallet.isConnected()) {

                checkWallet();
                return;

            }

            walletBtn.disabled = true;
            walletBtn.textContent = "Connecting...";

            await window.JosJisWallet.connect();

            checkWallet();

        } catch (error) {

            console.error("Global wallet error:", error);

            walletStatus.textContent =
                "Connection failed";

        } finally {

            walletBtn.disabled = false;

        }

    });

});
