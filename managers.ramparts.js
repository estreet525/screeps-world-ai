// managers.ramparts

function run(room) {
    const controller = room.controller;
    if (!controller || !controller.my) return;

    // Don't bother before RCL3
    if (controller.level < 3) return;

    // Skip while containers/extensions are still under construction
    const blockingSites = room.find(FIND_CONSTRUCTION_SITES, {
        filter: s =>
            s.structureType === STRUCTURE_CONTAINER ||
            s.structureType === STRUCTURE_EXTENSION
    });
    if (blockingSites.length > 0) {
        return;
    }

    // Keep overall construction sites under control
    const totalSites = room.find(FIND_CONSTRUCTION_SITES).length;
    if (totalSites > 20) {
        return;
    }

    // ---------- Core structure protection ----------

    const important = [];

    const spawns = room.find(FIND_MY_SPAWNS);
    for (const s of spawns) important.push(s);

    const towers = room.find(FIND_MY_STRUCTURES, {
        filter: s => s.structureType === STRUCTURE_TOWER
    });
    for (const t of towers) important.push(t);

    const storages = room.find(FIND_MY_STRUCTURES, {
        filter: s => s.structureType === STRUCTURE_STORAGE
    });
    for (const st of storages) important.push(st);

    let placed = false;

    for (const obj of important) {
        const x = obj.pos.x;
        const y = obj.pos.y;

        const structs = room.lookForAt(LOOK_STRUCTURES, x, y);
        if (structs.some(s => s.structureType === STRUCTURE_RAMPART)) {
            continue;
        }

        const sites = room.lookForAt(LOOK_CONSTRUCTION_SITES, x, y);
        if (sites.some(s => s.structureType === STRUCTURE_RAMPART)) {
            continue;
        }

        const result = room.createConstructionSite(x, y, STRUCTURE_RAMPART);
        if (result === OK) {
            console.log(
                `[RAMPARTS] Placed core rampart over ${obj.structureType || 'object'} in ${room.name} at (${x},${y})`
            );
        } else if (result !== ERR_FULL && result !== ERR_RCL_NOT_ENOUGH) {
            console.log(
                `[RAMPARTS] Failed to place core rampart in ${room.name} at (${x},${y}): ${result}`
            );
        }

        placed = true;
        break;
    }

    // If we placed a core rampart this tick, don't also do perimeter
    if (placed) return;

    // ---------- Perimeter (entrance) ramparts ----------

    const ramparts = room.find(FIND_STRUCTURES, {
        filter: s => s.structureType === STRUCTURE_RAMPART
    });
    const MAX_PERIMETER_RAMPARTS = 40;
    if (ramparts.length >= MAX_PERIMETER_RAMPARTS) {
        return;
    }

    const terrain = room.getTerrain();
    const exits = room.find(FIND_EXIT);

    // For each exit, we’ll try a couple of tiles a bit *inside* the room,
    // not just a single fixed spot like (15,1).
    for (const exit of exits) {
        const candidates = [];

        if (exit.x === 0) {
            // Left edge → test (1,y), (2,y)
            candidates.push({ x: 1, y: exit.y }, { x: 2, y: exit.y });
        } else if (exit.x === 49) {
            // Right edge → test (48,y), (47,y)
            candidates.push({ x: 48, y: exit.y }, { x: 47, y: exit.y });
        } else if (exit.y === 0) {
            // Top edge → test (x,1), (x,2)
            candidates.push({ x: exit.x, y: 1 }, { x: exit.x, y: 2 });
        } else if (exit.y === 49) {
            // Bottom edge → test (x,48), (x,47)
            candidates.push({ x: exit.x, y: 48 }, { x: exit.x, y: 47 });
        }

        for (const pos of candidates) {
            const x = pos.x;
            const y = pos.y;

            // Bounds check, just in case
            if (x <= 0 || x >= 49 || y <= 0 || y >= 49) continue;

            // Skip terrain walls
            if (terrain.get(x, y) === TERRAIN_MASK_WALL) continue;

            const structs = room.lookForAt(LOOK_STRUCTURES, x, y);
            // If we already have a rampart, skip
            if (structs.some(s => s.structureType === STRUCTURE_RAMPART)) continue;

            const sites = room.lookForAt(LOOK_CONSTRUCTION_SITES, x, y);
            // Skip if *any* construction site is already here (road, whatever)
            if (sites.length > 0) continue;

            const result = room.createConstructionSite(x, y, STRUCTURE_RAMPART);

            if (result === OK) {
                console.log(
                    `[RAMPARTS] Placed perimeter rampart in ${room.name} at (${x},${y})`
                );
                // ✅ Success: stop after placing ONE perimeter tile this tick
                return;
            }

            // Out of slots / RCL too low → don't hammer more this tick
            if (result === ERR_FULL || result === ERR_RCL_NOT_ENOUGH) {
                console.log(
                    `[RAMPARTS] Could not place perimeter rampart in ${room.name} at (${x},${y}): ${result}`
                );
                return;
            }

            // For ERR_INVALID_TARGET or other non-fatal stuff:
            // just try the next candidate or next exit without logging spam.
        }

        // If none of this exit's candidates worked, we move on to the next exit.
    }
}

function plan(room) {
    return run(room);
}

module.exports = {
    plan,
    run
};
