// Builds the town in Node the same way the page does, for the report and history scripts.
import { readFile } from 'node:fs/promises'
import { parse } from 'yaml'
import { buildTown } from '../../src/town/build.ts'

const read = async (path) => readFile(new URL(`../../${path}`, import.meta.url), 'utf8')
export const snapshot = JSON.parse(await read('src/data/snapshot.json'))
export const config = parse(await read('town.config.yaml'))
export const plain = JSON.parse(await read('content/plain-words.json'))
export const town = buildTown(snapshot, config, plain)
