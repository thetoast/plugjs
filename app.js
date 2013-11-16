function timestamp(seconds) {
    var sec = Math.floor(seconds % 60);
    var min = Math.floor((seconds / 60) % 60);
    var hours = Math.floor((min / 60) % 60);

    if (sec < 10) {
        sec = "0" + sec;
    }
    if (min < 10) {
        min = "0" + min;
    }

    return (hours ? (hours + ":") : "") + min + ":" + sec;
}

function App() {
    this.registerCommands([
        {
            name: "autowoot",
            args: "[0|1]",
            desc: "get/set autowoot",
            help: "Call without parameters to get autowoot status.  Call with a 0 or 1 to disable/enable autowoot.",
            func: this.autoWoot
        },
        //{
        //    name: "leaveafter",
        //    desc: "leave after your next track",
        //    help: "Leaves the DJ booth or waiting list after you play your next song.  If you are currently playing, it will leave after this song.",
        //    func: this.leaveafter
        //},
        {
            name: "?",
            arg: "[cmd]",
            desc: "lists info on commands",
            help: "Call without parameters to list commands or call with the name of a command to get specific help on that command.",
            func: this.help
        }
    ]);

    if (this.autoWootEnabled) {
        this.startWooting();
    }

    this.addHooks();
}

App.prototype = Object.create(Object.prototype, {
    constructor: App,
    commands: { value: {} },
    autoWootEnabled: {
        get: function () {
            return localStorage["auto-woot"] === "true";
        },
        set: function (val) {
            localStorage["auto-woot"] = val;
        }
    },
});

App.prototype.registerCommands= function (cmds) {
    var self = this;
    cmds.forEach(function (cmd) {
        self.commands[cmd.name] = cmd;
    });
}

App.prototype.addHooks = function () {
    var self = this;
    function hookIt(event, fn) {
        API.on(event, function () {
            fn.apply(self, arguments);
        });
    }
    hookIt(API.CHAT_COMMAND, this.onChatCommand);
    hookIt(API.DJ_ADVANCE, this.onDJAdvance);
}

App.prototype.onChatCommand = function (command) {
    var split = command.split(" ");
    var name = split[0].substring(1);
    var cmd = this.commands[name];
    var args = Array.prototype.slice.call(split, 1);

    if (cmd) {
        console.debug("executing command", cmd, "with args", args);
        try {
            cmd.func.call(this, name, args);
        } catch (e) {
            API.chatLog("error executing command", true);
            console.error("error executing command:", e);
            if (e.stack) {
                console.error("stack:\n", e.stack);
            }
        }
    } else {
        API.chatLog("No such command", true);
        this.help();
    }
}

App.prototype.onDJAdvance = function (data) {
    if (data && data.media) {
        var media = data.media;
        window.postMessage({
            action: 'notify',
            message: "Now Playing: " + media.author + " - " + media.title + " (" + timestamp(media.duration) + ")"
        }, "http://plug.dj");
    }
}

App.prototype.startWooting = function () {
    this.autoWootEnabled = true;
    if (!this.wootInterval) {
        this.wootInterval = setInterval(function () {
            $("#woot").click();
        }, 10000);
    }
}
App.prototype.stopWooting = function () {
    this.autoWootEnabled = false;
    clearInterval(this.wootInterval);
    this.wootInterval = undefined;
}
App.prototype.autoWoot = function (cmd, args) {
    if (args.length === 1) {
        if (parseInt(args[0]) === 1) {
            this.startWooting();
        } else {
            this.stopWooting();
        }
    }
    API.chatLog("AutoWoot: " + (this.autoWootEnabled ? "enabled" : "disabled"));
}

App.prototype.printCommands = function (helpCmd) {
    var self = this;

    function printHelp(cmd) {
        var hasArgs = cmd.args != null;
        API.chatLog("/" + cmd.name + 
                    (hasArgs ? (" " + cmd.args) : "") +
                    " -- " + cmd.desc);
    }

    API.chatLog("Commands:");
    printHelp(this.commands[helpCmd]);
    Object.keys(this.commands).forEach(function (name) {
        if (name !== helpCmd) {
            printHelp(self.commands[name]);
        }
    });
}
App.prototype.help = function (name, args) {
    if (args.length === 1) {
        var cmd = this.commands[args[0]];
        if (cmd) {
            if (cmd.help) {
                API.chatLog(cmd.help);
            } else if (cmd.desc) {
                API.chatLog(cmd.desc);
            } else {
                API.chatLog("no help available");
            }
        }
    } else {
        this.printCommands("?");
    }
}

var app;
var apiInterval = setInterval(function () {
    if (typeof(API) !== "undefined") {
        clearInterval(apiInterval);
        app = new App();
        console.log("plug.dj script loaded");
    }
}, 1000);
