
var Stream = require('stream').Stream;

module.exports = BufferStream;

require('util').inherits(BufferStream, Stream);

function BufferStream(buffer) {
	Stream.call(this);
	
	this.writable = true;
	this.buffer = new Buffer(0);
	
	var self = this;
	
	process.nextTick(function() {
		self.emit('data', buffer);
		
		process.nextTick(function() {
			self.emit('end');
		});
	});
}

BufferStream.prototype.write = function(buffer) {
	this.buffer += buffer;
}

BufferStream.prototype.end = function() {
	var self = this;
	process.nextTick(function() {
		self.emit('close');
	});
}