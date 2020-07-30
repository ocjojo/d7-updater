# Drupal 7 Update scripts

Scripts to automate updating drupal 7 core in projects and upload them via FTP.  
It supports a symlinked core within the `source` directory.

## Install

Requires node, npm and bash

```bash
npm i -g ocjojo/d7-updater
```

## Usage

```bash
# Download and extract new source
d7-update ~/dev/project1/ . # assumes current dir is the new drupal7 source

d7-upload /local/path /remote/path -H example.com -u username -p --exclude ".htaccess"
```

## Automation

This can be automated further with a shell script. E.g. `upload.sh`

```bash
#!/bin/env bash

usage()
{
    echo "usage: upload.sh [project]"
}

case $1 in
	p1 | project1 )
		d7-upload /local/path /remote/path -H example.com -u username -p --exclude ".htaccess"
		;;
  p1 | project1 )
		d7-upload /local/path /remote/path -H example.com -u username -p --exclude ".htaccess" --ignoreCert
    ;;
	-h | --help )
		usage
		exit
		;;
	* )
		usage
		exit 1
esac
```

## License

MIT © [Lukas Ehnle](https://ehnle.dev)
