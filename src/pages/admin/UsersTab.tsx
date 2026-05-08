// src/pages/admin/UsersTab.tsx — User management with ban/unban
import React, { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Users, Search, Ban, CheckCircle2, RefreshCcw,
  ChevronLeft, ChevronRight, AlertCircle, Shield,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input }  from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { usersApi, type SiteUser } from "@/lib/adminApi";
import { SafeImage } from "@/components/SafeImage";

function Avatar({ user }: { user: SiteUser }) {
  const initial = (user.discord_username ?? "U").charAt(0).toUpperCase();
  const fallbackIcon = (
    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
      {initial}
    </div>
  );
  if (!user.discord_avatar) return fallbackIcon;
  return (
    <SafeImage
      src={user.discord_avatar}
      alt={user.discord_username ?? ""}
      className="w-9 h-9 rounded-full object-cover flex-shrink-0"
      wrapperClassName="w-9 h-9 rounded-full flex-shrink-0"
      fallbackIcon={fallbackIcon}
      containerClassName="w-9 h-9 rounded-full flex-shrink-0"
    />
  );
}

function UserRow({ user, onAction }: { user: SiteUser; onAction: () => void }) {
  const { toast }      = useToast();
  const [busy, setBusy] = useState(false);

  const toggle = async () => {
    const action = user.is_banned ? "unban" : "ban";
    if (action === "ban" && !confirm(`Ban user "${user.discord_username ?? user.id}"?`)) return;
    setBusy(true);
    try {
      await usersApi[action](user.id);
      toast({ title: action === "ban" ? "🚫 User banned" : "✅ User unbanned" });
      onAction();
    } catch (e: any) {
      toast({ title: "❌ Error", description: e.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
      <Card className={`bg-background/30 border-white/5 ${user.is_banned ? "border-red-500/20" : ""}`}>
        <CardContent className="p-4 flex items-center gap-4">
          <Avatar user={user} />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-medium text-sm truncate">{user.discord_username ?? "Anonymous"}</p>
              {user.is_banned && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-500/15 text-red-400 font-medium flex-shrink-0">
                  Banned
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground font-mono">{user.discord_id ?? user.id}</p>
            <p className="text-xs text-muted-foreground">
              Last seen: {user.last_seen ? new Date(user.last_seen).toLocaleDateString() : "never"}
              {user.banned_at && ` · Banned: ${new Date(user.banned_at).toLocaleDateString()}`}
            </p>
          </div>

          <Button
            size="sm" variant="outline" disabled={busy}
            onClick={toggle}
            className={`gap-1.5 flex-shrink-0 ${user.is_banned ? "border-green-500/30 text-green-400 hover:bg-green-500/10" : "border-red-500/30 text-red-400 hover:bg-red-500/10"}`}
          >
            {busy
              ? <div className="animate-spin h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full" />
              : user.is_banned
              ? <CheckCircle2 className="w-3.5 h-3.5" />
              : <Ban className="w-3.5 h-3.5" />}
            {user.is_banned ? "Unban" : "Ban"}
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function UsersTab() {
  const { toast }           = useToast();
  const [users, setUsers]   = useState<SiteUser[]>([]);
  const [total, setTotal]   = useState(0);
  const [page, setPage]     = useState(1);
  const [search, setSearch] = useState("");
  const [query, setQuery]   = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await usersApi.list(page, query);
      setUsers(res.users);
      setTotal(res.total);
    } catch (e: any) {
      toast({ title: "❌ Failed to load users", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [page, query]);

  useEffect(() => { load(); }, [load]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setQuery(search.trim());
    setPage(1);
  };

  const totalPages = Math.ceil(total / 25);

  return (
    <motion.div key="users" initial={{ opacity: 0, x: -40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 40 }} transition={{ duration: 0.3 }}>
      <Card className="bg-card/60 backdrop-blur-xl border-white/10 shadow-2xl">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-r from-indigo-500 to-violet-600">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-2xl">Users ({total})</CardTitle>
                <CardDescription>Manage site visitors and ban abusers</CardDescription>
              </div>
            </div>
            <Button variant="outline" size="sm" className="gap-2" onClick={load} disabled={loading}>
              <RefreshCcw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
            </Button>
          </div>

          {/* Search */}
          <form onSubmit={handleSearch} className="flex gap-2 mt-4">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by username or Discord ID…"
              className="bg-background/50 border-white/10"
            />
            <Button type="submit" variant="outline" className="gap-2 flex-shrink-0">
              <Search className="w-4 h-4" /> Search
            </Button>
          </form>
        </CardHeader>

        <CardContent className="space-y-3">
          {/* Info notice */}
          <div className="flex items-start gap-2 p-3 rounded-lg bg-indigo-500/5 border border-indigo-500/15 text-xs text-indigo-300/80">
            <Shield className="w-4 h-4 flex-shrink-0 mt-0.5 text-indigo-400" />
            <span>Users are tracked when they interact with the site (e.g. submitting a review). Requires the <code className="font-mono">site_visitors</code> table — see <code className="font-mono">supabase-schema-update.sql</code>.</span>
          </div>

          {loading ? (
            <div className="flex justify-center py-16">
              <div className="animate-spin h-8 w-8 rounded-full border-2 border-primary/20 border-t-primary" />
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-16 border-2 border-dashed border-white/10 rounded-xl">
              <Users className="w-12 h-12 mx-auto text-muted-foreground mb-3 opacity-50" />
              <p className="text-muted-foreground">{query ? "No users match your search" : "No users recorded yet"}</p>
              {query && (
                <Button variant="ghost" size="sm" className="mt-3" onClick={() => { setSearch(""); setQuery(""); }}>
                  Clear search
                </Button>
              )}
            </div>
          ) : (
            <>
              {users.map((u) => (
                <UserRow key={u.id} user={u} onAction={load} />
              ))}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-3 pt-2">
                  <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="gap-1.5">
                    <ChevronLeft className="w-4 h-4" /> Prev
                  </Button>
                  <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
                  <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="gap-1.5">
                    Next <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
