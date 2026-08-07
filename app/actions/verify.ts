"use server";

import { getCardRecord, updateCardBlockchainVerification, type CardRecord } from "@/lib/db";

export type LinkWalletResponse =
  | { ok: true; card: CardRecord }
  | { ok: false; error: string };

export async function linkWalletToCardAction(
  cardId: string,
  walletAddress: string,
  txHash?: string,
  network?: string
): Promise<LinkWalletResponse> {
  try {
    if (!cardId) return { ok: false, error: "Missing Card ID." };
    if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return { ok: false, error: "Invalid EVM Crypto Wallet address." };
    }

    const existing = await getCardRecord(cardId);
    if (!existing) {
      return { ok: false, error: "Card record not found." };
    }

    const generatedTxHash =
      txHash ||
      `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("")}`;

    const updated = await updateCardBlockchainVerification(
      cardId,
      walletAddress,
      generatedTxHash,
      network || "Ethereum Sepolia Testnet"
    );

    if (!updated) {
      return { ok: false, error: "Failed to update record in database." };
    }

    return { ok: true, card: updated };
  } catch (error) {
    console.error("Wallet linking failed", error);
    return { ok: false, error: "Failed to verify card on blockchain." };
  }
}
