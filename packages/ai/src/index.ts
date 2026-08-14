import Anthropic from '@anthropic-ai/sdk'
import {
  createResolver,
  DiagramError,
  type IconPack,
  type IconResolver,
  type Ir,
  normalize,
} from '@archdraw/core'
import { flatDiagramJsonSchema } from './schema.js'

export { flatDiagramJsonSchema } from './schema.js'

export const DEFAULT_MODEL = 'claude-opus-5'

export interface FromPromptOptions {
  /** Icon packs, or a resolver. Their slugs and aliases become the model's allowed vocabulary. */
  icons: IconResolver | IconPack | IconPack[]
  /** Defaults to `claude-opus-5`. */
  model?: string
  /** Defaults to `aws`. */
  provider?: string
  /** Pass an existing client to control auth, base URL, retries, or a proxy. */
  client?: Anthropic
  apiKey?: string
  /** Total attempts including the first. Each retry receives the previous validation error. */
  maxAttempts?: number
  /** Extra guidance appended to the system prompt (house conventions, naming, required tiers). */
  systemSuffix?: string
}

export interface FromPromptResult {
  /** The raw document — feed it to `renderToSvg`, or write it out as YAML for a human to edit. */
  document: unknown
  /** Already-validated IR, so callers don't normalize twice. */
  ir: Ir
  attempts: number
  model: string
}

function toResolver(icons: FromPromptOptions['icons']): IconResolver {
  if ('resolve' in icons) return icons
  return Array.isArray(icons) ? createResolver(...icons) : createResolver(icons)
}

function systemPrompt(provider: string, types: string[], suffix?: string): string {
  return [
    'You turn a description of a system into an architecture diagram document.',
    '',
    `The target provider is ${provider}.`,
    'Every leaf node needs a `type` drawn from this list — these are the only valid values, and an',
    'invented one fails validation:',
    '',
    types.join(', '),
    '',
    'Containers (accounts, regions, VPCs, subnets, clusters) carry `kind` instead of `type` and hold',
    'children through `parent`. Model the containment the architecture actually has: if the services',
    'sit in a VPC, say so, because that grouping is most of what makes the diagram readable.',
    '',
    'Draw what the description states. Do not invent tiers, redundancy, or services that were not',
    'mentioned or clearly implied. Label edges with the protocol or purpose when it is known.',
    suffix ? `\n${suffix}` : '',
  ].join('\n')
}

/** Prompt -> validated diagram document. Retries on semantic errors from `@archdraw/core`. */
export async function fromPrompt(
  prompt: string,
  options: FromPromptOptions,
): Promise<FromPromptResult> {
  const resolver = toResolver(options.icons)
  const provider = options.provider ?? 'aws'
  const model = options.model ?? DEFAULT_MODEL
  const maxAttempts = options.maxAttempts ?? 3
  const client = options.client ?? new Anthropic(options.apiKey ? { apiKey: options.apiKey } : {})

  const messages: Anthropic.MessageParam[] = [{ role: 'user', content: prompt }]
  let lastError: Error | undefined

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const response = await client.messages.create({
      model,
      max_tokens: 16000,
      system: systemPrompt(provider, resolver.list(), options.systemSuffix),
      messages,
      output_config: { format: { type: 'json_schema', schema: flatDiagramJsonSchema } },
    })

    if (response.stop_reason === 'refusal') {
      throw new Error(
        `The model declined this request (${response.stop_details?.category ?? 'unspecified'}).`,
      )
    }

    const text = response.content.find((block) => block.type === 'text')?.text
    if (!text) throw new Error('Model returned no text block.')

    const document = JSON.parse(text) as Record<string, unknown>
    try {
      const ir = normalize(document)
      // Resolve here so the retry loop can still fix an unknown slug.
      for (const node of ir.nodes) {
        if (node.type) resolver.resolve(node.type)
      }
      return { document, ir, attempts: attempt, model }
    } catch (error) {
      if (!(error instanceof DiagramError)) throw error
      lastError = error
      messages.push(
        { role: 'assistant', content: text },
        {
          role: 'user',
          content: `That diagram failed validation:\n\n${error.message}\n\nReturn the corrected document.`,
        },
      )
    }
  }

  throw new Error(
    `Could not produce a valid diagram in ${maxAttempts} attempts. Last error:\n${lastError?.message}`,
  )
}
