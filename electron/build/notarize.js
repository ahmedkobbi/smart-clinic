// Smart Clinic — macOS Notarization
// Per master prompt §6.3: supply-chain integrity, code signing
// Runs after the app is signed but before it's packaged into DMG

const { notarize } = require('@electron/notarize')

module.exports = async function (context) {
  const { electronPlatformName, appOutDir } = context

  // Only notarize on macOS
  if (electronPlatformName !== 'darwin') {
    return
  }

  // Skip if notarization credentials are not set
  if (!process.env.APPLE_ID || !process.env.APPLE_APP_SPECIFIC_PASSWORD) {
    console.log('[NOTARIZE] Skipping — APPLE_ID or APPLE_APP_SPECIFIC_PASSWORD not set')
    return
  }

  console.log('[NOTARIZE] Notarizing app...')

  const appName = context.packager.appInfo.productFilename

  await notarize({
    tool: 'notarytool',
    appPath: `${appOutDir}/${appName}.app`,
    appleId: process.env.APPLE_ID,
    appleIdPassword: process.env.APPLE_APP_SPECIFIC_PASSWORD,
    teamId: process.env.APPLE_TEAM_ID,
  })

  console.log('[NOTARIZE] Done — app notarized successfully')
}
