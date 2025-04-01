/**
 * Smart contract configuration
 */
const config = {
  // Contract addresses by network ID
  contractAddresses: {
    // Local development (Hardhat)
    "31337": "0x5FbDB2315678afecb367f032d93F642f64180aa3",
    // Goerli Testnet
    "5": "",
    // Mumbai Testnet (Polygon)
    "80001": "",
    // Mainnet Ethereum
    "1": "",
    // Polygon Mainnet
    "137": "",
  },
  
  // IPFS Gateway configurations
  ipfs: {
    gateway: "https://ipfs.io/ipfs/",
    alternativeGateways: [
      "https://gateway.pinata.cloud/ipfs/",
      "https://cloudflare-ipfs.com/ipfs/",
      "https://ipfs.filebase.io/ipfs/"
    ],
    pinata: {
      endpoint: "https://api.pinata.cloud/pinning/pinFileToIPFS",
      // API keys with fallbacks
      apiKey: process.env.REACT_APP_PINATA_API_KEY || "dfb9f22a84581fd59e8b",
      apiSecret: process.env.REACT_APP_PINATA_SECRET_KEY || "6db6a1fa8811e390c01570f310954d9784eced9dba303468d01b61805a6da060",
    }
  }
};

/**
 * Get contract address based on current network
 * @param {string} chainId - The chain ID (as a string)
 * @returns {string} The contract address for the current network
 */
export const getContractAddress = (chainId) => {
  return config.contractAddresses[chainId] || config.contractAddresses["31337"];
};

/**
 * Format IPFS URL to be compatible with public gateways
 * @param {string} url - The original IPFS URL or CID
 * @returns {string} A properly formatted HTTP URL
 */
export const formatIpfsUrl = (url) => {
  if (!url) return "";
  
  // Check if URL is already using a gateway
  if (url.startsWith("https://") || url.startsWith("http://")) {
    return url;
  }
  
  // Handle ipfs:// protocol
  if (url.startsWith("ipfs://")) {
    const cid = url.replace("ipfs://", "");
    return `${config.ipfs.gateway}${cid}`;
  }
  
  // Handle direct CID or /ipfs/ path
  if (url.startsWith("Qm") || url.startsWith("/ipfs/")) {
    const cid = url.startsWith("/ipfs/") ? url.replace("/ipfs/", "") : url;
    return `${config.ipfs.gateway}${cid}`;
  }
  
  return url;
};

export default config;
