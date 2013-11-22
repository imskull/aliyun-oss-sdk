
var assert = require('assert');
var fs = require('fs');
var Connection = require('../lib/Connection');
var Bucket = require('../lib/Bucket');
var Key = require('../lib/Key');
var BufferStream = require('../lib/BufferStream');

describe('Upload', function() {
	var test_upload;
	var parts = [];
	
	before(function(done) {
		var conn = new Connection({ host: host, access_id: access_id, access_key: access_key });
		var bucket = new Bucket(conn, test_bucket_name, undefined, undefined);
		
		bucket.initUpload(test_key_name, undefined, function(err, upload) {
			test_upload = upload;
			done();
		});
	})
	
	describe('#uploadPart', function() {
		it('should upload the first part', function(done) {
			console.log('\nUpload.uploadPart:\n');
			
			function callback(err, part) {
				console.log(err);
				console.log(part);
				parts.push(part);
				
				if (parts.length === 2)
					done();
			}
			
			var length1 = 6*1024*1024;
			var buffer1 = new Buffer(length1);
			buffer1.fill('A');
			var stream1 = new BufferStream(buffer1);
			test_upload.uploadPart(1, stream1, length1, false, callback);
			
			var length2 = 4*1024*1024;
			var buffer2 = new Buffer(length2);
			buffer2.fill('B');
			var stream2 = new BufferStream(buffer2);
			test_upload.uploadPart(2, stream2, length2, true, callback);			
		})
	})
	
	describe('#complete', function() {
		it('should complete the upload', function(done) {
			console.log('\nUpload.complete:\n');
			
			test_upload.complete(parts, function(err, key) {
				console.log(err);
				console.log(key);
				done();
			});
		})
	})	

	describe('#abort', function() {
		it('should abort the upload', function(done) {
			console.log('\nUpload.abort:\n');

			test_upload.abort(function(err) {
				console.log(err);
				done();
			});
		})
	})
})