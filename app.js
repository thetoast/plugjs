(function init() {
    function hook() {
        API.on(API.CHAT_COMMAND, function (command) {
            console.log(command);
            if (command === "/?") {
                API.chatLog("Commands:\n/? -- This");
            }
        });
    }

    var apiInterval = setInterval(function () {
        if (typeof(API) !== "undefined") {
            clearInterval(apiInterval);
            hook();
        }
    }, 1000);
})();
