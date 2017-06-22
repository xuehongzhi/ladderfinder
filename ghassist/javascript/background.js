chrome.storage.sync.get({
        ghenable: false,
    },
    function(items) {
        current = +items.ghenable;

        function updateIcon(tabid) {
	    chrome.storage.sync.set({
                 ghenable: !!current
	    });

            chrome.browserAction.setIcon({
                path: "../images/nurse_16_" + current + ".png",
                tabId: tabid
            });
            current++;
            if (current > 1)
                current = 0;
        }

        chrome.browserAction.onClicked.addListener(function(tab) {
            chrome.tabs.sendMessage(tab.id, {
                'enable': !!current
            }, function(response) {
                if (response && response.enable == "ok") {
                    updateIcon(tab.id);
                }
            });
        });


        var myAudio = new Audio(); // create the audio object
        myAudio.src = "../audio/4.wav"; // assign the audio file to it
        var tabid = null;
        chrome.extension.onMessage.addListener(function(details, sender, sendResponse) {
            if (details.action == 'newtab') {
                chrome.tabs.create({
                    url: details.url
                }, function(tab) {
                    tabid = tab.id;
                });
                myAudio.play();

                sendResponse({
                    status: 'ok'
                });
            } else if (details.action == 'refreshicon') {
		   current = (+details.enable);
		   updateIcon(sender.tab.id);
            }else if (details.action == 'reload') {
                chrome.tabs.reload(sender.tab.id, {
                    bypassCache: true
                }, function() {});
            } else if (details.action == 'getcode') {
                chrome.tabs.sendMessage(tabid, {
                    code: details.code
                });
            }

        });

    });
