module.exports = {
    run: function (creep) {

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

        // Helper: is this a "source container" (container by a source, not the controller container)?
        function isSourceContainer(struct) {
            if (struct.structureType !== STRUCTURE_CONTAINER) return false;
            if (controllerContainer && struct.id === controllerContainer.id) return false;

            const sources = room.find(FIND_SOURCES);
            return sources.some(src => src.pos.inRangeTo(struct.pos, 1));
        }

        // Helper: is dropped energy near a miner or source (for "ground next to miners")
        function isGoodDroppedEnergy(res) {
            if (res.resourceType !== RESOURCE_ENERGY) return false;

            // Near a dedicated miner
            const nearMiner = res.pos.findInRange(FIND_MY_CREEPS, 1, {
                filter: c => c.memory.role === 'miner'
            }).length > 0;

            // Or near a source
            const nearSource = res.pos.findInRange(FIND_SOURCES, 1).length > 0;

            return nearMiner || nearSource;
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
                        creep.moveTo(site, { visualizePathStyle: { stroke: '#ffffff' } });
                    }
                    return;
                }

                // No site (edge case) -> upgrade
                if (creep.upgradeController(room.controller) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(room.controller, { visualizePathStyle: { stroke: '#ffffff' } });
                }
                return;
            }

            // === NO CONSTRUCTION SITES ===

            if (!storageIsFullOrMissing) {
                // Storage has room -> act as HAULER:
                // deliver energy we are carrying to STORAGE
                if (creep.transfer(storage, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(storage, { visualizePathStyle: { stroke: '#ffffff' } });
                }
                return;
            }

            // Storage is full or missing -> act as HELPER UPGRADER
            if (room.controller) {
                if (creep.upgradeController(room.controller) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(room.controller, { visualizePathStyle: { stroke: '#ffffff' } });
                }
            }
            return;
        }

        // ==========================
        // ENERGY COLLECTION MODE
        // ==========================

        if (hasConstruction) {
            // Normal builder energy logic when there ARE construction sites:
            const container = creep.pos.findClosestByPath(FIND_STRUCTURES, {
                filter: s =>
                    (s.structureType === STRUCTURE_CONTAINER ||
                     s.structureType === STRUCTURE_STORAGE) &&
                    s.store[RESOURCE_ENERGY] > 0
            });

            if (container) {
                if (creep.withdraw(container, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(container, { visualizePathStyle: { stroke: '#ffaa00' } });
                }
                return;
            }

            // Last resort: harvest from source
            const source = creep.pos.findClosestByPath(FIND_SOURCES);
            if (source) {
                if (creep.harvest(source) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(source, { visualizePathStyle: { stroke: '#ffaa00' } });
                }
            }
            return;
        }

        // === NO CONSTRUCTION SITES ===
        if (!storageIsFullOrMissing) {
            // STORAGE HAS ROOM -> HAULING MODE

            // 1) Prefer dropped energy near miners/sources
            const dropped = creep.pos.findClosestByPath(FIND_DROPPED_RESOURCES, {
                filter: isGoodDroppedEnergy
            });

            if (dropped) {
                if (creep.pickup(dropped) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(dropped, { visualizePathStyle: { stroke: '#ffaa00' } });
                }
                return;
            }

            // 2) Otherwise use SOURCE CONTAINERS (NOT controller container)
            const sourceContainer = creep.pos.findClosestByPath(FIND_STRUCTURES, {
                filter: s => isSourceContainer(s) && s.store[RESOURCE_ENERGY] > 0
            });

            if (sourceContainer) {
                if (creep.withdraw(sourceContainer, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(sourceContainer, { visualizePathStyle: { stroke: '#ffaa00' } });
                }
                return;
            }

            // 3) If no good container or drops, fall back to harvesting from source
            const source = creep.pos.findClosestByPath(FIND_SOURCES);
            if (source) {
                if (creep.harvest(source) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(source, { visualizePathStyle: { stroke: '#ffaa00' } });
                }
            }
            return;
        }

        // STORAGE FULL (or missing) & NO CONSTRUCTION:
        // act like UPGRADER for energy intake (from controller container)

        if (controllerContainer && controllerContainer.store[RESOURCE_ENERGY] > 0) {
            if (creep.withdraw(controllerContainer, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                creep.moveTo(controllerContainer, { visualizePathStyle: { stroke: '#ffaa00' } });
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
                creep.moveTo(otherContainer, { visualizePathStyle: { stroke: '#ffaa00' } });
            }
            return;
        }

        // Last resort: harvest from source
        const source = creep.pos.findClosestByPath(FIND_SOURCES);
        if (source) {
            if (creep.harvest(source) === ERR_NOT_IN_RANGE) {
                creep.moveTo(source, { visualizePathStyle: { stroke: '#ffaa00' } });
            }
        }
    }
};
