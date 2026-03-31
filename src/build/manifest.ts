export interface Manifest {
  name: string;
  version: string;
  description?: string;
  pages: Array<{ id: string; title: string }>;
}

export function buildManifest(input: Manifest): Manifest {
  const manifest: Manifest = {
    name: input.name,
    version: input.version,
    pages: input.pages,
  };

  if (input.description !== undefined) {
    manifest.description = input.description;
  }

  return manifest;
}
