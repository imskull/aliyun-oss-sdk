
var assert = require('assert');
var fs = require('fs');
var Connection = require('../lib/Connection');
var Bucket = require('../lib/Bucket');
var UploadsLister = require('../lib/UploadsLister');

describe('UploadsLister', function() {
	var lister;
	
	before(function() {
		var conn = new Connection({ host: host, access_id: access_id, access_key: access_key });
		var bucket = new Bucket(conn, test_bucket_name, undefined, undefined);
		lister = bucket.listUploads(undefined, undefined, undefined, undefined, undefined);
	})

	describe('#hasNext', function() {
		it('should return true', function() {
			console.log('\nUploadsLister.hasNext:\n');

			console.log(lister.hasNext());
		})
	})	
	
	describe('#next', function() {
		it('should return err or keys', function(done) {
			console.log('\nUploadsLister.next:\n');

			lister.next(function(err, uploads) {
				console.log(err);
				console.log(uploads);
				done();
			});
		})
	})
	
	describe('#hasNext', function() {
		it('should return false', function() {
			console.log('\nUploadsLister.hasNext:\n');

			console.log(lister.hasNext());
		})
	})
})