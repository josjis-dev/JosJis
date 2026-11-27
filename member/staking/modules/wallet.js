
/**
 * JosJis Staking
 * Module: Wallet
 * Version: V4 AppKit Integration
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

    if (walletProvider !== provider) {
        browserProvider = null;
        walletSigner = null;
        walletAddress = null;
    }

    walletProvider = provider;

    console.log(
        "[JJS Wallet] EVM provider initialized."
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
            // Retrieve the provider directly from AppKit.
            if (
                typeof modal.getWalletProvider === "function"
            ) {
                const provider =
                    await modal.getWalletProvider();

                if (provider) {
                    setWalletProvider(provider);

                    console.log(
                        "[JJS Wallet] Provider obtained directly."
                    );

                    return provider;
                }
            }

            // Fallback: inspect the connected EIP-1193 provider.
            if (typeof window !== "undefined") {
                const provider = window.ethereum;

                if (provider) {
                    const accounts = await provider.request({
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
                        setWalletProvider(provider);

                        console.log(
                            "[JJS Wallet] Provider obtained from matching wallet session."
                        );

                        return provider;
                    }
                }
            }

            console.warn(
                "[JJS Wallet] EVM provider is not available."
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
            modal.subscribeProviders(async (state) => {
                const provider =
                    state?.eip155 || null;

                if (provider) {
                    try {
                        setWalletProvider(provider);
                        callback(provider, null);
                    } catch (error) {
                        callback(null, error);
                    }
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

    accountUnsubscribe = modal.subscribeAccount(account => {
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

    networkUnsubscribe = modal.subscribeNetwork(network => {
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

    stateUnsubscribe = modal.subscribeState(() => {
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

    const currentBrowserProvider =
        await createBrowserProvider(provider);

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

    const signer =
        await currentBrowserProvider.getSigner();

    const address =
        await signer.getAddress();

    const network =
        await currentBrowserProvider.getNetwork();

    const chainId = Number(network.chainId);

    if (chainId !== CONFIG.chainId) {
        throw new Error(
            "Please switch your wallet to Polygon Mainnet."
        );
    }

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
        browserProvider,
        walletSigner,
        walletAddress,
        walletChainId,
        connected: Boolean(
            modal.getAddress() ||
            walletAddress
        )
    };
}

/* =========================================
   CLEAR WALLET SESSION
========================================= */

export function clearWalletSession() {
    walletProvider = null;
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

        return {
            connected: true,
            address,
            chainId: Number(chainId),
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
