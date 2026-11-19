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
        <a href="tokenomics.html" data-page="tokenomics.html">Tokenomics</a>
        <a href="ecosystem.html" data-page="ecosystem.html">Ecosystem</a>
        <a href="utility.html" data-page="utility.html">Utility</a>
        <a href="dashboard.html" data-page="dashboard.html">Dashboard</a>
        <a href="crypto-donations.html" data-page="crypto-donations.html">Donate</a>
        <a href="roadmap.html" data-page="roadmap.html">Roadmap</a>
        <a href="contact.html" data-page="contact.html">Contact</a>

    </nav>

</header>
`;

document.addEventListener("DOMContentLoaded", () => {

    document.body.insertAdjacentHTML("afterbegin", headerHTML);

    const currentPage =
        window.location.pathname.split("/").pop() || "index.html";

    document.querySelectorAll(".main-nav a").forEach(link => {

        if (link.dataset.page === currentPage) {
            link.classList.add("active");
            link.setAttribute("aria-current", "page");
        }

    });

    const menuToggle = document.getElementById("menuToggle");
    const mainNav = document.getElementById("mainNav");

    menuToggle.addEventListener("click", () => {

        const isOpen = mainNav.classList.toggle("open");

        menuToggle.classList.toggle("active", isOpen);
        menuToggle.setAttribute("aria-expanded", isOpen);

    });

    mainNav.querySelectorAll("a").forEach(link => {

        link.addEventListener("click", () => {

            mainNav.classList.remove("open");
            menuToggle.classList.remove("active");
            menuToggle.setAttribute("aria-expanded", "false");

        });

    });

});
