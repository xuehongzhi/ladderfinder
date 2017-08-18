var fs = require('fs');
var Imap = require('imap'),
    inspect = require('util').inspect;
var path = require('path');
var _ = require('underscore');
var http = require('follow-redirects').http;
var urlfunc = require('url');

var ini = require('ini');

var cheerio = require('cheerio');
var curdate = Date.now();
http.maxRedirects = 3;
var connected = 0;
var rasphone = ini.parse(fs.readFileSync(path.join(process.env.APPDATA, 'Microsoft/network/Connections/Pbk/rasphone.pbk')).toString());
var config = ini.parse(fs.readFileSync('./config.ini').toString());
var dayinterval = parseInt(config.mailbox.dayinterval)
var ghdate = new Date(curdate.valueOf() - dayinterval * 24 * 3600 * 1000);
ghdate = ghdate.getFullYear() + '-' + (ghdate.getMonth() + 1) + '-' + ghdate.getDate();
console.log(ghdate);
var vpnconfig = {}

_.each(config.vpngate.type.split(','), function(k) {
    vpnconfig[k] = function(vpntype) {
        var ras = {};
        for (var conf in config[vpntype]) {
            ras[conf] = config[vpntype][conf];
        }
        return ras;
    }(k);
});


var createImap = function() {
    var mailsettings = config.mailbox;
    return new Imap({
        user: mailsettings.user + '@' + mailsettings.domain,
        password: mailsettings.password,
        host: mailsettings.host,
        port: parseInt(mailsettings.port),
        tls: mailsettings.tls == '1' ? true : false
    });
}

var removeUnconnected = function(logpath, confpath) {
    fs.readdir(logpath, function(err, files) {
        if (err) {
            return;
        }

        files.forEach(function(elt, i, arr) {
            fs.readFile(path.join(logpath, arr[i]), function(err, data) {
                if (err) return;
                data = data.toString().toLowerCase();
                if (data.indexOf('initialization sequence completed') < 0 && path.extname(arr[i]).indexOf('.log') >= 0) {
                    var vfile = path.join(confpath, path.basename(arr[i]).replace(path.extname(arr[i]), '') + '.ovpn');
                    fs.exists(vfile, function(exists) {
                        if (exists) {
                            console.log(vfile);
                            fs.unlink(vfile);
                        }
                    });

                }
            });
        });
    });
}

var imap = createImap();


var download = function(url, fpath) {
    var req = http.get(url, function(res) {
        var data = "";
        res.on('data', function(chunk) {
            data += chunk.toString('utf8');
        })

        res.on('end', function() {
            if (vpnconfig.openvpn.bindip) {
                data = data.replace(/nobind/g, 'local ' + bindip);
            }
            if (vpnconfig.openvpn.addlog != 0) {
                data = data + 'log ' + logpath + '\n';
            }
            fs.writeFileSync(fpath, data);
        });
    });
}


var candownload = function(vpn, cells) {
    var countries = [];
    if (vpn.countries.length > 0) {
        countries.concat(vpn.countries.split(','));
    }
    var country = cells.eq(0).text().toLowerCase();
    if (countries.length > 0 && _.findIndex(countries, function(e) {
            return country.indexOf(e) >= 0;
        }) < 0) {
        return false;
    }

    var days = cells.eq(2).find('span').last().text();
    if (days.indexOf('days') < 0) {
        return;
    }

    if (vpn.days.trim().length <= 0) {
        dr = vpn.days.split(',');
        days = parseInt(days);
        if (days < dr[0] || days > dr[1]) {
            return false;
        }
    }

    var session = parseInt(cells.eq(2).find('span').first().text());
    if (vpn.session.trim().length <= 0) {
        sr = vpn.session.split(',');
        if (session < sr[0] || session > sr[1]) {
            return false;
        }
    }

    var stream = parseFloat(cells.eq(3).find('span').first().text());
    if (vpn.stream.trim().length <= 0) {
        ssr = vpn.stream.split(',');
        if (stream < ssr[0] || stream > ssr[1]) {
            return false;
        }
    }

    return true;
}

var geturl = function(baseurl, relurl, ip) {
    url = relurl.substr(relurl.indexOf('?') + 1).toLowerCase();
    url = url.replace('udp', 'port').replace('ip', 'host');
    var port = 1195

    param = _.filter(url.split('&'), function(e) {
        if (e.indexOf('port') >= 0) {

            port = parseInt(e.replace('port=', ''));
            return true;
        }
        return e.indexOf('tcp') < 0 && e.indexOf('fqdn') < 0;
    })

    var fname = 'vpngate_' + ip + '_udp_' + port + '.ovpn';
    param.push('/' + fname);
    return [baseurl + 'common/openvpn_download.aspx?' + param.join('&'), fname];
}

