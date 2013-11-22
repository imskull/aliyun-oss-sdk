
var assert = require('assert');
var fs = require('fs');
var Connection = require('../lib/Connection');
var Bucket = require('../lib/Bucket');
var Key = require('../lib/Key');
var BufferStream = require('../lib/BufferStream');

describe('Key', function() {
	var key;
	
	before(function() {
		var conn = new Connection({ host: host, access_id: access_id, access_key: access_key });
		var bucket = new Bucket(conn, test_bucket_name, undefined, undefined);
		key = new Key(bucket, test_key_name);
	})
	
	describe('#getObject', function() {
		it('should get the object content', function(done) {
			console.log('\nKey.getObject:\n');

			var stream = new BufferStream();
			key.getObject(stream, {Range: 'bytes=1-9'}, true, function(err) {
				console.log(err);
				console.log(stream.buffer);
				done();
			});
		})
	})

	describe('#getMeta', function() {
		it('should get the object meta', function(done) {
			console.log('\nKey.getMeta:\n');

			key.getMeta(undefined, function(err, meta) {
				console.log(err);
				console.log(meta);
				done();
			});
		})
	})

	describe('#signUrl', function() {
		it('should get the sign url', function() {
			console.log('\nKey.signUrl:\n');

			var url = key.signUrl(60, undefined);
			console.log(url);
		})
	})		
})