
/**
 * JosJis Ecosystem
 * Module: Token Manager
 *
 * Purpose:
 * Provides read-only access to ERC20 tokens and the native POL asset
 * on the Polygon network.
 *
 * Responsibilities:
 * - Create ERC20 contract instances.
 * - Retrieve token metadata.
 * - Retrieve native POL balances.
 * - Retrieve ERC20 token balances.
 * - Retrieve balances for all supported assets.
 * - Retrieve token total supply.
 * - Retrieve ERC20 spending allowances.
 *
 * RPC Handling:
 * All blockchain read operations are executed through rpcRequest().
 * This allows the RPC Manager to handle provider selection and failover.
 *
 * Dependencies:
 * - ethers.js: Contract and formatUnits
 * - contract-registry.js: Token addresses, ABIs, and native token metadata
 * - rpc-manager.js: Managed RPC requests
 *
 * Important:
 * This module performs read-only blockchain operations.
 * It does not send transactions or modify blockchain state.
 */

import {
    Contract,
    formatUnits
} from "https://esm.sh/ethers@6.15.0";

import {
    CONTRACTS,
    ABIS,
    NATIVE_TOKEN
} from "./contract-registry.js";

import {
    rpcRequest
} from "./rpc-manager.js";

/*
========================================
 TOKEN MANAGER
 JosJis Ecosystem
========================================
*/

// =====================================
// ERC20 CONTRACT CREATION
// =====================================

/**
 * Creates an ERC20 contract instance for the requested token.
 *
 * @param {string} tokenName - Registered token identifier.
 * @param {object} provider - Ethers-compatible RPC provider.
 * @returns {Contract} Connected ERC20 contract instance.
 *
 * @throws {Error} If the token is not registered.
 * @throws {Error} If the token is not an ERC20 asset.
 * @throws {Error} If the RPC provider is unavailable.
 */
export function getTokenContract(tokenName, provider) {
    const token = CONTRACTS[tokenName];

    if (!token) {
        throw new Error(`Token ${tokenName} tidak terdaftar.`);
    }

    if (token.type !== "ERC20") {
        throw new Error(`${tokenName} bukan token ERC20.`);
    }

    if (!provider) {
        throw new Error("RPC provider belum tersedia.");
    }

    return new Contract(
        token.address,
        ABIS.ERC20,
        provider
    );
}

// =====================================
// TOKEN INFORMATION
// =====================================

/**
 * Retrieves metadata for a registered token.
 *
 * For native assets, metadata is read from NATIVE_TOKEN.
 * For ERC20 assets, metadata is retrieved from the blockchain.
 *
 * @param {string} tokenName - Registered token identifier.
 * @returns {Promise<object>} Token metadata.
 *
 * @throws {Error} If the token is not registered.
 */
export async function getTokenDetails(tokenName) {
    const token = CONTRACTS[tokenName];

    if (!token) {
        throw new Error(`Token ${tokenName} tidak terdaftar.`);
    }

    // Native assets use locally registered metadata.
    if (token.type === "NATIVE") {
        return {
            name: NATIVE_TOKEN.name,
            symbol: NATIVE_TOKEN.symbol,
            decimals: NATIVE_TOKEN.decimals,
            address: null,
            type: "NATIVE"
        };
    }

    // ERC20 metadata is retrieved through the managed RPC provider.
    return rpcRequest(async provider => {
        const contract = getTokenContract(
            tokenName,
            provider
        );

        // Retrieve token metadata concurrently.
        const [name, symbol, decimals] =
            await Promise.all([
                contract.name(),
                contract.symbol(),
                contract.decimals()
            ]);

        return {
            name,
            symbol,
            decimals: Number(decimals),
            address: token.address,
            type: "ERC20"
        };
    });
}

// =====================================
// NATIVE POL BALANCE
// =====================================

/**
 * Retrieves the native POL balance of a wallet.
 *
 * @param {string} address - Wallet address.
 * @returns {Promise<object>} Raw and formatted balance with token symbol.
 *
 * @throws {Error} If the wallet address is unavailable.
 */
export async function getNativeBalance(address) {
    if (!address) {
        throw new Error("Alamat wallet belum tersedia.");
    }

    return rpcRequest(async provider => {
        // Retrieve the native balance in its smallest unit.
        const balance = await provider.getBalance(address);

        return {
            raw: balance,
            formatted: formatUnits(
                balance,
                NATIVE_TOKEN.decimals
            ),
            symbol: NATIVE_TOKEN.symbol
        };
    });
}

// =====================================
// ERC20 TOKEN BALANCE
// =====================================

