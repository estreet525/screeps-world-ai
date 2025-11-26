// roles.repairer.js

const roleRepairer = {
    run(creep) {

        // State machine: harvesting vs repairing
        if (creep.memory.repairing && creep.store[RESOURCE_ENERGY] === 0) {
            creep.memory.repairing = false;
        }
        if (!creep.memory.repairing && creep.store.getFreeCapacity() === 0) {
            creep.memory.repairing = true;
        }

        // -------- Harvest State --------
        if (!creep.memory.repairing) {
            // Prefer containers with energy
            const container = creep.pos.findClosestByPath(FIND_STRUCTURES, {
                filter: s =>
                    s.structureType === STRUCTURE_CONTAINER &&
                    s.store[RESOURCE_ENERGY] > 0
            });

            if (container) {
                if (creep.withdraw(container, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(container, { visualizePathStyle: { stroke: '#ffaa00' } });
                }
                return;
            }

            // Otherwise gather from dropped energy
            const dropped = creep.pos.findClosestByPath(FIND_DROPPED_RESOURCES, {
                filter: r => r.resourceType === RESOURCE_ENERGY
            });

            if (dropped) {
                if (creep.pickup(dropped) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(dropped, { visualizePathStyle: { stroke: '#ffaa00' } });
                }
                return;
            }

            // Finally, fallback to mining if needed
            const source = creep.pos.findClosestByPath(FIND_SOURCES);
            if (source && creep.harvest(source) === ERR_NOT_IN_RANGE) {
                creep.moveTo(source);
            }

            return;
        }

        // -------- Repair State --------

        // 1) Critical repairs first (roads/containers <40%)
        let target = creep.pos.findClosestByPath(FIND_STRUCTURES, {
            filter: s =>
                (s.structureType === STRUCTURE_ROAD ||
                 s.structureType === STRUCTURE_CONTAINER) &&
                s.hits < s.hitsMax * 0.4
        });

        // 2) Ramparts/walls to a soft cap (5k HP at RCL3)
        if (!target) {
            const RAMPART_CAP = 5000;
            target = creep.pos.findClosestByPath(FIND_STRUCTURES, {
                filter: s =>
                    (s.structureType === STRUCTURE_RAMPART ||
                     s.structureType === STRUCTURE_WALL) &&
                    s.hits < RAMPART_CAP
            });
        }

        // 3) All other structures needing repair (except full ramparts/walls)
        if (!target) {
            target = creep.pos.findClosestByPath(FIND_STRUCTURES, {
                filter: s =>
                    s.hits < s.hitsMax &&
                    s.structureType !== STRUCTURE_RAMPART &&
                    s.structureType !== STRUCTURE_WALL
            });
        }

        // 4) If nothing to repair, upgrade the controller
        if (!target) {
            const controller = creep.room.controller;
            if (creep.upgradeController(controller) === ERR_NOT_IN_RANGE) {
                creep.moveTo(controller);
            }
            return;
        }

        // Repair target
        if (creep.repair(target) === ERR_NOT_IN_RANGE) {
            creep.moveTo(target, { visualizePathStyle: { stroke: '#00ff00' } });
        }
    }
};

module.exports = roleRepairer;
