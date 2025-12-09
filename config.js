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
        // Bigger Miner
        [ WORK, WORK, WORK, WORK, WORK, MOVE, MOVE, MOVE], // cost 1000
        // RCL3+ / higher capacity: strong miner
        [WORK, WORK, WORK, WORK, WORK, MOVE, MOVE, MOVE],   // cost 650
        // RCL2 full extensions: solid miner
        [WORK, WORK, WORK, MOVE, MOVE],                     // cost 400
        // Early game: basic miner
        [WORK, WORK, MOVE]                                  // cost 250
    ],

    hauler: [
        // Bigger Hauler
        [CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY,
         MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE   
        ],                                                                        // 100
        // Big hauler
        [WORK, CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE], // 600
        // Mid hauler
        [WORK, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE],                           // 400
        // Small hauler
        [WORK, CARRY, CARRY, MOVE, MOVE]                                         // 300
    ],

    upgrader: [
        // Bigger upgrader
        [WORK, WORK, WORK, WORK, WORK, WORK, CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE,
         MOVE
        ],                                                   // 1000
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
    ],

    repairer: [
        // Big builder
        [WORK, WORK, WORK, CARRY, CARRY, MOVE, MOVE, MOVE],  // 550
        // Medium
        [WORK, WORK, CARRY, CARRY, MOVE, MOVE],              // 400
        // Small
        [WORK, CARRY, CARRY, MOVE]                           // 250
    ],

    rangedDefender: [
        // Large (for when your energy income is comfy)
        [TOUGH, TOUGH, TOUGH, MOVE, MOVE, MOVE, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK],  // 630
        // Medium
        [TOUGH, TOUGH, MOVE, MOVE, MOVE, RANGED_ATTACK, RANGED_ATTACK], // 470
        // Small
        [TOUGH, MOVE, RANGED_ATTACK, MOVE] // 260
    ],

    claimer: [
        // Claim parts are expensive and decay quickly
        [CLAIM, MOVE, MOVE]
    ],

    pioneer: [
        // Early pioneers
        [WORK, WORK, CARRY, CARRY, MOVE, MOVE]

    ],

    storageTopper: [
        // Fast and Strong
        [CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE] // 600
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

// 🔹 New: RCL-aware creep counts
function getCreepCounts(room) {
    const rcl = room.controller ? room.controller.level : 0;
    const hasStorage = room.storage ? true : false;

    // Base economy (you can tweak this as you like)
    const counts = {
        harvester: 0,   // only emergency via spawn logic
        miner: 2,
        hauler: 2,      // you mentioned maybe dropping this to 2 on a new run later
        upgrader: 2,
        builder: 2,
        repairer: 1,
        storageTopper: 0,
        rangedDefender: 0 // default off until RCL 3+
    };

    // Only start using a storageTopper once we have storage
    if (hasStorage && rcl >= 4) {
        counts.storageTopper = 1;
    }

    // Defenders kick in by RCL
    if (rcl >= 5) {
        counts.rangedDefender = 3;
    } else if (rcl >= 4) {
        counts.rangedDefender = 2;
    } else if (rcl >= 3) {
        counts.rangedDefender = 1;
    }

    return counts;
}

module.exports = {
    getCreepCounts,
    bodyCost,
    getBodyForRole
};
