import { AssemblySourceConfig } from './assembly-source-config.model';
import { DisassemblySourceConfig } from './disassembly-source-config.model';
import { SpecificationSourceConfig } from './specification-source-config.model';
import { FilteredSourceConfig } from './filtered-source-config.model';

export type DatasetSourceConfig =
  AssemblySourceConfig | DisassemblySourceConfig | SpecificationSourceConfig | FilteredSourceConfig;
