
/**
 * ============================================================
 * PROJECT: JOSJIS
 * MODULE: STAKING DASHBOARD
 * FILE: member/staking/modules/dashboard.js
 * VERSION: V2
 * NETWORK: Polygon Mainnet
 * ============================================================
 *
 * PURPOSE:
 * Provides the dashboard data loading, rendering, and refresh
 * functionality for the JosJis staking application.
 *
 * RESPONSIBILITIES:
 * 1. Load the connected wallet's JJS balance.
 * 2. Load global staking contract information.
 * 3. Load the connected wallet's staking position summary.
 * 4. Handle individual data loading errors independently.
 * 5. Format blockchain values for dashboard presentation.
 * 6. Update dashboard DOM elements.
 * 7. Clear dashboard values when the wallet disconnects.
 *
 * ARCHITECTURE:
 * - contracts.js: Provides wallet balance and staking contract data.
 * - positions.js: Provides user staking position information.
 * - helpers.js: Provides JJS amount formatting.
 *
 * This module acts as a dashboard presentation controller.
 * Blockchain access and position scanning are delegated to
 * their respective modules.
 *
 * IMPORTANT:
 * This module does not create RPC providers or blockchain
 * contract instances directly.
 * ============================================================
 */

import {
    getJJSBalance,
    getStakingStatus
} from "./contracts.js";

import {
    getPositionSummary
} from "./positions.js";

import {
    formatJJS
} from "./helpers.js";

/* ============================================================
   DEFAULT POSITION SUMMARY
============================================================ */

/**
 * Creates an empty position summary.
 *
 * This object is used when position data cannot be loaded.
 * It preserves the expected dashboard data structure.
 *
 * @param {string|null} error - Optional loading error message.
 * @returns {Object} Empty position summary.
 */
function getEmptyPositionSummary(error = null) {
    return {
        totalPositions: 0,
        totalStaked: 0n,
        totalRewards: 0n,
        totalWithdrawn: 0,
        totalClaimed: 0,
        totalStakedFormatted: formatJJS(0n),
        totalRewardsFormatted: formatJJS(0n),
        positions: [],
        error
    };
}

/* ============================================================
   ERROR FORMATTER
============================================================ */

/**
 * Extracts a readable message from an error object.
 *
 * Ethers errors may contain several message properties.
 * This function selects the most useful available message.
 *
 * @param {Error|Object|string} error - Original error.
 * @returns {string} Readable error message.
 */
function getErrorMessage(error) {
    return (
        error?.shortMessage ||
        error?.reason ||
        error?.message ||
        String(error) ||
        "Unknown error."
    );
}

/* ============================================================
   DASHBOARD DATA LOADER
============================================================ */

/**
 * Loads all dashboard data for a wallet.
 *
 * The three data sources are executed independently through
 * Promise.allSettled().
 *
 * This prevents one failed request from blocking the other
 * dashboard sections from loading.
 *
 * Data sources:
 * 1. Wallet JJS balance.
 * 2. Global staking contract status.
 * 3. User staking position summary.
 *
 * @param {string} walletAddress - Connected wallet address.
 * @param {number} fromBlock - Starting block for position scanning.
 * @returns {Promise<Object>} Complete dashboard data.
 */
