"use strict";

if (require("electron-squirrel-startup")) return;

// const installExtension = require('electron-devtools-installer').default;
// const { REACT_DEVELOPER_TOOLS } = require('electron-devtools-installer');

const { app, BrowserWindow, Menu, ipcMain, autoUpdater } = require("electron");
app.commandLine.appendSwitch("disable-renderer-backgrounding");

const appVersion = require("./package.json").version;
var os = require("os");

// adds debug features like hotkeys for triggering dev tools and reload
require("electron-debug")();
require('electron-debug')({enabled: true}); // for debug builds

// prevent window being garbage collected
let mainWindow;
var appReady = false;
var appQuitting = false;

if (os.platform() == "darwin") {
	global.ffmpeg = app.getAppPath() + ".unpacked/bundled/ffmpeg";
	var updateFeed = "https://www.doodly.net/updates/osx/" + appVersion;
} else if (os.platform() == "win32") {
	global.ffmpeg = app.getAppPath() + ".unpacked\\bundled\\ffmpeg.exe";
	var updateFeed = "https://s3.amazonaws.com/doodly/updates/latest/" + (os.arch() == "x64" ? "win64" : "win32");
}

function onClosed() {
	// dereference the window
	// for multiple windows store them in an array
	mainWindow = null;
}

function createMainWindow() {
	const win = new BrowserWindow({
		title: "Doodly" + " v" + appVersion,
		width: 1200,
		height: 800,
		minWidth: 1024,
		minHeight: 700
	});

	win.maximize();
	win.loadURL(`file://${__dirname}/index.html`);
	win.on("closed", onClosed);

	// installExtension(REACT_DEVELOPER_TOOLS)
	//     .then((name) => console.log(`Added Extension:  ${name}`))
	//     .catch((err) => console.log('An error occurred: ', err));

	return win;
}

app.on("before-quit", () => {
	appQuitting = true;
});

app.on("window-all-closed", () => {
	if (process.platform !== "darwin" || appQuitting) {
		app.quit();
	}
});

app.on("activate", () => {
	if (!mainWindow && appReady) mainWindow = createMainWindow();
});

app.on("ready", () => {
	appReady = true;
	mainWindow = createMainWindow();
	if (process.env.NODE_ENV !== "development") {
		autoUpdater.setFeedURL(updateFeed);

		// autoUpdater.checkForUpdates();
		// hacky fix until electron 1.3.8, or whatever comes after 1.3.7 # fixes couldn't aquire lock on windows
		if (process.argv[1] == "--squirrel-firstrun") {
			setTimeout(() => {
				autoUpdater.checkForUpdates();
			}, 300000); // 5 minutes
		} else {
			autoUpdater.checkForUpdates();
		}
	}
	Menu.setApplicationMenu(Menu.buildFromTemplate(menuTemplate));
});

const menuTemplate = [
	{
		label: "Doodly",
		submenu: [
			{
				label: "Quit",
				accelerator: "Command+Q",
				click: function() {
					app.quit();
				}
			}
		]
	},
	{
		label: "Edit",
		submenu: [
			{
				role: "cut"
			},
			{
				role: "copy"
			},
			{
				role: "paste"
			},
			{
				role: "selectall"
			}
		]
	},
	{
		role: "window",
		submenu: [
			{
				role: "minimize"
			},
			{
				role: "close"
			}
		]
	}
];

autoUpdater.on("checking-for-update", () => {
	console.log("checking-for-update");
});

autoUpdater.on("update-available", () => {
	console.log("update-available");
});

autoUpdater.on("update-downloaded", (event, update_info) => {
	console.log("update-downloaded");
	mainWindow.webContents.send("update-available", update_info);
});

ipcMain.on("apply-update", (event, args) => {
	autoUpdater.quitAndInstall();
});

ipcMain.on("request-focus", (event, args) => {
	if (os.platform() == "darwin") app.dock.bounce("critical");
});
