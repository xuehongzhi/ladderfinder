 chrome.storage.sync.get({
     phonenumber: '110',
     password: '',
     keywords: '',
     doctor: '',
     doctitle: '',
     ghenable: false,
     ghinterval: 7,
     dayperiod: 0,
     ghspan: 500,
     weekdays: '0,1,2,3,4,5,6'
 }, function(items) {
     chrome.extension.sendMessage({
         action: 'refreshicon',
         enable: items.ghenable
     });

     var curdate = Date.now();
     var ghdate = new Date(curdate.valueOf() + items.ghinterval * 24 * 3600 * 1000);
     ghdate = ghdate.getFullYear() + '-' + (ghdate.getMonth() + 1) + '-' + ghdate.getDate();
     //ghdate = '2016-09-22';
     console.log(ghdate);
     var rpath = window.location.href;
     rpath = rpath.slice(rpath.lastIndexOf('/') + 1, rpath.lastIndexOf('?')).split('-');
     var hpid = parseInt(rpath[0]);
     var depid = parseInt(rpath[1]);
     var keyword = [];
     if (!$.isEmptyObject(items.keywords)) {
         keyword = items.keywords.split(',');
     }
     var title = [];
     if (!$.isEmptyObject(items.doctitle)) {
         title = items.doctitle.split(',');
     }

     chrome.runtime.onMessage.addListener(function(message, sender, response) {
         items.ghenable = !!message.enable;
         response({
             enable: "ok"
         });
     });


     var fakeips = ['122.122.122.1', '122.122.121.1']
     var chcktime = $('#ksorder_time .ksorder_cen_r_top ul li:first').clone().children().remove().end().text();
     chcktime = chcktime.slice(2, -2).split(':');
     chcktime = _.map(chcktime, function(e) {
         return parseInt(e)
     });

     console.log(chcktime);
     var timerid = null;
     var refreshspan = 10000;
     var ghspan = items.ghspan;

     var find = false;
     var logined = false;
     var matched = function() {
         curdate = new Date(Date.now());
         var d1 = new Date(curdate.getFullYear(), curdate.getMonth(), curdate.getDate(), chcktime[0], chcktime[1]);
         var ghdate = new Date(curdate.valueOf() + 7 * 24 * 3600 * 1000);
         ghdate = ghdate.getFullYear() + '-' + (ghdate.getMonth() + 1) + '-' + ghdate.getDate();

         if ([6, 7].indexOf(curdate.getDay()) < 0 && curdate.valueOf() - d1.valueOf() <= 1000 * 60 && curdate.valueOf() - d1.valueOf() > 0) {
             find = true;
         } else {
             find = false;
         }
         return find;

     }

     if ($('.grdbnav_context_right').children('a[href$="logout.htm"]').length > 0) {
         logined = true;
     }


     var simulateLogin = function(timelist) {

         var password1 = items.password;
         var yzm1 = $("#yzmQuickLogin").val();
         $.ajax({
             type: "post",
             url: "/quicklogin.htm",
             data: {
                 mobileNo: items.phonenumber,
                 password: password1,
                 yzm: yzm1,
                 isAjax: true
             },
             dataType: "json",
             success: function(response) {
                 if (!response.hasError) {
                     $.ajax({
                         type: "post",
                         url: "/islogin.htm",
                         dataType: "json",
                         data: {
                             isAjax: true
                         },
                         success: function(a) {
                             if (a.code * 1 == 200) {
                                 logined = true;
                                 doCheckin(timelist);
                             }
                         }
                     });
                 }
             }
         });

     }

     var doCheckin = function(timelist, ip) {
         if (timelist.length == 0) {
             timerid = setTimeout(doaction, ghspan);
             return;
         }
         if (ip) {
             var ipseg = fakeips[0].split('.');
             ipseg[3]++;
             fakeips[0] = ipseg.join('.');
             //$.ajaxSetup({
             //    headers: {
             //        'x-forwarded-for': ip
             //    }
             //});
         }
         $.ajax({
             type: "POST",
             dataType: "json",
             url: "/dpt/partduty.htm",
             data: {
                 hospitalId: hpid,
                 departmentId: depid,
                 dutyCode: timelist[0].dutyCode,
                 dutyDate: timelist[0].dutyDate,
                 isAjax: !0
             },
             error: function(e) {
                 doCheckin(timelist.slice(1));
             },
             success: function(a) {
                 var getUrl = function(item) {
                     return '/order/confirm/' + item.hospitalId + '-' + item.departmentId + '-' + item.doctorId + '-' + item.dutySourceId + '.htm';
                 }

                 if (a.hasError && a.code == 2009) {
                     if (!logined) {
                         simulateLogin(timelist);
                     } else {
                         doCheckin(timelist);
                     }
                 } else if (!a.hasError) {
                     a = a.data;
                     a = _.groupBy(_.filter(a, function(e) {
                         var i = e.skill ? _.findIndex(keyword, function(k) {
                             return e.skill.indexOf(k) >= 0
                         }) : -1;
                         if ($.isEmptyObject(keyword)) {
                             i = 0;
                         }
                         return e.remainAvailableNumber != 0 && e.totalFee <= 300 && i >= 0;
                     }), function(e) {
                         return e.doctorTitleName;
                     });
                     var key = _.find(_.keys(a), function(k) {
                         if ($.isEmptyObject(title)) {
                             return true;
                         }
                         return _.findIndex(title, function(t) {
                             return k.indexOf(t) >= 0;
                         }) >= 0;
                     });
                     if (key && !find) {
                         var addr = $('<a href="' + getUrl(a[key][0]) + '" target="_newtab"></a>').appendTo('.ksorder_djgh_dr1').on('click', function() {
                             return true;
                         });
                         var sp = $('<span>').appendTo(addr).on('click', function() {
                             return true;
                         });
                         setTimeout(function() {
                             sp.trigger('click');
                         }, 1000);


                         //chrome.extension.sendMessage({
                         //    action: 'newtab',
                         //    url: getUrl(a[key][0])
                         //});
                         find = true;
                     } else {
                         find = false;
                         doCheckin(timelist.slice(1));
                     }
                 }
             }
         });
     }


     function doaction() {
         if (!items.ghenable) {
             return;
         }
         if (matched()) {
             var duties = [];
             if (items.dayperiod > 0) {
                 duties.push({
                     dutyDate: ghdate,
                     dutyCode: items.dayperiod
                 });
             } else {
                 duties.push({
                     dutyDate: ghdate,
                     dutyCode: 1
                 });
                 duties.push({
                     dutyDate: ghdate,
                     dutyCode: 2
                 });
             }
             console.log('开启定时挂号模式');
             doCheckin(duties);
         } else {
             console.log('开启实时挂号模式');
             var elems = $('.ksorder_kyy');
             var tmspan = new Date($('th[scope="col"]:first p').text()).getDay();
             elems = _.reduce(elems, function(memo, e) {
                 var idx = $(e).index() + tmspan;
                 idx = idx % 7;
                 if (items.weekdays.indexOf(idx) >= 0) {
                     var ddate = $(e).children('input').val().split('_');
                     ddate = ddate[ddate.length - 1];
                     return memo.concat({
                         dutyDate: ddate,
                         dutyCode: $(e).parent().index()
                     });
                 } else {
                     return memo;
                 }
             }, []);
             if (items.dayperiod > 0) {
                 elems = _.filter(elems, function(e) {
                     return e.dutyCode == items.dayperiod;
                 });
             }
             doCheckin(elems, fakeips[0]);
         }
         // fakeips = fakeips.slice(1);
     }

     timerid = setTimeout(doaction, ghspan);
     setInterval(function() {
         if (items.ghenable && !find) {
             clearTimeout(timerid);
             chrome.extension.sendMessage({
                 action: 'reload'
             });
         }
     }, refreshspan);
 });
