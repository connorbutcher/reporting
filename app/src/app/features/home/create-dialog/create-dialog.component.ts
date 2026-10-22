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
import { TreeSelectModule } from 'primeng/treeselect';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { TreeNode } from 'primeng/api';
import { form, required, validate, validateHttp } from '@angular/forms/signals';
import { CreateDialogData } from './create-dialog-data';
import { CreateKind } from './create-kind';
import { HttpContext } from '@angular/common/http';
import { HttpErrorNotification } from '../../../core/http/http-error-notification.interceptor';
import { FolderTreeStore } from '../folder-tree.store';
import { CreateDialogResult } from './create-dialog-result';
import { FolderTrees } from '../folder-trees';

/** Lets the user pick folder-vs-report, name it, and (for reports) optionally copy an existing one — in one step, before creating either. */
@Component({
  selector: 'app-create-dialog',
  imports: [FormsModule, TreeSelectModule, ButtonModule, InputTextModule],
  templateUrl: './create-dialog.component.html',
  styleUrl: './create-dialog.component.scss',
})
export class CreateDialogComponent implements AfterViewInit {
  public readonly data = inject<CreateDialogData>(DIALOG_DATA);

  public readonly kind = signal<CreateKind>('report');
  public readonly selectedSource = signal<TreeNode | null>(null);

  /** Unique among visible siblings locally; the server makes the final call. */
  public readonly form = form(signal({ name: '' }), (path) => {
    required(path.name, { message: 'A name is required.' });
    validate(path.name, ({ value }) => this.localDuplicateError(value()));
    validateHttp<string, { available: boolean }>(path.name, {
      when: ({ value }) => value().trim().length > 0,
      request: ({ value }) => this.nameAvailableRequest(value().trim()),
      debounce: 400,
      onSuccess: (result, { value }) =>
        result.available ? [] : [this.duplicateError(value().trim())],
      onError: () => [],
    });
  });

  /** The duplicate-name message, shown as it's typed (never the plain "required"). */
  public readonly nameError = computed(
    () =>
      this.form
        .name()
        .errors()
        .find((e) => e.kind === 'duplicate')?.message ?? null,
  );

  public readonly treeNodes = computed<TreeNode[]>(() => [
    {
      key: FolderTreeStore.ROOT_KEY,
      label: 'Home',
      icon: 'pi pi-home',
      selectable: false,
      expanded: true,
      children: this.childNodes(null),
    },
  ]);

  private readonly dialogRef = inject(DialogRef<CreateDialogResult | undefined>);
  private readonly nameInput = viewChild.required<ElementRef<HTMLInputElement>>('nameInput');

  /** Lower-cased sibling names of the selected kind in the destination folder. */
  private readonly siblingNames = computed(() =>
    this.kind() === 'folder'
      ? this.data.folders
          .filter((f) => f.parentFolderId === this.data.folderId)
          .map((f) => f.name.trim().toLowerCase())
      : this.data.reports
          .filter((r) => r.folderId === this.data.folderId)
          .map((r) => r.name.trim().toLowerCase()),
  );

  private readonly foldersByParent = computed(() =>
    FolderTrees.groupByParent(this.data.folders, (f) => f.parentFolderId),
  );
  private readonly reportsByParent = computed(() =>
    FolderTrees.groupByParent(this.data.reports, (r) => r.folderId),
  );

  public ngAfterViewInit(): void {
    this.nameInput().nativeElement.focus();
  }

  public selectKind(kind: CreateKind): void {
    this.kind.set(kind);
    if (kind === 'folder') {
      this.selectedSource.set(null);
    }
  }

  public create(): void {
    const name = this.form.name().value().trim();
    if (!this.form().valid() || !name) {
      return;
    }
    const sourceKey = this.selectedSource()?.key;
    const sourceReportId =
      this.kind() === 'report' && sourceKey !== undefined ? Number(sourceKey) : undefined;
    this.dialogRef.close({ kind: this.kind(), name, sourceReportId });
  }

  public cancel(): void {
    this.dialogRef.close();
  }

  private childNodes(parentId: number | null): TreeNode[] {
    const folderNodes = FolderTrees.buildNodes(
      parentId,
      this.foldersByParent(),
      (folder, children) => ({
        key: `folder:${folder.id}`,
        label: folder.name,
        icon: 'pi pi-folder',
        selectable: false,
        children,
      }),
    );
    const reportNodes = (this.reportsByParent().get(parentId) ?? []).map((report) => ({
      key: String(report.id),
      label: report.name,
      icon: 'pi pi-file',
      leaf: true,
    }));
    return [...folderNodes, ...reportNodes];
  }

  private localDuplicateError(value: string): { kind: string; message: string } | null {
    const name = value.trim().toLowerCase();
    if (!name || !this.siblingNames().some((existing) => existing === name)) {
      return null;
    }
    return this.duplicateError(value.trim());
  }

  private duplicateError(name: string): { kind: string; message: string } {
    return { kind: 'duplicate', message: `A ${this.kind()} called "${name}" already exists here.` };
  }

  private nameAvailableRequest(name: string): {
    url: string;
    params: Record<string, string | number>;
    context: HttpContext;
  } {
    const isFolder = this.kind() === 'folder';
    const params: Record<string, string | number> = { name };
    if (this.data.folderId != null) {
      params[isFolder ? 'parentFolderId' : 'folderId'] = this.data.folderId;
    }
    return {
      url: isFolder ? '/api/folders/name-available' : '/api/reports/name-available',
      params,
      context: HttpErrorNotification.skip(),
    };
  }
}
