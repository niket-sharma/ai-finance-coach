"use client";

import { useState } from "react";
import Sidebar from "@/components/sidebar";

export default function SettingsPage() {
  const [profile, setProfile] = useState({
    name: "",
    email: "",
  });
  const [saved, setSaved] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProfile({ ...profile, [e.target.name]: e.target.value });
    setSaved(false);
  };

  const handleSave = () => {
    // Placeholder: In production, this would call an API
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
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
          <p className="text-[#64748b] text-sm ml-11">
            Manage your profile and preferences.
          </p>
        </div>

        <div className="max-w-2xl space-y-6">
          {/* Profile Section */}
          <div className="bg-[#1a1d2e] border border-[#2a2f44] rounded-2xl p-6">
            <h2 className="text-[#eef2ff] text-base font-semibold mb-1">Profile</h2>
            <p className="text-[#64748b] text-xs mb-5">Update your personal information</p>

            <div className="space-y-4">
              {/* Avatar Placeholder */}
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-[#6366f1]/20 flex items-center justify-center text-2xl border-2 border-dashed border-[#6366f1]/30">
                  👤
                </div>
                <div>
                  <button className="text-[#6366f1] text-xs font-medium hover:text-[#4f46e5] transition-colors">
                    Upload photo
                  </button>
                  <p className="text-[#64748b] text-xs mt-0.5">PNG, JPG up to 2MB</p>
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="text-[#64748b] text-xs font-medium uppercase tracking-wider">Display Name</label>
                <input
                  type="text"
                  name="name"
                  value={profile.name}
                  onChange={handleChange}
                  placeholder="Your name"
                  className="w-full mt-1.5 bg-[#252a3a] border border-[#2a2f44] rounded-lg px-3 py-2.5 text-[#eef2ff] text-sm
                    focus:outline-none focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1]/30 transition-colors"
                />
              </div>

              {/* Email */}
              <div>
                <label className="text-[#64748b] text-xs font-medium uppercase tracking-wider">Email</label>
                <input
                  type="email"
                  name="email"
                  value={profile.email}
                  onChange={handleChange}
                  placeholder="you@example.com"
                  className="w-full mt-1.5 bg-[#252a3a] border border-[#2a2f44] rounded-lg px-3 py-2.5 text-[#eef2ff] text-sm
                    focus:outline-none focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1]/30 transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Connected Accounts (Placeholder) */}
          <div className="bg-[#1a1d2e] border border-[#2a2f44] rounded-2xl p-6">
            <h2 className="text-[#eef2ff] text-base font-semibold mb-1">Connected Accounts</h2>
            <p className="text-[#64748b] text-xs mb-5">Link your bank and brokerage accounts for automatic syncing</p>

            <div className="space-y-3">
              {[
                { name: "Bank Account", icon: "🏦", status: "Not connected" },
                { name: "Credit Card", icon: "💳", status: "Not connected" },
                { name: "Brokerage", icon: "📊", status: "Not connected" },
                { name: "Cryptocurrency Exchange", icon: "₿", status: "Not connected" },
              ].map((account) => (
                <div
                  key={account.name}
                  className="flex items-center justify-between bg-[#252a3a] border border-[#2a2f44] rounded-xl px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#1a1d2e] flex items-center justify-center text-sm">
                      {account.icon}
                    </div>
                    <div>
                      <p className="text-[#eef2ff] text-sm font-medium">{account.name}</p>
                      <p className="text-[#64748b] text-xs">{account.status}</p>
                    </div>
                  </div>
                  <button className="text-[#6366f1] text-xs font-medium hover:text-[#4f46e5] transition-colors
                    border border-[#6366f1]/30 hover:border-[#6366f1]/50 px-3 py-1 rounded-lg">
                    Connect
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-4 p-3 bg-[#1e1b4b]/30 border border-[#6366f1]/20 rounded-lg">
              <p className="text-[#a5b4fc] text-xs text-center">
                🔜 Account syncing is coming in v2. Manual transaction logging is available now.
              </p>
            </div>
          </div>

          {/* Preferences */}
          <div className="bg-[#1a1d2e] border border-[#2a2f44] rounded-2xl p-6">
            <h2 className="text-[#eef2ff] text-base font-semibold mb-1">Preferences</h2>
            <p className="text-[#64748b] text-xs mb-5">Customize your experience</p>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[#eef2ff] text-sm">Currency</p>
                  <p className="text-[#64748b] text-xs">Your default currency</p>
                </div>
                <select className="bg-[#252a3a] border border-[#2a2f44] rounded-lg px-3 py-2 text-[#eef2ff] text-sm
                  focus:outline-none focus:border-[#6366f1] transition-colors cursor-pointer">
                  <option className="bg-[#252a3a]">USD ($)</option>
                  <option className="bg-[#252a3a]">EUR (€)</option>
                  <option className="bg-[#252a3a]">GBP (£)</option>
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
            onClick={handleSave}
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
