import {
    Component,
    createWorld, defineComponent, getComponentEntities, getComponentValue, Schema, setComponent, Type
} from "@latticexyz/recs";
import { defineCoordComponent, defineStringComponent } from "@latticexyz/std-client";
import { Contract } from "ethers";
import { useEffect, useRef, useState } from "react";
import { setupContracts } from "./setupContracts";
import { abi as MoveAbi } from "./out/MoveSystem.sol/MoveSystem.json";
import { abi as SpawnAbi } from "./out/SpawnSystem.sol/SpawnSystem.json";
import { createDecoder } from "@latticexyz/network";
import ComponentAbi from "@latticexyz/solecs/abi/Component.json";
import { Component as SolecsComponent } from "@latticexyz/solecs";

const ZOOM = 100;
const PRECISION = 10 ** 18;

const MOVE_ADDRESS = "0x9fe46736679d2d9a65f0992f2272de9f3c7fa6e0";
const SPAWN_ADDRESS = "0x5fc8d32690cc91d4c39d9d3abcbd16989f875707";

const keyToDirection: Record<string, number> = { w: 0, d: 1, s: 2, a: 3 };

const start = async () => {
    const world = createWorld();
    const Components = {
        Position: defineCoordComponent(world, { id: "Position", metadata: { contractId: "example.component.Position" } }),
        Square: defineComponent(world, { x: Type.Number, y: Type.Number, width: Type.Number, height: Type.Number }, { id: "Square", metadata: { contractId: "example.component.Square" } }),
        SystemsRegistry: defineStringComponent(world, {
            id: "SystemsRegistry",
            metadata: { contractId: "world.component.systems" },
        }),
        ComponentsRegistry: defineStringComponent(world, {
            id: "ComponentsRegistry",
            metadata: { contractId: "world.component.components" },
        })
    };

    const s = await setupContracts(world, Components);
    const filter = s.contracts.get().World.filters.ComponentValueSet();
    s.network.providers.get().json.on(filter, c => {
        console.log(c);

        const component = c.topics[1];
        const entity = c.topics[3];
        const componentKey = s.mappings[component];

        s.contracts.get().World.getComponent(component).then(address => {
            const contract = new Contract(address, ComponentAbi.abi, s.network.providers.get().json) as SolecsComponent;

            contract.getSchema().then(([keys, values]) => {
                contract.getRawValue(entity).then(data => {
                    const decoder = createDecoder(
                        keys,
                        values
                    );

                    const decoded = decoder(data);
                    setComponent(Components[componentKey] as Component<Schema>, world.entityToIndex.get(entity) ?? world.registerEntity({ id: entity }), decoded);
                });
            })
        });
    });

    return {
        setup: s,
        Components
    };
}

function Example() {
    const [stuff, setStuff] = useState<any>({});
    const canvasRef = useRef(null);

    useEffect(() => {
        start().then(st => {
            setStuff(st);
        })
    }, []);

    useEffect(() => {
        if (stuff && stuff.Components) {
            const canvas: any = canvasRef.current;
            const context = canvas.getContext("2d");

            // BACKGROUND
            context.fillStyle = "#000000";
            context.fillRect(0, 0, context.canvas.width, context.canvas.height);

            // OBJECTS
            for (const entity of getComponentEntities(stuff.Components.Position)) {
                const p = getComponentValue(stuff.Components.Position, entity);

                context.fillStyle = "#FFFFFF";
                context.fillRect(
                    (p.x / PRECISION - 0.5) * ZOOM + context.canvas.width / 2,
                    context.canvas.height - (p.y / PRECISION + 0.5) * ZOOM - context.canvas.height / 2,
                    1,
                    1
                )
            };
            for (const entity of getComponentEntities(stuff.Components.Square)) {
                const s = getComponentValue(stuff.Components.Square, entity);

                context.fillStyle = "#FFFFFF";
                context.fillRect(
                    (s.x / PRECISION - 0.5) * ZOOM + context.canvas.width / 2,
                    context.canvas.height - (s.y / PRECISION + 0.5) * ZOOM - context.canvas.height / 2,
                    s.width / PRECISION * ZOOM,
                    s.height / PRECISION * ZOOM
                )

            }
        }
    }, [stuff]);

    useEffect(() => {
        if (stuff.setup) {
            window.addEventListener("keydown", e => {
                if (e.key in keyToDirection) {
                    const contract = new Contract(MOVE_ADDRESS, MoveAbi, stuff.setup.network.signer.get());

                    contract.executeTyped(keyToDirection[e.key]);
                }
            });
        }
    }, [stuff.setup]);

    return (
        <div className="App">
            <canvas
                ref={canvasRef}
            />
            <button onClick={() => {
                const contract = new Contract(SPAWN_ADDRESS, SpawnAbi, stuff.setup.network.signer.get());

                contract.execute([]);
            }}>Spawn</button>
        </div >
    )
}

export default Example;
