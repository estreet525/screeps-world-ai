module.exports = {
    run(room) {
        // Only plan roads in your own rooms
        if (!room.controller || !room.controller.my) return;

        // 🔒 NEW: Don't plan roads while containers or extensions are still being built
        const blockingSites = room.find(FIND_CONSTRUCTION_SITES, {
            filter: s =>
                s.structureType === STRUCTURE_CONTAINER ||
                s.structureType === STRUCTURE_EXTENSION
        });
        if (blockingSites.length > 0) {
            return;
        }

        // Throttle: only run every 100 ticks
        if (Game.time % 100 !== 0) return;

        // Don't overrun construction site limit
        const existingSites = room.find(FIND_CONSTRUCTION_SITES);
        if (existingSites.length > 90) return;

        const spawns = room.find(FIND_MY_SPAWNS);
        if (spawns.length === 0) return;

        const spawn = spawns[0];
        const controller = room.controller;
        const sources = room.find(FIND_SOURCES);
        const storage = room.storage; // <--- we'll use this below

        // Helper: plan a road from A to B
        const planRoad = (fromPos, toPos) => {
            if (!fromPos || !toPos) return;

            const path = room.findPath(fromPos, toPos, {
                ignoreCreeps: true,
                swampCost: 2
            });

            const terrain = room.getTerrain();

            for (const step of path) {
                const x = step.x;
                const y = step.y;

                // Skip walls
                if (terrain.get(x, y) === TERRAIN_MASK_WALL) continue;

                // Check existing structures
                const structures = room.lookForAt(LOOK_STRUCTURES, x, y);
                // If there's any non-road, non-rampart structure, don't try to build here
                if (structures.some(s => s.structureType !== STRUCTURE_ROAD &&
                                         s.structureType !== STRUCTURE_RAMPART)) {
                    continue;
                }

                // If there's already a road or road site, skip
                if (structures.some(s => s.structureType === STRUCTURE_ROAD)) continue;
                const sites = room.lookForAt(LOOK_CONSTRUCTION_SITES, x, y);
                if (sites.some(s => s.structureType === STRUCTURE_ROAD)) continue;

                // Try to place a road construction site
                const result = room.createConstructionSite(x, y, STRUCTURE_ROAD);
                if (result !== OK) {
                    // Likely out of construction slots; bail early
                    // console.log('Road CS fail', result, room.name, x, y);
                    return;
                }
            }
        };

        // 1) Road from spawn to controller
        planRoad(spawn.pos, controller.pos);

        // 2) Roads between spawn/controller and each source (or its container)
        for (const source of sources) {
            // If there is a container near this source, use that as the endpoint
            const containers = source.pos.findInRange(FIND_STRUCTURES, 1, {
                filter: s => s.structureType === STRUCTURE_CONTAINER
            });

            const targetPos = containers.length > 0 ? containers[0].pos : source.pos;

            // spawn <-> source/container
            planRoad(spawn.pos, targetPos);

            // controller <-> source/container
            planRoad(controller.pos, targetPos);
        }

        // 3) Road from controller container to storage (hauler highway)
        if (storage) {
            // Look for the controller container within a small radius of the controller
            const controllerContainers = controller.pos.findInRange(FIND_STRUCTURES, 3, {
                filter: s => s.structureType === STRUCTURE_CONTAINER
            });

            if (controllerContainers.length > 0) {
                // Prefer the actual controller container as endpoint
                planRoad(storage.pos, controllerContainers[0].pos);
            } else {
                // Fallback: at least get a road from storage to controller
                planRoad(storage.pos, controller.pos);
            }
        }
    }
};
