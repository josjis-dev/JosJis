
import {
    Contract,
    BrowserProvider,
    parseUnits,
    formatUnits
} from "https://esm.sh/ethers@6.15.0";

import {
    CONTRACTS,
    ABIS,
    NETWORK
} from "./contract-registry.js";

import {
    getAddress,
    getChainId
} from "./wallet-manager.js";

import {
    rpcRequest
} from "./rpc-manager.js";

import { modal } from "../../../web3/web3-config.js";

/*
========================================
 JOSJIS TRANSACTION MANAGER
 Central Wallet Signer
========================================
*/

const POLYGON_CAIP2 = `eip155:${NETWORK.CHAIN_ID}`;

let rawWalletProvider = null;
let walletProvider = null;
let browserProvider = null;
let walletSigner = null;
let signerAddress = null;

const adapterCache = new WeakMap();
const ADAPTER_MARKER = Symbol.for(
    "JOSJIS_CORE_EIP1193_ADAPTER"
);

/* =====================================
   WALLET VALIDATION
===================================== */

function validateWallet() {
    const address = getAddress();

    if (!address) {
        throw new Error("Wallet belum terhubung.");
    }

    if (Number(getChainId()) !== NETWORK.CHAIN_ID) {
        throw new Error("Silakan gunakan jaringan Polygon.");
    }

    return address;
}

function validateAddress(address) {
    if (
        !address ||
        !/^0x[a-fA-F0-9]{40}$/.test(address)
    ) {
        throw new Error("Alamat wallet tidak valid.");
    }
}

/* =====================================
   PROVIDER DETECTION
===================================== */

function isUniversalProvider(provider) {
    return Boolean(
        provider &&
        provider.rpcProviders &&
        typeof provider.request === "function"
    );
}

function createProviderAdapter(provider) {
    if (!provider || typeof provider.request !== "function") {
        throw new Error("Wallet provider tidak valid.");
    }

    if (provider[ADAPTER_MARKER]) {
        return provider;
    }

    if (adapterCache.has(provider)) {
        return adapterCache.get(provider);
    }

    const universal = isUniversalProvider(provider);

    const adapter = {
        [ADAPTER_MARKER]: true,

        request(args) {
            if (!args || typeof args.method !== "string") {
                throw new Error("JSON-RPC request tidak valid.");
            }

            if (universal) {
                return provider.request(args, POLYGON_CAIP2);
            }

            return provider.request(args);
        },

        on(event, listener) {
            provider.on?.(event, listener);
            return adapter;
        },

        removeListener(event, listener) {
            if (typeof provider.removeListener === "function") {
                provider.removeListener(event, listener);
            } else {
                provider.off?.(event, listener);
            }

            return adapter;
        },

        off(event, listener) {
            if (typeof provider.off === "function") {
                provider.off(event, listener);
            } else {
                provider.removeListener?.(event, listener);
            }

            return adapter;
        }
    };

    adapterCache.set(provider, adapter);

    return adapter;
}

/* =====================================
   SET WALLET PROVIDER
===================================== */

export function setWalletProvider(provider) {
    if (!provider) {
        clearWalletSession();
        return false;
    }

    const adapter = createProviderAdapter(provider);

    if (walletProvider !== adapter) {
        rawWalletProvider = provider;
        walletProvider = adapter;

        browserProvider = null;
        walletSigner = null;
        signerAddress = null;
    }

    return true;
}

/* =====================================
   GET WALLET PROVIDER
===================================== */

export function getWalletProvider() {
    return walletProvider;
}

/* =====================================
   CLEAR WALLET SESSION
===================================== */

export function clearWalletSession() {
    rawWalletProvider = null;
    walletProvider = null;

    browserProvider = null;
    walletSigner = null;
    signerAddress = null;
}

/* =====================================
   FIND WALLET PROVIDER
===================================== */