export async function loadDashboardData(
    walletAddress,
    fromBlock = 0
) {
    if (!walletAddress) {
        throw new Error("Wallet address is required.");
    }

    console.info(
        "[Dashboard] Starting dashboard data loading..."
    );

    // Load all dashboard sections independently.
    const results = await Promise.allSettled([
        getJJSBalance(walletAddress),
        getStakingStatus(),
        getPositionSummary(walletAddress, fromBlock)
    ]);

    /* ========================================================
       WALLET BALANCE
    ======================================================== */

    let balance = 0n;
    let balanceError = null;

    if (results[0].status === "fulfilled") {
        balance = results[0].value;
    } else {
        balanceError = getErrorMessage(
            results[0].reason
        );

        console.error(
            "[Dashboard] JJS balance failed:",
            results[0].reason
        );
    }

    /* ========================================================
       GLOBAL STAKING STATUS
    ======================================================== */

    // Default values are used if the staking status request fails.
    let stakingStatus = {
        paused: false,
        availableRewards: 0n,
        totalStaked: 0n,
        totalReservedRewards: 0n,
        nextPositionId: 0n
    };

    let stakingStatusError = null;

    if (results[1].status === "fulfilled") {
        stakingStatus = results[1].value;
    } else {
        stakingStatusError = getErrorMessage(
            results[1].reason
        );

        console.error(
            "[Dashboard] Staking status failed:",
            results[1].reason
        );
    }

    /* ========================================================
       USER STAKING POSITIONS
    ======================================================== */

    // Initialize an empty summary before processing the result.
    let positionSummary =
        getEmptyPositionSummary();

    let positionError = null;

    if (results[2].status === "fulfilled") {
        positionSummary = results[2].value;
    } else {
        positionError = getErrorMessage(
            results[2].reason
        );

        positionSummary =
            getEmptyPositionSummary(positionError);

        console.error(
            "[Dashboard] Position loading failed:",
            results[2].reason
        );
    }

    /* ========================================================
       DASHBOARD RESULT
    ======================================================== */

    /**
     * The returned object is the central data structure
     * consumed by renderDashboard() and other dashboard logic.
     *
     * Raw blockchain values are preserved alongside their
     * formatted display values.
     */
    const data = {
        walletAddress,

        // Wallet balance information.
        balance,
        balanceFormatted: formatJJS(balance),
        balanceError,
        balanceLoaded: balanceError === null,

        // Global staking contract information.
        stakingPaused: stakingStatus.paused,

        availableRewards:
            stakingStatus.availableRewards,

        availableRewardsFormatted: formatJJS(
            stakingStatus.availableRewards
        ),

        totalStaked:
            stakingStatus.totalStaked,

        totalStakedFormatted: formatJJS(
            stakingStatus.totalStaked
        ),

        totalReservedRewards:
            stakingStatus.totalReservedRewards,

        totalReservedRewardsFormatted: formatJJS(
            stakingStatus.totalReservedRewards
        ),

        nextPositionId:
            stakingStatus.nextPositionId,

        stakingStatusError,
        stakingStatusLoaded:
            stakingStatusError === null,

        // Connected wallet staking information.
        userTotalStaked:
            positionSummary.totalStaked,

        userTotalStakedFormatted:
            positionSummary.totalStakedFormatted,

        userTotalRewards:
            positionSummary.totalRewards,

        userTotalRewardsFormatted:
            positionSummary.totalRewardsFormatted,

        totalPositions:
            positionSummary.totalPositions,

        totalWithdrawn:
            positionSummary.totalWithdrawn,

        totalClaimed:
            positionSummary.totalClaimed,

        positions:
            positionSummary.positions,

        positionError,
        positionsLoaded:
            positionError === null,

        // Indicates whether any dashboard section failed.
        hasErrors: Boolean(
            balanceError ||
            stakingStatusError ||
            positionError
        )
    };

    console.info(
        "[Dashboard] Loading completed:",
        {
            balanceLoaded: data.balanceLoaded,
            stakingStatusLoaded:
                data.stakingStatusLoaded,
            positionsLoaded:
                data.positionsLoaded,
            hasErrors: data.hasErrors
        }
    );

    return data;
}

/* ============================================================
   DASHBOARD ELEMENT UPDATER
============================================================ */

/**
 * Updates the text content of a DOM element.
 *
 * Missing elements are ignored to allow optional dashboard
 * sections without causing rendering errors.
 *
 * @param {HTMLElement|null|undefined} element - Target element.
 * @param {string|number|bigint} value - Display value.
 * @returns {void}
 */
function updateElement(element, value) {
    if (!element) return;

    element.textContent = String(value);
}

/* ============================================================
   DASHBOARD RENDERER
============================================================ */

/**
 * Renders dashboard data into the supplied DOM elements.
 *
 * Each section checks its own loading status.
 * Failed sections display "Unavailable" instead of displaying
 * default values as if they were successfully loaded.
 *
 * @param {Object} data - Dashboard data from loadDashboardData().
 * @param {Object} elements - Dashboard DOM element references.
 * @returns {Object} The original dashboard data.
 */
