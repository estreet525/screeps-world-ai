module.exports = {
    run: function (creep) {

        const storage = creep.room.storage;

        // =====================================================
        // SPECIAL MODE: If Storage exists, this creep becomes a
        // dedicated hauler from Storage → spawn/extensions/tower
        // =====================================================
        if (storage) {

            // Toggle working states
            if (creep.memory.working && creep.store[RESOURCE_ENERGY] === 0) {
                creep.memory.working = false;
            }
            if (!creep.memory.working && creep.store.getFreeCapacity() === 0) {
                creep.memory.working = true;
            }

            // NOT WORKING → Withdraw from Storage
            if (!creep.memory.working) {
                if (creep.withdraw(storage, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(storage, { visualizePathStyle: { stroke: '#ffaa00' } });
                }
                return;
            }

            // WORKING → Fill spawn/extensions/towers
            let target = creep.pos.findClosestByPath(FIND_MY_STRUCTURES, {
                filter: s =>
                    (s.structureType === STRUCTURE_SPAWN ||
                     s.structureType === STRUCTURE_EXTENSION ||
                     s.structureType === STRUCTURE_TOWER) &&
                    s.store.getFreeCapacity(RESOURCE_ENERGY) > 0
            });

            // Nothing needs energy? Idle near storage
            if (!target) {
                creep.moveTo(storage, { visualizePathStyle: { stroke: '#ffffff' } });
                return;
            }

            if (creep.transfer(target, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                creep.moveTo(target, { visualizePathStyle: { stroke: '#ffffff' } });
            }

            return; // <--- VERY IMPORTANT
        }

        // =====================================================
        // NORMAL MODE (no Storage built yet)
        // Your original harvester logic unchanged below
        // =====================================================

        // Toggle harvesting / delivering states
        if (creep.memory.harvesting && creep.store.getFreeCapacity() === 0) {
            creep.memory.harvesting = false; // now go deliver
        }
        if (!creep.memory.harvesting && creep.store[RESOURCE_ENERGY] === 0) {
            creep.memory.harvesting = true; // now go harvest
        }

        // HARVESTING STATE
        if (creep.memory.harvesting) {
            const source = creep.pos.findClosestByPath(FIND_SOURCES);
            if (!source) return;

            if (creep.harvest(source) === ERR_NOT_IN_RANGE) {
                creep.moveTo(source, { visualizePathStyle: { stroke: '#ffaa00' } });
            }
            return;
        }

        // DELIVERING STATE
        // 1) Spawn / extensions / towers
        let target = creep.pos.findClosestByPath(FIND_STRUCTURES, {
            filter: function (s) {
                return (
                    (s.structureType === STRUCTURE_SPAWN ||
                     s.structureType === STRUCTURE_EXTENSION ||
                     s.structureType === STRUCTURE_TOWER) &&
                    s.store.getFreeCapacity(RESOURCE_ENERGY) > 0
                );
            }
        });

        // 2) If nothing needs energy, dump to containers/storage
        if (!target) {
            target = creep.pos.findClosestByPath(FIND_STRUCTURES, {
                filter: function (s) {
                    return (
                        (s.structureType === STRUCTURE_CONTAINER ||
                         s.structureType === STRUCTURE_STORAGE) &&
                        s.store.getFreeCapacity(RESOURCE_ENERGY) > 0
                    );
                }
            });
        }

        // 3) If absolutely nothing, help upgrade controller
        if (!target) {
            if (creep.upgradeController(creep.room.controller) === ERR_NOT_IN_RANGE) {
                creep.moveTo(creep.room.controller, { visualizePathStyle: { stroke: '#ffffff' } });
            }
            return;
        }

        if (creep.transfer(target, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
            creep.moveTo(target, { visualizePathStyle: { stroke: '#ffffff' } });
        }
    }
};
