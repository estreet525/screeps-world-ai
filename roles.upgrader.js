function getControllerContainer(room) {
    if (!room.controller) return null;

    const containers = room.find(FIND_STRUCTURES, {
        filter: s =>
            s.structureType === STRUCTURE_CONTAINER &&
            s.pos.inRangeTo(room.controller.pos, 2)
    });

    return containers[0] || null;
}


module.exports = {
    run: function (creep) {

        // === STATE MACHINE ===
        if (creep.memory.upgrading && creep.store[RESOURCE_ENERGY] === 0) {
            creep.memory.upgrading = false;
        }
        if (!creep.memory.upgrading && creep.store.getFreeCapacity() === 0) {
            creep.memory.upgrading = true;
        }

        // =====================
        // UPGRADING MODE
        // =====================
        if (creep.memory.upgrading) {
            if (creep.upgradeController(creep.room.controller) === ERR_NOT_IN_RANGE) {
                creep.moveTo(creep.room.controller, {
                    visualizePathStyle: { stroke: '#ffffff' }
                });
            }
            return;
        }

        // =====================
        // ENERGY COLLECTION MODE
        // =====================

        // 1) Prefer controller container if it exists and has energy
        const ctrlContainer = getControllerContainer(creep.room);

        if (ctrlContainer &&
            ctrlContainer.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {

            if (creep.withdraw(ctrlContainer, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                creep.moveTo(ctrlContainer, { visualizePathStyle: { stroke: '#ffffff' } });
            }
            return;
        }

        // 2) First get from storage
        const storage = creep.room.storage;
        if (
            storage &&
            storage.store.getUsedCapacity(RESOURCE_ENERGY) > 500  // small buffer
        ) {
            if (creep.withdraw(storage, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
            creep.moveTo(storage, { visualizePathStyle: { stroke: '#ffffff' } });
    }
    return; // don’t fall through to other get-energy logic this tick
}

        // 3) WITHDRAW FROM CONTAINERS / STORAGE
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

        // 4) LAST RESORT: HARVEST FROM SOURCE
        var source = creep.pos.findClosestByPath(FIND_SOURCES);
        if (source) {
            if (creep.harvest(source) === ERR_NOT_IN_RANGE) {
                creep.moveTo(source, { visualizePathStyle: { stroke: '#ffaa00' } });
            }
        }
    }
};
