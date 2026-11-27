
/**
 * JosJis Staking
 * Module: Wallet
 * Version: V5 Universal Provider Fix
 * Network: Polygon Mainnet
 */

import {
    BrowserProvider,
    Contract
} from "https://esm.sh/ethers@6.15.0";

import {
    modal
} from "../../../web3/web3-config.js";

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

const providerAdapters = new WeakMap();

const ADAPTER_MARKER = Symbol("JJS_EIP1193_ADAPTER");

const POLYGON_CAIP2 = `eip155:${CONFIG.chainId}`;

/* =========================================
   PROVIDER ADAPTER
========================================= */

function createProviderAdapter(provider) {
    if (!provider) {
        throw new Error("Wallet provider is unavailable.");
    }

    if (provider[ADAPTER_MARKER]) {
        return provider;
    }

    if (typeof provider.request !== "function") {
        throw new Error(
            "Invalid wallet provider: request() is unavailable."
        );
    }

    if (providerAdapters.has(provider)) {
        return providerAdapters.get(provider);
    }

    /*
     * WalletConnect Universal Provider requires
     * an explicit CAIP-2 chain argument.
     */
    const isUniversalProvider =
        Boolean(
            provider.rpcProviders &&
            typeof provider.setDefaultChain === "function"
        );

    const adapter = {
        [ADAPTER_MARKER]: true,

        request(args) {
            if (!args || typeof args.method !== "string") {
                throw new Error("Invalid JSON-RPC request.");
            }

            if (isUniversalProvider) {
                return provider.request(
                    args,
                    POLYGON_CAIP2
                );
            }

            return provider.request(args);
        },

        on(event, listener) {
            if (typeof provider.on === "function") {
                provider.on(event, listener);
            }

            return adapter;
        },

        removeListener(event, listener) {
            if (typeof provider.removeListener === "function") {
                provider.removeListener(event, listener);
            } else if (typeof provider.off === "function") {
                provider.off(event, listener);
            }

            return adapter;
        },

        off(event, listener) {
            if (typeof provider.off === "function") {
                provider.off(event, listener);
            } else if (typeof provider.removeListener === "function") {
                provider.removeListener(event, listener);
            }

            return adapter;
        },

        isConnected() {
            if (typeof provider.isConnected === "function") {
                return provider.isConnected();
            }

            return true;
        }
    };

    providerAdapters.set(provider, adapter);

    return adapter;
}

/* =========================================
   PROVIDER VALIDATION
========================================= */

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

export function setWalletProvider(provider) {
    if (!provider) {
        clearWalletSession();
        return false;
    }

    validateWalletProvider(provider);

    const adapter = createProviderAdapter(provider);

    if (walletProvider !== adapter) {
        browserProvider = null;
        walletSigner = null;
        walletAddress = null;
    }

    rawWalletProvider =
        provider[ADAPTER_MARKER]
            ? rawWalletProvider
            : provider;

    walletProvider = adapter;

    console.log(
        "[JJS Wallet] EIP-1193 provider initialized."
    );

    console.log(
        "[JJS Wallet] Universal Provider:",
        Boolean(
            rawWalletProvider?.rpcProviders &&
            typeof rawWalletProvider?.setDefaultChain === "function"
        )
    );

    return true;
}

/* =========================================
   GET WALLET PROVIDER
========================================= */

export function getWalletProvider() {
    return walletProvider;
}

/* =========================================
   SYNCHRONIZE APPKIT ACCOUNT
========================================= */

