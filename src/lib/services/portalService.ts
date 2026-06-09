'use client';

import { createClient } from '@/lib/supabase/client';
import { accountService } from '@/lib/services/accountService';

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
  name: string;
  ownerId: string;
  createdAt: string;
}

export interface TeamMember {
  id: string;
  ownerId: string;
  memberEmail: string;
  memberUserId: string | null;
  workspaceId: string | null;
  status: 'pending' | 'active';
  createdAt: string;
}

function mapWorkspace(row: any): Workspace {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name || '',
    ownerId: row.owner_id,
    createdAt: row.created_at,
  };
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
  async getMyWorkspaces(): Promise<Workspace[]> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    try {
      const membership = await accountService.getTeamMembership();
      if (membership) {
        if (membership.workspaceId) {
          const { data, error } = await supabase
            .from('workspaces')
            .select('*')
            .eq('id', membership.workspaceId)
            .maybeSingle();

          if (error) {
            if (isSchemaError(error)) throw error;
            return [];
          }
          return data ? [mapWorkspace(data)] : [];
        }

        const { data, error } = await supabase
          .from('workspaces')
          .select('*')
          .eq('owner_id', membership.ownerId)
          .order('created_at', { ascending: true });

        if (error) {
          if (isSchemaError(error)) throw error;
          return [];
        }
        return (data || []).map(mapWorkspace);
      }

      const { data, error } = await supabase
        .from('workspaces')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: true });

      if (error) {
        if (isSchemaError(error)) throw error;
        return [];
      }
      return (data || []).map(mapWorkspace);
    } catch (err: any) {
      console.error('getMyWorkspaces error:', err.message);
      throw err;
    }
  },

  async getMyWorkspace(): Promise<Workspace | null> {
    const workspaces = await this.getMyWorkspaces();
    if (!workspaces.length) return null;

    if (typeof window !== 'undefined') {
      const storedId = localStorage.getItem('tresorlink_active_workspace_id');
      const match = storedId ? workspaces.find((w) => w.id === storedId) : null;
      if (match) return match;
    }
    return workspaces[0];
  },

  async createWorkspace(name: string, slug?: string): Promise<Workspace> {
    const supabase = createClient();
    const { data, error } = await supabase.rpc('create_workspace_for_owner', {
      p_name: name,
      p_slug: slug || null,
    });
    if (error) throw new Error(error.message);
    if (!data?.success) throw new Error(data?.error || 'Portal konnte nicht erstellt werden');

    const workspaces = await this.getMyWorkspaces();
    const created = workspaces.find((w) => w.id === data.workspace_id);
    if (!created) throw new Error('Portal erstellt, aber nicht gefunden');
    return created;
  },

  async updateWorkspaceName(workspaceId: string, name: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from('workspaces')
      .update({ name: name.trim() })
      .eq('id', workspaceId);
    if (error) throw new Error(error.message);
  },

  async deleteWorkspace(workspaceId: string): Promise<void> {
    const workspaces = await this.getMyWorkspaces();
    if (workspaces.length <= 1) {
      throw new Error('Das letzte Portal kann nicht gelöscht werden.');
    }

    const supabase = createClient();
    const { error } = await supabase.from('workspaces').delete().eq('id', workspaceId);
    if (error) throw new Error(error.message);
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
      return mapWorkspace(data);
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
  async cleanupExpiredFiles(workspaceId: string): Promise<void> {
    const supabase = createClient();
    const now = new Date().toISOString();

    try {
      const { data: expired, error } = await supabase
        .from('uploaded_files')
        .select('id, storage_path')
        .eq('workspace_id', workspaceId)
        .not('expires_at', 'is', null)
        .lte('expires_at', now);

      if (error || !expired?.length) return;

      const paths = expired.map((f) => f.storage_path);
      const ids = expired.map((f) => f.id);

      await supabase.storage.from('uploads').remove(paths);
      await supabase.from('uploaded_files').delete().in('id', ids);
    } catch (err: any) {
      console.error('cleanupExpiredFiles error:', err.message);
    }
  },

  async getFiles(workspaceId: string): Promise<UploadedFile[]> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    try {
      await this.cleanupExpiredFiles(workspaceId);

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
    const limitsRes = await fetch(`/api/portal-limits?workspaceId=${workspaceId}`);
    if (limitsRes.ok) {
      const limits = await limitsRes.json();
      const maxBytes =
        limits.maxFileSizeMb > 0 ? limits.maxFileSizeMb * 1024 * 1024 : null;
      if (maxBytes !== null && file.size > maxBytes) {
        throw new Error(
          `Datei überschreitet das Limit von ${limits.maxFileSizeMb} MB für Ihren ${limits.plan ?? 'Starter'}-Plan`
        );
      }
      if (
        limits.storageLimitBytes &&
        limits.storageUsedBytes + file.size > limits.storageLimitBytes
      ) {
        throw new Error(
          `Speicherlimit von ${limits.storageGb} GB erreicht. Bitte löschen Sie alte Dateien oder upgraden Sie Ihren Plan.`
        );
      }
    }

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

// ─── Team ────────────────────────────────────────────────────

export const teamService = {
  async getTeamMembers(): Promise<TeamMember[]> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    try {
      const { data, error } = await supabase
        .from('team_members')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: true });

      if (error) {
        if (isSchemaError(error)) throw error;
        return [];
      }
      return (data || []).map((row) => ({
        id: row.id,
        ownerId: row.owner_id,
        memberEmail: row.member_email,
        memberUserId: row.member_user_id,
        workspaceId: row.workspace_id,
        status: row.status as TeamMember['status'],
        createdAt: row.created_at,
      }));
    } catch (err: any) {
      console.error('getTeamMembers error:', err.message);
      throw err;
    }
  },

  async inviteMember(email: string, workspaceId?: string | null): Promise<void> {
    const res = await fetch('/api/team-invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
        workspaceId: workspaceId || null,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.error || 'Einladung fehlgeschlagen');
    }
    if (data.emailSent === false && data.error) {
      throw new Error(data.error);
    }
    if (data.emailSent === false && data.warning) {
      throw new Error(data.warning);
    }
  },

  async removeMember(memberId: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase.from('team_members').delete().eq('id', memberId);
    if (error) throw new Error(error.message);
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
