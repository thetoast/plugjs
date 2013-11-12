$(document).on("ready", function () {
    if (window.plugDJLoaded) return;

    window.plugDJLoaded = true;

    var roomInterval = setInterval(function () {
        if ($("#audience").length) {
            clearInterval(roomInterval);
            $.getScript(chrome.extension.getURL("app.js")).done(function () {
                console.log("plugdj script injected");
            }).fail(function () {
                console.log("could not inject plugdj script");
            });
        }
    }, 1000);
});
