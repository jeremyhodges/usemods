import { resolve, extname, basename, join } from 'path'
import { watch, readFileSync, writeFileSync, copyFileSync } from 'fs'

// Paths
const srcPath = resolve('src')
// const distPath = resolve('dist')
const nuxtModulePath = resolve('nuxt-module')
const websitePath = resolve('nuxt-web')

// Functions
const functionPattern = /\/\*\*[\s\S]*?\*\/\s*(export\s+function\s+([a-zA-Z0-9_]+)\s*\((.*?)\)\s*:\s*([\w<>,[\]\s]+(?:\{[\s\S]*?})?)?)/gms
const metadataPattern = /\s+(title|description|lead):\s+([^\r\n]*)/g
const jsdocPattern = /\/\*\*([\s\S]*?)\*\//g

function generateMarkdown(file, name) {
  const content = readFileSync(file, 'utf8')
  const metadata = Object.fromEntries([...content.matchAll(metadataPattern)].map((match) => [match[1], match[2]]))

  // Copy file to Website
  copyFileSync(file, join(websitePath, 'utils', basename(file)))
  copyFileSync(file, join(nuxtModulePath, 'src/runtime/utils', basename(file)))

  let markdown = ''

  // Create Frontmatter
  markdown += '---\n'
  markdown += `id: ${basename(file, extname(file))}\n`
  markdown += `title: ${metadata.title}\n`
  markdown += `description: ${metadata.description}\n`
  markdown += `lead: ${metadata.lead}\n`
  markdown += '---\n'

  // Page Title
  markdown += '::page-title\n'
  markdown += `# ${metadata.title}\n`
  markdown += `${metadata.description}\n`
  markdown += '::\n\n'

  // Functions
  const functions = [...content.matchAll(functionPattern)]

  for (const match of functions) {
    const [full] = match.slice(0)
    const [, name, params] = match.slice(1)
    const jsdoc = full.match(jsdocPattern)[0]
    const description = jsdoc.replace(/\/\*\*|\*\/|\*/g, '').trim()

    markdown += `::page-function{name="${name}" description="${description}" params="${params}" }\n`
    markdown += `:::${name}\n`
    markdown += ':::\n'
    markdown += '::\n\n'
  }

  writeFileSync(join(websitePath, 'content/2.docs', `${name}.md`), markdown)
}

// Generate Markdown for each File
function generateAll() {
  const files = ['actions', 'formatters', 'modifiers', 'detections', 'generators', 'numbers', 'data', 'validators', 'animations', 'goodies']
  files.forEach((file, index) => generateMarkdown(join(srcPath, `${file}.ts`), `${index + 1}.${file}`))
}

// Run Once
generateAll()

// Watch for Changes
watch(srcPath, { recursive: true }, async (event, filename) => {
  if (filename.endsWith('.ts')) {
    console.log(`Detected ${event} in ${filename}`)
    generateAll()
  }
})
