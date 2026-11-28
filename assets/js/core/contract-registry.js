
/**
 * ============================================================
 * PROJECT: JOSJIS
 * MODULE: CONTRACT REGISTRY
 * FILE: assets/js/core/contract-registry.js
 * NETWORK: Polygon Mainnet
 * ============================================================
 *
 * PURPOSE:
 * Provides a centralized registry for blockchain networks,
 * token contracts, native tokens, and smart contract ABIs.
 *
 * RESPONSIBILITIES:
 * 1. Store supported blockchain network information.
 * 2. Register supported ERC-20 token contracts.
 * 3. Store native blockchain token information.
 * 4. Provide shared ERC-20 contract ABI definitions.
 * 5. Retrieve registered contract information.
 * 6. Retrieve token addresses, symbols, and decimals.
 * 7. Generate blockchain explorer URLs.
 * 8. Validate registered contract addresses.
 *
 * REGISTERED NETWORK:
 * - Polygon Mainnet
 *
 * REGISTERED TOKENS:
 * - JosJis (JJS)
 * - Tether USD (USDT0)
 *
 * NATIVE TOKEN:
 * - POL
 *
 * DEPENDENCIES:
 * - JavaScript ES Modules
 *
 * IMPORTANT:
 * This module stores contract metadata and ABI definitions.
 * It does not create contract instances or execute transactions.
 *
 * NOTE:
 * Existing configuration values, function names, exports,
 * and execution logic are preserved.
 */

// ============================================================
// 1. NETWORK CONFIGURATION
// ============================================================

/**
 * Stores the blockchain network configuration.
 *
 * NAME:
 * Human-readable network name.
 *
 * CHAIN_ID:
 * Polygon Mainnet chain identifier (137).
 *
 * SYMBOL:
 * Native network token symbol (POL).
 *
 * EXPLORER:
 * Official Polygon blockchain explorer base URL.
 *
 * Other modules can import NETWORK to validate
 * the currently selected blockchain network.
 */
export const NETWORK = {

    NAME: "Polygon Mainnet",

    CHAIN_ID: 137,

    SYMBOL: "POL",

    EXPLORER: "https://polygonscan.com"

};


// ============================================================
// 2. TOKEN CONTRACT REGISTRY
// ============================================================

/**
 * Central registry of supported token contracts.
 *
 * Each registered token contains:
 *
 * name:
 * Human-readable token name.
 *
 * symbol:
 * Token ticker symbol.
 *
 * address:
 * Smart contract address on Polygon Mainnet.
 *
 * decimals:
 * Number of decimal places used by the token.
 *
 * type:
 * Token standard or contract classification.
 *
 * description:
 * Short token description.
 *
 * IMPORTANT:
 * Token addresses and decimals are network-specific.
 * Verify them before adding or modifying a registry entry.
 */
export const CONTRACTS = {

    /**
     * JosJis Token (JJS)
     *
     * Official JosJis ERC-20 token on Polygon Mainnet.
     *
     * Decimals: 18
     */
    JJS: {

        name: "JosJis",

        symbol: "JJS",

        address: "0x52C8Ff13ada1431376b3E77E8219b644805122dF",

        decimals: 18,

        type: "ERC20",

        description: "Official JosJis Token"

    },

    /**
     * Tether USD (USDT0)
     *
     * Registered stablecoin contract on Polygon.
     *
     * Decimals: 6
     */
    USDT0: {

        name: "Tether USD",

        symbol: "USDT0",

        address: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",

        decimals: 6,

        type: "ERC20",

        description: "USDT on Polygon"

    }

};


// ============================================================
// 3. NATIVE TOKEN CONFIGURATION
// ============================================================

/**
 * Stores the native token information for Polygon Mainnet.
 *
 * Unlike ERC-20 tokens, the native token does not use
 * a separate ERC-20 smart contract.
 *
 * NAME:
 * Human-readable native token name.
 *
 * SYMBOL:
 * Native token ticker symbol (POL).
 *
 * DECIMALS:
 * Native token precision (18).
 *
 * TYPE:
 * Identifies this asset as a native blockchain token.
 */
export const NATIVE_TOKEN = {

    name: "Polygon Ecosystem Token",

    symbol: "POL",

    decimals: 18,

    type: "NATIVE"

};


// ============================================================
// 4. SMART CONTRACT ABI REGISTRY
// ============================================================

/**
 * Central collection of smart contract ABI definitions.
 *
 * ERC20:
 * Contains the standard function signatures used
 * to interact with compatible ERC-20 token contracts.
 *
 * ABI FUNCTION REFERENCE:
 *
 * name():
 * Retrieves the token name.
 *
 * symbol():
 * Retrieves the token symbol.
 *
 * decimals():
 * Retrieves the token decimal precision.
 *
 * totalSupply():
 * Retrieves the total token supply.
 *
 * balanceOf():
 * Retrieves an account's token balance.
 *
 * transfer():
 * Transfers tokens to another address.
 *
 * allowance():
 * Retrieves the approved spending allowance.
 *
 * approve():
 * Approves a spender to use a specified token amount.
 *
 * transferFrom():
 * Transfers tokens using an existing allowance.
 *
 * NOTE:
 * ABI definitions describe contract interfaces.
 * They do not execute blockchain transactions by themselves.
 */
