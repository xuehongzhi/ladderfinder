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
var config = ini.parse(fs.readFileSync('./config.ini').toString());
var dayinterval = parseInt(config.mailbox.dayinterval)
var ghdate = new Date(curdate.valueOf() - dayinterval * 24 * 3600 * 1000);
ghdate = ghdate.getFullYear() + '-' + (ghdate.getMonth() + 1) + '-' + ghdate.getDate();
console.log(ghdate);
var countries = config.vpngate.countries.split(',');
console.log(countries)
var confpath = config.openvpn.confpath;
var logpath = config.openvpn.logpath;
var bindip = config.openvpn.bindip.trim();
var addlog = parseInt(config.openvpn.addlog);

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
            if (bindip) {
                data = data.replace(/nobind/g, 'local ' + bindip);
            }
            if (addlog != 0) {
                data = data + 'log ' + logpath + '\n';
            }
            fs.writeFileSync(fpath, data);
        });
    });
}


var candownload = function(cells) {
    var country = cells.eq(0).text().toLowerCase();
    if (_.findIndex(countries, function(e) {
            return country.indexOf(e) >= 0;
        }) < 0) {
        return false;
    }

    var days = cells.eq(2).find('span').last().text();
    if (days.indexOf('days') < 0) {
        return;
    }
    days = parseInt(days);
    if (days < 2 || days > 30) {
        return false;
    }

    var session = parseInt(cells.eq(2).find('span').first().text());
    if (session < 1 || session > 50) {
        return false;
    }

    var stream = parseFloat(cells.eq(3).find('span').first().text());
    if (stream < 10 || stream > 100) {
        return false;
    }

    if (cells.eq(6).text().toLowerCase().indexOf('udp') < 0) {
        return false;
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
                if (!candownload(cells)) {
                    return;
                }
                var ip = cells.eq(1).find('span').first().text();
                var downparam = geturl(url, cells.eq(6).children('a').attr('href'), ip);
                console.log(downparam[0]);
                download(downparam[0], path.join(confpath, downparam[1]));
            })

        });
    }).on('error', function(err) {
        console.error(url + ' open failed ' + err);
    });
}


function openInbox(cb) {
    imap.openBox('INBOX', true, cb);
}


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

removeUnconnected(logpath, confpath);
imap.connect();
