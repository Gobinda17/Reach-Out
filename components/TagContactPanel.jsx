"use client";

import { useState } from "react";
import { ContactOwnerForm } from "@/components/ContactOwnerForm";
import { CallOwnerPanel } from "@/components/CallOwnerPanel";
import { PhoneIcon, ChatIcon } from "@/components/icons";

const TABS = [
  { key: "call", label: "Call", icon: PhoneIcon },
  { key: "message", label: "Message", icon: ChatIcon },
];

export function TagContactPanel({ code }) {
  const [tab, setTab] = useState("call");

  return (
    <div className="flex w-full flex-col gap-3">
      <div className="flex gap-2 self-center rounded-full border border-slate-200 bg-white p-1 dark:border-slate-800 dark:bg-slate-900">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              tab === key
                ? "bg-black text-yellow-400"
                : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      {tab === "call" ? <CallOwnerPanel code={code} /> : <ContactOwnerForm code={code} />}
    </div>
  );
}
