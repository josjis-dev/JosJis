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
    "https://polygon.gateway.tenderly.co"
  ]
};

// =====================================
// FORMAT TOKEN BALANCE
// =====================================

function formatJJSBalance(value) {

  const decimals = BigInt(JJS_CONFIG.decimals);
  const divisor = 10n ** decimals;

  const whole = value / divisor;
  const fraction = value % divisor;

  const fractionText = fraction
    .toString()
    .padStart(JJS_CONFIG.decimals, "0")
    .replace(/0+$/, "");

  return fractionText
    ? whole.toString() + "." + fractionText
    : whole.toString();
}

// =====================================
// READ BALANCE DIRECTLY FROM POLYGON
// =====================================

export async function getJJSBalance(address) {

  if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
    throw new Error("Invalid wallet address");
  }

  // balanceOf(address) function selector
  const selector = "70a08231";

  // Encode wallet address
  const encodedAddress = address
    .slice(2)
    .toLowerCase()
    .padStart(64, "0");

  const callData = "0x" + selector + encodedAddress;

  const errors = [];

  // Try RPC endpoints one by one
  for (const rpcUrl of JJS_CONFIG.rpcUrls) {

    try {

      const response = await fetch(rpcUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "eth_call",
          params: [
            {
              to: JJS_CONFIG.contractAddress,
              data: callData
            },
            "latest"
          ],
          id: 1
        })
      });

      if (!response.ok) {
        throw new Error("HTTP " + response.status);
      }

      const result = await response.json();

      if (result.error) {
        throw new Error(result.error.message || "RPC error");
      }

      if (
        typeof result.result !== "string" ||
        !/^0x[0-9a-fA-F]{64,}$/.test(result.result)
      ) {
        throw new Error("Invalid balance response");
      }

      const balance = BigInt(result.result);

      console.log(
        "JJS balance successfully read from:",
        rpcUrl
      );

      return formatJJSBalance(balance);

    } catch (error) {

      console.warn("RPC failed:", rpcUrl, error);

      errors.push(
        rpcUrl + ": " + error.message
      );
    }
  }

  throw new Error(
    "All Polygon RPC endpoints failed. " +
    errors.join(" | ")
  );
}
