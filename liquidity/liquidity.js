
/* ========================================
   JOSJIS LIQUIDITY CENTER
   Centralized Polygon RPC - Uniswap V4
   Automatic Pool ID Verification
   Visible Reserve Audit Diagnostics
   No DexPaprika API key required
======================================== */

import {
    Contract,
    formatUnits,
    AbiCoder,
    keccak256
} from "https://esm.sh/ethers@6.15.0";

import {
    rpcRequest
} from "../assets/js/core/rpc-manager.js";


document.addEventListener("DOMContentLoaded", async () => {

    // ====================================
    // 1. CONFIGURATION
    // ====================================

    const CONFIG = {

        poolManager:
            "0x67366782805870060151383f4bbff9dab53e5cd6",

        reservesLens:
            "0x0000001b173C3bbF3984D417d8614E3eed34865B",

        expectedPoolId:
            "0x7bbe48850b54f72c3356f62ef1f2f9edde13d317649c46d6aa94a45c4b89a6aa",

        refreshInterval: 60000,

        poolKey: {

            currency0:
                "0x52C8Ff13ada1431376b3E77E8219b644805122dF",

            currency1:
                "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",

            fee: 2500,
            tickSpacing: 25,

            hooks:
                "0x0000000000000000000000000000000000000000"
        }
    };


    // ====================================
    // 2. HTML ELEMENTS
    // ====================================

    const ELEMENTS = {

        year: document.getElementById("year"),

        copyButton:
            document.getElementById("copyPoolId"),

        poolId:
            document.getElementById("poolId"),

        totalLiquidity:
            document.getElementById("totalLiquidity"),

        volume24h:
            document.getElementById("volume24h"),

        jjsReserve:
            document.getElementById("jjsReserve"),

        usdtReserve:
            document.getElementById("usdtReserve"),

        lastUpdated:
            document.getElementById("lastUpdated")
    };


    // ====================================
    // 3. CONSTANTS
    // ====================================

    const JJS_DECIMALS = 18;
    const USDT_DECIMALS = 6;

    const Q96 = 2n ** 96n;

    let isLoading = false;


    // ====================================
    // 4. FOOTER YEAR
    // ====================================

    if (ELEMENTS.year) {

        ELEMENTS.year.textContent =
            new Date().getFullYear();

    }


    // ====================================
    // 5. CREATE VISIBLE RESERVE AUDIT
    // ====================================

    const auditPanel = document.createElement("section");

    auditPanel.id = "josjisReserveAudit";

    auditPanel.style.cssText = `
        margin: 24px 0;
        padding: 18px;
        background: #111827;
        color: #e5e7eb;
        border: 1px solid #374151;
        border-radius: 12px;
        width: 100%;
        box-sizing: border-box;
        overflow: hidden;
    `;

    const auditTitle = document.createElement("h3");

    auditTitle.textContent = "JOSJIS RESERVE AUDIT";

    auditTitle.style.cssText = `
        margin: 0 0 8px;
        font-size: 17px;
        color: #facc15;
    `;

    const auditDescription = document.createElement("p");

    auditDescription.textContent =
        "Detailed on-chain reserve diagnostics. Values are read-only.";

    auditDescription.style.cssText = `
        margin: 0 0 14px;
        font-size: 12px;
        color: #9ca3af;
    `;

    const auditContent = document.createElement("pre");

    auditContent.id = "josjisAuditContent";

    auditContent.textContent =
        "Waiting for blockchain data...";

    auditContent.style.cssText = `
        margin: 0;
        padding: 14px;
        background: #030712;
        border-radius: 8px;
        color: #d1d5db;
        font-size: 12px;
        line-height: 1.7;
        white-space: pre-wrap;
        overflow-wrap: anywhere;
        word-break: break-word;
        font-family: monospace;
        overflow-x: auto;
    `;

    auditPanel.appendChild(auditTitle);
    auditPanel.appendChild(auditDescription);
    auditPanel.appendChild(auditContent);

    if (ELEMENTS.lastUpdated?.parentElement) {

        ELEMENTS.lastUpdated.parentElement.insertAdjacentElement(
            "afterend",
            auditPanel
        );

    } else {

        document.body.appendChild(auditPanel);

    }


    // ====================================
    // 6. UPDATE AUDIT PANEL
    // ====================================

    function displayReserveAudit(data) {

        auditContent.textContent =
            Object.entries(data)

                .map(([key, value]) => {

                    return key + ": " + String(value);

                })

                .join("\n");

    }


    // ====================================
    // 7. POOL ID VERIFICATION
    // ====================================

    function verifyPoolId() {

        const encodedPoolKey =
            AbiCoder.defaultAbiCoder().encode(

                [
                    "address",
                    "address",
                    "uint24",
                    "int24",
                    "address"
                ],

                [
                    CONFIG.poolKey.currency0,
                    CONFIG.poolKey.currency1,
                    CONFIG.poolKey.fee,
                    CONFIG.poolKey.tickSpacing,
                    CONFIG.poolKey.hooks
                ]

            );


        const calculatedPoolId =
            keccak256(encodedPoolKey);


        const isMatch =
            calculatedPoolId.toLowerCase() ===
            CONFIG.expectedPoolId.toLowerCase();


        console.log("JOSJIS POOL ID VERIFICATION", {

            expectedPoolId:
                CONFIG.expectedPoolId,

            calculatedPoolId,

            isMatch

        });


        if (!isMatch) {

            throw new Error(

                "Pool ID mismatch! Expected: " +
                CONFIG.expectedPoolId +
                " | Calculated: " +
                calculatedPoolId

            );

        }


        return calculatedPoolId;

    }


    // ====================================
    // 8. COPY POOL ID
    // ====================================

    if (ELEMENTS.copyButton && ELEMENTS.poolId) {

        const originalText =
            ELEMENTS.copyButton.textContent;

        ELEMENTS.copyButton.addEventListener(
            "click",
            async () => {

                const poolId =
                    ELEMENTS.poolId.textContent.trim();

                try {

                    if (navigator.clipboard?.writeText) {

                        await navigator.clipboard.writeText(
                            poolId
                        );

                    } else {

                        throw new Error(
                            "Clipboard API unavailable"
                        );

                    }

                    ELEMENTS.copyButton.textContent =
                        "Copied!";

                } catch (error) {

                    const textarea =
                        document.createElement("textarea");

                    textarea.value = poolId;

                    textarea.style.position = "fixed";
                    textarea.style.opacity = "0";

                    document.body.appendChild(textarea);

                    textarea.select();

                    const copied =
                        document.execCommand("copy");

                    document.body.removeChild(textarea);

                    ELEMENTS.copyButton.textContent =
                        copied ? "Copied!" : "Copy Failed";

                }

                setTimeout(() => {

                    ELEMENTS.copyButton.textContent =
                        originalText;

                }, 2000);

            }
        );

    }


    // ====================================
    // 9. FORMAT NUMBERS
    // ====================================

    function formatNumber(value, decimals = 4) {

        if (!Number.isFinite(value)) {
            return "—";
        }

        return new Intl.NumberFormat("en-US", {

            maximumFractionDigits: decimals

        }).format(value);

    }


    function formatUSD(value) {

        if (!Number.isFinite(value)) {
            return "—";
        }

        return "$" + new Intl.NumberFormat("en-US", {

            minimumFractionDigits: 2,
            maximumFractionDigits: 2

        }).format(value);

    }


    function setStatus(message) {

        if (ELEMENTS.lastUpdated) {

            ELEMENTS.lastUpdated.textContent = message;

        }

    }


    // ====================================
    // 10. RESERVES LENS ABI
    // ====================================

    const lensABI = [

        "function getPoolTVL(address poolManager, (address currency0,address currency1,uint24 fee,int24 tickSpacing,address hooks) key) view returns ((uint256 coreAmount0,uint256 coreAmount1,uint256 hookReserves0,uint256 hookReserves1,uint256 hookEffective0,uint256 hookEffective1,uint160 sqrtPriceX96,int24 tick,uint128 activeLiquidity,uint256 blockNumber,address statsProvider,uint16 hookPermissions,bool hasCustomAccounting,uint8 statsStatus))"

    ];


    // ====================================
    // 11. FETCH POOL DATA
    // ====================================

    async function fetchPoolData() {

        if (isLoading) return;

        isLoading = true;

        try {

            setStatus(
                "Verifying Uniswap V4 Pool ID..."
            );


            auditContent.textContent =
                "Fetching on-chain reserve data...";


            // ====================================
            // 12. VERIFY POOL ID
            // ====================================

            const verifiedPoolId =
                verifyPoolId();


            // ====================================
            // 13. CENTRALIZED RPC REQUEST
            // ====================================

            setStatus(
                "Pool ID verified. Connecting to Polygon..."
            );


            const result = await rpcRequest(
                async (provider) => {

                    const network =
                        await provider.getNetwork();

                    if (Number(network.chainId) !== 137) {

                        throw new Error(
                            "Wrong network. Polygon required."
                        );

                    }


                    const lens = new Contract(

                        CONFIG.reservesLens,

                        lensABI,

                        provider

                    );


                    return await lens[
                        "getPoolTVL(address,(address,address,uint24,int24,address))"
                    ](

                        CONFIG.poolManager,

                        CONFIG.poolKey

                    );

                }
            );


            // ====================================
            // 14. READ CORE RESERVES
            // ====================================

            const rawJJS =
                result.coreAmount0;

            const rawUSDT =
                result.coreAmount1;


            const jjsAmount = Number(

                formatUnits(
                    rawJJS,
                    JJS_DECIMALS
                )

            );


            const usdtAmount = Number(

                formatUnits(
                    rawUSDT,
                    USDT_DECIMALS
                )

            );


            // ====================================
            // 15. CALCULATE CURRENT PRICE
            // ====================================

            const sqrtPriceX96 =
                result.sqrtPriceX96;

            const sqrtRatio =
                Number(sqrtPriceX96) / Number(Q96);

            const priceRaw =
                sqrtRatio * sqrtRatio;


            const jjsPriceUSDT =
                priceRaw * Math.pow(
                    10,
                    JJS_DECIMALS - USDT_DECIMALS
                );


            // ====================================
            // 16. CALCULATE TOTAL LIQUIDITY
            // ====================================

            const jjsValueUSD =
                jjsAmount * jjsPriceUSDT;

            const totalLiquidity =
                jjsValueUSD + usdtAmount;


            // ====================================
            // 17. DISPLAY JJS RESERVE
            // ====================================

            if (ELEMENTS.jjsReserve) {

                ELEMENTS.jjsReserve.textContent =
                    formatNumber(jjsAmount) + " JJS";

            }


            // ====================================
            // 18. DISPLAY USDT RESERVE
            // ====================================

            if (ELEMENTS.usdtReserve) {

                ELEMENTS.usdtReserve.textContent =
                    formatNumber(usdtAmount) + " USDT0";

            }


            // ====================================
            // 19. DISPLAY TOTAL LIQUIDITY
            // ====================================

            if (ELEMENTS.totalLiquidity) {

                ELEMENTS.totalLiquidity.textContent =
                    formatUSD(totalLiquidity);

            }


            // ====================================
            // 20. VOLUME 24H
            // ====================================

            if (ELEMENTS.volume24h) {

                ELEMENTS.volume24h.textContent = "—";

            }


            // ====================================
            // 21. UPDATE STATUS
            // ====================================

            const blockNumber =
                result.blockNumber.toString();

            const approximate =
                result.hasCustomAccounting;

            setStatus(

                "On-chain data updated: " +

                new Date().toLocaleTimeString() +

                " | Block: " + blockNumber +

                " | Pool ID verified" +

                (
                    approximate
                        ? " | Custom accounting: inspect reserve audit"
                        : ""
                ) +

                " | 24H volume unavailable via RPC-only mode."

            );


            // ====================================
            // 22. VISIBLE RESERVE AUDIT
            // ====================================

            const reserveAudit = {

                verifiedPoolId,

                blockNumber,

                coreAmount0_JJS:
                    formatUnits(
                        result.coreAmount0,
                        JJS_DECIMALS
                    ),

                coreAmount1_USDT0:
                    formatUnits(
                        result.coreAmount1,
                        USDT_DECIMALS
                    ),

                hookReserves0_JJS:
                    formatUnits(
                        result.hookReserves0,
                        JJS_DECIMALS
                    ),

                hookReserves1_USDT0:
                    formatUnits(
                        result.hookReserves1,
                        USDT_DECIMALS
                    ),

                hookEffective0_JJS:
                    formatUnits(
                        result.hookEffective0,
                        JJS_DECIMALS
                    ),

                hookEffective1_USDT0:
                    formatUnits(
                        result.hookEffective1,
                        USDT_DECIMALS
                    ),

                hasCustomAccounting:
                    result.hasCustomAccounting,

                hookPermissions:
                    result.hookPermissions.toString(),

                statsProvider:
                    result.statsProvider,

                statsStatus:
                    result.statsStatus.toString(),

                sqrtPriceX96:
                    sqrtPriceX96.toString(),

                tick:
                    result.tick.toString(),

                activeLiquidity:
                    result.activeLiquidity.toString(),

                jjsReserve:
                    jjsAmount,

                usdtReserve:
                    usdtAmount,

                jjsPriceUSDT:
                    jjsPriceUSDT,

                totalLiquidityUSD:
                    totalLiquidity

            };


            displayReserveAudit(reserveAudit);


            console.log(
                "JOSJIS RESERVE AUDIT",
                reserveAudit
            );


            console.log("JOSJIS POOL DATA", {

                verifiedPoolId,

                blockNumber,

                jjsReserve: jjsAmount,

                usdtReserve: usdtAmount,

                jjsPriceUSDT,

                totalLiquidityUSD: totalLiquidity,

                hasCustomAccounting: approximate

            });


        } catch (error) {

            console.error(
                "JOSJIS LIQUIDITY ERROR:",
                error
            );

            setStatus(

                "Blockchain data unavailable: " +

                (
                    error.shortMessage ||
                    error.message ||
                    "Unknown error"
                )

            );

            auditContent.textContent =
                "AUDIT ERROR\n\n" +
                (
                    error.shortMessage ||
                    error.message ||
                    "Unknown error"
                );

        } finally {

            isLoading = false;

        }

    }


    // ====================================
    // 23. INITIALIZE
    // ====================================

    await fetchPoolData();


    // ====================================
    // 24. AUTO REFRESH EVERY 60 SECONDS
    // ====================================

    setInterval(

        fetchPoolData,

        CONFIG.refreshInterval

    );

});
