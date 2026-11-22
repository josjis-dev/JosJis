
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

    try {

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

        window.dispatchEvent(
            new CustomEvent("josjis:wallet", {
                detail: { ...walletState }
            })
        );

        return { ...walletState };

    } catch (error) {

        console.error("Wallet state error:", error);

        return { ...walletState };

    }
}

// =====================================
// CONNECT WALLET
// Same method as dashboard.html
// =====================================

async function connect() {

    await modal.open({
        view: "Connect"
    });

    updateWalletState();

}

// =====================================
// DISCONNECT WALLET
// =====================================

async function disconnect() {

    await modal.disconnect();

    updateWalletState();

}

// =====================================
// GET WALLET INFORMATION
// =====================================

function getAddress() {
    return modal.getAddress() || null;
}

function isConnected() {

    return Boolean(
        modal.getIsConnected() &&
        modal.getAddress()
    );

}

function getChainId() {

    const chainId = modal.getChainId();

    return chainId ? Number(chainId) : null;

}

function isPolygon() {
    return getChainId() === 137;
}

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
// APPKIT STATE LISTENER
// Same pattern as dashboard.html
// =====================================

modal.subscribeState((state) => {

    if (state.isConnected) {
        updateWalletState();
    }

});

// =====================================
// ACCOUNT LISTENER
// =====================================

modal.subscribeAccount((account) => {

    if (account.isConnected && account.address) {
        updateWalletState();
    }

});

// =====================================
// NETWORK LISTENER
// =====================================

modal.subscribeNetwork(() => {

    if (modal.getIsConnected()) {
        updateWalletState();
    }

});

// =====================================
// INITIAL SESSION CHECK
// =====================================

async function restoreWalletSession() {

    for (let attempt = 0; attempt < 40; attempt++) {

        if (
            modal.getIsConnected() &&
            modal.getAddress()
        ) {

            updateWalletState();
            return;

        }

        await new Promise(resolve =>
            setTimeout(resolve, 250)
        );

    }

    updateWalletState();

}

// =====================================
// WALLET MANAGER READY
// =====================================

window.dispatchEvent(
    new CustomEvent("josjis:wallet-ready")
);

updateWalletState();

restoreWalletSession();

console.log(
    "JosJis Global Wallet Manager initialized."
);
