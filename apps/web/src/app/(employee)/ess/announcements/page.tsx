'use client';

import { useEffect, useState } from 'react';
import { Megaphone, CheckCheck } from 'lucide-react';
import { toast } from 'sonner';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import api, { get } from '@/lib/api';
import { formatDate } from '@/lib/utils';

interface AnnouncementFeedItem {
  id: string;
  title: string;
  body: string;
  publishedAt: string | null;
  expiresAt: string | null;
  audienceScope: string;
  read: boolean;
  createdAt: string;
}

export default function EssAnnouncementsPage() {
  const [items, setItems] = useState<AnnouncementFeedItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFeed = async () => {
    setLoading(true);
    try {
      const data = await get<AnnouncementFeedItem[]>('/ess/announcements');
      setItems(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load announcements');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeed();
  }, []);

  const markRead = async (id: string) => {
    try {
      await api.post(`/ess/announcements/${id}/read`);
      setItems((prev) => prev.map((a) => (a.id === id ? { ...a, read: true } : a)));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to mark read');
    }
  };

  const unread = items.filter((i) => !i.read).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Announcements</h1>
        <p className="text-sm text-muted-foreground">
          {unread > 0
            ? `${unread} unread announcement${unread === 1 ? '' : 's'}`
            : 'You’re up to date.'}
        </p>
      </div>

      {loading ? (
        <Card>
          <CardContent className="flex h-40 items-center justify-center text-sm text-muted-foreground">
            Loading…
          </CardContent>
        </Card>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="flex h-40 flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
            <Megaphone className="h-6 w-6" />
            No announcements yet.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <Card
              key={item.id}
              className={item.read ? '' : 'border-primary/40 bg-primary/[0.03]'}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <CardTitle className="text-base">{item.title}</CardTitle>
                    <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                      <span>
                        {item.publishedAt
                          ? `Posted ${formatDate(item.publishedAt)}`
                          : `Drafted ${formatDate(item.createdAt)}`}
                      </span>
                      {!item.read && (
                        <Badge variant="default" className="h-5 text-[10px]">
                          New
                        </Badge>
                      )}
                    </div>
                  </div>
                  {!item.read && (
                    <Button size="sm" variant="ghost" onClick={() => markRead(item.id)}>
                      <CheckCheck className="mr-1 h-3.5 w-3.5" />
                      Mark read
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-line text-sm leading-6 text-foreground">
                  {item.body}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
