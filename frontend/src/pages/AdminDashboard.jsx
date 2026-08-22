import React, { useEffect, useState, useCallback } from "react";
import {
  Users, Database, RefreshCw, ScrollText, ShieldCheck, ShieldOff,
  Trash2, Loader2, BarChart3, UploadCloud,
} from "lucide-react";
import { adminApi } from "../api/client";

function StatCard({ icon: Icon, label, value }) {
  return (
    <div className="glass-panel rounded-2xl p-5 flex items-center gap-4">
      <div className="w-12 h-12 rounded-xl bg-gold-500/10 flex items-center justify-center shrink-0">
        <Icon size={20} className="text-gold-400" />
      </div>
      <div>
        <p className="text-2xl font-bold text-white/90 font-display">{value}</p>
        <p className="text-xs text-white/50">{label}</p>
      </div>
    </div>
  );
}

const TABS = [
  { key: "overview", label: "Overview", icon: BarChart3 },
  { key: "users", label: "Users", icon: Users },
  { key: "dataset", label: "Dataset", icon: Database },
  { key: "logs", label: "Training Logs", icon: ScrollText },
];

export default function AdminDashboard() {
  const [tab, setTab] = useState("overview");
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [dataset, setDataset] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retraining, setRetraining] = useState(false);
  const [uploadRaga, setUploadRaga] = useState("");
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadMsg, setUploadMsg] = useState("");

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [statsRes, usersRes, datasetRes, logsRes] = await Promise.all([
        adminApi.stats(),
        adminApi.listUsers(),
        adminApi.dataset(),
        adminApi.logs(),
      ]);
      setStats(statsRes.data);
      setUsers(usersRes.data.users);
      setDataset(datasetRes.data);
      setLogs(logsRes.data.training_logs);
    } catch (err) {
      setError(err.response?.data?.error || "Could not load admin data. Are you logged in as an admin?");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const toggleAdmin = async (u) => {
    try {
      await adminApi.updateUser(u.id, { is_admin: !u.is_admin });
      setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, is_admin: !x.is_admin } : x)));
    } catch {
      setError("Could not update that user.");
    }
  };

  const toggleActive = async (u) => {
    try {
      await adminApi.updateUser(u.id, { is_active: !u.is_active });
      setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, is_active: !x.is_active } : x)));
    } catch {
      setError("Could not update that user.");
    }
  };

  const deleteUser = async (u) => {
    if (!window.confirm(`Delete user "${u.username}"? This cannot be undone.`)) return;
    try {
      await adminApi.deleteUser(u.id);
      setUsers((prev) => prev.filter((x) => x.id !== u.id));
    } catch {
      setError("Could not delete that user.");
    }
  };

  const triggerRetrain = async () => {
    setRetraining(true);
    setError("");
    try {
      await adminApi.retrain();
      // poll logs a few times to reflect progress
      let attempts = 0;
      const poll = setInterval(async () => {
        attempts += 1;
        const res = await adminApi.logs();
        setLogs(res.data.training_logs);
        const latest = res.data.training_logs[0];
        if (latest && latest.status !== "running") {
          clearInterval(poll);
          setRetraining(false);
        }
        if (attempts > 40) {
          clearInterval(poll);
          setRetraining(false);
        }
      }, 5000);
    } catch (err) {
      setError(err.response?.data?.error || "Could not start retraining.");
      setRetraining(false);
    }
  };

  const submitUpload = async (e) => {
    e.preventDefault();
    if (!uploadRaga || !uploadFile) return;
    setUploadMsg("");
    try {
      const formData = new FormData();
      formData.append("raga_name", uploadRaga);
      formData.append("audio", uploadFile);
      await adminApi.uploadDatasetFile(formData);
      setUploadMsg("Uploaded successfully.");
      setUploadFile(null);
      const datasetRes = await adminApi.dataset();
      setDataset(datasetRes.data);
    } catch (err) {
      setUploadMsg(err.response?.data?.error || "Upload failed.");
    }
  };

  return (
    <div className="bg-radial-glow min-h-[calc(100vh-64px)] py-10 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 fade-in">
          <h1 className="font-display text-3xl font-bold gold-text mb-1">Admin Dashboard</h1>
          <p className="text-white/50 text-sm">Manage users, dataset, and the ML model</p>
        </div>

        <div className="flex gap-1 mb-6 glass-panel rounded-xl p-1 w-fit">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === key ? "bg-gold-500/20 text-gold-300" : "text-white/60"
              }`}
            >
              <Icon size={15} /> {label}
            </button>
          ))}
        </div>

        {error && (
          <div className="glass-panel rounded-xl p-4 mb-6 text-sm text-maroon-500">{error}</div>
        )}

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-gold-500/30 border-t-gold-400 rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {tab === "overview" && stats && (
              <div className="space-y-6 fade-in">
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatCard icon={Users} label="Total Users" value={stats.total_users} />
                  <StatCard icon={ShieldCheck} label="Verified Users" value={stats.verified_users} />
                  <StatCard icon={BarChart3} label="Total Predictions" value={stats.total_predictions} />
                  <StatCard icon={Database} label="Dataset Classes" value={stats.dataset_classes} />
                </div>

                <div className="glass-panel rounded-2xl p-6">
                  <h2 className="font-display text-lg font-semibold text-gold-300 mb-4">
                    Top Predicted Ragas
                  </h2>
                  {stats.top_predicted_ragas.length === 0 ? (
                    <p className="text-white/40 text-sm">No predictions recorded yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {stats.top_predicted_ragas.map((r) => (
                        <div key={r.raga} className="flex justify-between text-sm border-b border-white/5 pb-2">
                          <span className="text-white/80">{r.raga}</span>
                          <span className="text-gold-300 font-medium">{r.count}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {tab === "users" && (
              <div className="glass-panel rounded-2xl overflow-hidden fade-in">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-white/40 border-b border-white/10">
                      <th className="py-3 px-4 font-medium">User</th>
                      <th className="py-3 px-4 font-medium">Email</th>
                      <th className="py-3 px-4 font-medium">Status</th>
                      <th className="py-3 px-4 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id} className="border-b border-white/5 last:border-0">
                        <td className="py-3 px-4 text-white/85">
                          {u.username}
                          {u.is_admin && (
                            <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-gold-500/15 text-gold-300">
                              ADMIN
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-white/60">{u.email}</td>
                        <td className="py-3 px-4">
                          <span className={`text-xs px-2 py-1 rounded-full ${u.is_active ? "bg-green-500/10 text-green-400" : "bg-maroon-600/20 text-maroon-400"}`}>
                            {u.is_active ? "Active" : "Deactivated"}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => toggleAdmin(u)}
                              title={u.is_admin ? "Revoke admin" : "Make admin"}
                              className="text-white/40 hover:text-gold-300 transition-colors"
                            >
                              {u.is_admin ? <ShieldOff size={16} /> : <ShieldCheck size={16} />}
                            </button>
                            <button
                              onClick={() => toggleActive(u)}
                              className="text-xs px-2 py-1 rounded-md border border-white/10 text-white/60 hover:border-gold-500/40 hover:text-gold-300 transition-colors"
                            >
                              {u.is_active ? "Deactivate" : "Activate"}
                            </button>
                            <button
                              onClick={() => deleteUser(u)}
                              className="text-white/40 hover:text-maroon-500 transition-colors"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {tab === "dataset" && dataset && (
              <div className="space-y-6 fade-in">
                <div className="glass-panel rounded-2xl p-6">
                  <h2 className="font-display text-lg font-semibold text-gold-300 mb-4">
                    Upload Audio to a Raga Class
                  </h2>
                  <form onSubmit={submitUpload} className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
                    <div className="flex-1 w-full">
                      <label className="text-xs text-white/50 mb-1 block">Raga name (folder)</label>
                      <input
                        value={uploadRaga}
                        onChange={(e) => setUploadRaga(e.target.value)}
                        placeholder="e.g. Kalyani"
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/90 focus:outline-none focus:border-gold-500/50"
                      />
                    </div>
                    <div className="flex-1 w-full">
                      <label className="text-xs text-white/50 mb-1 block">Audio file</label>
                      <input
                        type="file"
                        accept="audio/*"
                        onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                        className="w-full text-xs text-white/60"
                      />
                    </div>
                    <button type="submit" className="btn-primary px-4 py-2 rounded-lg text-sm flex items-center gap-2 shrink-0">
                      <UploadCloud size={15} /> Upload
                    </button>
                  </form>
                  {uploadMsg && <p className="text-xs text-white/50 mt-3">{uploadMsg}</p>}
                </div>

                <div className="glass-panel rounded-2xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-display text-lg font-semibold text-gold-300">Dataset Classes</h2>
                    <button
                      onClick={triggerRetrain}
                      disabled={retraining}
                      className="btn-primary px-4 py-2 rounded-lg text-sm flex items-center gap-2"
                    >
                      {retraining ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
                      {retraining ? "Retraining…" : "Retrain Model"}
                    </button>
                  </div>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {dataset.classes.map((c) => (
                      <div key={c.raga} className="flex justify-between items-center bg-white/5 rounded-lg px-3 py-2 text-sm">
                        <span className="text-white/80">{c.raga}</span>
                        <span className="text-gold-300 font-medium">{c.audio_count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {tab === "logs" && (
              <div className="glass-panel rounded-2xl p-6 fade-in">
                <h2 className="font-display text-lg font-semibold text-gold-300 mb-4">Training Logs</h2>
                {logs.length === 0 ? (
                  <p className="text-white/40 text-sm">No training runs yet.</p>
                ) : (
                  <div className="space-y-3">
                    {logs.map((l) => (
                      <div key={l.id} className="border-b border-white/5 pb-3 last:border-0">
                        <div className="flex items-center justify-between mb-1">
                          <span
                            className={`text-xs px-2 py-1 rounded-full ${
                              l.status === "success"
                                ? "bg-green-500/10 text-green-400"
                                : l.status === "failed"
                                ? "bg-maroon-600/20 text-maroon-400"
                                : "bg-gold-500/10 text-gold-300"
                            }`}
                          >
                            {l.status}
                          </span>
                          <span className="text-xs text-white/40">
                            {new Date(l.started_at).toLocaleString()}
                          </span>
                        </div>
                        {l.message && (
                          <p className="text-xs text-white/50 whitespace-pre-wrap font-mono">{l.message.slice(0, 300)}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
