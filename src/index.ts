import { app } from 'electron';
import fs from 'fs';
import path from 'path';
import Registry from 'winreg';
import crypto from 'crypto';

function getExtensions(): Promise<string[]> {
	return new Promise((resolve, reject) => {

		const extensions: string[] = [];

		const rKey = new Registry({
			hive: Registry.HKCR,
			key: ""
		});
		rKey.keys(async (err, result) => {
			if (err) {
				return reject(err);
			}
			for (let key of result) {
				if (!key.key.startsWith("\\.")) {
					console.log(`Skipping ${key.key}`)
					continue;
				}
				extensions.push(key.key.substring(2));
			}
			resolve(extensions);
		});

	});
}

app.whenReady().then(async () => {
	const extensions = await getExtensions();
	const outDir = path.join(__dirname, "..", "out");

	if (!fs.existsSync(outDir)) {
		fs.mkdirSync(outDir);
	}

	console.log("Fetching icons for the following extensions", extensions);


	const extensionDictionary: { [key: string]: string[] } = {};

	for (let ex of extensions) {
		await app.getFileIcon(`.${ex}`)
		.then(image => {
			const rawPng = image.toPNG();
			const hash = crypto.createHash("sha256");
			hash.update(rawPng);
			const newHash = hash.digest('hex');

			if (typeof extensionDictionary[newHash] === "undefined") {
				extensionDictionary[newHash] = [];
			}
			extensionDictionary[newHash].push(ex);
	
			const finalDir = path.join(outDir, `${newHash}.png`);
	
			if (!fs.existsSync(finalDir)) {
				fs.writeFileSync(finalDir, rawPng);
			}
		});
	}


	fs.writeFileSync(path.join(outDir, "extensionDictionary.json"), JSON.stringify(extensionDictionary));

	console.log("Created Icons");
	process.exit(0);
})