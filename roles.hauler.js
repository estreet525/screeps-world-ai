// roles.hauler.js

function findControllerContainer(room) {
    if (!room.controller) return null;
    return room.find(FIND_STRUCTURES, {
        filter: s =>
            s.structureType === STRUCTURE_CONTAINER &&
            s.pos.inRangeTo(room.controller, 3)
    })[0] || null;
}

function getEnergySource(creep, job) {
    const room = creep.room;
    const storage = room.storage;

    // Jobs that should *prefer storage* as source when available
    const prefersStorage = (job === 'extensions' || job === 'towers' || job === 'controller' || job === 'general');

    if (prefersStorage && storage && storage.store[RESOURCE_ENERGY] > 0) {
        return storage;
    }

    // “sources” job: explicitly pull from containers/dropped energy near miners
    let container = room.find(FIND_STRUCTURES, {
        filter: s =>
            s.structureType === STRUCTURE_CONTAINER &&
            s.store[RESOURCE_ENERGY] > 0
    })[0];

    if (container) return container;

    const dropped = room.find(FIND_DROPPED_RESOURCES, {
        filter: r => r.resourceType === RESOURCE_ENERGY
    })[0];

    if (dropped) return dropped;

    // Fallback: storage if any (even if job didn’t *prefer* it)
    if (storage && storage.store[RESOURCE_ENERGY] > 0) {
        return storage;
    }

    return null;
}

function getDeliveryTarget(creep, job) {
    const room = creep.room;
    const storage = room.storage;
    const controllerContainer = findControllerContainer(room);

    const findClosest = (filterFn) => {
        const targets = room.find(FIND_MY_STRUCTURES, { filter: filterFn });
        if (targets.length === 0) return null;
        return creep.pos.findClosestByRange(targets);
    };

    if (job === 'extensions') {
        // 1) Spawn + extensions
        let target = findClosest(s =>
            (s.structureType === STRUCTURE_SPAWN ||
             s.structureType === STRUCTURE_EXTENSION) &&
            s.energy < s.energyCapacity
        );
        if (target) return target;

        // 2) Fallback: storage
        return storage || null;
    }

    if (job === 'towers') {
        // 1) Towers (top priority for this job)
        let target = findClosest(s =>
            s.structureType === STRUCTURE_TOWER &&
            s.store.getFreeCapacity(RESOURCE_ENERGY) > 0
        );
        if (target) return target;

        // 2) Spawn + extensions
        target = findClosest(s =>
            (s.structureType === STRUCTURE_SPAWN ||
             s.structureType === STRUCTURE_EXTENSION) &&
            s.energy < s.energyCapacity
        );
        if (target) return target;

        // 3) Fallback: storage
        return storage || null;
    }

    if (job === 'controller') {
        // 1) RC container if it exists and has room
        if (controllerContainer &&
            controllerContainer.store.getFreeCapacity(RESOURCE_ENERGY) > 0) {
            return controllerContainer;
        }

        // 2) Fallback: storage
        return storage || null;
    }

    if (job === 'sources') {
        // Bring stuff from sources → storage
        if (storage) return storage;
        return null;
    }

    // === GENERAL JOB (fallback) ===
    // 1) Spawn + extensions
    let target = findClosest(s =>
        (s.structureType === STRUCTURE_SPAWN ||
         s.structureType === STRUCTURE_EXTENSION) &&
        s.energy < s.energyCapacity
    );
    if (target) return target;

    // 2) Towers
    target = findClosest(s =>
        s.structureType === STRUCTURE_TOWER &&
        s.store.getFreeCapacity(RESOURCE_ENERGY) > 0
    );
    if (target) return target;

    // 3) RC container
    if (controllerContainer &&
        controllerContainer.store.getFreeCapacity(RESOURCE_ENERGY) > 0) {
        return controllerContainer;
    }

    // 4) Fallback: storage
    return storage || null;
}

module.exports = {
    run: function (creep) {

        const job = creep.memory.job || 'general';
        const room = creep.room;

        // === STATE MACHINE ===
        if (creep.memory.hauling && creep.store[RESOURCE_ENERGY] === 0) {
            creep.memory.hauling = false;
        }
        if (!creep.memory.hauling && creep.store.getFreeCapacity() === 0) {
            creep.memory.hauling = true;
        }

        // === NOT HAULING → GET ENERGY ===
        if (!creep.memory.hauling) {
            const source = getEnergySource(creep, job);
            if (source) {
                let result;
                if (source.resourceType === RESOURCE_ENERGY) {
                    // dropped
                    result = creep.pickup(source);
                } else {
                    // structure
                    result = creep.withdraw(source, RESOURCE_ENERGY);
                }

                if (result === ERR_NOT_IN_RANGE) {
                    creep.moveTo(source, {
                        reusePath: 5,
                        visualizePathStyle: { stroke: '#ffaa00' }
                    });
                }
            } else {
                // Nothing to grab → idle near storage or spawn
                const idle =
                    room.storage ||
                    room.find(FIND_MY_SPAWNS)[0];
                if (idle && !creep.pos.inRangeTo(idle, 3)) {
                    creep.moveTo(idle, {
                        reusePath: 10,
                        visualizePathStyle: { stroke: '#6666ff' }
                    });
                }
            }
            return;
        }

        // === HAULING → DELIVER ENERGY ===
        const target = getDeliveryTarget(creep, job);
        if (target) {
            const result = creep.transfer(target, RESOURCE_ENERGY);
            if (result === ERR_NOT_IN_RANGE) {
                creep.moveTo(target, {
                    reusePath: 5,
                    visualizePathStyle: { stroke: '#ffffff' }
                });
            }
        } else {
            // Nowhere to deliver → idle
            const idle =
                room.storage ||
                room.find(FIND_MY_SPAWNS)[0];
            if (idle && !creep.pos.inRangeTo(idle, 3)) {
                creep.moveTo(idle, {
                    reusePath: 10,
                    visualizePathStyle: { stroke: '#6666ff' }
                });
            }
        }
    }
};
