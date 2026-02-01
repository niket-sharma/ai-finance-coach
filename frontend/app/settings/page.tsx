"use client";

import { useState, useEffect, useCallback } from "react";
import Sidebar from "@/components/sidebar";
import { API_BASE } from "@/lib/config";

interface BrokerInfo {
  id: number;
  broker: string;
  is_paper: boolean;
  status: string;
  connected_at: string | null;
  last_synced_at: string | null;
  account_info: string | null;
}

export default function SettingsPage() {
  const [profile, setProfile] = useState({ name: "", email: "" });
  const [saved, setSaved] = useState(false);

  // Broker state
  const [brokers, setBrokers] = useState<BrokerInfo[]>([]);
  const [alpacaConnected, setAlpacaConnected] = useState(false);
  const [alpacaApiKey, setAlpacaApiKey] = useState("");
  const [alpacaSecretKey, setAlpacaSecretKey] = useState("");
  const [alpacaIsPaper, setAlpacaIsPaper] = useState(true);
  const [brokerLoading, setBrokerLoading] = useState(false);
  const [brokerError, setBrokerError] = useState("");
  const [brokerSuccess, setBrokerSuccess] = useState("");

  const fetchBrokerStatus = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/brokers/status`);
      if (res.ok) {
        const data = await res.json();
        setBrokers(data.brokers || []);
        const alpaca = data.brokers?.find((b: BrokerInfo) => b.broker === "alpaca");
        setAlpacaConnected(!!alpaca && alpaca.status === "connected");
      }
    } catch { /* silent */ }
  }, []);

  useEffect(() => { fetchBrokerStatus(); }, [fetchBrokerStatus]);

  // Profile
  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProfile({ ...profile, [e.target.name]: e.target.value });
    setSaved(false);
  };
  const handleProfileSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  // Broker actions
  const connectAlpaca = async () => {
    setBrokerLoading(true);
    setBrokerError("");
    setBrokerSuccess("");
    try {
      const res = await fetch(`${API_BASE}/brokers/connect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          broker: "alpaca",
          api_key: alpacaApiKey,
          secret_key: alpacaSecretKey,
          is_paper: alpacaIsPaper,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setBrokerSuccess(`Connected! Synced ${data.positions_synced} positions. Portfolio: $${data.portfolio_value}`);
        setAlpacaApiKey("");
        setAlpacaSecretKey("");
        await fetchBrokerStatus();
      } else {
        const err = await res.json();
        setBrokerError(err.detail || "Connection failed");
      }
    } catch {
      setBrokerError("Network error — try again");
    }
    setBrokerLoading(false);
  };

  const disconnectAlpaca = async () => {
    setBrokerLoading(true);
    try {
      await fetch(`${API_BASE}/brokers/disconnect?broker=alpaca`, { method: "DELETE" });
      await fetchBrokerStatus();
    } catch { /* silent */ }
    setBrokerLoading(false);
  };

  const syncAlpaca = async () => {
    setBrokerLoading(true);
    setBrokerError("");
    setBrokerSuccess("");
    try {
      const res = await fetch(`${API_BASE}/brokers/sync`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setBrokerSuccess(data.message);
        await fetchBrokerStatus();
      }
    } catch {
      setBrokerError("Sync failed");
    }
    setBrokerLoading(false);
  };

  const alpacaBroker = brokers.find((b) => b.broker === "alpaca");

  // Parse account_info string
  const parseAccountInfo = (info: string | null) => {
    if (!info) return {};
    try {
      // account_info is stored as Python repr string, convert to JSON-like
      const fixed = info.replace(/'/g, '"').replace(/None/g, "null").replace(/True/g, "true").replace(/False/g, "false");
      return JSON.parse(fixed);
    } catch {
      return {};
    }
  };

  return (
    <div className="flex min-h-screen bg-[#0f1117]">
      <Sidebar />
      <main className="ml-64 flex-1 p-8 min-h-screen">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">⚙️</span>
            <h1 className="text-[#eef2ff] text-2xl font-bold">Settings</h1>
          </div>
          <p className="text-[#64748b] text-sm ml-11">Manage your profile, brokerages, and preferences.</p>
        </div>

        <div className="max-w-2xl space-y-6">
          {/* Profile */}
          <div className="bg-[#1a1d2e] border border-[#2a2f44] rounded-2xl p-6">
            <h2 className="text-[#eef2ff] text-base font-semibold mb-1">Profile</h2>
            <p className="text-[#64748b] text-xs mb-5">Update your personal information</p>
            <div className="space-y-4">
              <div>
                <label className="text-[#64748b] text-xs font-medium uppercase tracking-wider">Name</label>
                <input
                  type="text" name="name" value={profile.name} onChange={handleProfileChange}
                  placeholder="Your name"
                  className="w-full mt-1.5 bg-[#252a3a] border border-[#2a2f44] rounded-lg px-3 py-2.5 text-[#eef2ff] text-sm
                    focus:outline-none focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1]/30 transition-colors"
                />
              </div>
              <div>
                <label className="text-[#64748b] text-xs font-medium uppercase tracking-wider">Email</label>
                <input
                  type="email" name="email" value={profile.email} onChange={handleProfileChange}
                  placeholder="you@example.com"
                  className="w-full mt-1.5 bg-[#252a3a] border border-[#2a2f44] rounded-lg px-3 py-2.5 text-[#eef2ff] text-sm
                    focus:outline-none focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1]/30 transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Brokerage — Alpaca */}
          <div className="bg-[#1a1d2e] border border-[#2a2f44] rounded-2xl p-6">
            <h2 className="text-[#eef2ff] text-base font-semibold mb-1">Brokerage</h2>
            <p className="text-[#64748b] text-xs mb-5">Connect a brokerage account to sync your portfolio and enable the trading agent.</p>

            {brokerError && (
              <div className="bg-[#7f1d1d]/40 border border-[#ef4444]/30 rounded-lg px-3 py-2 mb-4">
                <p className="text-[#ef4444] text-xs">{brokerError}</p>
              </div>
            )}
            {brokerSuccess && (
              <div className="bg-[#166534]/40 border border-[#22c55e]/30 rounded-lg px-3 py-2 mb-4">
                <p className="text-[#22c55e] text-xs">{brokerSuccess}</p>
              </div>
            )}

            {/* Alpaca */}
            <div className="border border-[#2a2f44] rounded-xl p-4 mb-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg">📊</span>
                  <span className="text-[#eef2ff] text-sm font-semibold">Alpaca</span>
                  {alpacaConnected && (
                    <span className="text-xs bg-[#166534]/40 text-[#22c55e] px-2 py-0.5 rounded-full font-semibold">Connected</span>
                  )}
                </div>
              </div>

              {alpacaConnected && alpacaBroker ? (
                <div className="space-y-3">
                  {/* Info row */}
                  <div className="grid grid-cols-3 gap-3">
                    {(() => {
                      const info = parseAccountInfo(alpacaBroker.account_info);
                      return (
                        <>
                          <div className="bg-[#252a3a] rounded-lg p-3">
                            <p className="text-[#64748b] text-xs">Portfolio</p>
                            <p className="text-[#eef2ff] text-sm font-semibold">${info.portfolio_value || "—"}</p>
                          </div>
                          <div className="bg-[#252a3a] rounded-lg p-3">
                            <p className="text-[#64748b] text-xs">Buying Power</p>
                            <p className="text-[#eef2ff] text-sm font-semibold">${info.buying_power || "—"}</p>
                          </div>
                          <div className="bg-[#252a3a] rounded-lg p-3">
                            <p className="text-[#64748b] text-xs">Mode</p>
                            <p className={`text-sm font-semibold ${alpacaBroker.is_paper ? "text-[#a5b4fc]" : "text-[#ef4444]"}`}>
                              {alpacaBroker.is_paper ? "Paper" : "Live"}
                            </p>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                  {alpacaBroker.last_synced_at && (
                    <p className="text-[#64748b] text-xs">
                      Last synced: {new Date(alpacaBroker.last_synced_at).toLocaleString()}
                    </p>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={syncAlpaca}
                      disabled={brokerLoading}
                      className="bg-[#252a3a] hover:bg-[#353b55] border border-[#2a2f44] text-[#94a3b8] text-xs font-semibold px-4 py-2 rounded-lg
                        transition-colors disabled:opacity-50"
                    >
                      ↻ Sync Portfolio
                    </button>
                    <button
                      onClick={disconnectAlpaca}
                      disabled={brokerLoading}
                      className="bg-[#7f1d1d]/40 hover:bg-[#7f1d1d]/60 border border-[#ef4444]/30 text-[#ef4444] text-xs font-semibold px-4 py-2 rounded-lg
                        transition-colors disabled:opacity-50"
                    >
                      Disconnect
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Paper / Live toggle */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => setAlpacaIsPaper(true)}
                      className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors
                        ${alpacaIsPaper ? "bg-[#6366f1]/15 text-[#6366f1] border border-[#6366f1]/40" : "bg-[#252a3a] text-[#94a3b8] border border-[#2a2f44]"}`}
                    >
                      📄 Paper Trading
                    </button>
                    <button
                      onClick={() => setAlpacaIsPaper(false)}
                      className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors
                        ${!alpacaIsPaper ? "bg-[#ef4444]/15 text-[#ef4444] border border-[#ef4444]/40" : "bg-[#252a3a] text-[#94a3b8] border border-[#2a2f44]"}`}
                    >
                      💵 Live Trading
                    </button>
                  </div>
                  <div>
                    <label className="text-[#64748b] text-xs font-medium uppercase tracking-wider">API Key</label>
                    <input
                      type="text" value={alpacaApiKey} onChange={(e) => setAlpacaApiKey(e.target.value)}
                      placeholder="Your Alpaca API key"
                      className="w-full mt-1.5 bg-[#252a3a] border border-[#2a2f44] rounded-lg px-3 py-2 text-[#eef2ff] text-sm
                        focus:outline-none focus:border-[#6366f1] transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-[#64748b] text-xs font-medium uppercase tracking-wider">Secret Key</label>
                    <input
                      type="password" value={alpacaSecretKey} onChange={(e) => setAlpacaSecretKey(e.target.value)}
                      placeholder="Your Alpaca secret key"
                      className="w-full mt-1.5 bg-[#252a3a] border border-[#2a2f44] rounded-lg px-3 py-2 text-[#eef2ff] text-sm
                        focus:outline-none focus:border-[#6366f1] transition-colors"
                    />
                  </div>
                  <button
                    onClick={connectAlpaca}
                    disabled={brokerLoading || !alpacaApiKey || !alpacaSecretKey}
                    className="w-full bg-[#6366f1] hover:bg-[#4f46e5] disabled:opacity-40 text-white text-sm font-semibold py-2.5 rounded-lg
                      transition-colors shadow-md shadow-[#6366f1]/20"
                  >
                    {brokerLoading ? "Connecting…" : "Connect Alpaca"}
                  </button>
                  <p className="text-[#64748b] text-xs text-center">
                    Get keys at <a href="https://app.alpaca.markets" target="_blank" rel="noopener noreferrer" className="text-[#6366f1] hover:underline">app.alpaca.markets</a>
                  </p>
                </div>
              )}
            </div>

            {/* Coming soon placeholders */}
            <div className="grid grid-cols-3 gap-3">
              {["Bank Account", "Credit Card", "Crypto Exchange"].map((name) => (
                <div key={name} className="border border-[#2a2f44] rounded-lg p-3 opacity-40">
                  <p className="text-[#94a3b8] text-xs font-medium">{name}</p>
                  <p className="text-[#64748b] text-xs mt-0.5">Coming soon</p>
                </div>
              ))}
            </div>
          </div>

          {/* Preferences */}
          <div className="bg-[#1a1d2e] border border-[#2a2f44] rounded-2xl p-6">
            <h2 className="text-[#eef2ff] text-base font-semibold mb-1">Preferences</h2>
            <p className="text-[#64748b] text-xs mb-5">Customize your experience</p>
            <div className="space-y-5">
              <div>
                <label className="text-[#64748b] text-xs font-medium uppercase tracking-wider">Currency</label>
                <select className="w-full mt-1.5 bg-[#252a3a] border border-[#2a2f44] rounded-lg px-3 py-2.5 text-[#eef2ff] text-sm
                  focus:outline-none focus:border-[#6366f1] transition-colors appearance-none cursor-pointer">
                  <option value="USD">USD — US Dollar</option>
                  <option value="EUR">EUR — Euro</option>
                  <option value="GBP">GBP — British Pound</option>
                  <option value="INR">INR — Indian Rupee</option>
                </select>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[#eef2ff] text-sm">Dark Mode</p>
                  <p className="text-[#64748b] text-xs">Currently active</p>
                </div>
                <div className="w-10 h-5 bg-[#6366f1] rounded-full relative cursor-pointer">
                  <div className="absolute top-0.5 right-0.5 w-4 h-4 bg-white rounded-full shadow"></div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[#eef2ff] text-sm">Weekly Report Email</p>
                  <p className="text-[#64748b] text-xs">Get a weekly summary (coming soon)</p>
                </div>
                <div className="w-10 h-5 bg-[#353b55] rounded-full relative cursor-pointer">
                  <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-[#64748b] rounded-full shadow"></div>
                </div>
              </div>
            </div>
          </div>

          {/* Save */}
          <button
            onClick={handleProfileSave}
            className="w-full bg-[#6366f1] hover:bg-[#4f46e5] text-white font-semibold py-3 rounded-xl
              transition-all duration-200 shadow-lg shadow-[#6366f1]/20"
          >
            {saved ? "✓ Saved!" : "Save Changes"}
          </button>
        </div>
      </main>
    </div>
  );
}
