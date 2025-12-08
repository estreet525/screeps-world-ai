const config = require('config');

module.exports = {
    run: function (spawn) {
        const roomCreeps = _.filter(Game.creeps, c => c.memory.homeRoom === spawn.room.name);
        const counts = _.countBy(roomCreeps, c => c.memory.role);


        const desired = config.getCreepCounts(spawn.room);

        // 🆘 Emergency: if all creeps are dead, force a basic harvester
        if (Object.keys(Game.creeps).length === 0) {
            const emergencyBody = [WORK, CARRY, MOVE]; // cheap and effective
            const cost = config.bodyCost(emergencyBody);

            if (spawn.room.energyAvailable >= cost) {
                const name = 'emergency-harvester-' + Game.time;
                const res = spawn.spawnCreep(emergencyBody, name, {
                    memory: { role: 'harvester' }
                });
                if (res === OK) {
                    console.log('⚠️ Emergency harvester spawned:', name);
                }
            }
            return;
        }

        // Normal spawn logic
        for (const role in desired) {
            const have = counts[role] || 0;
            const want = desired[role];

            if (have >= want) {
                continue;
            }

            // Pick best body we can afford for this room's capacity
            const body = config.getBodyForRole(role, spawn.room);
            const cost = config.bodyCost(body);

            // Only spawn if we currently have enough AVAILABLE energy for that body
            if (spawn.room.energyAvailable < cost) {
                // Not enough energy yet – wait until we fill up more
                return;
            }

            if (role === 'hauler') {
                const existingHaulers = _.filter(Game.creeps, c => c.memory.role === 'hauler');

                // Default job
                let job = 'general';

                const jobOrder = ['extensions', 'towers', 'controller', 'sources'];

             if (existingHaulers.length >= 3) {
                    // Try to assign one of each specialized job first
                    const usedJobs = existingHaulers.map(c => c.memory.job);

                    const unused = jobOrder.find(j => !usedJobs.includes(j));

                    if (unused) {
                        job = unused;
                    } else {
                        // If all 4 are already in use, keep this one "general"
                        job = 'general';
                    }
                }

    
            }

            const name = role + '-' + Game.time;
            const result = spawn.spawnCreep(body, name, {
                memory: { role: role }
            });

            if (result === OK) {
                console.log('Spawn:', spawn.name, 'creating', role, '→', name, 'cost', cost);
            } else {
                console.log('Spawn error for role', role, ':', result);
            }

            // Only try to spawn one creep per tick
            break;
        }
    }
};
