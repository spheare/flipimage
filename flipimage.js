#!/usr/local/bin/node
const libJPEG = require('jpeg-js'),
	fs = require('fs');
argv = require('yargs')
	.usage('Usage: $0 <source> [options]')
	.example('$0 image.jpg', 'Flip strips of 1% in image.jpg and save in out-image.jpg')
	.example('$0 image.jpg --out example.jpg', 'Flip strips in image.jpg and save in example.jpg')
	.example('$0 image.jpg --strips 64px', 'Flip strips of 64 pixels')
	.example('$0 image.jpg --dir=horizontal --strips 10%', 'Flip in horizontal strips of 10% of image height')
	.alias('s', 'strips')
	.default('s', '1%')
	.describe('s', 'Set strip width. Can be suffixed with "px" or "%" to control units')
	.alias('o', 'out')
	.describe('o', 'Save results to <file>. If omitted, saves to "out-<source>.jpg"')
	.alias('d', 'dir')
	.choices('d', [ 'horizontal', 'vertical', 'h', 'v' ])
	.describe('d', 'Direction of resulting strips')
	.help('h')
	.alias('h', 'help')
	.epilog('copyright 2019 Kevin Vaesen')
	.demandCommand(1).argv;

process.stdout.write('Image flipstrip dinges\n(C) 2019 Kevin Vaesen.\n');

const parseUnit = (u, w) =>
		('' + u).indexOf('%') >= 0 ? Math.max(2, Math.ceil(w * 0.01 * parseFloat(u, 10))) : parseInt(u, 10),
	getDestFilename = name =>
		name
			.split('/')
			.map((part, index, a) => (index === a.length - 1 ? part.replace(/([^.]+)([.].+)?$/, '$1-sliced$2') : part))
			.join('/');

function decodeJPG(source) {
	try {
		return libJPEG.decode(fs.readFileSync(source));
	} catch (e) {
		process.stderr.write(`Error: cannot open source file ${source}\n`);
		return null;
	}
}

function processImage({ width = 0, height = 0, data = null } = {}, stripWidth, horizontal = false) {
	if (!data) return null;
	if (stripWidth < 2) {
		process.stderr.write(`Error: strip width ${stripWidth} is too small, must be at least 2 pixels\n`);
		return null;
	}

	process.stdout.write(`Flipping in ${horizontal ? 'horizontal' : 'vertical'} strips of ${stripWidth} pixels\n`);

	const newData = Buffer.alloc(width * height * 4);

	if (horizontal) flipHorizontal(width, height, stripWidth, newData, data);
	else flipVertical(width, height, stripWidth, newData, data);

	return {
		data: newData,
		width,
		height
	};
}

function flipVertical(width, height, stripWidth, newData, data) {
	for (let y = 0; y < height; ++y) {
		for (let x = 0; x < width; x += stripWidth) {
			const remainingStrip = x + stripWidth < width ? stripWidth : width - x;

			for (let n = 0; n < remainingStrip; ++n) {
				const i0 = (y * width + x + n) * 4,
					i1 = (y * width + x + remainingStrip - n) * 4;

				newData[i0 + 0] = data[i1 + 0];
				newData[i0 + 1] = data[i1 + 1];
				newData[i0 + 2] = data[i1 + 2];
			}
		}
	}
}

function flipHorizontal(width, height, stripWidth, newData, data) {
	for (let x = 0; x < width; ++x) {
		for (let y = 0; y < height; y += stripWidth) {
			const remainingStrip = y + stripWidth < height ? stripWidth : height - y;
			for (let n = 0; n < remainingStrip; ++n) {
				const i0 = ((y + n) * width + x) * 4,
					i1 = ((y + remainingStrip - n) * width + x) * 4;

				newData[i0 + 0] = data[i1 + 0];
				newData[i0 + 1] = data[i1 + 1];
				newData[i0 + 2] = data[i1 + 2];
			}
		}
	}
}

function encodeJPG(destFile, dataObj) {
	if (!dataObj || !destFile) return false;

	const newJPEGFile = libJPEG.encode(dataObj, 100);

	try {
		fs.writeFileSync(destFile, newJPEGFile.data);
		return true;
	} catch (e) {
		return false;
	}
}

const source = argv._[0];
const dest = argv.o || getDestFilename(source);
const sourceData = decodeJPG(source);
const horizontal = [ 'h', 'horizontal' ].indexOf(argv.dir) >= 0;

if (!sourceData) return;

if (encodeJPG(dest, processImage(sourceData, parseUnit(argv.s, sourceData.width), horizontal)))
	process.stdout.write(`Wrote ${dest}\n`);
else process.stderr.write(`Error: Could not save to file ${dest}\n`);
