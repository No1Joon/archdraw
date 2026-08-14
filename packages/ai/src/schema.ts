/**
 * The JSON Schema handed to the Messages API as `output_config.format`.
 * Hand-maintained: structured outputs reject recursion, so this is the flat form only.
 */
export const flatDiagramJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['provider', 'direction', 'nodes', 'edges'],
  properties: {
    provider: {
      type: 'string',
      description: "Icon provider, e.g. 'aws' or 'gcp'.",
    },
    title: { type: 'string' },
    direction: {
      type: 'string',
      enum: ['RIGHT', 'DOWN'],
      description: "Layout flow. 'RIGHT' for request flows, 'DOWN' for layered stacks.",
    },
    nodes: {
      type: 'array',
      description:
        'Every box in the diagram, flat. Containment is expressed with `parent`, never by nesting.',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id'],
        properties: {
          id: {
            type: 'string',
            description: 'Unique, lowercase, alphanumeric with - or _.',
          },
          label: { type: 'string', description: 'Human-readable name shown on the diagram.' },
          kind: {
            type: 'string',
            description:
              "Set on containers only (e.g. 'vpc', 'subnet', 'account', 'region'). Mutually exclusive with `type`.",
          },
          type: {
            type: 'string',
            description:
              'Set on leaf services only. Must be one of the service slugs listed in the system prompt.',
          },
          parent: {
            type: 'string',
            description: 'id of the containing node. Omit for top level.',
          },
        },
      },
    },
    edges: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['from', 'to'],
        properties: {
          from: { type: 'string' },
          to: { type: 'string' },
          label: { type: 'string', description: 'Protocol or purpose, e.g. HTTPS, gRPC.' },
          style: { type: 'string', enum: ['solid', 'dashed'] },
        },
      },
    },
  },
} as const
