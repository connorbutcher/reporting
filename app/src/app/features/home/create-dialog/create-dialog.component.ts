import {
  AfterViewInit,
  Component,
  ElementRef,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { TreeNode } from 'primeng/api';
import { TreeSelectModule } from 'primeng/treeselect';
import { Folder } from '../../../core/models/folder.model';
import { ReportSummary } from '../../../core/models/report.model';
import { groupByParent } from '../group-by-parent.util';

export type CreateKind = 'folder' | 'report';

export interface CreateDialogData {
  folders: Folder[];
  reports: ReportSummary[];
}

export interface CreateDialogResult {
  kind: CreateKind;
  name: string;
  /** Set when the user picked an existing report to start from — undefined means start blank. */
  sourceReportId?: number;
}

/** Lets the user pick folder-vs-report, name it, and (for reports) optionally copy an existing one — in one step, before creating either. */
@Component({
  selector: 'app-create-dialog',
  imports: [FormsModule, TreeSelectModule],
  templateUrl: './create-dialog.component.html',
  styleUrl: './create-dialog.component.scss',
})
export class CreateDialogComponent implements AfterViewInit {
  private readonly dialogRef = inject(DialogRef<CreateDialogResult | undefined>);
  protected readonly data = inject<CreateDialogData>(DIALOG_DATA);
  private readonly nameInput = viewChild.required<ElementRef<HTMLInputElement>>('nameInput');

  protected readonly kind = signal<CreateKind>('report');
  protected readonly name = signal('');
  protected readonly selectedSource = signal<TreeNode | null>(null);

  private readonly foldersByParent = computed(() => groupByParent(this.data.folders, (f) => f.parentFolderId));
  private readonly reportsByParent = computed(() => groupByParent(this.data.reports, (r) => r.folderId));

  protected readonly treeNodes = computed<TreeNode[]>(() => [
    {
      key: '__root__',
      label: 'Home',
      icon: 'pi pi-home',
      selectable: false,
      expanded: true,
      children: this.childNodes(null),
    },
  ]);

  ngAfterViewInit(): void {
    this.nameInput().nativeElement.focus();
  }

  private childNodes(parentId: number | null): TreeNode[] {
    const folderNodes = (this.foldersByParent().get(parentId) ?? []).map((folder) => ({
      key: `folder:${folder.id}`,
      label: folder.name,
      icon: 'pi pi-folder',
      selectable: false,
      children: this.childNodes(folder.id),
    }));
    const reportNodes = (this.reportsByParent().get(parentId) ?? []).map((report) => ({
      key: String(report.id),
      label: report.name,
      icon: 'pi pi-file',
      leaf: true,
    }));
    return [...folderNodes, ...reportNodes];
  }

  protected selectKind(kind: CreateKind): void {
    this.kind.set(kind);
    if (kind === 'folder') this.selectedSource.set(null);
  }

  protected create(): void {
    const name = this.name().trim();
    if (!name) return;
    const sourceKey = this.selectedSource()?.key;
    const sourceReportId =
      this.kind() === 'report' && sourceKey !== undefined ? Number(sourceKey) : undefined;
    this.dialogRef.close({ kind: this.kind(), name, sourceReportId });
  }

  protected cancel(): void {
    this.dialogRef.close();
  }
}
