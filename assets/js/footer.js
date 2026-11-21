// JOSJIS SHARED FOOTER

const footerHTML = `
<footer class="site-footer">

    <div class="footer-content">

        <div class="footer-brand">
            <h3>JosJis</h3>
            <p>
                One token. One community. Many possibilities.
            </p>
        </div>

        <div class="footer-links">
            <h4>Quick Links</h4>

            <a href="about.html">About</a>
            <a href="tokenomics.html">Tokenomics</a>
            <a href="dashboard.html">Dashboard</a>
            <a href="crypto-donations.html">Donate</a>
        </div>

        <div class="footer-social">
            <h4>Community</h4>

            <a href="https://x.com/JosJisToken"
               target="_blank"
               rel="noopener noreferrer">X (Twitter)</a>

            <a href="https://t.me/josjis_token"
               target="_blank"
               rel="noopener noreferrer">Telegram</a>

            <a href="https://www.tiktok.com/@josjistoken"
               target="_blank"
               rel="noopener noreferrer">TikTok</a>
        </div>

    </div>

    <div class="footer-bottom">

        <p>
            Official Contract:
            <a
                href="https://polygonscan.com/token/0x52C8Ff13ada1431376b3E77E8219b644805122dF"
                target="_blank"
                rel="noopener noreferrer">
                0x52C8Ff13...805122dF
            </a>
        </p>

        <p>
            &copy; ${new Date().getFullYear()} JosJis.
            All rights reserved.
        </p>

    </div>

</footer>
`;

document.addEventListener("DOMContentLoaded", () => {

    document.body.insertAdjacentHTML(
        "beforeend",
        footerHTML
    );

});
