
import {
    JsonRpcProvider
} from "https://esm.sh/ethers@6.15.0";


// =====================================
// JOSJIS RPC MANAGER
// =====================================

const CHAIN_ID = 137;

const RPC_TIMEOUT = 8000;


// =====================================
// RPC ENDPOINT CONFIGURATION
// =====================================

const RPC_ENDPOINTS = [

    {
        name: "PublicNode",
        url: "https://polygon-bor-rpc.publicnode.com"
    },

    {
        name: "dRPC",
        url: "https://polygon.drpc.org"
    },

    {
        name: "Polygon RPC",
        url: "https://polygon-rpc.com"
    }

];


// =====================================
// PROVIDER INITIALIZATION
// =====================================

const providers = RPC_ENDPOINTS.map(endpoint => ({

    name: endpoint.name,

    url: endpoint.url,

    provider: new JsonRpcProvider(
        endpoint.url,
        CHAIN_ID,
        {
            staticNetwork: true
        }
    )

}));


// =====================================
// RPC STATE
// =====================================

let activeProviderIndex = 0;

let isChecking = false;


// =====================================
// RPC TIMEOUT HANDLER
// =====================================

function withTimeout(promise, timeout = RPC_TIMEOUT) {

    return new Promise((resolve, reject) => {

        const timer = setTimeout(() => {

            reject(
                new Error("RPC request timeout")
            );

        }, timeout);

        Promise.resolve(promise).then(

            result => {

                clearTimeout(timer);
                resolve(result);

            },

            error => {

                clearTimeout(timer);
                reject(error);

            }

        );

    });

}


// =====================================
// GET ACTIVE PROVIDER
// =====================================

export function getProvider() {

    return providers[activeProviderIndex].provider;

}


// =====================================
// GET ACTIVE RPC INFORMATION
// =====================================

export function getActiveRPC() {

    const endpoint = providers[activeProviderIndex];

    return {

        name: endpoint.name,

        url: endpoint.url,

        index: activeProviderIndex

    };

}


// =====================================
// GET ALL RPC ENDPOINTS
// =====================================

export function getRPCList() {

    return providers.map((endpoint, index) => ({

        name: endpoint.name,

        url: endpoint.url,

        active: index === activeProviderIndex

    }));

}


// =====================================
// SET ACTIVE RPC
// =====================================

function setActiveProvider(index) {

    activeProviderIndex = index;

    console.info(
        `[JosJis RPC] Active: ${providers[index].name}`
    );

}


// =====================================
// CHECK RPC CONNECTION
// =====================================

async function checkProvider(index) {

    const endpoint = providers[index];

    try {

        const network = await withTimeout(
            endpoint.provider.getNetwork()
        );

        if (Number(network.chainId) !== CHAIN_ID) {

            throw new Error(
                "Incorrect blockchain network"
            );

        }

        await withTimeout(
            endpoint.provider.getBlockNumber()
        );

        return true;

    } catch (error) {

        console.warn(
            `[JosJis RPC] ${endpoint.name} failed:`,
            error.message
        );

        return false;

    }

}


// =====================================
// CHECK ALL RPC ENDPOINTS
// =====================================

export async function checkRPC() {

    if (isChecking) {
        return false;
    }

    isChecking = true;

    try {

        for (let i = 0; i < providers.length; i++) {

            const index =
                (activeProviderIndex + i) % providers.length;

            const available =
                await checkProvider(index);

            if (available) {

                setActiveProvider(index);

                return true;

            }

        }

        console.error(
            "[JosJis RPC] All RPC endpoints unavailable."
        );

        return false;

    } finally {

        isChecking = false;

    }

}


// =====================================
// RPC FAILOVER
// =====================================

export async function getHealthyProvider() {

    const active = providers[activeProviderIndex];

    const available = await checkProvider(
        activeProviderIndex
    );

    if (available) {
        return active.provider;
    }

    console.warn(
        "[JosJis RPC] Switching RPC endpoint..."
    );

    const connected = await checkRPC();

    if (!connected) {

        throw new Error(
            "All Polygon RPC endpoints are unavailable."
        );

    }

    return getProvider();

}


// =====================================
// RPC REQUEST WITH FALLBACK
// =====================================

export async function rpcRequest(callback) {

    let lastError = null;

    for (let i = 0; i < providers.length; i++) {

        const index =
            (activeProviderIndex + i) % providers.length;

        const endpoint = providers[index];

        try {

            const result = await withTimeout(

                Promise.resolve().then(() =>
                    callback(endpoint.provider)
                )

            );

            setActiveProvider(index);

            return result;

        } catch (error) {

            lastError = error;

            console.warn(
                `[JosJis RPC] ${endpoint.name} request failed:`,
                error.message
            );

        }

    }

    throw lastError || new Error(
        "All RPC endpoints failed."
    );

}


// =====================================
// INITIALIZE RPC MANAGER
// =====================================

export async function initializeRPC() {

    console.info(
        "[JosJis RPC] Initializing..."
    );

    const connected = await checkRPC();

    if (connected) {

        console.info(
            "[JosJis RPC] Connection established:",
            getActiveRPC().name
        );

    } else {

        console.error(
            "[JosJis RPC] Initialization failed."
        );

    }

    return connected;

}


// =====================================
// RPC CONFIGURATION
// =====================================

export const RPC_CONFIG = {

    chainId: CHAIN_ID,

    timeout: RPC_TIMEOUT,

    totalEndpoints: providers.length

};
