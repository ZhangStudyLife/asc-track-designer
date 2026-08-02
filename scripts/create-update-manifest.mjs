import { createHash, createPrivateKey, sign } from 'node:crypto'
import { readFile, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const packageJson = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'))
const version = packageJson.version
const assetName = `ASC.${version}.exe`
const assetPath = path.join(root, 'release', assetName)
const changelog = await readFile(path.join(root, 'CHANGELOG.md'), 'utf8')
const sectionPattern = new RegExp(`^## ${version.replaceAll('.', '\\.')} - [^\\r\\n]+$`, 'm')
const section = sectionPattern.exec(changelog)
const sectionBody = section ? changelog.slice(section.index + section[0].length).replace(/^\r?\n/, '') : ''
const nextSection = sectionBody.search(/^## /m)
const notes = (nextSection >= 0 ? sectionBody.slice(0, nextSection) : sectionBody).trim()

if (!notes) throw new Error(`CHANGELOG.md 中缺少 ${version} 的更新说明`)

const privateKeySource = process.env.ASC_UPDATER_PRIVATE_KEY
if (!privateKeySource) throw new Error('缺少 ASC_UPDATER_PRIVATE_KEY')

const privateKeyPem = privateKeySource.includes('BEGIN PRIVATE KEY')
  ? privateKeySource
  : await readFile(path.resolve(privateKeySource), 'utf8')
const asset = await readFile(assetPath)
const assetStats = await stat(assetPath)
const publishedAt = process.env.ASC_UPDATER_PUBLISHED_AT || new Date().toISOString()
const minimumVersion = process.env.ASC_UPDATER_MINIMUM_VERSION || '2.2.0'
const tag = `v${version}`

const payload = Buffer.from(JSON.stringify({
  version,
  minimumVersion,
  publishedAt,
  title: `ASC Track Designer ${version}`,
  notes,
  notesUrl: `https://github.com/ZhangStudyLife/asc-track-designer/releases/tag/${tag}`,
  asset: {
    name: assetName,
    url: `https://github.com/ZhangStudyLife/asc-track-designer/releases/download/${tag}/${assetName}`,
    size: assetStats.size,
    sha256: createHash('sha256').update(asset).digest('hex'),
  },
}), 'utf8')

const envelope = {
  payload: payload.toString('base64'),
  signature: sign(null, payload, createPrivateKey(privateKeyPem)).toString('base64'),
}

const output = path.join(root, 'release', 'latest.json')
await writeFile(output, `${JSON.stringify(envelope, null, 2)}\n`)
console.log(output)
