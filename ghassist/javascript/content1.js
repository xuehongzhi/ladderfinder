$(function() {

    function buildDay() {
		var pad = "00";
	for (var i=1; i<=31; ++i){
        	var option = new Option(i+'日',	pad.substring(0, pad.length - i.toString().length) + i );
                $('#sel_day').append($(option));         
	}
    }
    buildDay();
    chrome.storage.sync.get({
        patient: '',
        cardno:'',
    }, function(items) {
        var span = 60;
        var tid = null;

        $('#btnSendCodeOrder').parent().append($('#btnSendCodeOrder').clone().attr('id', 'mySendCodeOrder'));
        $('#btnSendCodeOrder').hide();
        $('#mySendCodeOrder').on('click',
            function(e) {
                var obj = $(this);
                obj.attr("disabled", true);
                $.ajax({
                    type: "POST",
                    url: '/v/sendorder.htm',
                    data: $('#rg_nrfromOrder').serialize(),
                    dataType: "json",
                    success: function(a) {
                        span = 60;
                        if (a.code == "200") {
                            obj.val("可在" + span + "秒后重发");
                            tid = setInterval(function() {
                                span -= 1;
                                if (span == 0) {
                                    clearInterval(tid);
                                    obj.attr("disabled", false);
                                    obj.val("获取验证码");
                                } else {
                                    obj.val("可在" + span + "秒后重发");

                                }
                            }, 1000);
                        } else {
                            obj.attr("disabled", false);
                        }
                    },
                    error: function() {
                        obj.attr("disabled", false);
                    }
                });
            })
    //.trigger('click');

        var gher = $(".Rese_db_dl p:contains('" + items.patient + "') input");
	gher.attr('checked', 'checked');
        
	$('#Rese_db_dl_ybk').val(items.cardno);
	$('#Rese_db_dl_hrxm_ek').val(items.patient);
	var identity = gher.parent().text().split('|')[1].trim(); 
	$('#Rese_db_dl_hrzjh_ek').val(identity);
        $('#Rese_db_dl_idselect').val(1);
	$('#sel_year').val(identity.slice(6,10));
	$('#sel_month').val(1);
	$('#sel_month').val(identity.slice(10,12)).on('change',function(e){
	var day = identity.slice(12,14);
	$('#sel_day').val(day);
	//e.preventDefault();
	}).trigger('change');
	var sex = parseInt(identity.slice(-2,-1));
	if(sex%2==0){
	$('a.ek_nv').addClass('ek_bgcolor2');
	}else{
	$('a.ek_nan').addClass('ek_bgcolor2');
	}
        setInterval(function() {
            var code = $('#Rese_db_dl_dxyzid').val()
            if (code.length == 6) {
                console.log('submit');
                $('#Rese_db_qryy_btn').trigger('click');
            }
        }, 10);

        chrome.extension.onMessage.addListener(function(details, sender, sendResponse) {
            $('#Rese_db_dl_dxyzid').val(details.code);
        });
    });

});
