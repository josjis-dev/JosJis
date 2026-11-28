
/**
 * ============================================================
 * PROJECT: JOSJIS
 * MODULE: DATA MANAGER
 * FILE: assets/js/core/data-manager.js
 * ============================================================
 *
 * PURPOSE:
 * Centralizes wallet, token, balance, and dashboard data
 * management for the JosJis ecosystem.
 *
 * RESPONSIBILITIES:
 * 1. Retrieve wallet information.
 * 2. Load wallet token balances.
 * 3. Validate balance data before storing it.
 * 4. Prevent duplicate balance requests for the same wallet.
 * 5. Cache wallet and token information.
 * 6. Retrieve token metadata.
 * 7. Retrieve token total supply.
 * 8. Collect dashboard information.
 * 9. Provide cached data to other application modules.
 * 10. Manage data loading status and cache cleanup.
 *
 * DATA SOURCES:
 * - Token Manager
 * - Wallet Manager
 *
 * MANAGED DATA:
 * - Wallet information
 * - JJS balance
 * - POL balance
 * - USDT0 balance
 * - Token details
 * - Token total supply
 * - Last updated timestamp
 *
 * DEPENDENCIES:
 * - ./token-manager.js
 * - ./wallet-manager.js
 *
 * IMPORTANT:
 * This module manages application data and in-memory cache.
 * It does not directly communicate with blockchain RPC endpoints.
 *
 * NOTE:
 * Existing functions, imports, exports, cache structure,
 * and execution logic are preserved.
 */

// ============================================================
// 1. IMPORT TOKEN MANAGER FUNCTIONS
// ============================================================

/**
 * Imports blockchain token data functions.
 *
 * getAllBalances:
 * Retrieves balances for supported tokens.
 *
 * getTokenDetails:
 * Retrieves token metadata.
 *
 * getTotalSupply:
 * Retrieves the total supply of a token.
 */
import {
    getAllBalances,
    getTokenDetails,
    getTotalSupply
} from "./token-manager.js";

// ============================================================
// 2. IMPORT WALLET MANAGER FUNCTIONS
// ============================================================

/**
 * Imports wallet information retrieval functionality.
 *
 * getWalletInfo:
 * Retrieves information about the currently connected wallet.
 */
import {
    getWalletInfo
} from "./wallet-manager.js";

// ============================================================
// 3. DATA MANAGER IDENTIFICATION
// ============================================================

/*
========================================
DATA MANAGER
JosJis Ecosystem
========================================
*/

// ============================================================
// 4. CENTRAL DATA STORE
// ============================================================

/**
 * Stores the latest wallet and token information in memory.
 *
 * wallet:
 * Cached wallet information.
 *
 * balances:
 * Cached balances for supported tokens.
 *
 * tokenDetails:
 * Cached token metadata indexed by token name.
 *
 * totalSupply:
 * Cached total supply values indexed by token name.
 *
 * lastUpdated:
 * Timestamp indicating the latest wallet data update.
 *
 * IMPORTANT:
 * This store exists only during the current page session.
 * It is not persistent browser storage or an external database.
 */
const dataStore = {
    wallet: null,
    balances: null,
    tokenDetails: {},
    totalSupply: {},
    lastUpdated: null
};

// ============================================================
// 5. DATA LOADING STATE
// ============================================================

/**
 * Indicates whether wallet data is currently being loaded.
 *
 * Used by isDataLoading() to expose the loading status
 * to other application modules.
 */
let loading = false;

/**
 * Stores the active wallet data loading Promise.
 *
 * Used to prevent duplicate balance requests
 * for the same wallet address.
 */
let walletLoadPromise = null;

/**
 * Stores the wallet address associated with the active request.
 *
 * Used together with walletLoadPromise to determine
 * whether an incoming request can reuse an existing operation.
 */
let walletLoadAddress = null;

// ============================================================
// 6. ERROR MESSAGE HELPER
// ============================================================

/**
 * Extracts a readable message from an error value.
 *
 * @param {Error|Object|string|null} error - Original error.
 * @returns {string} Readable error message.
 *
 * PROCESS:
 * 1. Use error.message when available.
 * 2. Otherwise convert the supplied value into a string.
 * 3. Return a fallback message when no useful value exists.
 *
 * This helper is used when reporting data loading failures.
 */
function getErrorMessage(error) {

    if (error?.message) {
        return error.message;
    }

    return String(error || "Unknown error");
}

// ============================================================
// 7. VALIDATE WALLET BALANCE DATA
// ============================================================

