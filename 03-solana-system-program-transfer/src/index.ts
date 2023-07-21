import * as Web3 from "@solana/web3.js";
import * as fs from "fs";
import * as borsh from "@project-serum/borsh";
import dotenv from "dotenv";
import { BN } from "bn.js";

const PROGRAM_ID = new Web3.PublicKey("11111111111111111111111111111111");

async function main() {
  dotenv.config();

  const connection = new Web3.Connection(Web3.clusterApiUrl("devnet"));
  const { signerKeypair, recipientKeypair } = await initializeKaypairs(
    connection
  );

  await transferProgram({
    signerKeypair,
    recipientPublicKey: recipientKeypair.publicKey,
    solAmount: 0.1,
    connection,
  });
}

type SIGNER_RECIPIENT_KEYPAIRS = {
  signerKeypair: Web3.Keypair;
  recipientKeypair: Web3.Keypair;
};

async function initializeKaypairs(
  connection: Web3.Connection
): Promise<SIGNER_RECIPIENT_KEYPAIRS> {
  if (!process.env.SIGNER_PRIVATE_KEY || !process.env.RECIPIENT_PRIVATE_KEY) {
    console.log("Generating new keypair... 🗝️");
    const signerKeypair = Web3.Keypair.generate();
    const recipientKeypair = Web3.Keypair.generate();

    console.log("Creating .env file");
    fs.writeFileSync(
      ".env",
      `SIGNER_PRIVATE_KEY=[${signerKeypair.secretKey.toString()}]\nRECIPIENT_PRIVATE_KEY=[${recipientKeypair.secretKey.toString()}]`
    );

    await airdropSolIfNeeded(signerKeypair, connection);

    return { signerKeypair, recipientKeypair };
  }

  const signerSecret = JSON.parse(process.env.SIGNER_PRIVATE_KEY) as number[];
  const signerSecretKey = new Uint8Array(signerSecret);
  const signerKeypair = Web3.Keypair.fromSecretKey(signerSecretKey);

  const recipientSecret = JSON.parse(
    process.env.RECIPIENT_PRIVATE_KEY
  ) as number[];
  const recipientSecretKey = new Uint8Array(recipientSecret);
  const recipientKeypair = Web3.Keypair.fromSecretKey(recipientSecretKey);

  await airdropSolIfNeeded(signerKeypair, connection);

  return { signerKeypair, recipientKeypair };
}

async function airdropSolIfNeeded(
  signer: Web3.Keypair,
  connection: Web3.Connection
) {
  const balance = await connection.getBalance(signer.publicKey);
  console.log(`Current balance is ${balance / Web3.LAMPORTS_PER_SOL} SOL`);

  if (balance / Web3.LAMPORTS_PER_SOL < 0.1) {
    console.log("Airdropping 1 SOL");
    const airdropSignature = await connection.requestAirdrop(
      signer.publicKey,
      Web3.LAMPORTS_PER_SOL
    );

    const latestBlockhash = await connection.getLatestBlockhash();

    await connection.confirmTransaction({
      blockhash: latestBlockhash.blockhash,
      lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
      signature: airdropSignature,
    });

    const newBalance = await connection.getBalance(signer.publicKey);
    console.log(`New balance is ${newBalance / Web3.LAMPORTS_PER_SOL} SOL`);
  }
}

type TransferProgramParams = {
  signerKeypair: Web3.Keypair;
  recipientPublicKey: Web3.PublicKey;
  solAmount: number;
  connection: Web3.Connection;
};

async function transferProgram({
  signerKeypair,
  recipientPublicKey,
  solAmount,
  connection,
}: TransferProgramParams) {
  const transaction = new Web3.Transaction();

  const transferSchema = borsh.struct([
    borsh.u32("instruction"),
    borsh.u64("lamports"),
  ]);

  const buffer = Buffer.alloc(1000);
  transferSchema.encode(
    {
      instruction: 2,
      lamports: new BN(solAmount * Web3.LAMPORTS_PER_SOL, 10),
    },
    buffer
  );

  const instructionBuffer = buffer.subarray(0, transferSchema.getSpan(buffer));

  const instruction = new Web3.TransactionInstruction({
    keys: [
      { pubkey: signerKeypair.publicKey, isSigner: true, isWritable: true },
      { pubkey: recipientPublicKey, isSigner: false, isWritable: true },
    ],
    programId: PROGRAM_ID,
    data: instructionBuffer,
  });

  transaction.add(instruction);

  const transactionSignature = await Web3.sendAndConfirmTransaction(
    connection,
    transaction,
    [signerKeypair]
  );

  console.log(
    `Transaction https://explorer.solana.com/tx/${transactionSignature}?cluster=devnet`
  );
}

main()
  .then(() => {
    console.log("Finished successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.log(error);
    process.exit(1);
  });
