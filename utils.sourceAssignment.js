module.exports = {
    assignSource(creep) {
        // Already assigned? Just return the object
        if (creep.memory.sourceId) {
            return Game.getObjectById(creep.memory.sourceId);
        }

        const room = creep.room;
        const sources = room.find(FIND_SOURCES);

        // Count how many miners are assigned to each source
        const assignmentCounts = {};
        for (const source of sources) {
            assignmentCounts[source.id] = 0;
        }

        for (const name in Game.creeps) {
            const c = Game.creeps[name];
            if (c.memory.role === 'miner' && c.memory.sourceId) {
                if (assignmentCounts[c.memory.sourceId] !== undefined) {
                    assignmentCounts[c.memory.sourceId]++;
                }
            }
        }

        // Choose the source with the fewest assigned miners
        const chosen = sources.reduce((least, src) => {
            if (!least) return src;
            return assignmentCounts[src.id] < assignmentCounts[least.id] ? src : least;
        }, null);

        // Store in memory
        if (chosen) {
            creep.memory.sourceId = chosen.id;
            // Optional console log:
            // console.log(`Miner ${creep.name} assigned to source ${chosen.id}`);
        }

        return chosen;
    }
};
