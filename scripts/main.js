import { world, system, Player } from "@minecraft/server";

const teamColors = {
    "aqua": "§b", "black": "§0", "blue": "§9", "dark_aqua": "§3",
    "dark_blue": "§1", "dark_gray": "§8", "dark_green": "§2",
    "dark_purple": "§5", "dark_red": "§4", "gold": "§6",
    "gray": "§7", "green": "§a", "light_purple": "§d",
    "red": "§c", "white": "§f", "yellow": "§e"
};

const teams = Object.keys(teamColors);

system.beforeEvents.startup.subscribe(ev => {
    function registerCommandWithAlias(namespace, commandName, description, callback) {
        const fullName = `${namespace}:${commandName}`;
        ev.customCommandRegistry.registerCommand({ name: fullName, description }, callback);
        ev.customCommandRegistry.registerCommand({ name: commandName, description: description + "（略）" }, callback);
    }

    registerCommandWithAlias("tbf", "tc", "チームチャットの切替", (ctx) => {
        const player = ctx.sender ?? ctx.sourceEntity;
        if (!player) return;
        system.run(() => {
            if (player.hasTag("tc")) {
                player.removeTag("tc");
                player.sendMessage("§eチームチャット: §cOFF");
            } else {
                player.addTag("tc");
                player.sendMessage("§eチームチャット: §aON");
            }
        });
    });
});

world.beforeEvents.chatSend.subscribe((ev) => {
    const { sender, message } = ev;
    ev.cancel = true;

    const teamTag = teams.find(tag => sender.hasTag(tag));
    const isAutoMode = sender.hasTag("tc");
    const isTeamMsg = isAutoMode ? !message.startsWith("!") : message.startsWith("!");
    const content = message.startsWith("!") ? message.slice(1) : message;

    system.run(() => {
        if (teamTag && isTeamMsg) {
            const color = teamColors[teamTag];
            const raw = { rawtext: [{ text: `§l${color}[TEAM]§r <${sender.name}> ${content}` }] };
            for (const m of world.getPlayers()) {
                if (m.hasTag(teamTag)) m.sendMessage(raw);
            }
        } else {
            const tellrawMsg = JSON.stringify({ rawtext: [{ text: `<${sender.nameTag}> ${content}` }] });
            world.getDimension("overworld").runCommand(`tellraw @a ${tellrawMsg}`);
        }
    });
});

system.runInterval(() => {
    for (const player of world.getPlayers()) {
        const teamTag = teams.find(tag => player.hasTag(tag));
        const color = teamTag ? teamColors[teamTag] : "";
        const expected = teamTag ? `${color}${player.name}§r` : player.name;
        if (player.nameTag !== expected) player.nameTag = expected;
    }
}, 20);