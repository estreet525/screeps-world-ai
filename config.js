// config.js (module name: "config" in Screeps)

// Compute energy cost of a body, e.g. [WORK, CARRY, MOVE]
function bodyCost(body) {
    var total = 0;
    for (var i = 0; i < body.length; i++) {
        total += BODYPART_COST[body[i]];
    }
    return total;
}

// Smallest "can do stuff" body
var DEFAULT_BODY = [WORK, CARRY, MOVE];

// Body options from largest → smallest for each role
// We'll pick the biggest one we can afford based on room.energyCapacityAvailable
var BODY_OPTIONS = {
    miner: [
        // RCL3+ / higher capacity: strong miner
        [WORK, WORK, WORK, WORK, WORK, MOVE, MOVE, MOVE],   // cost 650
        // RCL2 full extensions: solid miner
        [WORK, WORK, WORK, MOVE, MOVE],                     // cost 400
        // Early game: basic miner
        [WORK, WORK, MOVE]                                  // cost 250
    ],

    hauler: [
        // Big hauler
        [WORK, CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE], // 500
        // Mid hauler
        [WORK, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE],                           // 300
        // Small hauler
        [WORK, CARRY, CARRY, MOVE, MOVE]                                         // 200
    ],

    upgrader: [
        // Big upgrader
        [WORK, WORK, WORK, CARRY, CARRY, MOVE, MOVE, MOVE],  // 550
        // Medium
        [WORK, WORK, CARRY, CARRY, MOVE, MOVE],              // 400
        // Small
        [WORK, CARRY, CARRY, MOVE]                           // 250
    ],

    builder: [
        // Big builder
        [WORK, WORK, WORK, CARRY, CARRY, MOVE, MOVE, MOVE],  // 550
        // Medium
        [WORK, WORK, CARRY, CARRY, MOVE, MOVE],              // 400
        // Small
        [WORK, CARRY, CARRY, MOVE]                           // 250
    ],

    harvester: [
        // We mostly use miners/haulers now, but harvester is our "emergency" worker
        [WORK, WORK, CARRY, CARRY, MOVE, MOVE],              // 400
        [WORK, CARRY, CARRY, MOVE],                          // 250
        [WORK, CARRY, MOVE]                                  // 200
    ]
};

// Choose the best body for a role given the room's energy capacity
function getBodyForRole(role, room) {
    var options = BODY_OPTIONS[role];
    if (!options || options.length === 0) {
        return DEFAULT_BODY;
    }

    var capacity = room ? room.energyCapacityAvailable : 300;

    // Try options from largest to smallest
    for (var i = 0; i < options.length; i++) {
        var body = options[i];
        if (bodyCost(body) <= capacity) {
            return body;
        }
    }

    // If somehow none fit (super early game), fall back to smallest or default
    return options[options.length - 1] || DEFAULT_BODY;
}

module.exports = {
    // Target creep counts by role (tune as you like)
    creepCounts: {
        harvester: 0,   // only emergency via the spawn logic
        miner: 2,
        hauler: 2,
        upgrader: 2,
        builder: 2
    },

    bodyCost: bodyCost,
    getBodyForRole: getBodyForRole
};
