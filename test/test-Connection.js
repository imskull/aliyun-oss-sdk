
var assert = require('assert');
var Connection = require('../lib/Connection');

describe('Connection', function() {
	var conn;
	var create_bucket_name = 'bucketcreatetest';
	
	before(function() {
		conn = new Connection({ host: host, access_id: access_id, access_key: access_key });
	})
	
	describe('#listBuckets', function() {
		it('should list all buckets', function(done) {
			console.log('\nConnection.listBuckets:\n');
			conn.listBuckets(function(err, buckets) {
				console.log(err);
				console.log(buckets);
				done();
			});
		})
	})
	
	describe('#createBucket', function() {
		it('should create the bucket', function(done) {
			console.log('\nConnection.createBucket:\n');
			conn.createBucket(create_bucket_name, 'private', function(err, bucket) {
				console.log(err);
				console.log(bucket);
				done();
			});
		})
	})	

	describe('#queryBucket', function() {
		it('should return the bucket if exist', function(done) {
			console.log('\nConnection.queryBucket:\n');
			conn.queryBucket(create_bucket_name, function(err, bucket) {
				console.log(err);
				console.log(bucket);
				done();
			});
		})
	})
	
	describe('#deleteBucket', function() {
		it('should delete the bucket', function(done) {
			console.log('\nConnection.deleteBucket:\n');
			conn.deleteBucket(create_bucket_name, false, function(err) {
				console.log(err);
				done();
			});
		})
	})	
})