// roles.rangedDefender.js

module.exports = {
    run: function (creep) {

        // === 1. Find closest hostile creep ===
        const hostile = creep.pos.findClosestByRange(FIND_HOSTILE_CREEPS);

        // If we see an enemy, go into combat mode
        if (hostile) {
            const range = creep.pos.getRangeTo(hostile);

            // --- Attack if in range 3 (max range for RANGED_ATTACK) ---
            if (range <= 3) {
                creep.rangedAttack(hostile);
            }

            // --- KITE: if enemy is too close, run away ---
            // We "flee" if range <= 2 so we try to stay around 3 tiles away
            if (range <= 2) {
                const fleePath = creep.pos.findPathTo(hostile, {
                    flee: true,
                    maxRooms: 1
                });

                if (fleePath && fleePath.length > 0) {
                    creep.move(fleePath[0].direction);
                }
                return; // done for this tick
            }

            // --- If enemy is far, move closer until we're in a good firing distance ---
            if (range > 3) {
                creep.moveTo(hostile, {
                    reusePath: 5,
                    visualizePathStyle: { stroke: '#ffaa00' }
                });
            }

            return; // combat behavior done
        }

        // === 2. No hostiles: idle near something important ===
        // Prefer a tower, then spawn, then controller
        // === 2. No hostiles: idle near the controller (away from traffic) ===
        const anchor = creep.room.controller;

        if (anchor) {
            // Hang out within 3–4 tiles of the controller
            if (!creep.pos.inRangeTo(anchor, 4)) {
                creep.moveTo(anchor, {
                    reusePath: 10,
                    visualizePathStyle: { stroke: '#00ffff' }
                });
            }
        }
    }
};


