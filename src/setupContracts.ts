import {
    createNetwork,
    createContracts,
    Mappings,
    createTxQueue,
    createSyncWorker,
    createEncoder,
    NetworkComponentUpdate,
    createSystemExecutor,
} from "@latticexyz/network";

import { Component as SolecsComponent, World as WorldContract } from "@latticexyz/solecs";
import { abi as WorldAbi } from "@latticexyz/solecs/abi/World.json";
import ComponentAbi from "@latticexyz/solecs/abi/Component.json";

import {
    Component,
    Components,
    EntityIndex,
    getComponentEntities,
    getComponentValueStrict,
    removeComponent,
    Schema,
    setComponent,
    Type,
    World,
} from "@latticexyz/recs";

import { keccak256, stretch, toEthAddress } from "@latticexyz/utils";


import { bufferTime, filter, Observable, Subject } from "rxjs";
import { computed, IComputedValue } from "mobx";
import { Contract, ethers, Signer, Wallet } from "ethers";
import { JsonRpcProvider } from "@ethersproject/providers";

import { defineStringComponent } from "@latticexyz/std-client";

import { config } from "./config";

export type ContractComponents = {
    [key: string]: Component<Schema, { contractId: string }>;
};

const WORLD_ADDRESS = "0x5fbdb2315678afecb367f032d93f642f64180aa3";

export async function setupContracts<C extends ContractComponents>(world: World) {
    const SystemsRegistry = defineStringComponent(world, {
        id: "SystemsRegistry",
        metadata: { contractId: "world.component.systems" },
    });

    const ComponentsRegistry = defineStringComponent(world, {
        id: "ComponentsRegistry",
        metadata: { contractId: "world.component.components" },
    });

    const components: ContractComponents = {
        SystemsRegistry,
        ComponentsRegistry,
    };

    const mappings: Mappings<C> = {};

    for (const key of Object.keys(components)) {
        const { contractId } = components[key].metadata;
        mappings[keccak256(contractId)] = key;
    }

    const network = await createNetwork(config);

    const signerOrProvider = computed(() => network.signer.get() || network.providers.get().json);

    const { contracts, config: contractsConfig } = await createContracts<{ World: WorldContract }>({
        config: { World: { abi: WorldAbi, address: WORLD_ADDRESS } },
        signerOrProvider,
    });

    const { txQueue, dispose: disposeTxQueue } = createTxQueue(contracts, network);

    const systems = createSystemExecutor(world, network, SystemsRegistry, {},);

    const { ecsEvent$, config$, dispose } = createSyncWorker<C>();

    function startSync() {
        config$.next({
            provider: config.provider,
            worldContract: contractsConfig.World,
            initialBlockNumber: config.initialBlockNumber ?? 0,
            chainId: config.chainId,
            disableCache: false,
            checkpointServiceUrl: config.checkpointServiceUrl,
        });
    }

    const { txReduced$ } = applyNetworkUpdates(world, components, ecsEvent$, mappings);

    const encoders = createEncoders(world, ComponentsRegistry, signerOrProvider);

    return { txQueue, txReduced$, encoders, network, startSync, systems };
}

async function createEncoders(
    world: World,
    components: Component<{ value: Type.String }>,
    signerOrProvider: IComputedValue<JsonRpcProvider | Signer>
) {
    const encoders = {} as Record<string, ReturnType<typeof createEncoder>>;

    async function fetchAndCreateEncoder(entity: EntityIndex) {
        const componentAddress = toEthAddress(world.entities[entity]);
        const componentId = getComponentValueStrict(components, entity).value;
        const componentContract = new Contract(
            componentAddress,
            ComponentAbi.abi,
            signerOrProvider.get()
        ) as SolecsComponent;
        const [componentSchemaPropNames, componentSchemaTypes] = await componentContract.getSchema();
        encoders[componentId] = createEncoder(componentSchemaPropNames, componentSchemaTypes);
    }

    // Initial setup
    for (const entity of getComponentEntities(components)) fetchAndCreateEncoder(entity);

    // Keep up to date
    const subscription = components.update$.subscribe((update) => fetchAndCreateEncoder(update.entity));
    world.registerDisposer(() => subscription?.unsubscribe());

    return encoders;
}

/**
 * Sets up synchronization between contract components and client components
 */
function applyNetworkUpdates<C extends Components>(
    world: World,
    components: ContractComponents,
    ecsEvent$: Observable<NetworkComponentUpdate<C>>,
    mappings: Mappings<C>
) {
    const txReduced$ = new Subject<string>();

    const ecsEventSub = ecsEvent$.subscribe((update) => {
        const entityIndex = world.entityToIndex.get(update.entity) ?? world.registerEntity({ id: update.entity });
        const componentKey = mappings[update.component] as any;

        if (update.value === undefined) {
            // undefined value means component removed
            removeComponent(components[componentKey] as Component<Schema>, entityIndex);
        } else {
            setComponent(components[componentKey] as Component<Schema>, entityIndex, update.value);
        }

        if (update.lastEventInTx) txReduced$.next(update.txHash);
    });

    return { txReduced$: txReduced$.asObservable() };
}