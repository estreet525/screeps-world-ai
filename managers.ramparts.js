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
    if (totalSites > 15) {
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

    for (const exit of exits) {
        let x = exit.x;
        let y = exit.y;

        // Move one tile inward so we're not on the border (0/49)
        if (exit.x === 0) x = 1;
        else if (exit.x === 49) x = 48;
        else if (exit.y === 0) y = 1;
        else if (exit.y === 49) y = 48;

        // Skip if wall
        if (terrain.get(x, y) === TERRAIN_MASK_WALL) continue;

        const structs = room.lookForAt(LOOK_STRUCTURES, x, y);
        if (structs.some(s => s.structureType === STRUCTURE_RAMPART)) continue;

        const sites = room.lookForAt(LOOK_CONSTRUCTION_SITES, x, y);
        // If *any* construction site already exists here, skip (road, etc.)
        if (sites.length > 0) continue;

        const result = room.createConstructionSite(x, y, STRUCTURE_RAMPART);

        if (result === OK) {
            console.log(
                `[RAMPARTS] Placed perimeter rampart in ${room.name} at (${x},${y})`
            );
            // ✅ Success: stop for this tick
            break;
        }

        // If we're out of slots or RCL isn’t enough, log & stop trying this tick
        if (result === ERR_FULL || result === ERR_RCL_NOT_ENOUGH) {
            console.log(
                `[RAMPARTS] Could not place perimeter rampart in ${room.name} at (${x},${y}): ${result}`
            );
            break;
        }

        // For ERR_INVALID_TARGET or other weird cases, just silently move on
        // to the next exit instead of spamming logs on the same tile.
    }
}

function plan(room) {
    return run(room);
}

module.exports = {
    plan,
    run
};
