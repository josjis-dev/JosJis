
/**
 * ============================================================
 * PROJECT: JOSJIS
 * MODULE: RPC MANAGER
 * FILE: assets/js/core/rpc-manager.js
 * NETWORK: Polygon Mainnet
 * LIBRARY: Ethers.js 6.15.0
 * ============================================================
 *
 * PURPOSE:
 * Manages public RPC connections for the JosJis ecosystem.
 *
 * RESPONSIBILITIES:
 * 1. Configure multiple Polygon RPC endpoints.
 * 2. Initialize Ethers.js JSON-RPC providers.
 * 3. Monitor RPC connection availability.
 * 4. Verify the connected blockchain network.
 * 5. Manage the currently active RPC provider.
 * 6. Switch to backup RPC endpoints when requests fail.
 * 7. Apply request timeout protection.
 * 8. Provide shared RPC access to other modules.
 *
 * RPC ENDPOINTS:
 * - PublicNode
 * - dRPC
 * - Polygon RPC
 *
 * DEPENDENCIES:
 * - Ethers.js 6.15.0
 *
 * IMPORTANT:
 * This module manages public blockchain RPC connections.
 * It does not manage wallet connections or transaction signing.
 *
 * NOTE:
 * Existing functions, exports, configuration values,
 * and execution logic are preserved.
 */

// ============================================================
// 1. IMPORT EXTERNAL LIBRARIES
// ============================================================

/**
 * Imports JsonRpcProvider from Ethers.js.
 *
 * JsonRpcProvider provides communication with blockchain
 * nodes through JSON-RPC HTTP endpoints.
 */
import {
    JsonRpcProvider
} from "https://esm.sh/ethers@6.15.0";

// ============================================================
// 2. RPC MANAGER CONFIGURATION
// ============================================================

/**
 * Polygon Mainnet chain identifier.
 *
 * Polygon Mainnet Chain ID: 137
 */
const CHAIN_ID = 137;

/**
 * Maximum allowed duration for an RPC operation.
 *
 * Unit: Milliseconds
 * Value: 8000 ms (8 seconds)
 */
const RPC_TIMEOUT = 8000;

// ============================================================
// 3. RPC ENDPOINT CONFIGURATION
// ============================================================

/**
 * List of available Polygon RPC endpoints.
 *
 * Each endpoint contains:
 *
 * name:
 * Human-readable RPC provider name.
 *
 * url:
 * HTTP endpoint used to communicate with the blockchain.
 *
 * Endpoint order determines the initial provider priority.
 */
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

// ============================================================
// 4. INITIALIZE RPC PROVIDERS
// ============================================================

/**
 * Creates an Ethers.js provider for every configured endpoint.
 *
 * Each provider is initialized with:
 *
 * endpoint.url:
 * RPC server URL.
 *
 * CHAIN_ID:
 * Expected Polygon Mainnet network identifier.
 *
 * staticNetwork:
 * Prevents unnecessary network detection requests.
 *
 * The resulting array stores the endpoint information
 * together with its corresponding provider instance.
 */
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

// ============================================================
// 5. RPC MANAGER STATE
// ============================================================

/**
 * Stores the index of the currently active RPC provider.
 *
 * Default:
 * The first configured endpoint (PublicNode).
 */
let activeProviderIndex = 0;

/**
 * Stores an ongoing RPC health-check operation.
 *
 * PURPOSE:
 * Prevents multiple simultaneous checkRPC executions.
 *
 * When a health check is running, additional callers reuse
 * the same Promise instead of starting another check.
 */
let checkingPromise = null;

// ============================================================
// 6. REQUEST TIMEOUT HANDLER
// ============================================================

/**
 * Executes a Promise with a maximum allowed duration.
 *
 * @param {Promise} promise - Operation to execute.
 * @param {number} timeout - Maximum execution time in milliseconds.
 * @returns {Promise} Original result or timeout rejection.
 *
 * PROCESS:
 * 1. Start the provided Promise.
 * 2. Start a timeout rejection handler.
 * 3. Return whichever operation completes first.
 * 4. Clear the timeout after completion.
 *
 * This prevents RPC operations from waiting indefinitely.
 */
function withTimeout(promise, timeout = RPC_TIMEOUT) {
    let timer;

    return Promise.race([
        Promise.resolve(promise),

        new Promise((_, reject) => {
            timer = setTimeout(() => {
                reject(new Error("RPC request timeout"));
            }, timeout);
        })

    ]).finally(() => {
        clearTimeout(timer);
    });
}

// ============================================================
// 7. GET ACTIVE RPC PROVIDER
// ============================================================

/**
 * Returns the currently active Ethers.js provider.
 *
 * @returns {JsonRpcProvider} Active RPC provider instance.
 *
 * PURPOSE:
 * Allows other modules to access the current RPC connection.
 */
export function getProvider() {
    return providers[activeProviderIndex].provider;
}

// ============================================================
// 8. GET ACTIVE RPC INFORMATION
// ============================================================

/**
 * Returns information about the currently active RPC endpoint.
 *
 * @returns {Object} Active RPC information.
 *
 * RETURNED PROPERTIES:
 * - name: RPC provider name.
 * - url: RPC endpoint URL.
 * - index: Provider position in the endpoint array.
 */
export function getActiveRPC() {
    const endpoint = providers[activeProviderIndex];

    return {
        name: endpoint.name,
        url: endpoint.url,
        index: activeProviderIndex
    };
}

// ============================================================
// 9. GET ALL RPC ENDPOINTS
// ============================================================

/**
 * Returns information about all configured RPC endpoints.
 *
 * @returns {Array<Object>} List of RPC endpoint information.
 *
 * Each endpoint includes an active property indicating
 * whether it is currently selected by the RPC Manager.
 */