/**
 * Validates and normalizes wallet balance information.
 *
 * @param {Object} balances - Raw balance information.
 * @returns {Object} Validated balance information.
 *
 * SUPPORTED TOKEN KEYS:
 * - JJS
 * - POL
 * - USDT0
 *
 * VALIDATION PROCESS:
 * 1. Verify that balance data exists.
 * 2. Verify that the supplied value is an object.
 * 3. Check every supported token balance.
 * 4. Store a readable error when a balance is missing.
 * 5. Normalize existing balance errors.
 * 6. Preserve valid balance objects.
 *
 * IMPORTANT:
 * This function validates the returned data structure.
 * It does not perform blockchain balance requests.
 */
function validateBalances(balances) {

    if (!balances || typeof balances !== "object") {
        throw new Error("Data saldo tidak tersedia.");
    }

    const keys = ["JJS", "POL", "USDT0"];

    const output = {};

    for (const key of keys) {

        const balance = balances[key];

        if (!balance) {

            output[key] = {
                error: "Data saldo tidak ditemukan."
            };

            continue;
        }

        if (balance.error) {

            output[key] = {
                error: getErrorMessage(balance.error)
            };

            continue;
        }

        output[key] = balance;
    }

    return output;
}

// ============================================================
// 8. LOAD WALLET DATA
// ============================================================

/**
 * Loads wallet information and supported token balances.
 *
 * @param {string} address - Wallet address.
 * @param {Object|null} suppliedBalances - Optional existing balances.
 * @returns {Promise<Object>} Wallet and balance information.
 *
 * TWO LOADING MODES:
 *
 * MODE 1: SUPPLIED BALANCES
 * If suppliedBalances is provided:
 * - Validate the supplied balance information.
 * - Retrieve wallet information.
 * - Update the in-memory data store.
 * - Return the updated wallet data.
 * - Do not request balances again from the blockchain.
 *
 * MODE 2: BLOCKCHAIN BALANCE REQUEST
 * If suppliedBalances is null:
 * - Check whether the same wallet already has an active request.
 * - Reuse the existing Promise when addresses match.
 * - Request balances through Token Manager.
 * - Validate the returned balances.
 * - Update the data store.
 * - Reset loading state after completion.
 *
 * IMPORTANT:
 * Duplicate request protection applies to the same wallet
 * address while its balance loading Promise is active.
 */
export async function loadWalletData(
    address,
    suppliedBalances = null
) {

    // Validate the wallet address before loading data.
    if (!address) {
        throw new Error("Alamat wallet belum tersedia.");
    }

    // --------------------------------------------------------
    // MODE 1: USE SUPPLIED BALANCES
    // --------------------------------------------------------

    /**
     * Use externally supplied balances when available.
     *
     * This avoids making another blockchain balance request
     * when valid balance data has already been retrieved.
     */

    if (suppliedBalances !== null) {

        const balances = validateBalances(
            suppliedBalances
        );

        // Combine current wallet information with the supplied address.
        dataStore.wallet = {
            ...getWalletInfo(),
            address
        };

        // Update cached wallet balances.
        dataStore.balances = balances;

        // Record the latest successful data update.
        dataStore.lastUpdated = Date.now();

        return {
            wallet: dataStore.wallet,
            balances: dataStore.balances,
            lastUpdated: dataStore.lastUpdated
        };
    }

    // --------------------------------------------------------
    // MODE 2: REQUEST BALANCES THROUGH TOKEN MANAGER
    // --------------------------------------------------------

    /**
     * Prevent duplicate balance requests for the same wallet.
     *
     * If the requested address matches the address associated
     * with an existing loading Promise, reuse that Promise.
     */

    if (
        walletLoadPromise &&
        walletLoadAddress?.toLowerCase() ===
        address.toLowerCase()
    ) {
        return walletLoadPromise;
    }

    // Mark wallet data loading as active.
    loading = true;

    // Store the address associated with this request.
    walletLoadAddress = address;

    /**
     * Create the wallet data loading operation.
     *
     * The Promise is stored so other requests for the same
     * wallet can reuse the active operation.
     */
    walletLoadPromise = (async () => {

        try {

            // Retrieve all supported token balances.
            const result = await getAllBalances(address);

            // Validate the returned balance information.
            const balances = validateBalances(result);

            // Update cached wallet information.
            dataStore.wallet = {
                ...getWalletInfo(),
                address
            };

            // Update cached token balances.
            dataStore.balances = balances;

            // Record the latest successful data update.
            dataStore.lastUpdated = Date.now();

            // Return the completed wallet data.
            return {
                wallet: dataStore.wallet,
                balances: dataStore.balances,
                lastUpdated: dataStore.lastUpdated
            };

        } finally {

            /**
             * Always reset the loading state.
             *
             * The cleanup runs whether the operation succeeds
             * or fails.
             */
            loading = false;
            walletLoadPromise = null;
            walletLoadAddress = null;

        }

    })();

    return walletLoadPromise;
}

