module.exports = {
    run: function (creep) {

        // ========= STATE MACHINE =========
        if (creep.memory.hauling && creep.store[RESOURCE_ENERGY] === 0) {
            creep.memory.hauling = false;
        }
        if (!creep.memory.hauling && creep.store.getFreeCapacity() === 0) {
            creep.memory.hauling = true;
        }

        // ========= COLLECT MODE =========
        if (!creep.memory.hauling) {

            // 1) PRIORITY: dropped energy
            var dropped = creep.pos.findClosestByPath(FIND_DROPPED_RESOURCES, {
                filter: function (r) {
                    return r.resourceType === RESOURCE_ENERGY && r.amount >= 10;
                }
            });

            if (dropped) {
                if (creep.pickup(dropped) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(dropped, { visualizePathStyle: { stroke: '#ffaa00' } });
                }
                return;
            }

            // 2) NEXT: containers with energy
            var container = creep.pos.findClosestByPath(FIND_STRUCTURES, {
                filter: function (s) {
                    return s.structureType === STRUCTURE_CONTAINER &&
                           s.store[RESOURCE_ENERGY] > 0;
                }
            });

            if (container) {
                if (creep.withdraw(container, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(container, { visualizePathStyle: { stroke: '#ffaa00' } });
                }
                return;
            }

            // 3) If nothing to grab, idle near spawn
            var spawn = creep.room.find(FIND_MY_SPAWNS)[0];
            if (spawn) {
                creep.moveTo(spawn, {
                    visualizePathStyle: { stroke: '#ffaa00' },
                    range: 3
                });
            }
            return;
        }

        // ========= HAUL / USE MODE =========

        // 1) PRIORITY: feed spawn + extensions
        target = creep.pos.findClosestByPath(FIND_STRUCTURES, {
            filter: s =>
             (s.structureType === STRUCTURE_SPAWN ||
              s.structureType === STRUCTURE_EXTENSION) &&
              s.store.getFreeCapacity(RESOURCE_ENERGY) > 0
        });

        if (target) {
            if (creep.transfer(target, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                creep.moveTo(target);
         }
         return;
        }

        // 2) NEXT: towers
            target = creep.pos.findClosestByPath(FIND_STRUCTURES, {
            filter: s =>
                s.structureType === STRUCTURE_TOWER &&
                s.store.getFreeCapacity(RESOURCE_ENERGY) > 0
        });

        if (target) {
            if (creep.transfer(target, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                creep.moveTo(target);
            }
            return;
        }

        // 3) NEXT: controller container (if it exists and has room)
        const ctrlContainer = getControllerContainer(creep.room);
        if (
            ctrlContainer &&
            ctrlContainer.store.getFreeCapacity(RESOURCE_ENERGY) > 0
        ) {
            if (
             creep.transfer(ctrlContainer, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE
            ) {
                creep.moveTo(ctrlContainer);
            }
            return;
        }

        // 4) NEXT: storage as the general sink
        const storage = creep.room.storage;
        if (storage && storage.store.getFreeCapacity(RESOURCE_ENERGY) > 0) {
            if (creep.transfer(storage, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                creep.moveTo(storage);
            }
            return;
        }

    //  Optional: if nowhere to put energy, idle near storage or controller
    // const idlePos = storage?.pos || creep.room.controller?.pos;
    // if (idlePos) creep.moveTo(idlePos);
}

        // 5) If all energy sinks are full, BUILD construction sites
        if (!target) {
            var site = creep.pos.findClosestByPath(FIND_CONSTRUCTION_SITES);
            if (site) {
                // Requires WORK part – new haulers have one
                if (creep.build(site) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(site, { visualizePathStyle: { stroke: '#ffffff' } });
                }
                return;
            }
        }

        // 6) If no sites, REPAIR damaged containers / roads
        if (!target && creep.getActiveBodyparts(WORK) > 0) {
            var repairTarget = findRepairTarget(creep);
            if (repairTarget) {
                if (creep.repair(repairTarget) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(repairTarget, { visualizePathStyle: { stroke: '#ffffff' } });
                }
                return;
            }
        }

        // 7) If still nothing, fill containers/storage
        if (!target) {
            target = creep.pos.findClosestByPath(FIND_STRUCTURES, {
                filter: function (s) {
                    return (
                        (s.structureType === STRUCTURE_STORAGE ||
                         s.structureType === STRUCTURE_CONTAINER) &&
                        s.store.getFreeCapacity(RESOURCE_ENERGY) > 0
                    );
                }
            });
        }

        // 8) LAST RESORT: upgrade controller
        if (!target) {
            if (creep.upgradeController(creep.room.controller) === ERR_NOT_IN_RANGE) {
                creep.moveTo(creep.room.controller, { visualizePathStyle: { stroke: '#ffffff' } });
            }
            return;
        }

        // Deliver energy
        if (creep.transfer(target, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
            creep.moveTo(target, { visualizePathStyle: { stroke: '#ffffff' } });
        }
}


// Helper function outside module.exports
function findRepairTarget(creep) {
    // Only bother with fairly damaged stuff:
    // containers below 70%, roads below 50%
    var room = creep.room;

    var damagedContainers = room.find(FIND_STRUCTURES, {
        filter: function (s) {
            return s.structureType === STRUCTURE_CONTAINER &&
                   s.hits < s.hitsMax * 0.7;
        }
    });

    var damagedRoads = room.find(FIND_STRUCTURES, {
        filter: function (s) {
            return s.structureType === STRUCTURE_ROAD &&
                   s.hits < s.hitsMax * 0.5;
        }
    });

    var all = damagedContainers.concat(damagedRoads);
    if (all.length === 0) return null;

    // Choose closest by path
    return creep.pos.findClosestByPath(all);
}

function getControllerContainer(room) {
    if (!room.controller) return null;

    const containers = room.find(FIND_STRUCTURES, {
        filter: s =>
            s.structureType === STRUCTURE_CONTAINER &&
            s.pos.inRangeTo(room.controller.pos, 2)
    });

    return containers[0] || null;
}

