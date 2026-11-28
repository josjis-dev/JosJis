
/**
 * JosJis Ecosystem
 * Module: Wallet Manager
 *
 * Purpose:
 * Provides a centralized interface for accessing and managing
 * wallet connection information through Reown AppKit.
 *
 * Responsibilities:
 * - Retrieve the current wallet state.
 * - Retrieve the connected wallet address.
 * - Retrieve the active blockchain chain ID.
 * - Check wallet connection status.
 * - Check whether the wallet uses Polygon Mainnet.
 * - Provide a summarized wallet connection status.
 * - Open wallet connection and network selection modals.
 * - Subscribe to wallet, account, network, and provider changes.
 *
 * Provider:
 * Reown AppKit modal instance imported from web3-config.js.
 *
 * Network Configuration:
 * The expected network is obtained from contract-registry.js.
 *
 * Important:
 * This module manages wallet connection information and AppKit
 * subscriptions. It does not directly execute blockchain transactions.
 */

import { modal } from "../../../web3/web3-config.js";

import { NETWORK } from "./contract-registry.js";

/*
========================================
 WALLET MANAGER
 JosJis Ecosystem
========================================
*/

/**
 * Retrieves the current Reown AppKit wallet state.
 *
 * @returns {object} Current AppKit state.
 */
export function getWalletState() {
    return modal.getState();
}

/**
 * Retrieves the currently connected wallet address.
 *
 * @returns {string|null} Wallet address, or null if unavailable.
 */
export function getAddress() {
    return modal.getAddress();
}

/**
 * Retrieves the currently selected blockchain chain ID.
 *
 * @returns {number|string|null} Active chain ID.
 */
export function getChainId() {
    return modal.getChainId();
}

/**
 * Checks whether a wallet address is currently available.
 *
 * @returns {boolean} True if a wallet address is available.
 */
export function isConnected() {
    return Boolean(getAddress());
}

/**
 * Checks whether the active wallet network matches Polygon Mainnet.
 *
 * The chain ID is compared against NETWORK.CHAIN_ID.
 *
 * @returns {boolean} True if the active network is Polygon Mainnet.
 */
export function isPolygon() {
    return Number(getChainId()) === NETWORK.CHAIN_ID;
}

/**
 * Retrieves a summarized wallet connection status.
 *
 * Returned properties:
 * - connected: Whether a wallet address is available.
 * - address: Current wallet address or null.
 * - chainId: Active chain ID or null.
 * - isPolygon: Whether the active chain is Polygon.
 * - correctNetwork: Whether the active chain matches the configured network.
 *
 * @returns {object} Wallet connection status information.
 */
export function getConnectionStatus() {
    const address = getAddress();
    const chainId = Number(getChainId());

    return {
        connected: Boolean(address),
        address: address || null,
        chainId: chainId || null,
        isPolygon: chainId === NETWORK.CHAIN_ID,
        correctNetwork: chainId === NETWORK.CHAIN_ID
    };
}

/**
 * Opens the Reown AppKit wallet connection modal.
 *
 * @returns {*} Result returned by modal.open().
 */
export function openConnectModal() {
    return modal.open();
}

/**
 * Opens the Reown AppKit network selection modal.
 *
 * The Networks view allows users to select an available blockchain network.
 *
 * @returns {*} Result returned by modal.open().
 */
export function openNetworkModal() {
    return modal.open({ view: "Networks" });
}

/**
 * Subscribes to general AppKit state changes.
 *
 * The callback is invoked when the subscribed state changes.
 *
 * @param {Function} callback - Function executed when state changes.
 * @returns {*} Subscription result returned by AppKit.
 */
export function subscribeState(callback) {
    return modal.subscribeState(callback);
}

/**
 * Subscribes to wallet account changes.
 *
 * @param {Function} callback - Function executed when account changes.
 * @returns {*} Subscription result returned by AppKit.
 */
export function subscribeAccount(callback) {
    return modal.subscribeAccount(callback);
}

/**
 * Subscribes to blockchain network changes.
 *
 * @param {Function} callback - Function executed when network changes.
 * @returns {*} Subscription result returned by AppKit.
 */
export function subscribeNetwork(callback) {
    return modal.subscribeNetwork(callback);
}

/**
 * Subscribes to AppKit wallet provider changes.
 *
 * The callback receives the available provider collection,
 * which may contain an EVM provider under the eip155 namespace.
 *
 * This function only forwards the AppKit subscription.
 * Provider adaptation and transaction signer management
 * remain the responsibility of the Transaction Manager.
 *
 * @param {Function} callback - Function executed when providers change.
 * @returns {*} Subscription result returned by AppKit.
 */
export function subscribeProviders(callback) {
    return modal.subscribeProviders(callback);
}

/**
 * Retrieves a summarized wallet information object.
 *
 * Includes the connection status and a shortened wallet address
 * suitable for displaying in the user interface.
 *
 * The shortened address contains:
 * - First 6 characters.
 * - Last 4 characters.
 *
 * @returns {object} Wallet information with shortened address.
 */
export function getWalletInfo() {
    const status = getConnectionStatus();

    return {
        ...status,
        shortAddress: status.address
            ? `${status.address.slice(0, 6)}...${status.address.slice(-4)}`
            : null
    };
}

/**
 * Re-exports the AppKit modal instance.
 *
 * Other modules can use this export when direct access
 * to the shared modal instance is required.
 */
export { modal };
