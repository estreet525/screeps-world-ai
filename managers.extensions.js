// managers.extensions

const EXTENSIONS_PER_RCL = {
    1: 0,
    2: 5,
    3: 10,
    4: 20,
    5: 30,
    6: 40,
    7: 50,
    8: 60
};

module.exports = {
    run: function (room) {
        const controller = room.controller;
        if (!controller || !controller.my) {
            return;
        }

        const rcl = controller.level || 0;
        const maxExtensions = EXTENSIONS_PER_RCL[rcl] || 0;
        if (maxExtensions === 0) {
            // nothing to do at RCL1
            return;
        }

        // Throttle: only run every 100 ticks (offset a bit)
        if (Game.time % 100 !== 5) {
            return;
        }

        // Count existing extensions
        const built = room.find(FIND_MY_STRUCTURES, {
            filter: function (s) {
                return s.structureType === STRUCTURE_EXTENSION;
            }
        }).length;

        // Count extension construction sites
        const sites = room.find(FIND_CONSTRUCTION_SITES, {
            filter: function (s) {
                return s.structureType === STRUCTURE_EXTENSION;
            }
        }).length;

        const alreadyPlanned = built + sites;
        const remaining = maxExtensions - alreadyPlanned;
        if (remaining <= 0) {
            return;
        }

        const spawns = room.find(FIND_MY_SPAWNS);
        if (spawns.length === 0) {
            return;
        }
        const spawn = spawns[0];

        const terrain = room.getTerrain();
        let toPlace = remaining;

        // Helper to test if we can place an extension at (x, y)
        const canPlaceAt = function (x, y) {
            // Must be in-bounds
            if (x < 0 || x > 49 || y < 0 || y > 49) return false;

            // Not wall
            if (terrain.get(x, y) === TERRAIN_MASK_WALL) return false;

            // No existing structures
            const structs = room.lookForAt(LOOK_STRUCTURES, x, y);
            if (structs.length > 0) return false;

            // No existing construction sites
            const cons = room.lookForAt(LOOK_CONSTRUCTION_SITES, x, y);
            if (cons.length > 0) return false;

            return true;
        };

        // Lay extensions in expanding "square rings" around the spawn
        for (let radius = 2; radius <= 6 && toPlace > 0; radius++) {

            // top & bottom edges
            for (let dx = -radius; dx <= radius && toPlace > 0; dx++) {
                const xTop = spawn.pos.x + dx;
                const yTop = spawn.pos.y - radius;
                const xBottom = spawn.pos.x + dx;
                const yBottom = spawn.pos.y + radius;

                if (canPlaceAt(xTop, yTop)) {
                    const resTop = room.createConstructionSite(xTop, yTop, STRUCTURE_EXTENSION);
                    if (resTop === OK) {
                        toPlace--;
                        if (toPlace <= 0) return;
                    }
                }

                if (canPlaceAt(xBottom, yBottom)) {
                    const resBottom = room.createConstructionSite(xBottom, yBottom, STRUCTURE_EXTENSION);
                    if (resBottom === OK) {
                        toPlace--;
                        if (toPlace <= 0) return;
                    }
                }
            }

            // left & right edges (skip corners we already did)
            for (let dy = -radius + 1; dy <= radius - 1 && toPlace > 0; dy++) {
                const xLeft = spawn.pos.x - radius;
                const yLeft = spawn.pos.y + dy;
                const xRight = spawn.pos.x + radius;
                const yRight = spawn.pos.y + dy;

                if (canPlaceAt(xLeft, yLeft)) {
                    const resLeft = room.createConstructionSite(xLeft, yLeft, STRUCTURE_EXTENSION);
                    if (resLeft === OK) {
                        toPlace--;
                        if (toPlace <= 0) return;
                    }
                }

                if (canPlaceAt(xRight, yRight)) {
                    const resRight = room.createConstructionSite(xRight, yRight, STRUCTURE_EXTENSION);
                    if (resRight === OK) {
                        toPlace--;
                        if (toPlace <= 0) return;
                    }
                }
            }
        }
    }
};
