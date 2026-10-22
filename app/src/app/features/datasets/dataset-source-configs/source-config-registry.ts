import { Type } from '@angular/core';
import { DatasetSourceKey } from '../../../core/models/dataset';
import { AssemblySourceConfigComponent } from './assembly-source-config/assembly-source-config.component';
import { DisassemblySourceConfigComponent } from './disassembly-source-config/disassembly-source-config.component';
import { FilteredSourceConfigComponent } from './filtered-source-config/filtered-source-config.component';
import { SpecificationSourceConfigComponent } from './specification-source-config/specification-source-config.component';

export class SourceConfigRegistry {
  /** Each source's config editor. A missing {@link DatasetSourceKey} entry is a compile error. */
  public static readonly COMPONENTS: Record<DatasetSourceKey, Type<unknown>> = {
    assembly: AssemblySourceConfigComponent,
    disassembly: DisassemblySourceConfigComponent,
    specification: SpecificationSourceConfigComponent,
    filtered: FilteredSourceConfigComponent,
  };
}
