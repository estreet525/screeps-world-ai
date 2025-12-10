// dash.creeps.js

function getState() {
    if (!Memory.dashboards) Memory.dashboards = {};
    if (!Memory.dashboards.creeps) {
        Memory.dashboards.creeps = {
            enabled: false,   // start hidden
            anchorX: 1,       // top-left-ish
            anchorY: 1
        };
    }
    return Memory.dashboards.creeps;
}

function drawCreepDashboard() {
    const state = getState();
    if (!state.enabled) return;

    // Find any owned room to draw in
    let targetRoom = null;
    for (const roomName in Game.rooms) {
        const room = Game.rooms[roomName];
        if (room.controller && room.controller.my) {
            targetRoom = room;
            break;
        }
    }
    if (!targetRoom) return;

    const vis = new RoomVisual(targetRoom.name);
    const totalCreeps = Object.keys(Game.creeps).length;
    // Haulers
    const totalHaulers = Object.values(Game.creeps)
    .filter(c => c.memory.role === 'hauler')
    .length;
    // Miners
    const totalMiners = Object.values(Game.creeps)
    .filter(c => c.memory.role === 'miner')
    .length;
    // Upgraders
    const totalUpgraders = Object.values(Game.creeps)
    .filter(c => c.memory.role === 'upgrader')
    .length;
    // Builders
    const totalBuilders = Object.values(Game.creeps)
    .filter(c => c.memory.role === 'builder')
    .length;
    // Repairers
    const totalRepairers = Object.values(Game.creeps)
    .filter(c => c.memory.role === 'repairer')
    .length;



    const x = state.anchorX;
    const y = state.anchorY;

    // Background box
    vis.rect(x - 0.3, y - 0.8, 13.7, 2.5, {
        fill: '#000000',
        opacity: 0.4,
        stroke: '#ffffff',
        strokeWidth: 0.05
    });

    // Title
    vis.text('Creep Dashboard', x, y - 0.2, {
        align: 'left',
        font: 0.5
    });

    // Main stat
    vis.text(`Total creeps: ${totalCreeps}`, x, y + 0.6, {
        align: 'left',
        font: 0.8
    });
    vis.text(`Haulers: ${totalHaulers}`, x, y + 1.4, {
        align: 'left',
        font: 0.8
    });
    vis.text(`Miners: ${totalMiners}`, x, y + 2.6, {
        align: 'left',
        font: 0.8
    });
    vis.text(`Upgraders: ${totalUpgraders}`, x, y + 3.8, {
        align: 'left',
        font: 0.8
    });
    vis.text(`Builders: ${totalBuilders}`, x, y + 5.0, {
        align: 'left',
        font: 0.8
    });
    vis.text(`Repairers: ${totalRepairers}`, x, y + 6.2, {
        align: 'left',
        font: 0.8
    });
}

module.exports = {
    run() {
        drawCreepDashboard();
    },

    toggle() {
        const state = getState();
        state.enabled = !state.enabled;
        return state.enabled;
    },

    // Example hook for future dynamic options:
    // setAnchor(x, y) { const s = getState(); s.anchorX = x; s.anchorY = y; }
};
