import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '@/api/client';
import { toast } from 'sonner';
import { downloadBlob } from '@/lib/download';

export default function useEventDetail(id, user) {
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [editDialog, setEditDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', startTime: '', endTime: '', venueId: '', venue: '', bannerUrl: '', tags: [] });
  const [userRsvp, setUserRsvp] = useState(null);
  const [rsvpLoading, setRsvpLoading] = useState(false);
  const [attendeeCount, setAttendeeCount] = useState(0);
  const [coHostDialog, setCoHostDialog] = useState(false);
  const [pendingInvites, setPendingInvites] = useState([]);
  const [coHostSubmitting, setCoHostSubmitting] = useState(false);
  const loadedRef = useRef(false);
  const [prevId, setPrevId] = useState(id);

  if (prevId !== id) {
    setPrevId(id);
    loadedRef.current = false;
    setEvent(null);
    setError('');
    setLoading(true);
    setRefreshing(false);
    setUserRsvp(null);
    setAttendeeCount(0);
    setPendingInvites([]);
  }

  async function fetchEvent(isCancelled = () => false) {
    const isInitial = !loadedRef.current;
    if (isInitial) setLoading(true);
    else setRefreshing(true);
    setError('');
    try {
      const res = await client.get(`/events/${id}`);
      if (isCancelled()) return;
      setEvent(res.data);
      loadedRef.current = true;

      client.get(`/events/${id}/rsvp`)
        .then(rsvpRes => { if (!isCancelled()) setUserRsvp(rsvpRes.data); })
        .catch(() => { if (!isCancelled()) setUserRsvp(null); });

      const localCanManage = (res.data.userMembership?.role === 'OFFICER'
        && res.data.userMembership?.status === 'ACTIVE') || user?.role === 'PLATFORM_ADMIN' || user?.role === 'FACULTY';

      if (localCanManage) {
        client.get(`/events/${id}/rsvps`, { params: { limit: 1 } })
          .then(countRes => { if (!isCancelled()) setAttendeeCount(countRes.data.total); })
          .catch(() => {});
        client.get(`/events/${id}/cohost-invites`)
          .then(invRes => { if (!isCancelled()) setPendingInvites(invRes.data.items || []); })
          .catch(() => { if (!isCancelled()) setPendingInvites([]); });
      }
    } catch (err) {
      if (isCancelled()) return;
      if (isInitial) setError(err.response?.data?.message || 'Failed to load event');
      else toast.error(err.response?.data?.message || 'Failed to refresh event details');
    } finally {
      if (!isCancelled()) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }

  useEffect(() => {
    let active = true;
    fetchEvent(() => !active);
    return () => { active = false };
  }, [id]);

  async function handleRsvp(status) {
    setRsvpLoading(true);
    try {
      const res = await client.post(`/events/${id}/rsvp`, { status });
      setUserRsvp(res.data);
      if (status === 'NOT_GOING') {
        setAttendeeCount(prev => Math.max(0, prev - 1));
      } else if (!userRsvp || userRsvp.status === 'NOT_GOING') {
        setAttendeeCount(prev => prev + 1);
      }
      toast.success(`You're ${status === 'GOING' ? 'going' : status === 'MAYBE' ? 'maybe attending' : 'not going'}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update RSVP');
    } finally {
      setRsvpLoading(false);
    }
  }

  async function handleRemoveRsvp() {
    setRsvpLoading(true);
    try {
      await client.delete(`/events/${id}/rsvp`);
      if (userRsvp?.status !== 'NOT_GOING') {
        setAttendeeCount(prev => Math.max(0, prev - 1));
      }
      setUserRsvp(null);
      toast.success('RSVP removed');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to remove RSVP');
    } finally {
      setRsvpLoading(false);
    }
  }

  async function handleExportRsvps() {
    try {
      const res = await client.get(`/events/${id}/rsvps/export`, { responseType: 'blob' });
      downloadBlob(res.data, `rsvps-${id}.csv`);
      toast.success('RSVPs exported');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to export RSVPs');
    }
  }

  function openEdit() {
    if (!event) return;
    const toLocal = (iso) => {
      const d = new Date(iso);
      const offset = d.getTimezoneOffset();
      const local = new Date(d.getTime() - offset * 60000);
      return local.toISOString().slice(0, 16);
    };
    setForm({
      title: event.title,
      description: event.description || '',
      startTime: toLocal(event.startTime),
      endTime: toLocal(event.endTime),
      venueId: event.venueId || '',
      venue: event.venue || '',
      bannerUrl: event.bannerUrl || '',
      tags: Array.isArray(event.tags) ? event.tags : [],
    });
    setEditDialog(true);
  }

  async function handleEdit(e) {
    e.preventDefault();
    setSubmitting(true);
    if (form.startTime && form.endTime) {
      const start = new Date(form.startTime);
      const end = new Date(form.endTime);
      if (end <= start) {
        toast.error('End time must be after start time');
        setSubmitting(false);
        return;
      }
    }
    try {
      const { venueId, venue, ...rest } = form;
      const payload = venueId ? { ...rest, venueId } : { ...rest, venue };
      await client.patch(`/events/${id}`, payload);
      setEditDialog(false);
      toast.success('Event updated');
      await fetchEvent();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update event');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    setSubmitting(true);
    try {
      await client.delete(`/events/${id}`);
      toast.success('Event deleted');
      setDeleteDialog(false);
      navigate(-1);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete event');
    } finally {
      setSubmitting(false);
    }
  }

  const canManage = (event?.userMembership?.role === 'OFFICER' && event?.userMembership?.status === 'ACTIVE') || user?.role === 'PLATFORM_ADMIN' || user?.role === 'FACULTY';
  const canRsvp = event?.userMembership?.status === 'ACTIVE' || user?.role === 'PLATFORM_ADMIN' || user?.role === 'FACULTY';
  const isPast = event ? new Date(event.startTime) < new Date() : false;

  const coHosts = (event?.hosts || []).filter((h) => !h.isPrimary);
  const primaryClubId = event?.primaryClubId || event?.hosts?.find((h) => h.isPrimary)?.clubId;
  const isPrimaryOfficer = event?.userMembership?.role === 'OFFICER'
    && event?.userMembership?.status === 'ACTIVE'
    && !!primaryClubId
    && event?.userMembership?.clubId === primaryClubId;
  const canDelete = isPrimaryOfficer || user?.role === 'PLATFORM_ADMIN' || user?.role === 'FACULTY';

  async function handleInvite(club) {
    setCoHostSubmitting(true);
    try {
      await client.post(`/events/${id}/cohost-invites`, { clubId: club.id });
      toast.success(`Invitation sent to ${club.name}`);
      const invRes = await client.get(`/events/${id}/cohost-invites`);
      setPendingInvites(invRes.data.items || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send invitation');
    } finally {
      setCoHostSubmitting(false);
    }
  }

  async function handleCancelInvite(inviteId) {
    setCoHostSubmitting(true);
    try {
      await client.delete(`/events/${id}/cohost-invites/${inviteId}`);
      setPendingInvites((prev) => prev.filter((inv) => inv.id !== inviteId));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel invitation');
    } finally {
      setCoHostSubmitting(false);
    }
  }

  async function handleRemoveCoHost(clubId) {
    setCoHostSubmitting(true);
    try {
      await client.delete(`/events/${id}/cohosts/${clubId}`);
      toast.success('Co-host removed');
      await fetchEvent();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to remove co-host');
    } finally {
      setCoHostSubmitting(false);
    }
  }

  return {
    event, loading, refreshing, error,
    editDialog, setEditDialog, deleteDialog, setDeleteDialog,
    submitting, form, setForm,
    userRsvp, rsvpLoading, attendeeCount,
    fetchEvent, handleRsvp, handleRemoveRsvp, handleExportRsvps,
    openEdit, handleEdit, handleDelete,
    canManage, canDelete, canRsvp, isPast,
    coHosts, coHostDialog, setCoHostDialog,
    pendingInvites, coHostSubmitting, handleInvite, handleCancelInvite, handleRemoveCoHost,
    id,
  };
}
