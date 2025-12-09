// roles.hauler.js

function findControllerContainer(room) {
    const controller = room.controller;
    if (!controller) return null;

    const containers = room.find(FIND_STRUCTURES, {
        filter: s => s.structureType === STRUCTURE_CONTAINER
    });

    if (containers.length === 0) return null;

    // Pick the container closest to the controller as the "RC container"
    let best = null;
    let bestRange = Infinity;

    for (const c of containers) {
        const range = controller.pos.getRangeTo(c);
        if (range < bestRange) {
            bestRange = range;
            best = c;
        }
    }

    // Optional: if you want to enforce "near-ish" to controller, uncomment this:
    // if (bestRange > 6) return null;

    return best;
}

module.exports = {
    run: function (creep) {

        // === TRAVEL TO TARGET ROOM FIRST ===
        if (creep.memory.targetRoom && creep.room.name !== creep.memory.targetRoom) {
            const targetPos = new RoomPosition(25, 25, creep.memory.targetRoom);
            creep.moveTo(targetPos, { visualizePathStyle: { stroke: '#ffaa00' } });
            return; // <-- VERY IMPORTANT so no other logic runs yet
        }
        
        const room = creep.room;
        const storage = room.storage;
        const controllerContainer = findControllerContainer(room);

        // === STATE MACHINE ===
        if (creep.memory.hauling && creep.store[RESOURCE_ENERGY] === 0) {
            creep.memory.hauling = false;
        }
        if (!creep.memory.hauling && creep.store.getFreeCapacity() === 0) {
            creep.memory.hauling = true;
        }

        // === NOT HAULING → GET ENERGY ===
        const energy = require('utils.energy');

        if (!creep.memory.hauling) {
            const target = energy.getBalancedEnergyTarget(creep);
            if (!target) return;

            if (target.amount) {
                // dropped pile
                if (creep.pickup(target) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(target);
                }
            } else {
            // container
            if (creep.withdraw(target, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                creep.moveTo(target);
                }
            }
            return;
        }


        // === HAULING → DELIVER ENERGY ===

        let target = null;

        // 1) Spawn + extensions first
        let targets = room.find(FIND_MY_STRUCTURES, {
            filter: s =>
                (s.structureType === STRUCTURE_SPAWN ||
                 s.structureType === STRUCTURE_EXTENSION) &&
                s.energy < s.energyCapacity
        });

        if (targets.length > 0) {
            target = creep.pos.findClosestByRange(targets);
        }

        // 2) Controller container for upgrader
        if (!target && controllerContainer &&
            controllerContainer.store.getFreeCapacity(RESOURCE_ENERGY) > 0) {
            target = controllerContainer;
        }

        // 3) Towers (ONLY if they are actually low)
        if (!target) {
            targets = room.find(FIND_MY_STRUCTURES, {
                filter: s =>
                    s.structureType === STRUCTURE_TOWER &&
                    s.store[RESOURCE_ENERGY] < 600 // <-- THRESHOLD
            });
            if (targets.length > 0) {
                target = creep.pos.findClosestByRange(targets);
            }
        }

        // 4) Fallback: storage (in case they’re carrying and nothing "needs" it)
        if (!target && storage) {
            target = storage;
        }

        if (target) {
            const result = creep.transfer(target, RESOURCE_ENERGY);

            if (result === ERR_NOT_IN_RANGE) {
                creep.moveTo(target, {
                    reusePath: 5,
                    visualizePathStyle: { stroke: '#ffffff' }
                });
            }

            // If we tried to fill and it's already full, dump hauling state
            // so we re-evaluate targets next tick instead of hovering.
            if (result === ERR_FULL) {
                creep.memory.hauling = false;
            }
        } else {
            // Nowhere to deliver → idle
            const idle =
                storage ||
                room.find(FIND_MY_SPAWNS)[0];
            if (idle && !creep.pos.inRangeTo(idle, 3)) {
                creep.moveTo(idle, {
                    reusePath: 10,
                    visualizePathStyle: { stroke: '#6666ff' }
                });
            }
        }
    }
};
