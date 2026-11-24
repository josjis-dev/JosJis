
import {
    Contract,
    formatUnits
} from "https://esm.sh/ethers@6.15.0";

import {
    CONTRACTS,
    ABIS,
    NATIVE_TOKEN
} from "./contract-registry.js";

import { getProvider } from "./rpc-manager.js";

/*
========================================
 TOKEN MANAGER
 JosJis Ecosystem
========================================
*/

// Membuat instance kontrak ERC20
export function getTokenContract(tokenName) {
    const token = CONTRACTS[tokenName];

    if (!token) {
        throw new Error(`Token ${tokenName} tidak terdaftar.`);
    }

    if (token.type !== "ERC20") {
        throw new Error(`${tokenName} bukan token ERC20.`);
    }

    return new Contract(
        token.address,
        ABIS.ERC20,
        getProvider()
    );
}

// Mengambil informasi token
export async function getTokenDetails(tokenName) {
    const token = CONTRACTS[tokenName];

    if (!token) {
        throw new Error(`Token ${tokenName} tidak terdaftar.`);
    }

    if (token.type === "NATIVE") {
        return {
            name: NATIVE_TOKEN.name,
            symbol: NATIVE_TOKEN.symbol,
            decimals: NATIVE_TOKEN.decimals,
            address: null,
            type: "NATIVE"
        };
    }

    const contract = getTokenContract(tokenName);

    const [name, symbol, decimals] = await Promise.all([
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
}

// Mengambil saldo POL
export async function getNativeBalance(address) {
    if (!address) {
        throw new Error("Alamat wallet belum tersedia.");
    }

    const provider = getProvider();
    const balance = await provider.getBalance(address);

    return {
        raw: balance,
        formatted: formatUnits(balance, NATIVE_TOKEN.decimals),
        symbol: NATIVE_TOKEN.symbol
    };
}

// Mengambil saldo token ERC20
export async function getTokenBalance(tokenName, address) {
    if (!address) {
        throw new Error("Alamat wallet belum tersedia.");
    }

    const token = CONTRACTS[tokenName];

    if (!token) {
        throw new Error(`Token ${tokenName} tidak terdaftar.`);
    }

    const contract = getTokenContract(tokenName);

    const [balance, decimals] = await Promise.all([
        contract.balanceOf(address),
        contract.decimals()
    ]);

    return {
        raw: balance,
        formatted: formatUnits(balance, decimals),
        symbol: token.symbol,
        address: token.address
    };
}

// Mengambil saldo seluruh aset JosJis
export async function getAllBalances(address) {
    if (!address) {
        throw new Error("Alamat wallet belum tersedia.");
    }

    const results = await Promise.allSettled([
        getTokenBalance("JJS", address),
        getNativeBalance(address),
        getTokenBalance("USDT0", address)
    ]);

    return {
        JJS: results[0].status === "fulfilled"
            ? results[0].value
            : { error: results[0].reason.message },

        POL: results[1].status === "fulfilled"
            ? results[1].value
            : { error: results[1].reason.message },

        USDT0: results[2].status === "fulfilled"
            ? results[2].value
            : { error: results[2].reason.message }
    };
}

// Mengambil total supply token
export async function getTotalSupply(tokenName) {
    const token = getTokenContract(tokenName);

    const [supply, decimals] = await Promise.all([
        token.totalSupply(),
        token.decimals()
    ]);

    return {
        raw: supply,
        formatted: formatUnits(supply, decimals)
    };
}

// Memeriksa allowance
export async function getAllowance(
    tokenName,
    owner,
    spender
) {
    if (!owner || !spender) {
        throw new Error("Alamat owner atau spender belum tersedia.");
    }

    const contract = getTokenContract(tokenName);

    const [allowance, decimals] = await Promise.all([
        contract.allowance(owner, spender),
        contract.decimals()
    ]);

    return {
        raw: allowance,
        formatted: formatUnits(allowance, decimals)
    };
}

// Mengekspor konfigurasi token
export { CONTRACTS, NATIVE_TOKEN };
