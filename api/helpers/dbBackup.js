const fs = require("fs");
const exec = require("child_process").exec;
const debug = require("debug")("server:dbBackup");
const makeDir = require("make-dir");
const cron = require("cron").CronJob;
const _clone = require("lodash/clone");
const _isEmpty = require("lodash/isEmpty");

const defaultBackUpOptions = {
  user: "syncitt",
  pass: "syncitt@123",
  host: "52.65.124.36",
  port: "27017",
  database: "admin",
  removeOldBackup: true,
  keepLastDaysBackup: 7,
  hasCredentials: true,
  backupPath: "./database-backup/"
  // Local
  // user: "",
  // pass: "",
  // host: "localhost",
  // port: "27017",
  // database: "ypd-local",
  // removeOldBackup: true,
  // keepLastDaysBackup: 7,
  // hasCredentials: false,
  // backupPath: "./database-backup/"
};

exports.backup = async backupOptions => {
  const options = { ...defaultBackUpOptions, ...backupOptions };
  const currentDate = new Date();
  const backupDir = `${currentDate.getFullYear()}-${currentDate.getMonth() +
    1}-${currentDate.getDate()}`;
  const backupPath = `${options.backupPath}mongodump-${backupDir}`;

  const directoryCreated = await (async () => {
    try {
      const path = await makeDir(backupPath);
      return path;
    } catch (error) {
      console.log(error);
      return false;
    }
  })();

  if (_isEmpty(directoryCreated)) return false;

  let previousDate;
  let oldBackupDir;
  let oldBackupPath;
  if (options.removeOldBackup === true) {
    // Substract number of days to keep backup and remove old backup
    previousDate = _clone(currentDate);
    previousDate.setDate(previousDate.getDate() - options.keepLastDaysBackup);

    oldBackupDir = `${previousDate.getFullYear()}-${previousDate.getMonth() +
      1}-${previousDate.getDate()}`;
    oldBackupPath = `${options.backupPath}mongodump-${oldBackupDir}`;
  }

  const cmd = options.hasCredentials
    ? `mongodump --host ${options.host} --port ${options.port} --db ${options.database} --username ${options.user} --password ${options.pass}  --out ${backupPath}`
    : `mongodump --host ${options.host} --port ${options.port} --db ${options.database} --out ${backupPath}`;
  // --ssl --authenticationDatabase admin
  exec(cmd, (error, stdout, stderr) => {
    if (!_isEmpty(error)) return console.log({ error });
    if (options.removeOldBackup === false) return;
    if (!fs.existsSync(oldBackupPath)) return;
    exec(`rm -rf ${oldBackupPath}`, (error, stdout, stderr) => {
      if (!_isEmpty(error)) return console.log({ error });
    });
  });
};

exports.autoBackup = (
  backupOptions,
  cronTime = "0 1 * * *",
  onComlete = null,
  start = true,
  timeZone = "America/New_York"
) =>
  new cron(
    cronTime,
    () => exports.backup(backupOptions),
    onComlete,
    start,
    timeZone
  );
