const sourceUtils = require('utils.sourceAssignment');

module.exports = {
    run(creep) {
        // 1. Use the assignment utility
        const source = sourceUtils.assignSource(creep);
        if (!source) return;

        // 2. Check for containers and construction sites near source
        const containers = source.pos.findInRange(FIND_STRUCTURES, 1, {
            filter: s => s.structureType === STRUCTURE_CONTAINER
        });

        const containerSites = source.pos.findInRange(FIND_CONSTRUCTION_SITES, 1, {
            filter: s => s.structureType === STRUCTURE_CONTAINER
        });

        // 3. Auto-place container construction site if needed
        if (containers.length === 0 && containerSites.length === 0) {
            const terrain = source.room.getTerrain();
            let created = false;

            for (let dx = -1; dx <= 1 && !created; dx++) {
                for (let dy = -1; dy <= 1 && !created; dy++) {
                    if (dx === 0 && dy === 0) continue;

                    const x = source.pos.x + dx;
                    const y = source.pos.y + dy;

                    if (terrain.get(x, y) === TERRAIN_MASK_WALL) continue;

                    const pos = new RoomPosition(x, y, source.room.name);
                    const blockers = pos.look();

                    let blocked = false;
                    for (const b of blockers) {
                        if (b.type === LOOK_STRUCTURES || b.type === LOOK_CONSTRUCTION_SITES) {
                            blocked = true;
                            break;
                        }
                    }

                    if (!blocked) {
                        pos.createConstructionSite(STRUCTURE_CONTAINER);
                        created = true;
                    }
                }
            }
        }

        // 4. Prefer standing on the container
        if (containers.length > 0) {
            const container = containers[0];
            if (!creep.pos.isEqualTo(container.pos)) {
                creep.moveTo(container);
                return;
            }
        } else {
            // No container: just stand near the source
            if (!creep.pos.inRangeTo(source, 1)) {
                creep.moveTo(source);
                return;
            }
        }

        // 5. Mine forever
        creep.harvest(source);
    }
};
