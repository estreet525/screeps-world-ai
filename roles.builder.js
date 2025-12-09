const energyUtils = require('utils.energy'); // NEW: use your shared energy helper

module.exports = {
    run: function (creep) {

        // === BORDER ESCAPE: don't sit on room edges or in other rooms ===
        // If the creep is on an exit tile, nudge it toward the center
        if (creep.pos.x === 0 || creep.pos.x === 49 || creep.pos.y === 0 || creep.pos.y === 49) {
            creep.moveTo(25, 25, { maxRooms: 1 });
            return;
        }

        // === STATE MACHINE ===
        if (creep.memory.building && creep.store[RESOURCE_ENERGY] === 0) {
            creep.memory.building = false;
        }
        if (!creep.memory.building && creep.store.getFreeCapacity() === 0) {
            creep.memory.building = true;
        }

        const room = creep.room;

        // Pre-calc some room-wide helpers
        const hasConstruction = room.find(FIND_CONSTRUCTION_SITES).length > 0;
        const storage = room.storage || null;

        // Find container next to controller (controller container)
        const controllerContainer = room.controller
            ? room.controller.pos.findClosestByRange(FIND_STRUCTURES, {
                filter: s =>
                    s.structureType === STRUCTURE_CONTAINER &&
                    s.pos.inRangeTo(room.controller, 2)
            })
            : null;

        const storageIsFullOrMissing =
            !storage || storage.store.getFreeCapacity(RESOURCE_ENERGY) === 0;

        // ========================
        // HELPER: COLLECT ENERGY
        // ========================
        // 1) Prefer rich local drops (so we clean up decay-risk piles near miners)
        // 2) Otherwise use the balanced target from utils.energy (containers / drops)
        function collectEnergy(creep) {
            // Local "rich" dropped energy (don’t run across the map for crumbs)
            const richDrop = creep.pos.findClosestByRange(FIND_DROPPED_RESOURCES, {
                filter: r =>
                    r.resourceType === RESOURCE_ENERGY &&
                    r.amount >= Math.min(100, creep.store.getFreeCapacity()) &&
                    creep.pos.getRangeTo(r) <= 6
            });

            if (richDrop) {
                if (creep.pickup(richDrop) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(richDrop, {
                        visualizePathStyle: { stroke: '#ffaa00' },
                        maxRooms: 1
                    });
                }
                return true;
            }

            // Balanced assignment across containers / (optionally) drops
            const target = energyUtils.getBalancedEnergyTarget(creep);
            if (!target) return false;

            // If target has `amount`, it's a dropped resource. Otherwise, assume a structure.
            if (target.amount !== undefined) {
                if (creep.pickup(target) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(target, {
                        visualizePathStyle: { stroke: '#ffaa00' },
                        maxRooms: 1
                    });
                }
            } else {
                if (creep.withdraw(target, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(target, {
                        visualizePathStyle: { stroke: '#ffaa00' },
                        maxRooms: 1
                    });
                }
            }
            return true;
        }

        // =====================
        // WORK / BUILDING MODE
        // =====================
        if (creep.memory.building) {

            if (hasConstruction) {
                // Normal behavior: build sites, else upgrade
                const site = creep.pos.findClosestByPath(FIND_CONSTRUCTION_SITES);
                if (site) {
                    if (creep.build(site) === ERR_NOT_IN_RANGE) {
                        creep.moveTo(site, {
                            visualizePathStyle: { stroke: '#ffffff' },
                            maxRooms: 1
                        });
                    }
                    return;
                }

                // No site (edge case) -> upgrade
                if (creep.upgradeController(room.controller) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(room.controller, {
                        visualizePathStyle: { stroke: '#ffffff' },
                        maxRooms: 1
                    });
                }
                return;
            }

            // === NO CONSTRUCTION SITES ===

            if (!storageIsFullOrMissing) {
                // Storage has room -> act as HAULER:
                // deliver energy we are carrying to STORAGE
                if (creep.transfer(storage, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(storage, {
                        visualizePathStyle: { stroke: '#ffffff' },
                        maxRooms: 1
                    });
                }
                return;
            }

            // Storage is full or missing -> act as HELPER UPGRADER
            if (room.controller) {
                if (creep.upgradeController(room.controller) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(room.controller, {
                        visualizePathStyle: { stroke: '#ffffff' },
                        maxRooms: 1
                    });
                }
            }
            return;
        }

        // ==========================
        // ENERGY COLLECTION MODE
        // ==========================

        if (hasConstruction) {
            // Builders need energy to build: use our shared collection logic
            if (collectEnergy(creep)) return;

            // Last resort: harvest from source
            const source = creep.pos.findClosestByPath(FIND_SOURCES);
            if (source) {
                if (creep.harvest(source) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(source, {
                        visualizePathStyle: { stroke: '#ffaa00' }
                    });
                }
            }
            return;
        }

        // === NO CONSTRUCTION SITES ===
        if (!storageIsFullOrMissing) {
            // STORAGE HAS ROOM -> HAULING MODE
            // Grab energy using the same logic (local drops → balanced containers)
            if (collectEnergy(creep)) return;

            // Fallback: harvest from source
            const source = creep.pos.findClosestByPath(FIND_SOURCES);
            if (source) {
                if (creep.harvest(source) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(source, {
                        visualizePathStyle: { stroke: '#ffaa00' }
                    });
                }
            }
            return;
        }

        // STORAGE FULL (or missing) & NO CONSTRUCTION:
        // act like UPGRADER for energy intake (from controller container)

        if (controllerContainer && controllerContainer.store[RESOURCE_ENERGY] > 0) {
            if (creep.withdraw(controllerContainer, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                creep.moveTo(controllerContainer, {
                    visualizePathStyle: { stroke: '#ffaa00' },
                    maxRooms: 1
                });
            }
            return;
        }

        // Fallbacks if no controller container or it's empty
        // Try any container except controller container
        const otherContainer = creep.pos.findClosestByPath(FIND_STRUCTURES, {
            filter: s =>
                s.structureType === STRUCTURE_CONTAINER &&
                (!controllerContainer || s.id !== controllerContainer.id) &&
                s.store[RESOURCE_ENERGY] > 0
        });

        if (otherContainer) {
            if (creep.withdraw(otherContainer, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                creep.moveTo(otherContainer, {
                    visualizePathStyle: { stroke: '#ffaa00' },
                    maxRooms: 1
                });
            }
            return;
        }

        // Last resort: harvest from source
        const source = creep.pos.findClosestByPath(FIND_SOURCES);
        if (source) {
            if (creep.harvest(source) === ERR_NOT_IN_RANGE) {
                creep.moveTo(source, {
                    visualizePathStyle: { stroke: '#ffaa00' }
                });
            }
        }
    }
};
