
var assert = require('assert');
var fs = require('fs');
var Connection = require('../lib/Connection');
var Bucket = require('../lib/Bucket');
var BufferStream = require('../lib/BufferStream');
var crypto = require('crypto');

describe('Bucket', function() {
	var bucket;
	var create_key_name = 'create_key_name';
	var copy_key_name = 'copy_key_name';
	
	before(function() {
		var conn = new Connection({ host: host, access_id: access_id, access_key: access_key });
		bucket = new Bucket(conn, test_bucket_name, undefined, undefined);
	})
	
	describe('#getAcl', function() {
		it('should get right acl', function(done) {
			console.log('\nBucket.getAcl:\n');
			bucket.getAcl(function(err, acl) {
				console.log(err);
				console.log(acl);
				done();
			});
		})
	})	
	
	describe('#setAcl', function() {
		it('should set the acl', function(done) {
			console.log('\nBucket.setAcl:\n');
			bucket.setAcl('private', function(err) {
				console.log(err);
				done();
			});
		})
	})		

	describe('#createKey', function() {
		it('should create the key', function(done) {
			console.log('\nBucket.createKey:\n');
			
			var file = __dirname + '/data/test.jpg';
			var stream = fs.createReadStream(file);
			var length = fs.statSync(file).size;
			
			//var str = 'hello world';
			//var stream = new BufferStream(new Buffer(str));
			//var length = str.length;
			
			bucket.createKey(create_key_name, stream, length, null, true, function(err, key) {
				console.log(err);
				console.log(key);
				done();
			});
		})
	})
	
	describe('#copyKey', function() {
		it('should copy the key', function(done) {
			console.log('\nBucket.copyKey:\n');
			
			bucket.copyKey(copy_key_name, test_bucket_name, create_key_name, {'x-oss-metadata-directive': 'REPLACE' }, function(err, key) {
				console.log(err);
				console.log(key);
				done();
			});
		})
	})
	
	describe('#queryKey', function() {
		it('should return the right key', function(done) {
			console.log('\nBucket.queryKey:\n');
			
			bucket.queryKey(create_key_name, function(err, key) {
				console.log(err);
				console.log(key);
				done();
			});
		})
	})
	
	describe('#deleteKey', function() {
		it('should delete the key', function(done) {
			console.log('\nBucket.deleteKey:\n');
			
			bucket.deleteKey(create_key_name, function(err) {
				console.log(err);
				done();
			});
		})
	})

	describe('#deleteKeys', function() {
		it('should delete the keys', function(done) {
			console.log('\nBucket.deleteKeys:\n');
			
			bucket.deleteKeys([create_key_name, copy_key_name], false, function(err, result) {
				console.log(err);
				console.log(result);
				done();
			});
		})
	})
	
	describe('#initUpload', function() {
		it('should return upload', function(done) {
			console.log('\nBucket.initUpload:\n');
			
			bucket.initUpload('test_upload_name', undefined, function(err, upload) {
				console.log(err);
				console.log(upload);
				done();
			});
		})
	})		
})