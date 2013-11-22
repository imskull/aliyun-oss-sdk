
var EventEmitter  = require('events').EventEmitter;
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
var KeysLister = require('./KeysLister');
var UploadsLister = require('./UploadsLister');
var Upload = require('./Upload');

module.exports = Bucket;

function Bucket(connection, name, date, owner) {
	this.name = name;
	this.date = date;
	this.owner = owner;
	this._connection = connection;
	this._debug = connection._debug;
}

Bucket.prototype.getAcl = function(callback) {
	var self = this;

	var method = 'GET';
	var path = '/?acl';
	var resource = '/' + this.name + path;
	
	var headers = {};
	headers['Host'] = this.name + '.' + this._connection.host;
	headers['Date'] = new Date().toUTCString();
	headers['Authorization'] = 'OSS ' + this._connection.access_id + ':' + util.signHeader(this._connection.access_key, method, resource, headers);

	var req_options = { host: headers['Host'], method: method, path: path, headers: headers };

	var req = http.request(req_options, function(res) {
		res._oss_chunk = '';
		
		res.on('data', function(chunk) {
			this._oss_chunk += chunk;
		});
		
		res.on('end', function() {
			if(self._debug)
				console.log('\Bucket.getAcl res:\n', this, '\n');

			var err = new Error('Unknown Error');
			var acl = null;
			
			if (this.headers['content-type'] === 'application/xml') {
				var xml = XML(this._oss_chunk);
				if (xml.tag === 'AccessControlPolicy') {
					var result = util.xml2object(xml);
					acl = result.AccessControlList.Grant;
					err = null;
				} else if (xml.tag === 'Error') {
					var result = util.xml2object(xml);
					err = new Error(result.Message);
					err.name = 'OssError';
					err.code = result.Code;
					err.errno = result.RequestId;
					err.syscall = 'Bucket.getAcl';			
				}
			}
			
			callback(err, acl);
		});
	});
	
	req.on('error' , function(err) {
		callback(err, null);
	});
	
	req.end();

	if (self._debug)
		console.log('\Bucket.getAcl req:\n', req, '\n');
		
	return self;
}

