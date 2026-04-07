'use client';

import { useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import {
  useMediaLibrary,
  useUploadMediaItem,
  useDeleteMediaItem,
} from '@/hooks/use-media-library';
import { getMediaDownloadUrl } from '@/lib/api/client';
import { formatTimestamp } from '@/lib/utils';
import { useTenant } from '@/lib/tenant-context';
import { AppPageShell } from '@/components/app-page-shell';
import { PageHeader } from '@/components/page-header';
import { MediaThumbnail } from '@/components/media-thumbnail';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { EmptyState } from '@/components/ui/empty-state';
import { SegmentedControl } from '@/components/ui/segmented-control';

const TYPE_TABS = [
  { value: '', label: 'Todos' },
  { value: 'image', label: 'Imagens' },
  { value: 'audio', label: 'Áudios' },
  { value: 'video', label: 'Vídeos' },
  { value: 'document', label: 'Docs' },
] as const;

const TYPE_ICONS: Record<string, string> = {
  image: 'M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z',
  audio: 'M9 18V5l12-2v13',
  video: 'M23 7l-7 5 7 5V7z M14 5H3a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2z',
  document: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6',
};

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function MediaLibraryPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [activeType, setActiveType] = useState<(typeof TYPE_TABS)[number]['value']>('');
  const [uploadName, setUploadName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { tenantId } = useTenant();
  const { data: items, isLoading } = useMediaLibrary(sessionId, activeType || undefined);
  const uploadItem = useUploadMediaItem(sessionId);
  const deleteItem = useDeleteMediaItem(sessionId);

  const handleDownload = async (mediaId: string, fileName: string) => {
    try {
      const url = getMediaDownloadUrl(sessionId, mediaId);
      const res = await fetch(url, { headers: { 'X-Tenant-Id': tenantId } });
      if (!res.ok) throw new Error('download failed');
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(blobUrl);
    } catch {
      console.error('Failed to download media item');
    }
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    uploadItem.mutate({ file, name: uploadName || file.name });
    setUploadName('');
    e.target.value = '';
  };

  return (
    <AppPageShell size="content" className="animate-fade-in">
      <div className="space-y-8">
        <PageHeader
          kicker="Mídia"
          title="Galeria"
          description="Armazene arquivos para envio rápido nas conversas. Para áudios, use um nome claro no upload — ele vira o título em Áudios prontos no chat."
          backHref={`/sessions/${sessionId}`}
          actions={
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
              <Input
                value={uploadName}
                onChange={(e) => setUploadName(e.target.value)}
                placeholder="Nome / título (recomendado p/ áudio)"
                className="h-10 text-xs sm:w-44"
              />
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept="image/*,audio/*,video/*,.pdf,.doc,.docx,.xls,.xlsx"
                onChange={handleUpload}
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadItem.isPending}
                className="h-10 gap-2"
              >
                {uploadItem.isPending ? (
                  <Spinner className="h-4 w-4" />
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
                  </svg>
                )}
                Upload
              </Button>
            </div>
          }
        />

        <SegmentedControl
          value={activeType}
          onChange={setActiveType}
          options={[...TYPE_TABS]}
        />

        {isLoading && (
          <div className="flex justify-center rounded-2xl border border-dashed border-border/60 py-20">
            <Spinner className="h-7 w-7" />
          </div>
        )}

        {!isLoading && (!items || items.length === 0) && (
          <EmptyState
            icon={
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
            }
            title="Galeria vazia"
            description="Faça upload de imagens, áudios, vídeos ou documentos para usar no chat."
            className="py-14"
          />
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items?.map((item, i) => (
            <div
              key={item._id}
              className="app-session-card flex flex-col p-4 animate-slide-up"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-primary/10 ring-1 ring-primary/15">
                  {item.type === 'image' ? (
                    <MediaThumbnail
                      sessionId={sessionId}
                      mediaId={item._id}
                      mediaUrl={item.mediaUrl}
                      alt={item.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                      <path d={TYPE_ICONS[item.type] || TYPE_ICONS.document} />
                    </svg>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{item.name}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <Badge variant="muted" className="text-[9px] uppercase">
                      {item.type}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">{formatSize(item.size)}</span>
                  </div>
                  <p className="mt-1.5 text-[10px] text-muted-foreground">{formatTimestamp(item.createdAt)}</p>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-3 border-t border-border/50 pt-3">
                <button
                  type="button"
                  onClick={() => void handleDownload(item._id, item.name)}
                  className="text-xs font-medium text-primary transition-colors hover:underline cursor-pointer"
                >
                  Baixar
                </button>
                <button
                  type="button"
                  onClick={() => deleteItem.mutate(item._id)}
                  disabled={deleteItem.isPending}
                  className="text-xs font-medium text-destructive transition-opacity hover:underline disabled:opacity-50 cursor-pointer"
                >
                  Excluir
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppPageShell>
  );
}
