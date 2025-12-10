// dash.safemode.js

module.exports = {
    run() {

for (const roomName in Game.rooms) {
    const room = Game.rooms[roomName];
    if (!room.controller || !room.controller.my) continue;

    const vis = new RoomVisual(room.name);

    if (room.controller.safeMode) {
        vis.rect(5, 1.5, 20, 2, {
            fill: '#000000',
            opacity: 0.7,
            stroke: '#ff0000',
            strokeWidth: 0.15
        });

        vis.text('SAFE MODE ACTIVE', 15, 2.1, {
            align: 'center',
            font: 1.2,
            color: '#ff5555'
        });

        vis.text(`Ticks left: ${room.controller.safeMode}`, 15, 2.7, {
            align: 'center',
            font: 0.8,
            color: '#ffaaaa'
        });
    }
}

}
}
