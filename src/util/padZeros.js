function padZeros(number, zeros) {
	number = ''+number;
	zeros = zeros || 2;
	const padded = (Array.from({length:zeros},()=>'0')).join('');
	return padded.slice(0, padded.length-number.length)+number;
}

module.exports = padZeros;
