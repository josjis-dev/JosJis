/**
 * JosJis Staking
 * Module: Wallet
 * Version: V2
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

    return true;
}

/* =========================================
   GET WALLET PROVIDER
========================================= */

export function getWalletProvider() {
    return walletProvider;
}

/* =========================================
   SUBSCRIBE APPKIT PROVIDER
========================================= */

export function subscribeWalletProvider(callback) {
    if (!modal) {
        throw new Error(
            "Reown AppKit modal is unavailable."
        );
    }

    if (typeof modal.subscribeProviders !== "function") {
        throw new Error(
            "Reown AppKit subscribeProviders() is unavailable."
        );
    }

    return modal.subscribeProviders((providers) => {
        try {
            const provider = providers?.eip155 || null;

            if (provider) {
                setWalletProvider(provider);
            } else {
                clearWalletSession();
            }

            if (typeof callback === "function") {
                callback(provider);
            }

        } catch (error) {
            console.error(
                "Wallet provider subscription error:",
                error
            );

            if (typeof callback === "function") {
                callback(null, error);
            }
        }
    });
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
    validateWalletProvider(provider);

    const accounts = await provider.request({
        method: "eth_accounts"
    });

    if (!Array.isArray(accounts) || accounts.length === 0) {
        walletAddress = null;
        walletSigner = null;

        throw new Error(
            "No connected wallet account found."
        );
    }

    walletAddress = accounts[0];

    return walletAddress;
}

/* =========================================
   GET SIGNER
========================================= */

export async function getWalletSigner(
    provider = walletProvider
) {
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
    const provider = walletProvider;

    validateWalletProvider(provider);

    const currentBrowserProvider =
        await createBrowserProvider(provider);

    const signer =
        await currentBrowserProvider.getSigner();

    const address =
        await signer.getAddress();

    const network =
        await currentBrowserProvider.getNetwork();

    if (Number(network.chainId) !== CONFIG.chainId) {
        throw new Error(
            "Please switch your wallet to Polygon Mainnet."
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
        connected: Boolean(
            walletProvider &&
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
}

/* =========================================
   CHECK WALLET CONNECTION
========================================= */

export async function checkWalletConnection() {
    try {
        if (!walletProvider) {
            throw new Error(
                "Wallet provider is not initialized."
            );
        }

        const address =
            await getConnectedAddress(walletProvider);

        return {
            connected: true,
            address,
            provider: walletProvider
        };

    } catch (error) {
        return {
            connected: false,
            address: null,
            provider: walletProvider,
            error: error?.message ||
                "Wallet is disconnected."
        };
    }
}
