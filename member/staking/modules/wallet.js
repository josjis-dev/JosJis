
/**
 * JosJis Staking
 * Module: Wallet
 * Version: V7 Core Integrated
 * Network: Polygon Mainnet
 *
 * Purpose:
 * Provides wallet connection and signer functionality
 * for the JosJis Staking module through JosJis Core.
 *
 * Core Integration:
 * - Wallet Manager handles AppKit wallet state and subscriptions.
 * - Transaction Manager handles EIP-1193 providers,
 *   BrowserProvider instances, and wallet signers.
 *
 * Responsibilities:
 * - Synchronize the AppKit wallet session.
 * - Subscribe to wallet, account, network, and provider changes.
 * - Retrieve the connected wallet provider and signer.
 * - Create staking-specific token and staking contracts.
 * - Validate the connected account and Polygon network.
 */

import {
    Contract
} from "https://esm.sh/ethers@6.15.0";

import {
    Wallet,
    Transaction
} from "../../../assets/js/core/index.js";

import {
    CONFIG,
    TOKEN_ABI,
    STAKING_ABI
} from "./config.js";

/* =========================================
   WALLET STATE
========================================= */

let walletProvider = null;
let rawWalletProvider = null;

let browserProvider = null;
let walletSigner = null;
let walletAddress = null;
let walletChainId = null;

let providerUnsubscribe = null;
let accountUnsubscribe = null;
let networkUnsubscribe = null;
let stateUnsubscribe = null;

let providerInitialization = null;

/* =========================================
   PROVIDER TYPE DETECTION
========================================= */

/**
 * Checks whether a provider is a WalletConnect Universal Provider.
 *
 * @param {object} provider - Original wallet provider.
 * @returns {boolean} True if the provider is a Universal Provider.
 */
function isUniversalProvider(provider) {
    if (!provider) return false;

    return Boolean(
        provider.rpcProviders &&
        typeof provider.request === "function"
    );
}

/* =========================================
   PROVIDER VALIDATION
========================================= */

/**
 * Validates the wallet provider managed by JosJis Core.
 *
 * @param {object} provider - Wallet provider to validate.
 * @returns {boolean} True if the provider is valid.
 */
export function validateWalletProvider(provider) {
    if (!provider) {
        throw new Error(
            "Wallet provider is unavailable. Reconnect your wallet."
        );
    }

    if (typeof provider.request !== "function") {
        throw new Error(
            "Invalid wallet provider: request() is unavailable."
        );
    }

    return true;
}

/* =========================================
   SET WALLET PROVIDER
========================================= */

/**
 * Registers the wallet provider through JosJis Core.
 *
 * Transaction Manager handles provider adaptation and caching.
 *
 * @param {object} provider - Original or adapted EIP-1193 provider.
 * @returns {boolean} True if the provider was registered.
 */
export function setWalletProvider(provider) {
    if (!provider) {
        clearWalletSession();
        return false;
    }

    validateWalletProvider(provider);

    const previousProvider = walletProvider;

    const alreadyCoreProvider =
        provider === Transaction.getWalletProvider();

    const rawProvider = alreadyCoreProvider
        ? rawWalletProvider
        : provider;

    Transaction.setWalletProvider(provider);

    walletProvider = Transaction.getWalletProvider();

    if (!walletProvider) {
        throw new Error(
            "JosJis Core could not initialize the wallet provider."
        );
    }

    if (previousProvider !== walletProvider) {
        browserProvider = null;
        walletSigner = null;
        walletAddress = null;
    }

    if (!alreadyCoreProvider) {
        rawWalletProvider = rawProvider;
    }

    console.log(
        "[JJS Wallet] Provider registered through JosJis Core."
    );

    console.log(
        "[JJS Wallet] Core provider available:",
        Boolean(walletProvider)
    );

    console.log(
        "[JJS Wallet] Universal Provider:",
        isUniversalProvider(rawWalletProvider)
    );

    return true;
}

/* =========================================
   GET WALLET PROVIDER
========================================= */

/**
 * Retrieves the wallet provider managed by JosJis Core.
 *
 * @returns {object|null} Core wallet provider.
 */
export function getWalletProvider() {
    walletProvider = Transaction.getWalletProvider();

    return walletProvider;
}

/* =========================================
   SYNCHRONIZE APPKIT ACCOUNT
========================================= */

/**
 * Synchronizes the local staking wallet state with AppKit.
 *
 * @param {string|null} accountAddress - Optional account address.
 * @returns {object|null} Synchronized wallet information.
 */
