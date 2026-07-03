const fs = require('fs')
const path = require('path')

const root = process.cwd()
const standaloneDir = path.join(root, '.next', 'standalone')

function copyDir(source, target) {
  if (!fs.existsSync(source)) return
  fs.mkdirSync(target, { recursive: true })

  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const from = path.join(source, entry.name)
    const to = path.join(target, entry.name)

    if (entry.isDirectory()) {
      copyDir(from, to)
    } else {
      fs.copyFileSync(from, to)
    }
  }
}

if (!fs.existsSync(standaloneDir)) {
  throw new Error('Next standalone output was not found. Check next.config.js output setting.')
}

copyDir(path.join(root, '.next', 'static'), path.join(standaloneDir, '.next', 'static'))
copyDir(path.join(root, 'public'), path.join(standaloneDir, 'public'))
