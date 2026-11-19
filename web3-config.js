
import {
  JsonRpcProvider,
  Contract,
  formatUnits
} from "https://esm.sh/ethers@6.15.0";

// =====================================
// JOSJIS WEB3 CONFIGURATION
// =====================================

export const JJS_CONFIG = {
  name: "JosJis",
  symbol: "JJS",
  chainId: 137,
  decimals: 18,

  contractAddress:
    "0x52C8Ff13ada1431376b3E77E8219b644805122dF",

  rpcUrls: [
    "https://polygon-bor-rpc.publicnode.com",
    "https://polygon.drpc.org",
    "https://polygon-rpc.com"
  ]
};

// =====================================
// TOKEN ABI
// =====================================

const JJS_ABI = [
  "function balanceOf(address account) view returns (uint256)"
];

// =====================================
// RPC PROVIDERS
// =====================================

const providers = JJS_CONFIG.rpcUrls.map(
  url => new JsonRpcProvider(url, 137, {
    staticNetwork: true
  })
);

// =====================================
// READ JJS BALANCE
// =====================================

export async function getJJSBalance(address) {

  let lastError;

  for (const provider of providers) {

    try {

      const token = new Contract(
        JJS_CONFIG.contractAddress,
        JJS_ABI,
        provider
      );

      const balance = await token.balanceOf(address);

      return formatUnits(
        balance,
        JJS_CONFIG.decimals
      );

    } catch (error) {

      console.warn("RPC failed:", error);
      lastError = error;
    }
  }

  throw lastError || new Error("All RPC endpoints failed");
}
