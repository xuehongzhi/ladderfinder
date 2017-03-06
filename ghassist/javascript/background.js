var urlprefix="dpt/appoint";

// Called when the user clicks on the browser action icon.
chrome.browserAction.onClicked.addListener(function(tab) {
  // We can only inject scripts to find the title on pages loaded with http
  // and https so for all other pages, we don't ask for the title.
  if (tab.url.indexOf(urlprefix) > 0 )
  {
    chrome.tabs.executeScript( null, {file: 'javascript/jquery.min.js'});
    chrome.tabs.executeScript( null, {file: 'javascript/underscore-min.js'});
    chrome.tabs.executeScript( null, {file: 'javascript/content.js'});

  }
});

     var myAudio = new Audio();        // create the audio object
	myAudio.src = "audio/4.wav"; // assign the audio file to it
	var tabid = null;
chrome.extension.onMessage.addListener(function(details, sender, sendResponse)
	{
  if(details.action=='newtab'){
     	chrome.tabs.create({url:details.url},function(tab){tabid=tab.id;});
	myAudio.play(); 

     sendResponse({status:'ok'});
  } else if(details.action=='reload'){
     chrome.tabs.reload(sender.tab.id, {bypassCache:true}, function(){
	chrome.tabs.sendMessage(sender.tab.id, {action: 'reloaded'});
     });
  }else if(details.action=='getcode'){
     chrome.tabs.sendMessage(tabid, {code:details.code});
  }

});
