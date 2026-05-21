'use client';

import { createClient } from '@/lib/supabase/client';

function isSchemaError(error: any): boolean {
  if (!error) return false;
  if (error.code && typeof error.code === 'string') {
    const errorClass = error.code.substring(0, 2);
    if (errorClass === '42') return true;
    if (errorClass === '23') return false;
    if (errorClass === '08') return true;
  }
  if (error.message) {
    const schemaErrorPatterns = [
      /relation.*does not exist/i,
      /column.*does not exist/i,
      /function.*does not exist/i,
      /syntax error/i,
      /type.*does not exist/i,
    ];
    return schemaErrorPatterns.some((p) => p.test(error.message));
  }
  return false;
}

export interface Workspace {
  id: string;
  slug: string;
  ownerId: string;
  createdAt: string;
}

export interface BrandingSettings {
  id: string;
  workspaceId: string;
  portalTitle: string;
  welcomeMessage: string;
  accentColor: string;
  autoDeleteDays: number;
  notifyEmail: string | null;
  logoUrl: string | null;
  customDomain: string | null;
}

export interface UploadedFile {
  id: string;
  workspaceId: string;
  fileName: string;
  fileSize: number;
  fileType: 'pdf' | 'image' | 'docx' | 'other';
  storagePath: string;
  fileHash: string | null;
  status: 'new' | 'downloaded';
  expiresAt: string | null;
  downloadedAt: string | null;
  createdAt: string;
}

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  company: string;
}

// ─── Workspace ───────────────────────────────────────────────

export const workspaceService = {
  async getMyWorkspace(): Promise<Workspace | null> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('workspaces')
        .select('*')
        .eq('owner_id', user.id)
        .maybeSingle();

      if (error) {
        if (isSchemaError(error)) throw error;
        return null;
      }
      if (!data) return null;
      return { id: data.id, slug: data.slug, ownerId: data.owner_id, createdAt: data.created_at };
    } catch (err: any) {
      console.error('getMyWorkspace error:', err.message);
      throw err;
    }
  },

  async getWorkspaceBySlug(slug: string): Promise<Workspace | null> {
    const supabase = createClient();
    try {
      const { data, error } = await supabase
        .from('workspaces')
        .select('*')
        .eq('slug', slug)
        .maybeSingle();

      if (error) {
        if (isSchemaError(error)) throw error;
        return null;
      }
      if (!data) return null;
      return { id: data.id, slug: data.slug, ownerId: data.owner_id, createdAt: data.created_at };
    } catch (err: any) {
      console.error('getWorkspaceBySlug error:', err.message);
      throw err;
    }
  },

  async renameSlug(workspaceId: string, newSlug: string): Promise<string> {
    const supabase = createClient();
    const { data, error } = await supabase.rpc('rename_workspace_slug', {
      p_workspace_id: workspaceId,
      p_new_slug: newSlug,
    });
    if (error) throw new Error(error.message);
    if (!data?.success) throw new Error(data?.error || 'Failed to rename slug');
    return data.slug as string;
  },
};

// ─── Branding ────────────────────────────────────────────────

