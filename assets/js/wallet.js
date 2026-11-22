
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
// DISPATCH WALLET EVENT
// =====================================

function dispatchWalletEvent() {

    window.dispatchEvent(
        new CustomEvent("josjis:wallet", {
            detail: { ...walletState }
        })
    );

}

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

        dispatchWalletEvent();

        return { ...walletState };

    } catch (error) {

        console.error(
            "JosJis wallet state error:",
            error
        );

        return { ...walletState };

    }

}

// =====================================
// CONNECT WALLET
// Same method as dashboard.html
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
// CHECK CONNECTION
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
// CHECK POLYGON
// =====================================

function isPolygon() {

    return getChainId() === 137;

}

// =====================================
// GET WALLET STATE
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
// WALLET MANAGER READY
// =====================================

window.dispatchEvent(
    new CustomEvent("josjis:wallet-ready")
);

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
// RESTORE WALLET SESSION
// Same checking pattern as dashboard
// =====================================

async function restoreWalletSession() {

    for (let attempt = 0; attempt < 40; attempt++) {

        try {

            if (
                modal.getIsConnected() &&
                modal.getAddress()
            ) {

                updateWalletState();

                return;

            }

        } catch (error) {

            console.error(
                "JosJis wallet restore error:",
                error
            );

        }

        await new Promise(resolve =>
            setTimeout(resolve, 250)
        );

    }

    updateWalletState();

}

// =====================================
// INITIALIZE
// =====================================

updateWalletState();

restoreWalletSession();

console.log(
    "JosJis Global Wallet Manager initialized."
);
