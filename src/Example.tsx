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
import { useEffect, useState } from "react";


function Example() {
    const [position, setPosition] = useState<any>({ x: 0, y: 0 });

    useEffect(() => {

        // Create a new World
        const world = createWorld();

        // Define a couple components
        const Position = defineComponent(world, { x: Type.Number, y: Type.Number });
        const Movable = defineComponent(world, { speed: Type.Number });

        defineSystem(world, [Has(Position), Has(Movable)], (update) => {
            setPosition(update.value[0]);
        });

        const entity1 = createEntity(world, [withValue(Position, { x: 0, y: 0 }), withValue(Movable, { speed: 10 })]);

        setInterval(() => {
            const position = getComponentValue(Position, entity1);
            const movable = getComponentValue(Movable, entity1);
            if (position && movable) {
                const newPosition = { x: position.x + movable.speed, y: position.y + movable.speed };
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
