const spawnManager   = require('managers.spawn');
const harvesterRole  = require('roles.harvester');
const upgraderRole   = require('roles.upgrader');
const builderRole    = require('roles.builder');
const minerRole      = require('roles.miner');
const haulerRole     = require('roles.hauler');
const roleRepairer   = require('roles.repairer');
const rolerangedDefender = require('roles.rangedDefender');
const containersManager = require('managers.containers');
const roadsManager   = require('managers.roads');
const extensionsManager = require('managers.extensions');
const storageManager = require('managers.storage');
const towersManager = require('managers.towers');
const rampartsManager = require('managers.ramparts');
const pixelManager      = require('managers.pixel');

const roleMap = {
    harvester: harvesterRole,
    upgrader: upgraderRole,
    builder: builderRole,
    miner: minerRole,
    hauler: haulerRole,
    repairer: roleRepairer,
    rangedDefender: rolerangedDefender
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
        rampartsManager.run(room);

        // Storage once we hit RCL4
        storageManager.run(room);
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