async function findWalletProvider() {
    if (walletProvider) {
        return walletProvider;
    }

    const expectedAddress = getAddress();

    /*
     * First try the AppKit provider API.
     */

    if (typeof modal.getWalletProvider === "function") {
        try {
            const provider = await modal.getWalletProvider();

            if (provider) {
                setWalletProvider(provider);
                return walletProvider;
            }
        } catch (error) {
            console.warn(
                "[JosJis Core] AppKit provider unavailable:",
                error.message
            );
        }
    }

    /*
     * Fallback to an injected provider only
     * when its account matches the AppKit account.
     */

    if (typeof window !== "undefined" && window.ethereum) {
        const provider = window.ethereum;

        if (typeof provider.request === "function") {
            const accounts = await provider.request({
                method: "eth_accounts"
            });

            if (
                Array.isArray(accounts) &&
                accounts.length > 0 &&
                expectedAddress &&
                accounts[0].toLowerCase() ===
                    expectedAddress.toLowerCase()
            ) {
                setWalletProvider(provider);
                return walletProvider;
            }
        }
    }

    throw new Error(
        "Provider transaksi tidak tersedia. Hubungkan wallet melalui MetaMask atau AppKit."
    );
}

/* =====================================
   GET BROWSER PROVIDER
===================================== */

export async function getBrowserProvider() {
    const provider = await findWalletProvider();

    if (!browserProvider) {
        browserProvider = new BrowserProvider(
            provider,
            "any"
        );
    }

    return browserProvider;
}

/* =====================================
   GET WALLET SIGNER
===================================== */

export async function getWalletSigner() {
    const expectedAddress = validateWallet();

    const provider = await getBrowserProvider();

    const network = await provider.getNetwork();

    if (Number(network.chainId) !== NETWORK.CHAIN_ID) {
        clearWalletSession();

        throw new Error(
            "Provider wallet tidak menggunakan Polygon Mainnet."
        );
    }

    const accounts = await walletProvider.request({
        method: "eth_accounts"
    });

    if (
        !Array.isArray(accounts) ||
        accounts.length === 0
    ) {
        throw new Error("Akun wallet tidak tersedia.");
    }

    if (
        accounts[0].toLowerCase() !==
        expectedAddress.toLowerCase()
    ) {
        clearWalletSession();

        throw new Error(
            "Alamat wallet berbeda dengan akun AppKit."
        );
    }

    if (
        !walletSigner ||
        !signerAddress ||
        signerAddress.toLowerCase() !==
            expectedAddress.toLowerCase()
    ) {
        walletSigner = await provider.getSigner();
        signerAddress = await walletSigner.getAddress();
    }

    if (
        signerAddress.toLowerCase() !==
        expectedAddress.toLowerCase()
    ) {
        clearWalletSession();

        throw new Error(
            "Signer tidak cocok dengan alamat wallet aktif."
        );
    }

    return walletSigner;
}

/* =====================================
   GET SIGNER SESSION
===================================== */

export async function getSignerSession() {
    const signer = await getWalletSigner();

    return {
        signer,
        address: await signer.getAddress(),
        provider: await getBrowserProvider(),
        chainId: NETWORK.CHAIN_ID
    };
}

/* =====================================
   GET WRITABLE ERC20 TOKEN
===================================== */

async function getWritableToken(tokenName) {
    const token = CONTRACTS[tokenName];

    if (!token || token.type !== "ERC20") {
        throw new Error("Token tidak valid.");
    }

    const signer = await getWalletSigner();

    return new Contract(
        token.address,
        ABIS.ERC20,
        signer
    );
}

/* =====================================
   TOKEN AMOUNT
===================================== */

function parseTokenAmount(tokenName, amount) {
    const token = CONTRACTS[tokenName];

    if (!token) {
        throw new Error("Token tidak terdaftar.");
    }

    if (
        amount === null ||
        amount === undefined ||
        String(amount).trim() === "" ||
        !Number.isFinite(Number(amount)) ||
        Number(amount) <= 0
    ) {
        throw new Error("Jumlah token harus lebih dari nol.");
    }

    return parseUnits(
        String(amount),
        token.decimals
    );
}

/* =====================================
   TRANSFER ERC20
===================================== */

