import { initializeKeypair } from "./initializeKeypair";
import * as web3 from "@solana/web3.js";
import * as token from "@solana/spl-token";
import {
  Metaplex,
  bundlrStorage,
  keypairIdentity,
  toMetaplexFile,
} from "@metaplex-foundation/js";
import { readFileSync } from "fs";
import {
  DataV2,
  createCreateMetadataAccountV3Instruction,
} from "@metaplex-foundation/mpl-token-metadata";

async function createNewMint(
  connection: web3.Connection,
  payer: web3.Keypair,
  mintAuthority: web3.PublicKey,
  freezeAuthority: web3.PublicKey | null,
  decimals: number
) {
  const tokenMint = await token.createMint(
    connection,
    payer,
    mintAuthority,
    freezeAuthority,
    decimals,
    undefined,
    {
      commitment: "finalized",
    }
  );

  console.log(
    `Token Mint: https://explorer.solana.com/address/${tokenMint}?cluster=devnet`
  );

  return tokenMint;
}

async function createTokenAccount(
  connection: web3.Connection,
  payer: web3.Keypair,
  mint: web3.PublicKey,
  owner: web3.PublicKey
) {
  const tokenAccount = await token.getOrCreateAssociatedTokenAccount(
    connection,
    payer,
    mint,
    owner,
    false,
    "finalized",
    {
      commitment: "finalized",
    }
  );

  console.log(
    `Token Account: https://explorer.solana.com/address/${tokenAccount.address}?cluster=devnet`
  );

  return tokenAccount;
}

async function mintTokens(
  connection: web3.Connection,
  payer: web3.Keypair,
  mint: web3.PublicKey,
  destination: web3.PublicKey,
  authority: web3.Keypair,
  amount: number
) {
  const mintInfo = await token.getMint(connection, mint);

  const transactionSignature = await token.mintTo(
    connection,
    payer,
    mint,
    destination,
    authority,
    amount * 10 ** mintInfo.decimals
  );

  console.log(
    `Mint Token Transaction: https://explorer.solana.com/tx/${transactionSignature}?cluster=devnet`
  );
}

async function transferTokens(
  connection: web3.Connection,
  payer: web3.Keypair,
  source: web3.PublicKey,
  destination: web3.PublicKey,
  owner: web3.PublicKey,
  amount: number,
  mint: web3.PublicKey
) {
  const mintInfo = await token.getMint(connection, mint);

  const transactionSignature = await token.transfer(
    connection,
    payer,
    source,
    destination,
    owner,
    amount * 10 ** mintInfo.decimals
  );

  console.log(
    `Transfer Transaction: https://explorer.solana.com/tx/${transactionSignature}?cluster=devnet`
  );
}

async function createTokenMetadata(
  connection: web3.Connection,
  metaplex: Metaplex,
  mint: web3.PublicKey,
  user: web3.Keypair,
  name: string,
  symbol: string,
  description: string
) {
  const buffer = readFileSync("assets/shitcoin.png");

  const file = toMetaplexFile(buffer, "shitcoin.png");

  const imageUri = await metaplex.storage().upload(file);
  console.log("image uri:", imageUri);

  const { uri } = await metaplex
    .nfts()
    .uploadMetadata({ name, description, image: imageUri });

  console.log("metadata uri", uri);

  const metadataPDA = metaplex.nfts().pdas().metadata({ mint });

  const tokenMetadata = {
    name,
    symbol,
    uri,
    sellerFeeBasisPoints: 0,
    creators: null,
    collection: null,
    uses: null,
  } as DataV2;

  const transaction = new web3.Transaction().add(
    createCreateMetadataAccountV3Instruction(
      {
        metadata: metadataPDA,
        mint,
        mintAuthority: user.publicKey,
        payer: user.publicKey,
        updateAuthority: user.publicKey,
      },
      {
        createMetadataAccountArgsV3: {
          data: tokenMetadata,
          isMutable: true,
          collectionDetails: null,
        },
      }
    )
  );

  const transactionSignature = await web3.sendAndConfirmTransaction(
    connection,
    transaction,
    [user]
  );

  console.log(
    `Create Metadata Account: https://explorer.solana.com/tx/${transactionSignature}?cluster=devnet`
  );
}

async function main() {
  const connection = new web3.Connection(web3.clusterApiUrl("devnet"));
  const user = await initializeKeypair(connection);

  console.log("PublicKey:", user.publicKey.toBase58());

  const MINT_ADDRESS = "9rSgXveJHjdt5dm3muuBKNp7Sq2yRipGAKGdsTqQ9X74";

  const metaplex = Metaplex.make(connection)
    .use(keypairIdentity(user))
    .use(
      bundlrStorage({
        address: "https://devnet.bundlr.network",
        providerUrl: "https://api.devnet.solana.com",
        timeout: 60000,
      })
    );

  await createTokenMetadata(
    connection,
    metaplex,
    new web3.PublicKey(MINT_ADDRESS),
    user,
    "Shitcoin",
    "SHT",
    "Literal shit"
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
