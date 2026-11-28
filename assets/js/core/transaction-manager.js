
/**
 * JosJis Ecosystem
 * Module: Transaction Manager
 *
 * Purpose:
 * Provides a centralized interface for wallet-connected blockchain
 * transactions on Polygon Mainnet.
 *
 * Responsibilities:
 * - Validate the active wallet and network.
 * - Detect and adapt EIP-1193 wallet providers.
 * - Manage the wallet provider, BrowserProvider, and signer.
 * - Verify that the active signer matches the AppKit account.
 * - Create writable ERC20 contract instances.
 * - Execute ERC20 and native POL transfers.
 * - Submit ERC20 approval transactions.
 * - Read ERC20 allowances through the RPC Manager.
 * - Wait for transaction confirmations.
 * - Generate PolygonScan URLs.
 * - Diagnose wallet signer connectivity.
 *
 * Provider Architecture:
 * - AppKit is the primary wallet provider source.
 * - An injected provider is used as a fallback when its account
 *   matches the active AppKit account.
 * - BrowserProvider provides ethers.js wallet integration.
 * - WalletSigner authorizes transactions.
 * - RPC Manager handles read-only blockchain requests.
 *
 * Security Notes:
 * - Wallet addresses are validated before transaction execution.
 * - The active network must match the configured Polygon chain ID.
 * - The signer address must match the active AppKit account.
 * - Transaction approval and transfer operations require
 *   explicit wallet authorization.
 *
 * Dependencies:
 * - ethers.js 6.15.0
 * - contract-registry.js
 * - wallet-manager.js
 * - rpc-manager.js
 * - web3-config.js
 */

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

// CAIP-2 network identifier used by Universal Provider requests.
const POLYGON_CAIP2 = `eip155:${NETWORK.CHAIN_ID}`;

// Active wallet provider references.
let rawWalletProvider = null;
let walletProvider = null;

// Cached ethers.js provider and signer instances.
let browserProvider = null;
let walletSigner = null;
let signerAddress = null;

// Cache provider adapters to avoid creating duplicate wrappers.
const adapterCache = new WeakMap();

// Marker used to identify providers already wrapped by this module.
const ADAPTER_MARKER = Symbol.for(
    "JOSJIS_CORE_EIP1193_ADAPTER"
);

/* =====================================
   WALLET VALIDATION
===================================== */

/**
 * Validates the active wallet connection and network.
 *
 * Checks:
 * - A wallet address must be available.
 * - The active chain must match the configured Polygon network.
 *
 * @returns {string} Active wallet address.
 * @throws {Error} If the wallet is disconnected or uses another network.
 */
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

/**
 * Validates an Ethereum-compatible hexadecimal address.
 *
 * @param {string} address - Address to validate.
 * @throws {Error} If the address format is invalid.
 */
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

/**
 * Checks whether a provider exposes the Universal Provider interface.
 *
 * Universal Providers require the CAIP-2 chain identifier
 * when sending JSON-RPC requests.
 *
 * @param {object} provider - EIP-1193 provider.
 * @returns {boolean} True if the provider matches the expected interface.
 */
function isUniversalProvider(provider) {
    return Boolean(
        provider &&
        provider.rpcProviders &&
        typeof provider.request === "function"
    );
}

/**
 * Creates a normalized EIP-1193 provider adapter.
 *
 * The adapter:
 * - Validates JSON-RPC request arguments.
 * - Adds the CAIP-2 identifier for Universal Providers.
 * - Forwards event subscription and removal methods.
 * - Caches the adapter for reuse.
 *
 * @param {object} provider - Original wallet provider.
 * @returns {object} Normalized provider adapter.
 * @throws {Error} If the provider does not support request().
 */
