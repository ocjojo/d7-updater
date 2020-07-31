#!/usr/bin/env node

const ftp = require("basic-ftp")
const { join, resolve } = require("path")
const { readdirSync, lstatSync, existsSync } = require("fs")

let log = () => {}
const logErr = err => console.log(err.message)

/**
 * Entry point to sync localDir to remoteDir -> overrides files but leaves symlinks
 * @param {String} localDir
 * @param {String} remoteDir
 * @param {Object} opts options for basic-ftp client.access()
 */
async function syncUpload(localDir, remoteDir, opts) {
	// prepare options
	const options = { ...opts }
	options.secure = opts.unsecure === false
	if (typeof opts.exclude === "string") options.exclude = [opts.exclude]
	if (opts.implicit) options.secure = "implicit"
	if (opts.ignoreCert) options.secureOptions = { rejectUnauthorized: false }

	log(options)
	const client = new ftp.Client()
	client.ftp.verbose = opts.verbose !== false
	try {
		await client.access(options)
		const remoteDirList = await client.list(remoteDir)
		const localSourceDir = resolve(localDir, "source")
		const localSourceDirList = readdirSync(localSourceDir)

		if(!existsSync(localSourceDir)) {
			console.error("You need to have a source dir with d7 core (locally). Remote this is not a requirement.")
			return;
		}

		// always update source dir
		if (remoteDirList.some(name => name === "source")) {
			console.log(`Uploading source dir: ${localSourceDir}`)
			await client.uploadFromDir(localSourceDir, resolve(remoteDir, "source"))
		}

		for (let i = 0; i < localSourceDirList.length; i++) {
			if (options.exclude.some(name => localSourceDirList[i].toLowerCase().indexOf(name.toLowerCase()) > -1)) {
				console.log(`Ignoring File ${localSourceDirList[i]}`)
				continue
			}

			const localAbs = join(localDir, localSourceDirList[i])
			const localSourceAbs = join(localSourceDir, localSourceDirList[i])

			if (!existsSync(localAbs)) {
				console.log(`Not present locally: ${localAbs}`)
			}

			const remoteStats = remoteDirList.find(f => f.name == localSourceDirList[i])
			if (!remoteStats) {
				console.log(`Not present on remote, ignored: ${localSourceDirList[i]}`)
				continue
			}

			if (remoteStats.isSymbolicLink) {
				console.log(`Remote is symlinked, ignored: ${localSourceDirList[i]}`)

				const localStats = lstatSync(localAbs)
				if (!localStats.isSymbolicLink()) {
					console.log(`File is symlinked on remote, but not locally: ${localAbs}`)
				}

				continue // whole source dir is uploaded anyway, so ignore the symlinked
			}

			const remoteAbs = resolve(remoteDir, localSourceDirList[i])
			const localStats = lstatSync(localSourceAbs)
			if (localStats.isDirectory()) {
				console.log("Uploading dir: ", localSourceAbs, remoteAbs)

				await client.uploadFromDir(localSourceAbs, remoteAbs).catch(logErr)
			} else {
				console.log("Uploading file: ", localSourceAbs, remoteAbs)

				await client.uploadFrom(localSourceAbs, remoteAbs).catch(logErr)
			}
		}
	} catch (err) {
		logErr(err)
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
	.option("--verbose", "Verbose output", false)
	.action(async (from, to, opts) => {
		if (opts.password === true) {
			const { prompt } = require("./io")
			opts.password = await prompt("Enter password:")
		}
		if (opts.verbose) {
			log = console.log
		}
		const pwd = process.cwd()
		await syncUpload(resolve(pwd, from), to, opts)
		process.exit()
	})

prog.parse(process.argv)
