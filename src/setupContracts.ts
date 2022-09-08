import {
    createNetwork,
    createContracts,
    Mappings,
    createTxQueue,
} from "@latticexyz/network";

import { World as WorldContract } from "@latticexyz/solecs";
import { abi as WorldAbi } from "@latticexyz/solecs/abi/World.json";

import {
    Component,
    Schema,
    World,
} from "@latticexyz/recs";

import { keccak256 } from "@latticexyz/utils";

import { computed } from "mobx";
import { config } from "./config";

export type ContractComponents = {
    [key: string]: Component<Schema, { contractId: string }>;
};

const WORLD_ADDRESS = "0x5fbdb2315678afecb367f032d93f642f64180aa3";

export async function setupContracts<C extends ContractComponents>(world: World, components: C) {
    const mappings: Mappings<C> = {};

    for (const key of Object.keys(components)) {
        const { contractId } = components[key].metadata;
        mappings[keccak256(contractId)] = key;
    }

    const network = await createNetwork(config);

    const signerOrProvider = computed(() => network.signer.get() || network.providers.get().json);

    const { contracts } = await createContracts<{ World: WorldContract }>({
        config: { World: { abi: WorldAbi, address: WORLD_ADDRESS } },
        signerOrProvider,
    });

    const { txQueue, dispose: disposeTxQueue } = createTxQueue(contracts, network, { devMode: true });

    console.log(txQueue.World.)
    return { network, contracts, mappings };
}
