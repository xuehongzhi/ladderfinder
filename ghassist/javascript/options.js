/**
 * Copyright (c) 2012 The Chromium Authors. All rights reserved.
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

/**
 * Sets the value of multiple calendar checkbox based on value from
 * local storage, and sets up the `save` event handler.
 */

// Saves options to chrome.storage
function save_options() {
    var phone = $('#cellphone').val();
    var pass = $('#password').val();
    var keywords = $('#keywords').val();
    var weekdays =  _.reduce($('#weekday input[type="checkbox"]:checked'), function(memo, e) {return memo.concat(parseInt($(e).val()))}, []);
   
    console.log(weekdays);
    chrome.storage.sync.set({
        phonenumber: phone,
        password: pass,
        keywords: keywords,
	doctor:$('#doctor').val(),
	doctitle:$('#doctitle').val(),
	patient:$('#patient').val(),
	cardno:$('#cardno').val(),
	weekdays: weekdays.join(','),
    }, function() {

    });
}

// Restores select box and checkbox state using the preferences
// stored in chrome.storage.
function restore_options() {
    // Use default value color = 'red' and likesColor = true.
    chrome.storage.sync.get({
        phonenumber: '110',
        password: '',
        keywords: '',
        doctor:'',
        doctitle:'',
        patient:'',
        cardno:''
    }, function(items) {
        $('#cellphone').val(items.phonenumber);
        $('#password').val(items.password);
        $('#doctor').val(items.doctor);
        $('#patient').val(items.patient);
        $('#keywords').importTags(items.keywords);
        $('#doctitle').importTags(items.doctitle);
        $('#cardno').val(items.cardno);
    });
}
$(function() {
    $('#keywords').tagsInput({'width':$('#keywords').width(),
    });
    $('#doctitle').tagsInput({'width':$('#doctitle').width(),
    })
    restore_options();
    $('#save').click(function(e) {
        save_options();
    });
    $('#dayall').click(function(){
	    var txt = $(this).val();
	    var checked = !(txt=="反选");
	    $('#weekday input[type="checkbox"]').prop('checked', checked);
	    if(!checked) {
	        $(this).val('全选');
	    } else {
		$(this).val('反选');
	    }
    });

});
