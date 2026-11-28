
/**
 * JosJis Staking
 * Module: Wallet
 * Version: V8 Core Integrated
 * Network: Polygon Mainnet
 *
 * Purpose:
 * Provides wallet connection and signer functionality
 * for the JosJis Staking module through JosJis Core.
 *
 * Core Integration:
 * - Wallet Manager handles the shared AppKit wallet session.
 * - Transaction Manager discovers and manages EVM providers.
 * - Transaction Manager creates BrowserProvider instances and signers.
 *
 * Responsibilities:
 * - Synchronize the AppKit wallet session.
 * - Subscribe to wallet, account, network, and provider changes.
 * - Retrieve the connected wallet provider and signer.
 * - Create staking-specific token and staking contracts.
 * - Validate the connected account and Polygon network.
 * - Keep local wallet references synchronized with JosJis Core.
 *
 * Important:
 * This module does not create an independent wallet connection.
 * It reuses the shared Reown AppKit instance and JosJis Core.
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

/**
 * Stores the current wallet provider references.
 */
let walletProvider = null;
let rawWalletProvider = null;

/**
 * Stores the local references to the Core-managed
 * BrowserProvider and wallet signer.
 */
let browserProvider = null;
let walletSigner = null;

/**
 * Stores the synchronized wallet account information.
 */
let walletAddress = null;
let walletChainId = null;

/**
 * Stores AppKit subscription cleanup functions.
 */
let providerUnsubscribe = null;
let accountUnsubscribe = null;
let networkUnsubscribe = null;
let stateUnsubscribe = null;

/**
 * Prevents duplicate provider initialization operations.
 */
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
    if (!provider) {
        return false;
    }

    return Boolean(
        provider.rpcProviders &&
        typeof provider.request === "function"
    );
}

/* =========================================
   PROVIDER VALIDATION
========================================= */

/**
 * Validates an EIP-1193-compatible wallet provider.
 *
 * @param {object} provider - Wallet provider to validate.
 * @returns {boolean} True if the provider is valid.
 * @throws {Error} If the provider is unavailable or invalid.
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
   SYNCHRONIZE LOCAL CORE REFERENCES
========================================= */

/**
 * Synchronizes local provider references with JosJis Core.
 *
 * Transaction Manager remains the owner of the actual provider,
 * BrowserProvider, and signer instances.
 */
function syncCoreProviderReferences() {
    walletProvider = Transaction.getWalletProvider();

    return walletProvider;
}

/**
 * Invalidates local BrowserProvider and signer references.
 *
 * The actual provider lifecycle remains managed by Transaction Manager.
 */
function invalidateLocalSignerReferences() {
    browserProvider = null;
    walletSigner = null;
}

/* =========================================
   SET WALLET PROVIDER
========================================= */

/**
 * Registers an AppKit or EIP-1193 provider through JosJis Core.
 *
 * Transaction Manager handles provider normalization and caching.
 *
 * @param {object} provider - Original or Core-managed provider.
 * @returns {boolean} True if the provider was registered.
 */
