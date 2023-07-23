import * as web3 from "@solana/web3.js";
import * as token from "@solana/spl-token";

import { initializeKeypair } from "./initializeKeypair";

async function main() {
  const connection = new web3.Connection(web3.clusterApiUrl("devnet"));
  const user = await initializeKeypair(connection);

  console.log("PublicKey:", user.publicKey.toBase58());

  const mint = await createNewMint({
    connection,
    payer: user,
    mintAuthority: user.publicKey,
    freezeAuthority: user.publicKey,
    decimals: 2,
  });

  const tokenAccount = await createTokenAccount({
    connection,
    payer: user,
    mint,
    owner: user.publicKey,
  });

  await mintTokens({
    connection,
    payer: user,
    mint,
    destination: tokenAccount.address,
    authority: user,
    amount: 100,
  });

  const receiver = web3.Keypair.generate().publicKey;

  const receiverTokenAccount = await createTokenAccount({
    connection,
    payer: user,
    mint,
    owner: receiver,
  });

  await transferTokens({
    connection,
    payer: user,
    source: tokenAccount.address,
    destination: receiverTokenAccount.address,
    owner: user.publicKey,
    amount: 69,
    mint,
  });

  await burnTokens({
    connection,
    payer: user,
    account: tokenAccount.address,
    mint,
    owner: user,
    amount: 25,
  });
}

type CreateNewMintParams = {
  connection: web3.Connection;
  payer: web3.Keypair;
  mintAuthority: web3.PublicKey;
  freezeAuthority: web3.PublicKey;
  decimals: number;
};

async function createNewMint({
  connection,
  payer,
  mintAuthority,
  freezeAuthority,
  decimals,
}: CreateNewMintParams): Promise<web3.PublicKey> {
  const tokenMint = await token.createMint(
    connection,
    payer,
    mintAuthority,
    freezeAuthority,
    decimals
  );

  console.log(`The token mint account address is ${tokenMint}`);
  console.log(
    `Token Mint: https://explorer.solana.com/address/${tokenMint}?cluster=devnet`
  );

  return tokenMint;
}

type CreateTokenAccountParams = {
  connection: web3.Connection;
  payer: web3.Keypair;
  mint: web3.PublicKey;
  owner: web3.PublicKey;
};

async function createTokenAccount({
  connection,
  payer,
  mint,
  owner,
}: CreateTokenAccountParams): Promise<token.Account> {
  const tokenAccount = await token.getOrCreateAssociatedTokenAccount(
    connection,
    payer,
    mint,
    owner
  );

  console.log(
    `Token Account: https://explorer.solana.com/address/${tokenAccount.address}?cluster=devnet`
  );

  return tokenAccount;
}

type MintTokensParams = {
  connection: web3.Connection;
  payer: web3.Keypair;
  mint: web3.PublicKey;
  destination: web3.PublicKey;
  authority: web3.Keypair;
  amount: number;
};

async function mintTokens({
  connection,
  payer,
  mint,
  destination,
  authority,
  amount,
}: MintTokensParams): Promise<string> {
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

  return transactionSignature;
}

type TransferTokensParams = {
  connection: web3.Connection;
  payer: web3.Keypair;
  source: web3.PublicKey;
  destination: web3.PublicKey;
  owner: web3.PublicKey;
  amount: number;
  mint: web3.PublicKey;
};

async function transferTokens({
  connection,
  payer,
  source,
  destination,
  owner,
  amount,
  mint,
}: TransferTokensParams): Promise<string> {
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

  return transactionSignature;
}

type BurnTokensParams = {
  connection: web3.Connection;
  payer: web3.Keypair;
  account: web3.PublicKey;
  mint: web3.PublicKey;
  owner: web3.Keypair;
  amount: number;
};

async function burnTokens({
  connection,
  payer,
  account,
  mint,
  owner,
  amount,
}: BurnTokensParams): Promise<string> {
  const mintInfo = await token.getMint(connection, mint);

  const transactionSignature = await token.burn(
    connection,
    payer,
    account,
    mint,
    owner,
    amount * 10 ** mintInfo.decimals
  );

  console.log(
    `Burn Transaction: https://explorer.solana.com/tx/${transactionSignature}?cluster=devnet`
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
