"use client";

import { CheckCircle2, Copy, ExternalLink, ShieldAlert, ShieldCheck, Wallet } from "lucide-react";
import { useState } from "react";
import { linkWalletToCardAction } from "@/app/actions/verify";
import { Button } from "@/components/ui/button";
import type { CardRecord } from "@/lib/db";

interface VerifyWalletCardProps {
  initialCard: CardRecord;
}

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
    };
  }
}

export function VerifyWalletCard({ initialCard }: VerifyWalletCardProps) {
  const [card, setCard] = useState<CardRecord>(initialCard);
  const [isConnecting, setIsConnecting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleConnectWallet(useSimulation = false) {
    setIsConnecting(true);
    setErrorMessage(null);

    try {
      let walletAddress: string;
      let networkName = "Ethereum Sepolia Testnet";

      if (!useSimulation && typeof window !== "undefined" && window.ethereum) {
        const accounts = (await window.ethereum.request({
          method: "eth_requestAccounts",
        })) as string[];
        if (!accounts || accounts.length === 0) {
          throw new Error("No crypto wallet account found.");
        }
        walletAddress = accounts[0];

        try {
          const chainId = (await window.ethereum.request({
            method: "eth_chainId",
          })) as string;

          const chainMap: Record<string, string> = {
            "0x1": "Ethereum Mainnet",
            "0xaa36a7": "Ethereum Sepolia",
            "0x89": "Polygon Mainnet",
            "0x13881": "Polygon Amoy",
            "0x2105": "Base Mainnet",
            "0x14a34": "Base Sepolia",
            "0xa4b1": "Arbitrum One",
          };
          if (chainMap[chainId]) {
            networkName = chainMap[chainId];
          }
        } catch {
          // Default fallback network name
        }

        try {
          const message = `HH Goa 2026 On-Chain ID Verification\n\nCard ID: ${card.id}\nHolder: ${card.name}\nTimestamp: ${new Date().toISOString()}`;
          await window.ethereum.request({
            method: "personal_sign",
            params: [message, walletAddress],
          });
        } catch {
          // Ignore signature rejection if address is selected
        }
      } else {
        walletAddress = `0x${Array.from({ length: 40 }, () =>
          Math.floor(Math.random() * 16).toString(16)
        ).join("")}`;
      }

      const res = await linkWalletToCardAction(card.id, walletAddress, undefined, networkName);
      if (res.ok) {
        setCard(res.card);
      } else {
        setErrorMessage(res.error);
      }
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Wallet connection failed. You can use simulated verification."
      );
    } finally {
      setIsConnecting(false);
    }
  }

  function copyToClipboard(text: string) {
    void navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-6">
      {/* Dual Verification Status Grid */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* DB Status Pill */}
        <div className="rounded-2xl border border-emerald-500/30 bg-[#093823]/80 p-4 shadow-md backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-500/20 text-emerald-400">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                DATABASE REGISTRY
              </p>
              <p className="font-bold text-sm text-[#F4F1EA]">
                Verified in DB
              </p>
            </div>
          </div>
        </div>

        {/* Blockchain Status Pill */}
        <div
          className={`rounded-2xl border p-4 shadow-md backdrop-blur-md ${
            card.blockchainVerified
              ? "border-[#F4C93B]/50 bg-[#093823]/80 glow-gold"
              : "border-amber-500/30 bg-[#093823]/80"
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${
                card.blockchainVerified
                  ? "bg-[#F4C93B]/20 text-[#F4C93B]"
                  : "bg-amber-500/20 text-amber-400"
              }`}
            >
              {card.blockchainVerified ? (
                <ShieldCheck className="h-5 w-5" />
              ) : (
                <ShieldAlert className="h-5 w-5" />
              )}
            </div>
            <div>
              <p
                className={`font-mono text-[10px] font-bold uppercase tracking-wider ${
                  card.blockchainVerified ? "text-[#F4C93B]" : "text-amber-400"
                }`}
              >
                BLOCKCHAIN REGISTRY
              </p>
              <p className="font-bold text-sm text-[#F4F1EA]">
                {card.blockchainVerified
                  ? "Verified Across Chain"
                  : "Not Linked On-Chain"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Verification Card */}
      {card.blockchainVerified ? (
        <div className="glass-panel rounded-3xl p-6 shadow-2xl border border-[#F4C93B]/40 space-y-4">
          <div className="flex items-center justify-between border-b border-[#175B3B] pb-4">
            <div className="flex items-center gap-2 text-[#F4C93B] font-mono font-bold text-xs uppercase tracking-wider">
              <ShieldCheck className="h-5 w-5 text-[#F4C93B]" />
              <span>On-Chain Record Verified</span>
            </div>
            <span className="rounded-full bg-[#F4C93B]/15 border border-[#F4C93B]/30 px-3 py-1 font-mono text-[10px] font-bold text-[#F4C93B]">
              {card.network || "EVM Chain"}
            </span>
          </div>

          <div className="space-y-4">
            <div>
              <label className="font-mono text-[10px] font-bold text-[#8EB89B] uppercase tracking-wider block">
                Linked Wallet Address
              </label>
              <div className="mt-1 flex items-center gap-2 rounded-xl bg-[#062C1B] border border-[#175B3B] p-3 font-mono text-xs text-[#F4F1EA]">
                <span className="truncate">{card.walletAddress}</span>
                <button
                  onClick={() => card.walletAddress && copyToClipboard(card.walletAddress)}
                  className="ml-auto text-[#8EB89B] hover:text-[#F4C93B] p-1 transition"
                  title="Copy address"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div>
              <label className="font-mono text-[10px] font-bold text-[#8EB89B] uppercase tracking-wider block">
                Transaction Hash
              </label>
              <div className="mt-1 flex items-center gap-2 rounded-xl bg-[#062C1B] border border-[#175B3B] p-3 font-mono text-xs text-[#F4F1EA]">
                <span className="truncate">{card.txHash}</span>
                <a
                  href={`https://sepolia.etherscan.io/tx/${card.txHash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="ml-auto text-[#8EB89B] hover:text-[#F4C93B] p-1 transition"
                  title="View on Explorer"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            </div>

            {copied && (
              <p className="font-mono text-xs font-bold text-[#F4C93B]">Address copied to clipboard!</p>
            )}
          </div>
        </div>
      ) : (
        <div className="glass-panel rounded-3xl p-6 shadow-2xl space-y-4">
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#F4C93B]/20 text-[#F4C93B] border border-[#F4C93B]/30">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-mono text-sm font-bold text-[#F4C93B] uppercase tracking-wider">
                Anchor ID Card On-Chain
              </h3>
              <p className="mt-1 text-xs text-[#8EB89B] leading-relaxed">
                This ID card is registered in our database. Connect your Web3 crypto wallet to sign and verify this ID across the blockchain network.
              </p>
            </div>
          </div>

          {errorMessage && (
            <p className="rounded-xl bg-red-500/15 border border-red-500/30 p-3 font-mono text-xs text-red-400">
              {errorMessage}
            </p>
          )}

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button
              onClick={() => void handleConnectWallet(false)}
              disabled={isConnecting}
              className="flex-1"
              size="lg"
            >
              <Wallet className="h-4 w-4 mr-2" />
              {isConnecting ? "Connecting Wallet…" : "Connect Crypto Wallet"}
            </Button>

            <Button
              onClick={() => void handleConnectWallet(true)}
              disabled={isConnecting}
              variant="outline"
              size="lg"
            >
              Simulate On-Chain Link
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
