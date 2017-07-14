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
    var weekdays = _.reduce($('#weekday input[type="checkbox"]:checked'), function(memo, e) {
        return memo.concat(parseInt($(e).val()))
    }, []);
    var dayperiod = $('#dayperiod').val();
    var ghspan = $('#ghspan').val();
    console.log(weekdays);
    chrome.storage.sync.set({
        phonenumber: phone,
        password: pass,
        keywords: keywords,
        doctor: $('#doctor').val(),
        doctitle: $('#doctitle').val(),
        patient: $('#patient').val(),
        cardno: $('#cardno').val(),
        ghinterval: $('#ghinterval').val(),
        weekdays: weekdays.join(','),
        ghspan: parseInt(ghspan),
        dayperiod: parseInt(dayperiod),
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
        doctor: '',
        doctitle: '',
        patient: '',
        cardno: '',
        ghinterval: 7,
        dayperiod: 0,
        ghspan: 500,
        weekdays: '0,1,2,3,4,5,6',
    }, function(items) {
        $('#cellphone').val(items.phonenumber);
        $('#password').val(items.password);
        $('#doctor').val(items.doctor);
        $('#patient').val(items.patient);
        $('#keywords').importTags(items.keywords);
        $('#doctitle').importTags(items.doctitle);
        $('#cardno').val(items.cardno);
        $('#ghinterval').val(items.ghinterval);
        $('#dayperiod').val(items.dayperiod);
        $('#ghspan').val(items.ghspan);
        $('#weekday input[type="checkbox"]').each(function(index, e) {
            if (items.weekdays.indexOf($(e).val()) >= 0) {
                $(e).prop('checked', true);
            }
        });
    });
}
$(function() {
    $('#keywords').tagsInput({
        'width': $('#keywords').width(),
    });
    $('#doctitle').tagsInput({
        'width': $('#doctitle').width(),
    })
    restore_options();
    $('#save').click(function(e) {
        save_options();
    });
    $('#dayall').click(function() {
        var txt = $(this).val();
        var checked = !(txt == "反选");
        $('#weekday input[type="checkbox"]').prop('checked', checked);
        if (!checked) {
            $(this).val('全选');
        } else {
            $(this).val('反选');
        }
    });

});
