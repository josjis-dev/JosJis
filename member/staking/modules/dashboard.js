/**
 * JosJis Staking
 * Module: Dashboard
 * Version: V1
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
   DASHBOARD DATA
========================================= */

/**
 * Loads blockchain data for the dashboard.
 */

export async function loadDashboardData(
    walletAddress,
    fromBlock = 0
) {
    if (!walletAddress) {
        throw new Error("Wallet address is required.");
    }

    const [
        balance,
        stakingStatus,
        positionSummary
    ] = await Promise.all([
        getJJSBalance(walletAddress),
        getStakingStatus(),
        getPositionSummary(walletAddress, fromBlock)
    ]);

    return {
        walletAddress,

        // Wallet balance
        balance,
        balanceFormatted: formatJJS(balance),

        // Global staking information
        stakingPaused: stakingStatus.paused,
        availableRewards: stakingStatus.availableRewards,
        availableRewardsFormatted: formatJJS(
            stakingStatus.availableRewards
        ),

        totalStaked: stakingStatus.totalStaked,
        totalStakedFormatted: formatJJS(
            stakingStatus.totalStaked
        ),

        totalReservedRewards: stakingStatus.totalReservedRewards,
        totalReservedRewardsFormatted: formatJJS(
            stakingStatus.totalReservedRewards
        ),

        nextPositionId: stakingStatus.nextPositionId,

        // User staking information
        userTotalStaked: positionSummary.totalStaked,
        userTotalStakedFormatted:
            positionSummary.totalStakedFormatted,

        userTotalRewards: positionSummary.totalRewards,
        userTotalRewardsFormatted:
            positionSummary.totalRewardsFormatted,

        totalPositions: positionSummary.totalPositions,
        totalWithdrawn: positionSummary.totalWithdrawn,
        totalClaimed: positionSummary.totalClaimed,

        positions: positionSummary.positions
    };
}

/* =========================================
   DASHBOARD ELEMENT UPDATER
========================================= */

/**
 * Updates an element when it exists.
 * Missing optional elements are ignored.
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
        throw new Error("Dashboard data is unavailable.");
    }

    updateElement(
        elements.balance,
        data.balanceFormatted
    );

    updateElement(
        elements.totalStaked,
        data.totalStakedFormatted
    );

    updateElement(
        elements.availableRewards,
        data.availableRewardsFormatted
    );

    updateElement(
        elements.totalReservedRewards,
        data.totalReservedRewardsFormatted
    );

    updateElement(
        elements.userTotalStaked,
        data.userTotalStakedFormatted
    );

    updateElement(
        elements.userTotalRewards,
        data.userTotalRewardsFormatted
    );

    updateElement(
        elements.totalPositions,
        data.totalPositions
    );

    updateElement(
        elements.totalWithdrawn,
        data.totalWithdrawn
    );

    updateElement(
        elements.totalClaimed,
        data.totalClaimed
    );

    updateElement(
        elements.stakingStatus,
        data.stakingPaused ? "Paused" : "Active"
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
    console.error("Dashboard error:", error);

    if (errorElement) {
        errorElement.textContent =
            error?.shortMessage ||
            error?.message ||
            "Unable to load dashboard data.";
    }
}
