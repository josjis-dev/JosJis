
/* =====================================
   JOSJIS GLOBAL WALLET MANAGER
   Powered by Reown AppKit
===================================== */

import {
    modal
} from "../../web3/web3-config.js";

// =====================================
// WALLET STATE
// =====================================

let walletState = {
    isConnected: false,
    address: null,
    chainId: null,
    status: "initializing"
};

// =====================================
// UPDATE WALLET STATE
// =====================================

function updateWalletState() {

    const isConnected = modal.getIsConnected();
    const address = modal.getAddress();
    const chainId = modal.getChainId();

    walletState = {
        isConnected: Boolean(isConnected && address),
        address: address || null,
        chainId: chainId ? Number(chainId) : null,
        status: isConnected && address
            ? "connected"
            : "disconnected"
    };

    // Notify other scripts on this page.
    window.dispatchEvent(
        new CustomEvent("josjis:wallet", {
            detail: { ...walletState }
        })
    );

    return walletState;
}

// =====================================
// INITIALIZE WALLET LISTENERS
// =====================================

modal.subscribeState(() => {
    updateWalletState();
});

modal.subscribeAccount(() => {
    updateWalletState();
});

modal.subscribeNetwork(() => {
    updateWalletState();
});

// =====================================
// CONNECT WALLET
// =====================================

async function connect() {

    try {

        await modal.open({
            view: "Connect"
        });

        updateWalletState();

    } catch (error) {

        console.error(
            "JosJis wallet connection error:",
            error
        );

        throw error;
    }
}

// =====================================
// DISCONNECT WALLET
// =====================================

async function disconnect() {

    try {

        await modal.disconnect();

        updateWalletState();

    } catch (error) {

        console.error(
            "JosJis wallet disconnect error:",
            error
        );

        throw error;
    }
}

// =====================================
// GET WALLET ADDRESS
// =====================================

function getAddress() {

    return modal.getAddress() || null;
}

// =====================================
// GET CONNECTION STATUS
// =====================================

function isConnected() {

    return Boolean(
        modal.getIsConnected() &&
        modal.getAddress()
    );
}

// =====================================
// GET NETWORK
// =====================================

function getChainId() {

    const chainId = modal.getChainId();

    return chainId ? Number(chainId) : null;
}

// =====================================
// CHECK POLYGON NETWORK
// =====================================

function isPolygon() {

    return getChainId() === 137;
}

// =====================================
// GET WALLET SNAPSHOT
// =====================================

function getState() {

    return updateWalletState();
}

// =====================================
// PUBLIC GLOBAL API
// =====================================

window.JosJisWallet = Object.freeze({

    connect,
    disconnect,

    getAddress,
    isConnected,
    getChainId,
    isPolygon,
    getState,

    modal

});

// =====================================
// INITIAL SESSION CHECK
// =====================================

updateWalletState();

console.log(
    "JosJis Global Wallet Manager initialized."
);
