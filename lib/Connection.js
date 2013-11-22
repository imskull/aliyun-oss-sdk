
var EventEmitter  = require('events').EventEmitter;
var http = require('http');
var et = require('elementtree');
var XML = et.XML;
var ElementTree = et.ElementTree;
var Element = et.Element;
var util = require('./util');
var Bucket = require('./Bucket');

module.exports = Connection;
require('util').inherits(Connection, EventEmitter);

function Connection(options) {
	EventEmitter.call(this);

	this.host = options.host || 'oss.aliyuncs.com';
	this.access_id = options.access_id || '';
	this.access_key = options.access_key || '';
	this._debug = options.debug;
}

Connection.prototype.listBuckets = function(callback) {
	var self = this;

	var method = 'GET';
	var path = '/';
	var resource = path;
	
	var headers = {};
	headers['Host'] = this.host;
	headers['Date'] = new Date().toUTCString();
	headers['Authorization'] = 'OSS ' + this.access_id + ':' + util.signHeader(this.access_key, method, resource, headers);

	var req_options = { host: headers['Host'], method: method, path: path, headers: headers };

	var req = http.request(req_options, function(res) {
		res._oss_chunk = '';
		
		res.on('data', function(chunk) {
			this._oss_chunk += chunk;
		});
		
		res.on('end', function() {
			if(self._debug)
				console.log('\nConnection.listBuckets res:\n', this, '\n');
			
			var err = new Error('Unknown Error');
			var buckets = null;
			
			if (this.headers['content-type'] === 'application/xml') {
				var xml = XML(this._oss_chunk);
				if (xml.tag === 'ListAllMyBucketsResult') {
					var result = util.xml2object(xml);
					var owner = { id: result.Owner.ID, name: result.Owner.DisplayName };
					
					buckets = [];
					
					if (result.Buckets.Bucket instanceof Array) {
						for (var i in result.Buckets.Bucket) {
							buckets.push(new Bucket(self, result.Buckets.Bucket[i].Name, result.Buckets.Bucket[i].CreationDate, owner));
						}
					} else if (result.Buckets) {
						buckets.push(new Bucket(self, result.Buckets.Bucket.Name, result.Buckets.Bucket.CreationDate, owner));
					}
					
					err = null;
				} else if (xml.tag === 'Error') {
					var result = util.xml2object(xml);
					err = new Error(result.Message);
					err.name = 'OssError';
					err.code = result.Code;
					err.errno = result.RequestId;
					err.syscall = 'Connection.listBucekts';	
				}
			}

			callback(err, buckets);
		});
	});
	
	req.on('error' , function(err) {
		callback(err, null);
	});
	
	req.end();
	
	if (self._debug)
		console.log('\nConnection.listBuckets req:\n', req, '\n');

	return self;
}

Connection.prototype.queryBucket = function(name, callback) {
	var self = this;

	var method = 'GET';
	var path = '/?acl';
	var resource = '/' + name + path;
	
	var headers = {};
	headers['Host'] = name + '.' + this.host;
	headers['Date'] = new Date().toUTCString();
	headers['Authorization'] = 'OSS ' + this.access_id + ':' + util.signHeader(this.access_key, method, resource, headers);

	var req_options = { host: headers['Host'], method: method, path: path, headers: headers };

	var req = http.request(req_options, function(res) {
		res._oss_chunk = '';
		
		res.on('data', function(chunk) {
			this._oss_chunk += chunk;
		});
		
		res.on('end', function() {
			if(self._debug)
				console.log('\nConnection.queryBucket res:\n', this, '\n');

			var err = new Error('Unknown Error');
			var bucket = null;
			
			if (this.headers['content-type'] === 'application/xml') {
				var xml = XML(this._oss_chunk);
				if (xml.tag === 'AccessControlPolicy') {
					var result = util.xml2object(xml);
					var owner = { id: result.Owner.ID, name: result.Owner.DisplayName };
					
					bucket = new Bucket(self, name, undefined, owner);
					err = null;
				} else if (xml.tag === 'Error') {
					var result = util.xml2object(xml);
					err = new Error(result.Message);
					err.name = 'OssError';
					err.code = result.Code;
					err.errno = result.RequestId;
					err.syscall = 'Connection.queryBucket';			
				}
			}
			
			callback(err, bucket);
		});
	});
	
	req.on('error' , function(err) {
		callback(err, null);
	});
	
	req.end();

	if (self._debug)
		console.log('\nConnection.queryBucket req:\n', req, '\n');
		
	return self;
}

Connection.prototype.createBucket = function(name, acl, callback) {
	var self = this;

	var method = 'PUT';
	var path = '/';
	var resource = '/' + name + path;

	var headers = {};
	headers['Host'] = name + '.' + this.host;
	headers['Date'] = new Date().toUTCString();
	if (acl)
		headers['x-oss-acl'] = acl;
	headers['Authorization'] = 'OSS ' + this.access_id + ':' + util.signHeader(this.access_key, method, resource, headers);
	headers['Content-Length'] = '0';
	
	var req_options = { host : headers['Host'], method : method, path : path, headers : headers };

	var req = http.request(req_options, function(res) {
		res._oss_chunk = '';
		
		res.on('data', function(chunk) {
			this._oss_chunk += chunk;
		});
		
		res.on('end', function() {
			if(self._debug)
				console.log('\nConnection.createBucket res:\n', this, '\n');
			
			var err = new Error('Unknown Error');
			var bucket = null;
			
			if (this.statusCode === 200) {
				bucket = new Bucket(self, name, undefined, undefined);
				err = null;
			} else if (this.headers['content-type'] === 'application/xml') {
				var xml = XML(this._oss_chunk);
				if (xml.tag === 'Error') {
					var result = util.xml2object(xml);
					err = new Error(result.Message);
					err.name = 'OssError';
					err.code = result.Code;
					err.errno = result.RequestId;
					err.syscall = 'Connection.createBucket';				
				}
			}
			
			callback(err, bucket);
		});
	});
	
	req.on('error' , function(err) {
		callback(err, null);
	});
	
	req.end();

	if (self._debug)
		console.log('\nConnection.createBucket req:\n', req, '\n');
		
	return self;	
}

Connection.prototype.deleteBucket = function(name, force, callback) {
	var self = this;

	var method = 'DELETE';
	var path = '/';
	var resource = '/' + name + path;

	var headers = {};
	headers['Host'] = name + '.' + this.host;
	headers['Date'] = new Date().toUTCString();
	headers['Authorization'] = 'OSS ' + this.access_id + ':' + util.signHeader(this.access_key, method, resource, headers);
	headers['Content-Length'] = '0';
	
	var req_options = { host : headers['Host'], method : method, path : path, headers : headers };

	var req = http.request(req_options, function(res) {
		res._oss_chunk = '';
		
		res.on('data', function(chunk) {
			this._oss_chunk += chunk;
		});
		
		res.on('end', function() {
			if(self._debug)
				console.log('\nConnection.deleteBucket res:\n', this, '\n');
			
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
					err.syscall = 'Connection.deleteBucket';				
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
		console.log('\nConnection.deleteBucket req:\n', req, '\n');
		
	return self;
}
