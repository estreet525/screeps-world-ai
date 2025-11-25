// src/managers.towers.js

const allies = Memory.allies || []; // usernames you won't shoot

// ---------- Helper functions ----------

function isHostile(creep) {
    if (!creep.owner) return true;
    if (allies.includes(creep.owner.username)) return false;
    return true;
}

function getHostileScore(creep, spawn) {
    const body = creep.body || [];
    const hasHeal   = body.some(p => p.type === HEAL);
    const hasAttack = body.some(p => p.type === ATTACK || p.type === RANGED_ATTACK);

    let score = 0;
    if (hasHeal)   score += 50;
    if (hasAttack) score += 30;

    if (spawn) {
        const range = creep.pos.getRangeTo(spawn);
        score += Math.max(0, 20 - range); // closer = more score
    }

    const hpRatio = creep.hits / creep.hitsMax;
    score += (1 - hpRatio) * 10; // favor finishing weakened targets

    return score;
}

function chooseHostileTarget(room, hostiles) {
    const spawn = room.find(FIND_MY_STRUCTURES, {
        filter: { structureType: STRUCTURE_SPAWN }
    })[0];

    const valid = hostiles.filter(isHostile);
    if (!valid.length) return null;

    valid.sort((a, b) => getHostileScore(b, spawn) - getHostileScore(a, spawn));
    return valid[0];
}

function chooseHealTarget(room) {
    const injured = room.find(FIND_MY_CREEPS, {
        filter: c => c.hits < c.hitsMax
    });
    if (!injured.length) return null;

    injured.sort((a, b) => (a.hits / a.hitsMax) - (b.hits / b.hitsMax));
    return injured[0];
}

function chooseRepairTarget(room) {
    // 1) Critical roads/containers below 50%
    let targets = room.find(FIND_STRUCTURES, {
        filter: s =>
            (s.structureType === STRUCTURE_ROAD ||
             s.structureType === STRUCTURE_CONTAINER) &&
            s.hits < s.hitsMax * 0.5
    });

    if (targets.length) {
        targets.sort((a, b) => a.hits - b.hits);
        return targets[0];
    }

    // 2) Light wall/rampart maintenance up to a cap
    const WALL_CAP = 50000; // bump this up at higher RCLs
    targets = room.find(FIND_STRUCTURES, {
        filter: s =>
            (s.structureType === STRUCTURE_RAMPART ||
             s.structureType === STRUCTURE_WALL) &&
            s.hits < WALL_CAP
    });

    if (targets.length) {
        targets.sort((a, b) => a.hits - b.hits);
        return targets[0];
    }

    return null;
}

// ---------- Placement logic ----------

function plan(room) {
    if (!room.controller || !room.controller.my) return;

    const level = room.controller.level;
    if (level < 3) return; // no tower before RCL3

    const allowed = CONTROLLER_STRUCTURES[STRUCTURE_TOWER][level];

    const existing = room.find(FIND_MY_STRUCTURES, {
        filter: s => s.structureType === STRUCTURE_TOWER
    }).length;

    const sites = room.find(FIND_MY_CONSTRUCTION_SITES, {
        filter: s => s.structureType === STRUCTURE_TOWER
    }).length;

    if (existing + sites >= allowed) return;

    const spawn = room.find(FIND_MY_STRUCTURES, {
        filter: s => s.structureType === STRUCTURE_SPAWN
    })[0];
    if (!spawn) return;

    // Preferred offsets around the spawn for towers.
    // Adjust if you want a different core layout.
    const offsets = [
        { x: 1, y: -1 },
        { x: -1, y: -1 },
        { x: 1, y: 1 },
        { x: -1, y: 1 },
        { x: 2, y: 0 },
        { x: -2, y: 0 },
        { x: 0, y: 2 },
        { x: 0, y: -2 }
    ];

    for (const { x, y } of offsets) {
        const pos = new RoomPosition(
            spawn.pos.x + x,
            spawn.pos.y + y,
            room.name
        );

        if (pos.x <= 0 || pos.x >= 49 || pos.y <= 0 || pos.y >= 49) continue;

        const terrain = room.lookForAt(LOOK_TERRAIN, pos)[0];
        if (terrain === 'wall') continue;

        const hasStructures = room.lookForAt(LOOK_STRUCTURES, pos).length > 0;
        const hasSites = room.lookForAt(LOOK_CONSTRUCTION_SITES, pos).length > 0;
        if (hasStructures || hasSites) continue;

        const result = room.createConstructionSite(pos, STRUCTURE_TOWER);
        if (result === OK) {
            console.log(
                `[TOWERS] Placed tower site at ${room.name} (${pos.x},${pos.y})`
            );
        } else {
            console.log(
                `[TOWERS] Failed to place tower at ${room.name} (${pos.x},${pos.y}): ${result}`
            );
        }

        // Only try one position per tick so we don't spam
        break;
    }
}

// ---------- Safe mode / threat evaluation ----------