export function syncAppKitAccount(accountAddress = null) {
    try {
        const address =
            Wallet.getAddress() || accountAddress;

        const chainId = Wallet.getChainId();

        if (!address) {
            walletAddress = null;
            walletSigner = null;

            return null;
        }

        walletAddress = address;

        if (
            chainId !== undefined &&
            chainId !== null
        ) {
            walletChainId = Number(chainId);
        }

        console.log(
            "[JJS Wallet] AppKit account:",
            walletAddress
        );

        console.log(
            "[JJS Wallet] Chain ID:",
            walletChainId
        );

        return {
            address: walletAddress,
            chainId: walletChainId
        };

    } catch (error) {
        console.error(
            "[JJS Wallet] AppKit synchronization failed:",
            error
        );

        return null;
    }
}

/* =========================================
   INITIALIZE WALLET PROVIDER
========================================= */

/**
 * Initializes the wallet provider using JosJis Core.
 *
 * If Core does not yet have a provider, a matching injected
 * provider may be registered as a fallback.
 *
 * @returns {Promise<object|null>} Initialized wallet provider.
 */
export async function initializeWalletProvider() {
    if (providerInitialization) {
        return providerInitialization;
    }

    providerInitialization = (async () => {
        try {
            const coreProvider =
                Transaction.getWalletProvider();

            if (coreProvider) {
                walletProvider = coreProvider;

                return walletProvider;
            }

            /*
             * Use an injected provider only when its
             * account matches the AppKit account.
             */

            if (typeof window !== "undefined") {
                const injectedProvider =
                    window.ethereum;

                if (
                    injectedProvider &&
                    typeof injectedProvider.request === "function"
                ) {
                    const accounts =
                        await injectedProvider.request({
                            method: "eth_accounts"
                        });

                    const appKitAddress =
                        Wallet.getAddress();

                    if (
                        Array.isArray(accounts) &&
                        accounts.length > 0 &&
                        appKitAddress &&
                        accounts[0].toLowerCase() ===
                        appKitAddress.toLowerCase()
                    ) {
                        setWalletProvider(
                            injectedProvider
                        );

                        console.log(
                            "[JJS Wallet] Matching injected provider registered."
                        );

                        return walletProvider;
                    }
                }
            }

            console.warn(
                "[JJS Wallet] No matching injected provider found."
            );

            return null;

        } catch (error) {
            console.error(
                "[JJS Wallet] Provider initialization error:",
                error
            );

            return null;

        } finally {
            providerInitialization = null;
        }
    })();

    return providerInitialization;
}

/* =========================================
   SUBSCRIBE APPKIT PROVIDER
========================================= */

/**
 * Subscribes to provider changes through JosJis Core Wallet Manager.
 *
 * @param {Function} callback - Receives the adapted provider and error.
 * @returns {Function|null} Unsubscribe function.
 */
export function subscribeWalletProvider(
    callback = () => {}
) {
    if (providerUnsubscribe) {
        return providerUnsubscribe;
    }

    let subscriptionActive = true;

    const unsubscribe = Wallet.subscribeProviders(
        (providers) => {
            const provider =
                providers?.eip155 ||
                providers?.["eip155"] ||
                null;

            if (!provider || !subscriptionActive) {
                return;
            }

            try {
                setWalletProvider(provider);

                console.log(
                    "[JJS Wallet] Provider received through Core."
                );

                callback(walletProvider, null);

            } catch (error) {
                console.error(
                    "[JJS Wallet] Provider subscription error:",
                    error
                );

                callback(null, error);
            }
        }
    );

    providerUnsubscribe = () => {
        subscriptionActive = false;

        if (typeof unsubscribe === "function") {
            unsubscribe();
        }

        providerUnsubscribe = null;
    };

    /*
     * Check whether a matching injected provider already exists.
     */

    initializeWalletProvider().then(provider => {
        if (
            provider &&
            subscriptionActive &&
            walletProvider
        ) {
            callback(walletProvider, null);
        }
    });

    return providerUnsubscribe;
}

/* =========================================
   SUBSCRIBE APPKIT ACCOUNT
========================================= */

/**
 * Subscribes to account changes through JosJis Core Wallet Manager.
 *
 * @param {Function} callback - Receives account information.
 * @returns {Function|null} Unsubscribe function.
 */
