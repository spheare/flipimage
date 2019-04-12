#!/usr/local/bin/node
const libJPEG = require('jpeg-js'),
	fs = require('fs');
argv = require('yargs')
	.usage('Usage: $0 <source> [options]')
	.example('$0 image.jpg', 'Flip strips of 1% in image.jpg and save in out-image.jpg')
	.example('$0 image.jpg --out example.jpg', 'Flip strips in image.jpg and save in example.jpg')
	.example('$0 image.jpg --strips 64px', 'Flip strips of 64 pixels')
	.example('$0 image.jpg --strips 10%', 'Flip strips of 10% of image width')
	.alias('s', 'strips')
	.default('s', '1%')
	.describe('s', 'Set strip width. Can be suffixed with "px" or "%" to control units')
	.alias('o', 'out')
	.describe('o', 'save results to <file>. If omitted, saves to "out-<source>.jpg"')
	.help('h')
	.alias('h', 'help')
	.epilog('copyright 2019 Kevin Vaesen')
	.demandCommand(1).argv;

process.stdout.write('Image strip dinges\n(C) 2019 Kevin Vaesen.\n');

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

function processImage({ width = 0, height = 0, data = null } = {}, stripWidth) {
	if (!data) return null;
	if (stripWidth < 2) {
		process.stderr.write(`Error: strip width ${stripWidth} is too small, must be at least 2 pixels\n`);
		return null;
	}
	const newData = Buffer.alloc(width * height * 4);

	process.stdout.write(`Strip width ${stripWidth} pixels\n`);

	for (let y = 0; y < height; ++y) {
		for (let x = 0; x < width; x += stripWidth) {
			for (let n = 0; n < stripWidth; ++n) {
				const i0 = (y * width + x + n) * 4,
					i1 = (y * width + x + stripWidth - n) * 4;
				if (x + n > width) break;
				newData[i0 + 0] = data[i1 + 0];
				newData[i0 + 1] = data[i1 + 1];
				newData[i0 + 2] = data[i1 + 2];
				newData[i0 + 3] = 0xff; // data[i1 + 3];}
			}
		}
	}

	return {
		data: newData,
		width,
		height
	};
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
if (!sourceData) return;

if (encodeJPG(dest, processImage(sourceData, parseUnit(argv.s, sourceData.width))))
	process.stdout.write(`Wrote ${dest}\n`);
else process.stderr.write(`Error: Could not save to file ${dest}\n`);