Bucket.prototype.setAcl = function(acl, callback) {
	var self = this;

	var method = 'PUT';
	var path = '/';
	var resource = '/' + this.name + path;
	
	var headers = {};
	headers['Host'] = this.name + '.' + this._connection.host;
	headers['Date'] = new Date().toUTCString();
	headers['x-oss-acl'] = acl;
	headers['Authorization'] = 'OSS ' + this._connection.access_id + ':' + util.signHeader(this._connection.access_key, method, resource, headers);
	headers['Content-Length'] = '0';

	var req_options = { host: headers['Host'], method: method, path: path, headers: headers };

	var req = http.request(req_options, function(res) {
		res._oss_chunk = '';
		
		res.on('data', function(chunk) {
			this._oss_chunk += chunk;
		});
		
		res.on('end', function() {
			if(self._debug)
				console.log('\nBucket.setAcl res:\n', this, '\n');
			
			var err = new Error('Unknown Error');
			
			if (this.statusCode === 200) {
				err = null;
			} else if (this.headers['content-type'] === 'application/xml') {
				var xml = XML(this._oss_chunk);
				if (xml.tag === 'Error') {
					var result = util.xml2object(xml);
					err = new Error(result.Message);
					err.name = 'OssError';
					err.code = result.Code;
					err.errno = result.RequestId;
					err.syscall = 'Bucket.setAcl';				
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
		console.log('\Bucket.setAcl req:\n', req, '\n');
		
	return self;
}

Bucket.prototype.createKey = function(name, object, length, headers, validate, callback) {
	var self = this;

	var method = 'PUT';
	var path = '/' + name;
	var resource = '/' + this.name + path;
	
	headers = headers || {};
	headers['Host'] = this.name + '.' + this._connection.host;
	headers['Date'] = new Date().toUTCString();
	headers['Authorization'] = 'OSS ' + this._connection.access_id + ':' + util.signHeader(this._connection.access_key, method, resource, headers);
	headers['Content-Length'] = length;	
	
	var req_options = { host: headers['Host'], method: method, path: path, headers: headers };
	var etag;
	var req = http.request(req_options, function(res) {
		res._oss_chunk = '';
		
		res.on('data', function(chunk) {
			this._oss_chunk += chunk;
		});
		
		res.on('end', function() {
			if(self._debug)
				console.log('\nKey.setContent res:\n', this, '\n');
			
			var err = new Error('Unknown Error');
			var key = null;

			if ((this.statusCode === 200) && ( (!validate) || (validate && this.headers['etag'] === ('"' + etag + '"') ) ) ) {
				err = null;
				key = new Key(self, name);
			} else if (this.headers['content-type'] === 'application/xml') {
				var xml = XML(this._oss_chunk);
				if (xml.tag === 'Error') {
					var result = util.xml2object(xml);
					err = new Error(result.Message);
					err.name = 'OssError';
					err.code = result.Code;
					err.errno = result.RequestId;
					err.syscall = 'Key.setContent';				
				}
			}
			
			callback(err, key);
		});
	});
	
	req.on('error' , function(err) {
		callback(err, null);
	});
	
	object.pipe(req);
	if (validate) {
		var md5 = new CryptoStream('md5');
		md5.on('end', function() {
			etag = md5.digest;
		});
		
		object.pipe(md5);
	}

	if (self._debug)
		console.log('\nKey.setContent req:\n', req, '\n');
		
	return self;	
}

Bucket.prototype.copyKey = function(name, bucketName, keyName, headers, callback) {
	var self = this;

	var method = 'PUT';
	var path = '/' + name;
	var resource = '/' + this.name + path;

	headers = headers || {};
	headers['Host'] = this.name + '.' + this._connection.host;
	headers['Date'] = new Date().toUTCString();
	headers['x-oss-copy-source'] = '/' + bucketName + '/' + keyName;
	headers['Authorization'] = 'OSS ' + this._connection.access_id + ':' + util.signHeader(this._connection.access_key, method, resource, headers);
	headers['Content-Length'] = 0;
	
	var req_options = { host: headers['Host'], method: method, path: path, headers: headers };

	var req = http.request(req_options, function(res) {
		var oss_chunk = '';
		
		res.on('data', function(chunk) {
			oss_chunk += chunk;
		});
		
		res.on('end', function() {
			if(self._debug)
				console.log('\nBucket.copyKey res:\n', this, '\n');

			var err = new Error('Unknown Error');
			var key = null;
			
			if (this.headers['content-type'] === 'application/xml') {
				var xml = XML(oss_chunk);
				var result = util.xml2object(xml);
				
				if (xml.tag === 'CopyObjectResult') {
					err = null;
					
					key = new Key(self, name);
				} else if (xml.tag === 'Error') {
					err = new Error(result.Message);
					err.name = 'OssError';
					err.code = result.Code;
					err.errno = result.RequestId;
					err.syscall = 'Bucket.copyKey';				
				}
			}
			
			callback(err, key);
		});
	});
	
	req.on('error' , function(err) {
		callback(err, null);
	});

	req.end();

	if (self._debug)
		console.log('\nBucket.copyKey req:\n', req, '\n');
		
	return self;
}

Bucket.prototype.queryKey = function(name, callback) {
	var self = this;

	var method = 'HEAD';
	var path = '/' + name;
	var resource = '/' + this.name + path;
	
	var headers = {};
	headers['Host'] = this.name + '.' + this._connection.host;
	headers['Date'] = new Date().toUTCString();
	headers['Authorization'] = 'OSS ' + this._connection.access_id + ':' + util.signHeader(this._connection.access_key, method, resource, headers);

	var req_options = { host: headers['Host'], method: method, path: path, headers: headers };

	var req = http.request(req_options, function(res) {
		res._oss_chunk = '';
		
		res.on('data', function(chunk) {
			this._oss_chunk += chunk;
		});

		res.on('end', function() {
			if(self._debug)
				console.log('\nBucket.queryKey res:\n', this, '\n');
			
			var err = new Error('Unknown Error');
			var key = null;
			
			if (this.statusCode === 200) {
				err = null;
				key = new Key(self, name);
			} else if (this.statusCode === 404) {
					err = new Error('The specified key does not exist.');
					err.name = 'OssError';
					err.code = 'NoSuchKey';
					err.errno = this.headers['x-oss-request-id'];
					err.syscall = 'Bucket.queryKey';				
			} else if (this.headers['content-type'] === 'application/xml') {
				var xml = XML(this._oss_chunk);
				if (xml.tag === 'Error') {
					var result = util.xml2object(xml);
					err = new Error(result.Message);
					err.name = 'OssError';
					err.code = result.Code;
					err.errno = result.RequestId;
					err.syscall = 'Bucket.queryKey';				
				}
			}
			
			callback(err, key);
		});
	});
	
	req.on('error' , function(err) {
		callback(err, null);
	});
	
	req.end();

	if (self._debug)
		console.log('\Bucket.queryKey req:\n', req, '\n');
		
	return self;	
}

Bucket.prototype.deleteKey = function(name, callback) {
	var self = this;

	var method = 'DELETE';
	var path = '/' + name;
	var resource = '/' + this.name + path;
	
	var headers = {};
	headers['Host'] = this.name + '.' + this._connection.host;
	headers['Date'] = new Date().toUTCString();
	headers['Authorization'] = 'OSS ' + this._connection.access_id + ':' + util.signHeader(this._connection.access_key, method, resource, headers);
	headers['Content-Length'] = '0';
	
	var req_options = { host: headers['Host'], method: method, path: path, headers: headers };

	var req = http.request(req_options, function(res) {
		res._oss_chunk = '';
		
		res.on('data', function(chunk) {
			this._oss_chunk += chunk;
		});
		
		res.on('end', function() {
			if(self._debug)
				console.log('\nBucket.deleteKey res:\n', this, '\n');
			
			var err = new Error('Unknown Error');
			
			if (this.statusCode === 204) {
				err = null;
			} else if (this.headers['content-type'] === 'application/xml') {
				var xml = XML(this._oss_chunk);
				if (xml.tag === 'Error') {
					var result = util.xml2object(xml);
					err = new Error(result.Message);
					err.name = 'OssError';
					err.code = result.Code;
					err.errno = result.RequestId;
					err.syscall = 'Bucket.deleteKey';				
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
		console.log('\Bucket.deleteKey req:\n', req, '\n');
		
	return self;
}

Bucket.prototype.deleteKeys = function(names, quiet, callback) {
	var self = this;

	var method = 'POST';
	var path = '/?delete';
	var resource = '/' + this.name + path;
	
	var element_delete = Element('Delete');
	var element_quiet = SubElement(element_delete, 'Quiet');
	element_quiet.text = quiet.toString();
	for(var i in names) {
		var element_object = SubElement(element_delete, 'Object');
		var element_key = SubElement(element_object, 'Key');
		element_key.text = names[i];
	}
	
	var body = (new ElementTree(element_delete)).write();
	var md5 = crypto.createHash('md5').update(body).digest('base64');

	var headers = {};
	headers['Host'] = this.name + '.' + this._connection.host;
	headers['Date'] = new Date().toUTCString();
	headers['Content-Type'] = 'application/xml';
	headers['Content-Md5'] = md5;
	headers['Authorization'] = 'OSS ' + this._connection.access_id + ':' + util.signHeader(this._connection.access_key, method, resource, headers);
	headers['Content-Length'] = body.length;
	
	var req_options = { host: headers['Host'], method: method, path: path, headers: headers };

	var req = http.request(req_options, function(res) {
		var oss_chunk = '';
		
		res.on('data', function(chunk) {
			oss_chunk += chunk;
		});
		
		res.on('end', function() {
			if(self._debug)
				console.log('\nBucket.deleteKeys res:\n', this, '\n');
			console.log(this.statusCode);
			console.log(this.headers);
			var err = new Error('Unknown Error');
			var result = null;
			
			if (this.statusCode === 200 && !this.headers['content-type']) {
				err = null;
			} else if (this.headers['content-type'] === 'application/xml') {
				var xml = XML(oss_chunk);
				result = util.xml2object(xml);
				
				if (xml.tag === 'DeleteResult') {
					err = null;
				} else if (xml.tag === 'Error') {
					err = new Error(result.Message);
					err.name = 'OssError';
					err.code = result.Code;
					err.errno = result.RequestId;
					err.syscall = 'Bucket.deleteKeys';

					result = null;
				}
			}
			
			callback(err, result);
		});
	});
	
	req.on('error' , function(err) {
		callback(err, null);
	});
	
	req.write(body);
	req.end();

	if (self._debug)
		console.log('\nBucket.deleteKeys req:\n', req, '\n');
		
	return self;
}

Bucket.prototype.initUpload = function(name, headers, callback) {
	var self = this;

	var method = 'POST';
	var path = '/' + name + '?uploads';
	var resource = '/' + this.name + path;

	headers = headers || {};
	headers['Host'] = this.name + '.' + this._connection.host;
	headers['Date'] = new Date().toUTCString();
	headers['Authorization'] = 'OSS ' + this._connection.access_id + ':' + util.signHeader(this._connection.access_key, method, resource, headers);
	headers['Content-Length'] = 0;
	
	var req_options = { host: headers['Host'], method: method, path: path, headers: headers };

	var req = http.request(req_options, function(res) {
		var oss_chunk = '';
		
		res.on('data', function(chunk) {
			oss_chunk += chunk;
		});
		
		res.on('end', function() {
			if(self._debug)
				console.log('\nBucket.initUpload res:\n', this, '\n');

			var err = new Error('Unknown Error');
			var upload = null;
			// 服务器没有返回content-type,可能是个BUG
			if (true || this.headers['content-type'] === 'application/xml') {
				var xml = XML(oss_chunk);
				var result = util.xml2object(xml);
				
				if (xml.tag === 'InitiateMultipartUploadResult') {
					err = null;
					upload = new Upload(self, result.Key, result.UploadId);
				} else if (xml.tag === 'Error') {
					err = new Error(result.Message);
					err.name = 'OssError';
					err.code = result.Code;
					err.errno = result.RequestId;
					err.syscall = 'Bucket.initUpload';

					upload = null;
				}
			}
			
			callback(err, upload);
		});
	});
	
	req.on('error' , function(err) {
		callback(err, null);
	});

	req.end();

	if (self._debug)
		console.log('\nBucket.initUpload req:\n', req, '\n');
		
	return self;
}

Bucket.prototype.listKeys = function(prefix, marker, delimiter, maxkeys) {
	return new KeysLister(this, prefix, marker, delimiter, maxkeys);
}

Bucket.prototype.listUploads = function(prefix, key_marker, upload_marker, delimiter, maxuploads) {
	return new UploadsLister(this, prefix, key_marker, upload_marker, delimiter, maxuploads);
}