export function syncAppKitAccount(accountAddress = null) {
    try {
        const address =
            modal.getAddress() || accountAddress;

        const chainId = modal.getChainId();

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

export async function initializeWalletProvider() {
    if (providerInitialization) {
        return providerInitialization;
    }

    providerInitialization = (async () => {
        try {
            /*
             * Reuse an existing provider first.
             */
            if (walletProvider) {
                return walletProvider;
            }

            /*
             * Fallback to an injected provider.
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
                        modal.getAddress();

                    if (
                        Array.isArray(accounts) &&
                        accounts.length > 0 &&
                        appKitAddress &&
                        accounts[0].toLowerCase() ===
                        appKitAddress.toLowerCase()
                    ) {
                        setWalletProvider(injectedProvider);

                        console.log(
                            "[JJS Wallet] Matching injected provider found."
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

export function subscribeWalletProvider(callback = () => {}) {
    if (providerUnsubscribe) {
        return providerUnsubscribe;
    }

    if (
        typeof modal.subscribeProviders === "function"
    ) {
        providerUnsubscribe =
            modal.subscribeProviders((providers) => {
                const provider =
                    providers?.eip155 ||
                    providers?.["eip155"] ||
                    null;

                if (!provider) return;

                try {
                    setWalletProvider(provider);

                    callback(walletProvider, null);

                } catch (error) {
                    callback(null, error);
                }
            });
    }

    initializeWalletProvider().then(provider => {
        if (provider) {
            callback(provider, null);
        }
    });

    return providerUnsubscribe;
}

/* =========================================
   SUBSCRIBE APPKIT ACCOUNT
========================================= */

export function subscribeWalletAccount(callback = () => {}) {
    if (accountUnsubscribe) {
        return accountUnsubscribe;
    }

    if (typeof modal.subscribeAccount !== "function") {
        return null;
    }

    accountUnsubscribe =
        modal.subscribeAccount(account => {
            if (account?.address) {
                syncAppKitAccount(account.address);

                initializeWalletProvider().then(provider => {
                    callback({
                        ...account,
                        address: account.address,
                        provider
                    });
                });

            } else if (account?.isConnected === false) {
                clearWalletSession();

                callback({
                    ...account,
                    address: null,
                    provider: null
                });
            }
        });

    return accountUnsubscribe;
}

/* =========================================
   SUBSCRIBE APPKIT NETWORK
========================================= */

export function subscribeWalletNetwork(callback = () => {}) {
    if (networkUnsubscribe) {
        return networkUnsubscribe;
    }

    if (typeof modal.subscribeNetwork !== "function") {
        return null;
    }

    networkUnsubscribe =
        modal.subscribeNetwork(network => {
            const chainId = modal.getChainId();

            walletChainId =
                chainId !== undefined && chainId !== null
                    ? Number(chainId)
                    : null;

            callback({
                ...network,
                chainId: walletChainId
            });
        });

    return networkUnsubscribe;
}

/* =========================================
   SUBSCRIBE APPKIT STATE
========================================= */

export function subscribeWalletState(callback = () => {}) {
    if (stateUnsubscribe) {
        return stateUnsubscribe;
    }

    if (typeof modal.subscribeState !== "function") {
        return null;
    }

    stateUnsubscribe =
        modal.subscribeState(() => {
            const session = syncAppKitAccount();

            callback(session);
        });

    return stateUnsubscribe;
}

/* =========================================
   INITIALIZE APPKIT LISTENERS
========================================= */

export function initializeWalletListeners(callbacks = {}) {
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

export async function createBrowserProvider(
    provider = walletProvider
) {
    validateWalletProvider(provider);

    if (
        !browserProvider ||
        walletProvider !== provider
    ) {
        browserProvider = new BrowserProvider(
            provider,
            "any"
        );
    }

    return browserProvider;
}

/* =========================================
   GET CONNECTED WALLET ADDRESS
========================================= */

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

    const address = modal.getAddress();

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

export async function getWalletSigner(
    provider = walletProvider
) {
    if (!provider) {
        provider = await initializeWalletProvider();
    }

    if (!provider) {
        throw new Error(
            "Wallet transaction provider is unavailable."
        );
    }

    const currentBrowserProvider =
        await createBrowserProvider(provider);

    const network =
        await currentBrowserProvider.getNetwork();

    if (Number(network.chainId) !== CONFIG.chainId) {
        throw new Error(
            "Please switch your wallet to Polygon Mainnet."
        );
    }

    walletSigner =
        await currentBrowserProvider.getSigner();

    walletAddress =
        await walletSigner.getAddress();

    return walletSigner;
}

/* =========================================
   GET SIGNER CONTRACTS
========================================= */

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
        await currentBrowserProvider.getSigner();

    const address =
        await signer.getAddress();

    const appKitAddress = modal.getAddress();

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

export function getWalletSession() {
    return {
        walletProvider,
        rawWalletProvider,
        browserProvider,
        walletSigner,
        walletAddress,
        walletChainId,

        connected: Boolean(
            modal.getAddress() ||
            walletAddress
        ),

        providerReady: Boolean(walletProvider)
    };
}

/* =========================================
   CLEAR WALLET SESSION
========================================= */

export function clearWalletSession() {
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

export async function checkWalletConnection() {
    try {
        const account = modal.getAddress();

        if (!account) {
            throw new Error(
                "Wallet is not connected."
            );
        }

        const chainId = modal.getChainId();

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

        if (Number(network.chainId) !== CONFIG.chainId) {
            throw new Error(
                "Provider is not connected to Polygon Mainnet."
            );
        }

        return {
            connected: true,
            address,
            chainId: Number(network.chainId),
            provider
        };

    } catch (error) {
        return {
            connected: false,
            address: modal.getAddress() || null,
            provider: walletProvider,
            error: error?.message ||
                "Wallet connection failed."
        };
    }
}
