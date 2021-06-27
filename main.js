const path = require('path');
const { app, BrowserWindow, Menu, ipcMain, Tray } = require('electron');
const Store = require('./Store');

// Set env
process.env.NODE_ENV = 'production';

const isDev = process.env.NODE_ENV !== 'production' ? true : false;
const isMac = process.platform === 'darwin' ? true : false;

let mainWindow;
let tray;

const store = new Store({
    configName: 'user-settings',
    defaults: {
        settings: {
            cpuOverload: 80,
            alertFrequency: 5,
        },
    },
});

function createMainWindow() {
    mainWindow = new BrowserWindow({
        title: 'SysTop',
        width: isDev ? 800 : 370,
        height: 500,
        icon: './assets/icons/icon.png',
        resizable: isDev ? true : false,
        show: false,
        webPreferences: {
            contextIsolation: false,
            nodeIntegration: true,
        },
    });

    mainWindow.webContents.on('dom-ready', () => {
        mainWindow.webContents.send('settings:get', store.get('settings'));
    });

    if (isDev) {
        mainWindow.webContents.openDevTools();
    }

    mainWindow.loadFile('./app/index.html');
}

app.on('ready', () => {
    createMainWindow();

    const mainMenu = Menu.buildFromTemplate(menu);
    Menu.setApplicationMenu(mainMenu);

    mainWindow.on('close', (e) => {
        if (!app.isQuitting) {
            e.preventDefault();
            mainWindow.hide();
        }

        return true;
    });

    // Create a tray
    const icon = path.join(__dirname, 'assets', 'icons', 'tray_icon.png');
    tray = new Tray(icon);
    tray.setToolTip('SysTop');
    tray.on('click', () => {
        if (mainWindow.isVisible() === true) {
            mainWindow.hide();
        } else {
            mainWindow.show();
        }
    });

    tray.on('right-click', () => {
        const contextMenu = Menu.buildFromTemplate([
            {
                label: 'Quit',
                click: () => {
                    app.isQuitting = true;
                    app.quit();
                },
            },
        ]);

        tray.popUpContextMenu(contextMenu);
    });
});

const menu = [
    ...(isMac ? [{ role: 'appMenu' }] : []),
    {
        role: 'fileMenu',
    },
    ...(isDev
        ? [
              {
                  label: 'Developer',
                  submenu: [
                      { role: 'reload' },
                      { role: 'forcereload' },
                      { type: 'separator' },
                      { role: 'toggledevtools' },
                  ],
              },
          ]
        : []),
];

// Set setiings
ipcMain.on('settings:set', (e, value) => {
    store.set('settings', value);
    mainWindow.webContents.send('settings:get', store.get('settings'));
});

app.on('window-all-closed', () => {
    if (!isMac) {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createMainWindow();
    }
});
