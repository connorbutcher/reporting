import { FormulaPreview } from '../../../../core/models/dataset';
import { PreviewRequest } from './preview-request';

/** The server's answer to a {@link PreviewRequest} (or the lack of one). */
export interface PreviewOutcome {
  request: PreviewRequest | null;
  preview: FormulaPreview | null;
  failed: boolean;
}