// ============================================================
// 9. LOAD INDIVIDUAL TOKEN DETAILS
// ============================================================

/**
 * Retrieves and caches token metadata.
 *
 * @param {string} tokenName - Registered token identifier.
 * @returns {Promise<Object>} Token metadata.
 *
 * PROCESS:
 * 1. Request token details through Token Manager.
 * 2. Store the returned details using the token name.
 * 3. Return the retrieved token information.
 */
export async function loadTokenDetails(tokenName) {

    const details = await getTokenDetails(tokenName);

    dataStore.tokenDetails[tokenName] = details;

    return details;
}

// ============================================================
// 10. LOAD INDIVIDUAL TOKEN TOTAL SUPPLY
// ============================================================

/**
 * Retrieves and caches a token's total supply.
 *
 * @param {string} tokenName - Registered token identifier.
 * @returns {Promise<*>} Token total supply.
 *
 * PROCESS:
 * 1. Request total supply through Token Manager.
 * 2. Store the result using the token name.
 * 3. Return the retrieved total supply.
 */
export async function loadTotalSupply(tokenName) {

    const supply = await getTotalSupply(tokenName);

    dataStore.totalSupply[tokenName] = supply;

    return supply;
}

// ============================================================
// 11. LOAD ALL TOKEN DETAILS
// ============================================================

/**
 * Retrieves metadata for all configured dashboard tokens.
 *
 * @returns {Promise<Object>} Token details indexed by token name.
 *
 * CURRENT TOKEN LIST:
 * - JJS
 * - USDT0
 *
 * PROCESS:
 * 1. Define the supported token list.
 * 2. Load all token details concurrently.
 * 3. Use Promise.allSettled() to preserve individual results.
 * 4. Return successful results.
 * 5. Convert failed requests into readable error objects.
 *
 * A failure for one token does not prevent the other
 * token information from being returned.
 */
export async function loadAllTokenDetails() {

    const tokens = ["JJS", "USDT0"];

    const results = await Promise.allSettled(
        tokens.map(token => loadTokenDetails(token))
    );

    return Object.fromEntries(

        tokens.map((token, index) => {

            const result = results[index];

            return [
                token,
                result.status === "fulfilled"
                    ? result.value
                    : {
                        error: getErrorMessage(result.reason)
                    }
            ];

        })

    );
}

// ============================================================
// 12. LOAD ALL TOKEN TOTAL SUPPLY
// ============================================================

/**
 * Retrieves total supply information for configured tokens.
 *
 * @returns {Promise<Object>} Total supply results by token name.
 *
 * CURRENT TOKEN LIST:
 * - JJS
 *
 * PROCESS:
 * 1. Define the total supply token list.
 * 2. Request total supply concurrently.
 * 3. Preserve individual results using Promise.allSettled().
 * 4. Return successful supply information.
 * 5. Return readable error objects for failed requests.
 *
 * Individual token failures do not reject the entire operation.
 */
export async function loadAllTotalSupply() {

    const tokens = ["JJS"];

    const results = await Promise.allSettled(
        tokens.map(token => loadTotalSupply(token))
    );

    return Object.fromEntries(

        tokens.map((token, index) => {

            const result = results[index];

            return [
                token,
                result.status === "fulfilled"
                    ? result.value
                    : {
                        error: getErrorMessage(result.reason)
                    }
            ];

        })

    );
}

// ============================================================
// 13. LOAD COMPLETE DASHBOARD DATA
// ============================================================

/**
 * Collects all required information for the JosJis dashboard.
 *
 * @param {string} address - Connected wallet address.
 * @param {Object|null} suppliedBalances - Optional existing balances.
 * @returns {Promise<Object>} Complete dashboard data.
 *
 * DATA COLLECTED:
 * - Wallet information.
 * - Token balances.
 * - Token metadata.
 * - Token total supply.
 * - Last updated timestamp.
 *
 * PROCESS:
 *
 * STEP 1:
 * Validate the supplied wallet address.
 *
 * STEP 2:
 * Load wallet information and balances.
 *
 * STEP 3:
 * If wallet loading fails, return a structured wallet error.
 *
 * STEP 4:
 * Load token metadata and total supply concurrently.
 *
 * STEP 5:
 * Return the combined dashboard data.
 *
 * Promise.allSettled() ensures that token metadata
 * and total supply failures are handled independently.
 */
