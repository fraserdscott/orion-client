import {
    createWorld,
    createEntity,
    withValue,
    getComponentValue,
    setComponent,
} from "@latticexyz/recs";
import { defineCoordComponent, defineNumberComponent, useComponentValueStream } from "@latticexyz/std-client";
import { useEffect, useState } from "react";
import { setupContracts } from "./setupContracts";


function Example() {
    const [world] = useState(createWorld());
    const [Position] = useState(defineCoordComponent(world));
    const [Movable] = useState(defineNumberComponent(world));
    const positionStream = useComponentValueStream(Position, 0);

    useEffect(() => {
        setupContracts(world).then(r => console.log(r));

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
            <div>{positionStream?.x}</div>
        </div>
    )
}

export default Example;
