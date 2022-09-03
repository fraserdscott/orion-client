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
  chainId: 100,
};
