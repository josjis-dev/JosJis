
/* ========================================
   JOSJIS LIQUIDITY CENTER
   Centralized Polygon RPC - Uniswap V4
   No DexPaprika API key required
======================================== */

import {
    Contract,
    formatUnits
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
    // 2. CONSTANTS
    // ====================================

    const JJS_DECIMALS = 18;
    const USDT_DECIMALS = 6;

    let isLoading = false;


    // ====================================
    // 3. FOOTER YEAR
    // ====================================

    if (ELEMENTS.year) {

        ELEMENTS.year.textContent =
            new Date().getFullYear();

    }


    // ====================================
    // 4. COPY POOL ID
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

                    await navigator.clipboard.writeText(
                        poolId
                    );

                    ELEMENTS.copyButton.textContent =
                        "Copied!";

                } catch (error) {

                    const textarea =
                        document.createElement("textarea");

                    textarea.value = poolId;

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
    // 5. FORMAT NUMBERS
    // ====================================

    function formatNumber(value, decimals = 4) {

        return new Intl.NumberFormat("en-US", {

            maximumFractionDigits: decimals

        }).format(value);

    }


    function formatUSD(value) {

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
    // 6. RESERVES LENS ABI
    // ====================================

    const lensABI = [

        "function getPoolTVL(address poolManager, (address currency0,address currency1,uint24 fee,int24 tickSpacing,address hooks) key) view returns ((uint256 coreAmount0,uint256 coreAmount1,uint256 hookReserves0,uint256 hookReserves1,uint256 hookEffective0,uint256 hookEffective1,uint160 sqrtPriceX96,int24 tick,uint128 activeLiquidity,uint256 blockNumber,address statsProvider,uint16 hookPermissions,bool hasCustomAccounting,uint8 statsStatus))"

    ];


    // ====================================
    // 7. FETCH POOL DATA
    // ====================================

    async function fetchPoolData() {

        if (isLoading) return;

        isLoading = true;

        try {

            setStatus(
                "Connecting to Polygon through RPC Manager..."
            );


            // ====================================
            // 8. CENTRALIZED RPC REQUEST
            // ====================================

            const result = await rpcRequest(
                async (provider) => {

                    // Verify Polygon network

                    const network =
                        await provider.getNetwork();

                    if (Number(network.chainId) !== 137) {

                        throw new Error(
                            "Wrong network. Polygon required."
                        );

                    }


                    // Create Lens contract

                    const lens = new Contract(

                        CONFIG.reservesLens,

                        lensABI,

                        provider

                    );


                    // Read pool data

                    return await lens[
                        "getPoolTVL(address,(address,address,uint24,int24,address))"
                    ](

                        CONFIG.poolManager,

                        CONFIG.poolKey

                    );

                }
            );


            // ====================================
            // 9. READ RAW RESERVES
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
            // 10. READ CURRENT PRICE
            // ====================================

            const sqrtPriceX96 =
                result.sqrtPriceX96;

            const Q96 = 2n ** 96n;

            const priceRaw =

                Number(sqrtPriceX96) ** 2 /
                Number(Q96 ** 2n);


            // Token0 = JJS (18 decimals)
            // Token1 = USDT0 (6 decimals)

            const jjsPriceUSDT =

                priceRaw * Math.pow(
                    10,
                    JJS_DECIMALS - USDT_DECIMALS
                );


            // ====================================
            // 11. CALCULATE TOTAL LIQUIDITY
            // ====================================

            const jjsValueUSD =

                jjsAmount * jjsPriceUSDT;


            const totalLiquidity =

                jjsValueUSD + usdtAmount;


            // ====================================
            // 12. DISPLAY RESERVES
            // ====================================

            if (ELEMENTS.jjsReserve) {

                ELEMENTS.jjsReserve.textContent =

                    formatNumber(jjsAmount) + " JJS";

            }


            if (ELEMENTS.usdtReserve) {

                ELEMENTS.usdtReserve.textContent =

                    formatNumber(usdtAmount) + " USDT0";

            }


            // ====================================
            // 13. DISPLAY TOTAL LIQUIDITY
            // ====================================

            if (ELEMENTS.totalLiquidity) {

                ELEMENTS.totalLiquidity.textContent =

                    formatUSD(totalLiquidity);

            }


            // ====================================
            // 14. VOLUME 24H
            // ====================================

            if (ELEMENTS.volume24h) {

                ELEMENTS.volume24h.textContent = "—";

            }


            // ====================================
            // 15. UPDATE STATUS
            // ====================================

            const blockNumber =

                result.blockNumber.toString();


            const approximate =

                result.hasCustomAccounting;


            setStatus(

                "On-chain data updated: " +

                new Date().toLocaleTimeString() +

                " | Block: " + blockNumber +

                (approximate
                    ? " | Custom accounting: approximate reserves"
                    : "") +

                " | 24H volume unavailable via RPC-only mode."

            );


            // ====================================
            // 16. DEBUG INFORMATION
            // ====================================

            console.log("JOSJIS POOL DATA", {

                blockNumber,

                jjsReserve: jjsAmount,

                usdtReserve: usdtAmount,

                jjsPriceUSDT,

                totalLiquidityUSD: totalLiquidity,

                sqrtPriceX96:
                    sqrtPriceX96.toString(),

                tick: result.tick,

                activeLiquidity:
                    result.activeLiquidity.toString(),

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
    // 17. INITIALIZE
    // ====================================

    await fetchPoolData();


    // Refresh every 60 seconds

    setInterval(

        fetchPoolData,

        CONFIG.refreshInterval

    );

});