function evaluateThreatLevel(room, hostiles) {
    if (!hostiles || !hostiles.length) return 0;

    const spawn = room.find(FIND_MY_STRUCTURES, {
        filter: s => s.structureType === STRUCTURE_SPAWN
    })[0];
    const controller = room.controller;

    let totalAttackParts = 0;
    let totalHealParts = 0;
    let closestToCore = 999;

    for (const creep of hostiles) {
        const body = creep.body || [];
        for (const part of body) {
            if (part.type === ATTACK || part.type === RANGED_ATTACK) totalAttackParts++;
            if (part.type === HEAL) totalHealParts++;
        }

        if (spawn) {
            closestToCore = Math.min(closestToCore, creep.pos.getRangeTo(spawn));
        }
        if (controller) {
            closestToCore = Math.min(closestToCore, creep.pos.getRangeTo(controller));
        }
    }

    // Very crude threat score heuristic
    // Big creeps with lots of ATTACK/HEAL that are close to spawn/controller = bad
    const score = totalAttackParts * 3 + totalHealParts * 4 + Math.max(0, 10 - closestToCore) * 2;

    return score;
}

function maybeActivateSafeMode(room, hostiles, towers) {
    const controller = room.controller;
    if (!controller || !controller.my) return;
    if (controller.safeMode || controller.safeModeCooldown) return;
    if (!controller.safeModeAvailable || controller.safeModeAvailable <= 0) return;

    if (!hostiles || !hostiles.length) return;

    const threatScore = evaluateThreatLevel(room, hostiles);

    // Check if we have any "real" defenders (anything with ATTACK/RANGED/HEAL)
    const defenders = room.find(FIND_MY_CREEPS, {
        filter: c => c.body.some(p =>
            p.type === ATTACK || p.type === RANGED_ATTACK || p.type === HEAL
        )
    });

    // Tower energy situation
    let towerEnergyPct = 0;
    if (towers && towers.length) {
        const sample = towers[0];
        const energy = sample.store
            ? sample.store.getUsedCapacity(RESOURCE_ENERGY)
            : sample.energy;
        const capacity = sample.store
            ? sample.store.getCapacity(RESOURCE_ENERGY)
            : sample.energyCapacity;
        towerEnergyPct = capacity > 0 ? energy / capacity : 0;
    }

    // Controller downgrade risk
    const controllerDanger =
        controller.ticksToDowngrade &&
        controller.ticksToDowngrade < 5000; // pretty low, but not critical

    // Heuristics:
    // - threatScore high (big angry boy)
    // - AND no defenders OR tower low on energy
    // - AND hostile is close-ish to core
    if (threatScore >= 40 && (defenders.length === 0 || towerEnergyPct < 0.3)) {
        const actResult = controller.activateSafeMode();
        if (actResult === OK) {
            console.log(
                `[DEFENSE] Auto Safe Mode activated in ${room.name}. ` +
                `threatScore=${threatScore}, defenders=${defenders.length}, towerEnergy=${(towerEnergyPct * 100).toFixed(0)}%`
            );
        } else {
            console.log(
                `[DEFENSE] Failed to auto-activate Safe Mode in ${room.name}: ${actResult}`
            );
        }
        return;
    }

    // Optional: if controller close to downgrade AND under moderate threat, also pop it
    if (controllerDanger && threatScore >= 20) {
        const actResult = controller.activateSafeMode();
        if (actResult === OK) {
            console.log(
                `[DEFENSE] Auto Safe Mode (controller danger) in ${room.name}. ` +
                `threatScore=${threatScore}, ticksToDowngrade=${controller.ticksToDowngrade}`
            );
        }
    }
}


// ---------- Tower brain ----------

function run(room) {
    if (!room) return;

    const towers = room.find(FIND_MY_STRUCTURES, {
        filter: s => s.structureType === STRUCTURE_TOWER
    });
    if (!towers.length) return;

    const sample = towers[0];
    const energy = sample.store
        ? sample.store.getUsedCapacity(RESOURCE_ENERGY)
        : sample.energy;
    const capacity = sample.store
        ? sample.store.getCapacity(RESOURCE_ENERGY)
        : sample.energyCapacity;
    const energyPct = capacity > 0 ? energy / capacity : 0;

    // 1) Attack hostiles
    const hostiles = room.find(FIND_HOSTILE_CREEPS, { filter: isHostile });
    if (hostiles.length) {
        const target = chooseHostileTarget(room, hostiles);
        if (target) {
            for (const tower of towers) {
                tower.attack(target);
            }
        }
        
        // After we've tried shooting, decide if this situation is bad enough
        // to warrant Safe Mode.
        maybeActivateSafeMode(room, hostiles, towers);
        return;
    }

    // 2) Heal friendlies
    const healTarget = chooseHealTarget(room);
    if (healTarget) {
        for (const tower of towers) {
            tower.heal(healTarget);
        }
        return;
    }

    // 3) Repair (only if we have decent energy reserve)
    if (energyPct < 0.5) return;

    const repairTarget = chooseRepairTarget(room);
    if (repairTarget) {
        for (const tower of towers) {
            tower.repair(repairTarget);
        }
    }
}

module.exports = {
    plan,
    run
};
