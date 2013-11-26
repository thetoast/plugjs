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
    this.user = API.getUser();
    this.registerCommands([
        {
            name: "autowoot",
            args: "[0|1]",
            desc: "get/set autowoot",
            help: "Call without parameters to get autowoot status.  Call with a 0 or 1 to disable/enable autowoot.",
            func: this.autoWoot
        },
        {
            name: "leaveafter",
            args: "[n|?|cancel]", 
            desc: "leave after your next track or n track(s)",
            help: "Without arguments, leaves the DJ booth after you play your next song. " +
                  "With an int argument, leave after you have played that number of tracks. " +
                  "With '-1' or 'cancel', cancels the leaveafter command. " +
                  "With '?', prints the number of remaining tracks.",
            func: this.leaveafter
        },
        {
            name : "brb",
            args : "[0|1]",
            desc : "get/set AFK status",
            help : "Call without parameters to get AFK status. Call with 0 or 1 to disable/enable AFK status",
            func : this.brb
        },
        {
            name : "chatsound",
            args : "[0|1|2|none|mention|all]",
            desc : "get/set chat sound triggers",
            help : "Call with 0 or 'none' to silence all chat sounds." +
                   "Call with 1 or 'mention' to sound on mentions." +
                   "Call with 2 or 'all' to sound on all chats.",
            func : this.chatsound
        },
        {
            name: "?",
            args: "[cmd]",
            desc: "lists info on commands",
            help: "Call without parameters to list commands or call with the name of a command to get specific help on that command.",
            func: this.help
        }
    ]);

    if (this.autoWootEnabled) {
        this.clickWoot();
    }

    if (this.leaveAfterCount || this.leaveAfterCount === 0) {
        this.addCheckLeaveListeners();
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
    savedAutoWoot : {
    	get : function ()
    	{
    		return localStorage["saved-auto-woot"] === "true";
    	},
    	set : function (val)
    	{
    		localStorage["saved-auto-woot"] = val;
    	}
    },
    isCurrentDJ: {
        get: function () {
            var dj = API.getDJ();
            if (dj) {
                return this.user && (this.user.id === dj.id);
            } else {
                return false;
            }
        },
    },
    isQueued: {
        get: function () {
            if (this.user) {
                return API.getWaitListPosition(this.user.id) >= 0;
            } else {
                return false;
            }
        },
    },
    leaveAfterCount: {
        get: function () {
            // make sure we only return an int or null
            var val = parseInt(localStorage["leaveafter"]);
            if (isNaN(val)) {
                val = null;
            };
            return val;
        },
        set: function (val) {
            localStorage["leaveafter"] = val;
        }
    },
    isAFK: {
        get: function () {
            return API.STATUS.AFK === API.getUser().status
        },
    },
    chatSoundTrigger: {
        get: function () {
            var sounds = parseInt(localStorage["chat-sounds"]);
            if (isNaN(sounds)) {
                sounds = 1; // defaults to mentions
                localStorage["chat-sounds"] = sounds;
            }
            return sounds;
        },
        set: function (val) {
            localStorage["chat-sounds"] = val;
        }
    }
});

App.prototype.registerCommands= function (cmds) {
    var self = this;
    cmds.forEach(function (cmd) {
        self.commands[cmd.name] = cmd;
    });
}

App.prototype.addHooks = function () {
    API.on(API.CHAT_COMMAND, this.onChatCommand, this);
    API.on(API.DJ_ADVANCE, this.onDJAdvance, this);
    API.on(API.CURATE_UPDATE, this.onCurateUpdate, this);
    API.on(API.CHAT, this.onChat, this);
}

App.prototype.onChat = function (data) {
    if (!data) return;
    // skip our own chats
    if (this.user && data && (data.fromID === this.user.id)) return;
    // skip if we're not making sounds on any chats
    if (!this.chatSoundTrigger) return;
    // skip if we're filtering only mentions and isn't a mention
    if (!this.isMention(data.message) && (this.chatSoundTrigger === 1)) return;

    window.postMessage({
        action: 'sound',
        clip: 'chat'
    }, "http://plug.dj");
}

App.prototype.onCurateUpdate = function (data) {
    console.log(arguments);
    API.chatLog(data.user.username + " grabbed \"" + API.getMedia().title + "\"!");
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

        if (this.autoWootEnabled) {
            this.clickWoot();
        };
    }
}

App.prototype.autoWoot = function (cmd, args) {
    if (args.length === 1) {
        if (parseInt(args[0]) === 1) {
            this.autoWootEnabled = true;
            this.clickWoot();
        } else {
            this.autoWootEnabled = false;
        }
    }
    API.chatLog("AutoWoot: " + (this.autoWootEnabled ? "enabled" : "disabled"));
}

