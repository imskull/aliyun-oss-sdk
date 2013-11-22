
var assert = require('assert');
var fs = require('fs');
var Connection = require('../lib/Connection');
var Bucket = require('../lib/Bucket');
var Key = require('../lib/Key');
var KeysLister = require('../lib/KeysLister');

describe('KeysLister', function() {
	var lister;
	
	before(function() {
		var conn = new Connection({ host: host, access_id: access_id, access_key: access_key });
		var bucket = new Bucket(conn, test_bucket_name, undefined, undefined);
		lister = bucket.listKeys('key', undefined, undefined, 3);
	})

	describe('#hasNext', function() {
		it('should return true', function() {
			console.log('\nKeysLister.hasNext:\n');

			console.log(lister.hasNext());
		})
	})	
	
	describe('#next', function() {
		it('should return err or keys', function(done) {
			console.log('\nKeysLister.next:\n');

			lister.next(function(err, keys) {
				console.log(err);
				console.log(keys);
				done();
			});
		})
	})
	
	describe('#hasNext', function() {
		it('should return false', function() {
			console.log('\nKeysLister.hasNext:\n');

			console.log(lister.hasNext());
		})
	})
})