import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MenuItem, TreeNode } from 'primeng/api';
import { BreadcrumbModule } from 'primeng/breadcrumb';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TreeModule, TreeNodeSelectEvent } from 'primeng/tree';
import { forkJoin } from 'rxjs';
import { FolderApiService } from '../../core/api/folder-api.service';
import { ReportApiService } from '../../core/api/report-api.service';
import { Folder } from '../../core/models/folder.model';
import { ReportSummary } from '../../core/models/report.model';

/** Key used for the synthetic root node, since folder ids are never this string. */
const ROOT_KEY = '__root__';

@Component({
  selector: 'app-home-page',
  imports: [FormsModule, ButtonModule, InputTextModule, TreeModule, BreadcrumbModule],
  templateUrl: './home-page.component.html',
  styleUrl: './home-page.component.scss',
})
export class HomePageComponent implements OnInit {
  private readonly folderApi = inject(FolderApiService);
  private readonly reportApi = inject(ReportApiService);
  private readonly router = inject(Router);

  protected readonly folders = signal<Folder[]>([]);
  protected readonly reports = signal<ReportSummary[]>([]);
  protected readonly loading = signal(true);

  /** null means the root folder. */
  protected readonly selectedFolderId = signal<string | null>(null);

  protected readonly newFolderName = signal('');
  protected readonly newReportName = signal('');

  protected readonly homeItem: MenuItem = { icon: 'pi pi-home', command: () => this.selectFolder(null) };

  protected readonly treeNodes = computed<TreeNode[]>(() => [
    {
      key: ROOT_KEY,
      label: 'Home',
      icon: 'pi pi-home',
      expanded: true,
      children: this.childNodes(null),
    },
  ]);

  protected readonly treeSelectionKeys = computed<Record<string, boolean>>(() => ({
    [this.selectedFolderId() ?? ROOT_KEY]: true,
  }));

  private readonly folderPath = computed(() => {
    const byId = new Map(this.folders().map((f) => [f.id, f]));
    const path: Folder[] = [];
    let current = this.selectedFolderId();
    while (current) {
      const folder = byId.get(current);
      if (!folder) break;
      path.unshift(folder);
      current = folder.parentFolderId;
    }
    return path;
  });

  protected readonly breadcrumbItems = computed<MenuItem[]>(() =>
    this.folderPath().map((folder) => ({
      label: folder.name,
      command: () => this.selectFolder(folder.id),
    })),
  );

  protected readonly childFolders = computed(() =>
    this.folders().filter((f) => f.parentFolderId === this.selectedFolderId()),
  );

  protected readonly childReports = computed(() =>
    this.reports().filter((r) => r.folderId === this.selectedFolderId()),
  );

  ngOnInit(): void {
    this.load();
  }

  private load(selectFolderId?: string): void {
    this.loading.set(true);
    forkJoin({ folders: this.folderApi.list(), reports: this.reportApi.list() }).subscribe(
      ({ folders, reports }) => {
        this.folders.set(folders);
        this.reports.set(reports);
        this.loading.set(false);
        if (selectFolderId) this.selectedFolderId.set(selectFolderId);
      },
    );
  }

  private childNodes(parentId: string | null): TreeNode[] {
    return this.folders()
      .filter((f) => f.parentFolderId === parentId)
      .map((folder) => ({
        key: folder.id,
        label: folder.name,
        icon: 'pi pi-folder',
        expanded: true,
        children: this.childNodes(folder.id),
      }));
  }

  protected onNodeSelect(event: TreeNodeSelectEvent): void {
    const key = event.node.key;
    this.selectFolder(key === ROOT_KEY || !key ? null : key);
  }

  protected selectFolder(id: string | null): void {
    this.selectedFolderId.set(id);
  }

  protected createFolder(): void {
    const name = this.newFolderName().trim();
    if (!name) return;

    this.folderApi.create(name, this.selectedFolderId()).subscribe(() => {
      this.newFolderName.set('');
      this.load();
    });
  }

  protected createReport(): void {
    const name = this.newReportName().trim();
    if (!name) return;

    this.reportApi.create(name, this.selectedFolderId()).subscribe((report) => {
      this.newReportName.set('');
      this.router.navigate(['/reports', report.id, 'edit']);
    });
  }

  protected openReport(report: ReportSummary): void {
    this.router.navigate(['/reports', report.id]);
  }
}
