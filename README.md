## Current Status

- Repo initialized and structured.
- No actual Screeps code imported yet.
- This will eventually mirror my existing Screeps World code (flat module names like 'roles.harvester', 'managers.spawn', etc.).
- For now, this repo is for planning and scaffolding.

## Special one line commands:

- spawn claimer and send to a target room (change room code):

Game.spawns["Spawn1"].spawnCreep(
    require('config').getBodyForRole("claimer", Game.spawns["Spawn1"]),
    "claimer_W25N8_" + Game.time, 
    {
        memory: {
            role: "claimer",
            targetRoom: "W25N8", 
            homeRoom: Game.spawns["Spawn1"].room.name
        }
    }
);

- Spawn a pioneer and sent them to the target room:

Game.spawns["Spawn1"].spawnCreep(
    require('config').getBodyForRole("pioneer", Game.spawns["Spawn1"]),
    "pioneer_W25N8_" + Game.time,
    {
        memory: {
            role: "pioneer",
            targetRoom: "W25N8",
            homeRoom: Game.spawns["Spawn1"].room.name,
            building: false
        }
    }
);

