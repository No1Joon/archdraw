import type Anthropic from '@anthropic-ai/sdk'
import type { IconPack } from '@archdraw/core'
import { describe, expect, it } from 'vitest'
import { DEFAULT_MODEL, flatDiagramJsonSchema, fromPrompt } from './index.js'

const pack: IconPack = {
  provider: 'test',
  icons: {
    'elastic-container-service': { viewBox: '0 0 48 48', content: '<rect/>' },
    'relational-database-service': { viewBox: '0 0 48 48', content: '<circle/>' },
  },
  aliases: { ecs: 'elastic-container-service', rds: 'relational-database-service' },
}

const good = {
  provider: 'test',
  nodes: [
    { id: 'api', type: 'ecs', label: 'API' },
    { id: 'db', type: 'rds', label: 'DB' },
  ],
  edges: [{ from: 'api', to: 'db' }],
}

/** Replays canned responses and records what it was asked. */
function stubClient(replies: unknown[]) {
  const calls: Anthropic.MessageCreateParams[] = []
  const client = {
    messages: {
      create: async (params: Anthropic.MessageCreateParams) => {
        calls.push(params)
        const body = replies[calls.length - 1]
        return { content: [{ type: 'text', text: JSON.stringify(body) }], stop_reason: 'end_turn' }
      },
    },
  }
  return { client: client as unknown as Anthropic, calls }
}

describe('fromPrompt', () => {
  it('returns the validated document on the first attempt', async () => {
    const { client, calls } = stubClient([good])
    const result = await fromPrompt('two services', { icons: pack, client })

    expect(result.attempts).toBe(1)
    expect(result.model).toBe(DEFAULT_MODEL)
    expect(result.ir.nodes.map((n) => n.id)).toEqual(['api', 'db'])
    expect(calls).toHaveLength(1)
  })

  it('offers only the resolver vocabulary to the model', async () => {
    const { client, calls } = stubClient([good])
    await fromPrompt('two services', { icons: pack, client })

    const system = String(calls[0]?.system)
    for (const name of ['ecs', 'rds', 'elastic-container-service']) {
      expect(system).toContain(name)
    }
  })

  it('feeds a validation error back and succeeds on the retry', async () => {
    const dangling = {
      provider: 'test',
      nodes: [{ id: 'a', type: 'ecs' }],
      edges: [{ from: 'a', to: 'ghost' }],
    }
    const { client, calls } = stubClient([dangling, good])
    const result = await fromPrompt('two services', { icons: pack, client })

    expect(result.attempts).toBe(2)
    // The correction turn must carry the message the model has to act on.
    const retry = calls[1]?.messages ?? []
    expect(JSON.stringify(retry)).toContain('ghost')
  })

  it('retries an unknown icon slug, not just a schema error', async () => {
    const badSlug = { provider: 'test', nodes: [{ id: 'a', type: 'nope' }] }
    const { client, calls } = stubClient([badSlug, good])
    const result = await fromPrompt('one service', { icons: pack, client })

    expect(result.attempts).toBe(2)
    expect(JSON.stringify(calls[1]?.messages)).toContain('nope')
  })

  it('gives up after maxAttempts', async () => {
    const bad = { provider: 'test', nodes: [{ id: 'a', type: 'nope' }] }
    const { client, calls } = stubClient([bad, bad])
    await expect(
      fromPrompt('one service', { icons: pack, client, maxAttempts: 2 }),
    ).rejects.toThrow(/2 attempts/)
    expect(calls).toHaveLength(2)
  })

  it('appends the caller system suffix', async () => {
    const { client, calls } = stubClient([good])
    await fromPrompt('x', { icons: pack, client, systemSuffix: 'HOUSE RULE 42' })

    expect(String(calls[0]?.system)).toContain('HOUSE RULE 42')
  })
})

describe('flatDiagramJsonSchema', () => {
  it('is the flat form only, since structured outputs reject recursion', () => {
    expect(JSON.stringify(flatDiagramJsonSchema)).not.toContain('children')
  })
})
