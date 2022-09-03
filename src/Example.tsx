import {
    createWorld,
    defineComponent,
    createEntity,
    withValue,
    defineSystem,
    Has,
    getComponentValue,
    setComponent,
    Type,
} from "@latticexyz/recs";
import { defineCoordComponent, defineNumberComponent } from "@latticexyz/std-client";
import { useEffect, useState } from "react";


function Example() {
    const [position, setPosition] = useState<any>({ x: 0, y: 0 });

    useEffect(() => {

        // Create a new World
        const world = createWorld();

        // Define a couple components
        const Position = defineCoordComponent(world);
        const Movable = defineNumberComponent(world);

        defineSystem(world, [Has(Position), Has(Movable)], (update) => {
            setPosition(update.value[0]);
        });

        const entity1 = createEntity(world, [withValue(Position, { x: 0, y: 0 }), withValue(Movable, { value: 10 })]);

        setInterval(() => {
            const position = getComponentValue(Position, entity1);
            const movable = getComponentValue(Movable, entity1);
            if (position && movable) {
                const newPosition = { x: position.x + movable.value, y: position.y + movable.value };
                setComponent(Position, entity1, newPosition);
            }
        }, 1000);
    }, [])

    return (
        <div className="App">
            <div>{position.x}</div>
        </div>
    )
}

export default Example;