export function subscribeWalletAccount(
    callback = () => {}
) {
    if (accountUnsubscribe) {
        return accountUnsubscribe;
    }

    accountUnsubscribe = Wallet.subscribeAccount(
        account => {
            if (account?.address) {
                syncAppKitAccount(account.address);

                initializeWalletProvider().then(provider => {
                    callback({
                        ...account,
                        address: account.address,
                        provider
                    });
                });

            } else if (
                account?.isConnected === false
            ) {
                clearWalletSession();

                callback({
                    ...account,
                    address: null,
                    provider: null
                });
            }
        }
    );

    return accountUnsubscribe;
}

/* =========================================
   SUBSCRIBE APPKIT NETWORK
========================================= */

/**
 * Subscribes to network changes through JosJis Core Wallet Manager.
 *
 * @param {Function} callback - Receives network information.
 * @returns {Function|null} Unsubscribe function.
 */
export function subscribeWalletNetwork(
    callback = () => {}
) {
    if (networkUnsubscribe) {
        return networkUnsubscribe;
    }

    networkUnsubscribe = Wallet.subscribeNetwork(
        network => {
            const chainId = Wallet.getChainId();

            walletChainId =
                chainId !== undefined && chainId !== null
                    ? Number(chainId)
                    : null;

            /*
             * Invalidate local references when the network changes.
             * Transaction Manager owns the actual provider cache.
             */

            browserProvider = null;
            walletSigner = null;

            callback({
                ...network,
                chainId: walletChainId
            });
        }
    );

    return networkUnsubscribe;
}

/* =========================================
   SUBSCRIBE APPKIT STATE
========================================= */

/**
 * Subscribes to general wallet state changes through Core.
 *
 * @param {Function} callback - Receives synchronized wallet state.
 * @returns {Function|null} Unsubscribe function.
 */
export function subscribeWalletState(
    callback = () => {}
) {
    if (stateUnsubscribe) {
        return stateUnsubscribe;
    }

    stateUnsubscribe = Wallet.subscribeState(() => {
        const session = syncAppKitAccount();

        callback(session);
    });

    return stateUnsubscribe;
}

/* =========================================
   INITIALIZE APPKIT LISTENERS
========================================= */

/**
 * Initializes all wallet subscriptions used by staking.
 *
 * @param {object} callbacks - Optional wallet event callbacks.
 * @returns {boolean} True when listener initialization is requested.
 */
export function initializeWalletListeners(
    callbacks = {}
) {
    subscribeWalletState(
        callbacks.onState || (() => {})
    );

    subscribeWalletAccount(
        callbacks.onAccount || (() => {})
    );

    subscribeWalletNetwork(
        callbacks.onNetwork || (() => {})
    );

    subscribeWalletProvider(
        callbacks.onProvider || (() => {})
    );

    syncAppKitAccount();

    initializeWalletProvider();

    return true;
}

/* =========================================
   CREATE BROWSER PROVIDER
========================================= */

/**
 * Retrieves the shared BrowserProvider from JosJis Core.
 *
 * @param {object} provider - Optional provider to register first.
 * @returns {Promise<object>} Core BrowserProvider.
 */
export async function createBrowserProvider(
    provider = walletProvider
) {
    if (provider) {
        validateWalletProvider(provider);

        const currentProvider =
            Transaction.getWalletProvider();

        if (provider !== currentProvider) {
            setWalletProvider(provider);
        }
    }

    browserProvider =
        await Transaction.getBrowserProvider();

    if (!browserProvider) {
        throw new Error(
            "JosJis Core BrowserProvider is unavailable."
        );
    }

    return browserProvider;
}

/* =========================================
   GET CONNECTED WALLET ADDRESS
========================================= */

/**
 * Retrieves the connected wallet address from the provider.
 *
 * AppKit address is used as a fallback when no provider is available.
 *
 * @param {object} provider - Optional wallet provider.
 * @returns {Promise<string>} Connected wallet address.
 */
export async function getConnectedAddress(
    provider = walletProvider
) {
    if (provider) {
        validateWalletProvider(provider);

        const accounts = await provider.request({
            method: "eth_accounts"
        });

        if (
            Array.isArray(accounts) &&
            accounts.length > 0
        ) {
            walletAddress = accounts[0];

            return walletAddress;
        }
    }

    const address = Wallet.getAddress();

    if (address) {
        walletAddress = address;

        return address;
    }

    throw new Error(
        "No connected wallet account found."
    );
}

/* =========================================
   GET SIGNER
========================================= */

/**
 * Retrieves the wallet signer from JosJis Core Transaction Manager.
 *
 * @param {object} provider - Optional provider to register first.
 * @returns {Promise<object>} Connected wallet signer.
 */
