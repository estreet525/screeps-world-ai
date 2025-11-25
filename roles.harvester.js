module.exports = {
    run: function (creep) {
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
``

