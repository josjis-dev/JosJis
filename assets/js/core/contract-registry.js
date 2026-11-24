
/* =====================================
   JOSJIS CONTRACT REGISTRY
===================================== */

// =====================================
// NETWORK CONFIGURATION
// =====================================

export const NETWORK = {

    NAME: "Polygon Mainnet",

    CHAIN_ID: 137,

    SYMBOL: "POL",

    EXPLORER: "https://polygonscan.com"

};


// =====================================
// TOKEN CONTRACTS
// =====================================

export const CONTRACTS = {

    JJS: {

        name: "JosJis",

        symbol: "JJS",

        address: "0x52C8Ff13ada1431376b3E77E8219b644805122dF",

        decimals: 18,

        type: "ERC20",

        description: "Official JosJis Token"

    },

    USDT0: {

        name: "Tether USD",

        symbol: "USDT0",

        address: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",

        decimals: 6,

        type: "ERC20",

        description: "USDT on Polygon"

    }

};


// =====================================
// NATIVE TOKEN
// =====================================

export const NATIVE_TOKEN = {

    name: "Polygon Ecosystem Token",

    symbol: "POL",

    decimals: 18,

    type: "NATIVE"

};


// =====================================
// CONTRACT ABIs
// =====================================

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


// =====================================
// GET CONTRACT
// =====================================

export function getContract(name) {

    const contract = CONTRACTS[name];

    if (!contract) {

        throw new Error(
            `Contract ${name} is not registered.`
        );

    }

    return contract;

}


// =====================================
// GET CONTRACT ADDRESS
// =====================================

export function getContractAddress(name) {

    return getContract(name).address;

}


// =====================================
// GET TOKEN DECIMALS
// =====================================

export function getTokenDecimals(name) {

    return getContract(name).decimals;

}


// =====================================
// GET TOKEN SYMBOL
// =====================================

export function getTokenSymbol(name) {

    return getContract(name).symbol;

}


// =====================================
// GET TOKEN INFORMATION
// =====================================

export function getTokenInfo(name) {

    return getContract(name);

}


// =====================================
// GET ALL CONTRACTS
// =====================================

export function getAllContracts() {

    return Object.entries(CONTRACTS).map(
        ([key, contract]) => ({

            id: key,

            ...contract

        })
    );

}


// =====================================
// GET EXPLORER URL
// =====================================

export function getExplorerAddress(name) {

    const contract = getContract(name);

    return `${NETWORK.EXPLORER}/address/${contract.address}`;

}


// =====================================
// VALIDATE CONTRACT ADDRESS
// =====================================

export function isRegisteredContract(address) {

    if (!address) return false;

    return Object.values(CONTRACTS).some(

        contract =>
            contract.address.toLowerCase() ===
            address.toLowerCase()

    );

}


// =====================================
// EXPORT REGISTRY
// =====================================

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
