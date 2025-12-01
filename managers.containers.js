// src/managers.containers.js

// Helper: is there already a container or container construction site near a pos?
function hasContainerNearby(room, pos, range = 1) {
    for (let dx = -range; dx <= range; dx++) {
        for (let dy = -range; dy <= range; dy++) {
            const x = pos.x + dx;
            const y = pos.y + dy;
            if (x < 0 || x > 49 || y < 0 || y > 49) continue;

            const structs = room.lookForAt(LOOK_STRUCTURES, x, y);
            if (structs.some(s => s.structureType === STRUCTURE_CONTAINER)) {
                return true;
            }

            const sites = room.lookForAt(LOOK_CONSTRUCTION_SITES, x, y);
            if (sites.some(s => s.structureType === STRUCTURE_CONTAINER)) {
                return true;
            }
        }
    }
    return false;
}

// Helper: choose a good tile near a source to place a container
function findContainerSpotForSource(room, source) {
    const terrain = room.getTerrain();

    // Check tiles in a 1-tile ring around the source
    for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
            if (dx === 0 && dy === 0) continue;

            const x = source.pos.x + dx;
            const y = source.pos.y + dy;
            if (x < 0 || x > 49 || y < 0 || y > 49) continue;

            if (terrain.get(x, y) === TERRAIN_MASK_WALL) continue;

            const structs = room.lookForAt(LOOK_STRUCTURES, x, y);
            if (structs.length > 0) continue;

            const sites = room.lookForAt(LOOK_CONSTRUCTION_SITES, x, y);
            if (sites.length > 0) continue;

            // This tile is open and walkable → good enough for a container
            return new RoomPosition(x, y, room.name);
        }
    }

    return null;
}

function findContainerSpotForController(room) {
    const controller = room.controller;
    if (!controller) return null;

    const terrain = room.getTerrain();

    // Prefer range 1 around controller, then range 2
    const ranges = [1, 2];

    for (const range of ranges) {
        for (let dx = -range; dx <= range; dx++) {
            for (let dy = -range; dy <= range; dy++) {
                const x = controller.pos.x + dx;
                const y = controller.pos.y + dy;

                // Stay inside room bounds
                if (x <= 0 || x >= 49 || y <= 0 || y >= 49) continue;

                if (terrain.get(x, y) === TERRAIN_MASK_WALL) continue;

                const pos = new RoomPosition(x, y, room.name);

                // Skip if any structure already there
                if (room.lookForAt(LOOK_STRUCTURES, pos).length > 0) continue;

                // Skip if any construction site already there
                if (room.lookForAt(LOOK_CONSTRUCTION_SITES, pos).length > 0)
                    continue;

                return pos;
            }
        }
    }

    // No suitable tile found
    return null;
}


function plan(room) {
    if (!room.controller || !room.controller.my) return;

    // Don't over-spam construction sites in general
    const totalSites = room.find(FIND_MY_CONSTRUCTION_SITES).length;
    if (totalSites > 10) return;

    let placed = false;

    // ---------- Source containers ----------
    const sources = room.find(FIND_SOURCES);
    for (const source of sources) {
        if (hasContainerNearby(room, source.pos, 1)) {
            continue; // this source already has a container or site nearby
        }

        const spot = findContainerSpotForSource(room, source);
        if (!spot) continue;

        const result = room.createConstructionSite(spot, STRUCTURE_CONTAINER);
        if (result === OK) {
            console.log(
                `[CONTAINERS] Placed container site near source ${source.id} in ${room.name} at (${spot.x},${spot.y})`
            );
        } else {
            console.log(
                `[CONTAINERS] Failed to place container near source ${source.id} in ${room.name}: ${result}`
            );
        }

        // Only place one new container site per tick per room
        placed = true;
        break;
    }

    if (placed) return;

    // ---------- Controller container (after storage exists) ----------

    // Only start this optimization once storage is actually built.
    // room.storage is null/undefined until the structure is finished.
    if (!room.storage) return;

    const controller = room.controller;
    if (!controller) return;

    // If there's already a container (or container site) near the controller, we're done.
    if (hasContainerNearby(room, controller.pos, 2)) return;

    const ctrlSpot = findContainerSpotForController(room);
    if (!ctrlSpot) return;

    const res = room.createConstructionSite(ctrlSpot, STRUCTURE_CONTAINER);
    if (res === OK) {
        console.log(
            `[CONTAINERS] Placed controller container site in ${room.name} at (${ctrlSpot.x},${ctrlSpot.y})`
        );
    } else {
        console.log(
            `[CONTAINERS] Failed to place controller container in ${room.name}: ${res}`
        );
    }
}


function run(room) {
    // For now, containers don't need active per-tick behavior.
    // This is just here to match the pattern towersManager.plan/run().
    // In the future we could put container health checks, etc. here.
}

module.exports = {
    plan,
    run
};
