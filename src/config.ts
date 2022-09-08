import { NetworkConfig } from "@latticexyz/network";

export const config: NetworkConfig = {
  clock: {
    period: 1000,
    initialTime: 0,
    syncInterval: 1000,
  },
  provider: {
    jsonRpcUrl: "http://localhost:8545/",
    wsRpcUrl: "ws://localhost:8545",
    options: {
      batch: true,
      pollingInterval: 1000,
      skipNetworkCheck: true,
    },
  },
  privateKey: "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
  chainId: 31337,
};
