#!/bin/env node

const { join, resolve } = require("path");
const { readdirSync, lstatSync, copyFileSync, existsSync, mkdirSync } = require("fs");

/**
 * Copies files or directories recursively
 * @param {String} src
 * @param {String} dest
 */
function copyRecursiveSync(src, dest) {
  const exists = existsSync(src);
  const stats = exists && lstatSync(src);
  const isDirectory = exists && stats.isDirectory();
  if (isDirectory) {
      if(!existsSync(dest))
        mkdirSync(dest);

    readdirSync(src).forEach(function (childItemName) {
      copyRecursiveSync(
        join(src, childItemName),
        join(dest, childItemName)
      );
    });
  } else {
    copyFileSync(src, dest);
  }
}

const [, , projectDir, sourceDir] = process.argv;

if (!projectDir || !sourceDir) {
  console.log(`Update Drupal 7 project core with symlinked source.

    $ d7-update projectDir d7SourceCode

projectDir is assumed to contain a "source" directory.
d7SourceCode is the directory containing the updated core.
`);
  process.exit();
}

// resolve to absolute paths
const pDir = resolve(process.cwd(), projectDir);
const psDir = resolve(process.cwd(), projectDir, "source");
const sDir = resolve(process.cwd(), sourceDir);

// copy source
console.log(`Updating source of project ${pDir}`);
copyRecursiveSync(sAbs, psDir);

// read project dir
const dirList = readdirSync(pDir);
let i = 0,
	pAbs,
	sAbs,
  pStats;
for (; i < dirList.length; i++) {
  pAbs = join(pDir, dirList[i]);
  sAbs = join(sDir, dirList[i]);
	pStats = lstatSync(pAbs);
  // if a file/dir does not exist in new core source, its not relevant
  if (!existsSync(sAbs)) continue;
  if (pStats.isSymbolicLink()) {
    console.log(`symlinked source, skipped: ${dirList[i]}`);
  } else {
    console.log(`Copy to project: ${dirList[i]}`);
    // if it is NOT a symlink, copy to project directory
    copyRecursiveSync(sAbs, pAbs);
  }
}

console.log(`
Finished updating core
make sure to check and revert unwanted changes. e.g. .gitignore, .htaccess, etc.

upload files from source/ to server:

Via SSH:

    rsync -arvziK --delete ${pDir}/source/* user@host:/path/to/project/source/
    rsync -arvziK --delete --dry-run --exclude="*/" --exclude=".htaccess" ${pDir}/* user@host:/path/to/project/


Via FTP:

    curl -T  -u $USERNAME:$PASSWORD $SERVER/$DIR

git pull on server or upload other changes
`)