export function setWalletProvider(provider) {
    if (!provider) {
        clearWalletSession();
        return false;
    }

    validateWalletProvider(provider);

    const currentCoreProvider =
        Transaction.getWalletProvider();

    const alreadyCoreProvider =
        provider === currentCoreProvider;

    const previousProvider = currentCoreProvider;

    Transaction.setWalletProvider(provider);

    walletProvider = Transaction.getWalletProvider();

    if (!walletProvider) {
        throw new Error(
            "JosJis Core could not initialize the wallet provider."
        );
    }

    if (previousProvider !== walletProvider) {
        invalidateLocalSignerReferences();
        walletAddress = null;
    }

    if (!alreadyCoreProvider) {
        rawWalletProvider = provider;
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
 * @returns {object|null} Core-managed wallet provider.
 */
export function getWalletProvider() {
    return syncCoreProviderReferences();
}

/* =========================================
   SYNCHRONIZE APPKIT ACCOUNT
========================================= */

/**
 * Synchronizes local wallet information with the shared AppKit session.
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
            walletChainId = chainId != null
                ? Number(chainId)
                : null;

            invalidateLocalSignerReferences();

            return null;
        }

        const previousAddress = walletAddress;

        walletAddress = address;

        walletChainId =
            chainId !== undefined && chainId !== null
                ? Number(chainId)
                : null;

        if (
            previousAddress &&
            previousAddress.toLowerCase() !==
                address.toLowerCase()
        ) {
            invalidateLocalSignerReferences();
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
 * Initializes the wallet provider through JosJis Core.
 *
 * Provider discovery order is managed by Transaction Manager:
 * 1. Reuse an existing Core wallet provider.
 * 2. Request the EVM provider directly from Reown AppKit.
 * 3. Use a matching injected provider as a fallback.
 *
 * @returns {Promise<object|null>} Initialized Core wallet provider.
 */
export async function initializeWalletProvider() {
    if (providerInitialization) {
        return providerInitialization;
    }

    providerInitialization = (async () => {
        try {
            /*
             * First reuse an existing Core provider.
             */

            const existingProvider =
                Transaction.getWalletProvider();

            if (existingProvider) {
                walletProvider = existingProvider;

                return walletProvider;
            }

            /*
             * Ask Transaction Manager to discover the provider.
             *
             * getBrowserProvider() internally calls the Core provider
             * discovery process, including modal.getWalletProvider().
             */

            browserProvider =
                await Transaction.getBrowserProvider();

            walletProvider =
                Transaction.getWalletProvider();

            if (!walletProvider || !browserProvider) {
                throw new Error(
                    "AppKit EVM provider could not be initialized."
                );
            }

            console.log(
                "[JJS Wallet] AppKit provider initialized through Core."
            );

            return walletProvider;

        } catch (error) {
            console.error(
                "[JJS Wallet] Provider initialization error:",
                error
            );

            walletProvider =
                Transaction.getWalletProvider();

            return walletProvider || null;

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
        providers => {
            const provider =
                providers?.eip155 ||
                providers?.["eip155"] ||
                null;

            if (!subscriptionActive) {
                return;
            }

            if (!provider) {
                return;
            }

            try {
                setWalletProvider(provider);

                console.log(
                    "[JJS Wallet] Provider received through AppKit."
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
     * Initialize the provider already available in AppKit.
     */

    initializeWalletProvider().then(provider => {
        if (
            provider &&
            subscriptionActive
        ) {
            callback(provider, null);
        }
    }).catch(error => {
        if (subscriptionActive) {
            callback(null, error);
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
                }).catch(error => {
                    callback({
                        ...account,
                        address: account.address,
                        provider: null,
                        error: error?.message ||
                            "Wallet provider initialization failed."
                    });
                });

            } else if (
                account?.isConnected === false ||
                account?.address === undefined ||
                account?.address === null
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
             * Invalidate local signer references after a network change.
             * Transaction Manager continues to manage its provider.
             */

            invalidateLocalSignerReferences();

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
 * Subscribes to general AppKit state changes through Core.
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
 * If a provider is supplied, it is registered first.
 * If no provider is available, Transaction Manager performs
 * its own AppKit provider discovery.
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

    walletProvider =
        Transaction.getWalletProvider();

    return browserProvider;
}

/* =========================================
   GET CONNECTED WALLET ADDRESS
========================================= */

/**
 * Retrieves the connected wallet address.
 *
 * The EVM provider is preferred when available.
 * The shared AppKit account is used as a fallback.
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
 * Retrieves the wallet signer through JosJis Core.
 *
 * Transaction Manager handles provider discovery,
 * BrowserProvider creation, and signer validation.
 *
 * @param {object} provider - Optional provider to register first.
 * @returns {Promise<object>} Connected wallet signer.
 */
export async function getWalletSigner(provider = null) {
    if (provider) {
        setWalletProvider(provider);
    }

    /*
     * Ensure a Core-managed EVM provider is available.
     */

    walletProvider =
        Transaction.getWalletProvider();

    if (!walletProvider) {
        await initializeWalletProvider();
    }

    /*
     * Transaction Manager can discover the AppKit provider
     * even if local wallet state was previously empty.
     */

    walletSigner =
        await Transaction.getWalletSigner();

    walletProvider =
        Transaction.getWalletProvider();

    browserProvider =
        await Transaction.getBrowserProvider();

    walletAddress =
        await walletSigner.getAddress();

    const network =
        await browserProvider.getNetwork();

    walletChainId = Number(network.chainId);

    return walletSigner;
}

/* =========================================
   GET SIGNER CONTRACTS
========================================= */

/**
 * Creates staking-specific contracts using the Core-managed signer.
 *
 * Validation:
 * - Requires a connected AppKit account.
 * - Requires Polygon Mainnet.
 * - Requires a valid EVM provider.
 * - Requires the signer to match the AppKit account.
 *
 * @returns {Promise<object>} Provider, signer, address, and contracts.
 */
export async function getSignerContracts() {
    const appKitAddress = Wallet.getAddress();

    if (!appKitAddress) {
        throw new Error(
            "Wallet is not connected."
        );
    }

    const appKitChainId = Number(
        Wallet.getChainId()
    );

    if (appKitChainId !== CONFIG.chainId) {
        throw new Error(
            "Please switch your wallet to Polygon Mainnet."
        );
    }

    /*
     * Retrieve the signer through Transaction Manager.
     */

    const signer = await getWalletSigner();

    const currentBrowserProvider =
        await createBrowserProvider();

    const network =
        await currentBrowserProvider.getNetwork();

    const chainId = Number(network.chainId);

    if (chainId !== CONFIG.chainId) {
        throw new Error(
            "Provider is not connected to Polygon Mainnet."
        );
    }

    const address =
        await signer.getAddress();

    if (
        appKitAddress.toLowerCase() !==
        address.toLowerCase()
    ) {
        throw new Error(
            "Wallet account mismatch. Reconnect your wallet."
        );
    }

    /*
     * Create staking contracts using the validated signer.
     */

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

    walletProvider =
        Transaction.getWalletProvider();

    walletSigner = signer;
    browserProvider = currentBrowserProvider;

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

    const appKitAddress =
        Wallet.getAddress();

    const appKitChainId =
        Wallet.getChainId();

    return {
        walletProvider,
        rawWalletProvider,
        browserProvider,
        walletSigner,

        walletAddress:
            appKitAddress || walletAddress,

        walletChainId:
            appKitChainId != null
                ? Number(appKitChainId)
                : walletChainId,

        connected: Boolean(
            appKitAddress || walletAddress
        ),

        providerReady: Boolean(walletProvider)
    };
}

/* =========================================
   CLEAR WALLET SESSION
========================================= */

/**
 * Clears the staking wallet session and Core transaction references.
 *
 * This does not disconnect the wallet from Reown AppKit.
 */
export function clearWalletSession() {
    Transaction.clearWalletSession();

    walletProvider = null;
    rawWalletProvider = null;

    browserProvider = null;
    walletSigner = null;

    walletAddress = null;
    walletChainId = null;

    console.info(
        "[JJS Wallet] Local wallet session cleared."
    );
}

/* =========================================
   CHECK WALLET CONNECTION
========================================= */

/**
 * Validates the current wallet connection, account, and network.
 *
 * The provider is obtained through Transaction Manager,
 * which can request the EVM provider directly from AppKit.
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

        /*
         * Initialize the EVM provider through Core.
         */

        const provider =
            walletProvider ||
            await initializeWalletProvider();

        if (!provider) {
            throw new Error(
                "EVM wallet provider is unavailable."
            );
        }

        validateWalletProvider(provider);

        /*
         * Verify the provider account against AppKit.
         */

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

        /*
         * Verify the active provider network.
         */

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

        walletAddress = address;
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
