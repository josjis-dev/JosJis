
// JOSJIS SHARED HEADER

const headerHTML = `
<header class="site-header">

    <a href="/josjis/index.html" class="logo">
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

        <a href="/josjis/index.html" data-page="index.html">Home</a>

        <a href="/josjis/buy-jjs.html" data-page="buy-jjs.html">
            How to Buy
        </a>

        <a href="/josjis/about.html" data-page="about.html">About</a>

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

                <a href="/josjis/tokenomics.html"
                   data-page="tokenomics.html">
                    Tokenomics
                </a>

                <a href="/josjis/utility.html"
                   data-page="utility.html">
                    Utility
                </a>

            </div>

        </div>

        <!-- ECOSYSTEM DROPDOWN -->
        <div class="nav-dropdown">

            <button
                class="dropdown-toggle"
                type="button"
                aria-expanded="false"
                aria-controls="ecosystemSubmenu"
            >
                Ecosystem
                <span class="dropdown-arrow">▾</span>
            </button>

            <div class="dropdown-menu" id="ecosystemSubmenu">

                <a href="/josjis/ecosystem.html"
                   data-page="ecosystem.html">
                    Ecosystem Overview
                </a>

                <a href="/josjis/liquidity/"
                   data-page="index.html">
                    Liquidity Center
                </a>

                <a href="/josjis/community-lp.html"
                   data-page="community-lp.html">
                    Community LP
                </a>

                <a href="/josjis/community-builders.html"
                   data-page="community-builders.html">
                    Community Builders
                </a>

            </div>

        </div>

        <a href="/josjis/dashboard.html" data-page="dashboard.html">
            Dashboard
        </a>

        <!-- JOSJIS TXCARD -->
        <a href="/josjis/txcard.html" data-page="txcard.html">
            TxCard
        </a>

        <!-- MEMBER AREA -->
        <a href="/josjis/member.html" data-page="member.html">
            Member Area
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

                <a href="/josjis/crypto-donations.html"
                   data-page="crypto-donations.html">
                    Donate
                </a>

                <a href="/josjis/roadmap.html"
                   data-page="roadmap.html">
                    Roadmap
                </a>

                <a href="/josjis/contact.html"
                   data-page="contact.html">
                    Contact
                </a>

            </div>

        </div>

    </nav>

</header>
`;


// =====================================
// DROPDOWN STYLE
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
        font-size: 20px;
        margin-left: 5px;
        line-height: 1;
        transition: transform 0.25s ease;
    }

    .nav-dropdown.open .dropdown-arrow {
        transform: rotate(180deg);
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

});