/**
 * Retrieves the balance of a registered ERC20 token.
 *
 * @param {string} tokenName - Registered token identifier.
 * @param {string} address - Wallet address.
 * @returns {Promise<object>} Raw and formatted token balance.
 *
 * @throws {Error} If the wallet address is unavailable.
 * @throws {Error} If the token is not registered.
 */
export async function getTokenBalance(tokenName, address) {
    if (!address) {
        throw new Error("Alamat wallet belum tersedia.");
    }

    const token = CONTRACTS[tokenName];

    if (!token) {
        throw new Error(`Token ${tokenName} tidak terdaftar.`);
    }

    return rpcRequest(async provider => {
        const contract = getTokenContract(
            tokenName,
            provider
        );

        // Retrieve the wallet balance and token decimals concurrently.
        const [balance, decimals] =
            await Promise.all([
                contract.balanceOf(address),
                contract.decimals()
            ]);

        return {
            raw: balance,
            formatted: formatUnits(balance, decimals),
            symbol: token.symbol,
            address: token.address
        };
    });
}

// =====================================
// ALL SUPPORTED ASSET BALANCES
// =====================================

/**
 * Retrieves balances for all supported JosJis dashboard assets.
 *
 * Supported assets:
 * - JJS: JosJis ERC20 token.
 * - POL: Polygon native asset.
 * - USDT0: ERC20 stablecoin.
 *
 * Promise.allSettled() allows individual balance requests to fail
 * without preventing the other asset balances from being returned.
 *
 * @param {string} address - Wallet address.
 * @returns {Promise<object>} Balance results for JJS, POL, and USDT0.
 *
 * @throws {Error} If the wallet address is unavailable.
 */
export async function getAllBalances(address) {
    if (!address) {
        throw new Error("Alamat wallet belum tersedia.");
    }

    // Request all supported asset balances concurrently.
    const results = await Promise.allSettled([
        getTokenBalance("JJS", address),
        getNativeBalance(address),
        getTokenBalance("USDT0", address)
    ]);

    // Initialize the balance response structure.
    const output = {
        JJS: null,
        POL: null,
        USDT0: null
    };

    // Keep the result keys aligned with the request order above.
    const keys = ["JJS", "POL", "USDT0"];

    // Store successful results or individual error messages.
    results.forEach((result, index) => {
        const key = keys[index];

        if (result.status === "fulfilled") {
            output[key] = result.value;
        } else {
            output[key] = {
                error: result.reason?.message ||
                    "Gagal mengambil saldo."
            };
        }
    });

    return output;
}

// =====================================
// TOKEN TOTAL SUPPLY
// =====================================

/**
 * Retrieves the total supply of a registered ERC20 token.
 *
 * The raw supply is converted into a human-readable value
 * using the token's on-chain decimal configuration.
 *
 * @param {string} tokenName - Registered token identifier.
 * @returns {Promise<object>} Raw and formatted total supply.
 */
export async function getTotalSupply(tokenName) {
    return rpcRequest(async provider => {
        const contract = getTokenContract(
            tokenName,
            provider
        );

        // Retrieve total supply and token decimals concurrently.
        const [supply, decimals] =
            await Promise.all([
                contract.totalSupply(),
                contract.decimals()
            ]);

        return {
            raw: supply,
            formatted: formatUnits(supply, decimals)
        };
    });
}

// =====================================
// ERC20 SPENDING ALLOWANCE
// =====================================

/**
 * Retrieves the ERC20 allowance granted by an owner to a spender.
 *
 * This function only reads the current allowance.
 * It does not request or submit an approval transaction.
 *
 * @param {string} tokenName - Registered token identifier.
 * @param {string} owner - Token owner's wallet address.
 * @param {string} spender - Address authorized to spend tokens.
 * @returns {Promise<object>} Raw and formatted allowance.
 *
 * @throws {Error} If the owner or spender address is unavailable.
 */
export async function getAllowance(
    tokenName,
    owner,
    spender
) {
    if (!owner || !spender) {
        throw new Error(
            "Alamat owner atau spender belum tersedia."
        );
    }

    return rpcRequest(async provider => {
        const contract = getTokenContract(
            tokenName,
            provider
        );

        // Retrieve the allowance and token decimals concurrently.
        const [allowance, decimals] =
            await Promise.all([
                contract.allowance(owner, spender),
                contract.decimals()
            ]);

        return {
            raw: allowance,
            formatted: formatUnits(allowance, decimals)
        };
    });
}

// =====================================
// TOKEN CONFIGURATION EXPORTS
// =====================================

// Re-export token registry configuration for other modules.
export {
    CONTRACTS,
    NATIVE_TOKEN
};