export async function getWalletSigner(provider = null) {
    if (provider) {
        setWalletProvider(provider);
    }

    walletProvider =
        Transaction.getWalletProvider();

    if (!walletProvider) {
        await initializeWalletProvider();
    }

    walletSigner =
        await Transaction.getWalletSigner();

    walletAddress =
        await walletSigner.getAddress();

    const network =
        await walletSigner.provider.getNetwork();

    walletChainId = Number(network.chainId);

    return walletSigner;
}

/* =========================================
   GET SIGNER CONTRACTS
========================================= */

/**
 * Creates staking-specific contracts using the Core-managed signer.
 *
 * @returns {Promise<object>} Provider, signer, address, and contracts.
 */
export async function getSignerContracts() {
    const provider =
        walletProvider ||
        await initializeWalletProvider();

    validateWalletProvider(provider);

    const currentBrowserProvider =
        await createBrowserProvider(provider);

    const network =
        await currentBrowserProvider.getNetwork();

    const chainId = Number(network.chainId);

    if (chainId !== CONFIG.chainId) {
        throw new Error(
            "Please switch your wallet to Polygon Mainnet."
        );
    }

    const signer =
        await Transaction.getWalletSigner();

    const address =
        await signer.getAddress();

    const appKitAddress =
        Wallet.getAddress();

    if (
        appKitAddress &&
        appKitAddress.toLowerCase() !==
        address.toLowerCase()
    ) {
        throw new Error(
            "Wallet account mismatch. Reconnect your wallet."
        );
    }

    const tokenContract = new Contract(
        CONFIG.tokenAddress,
        TOKEN_ABI,
        signer
    );

    const stakingContract = new Contract(
        CONFIG.stakingAddress,
        STAKING_ABI,
        signer
    );

    walletSigner = signer;
    walletAddress = address;
    walletChainId = chainId;

    return {
        provider: currentBrowserProvider,
        signer,
        address,
        tokenContract,
        stakingContract
    };
}

/* =========================================
   GET WALLET SESSION
========================================= */

/**
 * Retrieves the current staking wallet session.
 *
 * Provider and signer references are synchronized with JosJis Core.
 *
 * @returns {object} Current wallet session information.
 */
export function getWalletSession() {
    walletProvider =
        Transaction.getWalletProvider();

    return {
        walletProvider,
        rawWalletProvider,
        browserProvider,
        walletSigner,
        walletAddress,
        walletChainId,

        connected: Boolean(
            Wallet.getAddress() ||
            walletAddress
        ),

        providerReady: Boolean(walletProvider)
    };
}

/* =========================================
   CLEAR WALLET SESSION
========================================= */

/**
 * Clears the staking wallet session and shared Core transaction session.
 */
export function clearWalletSession() {
    Transaction.clearWalletSession();

    walletProvider = null;
    rawWalletProvider = null;

    browserProvider = null;
    walletSigner = null;

    walletAddress = null;
    walletChainId = null;
}

/* =========================================
   CHECK WALLET CONNECTION
========================================= */

/**
 * Validates the current wallet connection, account, and network.
 *
 * @returns {Promise<object>} Wallet connection validation result.
 */
export async function checkWalletConnection() {
    try {
        const account = Wallet.getAddress();

        if (!account) {
            throw new Error(
                "Wallet is not connected."
            );
        }

        const chainId = Wallet.getChainId();

        if (Number(chainId) !== CONFIG.chainId) {
            throw new Error(
                "Please switch your wallet to Polygon Mainnet."
            );
        }

        const provider =
            walletProvider ||
            await initializeWalletProvider();

        validateWalletProvider(provider);

        const address =
            await getConnectedAddress(provider);

        if (
            address.toLowerCase() !==
            account.toLowerCase()
        ) {
            throw new Error(
                "Wallet account mismatch."
            );
        }

        const browser =
            await createBrowserProvider(provider);

        const network =
            await browser.getNetwork();

        if (
            Number(network.chainId) !== CONFIG.chainId
        ) {
            throw new Error(
                "Provider is not connected to Polygon Mainnet."
            );
        }

        walletChainId = Number(network.chainId);

        return {
            connected: true,
            address,
            chainId: walletChainId,
            provider
        };

    } catch (error) {
        return {
            connected: false,
            address: Wallet.getAddress() || null,
            provider: Transaction.getWalletProvider(),
            error: error?.message ||
                "Wallet connection failed."
        };
    }
}
