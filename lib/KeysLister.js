
var http = require('http');
var et = require('elementtree');
var XML = et.XML;
var ElementTree = et.ElementTree;
var Element = et.Element;
var util = require('./util');
var Key = require('./Key');

module.exports = KeysLister;

function KeysLister(bucket, prefix, marker, delimiter, maxkeys) {
	this.prefix = prefix;
	this.marker = marker;
	this.delimiter = delimiter;
	this.maxkeys = maxkeys;
	
	this._bucket = bucket;
	this._nextMarker = marker;
	this._isTruncated = true;
}

KeysLister.prototype.hasNext = function() {
	return this._isTruncated;
}

KeysLister.prototype.next = function(callback) {
	var self = this;

	var method = 'GET';
	var path = '/';
	if (this.prefix || this.marker || this.delimiter || this.maxkeys) {
		path += '?';
		if (this.prefix) path += 'prefix=' + this.prefix + '&';
		if (this._nextMarker) path += 'marker=' + this._nextMarker + '&';
		if (this.delimiter) path += 'delimiter=' + this.delimiter + '&';
		if (this.maxkeys) path += 'max-keys=' + this.maxkeys + '&';
		path = path.substr(0, path.length - 1);
	}
	var resource = '/' + this._bucket.name + '/';
	
	var headers = {};
	headers['Host'] = this._bucket.name + '.' + this._bucket._connection.host;
	headers['Date'] = new Date().toUTCString();
	headers['Authorization'] = 'OSS ' + this._bucket._connection.access_id + ':' + util.signHeader(this._bucket._connection.access_key, method, resource, headers);

	var req_options = { host: headers['Host'], method: method, path: path, headers: headers };

	var req = http.request(req_options, function(res) {
		var oss_chunk = '';
		
		res.on('data', function(chunk) {
			oss_chunk += chunk;
		});
		
		res.on('end', function() {
			if(self._debug)
				console.log('\nKeyLister.next res:\n', this, '\n');

			var err = new Error('Unknown Error');
			var keys = null;

			// 服务器没有返回content-type,可能是个BUG
			if (true || this.headers['content-type'] === 'application/xml') {
				var xml = XML(oss_chunk);

				if (xml.tag === 'ListBucketResult') {
					var result = util.xml2object(xml);
					err = null;
					keys = [];
					
					self._isTruncated = result.IsTruncated;
					if (self._isTruncated)
						self._nextMarker = result.NextMarker;

					if (result.Contents instanceof Array) {
						for (var i in result.Contents) {
							keys.push(new Key(self._bucket, result.Contents[i].Key));
						}
					} else if (result.Contents) {
						keys.push(new Key(self._bucket, result.Contents.Key));
					}					
				} else if (xml.tag === 'Error') {
					var result = util.xml2object(xml);
					err = new Error(result.Message);
					err.name = 'OssError';
					err.code = result.Code;
					err.errno = result.RequestId;
					err.syscall = 'KeyLister.next';			
				}
			}
			
			callback(err, keys);
		});
	});
	
	req.on('error' , function(err) {
		callback(err, null);
	});
	
	req.end();

	if (self._debug)
		console.log('\nKeyLister.next req:\n', req, '\n');
		
	return self;	
}