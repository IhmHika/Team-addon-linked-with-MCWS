import { world, system, CommandPermissionLevel } from "@minecraft/server";

const teamColors = {
    aqua: "§b",
    black: "§0",
    blue: "§9",
    dark_aqua: "§3",
    dark_blue: "§1",
    dark_gray: "§8",
    dark_green: "§2",
    dark_purple: "§5",
    dark_red: "§4",
    gold: "§6",
    gray: "§7",
    green: "§a",
    light_purple: "§d",
    red: "§c",
    white: "§f",
    yellow: "§e",
};

const teams = Object.keys(teamColors);

system.beforeEvents.startup.subscribe((ev) => {
    /**
     * @param {string} namespace
     * @param {string} commandName
     * @param {string} description
     * @param {(ctx:{sender?:any,args?:string[]})=>void} callback
     */
    function registerCommandWithAlias(namespace, commandName, description, callback) {
        const fullName = `${namespace}:${commandName}`;

        const cmdDefinition = {
            name: fullName,
            description,
            permissionLevel: CommandPermissionLevel.Any,
            mandatoryParameters: [],
            optionalParameters: [],
        };

        const aliasDefinition = {
            name: commandName,
            description: `${description}（エイリアス）`,
            permissionLevel: CommandPermissionLevel.Any,
            mandatoryParameters: [],
            optionalParameters: [],
        };

        ev.customCommandRegistry.registerCommand(cmdDefinition, callback);
        ev.customCommandRegistry.registerCommand(aliasDefinition, callback);
    }

    registerCommandWithAlias("tbf", "tc", "チームチャットのON/OFF切り替え", (ctx) => {
        const player =
            ctx.sender ??
            ctx.source ??
            ctx.player ??
            ctx.initiator ??
            ctx.sourceEntity;

        if (!player) return;

        system.run(() => {
            try {
                if (player.hasTag("tc")) {
                    player.runCommand("tag @s remove tc");
                    player.runCommand(
                        `tellraw @s {"rawtext":[{"text":"§eチームチャットを§cOFF§eにしました"}]}`
                    );
                } else {
                    player.runCommand("tag @s add tc");
                    player.runCommand(
                        `tellraw @s {"rawtext":[{"text":"§eチームチャットを§aON§eにしました"}]}`
                    );
                }
            } catch (e) {
                console.error("tcコマンドエラー:", e);
            }
        });
    });
});

world.beforeEvents.chatSend.subscribe((ev) => {
    const { sender, message } = ev;
    ev.cancel = true;

    const teamTag = teams.find((tag) => sender.hasTag(tag));
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
        const teamTag = teams.find((tag) => player.hasTag(tag));
        const color = teamTag ? teamColors[teamTag] : "";
        const expected = teamTag ? `${color}${player.name}§r` : player.name;
        if (player.nameTag !== expected) player.nameTag = expected;
    }
}, 20);
