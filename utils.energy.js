// Assigns creeps evenly to energy sources or containers
module.exports.getBalancedEnergyTarget = function(creep) {
    // If creep already has a target and it's valid, keep using it
    if (creep.memory.energyTargetId) {
        const obj = Game.getObjectById(creep.memory.energyTargetId);
        if (obj && obj.store && obj.store[RESOURCE_ENERGY] > 0) return obj;
    }

    const room = creep.room;

    // Candidate list: containers near sources + dropped energy heaps
    const containers = room.find(FIND_STRUCTURES, {
        filter: s =>
            s.structureType === STRUCTURE_CONTAINER &&
            s.store[RESOURCE_ENERGY] > 0
    });

    const drops = room.find(FIND_DROPPED_RESOURCES, {
        filter: r => r.resourceType === RESOURCE_ENERGY && r.amount > 50
    });

    let targets = drops.concat(containers);

    if (targets.length === 0) return null;

    // Count creeps currently assigned to each target
    const assignmentCounts = {};
    for (const t of targets) assignmentCounts[t.id] = 0;

    for (const cName in Game.creeps) {
        const c = Game.creeps[cName];
        if (c.memory.energyTargetId && assignmentCounts[c.memory.energyTargetId] !== undefined) {
            assignmentCounts[c.memory.energyTargetId]++;
        }
    }

    // Pick the target with the fewest assigned creeps
    const best = _.min(targets, t => assignmentCounts[t.id]);

    creep.memory.energyTargetId = best.id;
    return best;
};
