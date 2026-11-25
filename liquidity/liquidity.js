
/* ========================================
   JOSJIS LIQUIDITY CENTER
   Centralized Polygon RPC - Uniswap V4
   Automatic Pool ID Verification
   Reserve Audit Diagnostics
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
    // 5. POOL ID VERIFICATION
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
    // 6. COPY POOL ID
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
    // 7. FORMAT NUMBERS
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
    // 8. RESERVES LENS ABI
    // ====================================

    const lensABI = [

        "function getPoolTVL(address poolManager, (address currency0,address currency1,uint24 fee,int24 tickSpacing,address hooks) key) view returns ((uint256 coreAmount0,uint256 coreAmount1,uint256 hookReserves0,uint256 hookReserves1,uint256 hookEffective0,uint256 hookEffective1,uint160 sqrtPriceX96,int24 tick,uint128 activeLiquidity,uint256 blockNumber,address statsProvider,uint16 hookPermissions,bool hasCustomAccounting,uint8 statsStatus))"

    ];


    // ====================================
    // 9. FETCH POOL DATA
    // ====================================

    async function fetchPoolData() {

        if (isLoading) return;

        isLoading = true;

        try {

            setStatus(
                "Verifying Uniswap V4 Pool ID..."
            );


            // ====================================
            // 10. VERIFY POOL ID
            // ====================================

            const verifiedPoolId =
                verifyPoolId();


            // ====================================
            // 11. CENTRALIZED RPC REQUEST
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
            // 12. READ CORE RESERVES
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
            // 13. CALCULATE CURRENT PRICE
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
            // 14. CALCULATE TOTAL LIQUIDITY
            // ====================================

            const jjsValueUSD =
                jjsAmount * jjsPriceUSDT;

            const totalLiquidity =
                jjsValueUSD + usdtAmount;


            // ====================================
            // 15. DISPLAY JJS RESERVE
            // ====================================

            if (ELEMENTS.jjsReserve) {

                ELEMENTS.jjsReserve.textContent =
                    formatNumber(jjsAmount) + " JJS";

            }


            // ====================================
            // 16. DISPLAY USDT RESERVE
            // ====================================

            if (ELEMENTS.usdtReserve) {

                ELEMENTS.usdtReserve.textContent =
                    formatNumber(usdtAmount) + " USDT0";

            }


            // ====================================
            // 17. DISPLAY TOTAL LIQUIDITY
            // ====================================

            if (ELEMENTS.totalLiquidity) {

                ELEMENTS.totalLiquidity.textContent =
                    formatUSD(totalLiquidity);

            }


            // ====================================
            // 18. VOLUME 24H
            // ====================================

            if (ELEMENTS.volume24h) {

                ELEMENTS.volume24h.textContent = "—";

            }


            // ====================================
            // 19. UPDATE STATUS
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
            // 20. RESERVE AUDIT DATA
            // ====================================

            const reserveAudit = {

                verifiedPoolId,

                blockNumber,

                coreAmount0:
                    formatUnits(
                        result.coreAmount0,
                        JJS_DECIMALS
                    ),

                coreAmount1:
                    formatUnits(
                        result.coreAmount1,
                        USDT_DECIMALS
                    ),

                hookReserves0:
                    formatUnits(
                        result.hookReserves0,
                        JJS_DECIMALS
                    ),

                hookReserves1:
                    formatUnits(
                        result.hookReserves1,
                        USDT_DECIMALS
                    ),

                hookEffective0:
                    formatUnits(
                        result.hookEffective0,
                        JJS_DECIMALS
                    ),

                hookEffective1:
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

                jjsReserve: jjsAmount,

                usdtReserve: usdtAmount,

                jjsPriceUSDT,

                totalLiquidityUSD: totalLiquidity

            };


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

        } finally {

            isLoading = false;

        }

    }


    // ====================================
    // 21. INITIALIZE
    // ====================================

    await fetchPoolData();


    // ====================================
    // 22. AUTO REFRESH EVERY 60 SECONDS
    // ====================================

    setInterval(

        fetchPoolData,

        CONFIG.refreshInterval

    );

});
