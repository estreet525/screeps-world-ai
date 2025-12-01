// managers.storage.js

const STORAGE_MIN_RCL = 4;

function findExistingStorage(room) {
    if (room.storage) return room.storage;

    const existing = room.find(FIND_MY_STRUCTURES, {
        filter: s => s.structureType === STRUCTURE_STORAGE
    });

    return existing[0] || null;
}

function findStorageSite(room) {
    const sites = room.find(FIND_MY_CONSTRUCTION_SITES, {
        filter: s => s.structureType === STRUCTURE_STORAGE
    });

    return sites[0] || null;
}

function findStorageLocation(room) {
    const spawns = room.find(FIND_MY_SPAWNS);
    const spawn = spawns[0];
    if (!spawn) return null;

    // Tiles around the spawn in preference order
    const offsets = [
        { x:  1, y:  0 },
        { x: -1, y:  0 },
        { x:  0, y:  1 },
        { x:  0, y: -1 },
        { x:  1, y:  1 },
        { x:  1, y: -1 },
        { x: -1, y:  1 },
        { x: -1, y: -1 },
        { x:  2, y:  0 },
        { x: -2, y:  0 },
        { x:  0, y:  2 },
        { x:  0, y: -2 },
    ];

    const terrain = room.getTerrain();

    for (const off of offsets) {
        const x = spawn.pos.x + off.x;
        const y = spawn.pos.y + off.y;

        // Stay away from edges
        if (x <= 1 || x >= 48 || y <= 1 || y >= 48) continue;

        // Skip walls
        if (terrain.get(x, y) === TERRAIN_MASK_WALL) continue;

        const pos = new RoomPosition(x, y, room.name);

        // Skip if something is already built here
        const structures = pos.lookFor(LOOK_STRUCTURES);
        if (structures.length) continue;

        // Skip if any construction site is already here
        const sites = pos.lookFor(LOOK_CONSTRUCTION_SITES);
        if (sites.length) continue;

        // If you want to avoid placing storage on a road tile, you could
        // also check for roads here and continue if found.

        return pos;
    }

    // If we don't find anything in our ring, just give up quietly.
    return null;
}

module.exports = {
    /**
     * Ensure there is exactly one storage (or storage construction site)
     * in any owned room with controller level >= 4.
     *
     * @param {Room} room
     */
    run(room) {
        const controller = room.controller;
        if (!controller || !controller.my) return;

        if (controller.level < STORAGE_MIN_RCL) return;

        // Already have a built storage?
        if (findExistingStorage(room)) return;

        // Already have a storage construction site?
        if (findStorageSite(room)) return;

        const pos = findStorageLocation(room);
        if (!pos) {
            // Optional: noisy for debugging, then you can comment it out
            // console.log(`[STORAGE] No valid position found in ${room.name}`);
            return;
        }

        const result = room.createConstructionSite(pos, STRUCTURE_STORAGE);

        if (result === OK) {
            console.log(
                `[STORAGE] Placed storage site in ${room.name} at (${pos.x}, ${pos.y})`
            );
        } else if (result !== ERR_RCL_NOT_ENOUGH && result !== ERR_INVALID_ARGS) {
            // Filter out spammy / expected errors, log the rest
            console.log(
                `[STORAGE] Failed to place storage site in ${room.name}: ${result}`
            );
        }
    }
};
