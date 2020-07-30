const readline = require("readline")

const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout,
	terminal: false,
})

let listener = null

rl.on("line", function (line) {
	if (listener) listener.resolve(line)
})

function listen() {
	if (listener) listener.reject()

	return new Promise((res, rej) => {
		listener = {
			reject: () => {
				rej()
				listener = null
			},
			resolve: line => {
				res(line)
				listener = null
			},
		}
	})
}

module.exports = {
	prompt(text) {
		console.log(text)
		return listen()
	},
}
