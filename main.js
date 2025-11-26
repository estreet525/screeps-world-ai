const spawnManager   = require('managers.spawn');
const harvesterRole  = require('roles.harvester');
const upgraderRole   = require('roles.upgrader');
const builderRole    = require('roles.builder');
const minerRole      = require('roles.miner');
const haulerRole     = require('roles.hauler');
const containersManager = require('managers.containers');
const roadsManager   = require('managers.roads');
const extensionsManager = require('managers.extensions');
const towersManager = require('managers.towers');
const rampartsManager = require('managers.ramparts');
const pixelManager      = require('managers.pixel');

const roleMap = {
    harvester: harvesterRole,
    upgrader: upgraderRole,
    builder: builderRole,
    miner: minerRole,
    hauler: haulerRole
};

module.exports.loop = function () {
    // Clean up memory
    for (const name in Memory.creeps) {
        if (!Game.creeps[name]) {
            delete Memory.creeps[name];
        }
    }

    // Spawn logic
    for (const spawnName in Game.spawns) {
        spawnManager.run(Game.spawns[spawnName]);
    }
    
    // Room-level managers (roads, later more)
    for (const roomName in Game.rooms) {
        const room = Game.rooms[roomName];

        // Containers First (hightest priority)
        containersManager.plan(room);
        containersManager.run(room); 
        
        // Then extensions
        extensionsManager.run(room);
        
        // Then roads
        roadsManager.run(room);
        
        // Then towers
        towersManager.plan(room);
        towersManager.run(room);

        // Then ramparts
        containersManager.plan(room);
        containersManager.run(room);
    }
    
    // Pixels from spare CPU
    pixelManager.run();


    // Run roles
    for (const name in Game.creeps) {
        const creep = Game.creeps[name];
        const role = creep.memory.role;
        const handler = roleMap[role];
        if (!handler) continue;
        handler.run(creep);
    }
};
