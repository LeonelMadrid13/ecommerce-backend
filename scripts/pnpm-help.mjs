#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const packageJsonPath = resolve(process.cwd(), 'package.json');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));

const scripts = packageJson.scripts ?? {};
const args = process.argv.slice(2);

const supportsColor =
  process.stdout.isTTY && process.env.NO_COLOR === undefined;

const ansi = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  magenta: '\x1b[35m',
};

const colorize = (text, color) =>
  supportsColor ? `${ansi[color]}${text}${ansi.reset}` : text;

const categoryFromScriptName = (name) => {
  if (name === 'start' || name.startsWith('start:')) return 'Start & Runtime';
  if (name === 'test') return 'Testing';
  if (name.startsWith('test:postman')) return 'Testing · Postman';
  if (name.startsWith('test:')) return 'Testing';
  if (name.startsWith('lint')) return 'Linting';
  if (name.includes('typecheck')) return 'Type Safety';
  if (name === 'verify:secure') return 'Quality Gates';
  if (name === 'build') return 'Build';
  if (name === 'format') return 'Formatting';
  if (name === 'seed') return 'Database';
  if (name === 'prepare') return 'Git Hooks';
  if (name === 'help') return 'Meta';
  return 'Other';
};

const categoryOrder = [
  'Start & Runtime',
  'Build',
  'Database',
  'Testing',
  'Testing · Postman',
  'Linting',
  'Type Safety',
  'Quality Gates',
  'Formatting',
  'Git Hooks',
  'Meta',
  'Other',
];

const groupedScripts = Object.entries(scripts).reduce((acc, entry) => {
  const [name] = entry;
  const category = categoryFromScriptName(name);
  if (!acc[category]) {
    acc[category] = [];
  }
  acc[category].push(entry);
  return acc;
}, {});

const descriptions = {
  build: 'Compila la app NestJS a /dist.',
  format: 'Formatea código TypeScript con Prettier.',
  start: 'Arranca la API en modo normal.',
  'start:container': 'Levanta servicios Docker en background.',
  seed: 'Ejecuta migración de desarrollo y seed de Prisma.',
  'start:dev': 'Arranca la API en modo desarrollo con watch.',
  'start:dev:all': 'Levanta Docker + seed + start:dev en un solo comando.',
  'start:debug': 'Arranca Nest en modo debug con watch.',
  'start:prod': 'Ejecuta la app compilada en modo producción.',
  lint: 'Corre ESLint y aplica fixes automáticos.',
  test: 'Ejecuta suite de tests unitarios (Jest).',
  'test:watch': 'Ejecuta tests en modo watch.',
  'test:cov': 'Ejecuta tests con coverage.',
  'test:debug': 'Ejecuta tests en modo debug e inspección.',
  'test:e2e': 'Ejecuta pruebas end-to-end.',
  'test:postman': 'Alias rápido de la suite smoke de Postman.',
  'test:postman:all': 'Corre smoke + contract + security (local).',
  'test:postman:smoke': 'Corre suite smoke en localhost.',
  'test:postman:contract': 'Corre suite contract en localhost.',
  'test:postman:security': 'Corre suite security en localhost.',
  'test:postman:ci:smoke': 'Suite smoke para CI (127.0.0.1, sin color).',
  'test:postman:ci:contract': 'Suite contract para CI (127.0.0.1, sin color).',
  'test:postman:ci:security': 'Suite security para CI (127.0.0.1, sin color).',
  'test:postman:ci': 'Corre todas las suites Postman en modo CI.',
  'test:postman:local': 'Levanta infra local + API + corre suites Postman.',
  prepare: 'Instala/activa hooks de Husky.',
  typecheck: 'Valida tipos TypeScript sin emitir archivos.',
  'lint:check': 'Corre ESLint en modo check (sin fix).',
  'verify:secure': 'Pipeline local de calidad + tests + auditoría de seguridad.',
  help: 'Muestra esta ayuda con scripts y descripciones.',
};

const scriptEntries = Object.entries(scripts);

const maxNameLength = Math.max(...scriptEntries.map(([name]) => name.length), 6);

console.log(`\n${colorize('📦 PNPM scripts disponibles', 'bold')}\n`);

const isFlatMode = args.includes('--flat');

if (isFlatMode) {
  for (const [name, command] of scriptEntries) {
    const paddedName = name.padEnd(maxNameLength, ' ');
    const description =
      descriptions[name] ?? 'Sin descripción (pendiente documentar).';
    const coloredName = colorize(paddedName, 'cyan');
    const coloredDescription = colorize(description, 'yellow');
    const coloredCommand = colorize(command, 'green');
    const arrow = colorize('↳', 'magenta');

    console.log(`- ${coloredName}  ${coloredDescription}`);
    console.log(`  ${arrow} ${coloredCommand}`);
  }
} else {
  for (const category of categoryOrder) {
    const entries = groupedScripts[category];
    if (!entries || entries.length === 0) continue;

    console.log(`${colorize(`## ${category}`, 'bold')}`);

    for (const [name, command] of entries) {
      const paddedName = name.padEnd(maxNameLength, ' ');
      const description =
        descriptions[name] ?? 'Sin descripción (pendiente documentar).';
      const coloredName = colorize(paddedName, 'cyan');
      const coloredDescription = colorize(description, 'yellow');
      const coloredCommand = colorize(command, 'green');
      const arrow = colorize('↳', 'magenta');

      console.log(`- ${coloredName}  ${coloredDescription}`);
      console.log(`  ${arrow} ${coloredCommand}`);
    }

    console.log('');
  }
}

console.log(
  `${colorize('Tip:', 'dim')} ejecutá con ${colorize('pnpm <script>', 'bold')} (ej: ${colorize('pnpm test:postman:all', 'cyan')})\n${colorize('Tip 2:', 'dim')} usá ${colorize('pnpm run help -- --flat', 'bold')} para vista plana\n`,
);
