/**
 * Hand-maintained short names. Canonical slugs are generated from the official
 * icon filenames; this table is what makes `type: ecs` work instead of forcing
 * `type: amazon-elastic-container-service`.
 *
 * Keys are what people (and models) actually write. Values must exist in `generated.ts`
 * after a sync — `pnpm icons:sync aws` fails on any alias pointing at a missing slug.
 */
export const aliases: Record<string, string> = {
  alb: 'elastic-load-balancing',
  apigw: 'amazon-api-gateway',
  cloudfront: 'amazon-cloudfront',
  cloudwatch: 'amazon-cloudwatch',
  dynamodb: 'amazon-dynamodb',
  ec2: 'amazon-ec2',
  ecr: 'amazon-elastic-container-registry',
  ecs: 'amazon-elastic-container-service',
  eks: 'amazon-elastic-kubernetes-service',
  elb: 'elastic-load-balancing',
  eventbridge: 'amazon-eventbridge',
  fargate: 'aws-fargate',
  iam: 'aws-identity-and-access-management',
  lambda: 'aws-lambda',
  nlb: 'elastic-load-balancing',
  rds: 'amazon-rds',
  route53: 'amazon-route-53',
  s3: 'amazon-simple-storage-service',
  secrets: 'aws-secrets-manager',
  sns: 'amazon-simple-notification-service',
  sqs: 'amazon-simple-queue-service',
  stepfunctions: 'aws-step-functions',
  vpc: 'amazon-virtual-private-cloud',
}
