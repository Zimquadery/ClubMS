import { useState, useEffect, useCallback } from 'react';
import client from '@/api/client';
import { toast } from 'sonner';

export function useCohostInvites(clubId) {
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await client.get('/cohost-invites/incoming', { params: clubId ? { clubId } : {} });
      setInvites(res.data.items || []);
    } catch {
      setInvites([]);
    } finally {
      setLoading(false);
    }
  }, [clubId]);

  useEffect(() => { refresh(); }, [refresh]);

  async function accept(id) {
    setActing(true);
    try {
      await client.post(`/cohost-invites/${id}/accept`);
      toast.success('Co-host invitation accepted');
      await refresh();
      window.dispatchEvent(new Event('cohost-invites-changed'));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to accept invitation');
    } finally {
      setActing(false);
    }
  }

  async function reject(id) {
    setActing(true);
    try {
      await client.post(`/cohost-invites/${id}/reject`);
      toast.success('Invitation declined');
      await refresh();
      window.dispatchEvent(new Event('cohost-invites-changed'));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to decline invitation');
    } finally {
      setActing(false);
    }
  }

  return { invites, loading, acting, accept, reject, refresh };
}
