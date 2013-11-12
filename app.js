(function init() {
    function hook() {
        var wootInterval;

        function autoWoot() {
            localStorage["auto-woot"] = true;
            if (!wootInterval) {
                wootInterval = setInterval(function () {
                    $("#woot").click();
                }, 10000);
            }
        }

        function disableAutoWoot() {
            localStorage["auto-woot"] = false;
            clearInterval(wootInterval);
            wootInterval = false;
        }

        function autoWootEnabled() {
            return localStorage["auto-woot"] === "true";
        }

        API.on(API.CHAT_COMMAND, function (command) {
            if (command === "/?") {
                API.chatLog("Commands:");
                API.chatLog("/? -- This");
                API.chatLog("/autowoot [1|0] -- get/set autowoot");
            } else if (command.indexOf("/autowoot") == 0) {
                var split = command.split(" ");
                if (split.length === 2) {
                    if (parseInt(split[1]) === 1) {
                        autoWoot();
                    } else {
                        disableAutoWoot();
                    }
                }
                API.chatLog("AutoWoot: " + (autoWootEnabled() ? "enabled" : "disabled"));
                
            }
        });

        if (autoWootEnabled()) {
            autoWoot();
        }

        console.log("plug.dj script loaded");
    }

    var apiInterval = setInterval(function () {
        if (typeof(API) !== "undefined") {
            clearInterval(apiInterval);
            hook();
        }
    }, 1000);
})();
