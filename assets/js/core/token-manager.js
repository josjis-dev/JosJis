
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
// MEMBUAT KONTRAK ERC20
// =====================================

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
// INFORMASI TOKEN
// =====================================

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

    return rpcRequest(async provider => {
        const contract = getTokenContract(
            tokenName,
            provider
        );

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
// SALDO POL
// =====================================

export async function getNativeBalance(address) {
    if (!address) {
        throw new Error("Alamat wallet belum tersedia.");
    }

    return rpcRequest(async provider => {
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
// SALDO TOKEN ERC20
// =====================================

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
// SEMUA SALDO ASET
// =====================================

export async function getAllBalances(address) {
    if (!address) {
        throw new Error("Alamat wallet belum tersedia.");
    }

    const results = await Promise.allSettled([
        getTokenBalance("JJS", address),
        getNativeBalance(address),
        getTokenBalance("USDT0", address)
    ]);

    const output = {
        JJS: null,
        POL: null,
        USDT0: null
    };

    const keys = ["JJS", "POL", "USDT0"];

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
// TOTAL SUPPLY
// =====================================

export async function getTotalSupply(tokenName) {
    return rpcRequest(async provider => {
        const contract = getTokenContract(
            tokenName,
            provider
        );

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
// ALLOWANCE
// =====================================

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
// EKSPOR KONFIGURASI TOKEN
// =====================================

export {
    CONTRACTS,
    NATIVE_TOKEN
};
