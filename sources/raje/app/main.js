/**
 * 
 * Main process of Electron.js 
 */

const electron = require('electron')
const app = electron.app

global.ROOT = __dirname
global.ASSETS_DIRECTORIES = [
  `${global.ROOT}/js`,
  `${global.ROOT}/css`,
  `${global.ROOT}/fonts`,
  `${global.ROOT}/img`
]
global.IMAGE_TEMP = global.ASSETS_DIRECTORIES[3]

const {
  BrowserWindow,
  ipcMain,
  dialog,
  Menu
} = electron

const url = require('url')
const path = require('path')
const windowManager = require('electron-window-manager')

const TEMPLATE = 'template.html'
const SPLASH = 'splash.html'

const RAJE_FS = require('./modules/raje_fs.js')
const RAJE_MENU = require('./modules/raje_menu.js')

const EDITOR_WINDOW = 'editor'
const SPLASH_WINDOW = 'splash'

const splash = {

  /**
   * Init the windowmanager and open the splash window
   */
  openSplash: function () {

    // Init the window manager
    windowManager.init()

    // Get the url to the splash window
    let splashWindowUrl = url.format({
      pathname: path.join(__dirname, SPLASH),
      protocol: 'file:',
      slashes: true
    })

    // Open the splash window
    windowManager.open(SPLASH_WINDOW, 'RAJE', splashWindowUrl, null, {
      height: 400,
      width: 500,
      resizable: false,
      movable: true,
      fullscreenable: false
    })

    // Set the menu 
    Menu.setApplicationMenu(Menu.buildFromTemplate(RAJE_MENU.getSplashMenu()))
  },

  /**
   * Close the splash window
   */
  closeSplash: function () {

    windowManager.close(SPLASH_WINDOW)
  },

  /**
   * Open the editable template  
   */
  openEditor: function (size) {

    // Get the URL to open the editor
    let editorWindowUrl = url.format({
      pathname: path.join(__dirname, TEMPLATE),
      protocol: 'file:',
      slashes: true
    })

    // Open the new window with the size given by the splash window
    windowManager.open(EDITOR_WINDOW, 'RAJE', editorWindowUrl, null, {
      width: size.width,
      height: size.height,
      resizable: true
    })

    // Set the menu 
    Menu.setApplicationMenu(Menu.buildFromTemplate(RAJE_MENU.getEditorMenu()))
  },

  /**
   * Return true to let know that the client has Electron behind
   */
  isApp: function () {
    return true
  }
}

// Event called when the app is ready
app.on('ready', splash.openSplash)

app.on('quit', RAJE_FS.removeImageTempFolder)

/**
 * This method is used to call the function that 
 * opens the editor with the template
 * 
 * Called by the splash window
 */
ipcMain.on('newArticle', (event, arg) => {
  splash.openEditor(arg)
  splash.closeSplash()
})

/**
 * This method is used to let know to the client that
 * the HTML file it's opened by Electron (not by a browser)
 * 
 * If nothing is returned, tinymce isn't initialised
 * 
 * Called from the renderer process
 */
ipcMain.on('isAppSync', (event, arg) => {
  event.returnValue = splash.isApp()
})

/**
 * This method is used to save the current document 
 * calling the save dialog (in order to select where the document has to be saved)
 * 
 * Then The article is saved by the raje_fs module
 * 
 * After the save process, the url is updated loading the saved file url
 * 
 * Called from the renderer process
 */
ipcMain.on('saveDocumentSync', (event, arg) => {

  // Show save dialog here
  let savePath = dialog.showSaveDialog(windowManager.get(EDITOR_WINDOW), {
    defaultPath: arg.title
  })

  // If the user select a folder, the article is saved for the first time
  if (savePath) {
    RAJE_FS.saveArticleFirstTime(savePath, arg.document, (err, message) => {
      if (err)
        return event.returnValue = `Error: ${err}`

      // Create the URL with the right protocol
      let editorWindowUrl = url.format({
        pathname: path.join(savePath, TEMPLATE),
        protocol: 'file:',
        slashes: true
      })

      //Update the rendered HTML file
      //windowManager.get(EDITOR_WINDOW).loadURL(editorWindowUrl)

      event.returnValue = message
    })
  } else
    event.returnValue = null
})


/**
 * This method is used to select the image to import in the document
 * 
 * When the image is selected it's saved inside the image temporary folder 
 * (which is deleted when the app is closed)
 */
ipcMain.on('selectImageSync', (event, arg) => {

  // Show the open dialog with options
  let imagePath = dialog.showOpenDialog({
    filters: [{
      name: 'Images',
      extensions: ['jpg', 'png']
    }]
  })

  // If a file is selected
  if (imagePath[0]) {

    // Save the image in the temporary folder
    RAJE_FS.saveImageTemp(imagePath[0], (err, result) => {

      if (err) return event.returnValue = err

      return event.returnValue = result
    })
  } else
    return event.returnValue = null
})