var getopenvpn = function(url, cells, ip) {
    if (cells.eq(6).text().toLowerCase().indexOf('udp') < 0) {
        return;
    }
    var downparam = geturl(url, cells.eq(6).children('a').attr('href'), ip);
    console.log(downparam[0]);
    download(downparam[0], path.join(config.openvpn.confpath, downparam[1]));
}

function uuidv4() {
    return 'xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0,
            v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

var getl2tp = function(url, cells, ip) {
    if (cells.eq(5).text().toLowerCase().trim() == 0) {
        return;
    }
    config.l2tp.config.Guid = uuidv4();
    config.l2tp.config.PhoneNumber = ip;
    var ras = {};
    for (var conf in config.l2tp.config) {
        ras[conf] = config.l2tp.config[conf];
    }
    if(!rasphone.hasOwnProperty(ip)){
	    rasphone[ip] = ras;
    }
}

function connect(url) {
    console.log(url);
    var req = http.get(url, function(res) {
        var data = "";
        res.on('data', function(chunk) {
            data += chunk.toString('utf8');
        });
        res.on('end', function() {
            console.log(res.responseUrl + ' end');
            data = data.replace(/\(Quality\)<\/td>/g, '(Quality)');
            var $ = cheerio.load(data, {
                ignoreWhitespace: true,
            });
            $('#vg_hosts_table_id').last().children('tr').has('.vg_table_row_1').each(function() {
                var cells = $(this).children('td');
                var ip = cells.eq(1).find('span').first().text();
                for (var conf in vpnconfig) {
                    if (!candownload(vpnconfig[conf], cells)) {
                        return;
                    }
                    eval('get' + conf)(url, cells, ip);
                }
            })

        });
    }).on('error', function(err) {
        console.error(url + ' open failed ' + err);
    });
}


function openInbox(cb) {
    imap.openBox('INBOX', true, cb);
}

setTimeout(function() {
    console.log(rasphone);
    fs.writeFileSync(path.join(process.env.APPDATA, 'Microsoft/network/Connections/Pbk/rasphone.pbk'), ini.stringify(rasphone));
    process.exit(0);
}, 20000);

imap.once('ready', function() {
    openInbox(function(err, box) {
        if (err) throw err;
        imap.search([
            ['SINCE', ghdate]
        ], function(err, results) {
            if (err) throw err;
            if (!results || results.length == 0) throw 'no result';
            var f = imap.fetch(results, {
                bodies: ['HEADER.FIELDS (SUBJECT)', 'TEXT'],
            });
            f.on('message', function(msg, seqno) {
                var prefix = '(#' + seqno + ') ';
                var header = '';
                msg.on('body', function(stream, info) {
                    var buffer = '',
                        count = 0;

                    stream.on('data', function(chunk) {
                        count += chunk.length;
                        if (info.which === 'TEXT') {
                            buffer += chunk.toString('utf8');
                        } else {
                            header += chunk.toString('utf8');
                        }
                    });

                    stream.once('end', function() {
                        if (info.which === 'TEXT') {
                            if (header.indexOf('VPN') >= 0) {
                                fs.appendFileSync(seqno + '-body.txt', buffer);
                            }
                        }
                    });

                });
                msg.once('end', function() {});
            });
            f.once('error', function(err) {
                console.log('Fetch error: ' + err);
            });
            f.once('end', function() {
                console.log('Done fetching all messages!');

                connect('http://www.vpngate.net/');

                files = _.filter(fs.readdirSync('.'), function(f) {
                    return f.indexOf('txt') > 0;
                });
                maxf = _.max(files, function(f) {
                    return parseInt(f)
                });
                console.log('get vpngate address from file ' + maxf);
                var lineReader = require('readline').createInterface({
                    terminal: false,
                    input: fs.createReadStream(maxf)
                });

                lineReader.on('line', function(line) {
                    line.trim();
                    var reg = /[\d]+\. (http:\/\/.+\/).*/g;
                    var matches = reg.exec(line);
                    if (matches) {
                        connect(matches[1]);
                    }
                });
                lineReader.on('close', function() {
                    _.map(files, function(f) {
                        fs.unlink(f);
                    });
                });
                imap.end();
            });
        });
    });
});



imap.once('error', function(err) {
    console.error(err);
});

removeUnconnected(config.openvpn.logpath, config.openvpn.confpath);
imap.connect();
