
var Stream = require('stream').Stream;
var crypto = require('crypto');

module.exports = CryptoStream;

require('util').inherits(CryptoStream, Stream);

function CryptoStream(algorithm) {
	Stream.call(this);
	
	this.readable = false;
	this.writable = true;
	this.digest = '';
	
	this._hash = crypto.createHash(algorithm);
}

CryptoStream.prototype.write = function(buffer) {
	this._hash.update(buffer);
}

CryptoStream.prototype.end = function() {
	this.digest = this._hash.digest('hex').toUpperCase();

	this.emit('end');
}