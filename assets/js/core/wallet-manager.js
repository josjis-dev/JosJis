
import { modal } from "../../../web3/web3-config.js";

import { NETWORK } from "./contract-registry.js";

/*
========================================
 WALLET MANAGER
 JosJis Ecosystem
========================================
*/

// Ambil status wallet
export function getWalletState() {
    return modal.getState();
}

// Ambil alamat wallet
export function getAddress() {
    return modal.getAddress();
}

// Ambil Chain ID
export function getChainId() {
    return modal.getChainId();
}

// Cek apakah wallet terhubung
export function isConnected() {
    return Boolean(getAddress());
}

// Cek apakah menggunakan jaringan Polygon
export function isPolygon() {
    return Number(getChainId()) === NETWORK.CHAIN_ID;
}

// Cek koneksi wallet dan jaringan
export function getConnectionStatus() {
    const address = getAddress();
    const chainId = Number(getChainId());

    return {
        connected: Boolean(address),
        address: address || null,
        chainId: chainId || null,
        isPolygon: chainId === NETWORK.CHAIN_ID,
        correctNetwork: chainId === NETWORK.CHAIN_ID
    };
}

// Buka modal koneksi wallet
export function openConnectModal() {
    return modal.open();
}

// Buka modal jaringan
export function openNetworkModal() {
    return modal.open({ view: "Networks" });
}

// Subscribe perubahan status AppKit
export function subscribeState(callback) {
    return modal.subscribeState(callback);
}

// Subscribe perubahan akun
export function subscribeAccount(callback) {
    return modal.subscribeAccount(callback);
}

// Subscribe perubahan jaringan
export function subscribeNetwork(callback) {
    return modal.subscribeNetwork(callback);
}

// Ambil ringkasan wallet
export function getWalletInfo() {
    const status = getConnectionStatus();

    return {
        ...status,
        shortAddress: status.address
            ? `${status.address.slice(0, 6)}...${status.address.slice(-4)}`
            : null
    };
}

// Ekspor modal jika diperlukan
export { modal };
