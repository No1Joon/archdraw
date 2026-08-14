/**
 * Hand-maintained short names. Canonical slugs are generated from the official
 * icon filenames; this table is what makes `type: gke` work instead of forcing
 * `type: google-kubernetes-engine`.
 *
 * Keys are what people (and models) actually write. Values must exist in `generated.ts`
 * after a sync — `pnpm icons:sync gcp` fails on any alias pointing at a missing slug.
 */
export const aliases: Record<string, string> = {
  bigquery: 'bigquery',
  cloudarmor: 'cloud-armor',
  cloudbuild: 'cloud-build',
  cloudrun: 'cloud-run',
  cloudsql: 'cloud-sql',
  cloudstorage: 'cloud-storage',
  firestore: 'firestore',
  gce: 'compute-engine',
  gcs: 'cloud-storage',
  gke: 'google-kubernetes-engine',
  iam: 'identity-and-access-management',
  lb: 'cloud-load-balancing',
  memorystore: 'memorystore',
  pubsub: 'pubsub',
  run: 'cloud-run',
  secretmanager: 'secret-manager',
  spanner: 'cloud-spanner',
  vpc: 'virtual-private-cloud',
}
