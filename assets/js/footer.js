
/* ========================================
   JOSJIS SHARED FOOTER
======================================== */

const footerHTML = `
<footer class="site-footer">

    <div class="footer-content">

        <!-- BRAND -->
        <div class="footer-brand">

            <h3>JosJis</h3>

            <p>
                One token. One community.
                Many possibilities.
            </p>

            <p class="footer-description">
                A community-driven token built on Polygon,
                focused on learning, transparency,
                and ecosystem development.
            </p>

        </div>


        <!-- QUICK LINKS -->
        <div class="footer-links">

            <h4>Quick Links</h4>

            <a href="/josjis/">Home</a>
            <a href="/josjis/about.html">About</a>
            <a href="/josjis/buy-jjs.html">How to Buy</a>
            <a href="/josjis/tokenomics.html">Tokenomics</a>
            <a href="/josjis/utility.html">Utility</a>
            <a href="/josjis/roadmap.html">Roadmap</a>

        </div>


        <!-- ECOSYSTEM -->
        <div class="footer-links">

            <h4>Ecosystem</h4>

            <a href="/josjis/ecosystem.html">
                Ecosystem Overview
            </a>

            <a href="/josjis/liquidity/">
                Liquidity Center
            </a>

            <a href="/josjis/dashboard.html">
                Dashboard
            </a>

            <a href="/josjis/member.html">
                Member Area
            </a>

            <a href="/josjis/crypto-donations.html">
                Crypto Donations
            </a>

        </div>


        <!-- COMMUNITY -->
        <div class="footer-social">

            <h4>Community</h4>

            <a
                href="https://x.com/JosJisToken"
                target="_blank"
                rel="noopener noreferrer">
                X (Twitter)
            </a>

            <a
                href="https://t.me/josjis_token"
                target="_blank"
                rel="noopener noreferrer">
                Telegram
            </a>

            <a
                href="https://www.tiktok.com/@josjistoken"
                target="_blank"
                rel="noopener noreferrer">
                TikTok
            </a>

            <a href="/josjis/contact.html">
                Contact
            </a>

        </div>

    </div>


    <!-- OFFICIAL CONTRACT -->
    <div class="footer-contract">

        <h4>Official JJS Contract</h4>

        <p>
            Network: Polygon
        </p>

        <div class="contract-address">

            <a
                href="https://polygonscan.com/token/0x52C8Ff13ada1431376b3E77E8219b644805122dF"
                target="_blank"
                rel="noopener noreferrer">

                0x52C8Ff13ada1431376b3E77E8219b644805122dF

            </a>

            <button
                type="button"
                id="copy-footer-contract">

                Copy

            </button>

        </div>

        <p class="footer-contract-note">
            Always verify the official contract address
            before interacting with JJS.
        </p>

    </div>


    <!-- FOOTER BOTTOM -->
    <div class="footer-bottom">

        <p>
            &copy; ${new Date().getFullYear()} JosJis.
            All rights reserved.
        </p>

        <p>
            Built for the community.
        </p>

    </div>

</footer>
`;


/* ========================================
   INSERT FOOTER
======================================== */

document.addEventListener("DOMContentLoaded", () => {

    document.body.insertAdjacentHTML(
        "beforeend",
        footerHTML
    );


    /* ====================================
       COPY CONTRACT ADDRESS
    ==================================== */

    const copyButton = document.getElementById(
        "copy-footer-contract"
    );

    const contractAddress =
        "0x52C8Ff13ada1431376b3E77E8219b644805122dF";

    if (copyButton) {

        copyButton.addEventListener("click", async () => {

            try {

                await navigator.clipboard.writeText(
                    contractAddress
                );

                copyButton.textContent = "Copied!";

                setTimeout(() => {
                    copyButton.textContent = "Copy";
                }, 2000);

            } catch (error) {

                copyButton.textContent = "Copy failed";

                console.error(
                    "Failed to copy contract address:",
                    error
                );

            }

        });

    }

});
