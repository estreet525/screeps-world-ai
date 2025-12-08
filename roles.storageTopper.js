// roles.storageTopper.js

function findSourceContainers(room) {
    const sources = room.find(FIND_SOURCES);
    const containers = room.find(FIND_STRUCTURES, {
        filter: s => s.structureType === STRUCTURE_CONTAINER
    });

    // Containers that are close to any source = "source containers"
    return containers.filter(c =>
        sources.some(src => src.pos.inRangeTo(c.pos, 2))
    );
}

module.exports = {
    run: function (creep) {
        const room = creep.room;
        const storage = room.storage;

        // If no storage, this role doesn't really make sense
        if (!storage) {
            // Just idle near spawn if no storage yet
            const spawn = room.find(FIND_MY_SPAWNS)[0];
            if (spawn && !creep.pos.inRangeTo(spawn, 3)) {
                creep.moveTo(spawn, {
                    reusePath: 10,
                    visualizePathStyle: { stroke: '#6666ff' }
                });
            }
            return;
        }

        // === STATE MACHINE ===
        if (creep.memory.hauling && creep.store[RESOURCE_ENERGY] === 0) {
            creep.memory.hauling = false;
        }
        if (!creep.memory.hauling && creep.store.getFreeCapacity() === 0) {
            creep.memory.hauling = true;
        }

        const sourceContainers = findSourceContainers(room);

        // === NOT HAULING → COLLECT ENERGY NEAR SOURCES ===
        if (!creep.memory.hauling) {
            let target = null;

            // 1) Dropped energy near source containers (clean up miner puke)
            const dropped = room.find(FIND_DROPPED_RESOURCES, {
                filter: r =>
                    r.resourceType === RESOURCE_ENERGY &&
                    sourceContainers.some(c => c.pos.inRangeTo(r.pos, 2))
            });

            if (dropped.length > 0) {
                target = creep.pos.findClosestByRange(dropped);
                const result = creep.pickup(target);
                if (result === ERR_NOT_IN_RANGE) {
                    creep.moveTo(target, {
                        reusePath: 5,
                        visualizePathStyle: { stroke: '#ffaa00' }
                    });
                }
                return;
            }

            // 2) Otherwise, withdraw from source containers directly
            const fullContainers = sourceContainers.filter(c =>
                c.store[RESOURCE_ENERGY] > 0
            );

            if (fullContainers.length > 0) {
                target = creep.pos.findClosestByRange(fullContainers);
                const result = creep.withdraw(target, RESOURCE_ENERGY);
                if (result === ERR_NOT_IN_RANGE) {
                    creep.moveTo(target, {
                        reusePath: 5,
                        visualizePathStyle: { stroke: '#ffaa00' }
                    });
                }
                return;
            }

            // 3) Nothing to do → idle near storage
            if (!creep.pos.inRangeTo(storage, 3)) {
                creep.moveTo(storage, {
                    reusePath: 10,
                    visualizePathStyle: { stroke: '#6666ff' }
                });
            }
            return;
        }

        // === HAULING → DELIVER TO STORAGE ONLY ===
        const result = creep.transfer(storage, RESOURCE_ENERGY);
        if (result === ERR_NOT_IN_RANGE) {
            creep.moveTo(storage, {
                reusePath: 5,
                visualizePathStyle: { stroke: '#ffffff' }
            });
        }
    }
};
