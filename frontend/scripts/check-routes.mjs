#!/usr/bin/env node
/**
 * Guardas estáticas do frontend (rodam antes do build):
 *  1. Todo destino de `router.push` / `navigateTo` / `<NuxtLink to>` aponta
 *     para uma rota que existe em `pages/`.
 *  2. `pages/cases/[id]/dossier.vue` não pode voltar a ter IDs de atributo
 *     hardcoded — as opções vêm do backend.
 *
 * Sai com código ≠ 0 em qualquer violação.
 */
import { readdirSync, readFileSync, statSync } from 'fs'
import { join, relative, sep } from 'path'
import { fileURLToPath } from 'url'

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..')
const pagesDir = join(root, 'pages')

function walk(dir) {
  const out = []
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) out.push(...walk(p))
    else if (name.endsWith('.vue')) out.push(p)
  }
  return out
}

// pages/cases/[id]/map.vue  →  /cases/:id/map   (regex)
function pageToRouteRegex(file) {
  let rel = relative(pagesDir, file).split(sep).join('/').replace(/\.vue$/, '')
  if (rel === 'index') return /^\/$/
  rel = rel.replace(/\/index$/, '')
  const pat = rel
    .split('/')
    .map((seg) => (seg.startsWith('[') ? '[^/]+' : seg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
    .join('/')
  return new RegExp(`^/${pat}/?$`)
}

const pageFiles = walk(pagesDir)
const routeRegexes = pageFiles.map(pageToRouteRegex)
const ROUTE_LITERAL =
  /(?:router\.(?:push|replace)|navigateTo)\(\s*(?:{\s*path:\s*)?[`'"]([^`'"]+)[`'"]|<NuxtLink[^>]*\bto=["']([^"']+)["']/g

let errors = 0
const allVue = walk(join(root, 'pages')).concat(
  walk(join(root, 'components')),
  walk(join(root, 'layouts')),
)

for (const file of allVue) {
  const src = readFileSync(file, 'utf8')
  const rel = relative(root, file).split(sep).join('/')

  let m
  while ((m = ROUTE_LITERAL.exec(src))) {
    const raw = m[1] || m[2]
    if (!raw || raw.startsWith('http')) continue
    // normaliza template-literals e query/hash
    const path = raw.replace(/\$\{[^}]+\}/g, 'x').split(/[?#]/)[0].replace(/\/$/, '') || '/'
    if (!routeRegexes.some((re) => re.test(path) || re.test(path + '/'))) {
      console.error(`✗ ${rel}: rota inexistente → "${raw}"`)
      errors++
    }
  }
}

// Guard 2: dossier sem IDs hardcoded
const dossier = join(pagesDir, 'cases', '[id]', 'dossier.vue')
try {
  const src = readFileSync(dossier, 'utf8')
  const hardcoded = /\{\s*id:\s*\d+\s*,\s*label:\s*['"]/.test(src)
  if (hardcoded) {
    console.error('✗ dossier.vue: IDs de atributo hardcoded — devem vir de fetchCaseAttributes()')
    errors++
  }
} catch {
  /* arquivo pode ter sido movido */
}

if (errors) {
  console.error(`\ncheck-routes: ${errors} violação(ões)`)
  process.exit(1)
}
console.log(`check-routes: OK (${pageFiles.length} rotas, ${allVue.length} arquivos verificados)`)
