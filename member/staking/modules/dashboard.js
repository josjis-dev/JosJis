
/**
 * JosJis Staking
 * Module: Dashboard
 * Version: V2
 * Network: Polygon Mainnet
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

/* =========================================
   DEFAULT POSITION SUMMARY
========================================= */

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

/* =========================================
   ERROR FORMATTER
========================================= */

function getErrorMessage(error) {
    return (
        error?.shortMessage ||
        error?.reason ||
        error?.message ||
        String(error) ||
        "Unknown error."
    );
}

/* =========================================
   DASHBOARD DATA
========================================= */

/**
 * Loads blockchain data independently.
 *
 * A failed request will not prevent other
 * dashboard sections from loading.
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

    const results = await Promise.allSettled([
        getJJSBalance(walletAddress),
        getStakingStatus(),
        getPositionSummary(walletAddress, fromBlock)
    ]);

    /* =====================================
       WALLET BALANCE
    ===================================== */

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

    /* =====================================
       GLOBAL STAKING STATUS
    ===================================== */

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

    /* =====================================
       USER POSITIONS
    ===================================== */

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

    /* =====================================
       RESULT
    ===================================== */

    const data = {
        walletAddress,

        // Wallet balance
        balance,
        balanceFormatted: formatJJS(balance),
        balanceError,
        balanceLoaded: balanceError === null,

        // Global staking information
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

        // User staking information
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

        // Overall loading status
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

/* =========================================
   DASHBOARD ELEMENT UPDATER
========================================= */

/**
 * Updates an element when it exists.
 */

function updateElement(element, value) {
    if (!element) return;

    element.textContent = String(value);
}

/* =========================================
   RENDER DASHBOARD
========================================= */

/**
 * Updates dashboard elements.
 *
 * Pass DOM elements using the elements object.
 */

export function renderDashboard(data, elements = {}) {
    if (!data) {
        throw new Error(
            "Dashboard data is unavailable."
        );
    }

    // Wallet balance
    updateElement(
        elements.balance,
        data.balanceLoaded
            ? data.balanceFormatted
            : "Unavailable"
    );

    // Global staking information
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

    // User staking information
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

    updateElement(
        elements.stakingStatus,
        data.stakingStatusLoaded
            ? (data.stakingPaused ? "Paused" : "Active")
            : "Unavailable"
    );

    return data;
}

/* =========================================
   REFRESH DASHBOARD
========================================= */

/**
 * Loads and renders dashboard data.
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

/* =========================================
   EMPTY DASHBOARD
========================================= */

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

/* =========================================
   DASHBOARD ERROR HANDLER
========================================= */

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
