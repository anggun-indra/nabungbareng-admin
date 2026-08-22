#!/usr/bin/env node

/**
 * NabungBareng Admin - Automated Version Bump & Build/Deploy Script
 * Automatically increments Admin Desktop PWA version, syncs Service Worker cache, builds, and deploys to Firebase Hosting.
 */

import fs from 'node:fs'
import path from 'node:path'
import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

const pkgPath = path.join(rootDir, 'package.json')
const versionTsPath = path.join(rootDir, 'src', 'version.ts')
const versionJsonPath = path.join(rootDir, 'public', 'version.json')
const swJsPath = path.join(rootDir, 'public', 'sw.js')

console.log('🚀 [Admin Deploy Script] Starting NabungBareng Admin PWA Deployment Process...\n')

// 1. Read existing version
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))
let currentVersion = pkg.version || '1.0.0'
let currentBuild = 100

if (fs.existsSync(versionJsonPath)) {
  try {
    const vJson = JSON.parse(fs.readFileSync(versionJsonPath, 'utf8'))
    if (vJson.version) currentVersion = vJson.version
    if (vJson.build) currentBuild = Number(vJson.build)
  } catch (e) {
    console.warn('Notice reading version.json:', e.message)
  }
}

// 2. Increment Version and Build Number
const args = process.argv.slice(2)
const type = args[0] && !args[0].startsWith('--') ? args[0] : 'patch' // 'patch' | 'minor' | 'major'
const parts = currentVersion.split('.').map((p) => parseInt(p, 10) || 0)

while (parts.length < 3) parts.push(0)

if (type === 'major') {
  parts[0] += 1
  parts[1] = 0
  parts[2] = 0
} else if (type === 'minor') {
  parts[1] += 1
  parts[2] = 0
} else {
  parts[2] += 1 // default patch bump
}

const nextVersion = parts.join('.')
const nextBuild = currentBuild + 1
const timestamp = new Date().toISOString()
const isForce = args.includes('--force')
const customNotes = args.slice(1).find((a) => !a.startsWith('--'))
const releaseNotes = customNotes || `Admin PWA Update v${nextVersion} (Build ${nextBuild})`

console.log(`📦 Bumping Admin Version: v${currentVersion} (Build ${currentBuild}) ➔ v${nextVersion} (Build ${nextBuild})`)
console.log(`📅 Timestamp: ${timestamp}`)
console.log(`⚠️ Mandatory Force Update: ${isForce ? 'YES' : 'NO'}`)
console.log(`📝 Release Notes: "${releaseNotes}"\n`)

// 3. Update package.json
pkg.version = nextVersion
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8')
console.log('✅ Updated package.json')

// 4. Update src/version.ts
const versionTsContent = `// NabungBareng Admin Portal PWA Version Source of Truth
// Generated and updated automatically on deployment

export const APP_VERSION = '${nextVersion}'
export const BUILD_NUMBER = ${nextBuild}
export const BUILD_TIMESTAMP = '${timestamp}'
export const APP_RELEASE_NOTES = '${releaseNotes.replace(/'/g, "\\'")}'
`
fs.writeFileSync(versionTsPath, versionTsContent, 'utf8')
console.log('✅ Updated src/version.ts')

// 5. Update public/version.json
const versionJsonContent = {
  version: nextVersion,
  build: nextBuild,
  updatedAt: timestamp,
  releaseNotes,
  force: isForce,
}
fs.writeFileSync(versionJsonPath, JSON.stringify(versionJsonContent, null, 2) + '\n', 'utf8')
console.log('✅ Updated public/version.json')

// 6. Update Service Worker Cache Name in public/sw.js
if (fs.existsSync(swJsPath)) {
  let swContent = fs.readFileSync(swJsPath, 'utf8')
  swContent = swContent.replace(
    /const CACHE_NAME = 'nabungadmin-v[^']+'/,
    `const CACHE_NAME = 'nabungadmin-v${nextVersion}'`
  )
  fs.writeFileSync(swJsPath, swContent, 'utf8')
  console.log(`✅ Updated public/sw.js CACHE_NAME to 'nabungadmin-v${nextVersion}'`)
}

// 7. Run Build
console.log('\n🔨 Compiling & Building Admin Bundle (npm run build)...')
try {
  execSync('npm run build', { cwd: rootDir, stdio: 'inherit' })
  console.log('✅ Build completed successfully.')
} catch (buildErr) {
  console.error('❌ Build failed! Aborting deployment.')
  process.exit(1)
}

// 8. Deploy to Firebase Hosting (nabungbareng-admin)
console.log('\n🚀 Deploying Admin to Firebase Hosting (site: nabungbareng-admin)...')
try {
  execSync('firebase deploy --only hosting:nabungbareng-admin', { cwd: rootDir, stdio: 'inherit' })
  console.log('\n🎉 ==============================================')
  console.log(`🎉 ADMIN DEPLOYMENT SUCCESSFUL! PWA v${nextVersion} (Build ${nextBuild}) IS LIVE!`)
  console.log('🌐 Hosting URL: https://nabungbareng-admin.web.app')
  console.log('🌐 Console: https://console.firebase.google.com/project/vms-25/overview')
  console.log('🎉 ==============================================\n')
} catch (deployErr) {
  console.error('❌ Firebase deploy failed:', deployErr.message)
  process.exit(1)
}
