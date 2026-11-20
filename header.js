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

</header>
`;

document.addEventListener("DOMContentLoaded", () => {

    document.body.insertAdjacentHTML("afterbegin", headerHTML);

    const currentPage =
        window.location.pathname.split("/").pop() || "index.html";

    const navLinks = document.querySelectorAll(".main-nav a");

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

    const menuToggle = document.getElementById("menuToggle");
    const mainNav = document.getElementById("mainNav");

    // MOBILE MAIN MENU
    menuToggle.addEventListener("click", () => {

        const isOpen = mainNav.classList.toggle("open");

        menuToggle.classList.toggle("active", isOpen);
        menuToggle.setAttribute("aria-expanded", isOpen);

    });

    // DROPDOWN MENUS
    document.querySelectorAll(".dropdown-toggle").forEach(button => {

        button.addEventListener("click", () => {

            const dropdown = button.closest(".nav-dropdown");
            const isOpen = dropdown.classList.toggle("open");

            button.setAttribute("aria-expanded", isOpen);

        });

    });

    // CLOSE MENUS AFTER NAVIGATION
    navLinks.forEach(link => {

        link.addEventListener("click", () => {

            mainNav.classList.remove("open");
            menuToggle.classList.remove("active");
            menuToggle.setAttribute("aria-expanded", "false");

            document.querySelectorAll(".nav-dropdown").forEach(dropdown => {

                dropdown.classList.remove("open");

                const button = dropdown.querySelector(".dropdown-toggle");

                if (button) {
                    button.setAttribute("aria-expanded", "false");
                }

            });

        });

    });

});