export async function loadDashboardData(
    address,
    suppliedBalances = null
) {

    // Validate the wallet address before processing.
    if (!address) {
        throw new Error("Alamat wallet belum tersedia.");
    }

    let walletResult;

    // --------------------------------------------------------
    // STEP 1: LOAD WALLET INFORMATION AND BALANCES
    // --------------------------------------------------------

    try {

        walletResult = await loadWalletData(
            address,
            suppliedBalances
        );

    } catch (error) {

        /**
         * Return a structured dashboard response when wallet
         * loading fails.
         *
         * Other dashboard sections are left empty because
         * wallet loading did not complete successfully.
         */
        return {
            wallet: {
                error: getErrorMessage(error)
            },

            balances: null,
            tokenDetails: {},
            totalSupply: {},
            lastUpdated: dataStore.lastUpdated
        };
    }

    // --------------------------------------------------------
    // STEP 2: LOAD TOKEN INFORMATION AND TOTAL SUPPLY
    // --------------------------------------------------------

    /**
     * Retrieve token metadata and total supply concurrently.
     *
     * Promise.allSettled() allows both operations
     * to complete independently.
     */
    const [
        tokenDetails,
        totalSupply
    ] = await Promise.allSettled([

        loadAllTokenDetails(),

        loadAllTotalSupply()

    ]);

    // --------------------------------------------------------
    // STEP 3: RETURN COMPLETE DASHBOARD DATA
    // --------------------------------------------------------

    return {

        wallet: walletResult.wallet,

        balances: walletResult.balances,

        // Return token metadata or a structured error.
        tokenDetails:
            tokenDetails.status === "fulfilled"
                ? tokenDetails.value
                : {
                    error: getErrorMessage(
                        tokenDetails.reason
                    )
                },

        // Return total supply information or a structured error.
        totalSupply:
            totalSupply.status === "fulfilled"
                ? totalSupply.value
                : {
                    error: getErrorMessage(
                        totalSupply.reason
                    )
                },

        // Return the latest wallet data update timestamp.
        lastUpdated: dataStore.lastUpdated

    };
}

// ============================================================
// 14. GET COMPLETE CACHED DATA
// ============================================================

/**
 * Returns the complete in-memory data store.
 *
 * @returns {Object} Current cached application data.
 *
 * Returned information includes:
 * - Wallet information.
 * - Token balances.
 * - Token metadata.
 * - Total supply information.
 * - Last updated timestamp.
 *
 * NOTE:
 * This function returns the original dataStore object,
 * not a cloned copy.
 */
export function getCachedData() {
    return dataStore;
}

// ============================================================
// 15. GET CACHED WALLET BALANCES
// ============================================================

/**
 * Returns the currently cached wallet balances.
 *
 * @returns {Object|null} Cached balance information.
 *
 * Returns null when no wallet balances have been cached.
 */
export function getCachedBalances() {
    return dataStore.balances;
}

// ============================================================
// 16. CLEAR DATA CACHE
// ============================================================

/**
 * Clears all cached wallet and token information.
 *
 * RESET OPERATIONS:
 * - wallet
 * - balances
 * - tokenDetails
 * - totalSupply
 * - lastUpdated
 *
 * PURPOSE:
 * Removes previously cached data when the application
 * needs to start with an empty data store.
 *
 * NOTE:
 * This function does not cancel an active loading Promise.
 */
export function clearDataCache() {

    dataStore.wallet = null;
    dataStore.balances = null;
    dataStore.tokenDetails = {};
    dataStore.totalSupply = {};
    dataStore.lastUpdated = null;

}

// ============================================================
// 17. GET DATA LOADING STATUS
// ============================================================

/**
 * Returns the current wallet data loading status.
 *
 * @returns {boolean} True while wallet data is loading.
 *
 * Used by dashboard and UI modules to monitor
 * wallet data loading operations.
 */
export function isDataLoading() {
    return loading;
}

// ============================================================
// 18. GET LAST DATA UPDATE TIMESTAMP
// ============================================================

/**
 * Returns the timestamp of the latest successful wallet update.
 *
 * @returns {number|null} Last update timestamp in milliseconds.
 *
 * The timestamp is generated using Date.now().
 *
 * Returns null when no successful wallet update
 * has been recorded.
 */
export function getLastUpdated() {
    return dataStore.lastUpdated;
}