export function getRPCList() {
    return providers.map((endpoint, index) => ({
        name: endpoint.name,
        url: endpoint.url,
        active: index === activeProviderIndex
    }));
}

// ============================================================
// 10. SET ACTIVE RPC PROVIDER
// ============================================================

/**
 * Changes the currently active RPC provider.
 *
 * @param {number} index - Target provider index.
 *
 * VALIDATION:
 * Rejects indexes outside the configured provider range.
 *
 * SIDE EFFECT:
 * Updates activeProviderIndex and writes the selected
 * provider name to the browser console.
 */
function setActiveProvider(index) {
    if (
        index < 0 ||
        index >= providers.length
    ) {
        throw new Error("Invalid RPC provider index");
    }

    activeProviderIndex = index;

    console.info(
        `[JosJis RPC] Active: ${providers[index].name}`
    );
}

// ============================================================
// 11. CHECK SINGLE RPC PROVIDER
// ============================================================

/**
 * Checks whether a specific RPC endpoint is operational.
 *
 * @param {number} index - Provider index to check.
 * @returns {Promise<boolean>} True if the provider is healthy.
 *
 * HEALTH CHECK PROCESS:
 * 1. Request the connected network information.
 * 2. Verify the network chain ID is Polygon Mainnet.
 * 3. Request the latest blockchain block number.
 * 4. Return true if all checks succeed.
 *
 * If any operation fails or times out, the endpoint
 * is considered unavailable.
 */
async function checkProvider(index) {
    const endpoint = providers[index];

    try {
        const network = await withTimeout(
            endpoint.provider.getNetwork()
        );

        if (Number(network.chainId) !== CHAIN_ID) {
            throw new Error("Incorrect blockchain network");
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

// ============================================================
// 12. CHECK ALL RPC ENDPOINTS
// ============================================================

/**
 * Checks the availability of configured RPC endpoints.
 *
 * @returns {Promise<boolean>} True if an available endpoint exists.
 *
 * PROCESS:
 * 1. Reuse an existing health-check Promise if available.
 * 2. Start checking from the currently active endpoint.
 * 3. Continue through the remaining endpoints.
 * 4. Select the first healthy endpoint.
 * 5. Return false if every endpoint is unavailable.
 *
 * Only one shared health-check operation runs at a time.
 */
export async function checkRPC() {
    if (checkingPromise) {
        return checkingPromise;
    }

    checkingPromise = (async () => {
        for (let i = 0; i < providers.length; i++) {
            const index =
                (activeProviderIndex + i) % providers.length;

            const available = await checkProvider(index);

            if (available) {
                setActiveProvider(index);
                return true;
            }
        }

        console.error(
            "[JosJis RPC] All RPC endpoints unavailable."
        );

        return false;
    })();

    try {
        return await checkingPromise;
    } finally {
        checkingPromise = null;
    }
}

// ============================================================
// 13. GET HEALTHY RPC PROVIDER
// ============================================================

/**
 * Returns a verified healthy RPC provider.
 *
 * @returns {Promise<JsonRpcProvider>} Healthy RPC provider.
 *
 * PROCESS:
 * 1. Check the currently active provider.
 * 2. Return it immediately if healthy.
 * 3. Otherwise, run the RPC endpoint failover check.
 * 4. Return the newly selected provider.
 *
 * Throws an error if no configured RPC endpoint is available.
 */
export async function getHealthyProvider() {
    const available = await checkProvider(
        activeProviderIndex
    );

    if (available) {
        return getProvider();
    }

    console.warn(
        "[JosJis RPC] Active RPC unavailable. Trying backup..."
    );

    const connected = await checkRPC();

    if (!connected) {
        throw new Error(
            "All Polygon RPC endpoints are unavailable."
        );
    }

    return getProvider();
}

// ============================================================
// 14. RPC REQUEST WITH AUTOMATIC FAILOVER
// ============================================================

/**
 * Executes a blockchain operation using available RPC endpoints.
 *
 * @param {Function} callback - Operation receiving an RPC provider.
 * @returns {Promise<*>} Result returned by the callback.
 *
 * PROCESS:
 * 1. Start with the currently active RPC endpoint.
 * 2. Execute the callback using that provider.
 * 3. Apply the configured request timeout.
 * 4. Select the successful provider as the active provider.
 * 5. Return the operation result.
 * 6. Try the next endpoint if the current request fails.
 *
 * If every endpoint fails, the last encountered error is thrown.
 *
 * IMPORTANT:
 * The callback is responsible for defining the blockchain
 * operation to execute.
 */
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

// ============================================================
// 15. INITIALIZE RPC MANAGER
// ============================================================

/**
 * Initializes the RPC Manager and checks network availability.
 *
 * @returns {Promise<boolean>} Initialization status.
 *
 * PROCESS:
 * 1. Log the initialization process.
 * 2. Check configured RPC endpoints.
 * 3. Log the selected endpoint when successful.
 * 4. Log an error if no endpoint is available.
 *
 * This function can be called by application startup modules.
 */
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

// ============================================================
// 16. EXPORT RPC CONFIGURATION
// ============================================================

/**
 * Exposes the RPC Manager configuration.
 *
 * chainId:
 * Configured blockchain network identifier.
 *
 * timeout:
 * Maximum RPC request timeout in milliseconds.
 *
 * totalEndpoints:
 * Total number of configured RPC endpoints.
 *
 * Other modules can import this object to inspect
 * the active RPC configuration.
 */
export const RPC_CONFIG = {
    chainId: CHAIN_ID,
    timeout: RPC_TIMEOUT,
    totalEndpoints: providers.length
};
