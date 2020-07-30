#!/usr/bin/env node

const ftp = require("basic-ftp")
const { join, resolve } = require("path")
const { readdirSync, lstatSync } = require("fs")

/**
 * Entry point to sync localDir to remoteDir -> overrides files but leaves symlinks
 * @param {String} localDir
 * @param {String} remoteDir
 * @param {Object} opts options for basic-ftp client.access()
 */
async function syncUpload(localDir, remoteDir, opts) {
	const options = { ...opts }
	options.secure = opts.unsecure === false
	if (typeof opts.exclude === "string") options.exclude = [opts.exclude]
	if (opts.implicit) options.secure = "implicit"
	if (opts.ignoreCert) options.secureOptions = { rejectUnauthorized: false }

	console.log(options)
	const client = new ftp.Client()
	// client.ftp.verbose = true
	try {
		await client.access(options)
		const remoteDirList = await client.list(remoteDir)
		const localDirList = readdirSync(localDir)

		let i = 0,
			localAbs,
			remoteAbs,
			remoteStats,
			localStats
		for (; i < localDirList.length; i++) {
			if(options.exclude.some(name => localDirList[i].toLowerCase().indexOf(name.toLowerCase()) > -1)){
				console.log(`Ignoring File ${localDirList[i]}`)
				continue;
			}

			localAbs = join(localDir, localDirList[i])
			localStats = lstatSync(localAbs)
			remoteStats = remoteDirList.find(f => f.name == localDirList[i])
			if (!remoteStats) {
				console.log(`File not present on remote, ignored: ${localDirList[i]}`)
				continue
			}
			if (remoteStats.isSymbolicLink) {
				console.log(`File is symlinked, ignored: ${localDirList[i]}`)
				if (!localStats.isSymbolicLink()) {
					console.log(`File is symlinked on remote, but not locally: ${localAbs}`)
				}
				continue; // whole source dir is uploaded anyway, so ignore the symlinked
			} else {
				remoteAbs = resolve(remoteDir, localDirList[i])
			}
			if (localStats.isDirectory()) {
				console.log("Uploading dir: ",localAbs, remoteAbs)

				// await client.uploadFromDir(localAbs, remoteAbs)
			} else {
				console.log("Uploading file: ",localAbs, remoteAbs)

				// await client.uploadFrom(localAbs, remoteAbs)
			}
		}
	} catch (err) {
		console.log(err.message)
	}
	client.close()
}

const sade = require("sade")
const prog = sade("d7-upload [from] [to]", true)

prog
	.version("0.1.0")
	.option("--host, -H", "Host")
	.option("--user, -u", "User")
	.option("--password, -p", "Password")
	.option("--ignoreCert", "Ignore Certificate errors", false)
	.option("--unsecure", "Explicit FTPS over TLS", false)
	.option("--implicit", "if you need support for legacy implicit FTPS", false)
	.option("--exclude", "Exclude certain files. Uses lowercased .indexOf to match filename", [])
	.action(async (from, to, opts) => {
		if (opts.password === true) {
			const { prompt } = require("./io")
			opts.password = await prompt("Enter password:")
		}
		const pwd = process.cwd()
		await syncUpload(resolve(pwd, from), to, opts)
		process.exit()
	})

prog.parse(process.argv)
