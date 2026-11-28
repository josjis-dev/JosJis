
/**
 * ============================================================
 * PROJECT: JOSJIS
 * MODULE: WEB3 CONFIGURATION
 * FILE: web3/web3-config.js
 * NETWORK: Polygon Mainnet
 * ============================================================
 *
 * PURPOSE:
 * Central configuration module for the JosJis Web3 ecosystem.
 *
 * RESPONSIBILITIES:
 * 1. Initialize Reown AppKit for wallet connectivity.
 * 2. Configure the Polygon Mainnet network.
 * 3. Store the WalletConnect project configuration.
 * 4. Initialize the shared Polygon RPC provider.
 * 5. Initialize the JJS token read-only contract.
 * 6. Export shared Web3 objects for other modules.
 *
 * DEPENDENCIES:
 * - Reown AppKit 2.0.0
 * - Reown AppKit Ethers Adapter 2.0.0
 * - Ethers.js 6.15.0
 * - Polygon network configuration
 * - Core RPC Manager
 *
 * IMPORTANT:
 * This file provides shared Web3 instances.
 * Other modules should reuse these exports instead of
 * creating unnecessary duplicate instances.
 *
 * NOTE:
 * Existing application behavior and exports are preserved.
 */

// ============================================================
// 1. IMPORT EXTERNAL WEB3 LIBRARIES
// ============================================================

/**
 * Imports the Reown AppKit initialization function.
 * AppKit manages the wallet connection interface.
 */
import { createAppKit } from
  "https://esm.sh/@reown/appkit@2.0.0";

/**
 * Imports the Ethers adapter.
 * This adapter connects AppKit with the Ethers.js library.
 */
import { EthersAdapter } from
  "https://esm.sh/@reown/appkit-adapter-ethers@2.0.0";

/**
 * Imports the Polygon network configuration.
 * This configuration identifies Polygon Mainnet.
 */
import { polygon } from
  "https://esm.sh/@reown/appkit@2.0.0/networks";

/**
 * Imports Ethers.js contract functionality and token formatting.
 *
 * Contract:
 * Creates an interface for interacting with smart contracts.
 *
 * formatUnits:
 * Converts token values from their smallest unit into
 * a human-readable decimal representation.
 */
import {
  Contract,
  formatUnits
} from "https://esm.sh/ethers@6.15.0";

// ============================================================
// 2. IMPORT CORE RPC MANAGER
// ============================================================

/**
 * Imports the shared RPC provider from the JosJis Core.
 *
 * The RPC Manager handles public RPC provider management.
 * This provider is used for read-only blockchain operations.
 */
import {
  getProvider
} from "../assets/js/core/rpc-manager.js";

// ============================================================
// 3. PROJECT CONFIGURATION
// ============================================================

/**
 * Reown Cloud project identifier.
 *
 * Used by AppKit to initialize wallet connectivity.
 */
export const PROJECT_ID =
  "ea2b7e670f2c0331bca41ba7f66f0126";

/**
 * Official JosJis token contract address.
 *
 * Network: Polygon Mainnet
 * Standard: ERC-20
 *
 * This address is used to access the JJS token contract.
 */
export const JJS_CONTRACT =
  "0x52C8Ff13ada1431376b3E77E8219b644805122dF";

// ============================================================
// 4. JJS TOKEN CONTRACT ABI
// ============================================================

/**
 * Minimal JJS token ABI.
 *
 * Only the functions required by the website are included.
 *
 * balanceOf:
 * Retrieves the JJS balance of a wallet address.
 *
 * decimals:
 * Retrieves the token decimal configuration.
 *
 * symbol:
 * Retrieves the token symbol.
 *
 * These functions are declared as read-only operations.
 */
const JJS_ABI = [
  "function balanceOf(address account) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)"
];

// ============================================================
// 5. POLYGON RPC PROVIDER
// ============================================================

/**
 * Creates the shared RPC provider instance.
 *
 * The provider is obtained from the Core RPC Manager.
 *
 * PURPOSE:
 * - Read blockchain data.
 * - Communicate with Polygon RPC endpoints.
 * - Provide blockchain access to read-only contracts.
 *
 * The RPC Manager remains responsible for provider management.
 */
export const rpcProvider = getProvider();

// ============================================================
// 6. JJS TOKEN CONTRACT INSTANCE
// ============================================================

/**
 * Initializes the JJS token contract using the shared RPC provider.
 *
 * CONTRACT ADDRESS:
 * Stored in JJS_CONTRACT.
 *
 * ABI:
 * Stored in JJS_ABI.
 *
 * PROVIDER:
 * Shared Polygon RPC provider.
 *
 * NOTE:
 * This instance is configured for read-only contract access.
 */
export const token = new Contract(
  JJS_CONTRACT,
  JJS_ABI,
  rpcProvider
);

// ============================================================
// 7. WEBSITE METADATA
// ============================================================

/**
 * Official JosJis website metadata.
 *
 * This information is provided to Reown AppKit and may appear
 * during wallet connection requests.
 *
 * name:
 * Official project name.
 *
 * description:
 * Short project description.
 *
 * url:
 * Official website URL.
 *
 * icons:
 * Project logo used by supported wallet interfaces.
 */
const metadata = {
  name: "JosJis",
  description: "Official JosJis Web3 Dashboard",
  url: "https://josjis-dev.github.io",
  icons: [
    "https://josjis-dev.github.io/JosJis/assets/images/josjis-logo.jpg"
  ]
};

// ============================================================
// 8. INITIALIZE REOWN APPKIT
// ============================================================

/**
 * Initializes the shared Reown AppKit instance.
 *
 * CONFIGURATION:
 *
 * adapters:
 * Uses the Ethers adapter for wallet integration.
 *
 * networks:
 * Enables Polygon Mainnet.
 *
 * defaultNetwork:
 * Sets Polygon as the default network.
 *
 * projectId:
 * Uses the configured Reown project identifier.
 *
 * metadata:
 * Provides official JosJis website information.
 *
 * enableReconnect:
 * Enables wallet reconnection support.
 *
 * features.analytics:
 * Enables AppKit analytics.
 *
 * IMPORTANT:
 * Other JosJis modules should reuse this modal instance
 * to maintain a consistent wallet connection session.
 */
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

// ============================================================
// 9. EXPORT SHARED ETHERS UTILITIES
// ============================================================

/**
 * Exports formatUnits for other JosJis modules.
 *
 * This allows other modules to format blockchain token values
 * without importing another Ethers.js instance.
 */
export { formatUnits };
