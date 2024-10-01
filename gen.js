class FloatExporter {
	constructor(audioData = new Float32Array([]), sampleRate = 48000) {
		if (!(audioData instanceof Float32Array)) {
			console.warn("The audioData must be a Float32Array. Otherwise, the audio data is automatically empty");
			this.audioData = new Float32Array([]);
		} else {
			this.audioData = audioData;
		}
		if (typeof sampleRate !== "number") {
			console.warn("The sample rate must be a number, not a '" + (typeof sampleRate) + "'")
			sampleRate = 48000;
		} else {
			if (sampleRate === 0) {
				console.warn("The sample rate must not be 0, which this problem unsolved can cause infinitely long audio")
				sampleRate = 48000;
			}
			if (sampleRate < 0) console.warn("The sample rate cannot be ≤ 0, though this case is handled")
		}
		if (sampleRate % 1 !== 0) {
			console.warn("The sample rate isn't rounded, but this case is handled")
		}
		this.sampleRate = Math.abs(Math.round(sampleRate));
		this.backupData = new Float32Array(this.audioData);
	}
	convertToWav(exp = "blob") {
		const numChannels = 1, ch1 = 32767, ch2 = 32768, ch3 = 0, ch4 = -1, ch5 = 1, len = this.audioData.length;
		const len2 = len * 2;
		const buffer = new ArrayBuffer(44 + len2);
		const view = new DataView(buffer);
		this.writeString(view, 0, 'RIFF');
		view.setUint32(4, 36 + len2, true);
		this.writeString(view, 8, 'WAVE');
		this.writeString(view, 12, 'fmt ');
		view.setUint32(16, 16, true);
		view.setUint16(20, 1, true);
		view.setUint16(22, numChannels, true);
		view.setUint32(24, this.sampleRate, true);
		view.setUint32(28, this.sampleRate * 2, true);
		view.setUint16(32, 2, true);
		view.setUint16(34, 16, true);
		this.writeString(view, 36, 'data');
		view.setUint32(40, len2, true);
		let offset = 44, s;
		for (let i = 0; i !== len; i++) {
			s = Math.max(ch4, Math.min(ch5, this.audioData[i]));
			view.setInt16(offset, s < ch3 ? s * ch2 : s * ch1, true);
			offset += 2;
		}
		return new Uint8Array(buffer);
	}
	writeString(view, offset, string) {
		for (let i = 0; i < string.length; i++) {
			view.setUint8(offset + i, string.charCodeAt(i));
		}
	}
	static sineWave(frequency, duration, sampleRate) {
		const array = new Float32Array(Math.floor(duration * sampleRate))
		const len = array.length, cache = 2 * Math.PI
		for (let i = 0; i !== len; i++) {
			array[i] = Math.sin((cache * frequency * i) / sampleRate)
		}
		return new FloatExporter(array, sampleRate)
	}
}
const Assets = {
	wav: {
		static: function(duration) {
			return new FloatExporter(new Float32Array(Math.floor(duration * 48000)).map(() => Math.random() * 2 - 1)).convertToWav();
		}
	},
png: {
    static: function() {
        // Dimensions for the PNG image
        const width = 480;
        const height = 360;

        // Create the pixel data (RGBA)
        const pixelData = new Uint8Array(width * height * 4);
        for (let i = 0; i < pixelData.length; i += 4) {
            const color = Math.round(Math.random() * 255);
            pixelData[i] = color;     // Red
            pixelData[i + 1] = color; // Green
            pixelData[i + 2] = color; // Blue
            pixelData[i + 3] = 255;   // Alpha (fully opaque)
        }

        // Create PNG
        const png = this.createPNG(pixelData, width, height);
        return png;
    },
    createPNG: function(data, width, height) {
        const signature = new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
        
        // IHDR chunk
        const ihdrData = new Uint8Array(13);
        const view = new DataView(ihdrData.buffer);
        view.setUint32(0, width, false);   // Width
        view.setUint32(4, height, false);  // Height
        ihdrData[8] = 8; // Bit depth
        ihdrData[9] = 6; // Color type (RGBA)
        ihdrData[10] = 0; // Compression method
        ihdrData[11] = 0; // Filter method
        ihdrData[12] = 0; // Interlace method
        const ihdrChunk = this.createChunk(ihdrData, 'IHDR');

        // IDAT chunk
        const idatData = this.compressData(data); // This should be a function that compresses pixel data
        const idatChunk = this.createChunk(idatData, 'IDAT');

        // IEND chunk
        const iendChunk = this.createChunk(new Uint8Array(0), 'IEND');

        // Combine all parts into one array
        const pngData = new Uint8Array(signature.length + ihdrChunk.length + idatChunk.length + iendChunk.length);
        pngData.set(signature, 0);
        pngData.set(ihdrChunk, signature.length);
        pngData.set(idatChunk, signature.length + ihdrChunk.length);
        pngData.set(iendChunk, signature.length + ihdrChunk.length + idatChunk.length);

        return pngData;
    },
    createChunk: function(data, type) {
        const length = data.length;
        const chunk = new Uint8Array(length + 12);
        const view = new DataView(chunk.buffer);

        view.setUint32(0, length, false); // Chunk length
        for (let i = 0; i < type.length; i++) {
            view.setUint8(4 + i, type.charCodeAt(i)); // Chunk type
        }
        chunk.set(data, 8); // Chunk data
        const crc = this.crc32(chunk.subarray(4, 8 + length));
        view.setUint32(length + 8, crc, false); // Chunk CRC

        return chunk;
    },
    crc32: function(data) {
        // CRC32 calculation (this is a placeholder, you would implement a proper CRC32 function)
        let crc = 0xFFFFFFFF;
        for (let i = 0; i < data.length; i++) {
            crc ^= data[i];
            for (let j = 0; j < 8; j++) {
                crc = (crc >>> 1) ^ (0xEDB88320 & -(crc & 1));
            }
        }
        return crc >>> 0;
    },
    compressData: function(data) {
        return data; // You would return compressed data here
    }
}
}
const files = {
	wav: [
		"83a9787d4cb6f3b7632b4ddfebf74367.wav",
		"0c4c4fdb048e7d4d2f8c67a9c3d85af0.wav",
		"2fdbf5af3fe9ce2b05787c9fee63e56a.wav",
		"959036cb4689ea2929a49ac03fce5e95.wav",
		"af5ab2a540e9403268e67637f595e887.wav",
		"c0d91e60caf164fe4bf4610f092a52b4.wav",
		"e93976eccf90624ceef39d80ebee8fc8.wav",
		"c3fae7c1ddde6532bf2b9a6192caed13.wav",
		"04c74a7f3c20a0b6e0209cc07613bae0.wav",
		"4fc1905664d2b80ad2f24b5c7ed83cd5.wav",
		"ade5cf8947606656488bdc8060c714f1.wav",
		"bf50ac26e8f6df270819bf9008919582.wav",
		"1ddf1a8893b568f9e6e9b640f3c54e02.wav",
		"9f1db362aabec8aba8fe31f93209abd2.wav",
		"73177387ce2d74655243380b6bd0bf4e.wav",
		"ad0bb13addd1c61168af3521bfc07342.wav",
		"9dd35c03fb9d76be2bab1f5c2e05df8b.wav",
		"cf4fa2caf6d89b079d2fc5b6524e6143.wav",
		"0e3727551fab5a8b1c0d3eda39205bc8.wav",
		"a97c4d5a4e41f2ab56d4e698023b834c.wav"
	],
	png: [
		"2e19abeec2f060432d234346f1a88e8d.png",
		"014e4b3cb45c77ac939ce20b790bfa1d.png",
		"82b6da7446390dcd56842382dd791e5d.png",
		"570368bf164fec9f6d331d8eb5976319.png",
		"a60acdcd0469b3463c648f24f853245d.png",
		"e6face0567e4ced1cef6b801da375aaf.png",
		"827785f559389602b96e94cf50e8699f.png",
		"2de8b22d2c99e0fd97f388af50adf9b5.png",
		"c98ce7d3be638326d790b91b5a4ed035.png",
		"29ba1e881f6da473cbdfeef4d90611be.png"
	]
}
async function wait(ms) {
	return new Promise(resolve => {
		setTimeout(() => resolve(), ms)
	})
}
async function generate(pr) {
	const zip = new JSZip();
	pr = pr || prompt("Enter in a prompt.")
	const projectData = {
		monitors: [],
		variables: [],
		extensions: [],
		targets: [
			{
				blocks: {},
				broadcasts: {},
				comments: {},
				variables: {},
				lists: {},
				costumes: [
					{
						assetId: files.png[0].split(".")[0],
						md5ext: files.png[0],
						dataFormat: ".png",
						name: "background",
						rotationCenterX: 0,
						rotationCenterY: 0
					}
				],
				sounds: [],
				name: "Stage",
				isStage: true,
				layerOrder: 0,
				currentCostume: 0,
				tempo: 0,
				textToSpeechLanguage: null,
				volume: 100,
				videoState: "on",
				videoTransparency: 50
			}
		],
		meta: {
			semver: "3.0.0",
			vm: "0.2.0",
			agent: "",
			platform: {
				name: "TurboWarp",
				url: "https://turbowarp.org"
			}
		}
	}
	if (/^(a\s*(digitally)?\s*static\s*(display|video|film)?)$/.test(pr)) {
		const staticFrames = 4 + Math.round(Math.random() * 5);
		zip.file(files.png[0], new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]));
		for (let i = 0; i < staticFrames; i++) {
			await wait(100)
			zip.file(files.png[1 + i], Assets.png.static())
			projectData.targets[0].costumes.push({
				assetId: files.png[i].split(".")[0],
				md5ext: files.png[i],
				dataFormat: ".png",
				name: "frame" + i,
				rotationCenterX: 0,
				rotationCenterY: 0
			})
		}
		await wait(100)
		projectData.targets[0].sounds.push({
			assetId: files.wav[0].split(".")[0],
			md5ext: files.wav[0],
			dataFormat: ".wav",
			format: "",
			name: "audio",
			rate: 48000,
			sampleLength: 134000
		})
		projectData.targets[0].blocks = {"d":{"opcode":"event_whenflagclicked","next":"a","parent":null,"inputs":{},"fields":{},"shadow":false,"topLevel":true,"x":0,"y":0},"b":{"opcode":"sound_playuntildone","next":null,"parent":"a","inputs":{"SOUND_MENU":[1,"e"]},"fields":{},"shadow":false,"topLevel":false},"e":{"opcode":"sound_sounds_menu","next":null,"parent":"b","inputs":{},"fields":{"SOUND_MENU":["audio",null]},"shadow":true,"topLevel":false},"a":{"opcode":"control_forever","next":null,"parent":"d","inputs":{"SUBSTACK":[2,"b"]},"fields":{},"shadow":false,"topLevel":false},"f":{"opcode":"event_whenflagclicked","next":"c","parent":null,"inputs":{},"fields":{},"shadow":false,"topLevel":true,"x":0,"y":20},"c":{"opcode":"control_forever","next":null,"parent":"f","inputs":{"SUBSTACK":[2,"g"]},"fields":{},"shadow":false,"topLevel":false},"g":{"opcode":"looks_nextbackdrop","next":null,"parent":"c","inputs":{},"fields":{},"shadow":false,"topLevel":false}}
		zip.file(files.wav[0], Assets.wav.static(3))
		zip.file("project.json", JSON.stringify(projectData))
		zip.generateAsync({ type: "blob" }).then(function(content) {
                	const link = document.createElement("a")
			link.href = URL.createObjectURL(content)
			link.download = "working.sb3"
			document.body.appendChild(link)
			link.click();
			document.body.removeChild(link)
                })
                .catch(function(err) {
                    console.error("Error generating ZIP:", err);
                });
	}
}
generate()
