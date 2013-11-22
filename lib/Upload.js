
var http = require('http');
var crypto = require('crypto');
var et = require('elementtree');
var XML = et.XML;
var ElementTree = et.ElementTree;
var Element = et.Element;
var SubElement = et.SubElement;
var util = require('./util');
var Key = require('./Key');
var CryptoStream = require('./CryptoStream');
var PartsLister = require('./PartsLister');

module.exports = Upload;

function Upload(bucket, keyName, id) {
	this.keyName = keyName;
	this.id = id;
	
	this._bucket = bucket;
}

Upload.prototype.uploadPart = function(number, stream, length, validate, callback) {
	var self = this;

	var method = 'PUT';
	var path = '/' + this.keyName + '?partNumber=' + number + '&uploadId=' + this.id;
	var resource = '/' + this._bucket.name + path;
	
	var headers = {};
	headers['Host'] = this._bucket.name + '.' + this._bucket._connection.host;
	headers['Date'] = new Date().toUTCString();
	headers['Authorization'] = 'OSS ' + this._bucket._connection.access_id + ':' + util.signHeader(this._bucket._connection.access_key, method, resource, headers);
	headers['Content-Length'] = length;	
	
	var req_options = { host: headers['Host'], method: method, path: path, headers: headers };
	var etag;
	var req = http.request(req_options, function(res) {
		var oss_chunk = '';
		
		res.on('data', function(chunk) {
			oss_chunk += chunk;
		});
		
		res.on('end', function() {
			if(self._debug)
				console.log('\nUpload.uploadPart res:\n', this, '\n');
			
			var err = new Error('Unknown Error');
			var part = null;

			if ((this.statusCode === 200) && ( (!validate) || (validate && this.headers['etag'] === ('"' + etag + '"') ) ) ) {
				err = null;
				part = { PartNumber: number, ETag: this.headers['etag'] };
			} else if (this.headers['content-type'] === 'application/xml') {
				var xml = XML(oss_chunk);
				if (xml.tag === 'Error') {
					var result = util.xml2object(xml);
					err = new Error(result.Message);
					err.name = 'OssError';
					err.code = result.Code;
					err.errno = result.RequestId;
					err.syscall = 'Upload.uploadPart';				
				}
			}
			
			callback(err, part);
		});
	});
	
	req.on('error' , function(err) {
		callback(err, null);
	});
	
	stream.pipe(req);
	if (validate) {
		var md5 = new CryptoStream('md5');
		md5.on('end', function() {
			etag = md5.digest;
		});
		
		stream.pipe(md5);
	}

	if (self._debug)
		console.log('\nUpload.uploadPart req:\n', req, '\n');
		
	return self;
}

Upload.prototype.abort = function(callback) {
	var self = this;

	var method = 'DELETE';
	var path = '/' + this.keyName + '?uploadId=' + this.id;
	var resource = '/' + this._bucket.name + path;
	
	var headers = {};
	headers['Host'] = this._bucket.name + '.' + this._bucket._connection.host;
	headers['Date'] = new Date().toUTCString();
	headers['Authorization'] = 'OSS ' + this._bucket._connection.access_id + ':' + util.signHeader(this._bucket._connection.access_key, method, resource, headers);
	headers['Content-Length'] = 0;	
	
	var req_options = { host: headers['Host'], method: method, path: path, headers: headers };
	var req = http.request(req_options, function(res) {
		var oss_chunk = '';
		
		res.on('data', function(chunk) {
			oss_chunk += chunk;
		});
		
		res.on('end', function() {
			if(self._debug)
				console.log('\nKey.setContent res:\n', this, '\n');
			
			var err = new Error('Unknown Error');

			if (this.statusCode === 204) {
				err = null;
			} else if (this.headers['content-type'] === 'application/xml') {
				var xml = XML(oss_chunk);
				if (xml.tag === 'Error') {
					var result = util.xml2object(xml);
					err = new Error(result.Message);
					err.name = 'OssError';
					err.code = result.Code;
					err.errno = result.RequestId;
					err.syscall = 'Key.setContent';				
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
		console.log('\nKey.setContent req:\n', req, '\n');
		
	return null;	
}

Upload.prototype.complete = function(parts, callback) {
	var self = this;

	var method = 'POST';
	var path = '/' + this.keyName + '?uploadId=' + this.id;
	var resource = '/' + this._bucket.name + path;

	var element_upload = Element('CompleteMultipartUpload');
	for(var i =0; i < parts.length - 1; ++i) {
		for (var j = 0; j < parts.length - i - 1; ++j) {
			if (parts[j].PartNumber > parts[j + 1].PartNumber) {
				var tmp = parts[j];
				parts[j] = parts[j + 1];
				parts[j + 1] = tmp;
			}
		}
	}
	for(var i in parts) {
		var element_part = SubElement(element_upload, 'Part');
		var element_partnumber = SubElement(element_part, 'PartNumber');
		element_partnumber.text = parts[i].PartNumber.toString();
		var element_etag = SubElement(element_part, 'ETag');
		element_etag.text = parts[i].ETag;
	}
	
	var body = (new ElementTree(element_upload)).write();
	var md5 = crypto.createHash('md5').update(body).digest('base64');	
	var headers = {};
	headers['Host'] = this._bucket.name + '.' + this._bucket._connection.host;
	headers['Date'] = new Date().toUTCString();
	headers['Authorization'] = 'OSS ' + this._bucket._connection.access_id + ':' + util.signHeader(this._bucket._connection.access_key, method, resource, headers);
	headers['Content-Length'] = body.length;	
	
	var req_options = { host: headers['Host'], method: method, path: path, headers: headers };
	var req = http.request(req_options, function(res) {
		var oss_chunk = '';
		
		res.on('data', function(chunk) {
			oss_chunk += chunk;
		});
		
		res.on('end', function() {
			if(self._debug)
				console.log('\nUpload.complete res:\n', this, '\n');

			var err = new Error('Unknown Error');
			var key;

			if (this.headers['content-type'] === 'application/xml') {
				var xml = XML(oss_chunk);
				var result = util.xml2object(xml);
				
				if (xml.tag === 'CompleteMultipartUploadResult') {
					err = null;
					key = new Key(self._bucket, result.Key);
				} else if (xml.tag === 'Error') {
					err = new Error(result.Message);
					err.name = 'OssError';
					err.code = result.Code;
					err.errno = result.RequestId;
					err.syscall = 'Upload.complete';				
				}
			}
			
			callback(err, key);
		});
	});
	
	req.on('error' , function(err) {
		callback(err, null);
	});

	req.write(body);
	req.end();

	if (self._debug)
		console.log('\nUpload.complete req:\n', req, '\n');
		
	return null;
}

Upload.prototype.listParts = function(partNumberMarker, maxParts) {
	// TODO
	//new PartsLister(this, partNumberMarker, maxParts);
}
