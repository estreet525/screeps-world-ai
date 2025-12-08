// roles.claimer.js
module.exports = {
    run: function (creep) {
        const targetRoom = creep.memory.targetRoom;

        if (!targetRoom) {
            // No target set, just idle near controller if any
            if (creep.room.controller) {
                creep.moveTo(creep.room.controller, { visualizePathStyle: { stroke: '#ffffff' } });
            }
            return;
        }

        // Not in target room yet → travel there
        if (creep.room.name !== targetRoom) {
            const pos = new RoomPosition(25, 25, targetRoom);
            creep.moveTo(pos, { visualizePathStyle: { stroke: '#ffaa00' } });
            return;
        }

        // In target room → work on the controller
        const controller = creep.room.controller;
        if (!controller) return;

        // If someone else owns or reserves it, attack first
        if (
            (controller.owner && !controller.my) ||
            (controller.reservation && controller.reservation.username !== Game.shard.name) // shard name is placeholder
        ) {
            const result = creep.attackController(controller);
            if (result === ERR_NOT_IN_RANGE) {
                creep.moveTo(controller, { visualizePathStyle: { stroke: '#ff0000' } });
            }
            return;
        }

        // Try to claim it
        const result = creep.claimController(controller);
        if (result === ERR_NOT_IN_RANGE) {
            creep.moveTo(controller, { visualizePathStyle: { stroke: '#ffffff' } });
        } else if (result === OK) {
            // Optional: sign the controller with a little tag :)
            creep.signController(controller, "Property of Eric Industries 🧠🍺");
        }
    }
};