export function renderDashboard(data, elements = {}) {
    if (!data) {
        throw new Error(
            "Dashboard data is unavailable."
        );
    }

    /* ========================================================
       WALLET BALANCE
    ======================================================== */

    updateElement(
        elements.balance,
        data.balanceLoaded
            ? data.balanceFormatted
            : "Unavailable"
    );

    /* ========================================================
       GLOBAL STAKING INFORMATION
    ======================================================== */

    updateElement(
        elements.totalStaked,
        data.stakingStatusLoaded
            ? data.totalStakedFormatted
            : "Unavailable"
    );

    updateElement(
        elements.availableRewards,
        data.stakingStatusLoaded
            ? data.availableRewardsFormatted
            : "Unavailable"
    );

    updateElement(
        elements.totalReservedRewards,
        data.stakingStatusLoaded
            ? data.totalReservedRewardsFormatted
            : "Unavailable"
    );

    /* ========================================================
       USER STAKING INFORMATION
    ======================================================== */

    updateElement(
        elements.userTotalStaked,
        data.positionsLoaded
            ? data.userTotalStakedFormatted
            : "Unavailable"
    );

    updateElement(
        elements.userTotalRewards,
        data.positionsLoaded
            ? data.userTotalRewardsFormatted
            : "Unavailable"
    );

    updateElement(
        elements.totalPositions,
        data.positionsLoaded
            ? data.totalPositions
            : "Unavailable"
    );

    updateElement(
        elements.totalWithdrawn,
        data.positionsLoaded
            ? data.totalWithdrawn
            : "Unavailable"
    );

    updateElement(
        elements.totalClaimed,
        data.positionsLoaded
            ? data.totalClaimed
            : "Unavailable"
    );

    /* ========================================================
       STAKING CONTRACT STATUS
    ======================================================== */

    updateElement(
        elements.stakingStatus,
        data.stakingStatusLoaded
            ? (data.stakingPaused ? "Paused" : "Active")
            : "Unavailable"
    );

    return data;
}

/* ============================================================
   DASHBOARD REFRESHER
============================================================ */

/**
 * Loads fresh dashboard data and renders it.
 *
 * This function combines the data loading and rendering steps
 * into one operation.
 *
 * @param {string} walletAddress - Connected wallet address.
 * @param {Object} elements - Dashboard DOM element references.
 * @param {number} fromBlock - Starting block for position scanning.
 * @returns {Promise<Object>} Loaded dashboard data.
 */
export async function refreshDashboard(
    walletAddress,
    elements = {},
    fromBlock = 0
) {
    const data = await loadDashboardData(
        walletAddress,
        fromBlock
    );

    renderDashboard(data, elements);

    return data;
}

/* ============================================================
   DASHBOARD RESET
============================================================ */

/**
 * Clears dashboard values when the wallet disconnects.
 *
 * Numeric dashboard fields are reset to "0".
 * The staking status is changed to "Disconnected".
 *
 * @param {Object} elements - Dashboard DOM element references.
 * @returns {void}
 */
export function clearDashboard(elements = {}) {
    const emptyValues = [
        "balance",
        "totalStaked",
        "availableRewards",
        "totalReservedRewards",
        "userTotalStaked",
        "userTotalRewards",
        "totalPositions",
        "totalWithdrawn",
        "totalClaimed"
    ];

    for (const key of emptyValues) {
        updateElement(elements[key], "0");
    }

    updateElement(
        elements.stakingStatus,
        "Disconnected"
    );
}

/* ============================================================
   DASHBOARD ERROR HANDLER
============================================================ */

/**
 * Logs a dashboard error and displays its message when
 * an error element is provided.
 *
 * @param {Error|Object|string} error - Original error.
 * @param {HTMLElement|null|undefined} errorElement - Error display.
 * @returns {void}
 */
export function showDashboardError(
    error,
    errorElement
) {
    console.error(
        "[Dashboard] Error:",
        error
    );

    if (errorElement) {
        errorElement.textContent =
            getErrorMessage(error);
    }
}
