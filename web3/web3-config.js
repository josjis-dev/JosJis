
// =====================================
// JOSJIS GLOBAL WEB3 CONFIGURATION
// Powered by Reown AppKit + Ethers
// =====================================

import { createAppKit } from
  "https://esm.sh/@reown/appkit@2.0.0";

import { EthersAdapter } from
  "https://esm.sh/@reown/appkit-adapter-ethers@2.0.0";

import { polygon } from
  "https://esm.sh/@reown/appkit@2.0.0/networks";

import {
  Contract,
  JsonRpcProvider,
  formatUnits
} from "https://esm.sh/ethers@6.15.0";


// =====================================
// PROJECT CONFIGURATION
// =====================================

export const PROJECT_ID =
  "ea2b7e670f2c0331bca41ba7f66f0126";

export const JJS_CONTRACT =
  "0x52C8Ff13ada1431376b3E77E8219b644805122dF";


// =====================================
// JJS ABI
// =====================================

const JJS_ABI = [
  "function balanceOf(address account) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)"
];


// =====================================
// POLYGON RPC
// =====================================

export const rpcProvider = new JsonRpcProvider(
  "https://polygon-bor-rpc.publicnode.com"
);


// =====================================
// JJS TOKEN CONTRACT
// =====================================

export const token = new Contract(
  JJS_CONTRACT,
  JJS_ABI,
  rpcProvider
);


// =====================================
// WEBSITE METADATA
// =====================================

const metadata = {
  name: "JosJis",
  description: "Official JosJis Web3 Ecosystem",
  url: "https://josjis-dev.github.io/josjis/",
  icons: [
    "https://josjis-dev.github.io/josjis/assets/images/josjis-logo.jpg"
  ]
};


// =====================================
// SINGLE REOWN APPKIT INSTANCE
// =====================================

export const modal = createAppKit({
  adapters: [new EthersAdapter()],
  networks: [polygon],
  defaultNetwork: polygon,
  projectId: PROJECT_ID,
  metadata,
  enableReconnect: true,
  features: {
    analytics: true
  }
});


// =====================================
// GLOBAL JOSJIS WEB3 API
// =====================================

const JosJisWeb3 = Object.freeze({

  modal,

  token,

  rpcProvider,

  formatUnits,

  PROJECT_ID,

  JJS_CONTRACT,

  getAddress() {
    return modal.getAddress() || null;
  },

  isConnected() {
    return Boolean(
      modal.getIsConnected() &&
      modal.getAddress()
    );
  },

  getChainId() {
    const chainId = modal.getChainId();
    return chainId ? Number(chainId) : null;
  },

  isPolygon() {
    return modal.getChainId() === 137;
  },

  connect() {
    return modal.open({
      view: "Connect"
    });
  },

  disconnect() {
    return modal.disconnect();
  }

});


// =====================================
// EXPOSE GLOBAL API
// =====================================

window.JosJisWeb3 = JosJisWeb3;

window.dispatchEvent(
  new CustomEvent("josjis:web3-ready", {
    detail: JosJisWeb3
  })
);

console.log("JosJis Global Web3 initialized.");


// =====================================
// EXPORT ETHERS
// =====================================

export { formatUnits };
