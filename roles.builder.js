module.exports = {
    run: function (creep) {

        // === STATE MACHINE ===
        if (creep.memory.building && creep.store[RESOURCE_ENERGY] === 0) {
            creep.memory.building = false;
        }
        if (!creep.memory.building && creep.store.getFreeCapacity() === 0) {
            creep.memory.building = true;
        }

        // =====================
        // BUILDING MODE
        // =====================
        if (creep.memory.building) {

            // Build closest site
            var site = creep.pos.findClosestByPath(FIND_CONSTRUCTION_SITES);
            if (site) {
                if (creep.build(site) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(site, { visualizePathStyle: { stroke: '#ffffff' } });
                }
                return;
            }

            // Nothing to build -> help controller
            if (creep.upgradeController(creep.room.controller) === ERR_NOT_IN_RANGE) {
                creep.moveTo(creep.room.controller, { visualizePathStyle: { stroke: '#ffffff' } });
            }
            return;
        }

        // =====================
        // ENERGY COLLECTION MODE
        // =====================

        // 1) WITHDRAW FROM CONTAINERS / STORAGE
        var container = creep.pos.findClosestByPath(FIND_STRUCTURES, {
            filter: function (s) {
                return (
                    (s.structureType === STRUCTURE_CONTAINER ||
                     s.structureType === STRUCTURE_STORAGE) &&
                    s.store[RESOURCE_ENERGY] > 0
                );
            }
        });

        if (container) {
            if (creep.withdraw(container, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                creep.moveTo(container, { visualizePathStyle: { stroke: '#ffaa00' } });
            }
            return;
        }

        // 2) LAST RESORT: HARVEST FROM SOURCE
        var source = creep.pos.findClosestByPath(FIND_SOURCES);
        if (source) {
            if (creep.harvest(source) === ERR_NOT_IN_RANGE) {
                creep.moveTo(source, { visualizePathStyle: { stroke: '#ffaa00' } });
            }
        }
    }
};
