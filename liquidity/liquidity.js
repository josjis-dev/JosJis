
/* ========================================
   JOSJIS LIQUIDITY CENTER
   JavaScript
======================================== */

document.addEventListener("DOMContentLoaded", () => {

    // ====================================
    // 1. AUTOMATIC FOOTER YEAR
    // ====================================

    const yearElement = document.getElementById("year");

    if (yearElement) {
        yearElement.textContent = new Date().getFullYear();
    }


    // ====================================
    // 2. COPY POOL ID
    // ====================================

    const copyButton = document.getElementById("copyPoolId");
    const poolIdElement = document.getElementById("poolId");

    if (copyButton && poolIdElement) {

        const originalText = copyButton.textContent;

        copyButton.addEventListener("click", async () => {

            const poolId = poolIdElement.textContent.trim();

            if (!poolId) {
                copyButton.textContent = "Pool ID Missing";
                return;
            }

            try {

                await navigator.clipboard.writeText(poolId);

                copyButton.textContent = "Copied!";

                copyButton.disabled = true;

                setTimeout(() => {
                    copyButton.textContent = originalText;
                    copyButton.disabled = false;
                }, 2000);

            } catch (error) {

                // Fallback for browsers without Clipboard API
                try {

                    const textarea = document.createElement("textarea");

                    textarea.value = poolId;
                    textarea.style.position = "fixed";
                    textarea.style.opacity = "0";

                    document.body.appendChild(textarea);

                    textarea.select();

                    const successful = document.execCommand("copy");

                    document.body.removeChild(textarea);

                    if (successful) {
                        copyButton.textContent = "Copied!";
                    } else {
                        copyButton.textContent = "Copy Failed";
                    }

                } catch (fallbackError) {

                    copyButton.textContent = "Copy Failed";

                }

                setTimeout(() => {
                    copyButton.textContent = originalText;
                }, 2000);

            }

        });

    }


    // ====================================
    // 3. POOL STATISTICS PLACEHOLDERS
    // ====================================

    const statistics = [
        "totalLiquidity",
        "volume24h",
        "jjsReserve",
        "usdtReserve"
    ];

    statistics.forEach((id) => {

        const element = document.getElementById(id);

        if (element && !element.textContent.trim()) {
            element.textContent = "—";
        }

    });


    // ====================================
    // 4. DATA STATUS
    // ====================================

    const updateInfo = document.getElementById("lastUpdated");

    if (updateInfo) {
        updateInfo.textContent =
            "Pool data integration is pending.";
    }

});
