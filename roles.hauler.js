// roles.hauler.js

module.exports = {
    run: function (creep) {

        const storage = creep.room.storage;
        const hasStorageEnergy = storage && storage.store[RESOURCE_ENERGY] > 0;

        // ========== STATE MACHINE ==========
        if (creep.memory.hauling && creep.store[RESOURCE_ENERGY] === 0) {
            creep.memory.hauling = false;
        }
        if (!creep.memory.hauling && creep.store.getFreeCapacity() === 0) {
            creep.memory.hauling = true;
        }

        // ==========================================
        // MODE 1: Dedicated Storage ⇢ Spawn/Econ Hauler
        // ==========================================
        if (hasStorageEnergy) {

            if (!creep.memory.hauling) {
                // NOT HAULING → withdraw from Storage
                if (creep.withdraw(storage, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(storage, {
                        reusePath: 5,
                        visualizePathStyle: { stroke: '#ffaa00' }
                    });
                }
                return;
            }

            // HAULING → deliver to spawn/extensions/towers/etc.
            // 1) Spawn + extensions
            let target = creep.pos.findClosestByRange(FIND_MY_STRUCTURES, {
                filter: s =>
                    (s.structureType === STRUCTURE_SPAWN ||
                     s.structureType === STRUCTURE_EXTENSION) &&
                    s.energy < s.energyCapacity
            });

            // 2) Towers (optional: only if below, say, 600)
            if (!target) {
                target = creep.pos.findClosestByRange(FIND_MY_STRUCTURES, {
                    filter: s =>
                        s.structureType === STRUCTURE_TOWER &&
                        s.store.getFreeCapacity(RESOURCE_ENERGY) > 0
                });
            }

            // 3) If no immediate consumer, top storage back up or feed controller container if you use one
            if (!target) {
                // Just return to storage (or you can send to controller container if you have one)
                target = storage;
            }

            if (target) {
                if (creep.transfer(target, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(target, {
                        reusePath: 5,
                        visualizePathStyle: { stroke: '#ffffff' }
                    });
                }
            }

            return;
        }

        // ==========================================
        // MODE 2: No (or empty) Storage → old behavior
        // ==========================================

        if (!creep.memory.hauling) {
            // Find containers (or dropped) near sources
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

            // Optional: pick up dropped energy as last resort
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

            // If absolutely nothing to grab, just idle near storage or spawn
            const idleTarget = storage || creep.room.find(FIND_MY_SPAWNS)[0];
            if (idleTarget && !creep.pos.inRangeTo(idleTarget, 3)) {
                creep.moveTo(idleTarget, {
                    reusePath: 10,
                    visualizePathStyle: { stroke: '#6666ff' }
                });
            }
            return;
        }

        // HAULING in Mode 2 → same delivery priorities
        let target = creep.pos.findClosestByRange(FIND_MY_STRUCTURES, {
            filter: s =>
                (s.structureType === STRUCTURE_SPAWN ||
                 s.structureType === STRUCTURE_EXTENSION) &&
                s.energy < s.energyCapacity
        });

        if (!target) {
            target = creep.pos.findClosestByRange(FIND_MY_STRUCTURES, {
                filter: s =>
                    s.structureType === STRUCTURE_TOWER &&
                    s.store.getFreeCapacity(RESOURCE_ENERGY) > 0
            });
        }

        if (!target && storage) {
            target = storage;
        }

        if (target) {
            if (creep.transfer(target, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                creep.moveTo(target, {
                    reusePath: 5,
                    visualizePathStyle: { stroke: '#ffffff' }
                });
            }
        }
    }
};
