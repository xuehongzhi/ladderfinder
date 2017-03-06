$(function() {
            
            var tid = setInterval(function() {
                 $('div.dataPanel .container .x-unread').each(function(index) {
                    var sms = $(this).find('.item .snippet span').text();
                    if (sms.indexOf('北京市预约挂号统一平台') >= 0) {
                        var bi = sms.lastIndexOf('【');
                        var ei = sms.lastIndexOf('】');
                        if (bi >= 0 && ei > bi) {
                            var code = sms.slice(bi + 1, ei);
                            console.log(code);
                            chrome.extension.sendMessage({
                                'action': 'getcode',
                                'code': code
                            });
                            return false;
                        }
                    }
            });
                }, 1000);
});
