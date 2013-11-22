
var crypto = require('crypto');

function getCanonicalizedOssHeaders(headers) {
	var tmp_headers = {};
	var canonicalized_oss_headers = '';

	for (var k in headers) {
		if (k.toLowerCase().indexOf('x-oss-', 0) === 0) {
			tmp_headers[k.toLowerCase()] = headers[k];
		}
	}

	if (tmp_headers != {}) {
		var x_header_list = [];
		for (var k in tmp_headers) {
			x_header_list.push(k);
		}
		x_header_list.sort();
		
		for (var k in x_header_list) {
			canonicalized_oss_headers += x_header_list[k] + ':' + tmp_headers[x_header_list[k]] + '\n';
		}
	}
	
	return canonicalized_oss_headers;
}

exports.signHeader = function(access_key, method, resource, headers) {
	var content_md5 = headers['Content-Md5'] || '';
	var content_type = headers['Content-Type'] || '';
	var date = headers['Date'] || new Date().toUTCString();
	var canonicalized_oss_headers = getCanonicalizedOssHeaders(headers);
	var canonicalized_resource = resource;
	
	var hmac = crypto.createHmac('sha1', access_key);
	var data = method + '\n' + content_md5 + '\n' + content_type + '\n' + date + '\n' + canonicalized_oss_headers + canonicalized_resource;
	// fix bug of chinese key name.
	//hmac.update(data);
	hmac.update(data, 'utf8'); 
	return hmac.digest('base64');
}

exports.signUrl = function(access_key, method, resource, headers, date) {
	var content_md5 = headers['Content-Md5'] || '';
	var content_type = headers['Content-Type'] || '';
	var canonicalized_oss_headers = getCanonicalizedOssHeaders(headers);
	var canonicalized_resource = resource;
	
	var hmac = crypto.createHmac('sha1', access_key);
	var data = method + '\n' + content_md5 + '\n' + content_type + '\n' + (Math.ceil(date.getTime() / 1000)) + '\n' + canonicalized_oss_headers + canonicalized_resource;
	// fix bug of chinese key name.
	//hmac.update(data);
	hmac.update(data, 'utf8'); 
	return hmac.digest('base64');
}

function element2object(element) {
	var obj = {};

	if (element.len()) {
		for (var i = 0; i < element.len(); ++i) {
			var subelement = element.getItem(i);
			var key = subelement.tag;
			var value = element2object(subelement);

			if (typeof(obj[key]) === 'undefined') {
				obj[key] = value;
			} else {
				if (typeof(obj[key].length) === 'undefined') {
					var old = obj[key];
					obj[key] = []; 
					obj[key].push(old);
				}
				obj[key].push(value);
			}
		}
	} else {
		obj = element.text;
	}
	
	return obj;
}

exports.xml2object = element2object;
