chrome.extension.onMessage.addListener(function (request, sender) {
    if (request.action === "notify") {
        var notification = webkitNotifications.createNotification(
            "http://plug.dj/_/static/images/favicon.6de70c7.png",
            "plug.dj",
            request.message
        );
        notification.show();
        setTimeout(function () {
            notification.cancel();
        }, 5000);
    }
});