export const brandingService = {
  async getBranding(workspaceId: string): Promise<BrandingSettings | null> {
    const supabase = createClient();
    try {
      const { data, error } = await supabase
        .from('branding_settings')
        .select('*')
        .eq('workspace_id', workspaceId)
        .maybeSingle();

      if (error) {
        if (isSchemaError(error)) throw error;
        return null;
      }
      if (!data) return null;
      return {
        id: data.id,
        workspaceId: data.workspace_id,
        portalTitle: data.portal_title,
        welcomeMessage: data.welcome_message,
        accentColor: data.accent_color,
        autoDeleteDays: data.auto_delete_days,
        notifyEmail: data.notify_email,
        logoUrl: data.logo_url,
        customDomain: data.custom_domain || null,
      };
    } catch (err: any) {
      console.error('getBranding error:', err.message);
      throw err;
    }
  },

  async getBrandingBySlug(slug: string): Promise<BrandingSettings | null> {
    const supabase = createClient();
    try {
      const { data, error } = await supabase
        .from('branding_settings')
        .select('*, workspaces!inner(slug)')
        .eq('workspaces.slug', slug)
        .maybeSingle();

      if (error) {
        if (isSchemaError(error)) throw error;
        return null;
      }
      if (!data) return null;
      return {
        id: data.id,
        workspaceId: data.workspace_id,
        portalTitle: data.portal_title,
        welcomeMessage: data.welcome_message,
        accentColor: data.accent_color,
        autoDeleteDays: data.auto_delete_days,
        notifyEmail: data.notify_email,
        logoUrl: data.logo_url,
        customDomain: data.custom_domain || null,
      };
    } catch (err: any) {
      console.error('getBrandingBySlug error:', err.message);
      throw err;
    }
  },

  async updateBranding(
    workspaceId: string,
    updates: Partial<Omit<BrandingSettings, 'id' | 'workspaceId'>>
  ): Promise<void> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    try {
      const { error } = await supabase
        .from('branding_settings')
        .upsert(
          {
            workspace_id: workspaceId,
            portal_title: updates.portalTitle,
            welcome_message: updates.welcomeMessage,
            accent_color: updates.accentColor,
            auto_delete_days: updates.autoDeleteDays,
            notify_email: updates.notifyEmail,
            logo_url: updates.logoUrl,
            custom_domain: updates.customDomain ?? null,
          },
          { onConflict: 'workspace_id' }
        );

      if (error) {
        if (isSchemaError(error)) throw error;
        throw new Error(error.message);
      }
    } catch (err: any) {
      console.error('updateBranding error:', err.message);
      throw err;
    }
  },

  async uploadLogo(workspaceSlug: string, file: File): Promise<string> {
    const supabase = createClient();
    const ext = file.name.split('.').pop() || 'png';
    // Store logos under logos/{slug}/ so storage policies can identify them
    const path = `logos/${workspaceSlug}/logo_${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('uploads').upload(path, file, {
      upsert: true,
      contentType: file.type,
    });
    if (error) throw new Error(error.message);
    const { data: { publicUrl } } = supabase.storage.from('uploads').getPublicUrl(path);
    return publicUrl;
  },
};

// ─── Files ───────────────────────────────────────────────────

function mapFile(row: any): UploadedFile {
  const now = Date.now();
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    fileName: row.file_name,
    fileSize: row.file_size,
    fileType: row.file_type as UploadedFile['fileType'],
    storagePath: row.storage_path,
    fileHash: row.file_hash,
    status: row.status as UploadedFile['status'],
    expiresAt: row.expires_at,
    downloadedAt: row.downloaded_at,
    createdAt: row.created_at,
  };
}

export const fileService = {
  async getFiles(workspaceId: string): Promise<UploadedFile[]> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    try {
      const { data, error } = await supabase
        .from('uploaded_files')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false });

      if (error) {
        if (isSchemaError(error)) throw error;
        return [];
      }
      return (data || []).map(mapFile);
    } catch (err: any) {
      console.error('getFiles error:', err.message);
      throw err;
    }
  },

  async deleteFile(fileId: string, storagePath: string): Promise<void> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    try {
      // Delete from storage
      await supabase.storage.from('uploads').remove([storagePath]);

      // Delete from DB
      const { error } = await supabase
        .from('uploaded_files')
        .delete()
        .eq('id', fileId);

      if (error) {
        if (isSchemaError(error)) throw error;
        throw new Error(error.message);
      }
    } catch (err: any) {
      console.error('deleteFile error:', err.message);
      throw err;
    }
  },

  async deleteFiles(files: Array<{ id: string; storagePath: string }>): Promise<void> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    try {
      const paths = files.map((f) => f.storagePath);
      const ids = files.map((f) => f.id);

      await supabase.storage.from('uploads').remove(paths);

      const { error } = await supabase
        .from('uploaded_files')
        .delete()
        .in('id', ids);

      if (error) {
        if (isSchemaError(error)) throw error;
        throw new Error(error.message);
      }
    } catch (err: any) {
      console.error('deleteFiles error:', err.message);
      throw err;
    }
  },

  async markDownloaded(fileId: string): Promise<void> {
    const supabase = createClient();
    try {
      await supabase
        .from('uploaded_files')
        .update({ status: 'downloaded', downloaded_at: new Date().toISOString() })
        .eq('id', fileId);
    } catch (err: any) {
      console.error('markDownloaded error:', err.message);
    }
  },

  async getDownloadUrl(storagePath: string): Promise<string> {
    const supabase = createClient();
    const { data, error } = await supabase.storage
      .from('uploads')
      .createSignedUrl(storagePath, 300); // 5 min expiry
    if (error) throw new Error(error.message);
    return data.signedUrl;
  },

  async uploadFile(
    workspaceId: string,
    workspaceSlug: string,
    file: File,
    autoDeleteDays: number,
    onProgress: (progress: number) => void
  ): Promise<void> {
    const supabase = createClient();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `${workspaceSlug}/${Date.now()}_${safeName}`;

    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from('uploads')
      .upload(storagePath, file, { cacheControl: '3600', upsert: false });

    if (uploadError) throw new Error(uploadError.message);
    onProgress(80);

    // Determine file type
    let fileType: UploadedFile['fileType'] = 'other';
    if (file.type === 'application/pdf') fileType = 'pdf';
    else if (file.type.startsWith('image/')) fileType = 'image';
    else if (file.type.includes('wordprocessingml')) fileType = 'docx';

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + autoDeleteDays);
    const createdAt = new Date().toISOString();

    const { error: dbError } = await supabase.from('uploaded_files').insert({
      workspace_id: workspaceId,
      file_name: file.name,
      file_size: file.size,
      file_type: fileType,
      storage_path: storagePath,
      status: 'new',
      expires_at: expiresAt.toISOString(),
    });

    if (dbError) {
      if (isSchemaError(dbError)) throw dbError;
      throw new Error(dbError.message);
    }
    onProgress(100);

    // Fire-and-forget email notification to workspace owner
    try {
      const branding = await brandingService.getBranding(workspaceId);
      if (branding?.notifyEmail) {
        fetch('/api/notify-upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ownerEmail: branding.notifyEmail,
            fileName: file.name,
            fileSize: file.size,
            portalTitle: branding.portalTitle,
            workspaceSlug,
          }),
        }).catch((e) => console.warn('notify-upload failed:', e.message));
      }
    } catch (notifyErr: any) {
      console.warn('Could not send upload notification:', notifyErr.message);
    }
  },
};

// ─── User Profile ─────────────────────────────────────────────

export const profileService = {
  async getProfile(): Promise<UserProfile | null> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (error) {
        if (isSchemaError(error)) throw error;
        return null;
      }
      if (!data) return null;
      return { id: data.id, email: data.email, fullName: data.full_name, company: data.company };
    } catch (err: any) {
      console.error('getProfile error:', err.message);
      throw err;
    }
  },
};
