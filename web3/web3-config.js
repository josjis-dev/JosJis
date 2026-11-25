
// =====================================
// JOSJIS WEB3 CONFIGURATION
// =====================================

import { createAppKit } from
  "https://esm.sh/@reown/appkit@2.0.0";

import { EthersAdapter } from
  "https://esm.sh/@reown/appkit-adapter-ethers@2.0.0";

import { polygon } from
  "https://esm.sh/@reown/appkit@2.0.0/networks";

import {
  Contract,
  formatUnits
} from "https://esm.sh/ethers@6.15.0";

// =====================================
// RPC MANAGER
// =====================================

import {
  getProvider
} from "../assets/js/core/rpc-manager.js";

// =====================================
// PROJECT CONFIGURATION
// =====================================

export const PROJECT_ID =
  "ea2b7e670f2c0331bca41ba7f66f0126";

export const JJS_CONTRACT =
  "0x52C8Ff13ada1431376b3E77E8219b644805122dF";

// =====================================
// JJS TOKEN ABI
// =====================================

const JJS_ABI = [
  "function balanceOf(address account) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)"
];

// =====================================
// POLYGON RPC PROVIDER
// Managed by RPC Manager
// =====================================

export const rpcProvider = getProvider();

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
  description: "Official JosJis Web3 Dashboard",
  url: "https://josjis-dev.github.io",
  icons: [
    "https://josjis-dev.github.io/JosJis/assets/images/josjis-logo.jpg"
  ]
};

// =====================================
// INITIALIZE REOWN APPKIT
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
// EXPORT ETHERS FUNCTION
// =====================================

export { formatUnits };
