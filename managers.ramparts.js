// managers.ramparts

function run(room) {
    const controller = room.controller;
    if (!controller || !controller.my) return;

    // Don't bother before RCL3
    if (controller.level < 3) return;

    // 🔒 Priority gating:
    // Skip ramparts while higher-priority ECO structures are still being built.
    // (Allow roads to be in progress; we care more about defense now.)
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

    // Collect important structures to protect
    const important = [];

    // Spawns
    const spawns = room.find(FIND_MY_SPAWNS);
    for (const s of spawns) important.push(s);

    // Towers
    const towers = room.find(FIND_MY_STRUCTURES, {
        filter: s => s.structureType === STRUCTURE_TOWER
    });
    for (const t of towers) important.push(t);

    // NOTE: we are *not* adding the controller itself here for now,
    // because room.createConstructionSite on that tile returns ERR_INVALID_TARGET
    // in this setup and just spams failures.

    // Storage (if/when you have one)
    const storages = room.find(FIND_MY_STRUCTURES, {
        filter: s => s.structureType === STRUCTURE_STORAGE
    });
    for (const st of storages) important.push(st);

    // Try to place at most ONE new rampart site per tick
    for (const obj of important) {
        const x = obj.pos.x;
        const y = obj.pos.y;

        // Check for existing rampart or rampart site on this tile
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
                `[RAMPARTS] Placed rampart site over ${obj.structureType || 'object'} in ${room.name} at (${x},${y})`
            );
        } else if (result !== ERR_FULL && result !== ERR_RCL_NOT_ENOUGH) {
            console.log(
                `[RAMPARTS] Failed to place rampart in ${room.name} at (${x},${y}): ${result}`
            );
        }

        // Only try one tile per tick
        break;
    }
}

// For consistency with other managers, plan() just delegates to run()
function plan(room) {
    return run(room);
}

module.exports = {
    plan,
    run
};
