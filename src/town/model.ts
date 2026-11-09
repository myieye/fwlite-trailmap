import config from '../../town.config.yaml'
import snapshot from '../data/snapshot.json'
import plainWords from '../../content/plain-words.json'
import { buildTown, type Snapshot, type TownConfig } from './build'
import type { Town } from './types'

export const town: Town = buildTown(snapshot as unknown as Snapshot, config as TownConfig, plainWords as Record<string, { title: string }>)
