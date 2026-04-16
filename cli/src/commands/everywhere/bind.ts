import { Args, Flags } from '@oclif/core';
import * as fs from 'node:fs';
import * as path from 'node:path';

import EverywhereBaseCommand from './base.js';
import {
  loadBusinessObjects,
  loadBusinessObjectsFromZip,
  type BusinessObjectFile,
} from '../../codegen/business-objects.js';
import { parseBusinessObject } from '../../codegen/parser.js';
import {
  generateModels,
  generateSchema,
  generateModelHooks,
  generateIndex,
} from '../../codegen/generator.js';
import { pluginConfig } from '../../config.js';
import { formatSchemas } from '../../format-schemas.js';

const OUTPUT_DIR = 'data';

type LoadResult = {
  records: BusinessObjectFile[];
  source: { kind: 'zip' | 'directory'; path: string };
  persistExtendPath?: string;
};

export default class BindCommand extends EverywhereBaseCommand {
  static description =
    'Generate TypeScript types and data hooks from Workday Extend business object models.';

  static args = {
    'app-source': Args.string({
      description:
        'Path to a directory containing a model/ subfolder, or a .zip archive with the same structure. Directory paths are saved for future runs.',
      required: false,
    }),
  };

  static flags = {
    ...EverywhereBaseCommand.baseFlags,
    'dry-run': Flags.boolean({
      description:
        'Preview what would be generated without writing any files or updating saved config. Implies --verbose.',
    }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(BindCommand);
    const pluginDir = await this.parsePluginDir();
    const everywhereDir = path.join(pluginDir, 'everywhere');
    const dryRun = flags['dry-run'];
    const verbose = flags.verbose || dryRun;

    const result = await this.loadRecords(args['app-source'], pluginDir);
    const schemas = result.records.map((record) => parseBusinessObject(JSON.parse(record.content)));
    const outputDir = path.join(everywhereDir, OUTPUT_DIR);

    if (verbose) {
      this.log(`Source: ${result.source.path} (${result.source.kind})`);
      this.log(`Output: ${outputDir}`);
      this.log('');
      this.log(formatSchemas(schemas));
      this.log('');
    }

    if (result.persistExtendPath) {
      if (dryRun) {
        this.log(`Would save app path: ${result.persistExtendPath} (skipped — dry run)`);
      } else {
        pluginConfig().write({ extend: result.persistExtendPath });
        this.log(`Saved app path: ${result.persistExtendPath}`);
      }
    }

    // Run the generators unconditionally so dry-run surfaces any generator
    // errors the same way a real bind would. Writes are guarded.
    const modelsSrc = generateModels(schemas);
    const schemaSrc = generateSchema(schemas);
    const indexSrc = generateIndex(schemas);
    const modelHooks = schemas.map((s) => ({
      name: s.name,
      src: generateModelHooks(s),
    }));

    if (!dryRun) {
      fs.mkdirSync(outputDir, { recursive: true });
      fs.writeFileSync(path.join(outputDir, 'models.ts'), modelsSrc);
      fs.writeFileSync(path.join(outputDir, 'schema.ts'), schemaSrc);
      fs.writeFileSync(path.join(outputDir, 'index.ts'), indexSrc);
      for (const { name, src } of modelHooks) {
        fs.writeFileSync(path.join(outputDir, `${name}.ts`), src);
      }
    }

    const modelList = schemas.map((s) => s.name).join(', ');
    if (dryRun) {
      this.log(
        `Dry run — no files written. Would have generated types for ${schemas.length} model(s): ${modelList}`
      );
    } else {
      this.log(`Generated types for ${schemas.length} model(s): ${modelList}`);
    }
    this.log(`Output: ${outputDir}`);
  }

  private async loadRecords(argSource: string | undefined, pluginDir: string): Promise<LoadResult> {
    const config = pluginConfig();

    if (!argSource) {
      try {
        const saved = config.read();
        const appDir = saved.extend ? path.resolve(pluginDir, saved.extend) : pluginDir;
        return {
          records: loadBusinessObjects(appDir),
          source: { kind: 'directory', path: appDir },
        };
      } catch (err) {
        this.error(err instanceof Error ? err.message : String(err));
      }
    }

    const appSource = path.resolve(argSource);

    try {
      if (appSource.endsWith('.zip') && fs.existsSync(appSource)) {
        return {
          records: await loadBusinessObjectsFromZip(appSource),
          source: { kind: 'zip', path: appSource },
        };
      }

      if (fs.existsSync(appSource) && fs.statSync(appSource).isDirectory()) {
        return {
          records: loadBusinessObjects(appSource),
          source: { kind: 'directory', path: appSource },
          persistExtendPath: appSource,
        };
      }
    } catch (err) {
      this.error(err instanceof Error ? err.message : String(err));
    }

    // argSource was provided but matched neither zip nor directory
    this.error(`app-source must be a directory or .zip file: ${appSource}`);
  }
}