export async function transferToken(
    tokenName,
    recipient,
    amount
) {
    validateWallet();
    validateAddress(recipient);

    const contract = await getWritableToken(tokenName);
    const value = parseTokenAmount(tokenName, amount);

    const tx = await contract.transfer(recipient, value);

    return {
        hash: tx.hash,
        wait: () => tx.wait()
    };
}

/* =====================================
   TRANSFER NATIVE POL
===================================== */

export async function transferNative(
    recipient,
    amount
) {
    validateWallet();
    validateAddress(recipient);

    if (
        !Number.isFinite(Number(amount)) ||
        Number(amount) <= 0
    ) {
        throw new Error("Jumlah POL harus lebih dari nol.");
    }

    const signer = await getWalletSigner();

    const value = parseUnits(String(amount), 18);

    const tx = await signer.sendTransaction({
        to: recipient,
        value
    });

    return {
        hash: tx.hash,
        wait: () => tx.wait()
    };
}

/* =====================================
   APPROVE TOKEN
===================================== */

export async function approveToken(
    tokenName,
    spender,
    amount
) {
    validateWallet();
    validateAddress(spender);

    const contract = await getWritableToken(tokenName);
    const value = parseTokenAmount(tokenName, amount);

    const tx = await contract.approve(spender, value);

    return {
        hash: tx.hash,
        wait: () => tx.wait()
    };
}

/* =====================================
   APPROVE UNLIMITED
===================================== */

export async function approveUnlimited(
    tokenName,
    spender
) {
    validateWallet();
    validateAddress(spender);

    const contract = await getWritableToken(tokenName);

    const maxAmount =
        0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffn;

    const tx = await contract.approve(spender, maxAmount);

    return {
        hash: tx.hash,
        wait: () => tx.wait()
    };
}

/* =====================================
   CHECK ALLOWANCE
===================================== */

export async function checkAllowance(
    tokenName,
    owner,
    spender
) {
    const token = CONTRACTS[tokenName];

    if (!token || token.type !== "ERC20") {
        throw new Error("Token tidak valid.");
    }

    validateAddress(owner);
    validateAddress(spender);

    return rpcRequest(async provider => {
        const contract = new Contract(
            token.address,
            ABIS.ERC20,
            provider
        );

        const allowance = await contract.allowance(
            owner,
            spender
        );

        return {
            raw: allowance,
            formatted: formatUnits(
                allowance,
                token.decimals
            )
        };
    });
}

/* =====================================
   WAIT FOR TRANSACTION
===================================== */

export async function waitForTransaction(txHash) {
    if (!txHash) {
        throw new Error("Transaction hash tidak tersedia.");
    }

    const provider = await getBrowserProvider();

    const receipt = await provider.waitForTransaction(
        txHash,
        1
    );

    if (!receipt) {
        throw new Error("Receipt transaksi belum tersedia.");
    }

    return {
        hash: receipt.hash,
        status: receipt.status === 1 ? "success" : "failed",
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString()
    };
}

/* =====================================
   EXPLORER URL
===================================== */

export function getTransactionUrl(txHash) {
    if (!txHash) {
        throw new Error("Transaction hash tidak tersedia.");
    }

    return `${NETWORK.EXPLORER}/tx/${txHash}`;
}

export function getAddressUrl(address) {
    validateAddress(address);

    return `${NETWORK.EXPLORER}/address/${address}`;
}

/* =====================================
   WALLET SIGNER DIAGNOSTIC
===================================== */

export async function diagnoseWalletSigner() {
    try {
        const expectedAddress = validateWallet();

        const signer = await getWalletSigner();
        const actualAddress = await signer.getAddress();

        const provider = await getBrowserProvider();
        const network = await provider.getNetwork();

        return {
            success: true,
            walletAddress: expectedAddress,
            signerAddress: actualAddress,
            chainId: Number(network.chainId),
            matched:
                expectedAddress.toLowerCase() ===
                actualAddress.toLowerCase(),
            correctNetwork:
                Number(network.chainId) === NETWORK.CHAIN_ID
        };

    } catch (error) {
        return {
            success: false,
            error: error?.message || String(error)
        };
    }
}
