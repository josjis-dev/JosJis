
import {
    Contract,
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

/*
========================================
 TRANSACTION MANAGER
 JosJis Ecosystem
========================================
*/

// Validate connected wallet
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

// Get signer from connected wallet
async function getWalletSigner() {
    validateWallet();

    const { modal } = await import(
        "../../../web3/web3-config.js"
    );

    if (typeof modal.getWalletProvider !== "function") {
        throw new Error(
            "AppKit getWalletProvider tidak tersedia."
        );
    }

    const walletProvider =
        await modal.getWalletProvider();

    if (!walletProvider) {
        throw new Error(
            "Wallet provider tidak tersedia."
        );
    }

    const { BrowserProvider } = await import(
        "https://esm.sh/ethers@6.15.0"
    );

    const provider = new BrowserProvider(walletProvider);

    return await provider.getSigner();
}

// Get writable ERC20 token contract
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

// Validate Ethereum address
function validateAddress(address) {
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
        throw new Error("Alamat penerima tidak valid.");
    }
}

// Convert token amount
function parseTokenAmount(tokenName, amount) {
    const token = CONTRACTS[tokenName];

    if (!token) {
        throw new Error("Token tidak terdaftar.");
    }

    if (
        !amount ||
        !Number.isFinite(Number(amount)) ||
        Number(amount) <= 0
    ) {
        throw new Error(
            "Jumlah token harus lebih dari nol."
        );
    }

    return parseUnits(
        String(amount),
        token.decimals
    );
}

// Transfer ERC20 token
export async function transferToken(
    tokenName,
    recipient,
    amount
) {
    validateWallet();
    validateAddress(recipient);

    const contract = await getWritableToken(tokenName);
    const value = parseTokenAmount(tokenName, amount);

    const tx = await contract.transfer(
        recipient,
        value
    );

    return {
        hash: tx.hash,
        wait: () => tx.wait()
    };
}

// Transfer native POL
export async function transferNative(
    recipient,
    amount
) {
    validateWallet();
    validateAddress(recipient);

    const signer = await getWalletSigner();

    const value = parseUnits(
        String(amount),
        18
    );

    if (value <= 0n) {
        throw new Error(
            "Jumlah POL harus lebih dari nol."
        );
    }

    const tx = await signer.sendTransaction({
        to: recipient,
        value
    });

    return {
        hash: tx.hash,
        wait: () => tx.wait()
    };
}

// Approve ERC20 token
export async function approveToken(
    tokenName,
    spender,
    amount
) {
    validateWallet();
    validateAddress(spender);

    const contract = await getWritableToken(tokenName);
    const value = parseTokenAmount(tokenName, amount);

    const tx = await contract.approve(
        spender,
        value
    );

    return {
        hash: tx.hash,
        wait: () => tx.wait()
    };
}

// Approve unlimited token allowance
export async function approveUnlimited(
    tokenName,
    spender
) {
    validateWallet();
    validateAddress(spender);

    const contract = await getWritableToken(tokenName);

    const maxAmount =
        0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffn;

    const tx = await contract.approve(
        spender,
        maxAmount
    );

    return {
        hash: tx.hash,
        wait: () => tx.wait()
    };
}

// Check token allowance through RPC Manager
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

    return await rpcRequest(async (provider) => {
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

// Wait for transaction confirmation
export async function waitForTransaction(txHash) {
    if (!txHash) {
        throw new Error(
            "Transaction hash tidak tersedia."
        );
    }

    const signer = await getWalletSigner();
    const provider = signer.provider;

    const receipt = await provider.waitForTransaction(
        txHash,
        1
    );

    if (!receipt) {
        throw new Error(
            "Receipt transaksi belum tersedia."
        );
    }

    return {
        hash: receipt.hash,
        status: receipt.status === 1
            ? "success"
            : "failed",
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString()
    };
}

// Get PolygonScan transaction URL
export function getTransactionUrl(txHash) {
    if (!txHash) {
        throw new Error(
            "Transaction hash tidak tersedia."
        );
    }

    return `${NETWORK.EXPLORER}/tx/${txHash}`;
}

// Get PolygonScan address URL
export function getAddressUrl(address) {
    validateAddress(address);

    return `${NETWORK.EXPLORER}/address/${address}`;
}

/*
========================================
 WALLET SIGNER DIAGNOSTIC
 Read-only wallet connection test
========================================
*/

export async function diagnoseWalletSigner() {
    try {
        const address = validateWallet();

        const { modal } = await import(
            "../../../web3/web3-config.js"
        );

        if (
            typeof modal.getWalletProvider !== "function"
        ) {
            throw new Error(
                "AppKit getWalletProvider tidak tersedia."
            );
        }

        const walletProvider =
            await modal.getWalletProvider();

        if (!walletProvider) {
            throw new Error(
                "Wallet provider tidak tersedia."
            );
        }

        const { BrowserProvider } = await import(
            "https://esm.sh/ethers@6.15.0"
        );

        const provider = new BrowserProvider(
            walletProvider
        );

        const signer = await provider.getSigner();

        const signerAddress =
            await signer.getAddress();

        const network = await provider.getNetwork();

        const correctNetwork =
            Number(network.chainId) === NETWORK.CHAIN_ID;

        const matched =
            address.toLowerCase() ===
            signerAddress.toLowerCase();

        return {
            success: true,
            walletAddress: address,
            signerAddress,
            chainId: Number(network.chainId),
            matched,
            correctNetwork
        };

    } catch (error) {
        return {
            success: false,
            error: error?.message || String(error)
        };
    }
}
