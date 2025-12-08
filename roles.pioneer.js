// roles.pioneer.js
module.exports = {
    run: function (creep) {
        const targetRoom = creep.memory.targetRoom || creep.room.name;

        // === STATE MACHINE ===
        if (creep.memory.building && creep.store[RESOURCE_ENERGY] === 0) {
            creep.memory.building = false;
        }
        if (!creep.memory.building && creep.store.getFreeCapacity() === 0) {
            creep.memory.building = true;
        }

        // === MOVE TO TARGET ROOM FIRST ===
        if (creep.room.name !== targetRoom) {
            const pos = new RoomPosition(25, 25, targetRoom);
            creep.moveTo(pos, { visualizePathStyle: { stroke: '#ffaa00' } });
            return;
        }

        // === BUILDING MODE: build → upgrade ===
        if (creep.memory.building) {
            // 1) Prioritize spawn construction site
            let site = creep.pos.findClosestByPath(FIND_CONSTRUCTION_SITES, {
                filter: s => s.structureType === STRUCTURE_SPAWN
            });

            // 2) Otherwise any construction site
            if (!site) {
                site = creep.pos.findClosestByPath(FIND_CONSTRUCTION_SITES);
            }

            if (site) {
                if (creep.build(site) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(site, { visualizePathStyle: { stroke: '#ffffff' } });
                }
                return;
            }

            // 3) Nothing to build → upgrade controller
            const controller = creep.room.controller;
            if (controller) {
                if (creep.upgradeController(controller) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(controller, { visualizePathStyle: { stroke: '#ffffff' } });
                }
            }
            return;
        }

        // === HARVESTING MODE: get energy ===
        // Prefer containers near sources if any, else harvest directly
        const containers = creep.room.find(FIND_STRUCTURES, {
            filter: s =>
                s.structureType === STRUCTURE_CONTAINER &&
                s.store[RESOURCE_ENERGY] > 0
        });

        if (containers.length > 0) {
            const container = creep.pos.findClosestByPath(containers);
            if (creep.withdraw(container, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                creep.moveTo(container, { visualizePathStyle: { stroke: '#ffaa00' } });
            }
            return;
        }

        // Fallback: harvest from source
        const source = creep.pos.findClosestByPath(FIND_SOURCES_ACTIVE);
        if (source) {
            if (creep.harvest(source) === ERR_NOT_IN_RANGE) {
                creep.moveTo(source, { visualizePathStyle: { stroke: '#ffaa00' } });
            }
        }
    }
};
