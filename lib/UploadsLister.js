
var http = require('http');
var et = require('elementtree');
var XML = et.XML;
var ElementTree = et.ElementTree;
var Element = et.Element;
var util = require('./util');
var Upload = require('./Upload');

module.exports = UploadsLister;

function UploadsLister(bucket, prefix, keyMarker, uploadMarker, delimiter, maxUploads) {
	this.prefix = prefix;
	this.keyMarker = keyMarker;
	this.uploadMarker = uploadMarker;
	this.delimiter = delimiter;
	this.maxUploads = maxUploads;
	
	this._bucket = bucket;
	this._nextKeyMarker = keyMarker;
	this._nextUploadMarker = uploadMarker;
	this._isTruncated = true;
}

UploadsLister.prototype.hasNext = function() {
	return this._isTruncated;
}

UploadsLister.prototype.next = function(callback) {
	var self = this;

	var method = 'GET';
	var path = '/?uploads';
	if (this.prefix || this._nextKeyMarker || this._nextUploadMarker || this.delimiter || this.maxUploads) {
		path += '&';
		if (this.prefix) path += 'prefix=' + this.prefix + '&';
		if (this._nextKeyMarker) path += 'key-marker=' + this._nextKeyMarker + '&';
		if (this._nextUploadMarker) path += 'upload-id-marker=' + this._nextUploadMarker + '&';
		if (this.delimiter) path += 'delimiter=' + this.delimiter + '&';
		if (this.maxUploads) path += 'max-uploads=' + this.maxUploads + '&';
		path = path.substr(0, path.length - 1);
	}
	var resource = '/' + this._bucket.name + '/?uploads';
	
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
				console.log('\UploadsLister.next res:\n', this, '\n');

			var err = new Error('Unknown Error');
			var uploads = null;

			// 服务器没有返回content-type,可能是个BUG
			if (true || this.headers['content-type'] === 'application/xml') {
				var xml = XML(oss_chunk);

				if (xml.tag === 'ListMultipartUploadsResult') {
					var result = util.xml2object(xml);
					err = null;
					uploads = [];
					
					self._isTruncated = result.IsTruncated;
					if (self._isTruncated) {
						self._nextMarker = result.NextKeyMarker;
						self._nextUploadMarker  =result.NextUploadIdMarker;
					}

					if (result.Upload instanceof Array) {
						for (var i in result.Upload) {
							uploads.push(new Upload(self._bucket, result.Upload[i].Key, result.Upload[i].UploadId));
						}
					} else if (result.Upload) {
						uploads.push(new Upload(self._bucket, result.Upload.Key, result.Upload.UploadId));
					}					
				} else if (xml.tag === 'Error') {
					var result = util.xml2object(xml);
					err = new Error(result.Message);
					err.name = 'OssError';
					err.code = result.Code;
					err.errno = result.RequestId;
					err.syscall = 'UploadsLister.next';			
				}
			}
			
			callback(err, uploads);
		});
	});
	
	req.on('error' , function(err) {
		callback(err, null);
	});
	
	req.end();

	if (self._debug)
		console.log('\nUploadsLister.next req:\n', req, '\n');
		
	return self;
}