import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export interface CardRecord {
  id: string;
  name: string;
  role: string;
  title: string;
  photoDataUrl?: string;
  createdAt: string;
  verifiedInDb: boolean;
  blockchainVerified: boolean;
  walletAddress?: string;
  txHash?: string;
  network?: string;
}

const dbDir = path.join(process.cwd(), "data");
const dbPath = path.join(dbDir, "cards.json");

async function ensureDbExists(): Promise<void> {
  try {
    await access(dbDir);
  } catch {
    await mkdir(dbDir, { recursive: true });
  }
  try {
    await access(dbPath);
  } catch {
    await writeFile(dbPath, JSON.stringify({}, null, 2), "utf-8");
  }
}

async function readAllCards(): Promise<Record<string, CardRecord>> {
  await ensureDbExists();
  try {
    const data = await readFile(dbPath, "utf-8");
    return JSON.parse(data || "{}");
  } catch {
    return {};
  }
}

async function writeAllCards(cards: Record<string, CardRecord>): Promise<void> {
  await ensureDbExists();
  await writeFile(dbPath, JSON.stringify(cards, null, 2), "utf-8");
}

export async function saveCardRecord(card: CardRecord): Promise<CardRecord> {
  const cards = await readAllCards();
  cards[card.id] = card;
  await writeAllCards(cards);
  return card;
}

export async function getCardRecord(id: string): Promise<CardRecord | null> {
  const cards = await readAllCards();
  return cards[id] || null;
}

export async function updateCardBlockchainVerification(
  id: string,
  walletAddress: string,
  txHash: string,
  network: string = "Ethereum / EVM"
): Promise<CardRecord | null> {
  const cards = await readAllCards();
  const existing = cards[id];
  if (!existing) return null;

  existing.blockchainVerified = true;
  existing.walletAddress = walletAddress;
  existing.txHash = txHash;
  existing.network = network;

  cards[id] = existing;
  await writeAllCards(cards);
  return existing;
}
