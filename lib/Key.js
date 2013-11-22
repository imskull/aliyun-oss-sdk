
var EventEmitter  = require('events').EventEmitter;
var http = require('http');
var et = require('elementtree');
var XML = et.XML;
var ElementTree = et.ElementTree;
var Element = et.Element;
var util = require('./util');
var CryptoStream = require('./CryptoStream');

module.exports = Key;

function Key(bucket, name) {
	this.name = name;
	
	this._bucket = bucket;
	this._debug = bucket._connection._debug;
}

Key.prototype.getObject = function(stream, headers, validate, callback) {
	var self = this;

	var method = 'GET';
	var path = '/' + this.name;
	var resource = '/' + this._bucket.name + path;
	
	headers = headers || {};
	headers['Host'] = this._bucket.name + '.' + this._bucket._connection.host;
	headers['Date'] = new Date().toUTCString();
	headers['Authorization'] = 'OSS ' + this._bucket._connection.access_id + ':' + util.signHeader(this._bucket._connection.access_key, method, resource, headers);
	
	var req_options = { host: headers['Host'], method: method, path: path, headers: headers };

	var req = http.request(req_options, function(res) {
		var oss_chunk = '';
		var etag = '';

		if (res.statusCode === 200 || res.statusCode === 206) {
			res.pipe(stream);
			if (res.statusCode === 200 && validate) {
				var md5 = new CryptoStream('md5');
				md5.on('end', function() {
					etag = md5.digest;
				});
				
				res.pipe(md5);
			}
		} else {
			res.on('data', function(chunk) {
				oss_chunk += chunk;
			});	
		}

		res.on('end', function() {
			if(self._debug)
				console.log('\nKey.getObject res:\n', this, '\n');
			
			var err = new Error('Unknown Error');
			console.log(this.headers);
			console.log(this.statusCode);
			console.log(etag);
			if ((this.statusCode === 200) && ((!validate) || (validate && this.headers['etag'] === ('"' + etag + '"') ) ) ) {
				err = null;
			} else if (this.statusCode === 206) {
				err = null;
			} else if (this.headers['content-type'] === 'application/xml') {
				var xml = XML(oss_chunk);
				if (xml.tag === 'Error') {
					var result = util.xml2object(xml);
					err = new Error(result.Message);
					err.name = 'OssError';
					err.code = result.Code;
					err.errno = result.RequestId;
					err.syscall = 'Key.getObject';				
				}
			}
			
			callback(err);
		});
	});
	
	req.on('error' , function(err) {
		callback(err);
	});
	
	req.end();

	if (self._debug)
		console.log('\nKey.getObject req:\n', req, '\n');
		
	return self;
}

Key.prototype.getMeta = function(headers, callback) {
	var self = this;

	var method = 'HEAD';
	var path = '/' + this.name;
	var resource = '/' + this._bucket.name + path;
	
	headers = headers || {};
	headers['Host'] = this._bucket.name + '.' + this._bucket._connection.host;
	headers['Date'] = new Date().toUTCString();
	headers['Authorization'] = 'OSS ' + this._bucket._connection.access_id + ':' + util.signHeader(this._bucket._connection.access_key, method, resource, headers);
	
	var req_options = { host: headers['Host'], method: method, path: path, headers: headers };

	var req = http.request(req_options, function(res) {
		res.on('end', function() {
			if(self._debug)
				console.log('\nKey.getMeta res:\n', this, '\n');
			
			var err = new Error('Unknown Error');
			var meta = null;

			if (this.statusCode === 200) {
				err = null;
				meta = this.headers;
			} else {
				err = new Error('Status Code.');
				err.name = 'OssError';
				err.code = this.statusCode.toString();
				err.errno = this.headers['x-oss-request-id'];
				err.syscall = 'Key.getMeta';			
			}
			
			callback(err, meta);
		});
	});
	
	req.on('error' , function(err) {
		callback(err, null);
	});
	
	req.end();

	if (self._debug)
		console.log('\nKey.getMeta req:\n', req, '\n');
		
	return self;
}

Key.prototype.signUrl = function(timeout, headers) {
	headers = headers || {};

	var method = 'GET';
	var path = '/' + this.name;
	var resource = '/' + this._bucket.name + path;
	var date = new Date((new Date().getTime()) + timeout * 1000);

	return require('url').format({
		protocol: 'http:',
		host: this._bucket.name + '.' + this._bucket._connection.host,
		pathname: '/' + this.name,
		search: '?' + require('querystring').stringify({
			OSSAccessKeyId: this._bucket._connection.access_id,
			Expires: (Math.ceil(date.getTime() / 1000)),
			Signature: util.signUrl(this._bucket._connection.access_key, method, resource, headers, date)
		})
	});
} 
