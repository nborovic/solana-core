import * as spl from "@solana/spl-token";
import { initializeKeypair } from "./initializeKeypair";
import * as web3 from "@solana/web3.js";
import { readFileSync } from "fs";
import {
  Metaplex,
  bundlrStorage,
  keypairIdentity,
  toMetaplexFile,
} from "@metaplex-foundation/js";
import {
  DataV2,
  createCreateMetadataAccountV3Instruction,
} from "@metaplex-foundation/mpl-token-metadata";

async function main() {
  const connection = new web3.Connection(web3.clusterApiUrl("devnet"));
  const payer = await initializeKeypair(connection);

  const mintKeypair = web3.Keypair.generate();

  const destinationPublicKey = web3.Keypair.generate().publicKey;

  const metaplex = new Metaplex(connection).use(keypairIdentity(payer)).use(
    bundlrStorage({
      address: "https://devnet.bundlr.network",
      providerUrl: "https://api.devnet.solana.com",
      timeout: 60000,
    })
  );

  console.log("Building instructions");

  const tokenMintInstructions = await createTokenMintInstructions({
    connection,
    mintPublicKey: mintKeypair.publicKey,
    payerPublicKey: payer.publicKey,
    freezeAuthority: payer.publicKey,
    decimals: 0,
  });

  const tokenMetadataInstruction = await createTokenMetadataAccountInstruction({
    metaplex,
    tokenMintPublicKey: mintKeypair.publicKey,
    payerPublicKey: payer.publicKey,
    imgPath: "assets/middle-finger-coin.png",
    name: "Middle Finger Coin",
    description:
      "Person who sent you this wants to tell you that you are stupid",
    symbol: "MFC",
  });

  const associatedTokenAccountInstruction =
    await createAssociatedTokenAccountInstruction({
      connection,
      payerPublicKey: payer.publicKey,
      tokenMintPublicKey: mintKeypair.publicKey,
      owner: destinationPublicKey,
    });

  const instructions = [
    ...tokenMintInstructions,
    tokenMetadataInstruction,
    associatedTokenAccountInstruction,
  ].filter((instruction) => !!instruction) as web3.TransactionInstruction[];

  const transaction = new web3.Transaction().add(...instructions);

  const transactionSignature = await web3.sendAndConfirmTransaction(
    connection,
    transaction,
    [payer, mintKeypair]
  );

  console.log(`Transaction signature: ${transactionSignature}`);
}

interface CreateTokenMintInstructionsParams {
  connection: web3.Connection;
  mintPublicKey: web3.PublicKey;
  payerPublicKey: web3.PublicKey;
  freezeAuthority: web3.PublicKey | null;
  decimals: number;
}

async function createTokenMintInstructions({
  connection,
  mintPublicKey,
  payerPublicKey,
  freezeAuthority,
  decimals,
}: CreateTokenMintInstructionsParams): Promise<web3.TransactionInstruction[]> {
  spl.createMint;

  const minimumBalanceForRentExempt =
    await spl.getMinimumBalanceForRentExemptMint(connection);

  const createAccountInstruction = web3.SystemProgram.createAccount({
    fromPubkey: payerPublicKey,
    newAccountPubkey: mintPublicKey,
    space: spl.MINT_SIZE,
    lamports: minimumBalanceForRentExempt,
    programId: spl.TOKEN_PROGRAM_ID,
  });

  const createInitializeMintInstruction = spl.createInitializeMint2Instruction(
    mintPublicKey,
    decimals,
    payerPublicKey,
    freezeAuthority,
    spl.TOKEN_PROGRAM_ID
  );

  return [createAccountInstruction, createInitializeMintInstruction];
}

interface CreateTokenMetadataAccount {
  metaplex: Metaplex;
  tokenMintPublicKey: web3.PublicKey;
  payerPublicKey: web3.PublicKey;
  imgPath: string;
  name: string;
  description: string;
  symbol: string;
}

async function createTokenMetadataAccountInstruction({
  metaplex,
  tokenMintPublicKey,
  payerPublicKey,
  imgPath,
  name,
  description,
  symbol,
}: CreateTokenMetadataAccount): Promise<web3.TransactionInstruction> {
  const buffer = readFileSync(imgPath);

  const file = toMetaplexFile(buffer, "middle-finger-coin.png");

  const bundlrImageUri = await metaplex.storage().upload(file);

  const { uri: bundlrMetadataUri } = await metaplex
    .nfts()
    .uploadMetadata({ name, description, image: bundlrImageUri });

  const metadataPDA = metaplex
    .nfts()
    .pdas()
    .metadata({ mint: tokenMintPublicKey });

  const tokenMetadata = {
    name,
    symbol,
    uri: bundlrMetadataUri,
    sellerFeeBasisPoints: 0,
    creators: null,
    collection: null,
    uses: null,
  } as DataV2;

  const instruction = createCreateMetadataAccountV3Instruction(
    {
      metadata: metadataPDA,
      mint: tokenMintPublicKey,
      mintAuthority: payerPublicKey,
      payer: payerPublicKey,
      updateAuthority: payerPublicKey,
    },
    {
      createMetadataAccountArgsV3: {
        data: tokenMetadata,
        isMutable: true,
        collectionDetails: null,
      },
    }
  );

  return instruction;
}

interface CreateAssociatedTokenAccountInstructionParams {
  connection: web3.Connection;
  payerPublicKey: web3.PublicKey;
  tokenMintPublicKey: web3.PublicKey;
  owner: web3.PublicKey;
}

async function createAssociatedTokenAccountInstruction({
  connection,
  payerPublicKey,
  tokenMintPublicKey,
  owner,
}: CreateAssociatedTokenAccountInstructionParams): Promise<web3.TransactionInstruction | null> {
  const associatedTokenPublicKey = await spl.getAssociatedTokenAddress(
    tokenMintPublicKey,
    owner
  );

  try {
    await spl.getAccount(connection, associatedTokenPublicKey);

    return null;
  } catch (error: unknown) {
    const instruction = spl.createAssociatedTokenAccountInstruction(
      payerPublicKey,
      associatedTokenPublicKey,
      owner,
      tokenMintPublicKey
    );
    return instruction;
  }
}

interface MintTokensToProps {
  connection: web3.Connection;
  payer: web3.Keypair;
  tokenMintPublicKey: web3.PublicKey;
  destination: web3.PublicKey;
  authority: web3.Keypair;
  amount: number;
}

async function mintTokensTo({
  connection,
  payer,
  tokenMintPublicKey,
  destination,
  authority,
  amount,
}: MintTokensToProps): Promise<string> {
  const mintInfo = await spl.getMint(connection, tokenMintPublicKey);

  const transactionSignature = await spl.mintTo(
    connection,
    payer,
    tokenMintPublicKey,
    destination,
    authority,
    amount * 10 ** mintInfo.decimals,
    undefined,
    { commitment: "finalized" }
  );

  return transactionSignature;
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
