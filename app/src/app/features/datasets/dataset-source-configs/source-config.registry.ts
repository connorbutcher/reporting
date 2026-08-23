import { Type } from '@angular/core';
import { DatasetSourceKey } from '../../../core/models/dataset';
import { AssemblySourceConfigComponent } from './assembly-source-config/assembly-source-config.component';
import { DisassemblySourceConfigComponent } from './disassembly-source-config/disassembly-source-config.component';
import { SpecificationSourceConfigComponent } from './specification-source-config/specification-source-config.component';

/**
 * The isolated component that edits each source system's configuration. This is the single place
 * to wire a new source's editor: because it's a `Record<DatasetSourceKey, …>`, adding a member to
 * {@link DatasetSourceKey} without registering it here is a compile error, and the source panel
 * (which just renders the mapped component) needs no changes.
 */
export const SOURCE_CONFIG_COMPONENTS: Record<DatasetSourceKey, Type<unknown>> = {
  assembly: AssemblySourceConfigComponent,
  disassembly: DisassemblySourceConfigComponent,
  specification: SpecificationSourceConfigComponent,
};