// RM -- TODO: handle the case where we've got an existing /leaveafter and we want to go AFK
App.prototype.brb  = function (cmd, args) {
    if (args.length === 1)
    {
        if (parseInt(args[0]) === 1)
        {
            if (this.isAFK) {
                API.chatLog("Already AFK");
            } else {
                API.chatLog("Going AFK");
                API.sendChat("/em Going AFK...");

                // RM: Doesn't make sense to /leaveafter unless we're playing somthing.
                // Should we also /leaveafter if we're just in the queue?
                // For now, maybe just leave the queue if we're queued but not actively playing?
                if (this.isCurrentDJ) {
                    this.leaveafter();
                } else if (this.isQueued) {
                    API.djLeave();
                }

                this.savedAutoWoot = this.autoWootEnabled;
                this.autoWootEnabled = false;
                API.setStatus(API.STATUS.AFK);
            }
        }
        else
        {
            // RM: Should we do something if you're not already
            // AFK and request to be not AFK? Maybe say you're
            // already not AFK?  That seems strange though...
            if (this.isAFK) {
                API.chatLog("Returning from AFK");
                API.sendChat("/em Back from AFK.");
                this.autoWootEnabled = this.savedAutoWoot;
                API.setStatus(API.STATUS.AVAILABLE);

                // Make sure we woot when coming out
                // if autowoot was enabled
                if (this.autoWootEnabled) {
                    this.clickWoot();
                }
            }
        }
    }
    else
    {
        API.chatLog("AFK: " + (this.isAFK ? "enabled" : "disabled"));
    }
}

App.prototype.checkLeave = function () {
    if (this.leaveAfterCount === 0) {
        this.leaveAfterCount = null;
        this.removeCheckLeaveListeners();
        API.djLeave();
    }
    this.updateLeaveAfterCount();
}
App.prototype.updateLeaveAfterCount = function() {
    if (this.isCurrentDJ) {
        if (this.leaveAfterCount) {
            this.leaveAfterCount--;
            this.showLeaveAfterCount();
        }
    }
}
App.prototype.checkUpdateForLeave = function () {
    if (!this.isQueued && !this.isCurrentDJ) {
        API.chatLog("Canceling leaveafter");
        this.leaveAfterCount = null;
        this.removeCheckLeaveListeners();
    }
}
App.prototype.showLeaveAfterCount = function () {
    if (this.leaveAfterCount) {
        API.chatLog("Leaving after " + this.leaveAfterCount + " more track(s).");
    } else if (this.leaveAfterCount === 0) {
        API.chatLog("Leaving after this track.");
    } else {
        API.chatLog("leaveafter not enabled");
    }
}
App.prototype.leaveafter = function (cmd, args) { 
    // lets us call this.leaveafter() without any worries
    if (!args) args = [];

    if (args.length === 1) {
        var leaveAfterArg = args[0];
        var leaveAfterCount = parseInt(leaveAfterArg);

        if (!isNaN(leaveAfterCount) && (leaveAfterCount >= 0)) {
            this.leaveAfterCount = leaveAfterCount;
            this.addCheckLeaveListeners();

            // RM: don't want to print a message twice...
            if (!this.isCurrentDJ) {
                this.showLeaveAfterCount();
            } else {
                this.updateLeaveAfterCount();
            }
        } else if (leaveAfterArg == "?") {
            this.showLeaveAfterCount();
        } else if ((!isNaN(leaveAfterCount) && (leaveAfterCount === -1))
                   || leaveAfterArg == "cancel") {
            this.leaveAfterCount = null;
            this.removeCheckLeaveListeners();
            API.chatLog("leaveafter cancelled.")
        } else {
            API.chatLog("Invalid argument: " + leaveAfterArg, true);
        }
    } else if (args.length === 0) {
        this.leaveAfterCount = 1;
        this.addCheckLeaveListeners();

        // RM: don't want to print a message twice...
        if (!this.isCurrentDJ) {
            this.showLeaveAfterCount();
        } else {
            this.updateLeaveAfterCount();
        }
    }
}

App.prototype.addCheckLeaveListeners = function() {
    if (!this.leaveListenersAdded) {
        this.leaveListenersAdded = true;
        API.on(API.DJ_ADVANCE, this.checkLeave, this);
        API.on(API.WAIT_LIST_UPDATE, this.checkUpdateForLeave, this);
    }
}

App.prototype.removeCheckLeaveListeners = function() {
    API.off(API.DJ_ADVANCE, this.checkLeave);
    API.off(API.WAIT_LIST_UPDATE, this.checkUpdateForLeave);
    this.leaveListenersAdded = false;
}

App.prototype.clickWoot = function() {
    $("#woot").click();
}

App.prototype.isMention = function (msg) {
    if (!msg) return false;

    // RM -- NOTE: we're treating any occurance of names as a mention.
    // This makes it so you still get mentions even if the chat message
    // is missing the @ symbol before your name.
    // This _will_ generate false positives if your name is something common
    // like "sandwich" or "song".
    // TODO: make the presence of @ being required a configurable option
    return msg.indexOf(this.user.username) >= 0;
}

App.prototype.chatsound = function (cmd, args) {
    if (args.length === 1) {
        var strval = args[0];
        var intval = parseInt(args[0]);
        if ((intval === 0) || (strval === 'none')) {
            this.chatSoundTrigger = 0;
        } else if ((intval === 1) || (strval === 'mention') || (strval === 'mentions')) {
            this.chatSoundTrigger = 1;
        } else if ((intval === 2) || (strval === 'all')) {
            this.chatSoundTrigger = 2;
        }
    }

    var trigger;
    switch (this.chatSoundTrigger) {
        case 0:
            trigger = "none";
            break;
        case 1:
            trigger = "mention";
            break;
        case 2:
            trigger = "all";
            break;
    }
    API.chatLog("chatsounds: " + trigger);
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
        // RM: this interval does bad things with two of this plugin loaded...
        //     I'm just making sure here that we don't accidently create two
        //     app objects which leads to all kinds of problems.
        if (!app) {
            app = new App();
            console.log("plug.dj script loaded");
        } else {
            console.log("interval running again for some reason");
        }
    }
}, 1000);