function createProviderAdapter(provider) {
    if (!provider || typeof provider.request !== "function") {
        throw new Error("Wallet provider tidak valid.");
    }

    // Avoid wrapping an adapter more than once.
    if (provider[ADAPTER_MARKER]) {
        return provider;
    }

    // Reuse an existing adapter when available.
    if (adapterCache.has(provider)) {
        return adapterCache.get(provider);
    }

    const universal = isUniversalProvider(provider);

    const adapter = {
        [ADAPTER_MARKER]: true,

        // Forward JSON-RPC requests to the original provider.
        request(args) {
            if (!args || typeof args.method !== "string") {
                throw new Error("JSON-RPC request tidak valid.");
            }

            if (universal) {
                return provider.request(args, POLYGON_CAIP2);
            }

            return provider.request(args);
        },

        // Forward provider event subscriptions.
        on(event, listener) {
            provider.on?.(event, listener);
            return adapter;
        },

        // Remove a registered provider event listener.
        removeListener(event, listener) {
            if (typeof provider.removeListener === "function") {
                provider.removeListener(event, listener);
            } else {
                provider.off?.(event, listener);
            }

            return adapter;
        },

        // Alternative event listener removal method.
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

/**
 * Sets the active wallet provider.
 *
 * Replacing the provider invalidates cached BrowserProvider and signer
 * instances so they can be recreated using the new provider.
 *
 * Passing an unavailable provider clears the current wallet session.
 *
 * @param {object} provider - EIP-1193 wallet provider.
 * @returns {boolean} Whether a provider was successfully configured.
 */
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

/**
 * Returns the currently configured normalized wallet provider.
 *
 * @returns {object|null} Active wallet provider adapter.
 */
export function getWalletProvider() {
    return walletProvider;
}

/* =====================================
   CLEAR WALLET SESSION
===================================== */

/**
 * Clears all cached wallet provider and signer references.
 *
 * This resets the local transaction session.
 */
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

/**
 * Finds an available wallet provider.
 *
 * Detection order:
 * 1. Reuse the currently configured provider.
 * 2. Request the provider from AppKit.
 * 3. Fall back to window.ethereum only if its active account
 *    matches the address reported by AppKit.
 *
 * @returns {Promise<object>} Normalized wallet provider.
 * @throws {Error} If no matching transaction provider is available.
 */
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

/**
 * Returns the ethers.js BrowserProvider for the active wallet.
 *
 * The BrowserProvider is created lazily and reused while the
 * underlying wallet provider remains unchanged.
 *
 * @returns {Promise<BrowserProvider>} Active browser provider.
 */
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

/**
 * Retrieves and validates the active wallet signer.
 *
 * Validation sequence:
 * 1. Validate the AppKit wallet address and configured network.
 * 2. Check the BrowserProvider network.
 * 3. Read the provider's active wallet account.
 * 4. Compare the provider account with the AppKit account.
 * 5. Retrieve or reuse the ethers.js signer.
 * 6. Verify that the signer address matches the expected address.
 *
 * @returns {Promise<object>} Validated ethers.js signer.
 * @throws {Error} If account, network, provider, or signer validation fails.
 */
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

    // Recreate the signer when no valid cached signer is available.
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

/**
 * Returns the validated signer session information.
 *
 * The session includes:
 * - ethers.js signer
 * - Active wallet address
 * - BrowserProvider instance
 * - Configured network chain ID
 *
 * @returns {Promise<object>} Validated signer session.
 */
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

/**
 * Creates an ERC20 contract connected to the active wallet signer.
 *
 * Unlike read-only contracts, this instance can submit transactions
 * after the wallet authorizes the requested operation.
 *
 * @param {string} tokenName - Registered token identifier.
 * @returns {Promise<Contract>} Signer-connected ERC20 contract.
 * @throws {Error} If the token is not a registered ERC20 asset.
 */
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

/**
 * Converts a human-readable token amount into its smallest unit.
 *
 * The decimal configuration is obtained from the token registry.
 * The amount must be a valid positive numeric value.
 *
 * @param {string} tokenName - Registered token identifier.
 * @param {string|number} amount - Human-readable token amount.
 * @returns {bigint} Token amount in its smallest unit.
 *
 * @throws {Error} If the token or amount is invalid.
 */
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

/**
 * Submits an ERC20 token transfer transaction.
 *
 * The wallet must authorize the transaction.
 *
 * @param {string} tokenName - Registered ERC20 token identifier.
 * @param {string} recipient - Destination wallet address.
 * @param {string|number} amount - Human-readable token amount.
 * @returns {Promise<object>} Transaction hash and wait function.
 *
 * @throws {Error} If wallet, recipient, token, or amount validation fails.
 */
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

/**
 * Submits a native POL transfer transaction.
 *
 * The amount is converted using 18 decimal places.
 * The wallet must authorize the transaction.
 *
 * @param {string} recipient - Destination wallet address.
 * @param {string|number} amount - Human-readable POL amount.
 * @returns {Promise<object>} Transaction hash and wait function.
 *
 * @throws {Error} If wallet, recipient, or amount validation fails.
 */
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

/**
 * Submits an ERC20 approval transaction.
 *
 * This grants the specified spender permission to use the approved
 * token amount according to the ERC20 allowance mechanism.
 *
 * @param {string} tokenName - Registered ERC20 token identifier.
 * @param {string} spender - Address receiving the allowance.
 * @param {string|number} amount - Human-readable approval amount.
 * @returns {Promise<object>} Transaction hash and wait function.
 *
 * @throws {Error} If wallet, spender, token, or amount validation fails.
 */
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

/**
 * Submits an ERC20 unlimited approval transaction.
 *
 * The approval amount is the maximum uint256 value.
 * This allows the spender to use the token balance without
 * requiring a new approval for each amount.
 *
 * Important:
 * Unlimited approvals can expose tokens to the approved spender.
 * Only approve trusted spender addresses.
 *
 * @param {string} tokenName - Registered ERC20 token identifier.
 * @param {string} spender - Address receiving the allowance.
 * @returns {Promise<object>} Transaction hash and wait function.
 *
 * @throws {Error} If wallet, spender, or token validation fails.
 */
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

/**
 * Reads the current ERC20 allowance between an owner and spender.
 *
 * This operation uses the RPC Manager and does not require
 * wallet transaction authorization.
 *
 * @param {string} tokenName - Registered ERC20 token identifier.
 * @param {string} owner - Token owner's wallet address.
 * @param {string} spender - Authorized spender address.
 * @returns {Promise<object>} Raw and formatted allowance.
 *
 * @throws {Error} If the token or either address is invalid.
 */
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

/**
 * Waits for a transaction to receive one block confirmation.
 *
 * Returns a normalized transaction receipt containing:
 * - Transaction hash
 * - Success or failure status
 * - Block number
 * - Gas used
 *
 * @param {string} txHash - Transaction hash.
 * @returns {Promise<object>} Normalized transaction receipt.
 *
 * @throws {Error} If the transaction hash or receipt is unavailable.
 */
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

/**
 * Generates a PolygonScan transaction URL.
 *
 * @param {string} txHash - Transaction hash.
 * @returns {string} PolygonScan transaction URL.
 * @throws {Error} If the transaction hash is unavailable.
 */
export function getTransactionUrl(txHash) {
    if (!txHash) {
        throw new Error("Transaction hash tidak tersedia.");
    }

    return `${NETWORK.EXPLORER}/tx/${txHash}`;
}

/**
 * Generates a PolygonScan wallet address URL.
 *
 * @param {string} address - Wallet address.
 * @returns {string} PolygonScan address URL.
 * @throws {Error} If the address format is invalid.
 */
export function getAddressUrl(address) {
    validateAddress(address);

    return `${NETWORK.EXPLORER}/address/${address}`;
}

/* =====================================
   WALLET SIGNER DIAGNOSTIC
===================================== */

/**
 * Diagnoses the active wallet signer session.
 *
 * Checks:
 * - Wallet connection availability.
 * - Signer address consistency.
 * - Active provider chain ID.
 * - Polygon network compatibility.
 *
 * Errors are returned as diagnostic data instead of being thrown.
 *
 * @returns {Promise<object>} Wallet signer diagnostic report.
 */
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
