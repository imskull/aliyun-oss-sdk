
var Connection = require('../lib/Connection');
var Bucket = require('../lib/Bucket');
var Key = require('../lib/Key');
var BufferStream = require('../lib/BufferStream');

before(function() {
	host = 'oss.aliyuncs.com';
	access_id = '6dpqu9ds4tpkoleq0fxu5ug3';
	access_key = '8CYXNlVvPU5Xl6wgd326JTTICXA=';

	test_bucket_name = 'bucket20121212';
	test_key_name = 'key20121212';
})

before(function(done) {
	console.log('\ninit bucket\n');
	
	var conn = new Connection({ host: host, access_id: access_id, access_key: access_key });
	conn.createBucket(test_bucket_name, 'private', function(err, bucket) {
		console.log(err);
		console.log(bucket);
		done();
	});
})

before(function(done) {
	console.log('\ninit key\n');
	
	var conn = new Connection({ host: host, access_id: access_id, access_key: access_key });
	var bucket = new Bucket(conn, test_bucket_name, undefined, undefined);
	
	var str = 'hello world';
	var stream = new BufferStream(new Buffer(str));
	var length = str.length;
	bucket.createKey(test_key_name, stream, length, null, true, function(err, key) {
		console.log(err);
		console.log(key);
		done();
	});
})

after(function() {

})
