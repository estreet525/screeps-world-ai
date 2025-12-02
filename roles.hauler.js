function findRepairTarget(creep) {
    // Only bother with fairly damaged stuff:
    // containers below 70%, roads below 50%
    const room = creep.room;

    const damagedContainers = room.find(FIND_STRUCTURES, {
        filter: s =>
            s.structureType === STRUCTURE_CONTAINER &&
            s.hits < s.hitsMax * 0.7
    });

    const damagedRoads = room.find(FIND_STRUCTURES, {
        filter: s =>
            s.structureType === STRUCTURE_ROAD &&
            s.hits < s.hitsMax * 0.5
    });

    const all = damagedContainers.concat(damagedRoads);
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
    // 1) Source containers (near miners)
    const sourceContainers = creep.room.find(FIND_STRUCTURES, {
        filter: s =>
            s.structureType === STRUCTURE_CONTAINER &&
            s.store[RESOURCE_ENERGY] > 0 &&
            !s.pos.inRangeTo(creep.room.controller, 3) // crude way to avoid controller container
    });

    let target = _.max(sourceContainers, 'store.energy'); // any selection logic you like

    // 2) If no source containers with energy, use Storage
    if (!target) {
        target = creep.room.storage && creep.room.storage.store[RESOURCE_ENERGY] > 0
            ? creep.room.storage
            : null;
    }

    // 3) (Optional) fallback: dropped energy
    if (!target) {
        const dropped = creep.pos.findClosestByPath(FIND_DROPPED_RESOURCES, {
            filter: r => r.resourceType === RESOURCE_ENERGY && r.amount > 50
        });
        if (dropped) {
            if (creep.pickup(dropped) === ERR_NOT_IN_RANGE) {
                creep.moveTo(dropped, {visualizePathStyle: {stroke: '#ffaa00'}});
            }
        }
        return;
    }

    if (target.structureType) {
        if (creep.withdraw(target, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
            creep.moveTo(target, {visualizePathStyle: {stroke: '#ffffff'}});
        }
    }
    return;
}


        // ========= HAUL / USE MODE =========
        if (creep.memory.hauling) {
            let target;

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

            // 2) NEXT: towers (only if they're actually low)
            target = creep.pos.findClosestByPath(FIND_STRUCTURES, {
                filter: s =>
                    s.structureType === STRUCTURE_TOWER &&
                    s.store[RESOURCE_ENERGY] < 500   // tweak threshold as you like
            });


            // 3) NEXT: controller container (if it exists and has room)
            const ctrlContainer = getControllerContainer(creep.room);
            if (ctrlContainer &&
                ctrlContainer.store.getFreeCapacity(RESOURCE_ENERGY) > 0) {

                if (creep.transfer(ctrlContainer, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(ctrlContainer);
                }
                return;
            }

            // 4) NEXT: storage as the general sink
            const storage = creep.room.storage;
            if (storage &&
                storage.store.getFreeCapacity(RESOURCE_ENERGY) > 0) {

                if (creep.transfer(storage, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(storage);
                }
                return;
            }

            // 5) If all energy sinks are full, BUILD construction sites
            const site = creep.pos.findClosestByPath(FIND_CONSTRUCTION_SITES);
            if (site) {
                if (creep.build(site) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(site, {
                        visualizePathStyle: { stroke: '#ffffff' }
                    });
                }
                return;
            }

            // 6) If no sites, REPAIR damaged containers / roads
            if (creep.getActiveBodyparts(WORK) > 0) {
                const repairTarget = findRepairTarget(creep);
                if (repairTarget) {
                    if (creep.repair(repairTarget) === ERR_NOT_IN_RANGE) {
                        creep.moveTo(repairTarget, {
                            visualizePathStyle: { stroke: '#ffffff' }
                        });
                    }
                    return;
                }
            }

            // 7) If still nothing, fill any remaining containers/storage
            target = creep.pos.findClosestByPath(FIND_STRUCTURES, {
                filter: s =>
                    (s.structureType === STRUCTURE_STORAGE ||
                     s.structureType === STRUCTURE_CONTAINER) &&
                    s.store.getFreeCapacity(RESOURCE_ENERGY) > 0
            });

            if (target) {
                if (creep.transfer(target, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(target, {
                        visualizePathStyle: { stroke: '#ffffff' }
                    });
                }
                return;
            }

            // 8) LAST RESORT: upgrade controller
            if (creep.room.controller) {
                if (creep.upgradeController(creep.room.controller) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(creep.room.controller, {
                        visualizePathStyle: { stroke: '#ffffff' }
                    });
                }
            }
        }
    }
};
