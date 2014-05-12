var konsole = console;
var spawn = require('child_process').spawn;

var cfg = {
    pipeStdOut : true
};
var args = ["./test/phantom-control.js"];
var phantomProcess = spawn("phantomjs", args, {
    stdio: "pipe"
});
if (cfg.pipeStdOut) {
    phantomProcess.stdout.pipe(process.stdout);
    phantomProcess.stderr.pipe(process.stderr);
}
if (cfg.onData) {
    phantomProcess.stdout.on("data", cfg.onData);
}
phantomProcess.on("exit", cfg.onExit || function () {});
phantomProcess.on("error", cfg.onError || function () {});