export const ABIS = {

    ERC20: [

        "function name() view returns (string)",

        "function symbol() view returns (string)",

        "function decimals() view returns (uint8)",

        "function totalSupply() view returns (uint256)",

        "function balanceOf(address account) view returns (uint256)",

        "function transfer(address to, uint256 amount) returns (bool)",

        "function allowance(address owner, address spender) view returns (uint256)",

        "function approve(address spender, uint256 amount) returns (bool)",

        "function transferFrom(address from, address to, uint256 amount) returns (bool)"

    ]

};


// ============================================================
// 5. GET CONTRACT INFORMATION
// ============================================================

/**
 * Retrieves a registered contract configuration.
 *
 * @param {string} name - Registered contract identifier.
 * @returns {Object} Contract configuration.
 *
 * EXAMPLE:
 * getContract("JJS")
 *
 * VALIDATION:
 * Throws an error if the requested contract
 * does not exist in the registry.
 */
export function getContract(name) {

    const contract = CONTRACTS[name];

    if (!contract) {

        throw new Error(
            `Contract ${name} is not registered.`
        );

    }

    return contract;

}


// ============================================================
// 6. GET CONTRACT ADDRESS
// ============================================================

/**
 * Retrieves the smart contract address.
 *
 * @param {string} name - Registered contract identifier.
 * @returns {string} Contract address.
 *
 * Uses getContract() to retrieve the registered contract
 * and returns its address property.
 */
export function getContractAddress(name) {

    return getContract(name).address;

}


// ============================================================
// 7. GET TOKEN DECIMALS
// ============================================================

/**
 * Retrieves the decimal precision of a registered token.
 *
 * @param {string} name - Registered contract identifier.
 * @returns {number} Token decimal precision.
 *
 * Used when converting between human-readable token amounts
 * and blockchain integer values.
 */
export function getTokenDecimals(name) {

    return getContract(name).decimals;

}


// ============================================================
// 8. GET TOKEN SYMBOL
// ============================================================

/**
 * Retrieves the ticker symbol of a registered token.
 *
 * @param {string} name - Registered contract identifier.
 * @returns {string} Token symbol.
 *
 * EXAMPLE:
 * getTokenSymbol("JJS") returns "JJS".
 */
export function getTokenSymbol(name) {

    return getContract(name).symbol;

}


// ============================================================
// 9. GET TOKEN INFORMATION
// ============================================================

/**
 * Retrieves the complete token configuration.
 *
 * @param {string} name - Registered contract identifier.
 * @returns {Object} Complete registered token information.
 *
 * Returns the same contract object provided by getContract().
 */
export function getTokenInfo(name) {

    return getContract(name);

}


// ============================================================
// 10. GET ALL REGISTERED CONTRACTS
// ============================================================

/**
 * Retrieves all registered token contracts.
 *
 * @returns {Array<Object>} List of registered contracts.
 *
 * Each returned object contains:
 *
 * id:
 * Registry identifier such as JJS or USDT0.
 *
 * Other properties:
 * All original contract configuration properties.
 *
 * This function creates a new array containing
 * the registered contract information.
 */
export function getAllContracts() {

    return Object.entries(CONTRACTS).map(
        ([key, contract]) => ({

            id: key,

            ...contract

        })
    );

}


// ============================================================
// 11. GENERATE BLOCKCHAIN EXPLORER URL
// ============================================================

/**
 * Generates the PolygonScan address page URL.
 *
 * @param {string} name - Registered contract identifier.
 * @returns {string} PolygonScan contract address URL.
 *
 * URL FORMAT:
 * https://polygonscan.com/address/CONTRACT_ADDRESS
 *
 * Uses the registered network explorer URL
 * and the requested contract address.
 */
export function getExplorerAddress(name) {

    const contract = getContract(name);

    return `${NETWORK.EXPLORER}/address/${contract.address}`;

}


// ============================================================
// 12. VALIDATE REGISTERED CONTRACT ADDRESS
// ============================================================

/**
 * Checks whether an address exists in the contract registry.
 *
 * @param {string} address - Address to validate.
 * @returns {boolean} True if the address is registered.
 *
 * VALIDATION PROCESS:
 * 1. Reject an empty address.
 * 2. Compare the provided address against registered addresses.
 * 3. Convert both addresses to lowercase before comparison.
 *
 * NOTE:
 * This function checks registry membership only.
 * It does not validate the address checksum or verify
 * the contract's existence on the blockchain.
 */
export function isRegisteredContract(address) {

    if (!address) return false;

    return Object.values(CONTRACTS).some(

        contract =>
            contract.address.toLowerCase() ===
            address.toLowerCase()

    );

}


// ============================================================
// 13. DEFAULT REGISTRY EXPORT
// ============================================================

/**
 * Exports the complete Contract Registry as a default object.
 *
 * INCLUDED CONFIGURATION:
 * - NETWORK
 * - CONTRACTS
 * - NATIVE_TOKEN
 * - ABIS
 *
 * INCLUDED FUNCTIONS:
 * - getContract()
 * - getContractAddress()
 * - getTokenDecimals()
 * - getTokenSymbol()
 * - getTokenInfo()
 * - getAllContracts()
 * - getExplorerAddress()
 * - isRegisteredContract()
 *
 * This export allows other modules to import
 * the registry as a single object.
 */
export default {

    NETWORK,

    CONTRACTS,

    NATIVE_TOKEN,

    ABIS,

    getContract,

    getContractAddress,

    getTokenDecimals,

    getTokenSymbol,

    getTokenInfo,

    getAllContracts,

    getExplorerAddress,

    isRegisteredContract

};
