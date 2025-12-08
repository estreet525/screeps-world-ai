// roles.hauler.js

module.exports = {
    run: function (creep) {

        const room = creep.room;
        const storage = room.storage;
        const hasStorageEnergy = storage && storage.store[RESOURCE_ENERGY] > 0;

        // Try to find a controller container (container close to controller)
        let controllerContainer = null;
        if (room.controller) {
            controllerContainer = room.find(FIND_STRUCTURES, {
                filter: s =>
                    s.structureType === STRUCTURE_CONTAINER &&
                    s.pos.inRangeTo(room.controller, 3)
            })[0];
        }

        // ========== STATE MACHINE ==========
        if (creep.memory.hauling && creep.store[RESOURCE_ENERGY] === 0) {
            creep.memory.hauling = false;
        }
        if (!creep.memory.hauling && creep.store.getFreeCapacity() === 0) {
            creep.memory.hauling = true;
        }

        // ==========================
        //  MODE A: Storage available
        // ==========================
        if (hasStorageEnergy) {

            // --- A1: NOT hauling → withdraw from storage ---
            if (!creep.memory.hauling) {
                if (creep.withdraw(storage, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(storage, {
                        reusePath: 5,
                        visualizePathStyle: { stroke: '#ffaa00' }
                    });
                }
                return;
            }

            // --- A2: HAULING → deliver in priority order ---
            // 1) Any spawn/extension with free energy capacity
            let targets = room.find(FIND_MY_STRUCTURES, {
                filter: s =>
                    (s.structureType === STRUCTURE_SPAWN ||
                     s.structureType === STRUCTURE_EXTENSION) &&
                    s.energy < s.energyCapacity
            });

            let target = null;

            if (targets.length > 0) {
                // Pick the closest one; this ensures ALL extensions are considered
                target = creep.pos.findClosestByRange(targets);
            }

            // 2) Towers
            if (!target) {
                targets = room.find(FIND_MY_STRUCTURES, {
                    filter: s =>
                        s.structureType === STRUCTURE_TOWER &&
                        s.store.getFreeCapacity(RESOURCE_ENERGY) > 0
                });
                if (targets.length > 0) {
                    target = creep.pos.findClosestByRange(targets);
                }
            }

            // 3) Controller container (so upgrader can be lazy like it should be)
            if (!target && controllerContainer &&
                controllerContainer.store.getFreeCapacity(RESOURCE_ENERGY) > 0) {
                target = controllerContainer;
            }

            // 4) Fallback: put it back into storage
            if (!target) {
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
            }

            return;
        }

        // ==============================
        //  MODE B: No/empty storage yet
        // ==============================

        if (!creep.memory.hauling) {
            // Pull from containers first
            let container = creep.pos.findClosestByRange(FIND_STRUCTURES, {
                filter: s =>
                    s.structureType === STRUCTURE_CONTAINER &&
                    s.store[RESOURCE_ENERGY] > 0
            });

            if (container) {
                if (creep.withdraw(container, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(container, {
                        reusePath: 5,
                        visualizePathStyle: { stroke: '#ffaa00' }
                    });
                }
                return;
            }

            // Optional: pick up dropped energy
            const dropped = creep.pos.findClosestByRange(FIND_DROPPED_RESOURCES, {
                filter: r => r.resourceType === RESOURCE_ENERGY
            });
            if (dropped) {
                if (creep.pickup(dropped) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(dropped, {
                        reusePath: 5,
                        visualizePathStyle: { stroke: '#ffaa00' }
                    });
                }
                return;
            }

            // Nothing to do, idle near storage or spawn
            const idleTarget = storage || room.find(FIND_MY_SPAWNS)[0];
            if (idleTarget && !creep.pos.inRangeTo(idleTarget, 3)) {
                creep.moveTo(idleTarget, {
                    reusePath: 10,
                    visualizePathStyle: { stroke: '#6666ff' }
                });
            }
            return;
        }

        // B2: HAULING in “no storage energy” mode → same priority
        let targets = room.find(FIND_MY_STRUCTURES, {
            filter: s =>
                (s.structureType === STRUCTURE_SPAWN ||
                 s.structureType === STRUCTURE_EXTENSION) &&
                s.energy < s.energyCapacity
        });

        let target = null;
        if (targets.length > 0) {
            target = creep.pos.findClosestByRange(targets);
        }

        if (!target) {
            targets = room.find(FIND_MY_STRUCTURES, {
                filter: s =>
                    s.structureType === STRUCTURE_TOWER &&
                    s.store.getFreeCapacity(RESOURCE_ENERGY) > 0
            });
            if (targets.length > 0) {
                target = creep.pos.findClosestByRange(targets);
            }
        }

        if (!target && controllerContainer &&
            controllerContainer.store.getFreeCapacity(RESOURCE_ENERGY) > 0) {
            target = controllerContainer;
        }

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
        }
    }
};
